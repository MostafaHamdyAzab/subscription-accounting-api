import prisma from "../../config/prisma.js";

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

function validateJournalLines(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw createError("Journal entry must have at least two lines");
  }

  let totalDebitCents = 0;
  let totalCreditCents = 0;

  for (const line of lines) {
    if (!line.accountId) {
      throw createError("Each journal line must have accountId");
    }

    const debitCents = toCents(line.debit || 0);
    const creditCents = toCents(line.credit || 0);

    if (debitCents === 0 && creditCents === 0) {
      throw createError("Journal line must have either debit or credit amount");
    }

    if (debitCents > 0 && creditCents > 0) {
      throw createError("Journal line cannot have both debit and credit");
    }

    totalDebitCents += debitCents;
    totalCreditCents += creditCents;
  }

  if (totalDebitCents !== totalCreditCents) {
    throw createError(
      "Journal entry is not balanced: total debits must equal total credits",
    );
  }

  if (totalDebitCents === 0) {
    throw createError("Journal entry amount cannot be zero");
  }

  return {
    totalDebitCents,
    totalCreditCents,
  };
}

export async function getSystemAccountByCode(tenantId, code, client = prisma) {
  const account = await client.account.findFirst({
    where: {
      tenantId,
      code,
      isSystem: true,
    },
  });

  if (!account) {
    throw createError(`System account ${code} not found for this tenant`, 404);
  }

  return account;
}

export async function createJournalEntry(
  {
    tenantId,
    entryDate = new Date(),
    description,
    referenceType,
    referenceId,
    lines,
  },
  client = prisma,
) {
  if (!tenantId || !description || !referenceType) {
    throw createError("tenantId, description and referenceType are required");
  }

  validateJournalLines(lines);

  const journalEntry = await client.journalEntry.create({
    data: {
      tenantId,
      entryDate,
      description,
      referenceType,
      referenceId,
    },
  });

  await client.journalLine.createMany({
    data: lines.map((line) => ({
      tenantId,
      journalEntryId: journalEntry.id,
      accountId: line.accountId,
      debit: centsToDecimalString(toCents(line.debit || 0)),
      credit: centsToDecimalString(toCents(line.credit || 0)),
    })),
  });

  return client.journalEntry.findFirst({
    where: {
      id: journalEntry.id,
      tenantId,
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
}
const ALLOWED_REFERENCE_TYPES = [
  "INVOICE",
  "PAYMENT",
  "REVENUE_RECOGNITION",
  "MANUAL",
];

function parseOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createError(`${fieldName} must be a valid date`);
  }

  return date;
}

function parsePagination(query = {}) {
  const pageNumber = Number(query.page || 1);
  const limitNumber = Number(query.limit || 20);

  const page = Number.isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;
  const limit =
    Number.isNaN(limitNumber) || limitNumber < 1
      ? 20
      : Math.min(limitNumber, 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function normalizeReferenceType(referenceType) {
  if (!referenceType) {
    return undefined;
  }

  const normalizedReferenceType = String(referenceType).trim().toUpperCase();

  if (!ALLOWED_REFERENCE_TYPES.includes(normalizedReferenceType)) {
    throw createError(
      "referenceType must be INVOICE, PAYMENT, REVENUE_RECOGNITION, or MANUAL",
    );
  }

  return normalizedReferenceType;
}

function enrichJournalEntry(journalEntry) {
  let totalDebitCents = 0;
  let totalCreditCents = 0;

  for (const line of journalEntry.lines || []) {
    totalDebitCents += toCents(line.debit);
    totalCreditCents += toCents(line.credit);
  }

  return {
    ...journalEntry,
    totalDebit: centsToDecimalString(totalDebitCents),
    totalCredit: centsToDecimalString(totalCreditCents),
    isBalanced: totalDebitCents === totalCreditCents,
  };
}

export async function listAccounts(tenantId) {
  return prisma.account.findMany({
    where: {
      tenantId,
    },
    orderBy: {
      code: "asc",
    },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      isSystem: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listJournalEntries(tenantId, query = {}) {
  const { page, limit, skip } = parsePagination(query);

  const where = {
    tenantId,
  };

  const referenceType = normalizeReferenceType(query.referenceType);

  if (referenceType) {
    where.referenceType = referenceType;
  }

  if (query.referenceId) {
    where.referenceId = String(query.referenceId);
  }

  const fromDate = parseOptionalDate(query.from, "from");
  const toDate = parseOptionalDate(query.to, "to");

  if (fromDate || toDate) {
    where.entryDate = {};
  }

  if (fromDate) {
    where.entryDate.gte = fromDate;
  }

  if (toDate) {
    where.entryDate.lte = toDate;
  }

  const [total, journalEntries] = await prisma.$transaction([
    prisma.journalEntry.count({
      where,
    }),
    prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: [
        {
          entryDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      skip,
      take: limit,
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: journalEntries.map(enrichJournalEntry),
  };
}

export async function getJournalEntryById(tenantId, journalEntryId) {
  const journalEntry = await prisma.journalEntry.findFirst({
    where: {
      id: journalEntryId,
      tenantId,
    },
    include: {
      lines: {
        include: {
          account: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!journalEntry) {
    throw createError("Journal entry not found", 404);
  }

  return enrichJournalEntry(journalEntry);
}
