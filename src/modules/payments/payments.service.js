import prisma from "../../config/prisma.js";
import {
  createJournalEntry,
  getSystemAccountByCode,
} from "../accounting/accounting.service.js";

const ALLOWED_PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD"];

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toCents(value) {
  const numberValue = Number(value || 0);

  if (Number.isNaN(numberValue) || numberValue < 0) {
    throw createError("Invalid money amount");
  }

  return Math.round(numberValue * 100);
}

function centsToDecimalString(cents) {
  return (cents / 100).toFixed(2);
}

function validatePaymentAmount(amount) {
  const amountCents = toCents(amount);

  if (amountCents <= 0) {
    throw createError("amount must be greater than zero");
  }

  return amountCents;
}

function validatePaymentMethod(method) {
  if (!method) {
    return "CASH";
  }

  const normalizedMethod = String(method).trim().toUpperCase();

  if (!ALLOWED_PAYMENT_METHODS.includes(normalizedMethod)) {
    throw createError("method must be CASH, BANK_TRANSFER, or CARD");
  }

  return normalizedMethod;
}

function parseOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return new Date();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createError(`${fieldName} must be a valid date`);
  }

  return date;
}

function calculateInvoiceStatus(invoiceAmountCents, newPaidAmountCents) {
  if (newPaidAmountCents <= 0) {
    return "UNPAID";
  }

  if (newPaidAmountCents < invoiceAmountCents) {
    return "PARTIALLY_PAID";
  }

  return "PAID";
}

export async function createPayment(tenantId, data) {
  const { invoiceId, amount, method, paymentDate } = data;

  if (!invoiceId || amount === undefined || amount === null) {
    throw createError("invoiceId and amount are required");
  }

  const paymentAmountCents = validatePaymentAmount(amount);
  const normalizedMethod = validatePaymentMethod(method);
  const parsedPaymentDate = parseOptionalDate(paymentDate, "paymentDate");

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
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
      },
    });

    if (!invoice) {
      throw createError("Invoice not found", 404);
    }

    if (invoice.status === "VOID") {
      throw createError("Cannot pay a void invoice", 409);
    }

    if (invoice.status === "PAID") {
      throw createError("Invoice is already fully paid", 409);
    }

    const invoiceAmountCents = toCents(invoice.amount);
    const currentPaidAmountCents = toCents(invoice.paidAmount);
    const remainingAmountCents = invoiceAmountCents - currentPaidAmountCents;

    if (paymentAmountCents > remainingAmountCents) {
      throw createError(
        `Payment amount exceeds remaining invoice balance. Remaining amount is ${centsToDecimalString(
          remainingAmountCents,
        )}`,
        409,
      );
    }

    const newPaidAmountCents = currentPaidAmountCents + paymentAmountCents;
    const newInvoiceStatus = calculateInvoiceStatus(
      invoiceAmountCents,
      newPaidAmountCents,
    );

    const payment = await tx.payment.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        amount: centsToDecimalString(paymentAmountCents),
        method: normalizedMethod,
        paymentDate: parsedPaymentDate,
      },
      include: {
        invoice: {
          include: {
            customer: true,
          },
        },
      },
    });

    const updatedInvoice = await tx.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        paidAmount: centsToDecimalString(newPaidAmountCents),
        status: newInvoiceStatus,
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

    const cash = await getSystemAccountByCode(tenantId, "1000", tx);
    const accountsReceivable = await getSystemAccountByCode(
      tenantId,
      "1100",
      tx,
    );

    const journalEntry = await createJournalEntry(
      {
        tenantId,
        entryDate: payment.paymentDate,
        description: `Payment received for invoice ${invoice.invoiceNumber}`,
        referenceType: "PAYMENT",
        referenceId: payment.id,
        lines: [
          {
            accountId: cash.id,
            debit: payment.amount,
            credit: 0,
          },
          {
            accountId: accountsReceivable.id,
            debit: 0,
            credit: payment.amount,
          },
        ],
      },
      tx,
    );

    return {
      payment,
      invoice: updatedInvoice,
      journalEntry,
    };
  });

  return result;
}

export async function listPayments(tenantId, query = {}) {
  const where = {
    tenantId,
  };

  if (query.invoiceId) {
    where.invoiceId = String(query.invoiceId);
  }

  return prisma.payment.findMany({
    where,
    include: {
      invoice: {
        include: {
          customer: true,
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getPaymentById(tenantId, paymentId) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      tenantId,
    },
    include: {
      invoice: {
        include: {
          customer: true,
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throw createError("Payment not found", 404);
  }

  return payment;
}
