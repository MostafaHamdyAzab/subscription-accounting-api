import prisma from "../../config/prisma.js";

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toCents(value) {
  const numberValue = Number(value || 0);

  if (Number.isNaN(numberValue)) {
    throw createError("Invalid money amount");
  }

  return Math.round(numberValue * 100);
}

function centsToDecimalString(cents) {
  return (cents / 100).toFixed(2);
}

function parseRequiredDate(value, fieldName) {
  if (!value) {
    throw createError(`${fieldName} is required`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createError(`${fieldName} must be a valid date`);
  }

  return date;
}

function toEndOfDayUTC(date) {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

async function getSystemAccount(tenantId, code) {
  const account = await prisma.account.findFirst({
    where: {
      tenantId,
      code,
      isSystem: true,
    },
  });

  if (!account) {
    throw createError(`System account ${code} not found`, 404);
  }

  return account;
}

async function calculateAccountBalanceCents({
  tenantId,
  accountCode,
  from,
  to,
  normalBalance,
}) {
  const account = await getSystemAccount(tenantId, accountCode);

  const where = {
    tenantId,
    accountId: account.id,
    journalEntry: {},
  };

  if (from || to) {
    where.journalEntry.entryDate = {};
  }

  if (from) {
    where.journalEntry.entryDate.gte = from;
  }

  if (to) {
    where.journalEntry.entryDate.lte = to;
  }

  const lines = await prisma.journalLine.findMany({
    where,
    select: {
      debit: true,
      credit: true,
    },
  });

  let totalDebitCents = 0;
  let totalCreditCents = 0;

  for (const line of lines) {
    totalDebitCents += toCents(line.debit);
    totalCreditCents += toCents(line.credit);
  }

  let balanceCents;

  if (normalBalance === "DEBIT") {
    balanceCents = totalDebitCents - totalCreditCents;
  } else if (normalBalance === "CREDIT") {
    balanceCents = totalCreditCents - totalDebitCents;
  } else {
    throw createError("Invalid normal balance");
  }

  return {
    account,
    totalDebit: centsToDecimalString(totalDebitCents),
    totalCredit: centsToDecimalString(totalCreditCents),
    balance: centsToDecimalString(balanceCents),
  };
}

export async function getIncomeStatement(tenantId, query = {}) {
  const fromDate = parseRequiredDate(query.from, "from");
  const toDate = toEndOfDayUTC(parseRequiredDate(query.to, "to"));

  if (fromDate > toDate) {
    throw createError("from date cannot be after to date");
  }

  const subscriptionRevenue = await calculateAccountBalanceCents({
    tenantId,
    accountCode: "4000",
    from: fromDate,
    to: toDate,
    normalBalance: "CREDIT",
  });

  return {
    period: {
      from: fromDate,
      to: toDate,
    },
    revenues: {
      subscriptionRevenue: subscriptionRevenue.balance,
    },
    totalRevenue: subscriptionRevenue.balance,
    details: {
      subscriptionRevenue,
    },
  };
}

export async function getBalanceSheet(tenantId, query = {}) {
  const asOfDate = toEndOfDayUTC(parseRequiredDate(query.asOf, "asOf"));

  const cash = await calculateAccountBalanceCents({
    tenantId,
    accountCode: "1000",
    to: asOfDate,
    normalBalance: "DEBIT",
  });

  const accountsReceivable = await calculateAccountBalanceCents({
    tenantId,
    accountCode: "1100",
    to: asOfDate,
    normalBalance: "DEBIT",
  });

  const deferredRevenue = await calculateAccountBalanceCents({
    tenantId,
    accountCode: "2000",
    to: asOfDate,
    normalBalance: "CREDIT",
  });

  const totalAssetsCents =
    toCents(cash.balance) + toCents(accountsReceivable.balance);

  const totalLiabilitiesCents = toCents(deferredRevenue.balance);

  return {
    asOf: asOfDate,
    assets: {
      cash: cash.balance,
      accountsReceivable: accountsReceivable.balance,
      totalAssets: centsToDecimalString(totalAssetsCents),
    },
    liabilities: {
      deferredRevenue: deferredRevenue.balance,
      totalLiabilities: centsToDecimalString(totalLiabilitiesCents),
    },
    details: {
      cash,
      accountsReceivable,
      deferredRevenue,
    },
  };
}
