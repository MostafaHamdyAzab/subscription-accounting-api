import prisma from "../../config/prisma.js";
import {
  createJournalEntry,
  getSystemAccountByCode,
} from "../accounting/accounting.service.js";

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseBillingMonth(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw createError("month is required in YYYY-MM format, example: 2026-06");
  }

  const [year, monthNumber] = month.split("-").map(Number);

  if (monthNumber < 1 || monthNumber > 12) {
    throw createError("Invalid month number");
  }

  const periodStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, monthNumber, 1));
  const periodEnd = new Date(nextMonthStart.getTime() - 1);

  return {
    year,
    monthNumber,
    periodStart,
    periodEnd,
  };
}

function formatInvoiceNumber(month, sequence) {
  return `INV-${month}-${String(sequence).padStart(5, "0")}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isSubscriptionActiveForPeriod(subscription, periodStart, periodEnd) {
  if (subscription.status !== "ACTIVE") {
    return false;
  }

  if (subscription.startDate > periodEnd) {
    return false;
  }

  if (subscription.endDate && subscription.endDate < periodStart) {
    return false;
  }

  return true;
}

export async function generateMonthlyInvoices(tenantId, data) {
  const { month } = data;

  const { periodStart, periodEnd } = parseBillingMonth(month);

  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
    },
    include: {
      customer: true,
      plan: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const eligibleSubscriptions = activeSubscriptions.filter((subscription) =>
    isSubscriptionActiveForPeriod(subscription, periodStart, periodEnd),
  );

  const createdInvoices = [];
  const skippedSubscriptions = [];

  for (const subscription of eligibleSubscriptions) {
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        tenantId,
        subscriptionId: subscription.id,
        periodStart,
      },
    });

    if (existingInvoice) {
      skippedSubscriptions.push({
        subscriptionId: subscription.id,
        reason: "Invoice already exists for this month",
      });

      continue;
    }

    const result = await prisma.$transaction(async (tx) => {
      const accountsReceivable = await getSystemAccountByCode(
        tenantId,
        "1100",
        tx,
      );

      const deferredRevenue = await getSystemAccountByCode(
        tenantId,
        "2000",
        tx,
      );

      const invoiceCount = await tx.invoice.count({
        where: {
          tenantId,
          periodStart,
        },
      });

      const invoiceNumber = formatInvoiceNumber(month, invoiceCount + 1);

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          customerId: subscription.customerId,
          subscriptionId: subscription.id,
          invoiceNumber,
          issueDate: new Date(),
          dueDate: addDays(new Date(), 15),
          periodStart,
          periodEnd,
          amount: subscription.plan.price,
          paidAmount: "0.00",
          status: "UNPAID",
        },
        include: {
          customer: true,
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      const journalEntry = await createJournalEntry(
        {
          tenantId,
          entryDate: invoice.issueDate,
          description: `Monthly invoice ${invoice.invoiceNumber}`,
          referenceType: "INVOICE",
          referenceId: invoice.id,
          lines: [
            {
              accountId: accountsReceivable.id,
              debit: invoice.amount,
              credit: 0,
            },
            {
              accountId: deferredRevenue.id,
              debit: 0,
              credit: invoice.amount,
            },
          ],
        },
        tx,
      );

      return {
        invoice,
        journalEntry,
      };
    });

    createdInvoices.push(result);
  }

  return {
    month,
    periodStart,
    periodEnd,
    totalEligibleSubscriptions: eligibleSubscriptions.length,
    totalCreatedInvoices: createdInvoices.length,
    totalSkippedSubscriptions: skippedSubscriptions.length,
    createdInvoices,
    skippedSubscriptions,
  };
}

export async function listInvoices(tenantId, query = {}) {
  const where = {
    tenantId,
  };

  if (query.status) {
    where.status = String(query.status).trim().toUpperCase();
  }

  if (query.customerId) {
    where.customerId = String(query.customerId);
  }

  if (query.subscriptionId) {
    where.subscriptionId = String(query.subscriptionId);
  }

  return prisma.invoice.findMany({
    where,
    include: {
      customer: true,
      subscription: {
        include: {
          plan: true,
        },
      },
      payments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getInvoiceById(tenantId, invoiceId) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      tenantId,
    },
    include: {
      customer: true,
      subscription: {
        include: {
          plan: true,
        },
      },
      payments: true,
    },
  });

  if (!invoice) {
    throw createError("Invoice not found", 404);
  }

  return invoice;
}
