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
    periodStart,
    periodEnd,
  };
}

export async function recognizeMonthlyRevenue(tenantId, data) {
  const { month } = data;

  const { periodStart, periodEnd } = parseBillingMonth(month);

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      periodStart,
      periodEnd,
      status: {
        not: "VOID",
      },
      revenueRecognizedAt: null,
    },
    include: {
      customer: true,
      subscription: {
        include: {
          plan: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const recognizedInvoices = [];
  const skippedInvoices = [];

  for (const invoice of invoices) {
    const result = await prisma.$transaction(async (tx) => {
      const existingRecognitionEntry = await tx.journalEntry.findFirst({
        where: {
          tenantId,
          referenceType: "REVENUE_RECOGNITION",
          referenceId: invoice.id,
        },
      });

      if (existingRecognitionEntry) {
        await tx.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            revenueRecognizedAt: new Date(),
          },
        });

        return {
          skipped: true,
          reason: "Revenue recognition journal entry already exists",
          invoiceId: invoice.id,
        };
      }

      const deferredRevenue = await getSystemAccountByCode(
        tenantId,
        "2000",
        tx,
      );

      const subscriptionRevenue = await getSystemAccountByCode(
        tenantId,
        "4000",
        tx,
      );

      const journalEntry = await createJournalEntry(
        {
          tenantId,
          entryDate: new Date(),
          description: `Revenue recognition for invoice ${invoice.invoiceNumber}`,
          referenceType: "REVENUE_RECOGNITION",
          referenceId: invoice.id,
          lines: [
            {
              accountId: deferredRevenue.id,
              debit: invoice.amount,
              credit: 0,
            },
            {
              accountId: subscriptionRevenue.id,
              debit: 0,
              credit: invoice.amount,
            },
          ],
        },
        tx,
      );

      const updatedInvoice = await tx.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          revenueRecognizedAt: new Date(),
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

      return {
        skipped: false,
        invoice: updatedInvoice,
        journalEntry,
      };
    });

    if (result.skipped) {
      skippedInvoices.push(result);
    } else {
      recognizedInvoices.push(result);
    }
  }

  return {
    month,
    periodStart,
    periodEnd,
    totalInvoicesFound: invoices.length,
    totalRecognizedInvoices: recognizedInvoices.length,
    totalSkippedInvoices: skippedInvoices.length,
    recognizedInvoices,
    skippedInvoices,
  };
}
