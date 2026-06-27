import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../config/prisma.js";

const SALT_ROUNDS = 10;

const SYSTEM_ACCOUNTS = [
  {
    code: "1000",
    name: "Cash",
    type: "ASSET",
  },
  {
    code: "1100",
    name: "Accounts Receivable",
    type: "ASSET",
  },
  {
    code: "2000",
    name: "Deferred Revenue",
    type: "LIABILITY",
  },
  {
    code: "4000",
    name: "Subscription Revenue",
    type: "REVENUE",
  },
];

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw createError("JWT_SECRET is not configured", 500);
  }

  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
}

export async function registerTenant(data) {
  const { companyName, adminName, email, password } = data;

  if (!companyName || !adminName || !email || !password) {
    throw createError(
      "companyName, adminName, email and password are required",
    );
  }

  if (password.length < 6) {
    throw createError("Password must be at least 6 characters");
  }

  const normalizedEmail = normalizeEmail(email);

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw createError("Email is already registered", 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: companyName.trim(),
      },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: adminName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "ADMIN",
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await tx.account.createMany({
      data: SYSTEM_ACCOUNTS.map((account) => ({
        tenantId: tenant.id,
        code: account.code,
        name: account.name,
        type: account.type,
        isSystem: true,
      })),
    });

    const accounts = await tx.account.findMany({
      where: {
        tenantId: tenant.id,
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
      },
    });

    return {
      tenant,
      user,
      accounts,
    };
  });

  const token = signToken(result.user);

  return {
    token,
    tenant: result.tenant,
    user: result.user,
    accounts: result.accounts,
  };
}

export async function login(data) {
  const { email, password } = data;

  if (!email || !password) {
    throw createError("email and password are required");
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw createError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw createError("Invalid email or password", 401);
  }

  const token = signToken(user);

  return {
    token,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
