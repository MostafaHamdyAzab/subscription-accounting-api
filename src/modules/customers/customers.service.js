import prisma from "../../config/prisma.js";

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeOptionalEmail(email) {
  if (email === undefined || email === null || email === "") {
    return null;
  }

  return String(email).trim().toLowerCase();
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
}

export async function createCustomer(tenantId, data) {
  const { name, email, phone } = data;

  if (!name || !String(name).trim()) {
    throw createError("name is required");
  }

  const normalizedName = String(name).trim();
  const normalizedEmail = normalizeOptionalEmail(email);
  const normalizedPhone = normalizeOptionalString(phone);

  if (normalizedEmail) {
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        tenantId,
        email: normalizedEmail,
      },
    });

    if (existingCustomer) {
      throw createError("Customer email already exists for this tenant", 409);
    }
  }

  return prisma.customer.create({
    data: {
      tenantId,
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
    },
  });
}

export async function listCustomers(tenantId, query = {}) {
  const where = {
    tenantId,
  };

  if (query.search) {
    where.OR = [
      {
        name: {
          contains: String(query.search).trim(),
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: String(query.search).trim().toLowerCase(),
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: String(query.search).trim(),
          mode: "insensitive",
        },
      },
    ];
  }

  return prisma.customer.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCustomerById(tenantId, customerId) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      tenantId,
    },
  });

  if (!customer) {
    throw createError("Customer not found", 404);
  }

  return customer;
}

export async function updateCustomer(tenantId, customerId, data) {
  const existingCustomer = await getCustomerById(tenantId, customerId);

  const updateData = {};

  if (data.name !== undefined) {
    const normalizedName = String(data.name).trim();

    if (!normalizedName) {
      throw createError("name cannot be empty");
    }

    updateData.name = normalizedName;
  }

  if (data.email !== undefined) {
    const normalizedEmail = normalizeOptionalEmail(data.email);

    if (normalizedEmail && normalizedEmail !== existingCustomer.email) {
      const duplicateCustomer = await prisma.customer.findFirst({
        where: {
          tenantId,
          email: normalizedEmail,
          id: {
            not: customerId,
          },
        },
      });

      if (duplicateCustomer) {
        throw createError("Customer email already exists for this tenant", 409);
      }
    }

    updateData.email = normalizedEmail;
  }

  if (data.phone !== undefined) {
    updateData.phone = normalizeOptionalString(data.phone);
  }

  return prisma.customer.update({
    where: {
      id: customerId,
    },
    data: updateData,
  });
}

export async function deleteCustomer(tenantId, customerId) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      tenantId,
    },
    include: {
      _count: {
        select: {
          subscriptions: true,
          invoices: true,
        },
      },
    },
  });

  if (!customer) {
    throw createError("Customer not found", 404);
  }

  if (customer._count.subscriptions > 0 || customer._count.invoices > 0) {
    throw createError(
      "Cannot delete a customer that has subscriptions or invoices",
      409,
    );
  }

  await prisma.customer.delete({
    where: {
      id: customerId,
    },
  });

  return {
    id: customerId,
    deleted: true,
  };
}
