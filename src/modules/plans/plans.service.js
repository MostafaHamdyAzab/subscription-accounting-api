import prisma from "../../config/prisma.js";

const ALLOWED_BILLING_PERIODS = ["MONTHLY", "YEARLY"];

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validatePrice(price) {
  const numericPrice = Number(price);

  if (Number.isNaN(numericPrice) || numericPrice <= 0) {
    throw createError("price must be a positive number");
  }

  return numericPrice;
}

function validateBillingPeriod(billingPeriod) {
  if (!billingPeriod) {
    return "MONTHLY";
  }

  const normalizedBillingPeriod = String(billingPeriod).trim().toUpperCase();

  if (!ALLOWED_BILLING_PERIODS.includes(normalizedBillingPeriod)) {
    throw createError("billingPeriod must be MONTHLY or YEARLY");
  }

  return normalizedBillingPeriod;
}

export async function createPlan(tenantId, data) {
  const { name, price, currency, billingPeriod } = data;

  if (!name || price === undefined || price === null) {
    throw createError("name and price are required");
  }

  const normalizedName = String(name).trim();

  const existingPlan = await prisma.subscriptionPlan.findFirst({
    where: {
      tenantId,
      name: normalizedName,
    },
  });

  if (existingPlan) {
    throw createError("Plan name already exists for this tenant", 409);
  }

  return prisma.subscriptionPlan.create({
    data: {
      tenantId,
      name: normalizedName,
      price: validatePrice(price),
      currency: currency ? String(currency).trim().toUpperCase() : "USD",
      billingPeriod: validateBillingPeriod(billingPeriod),
    },
  });
}

export async function listPlans(tenantId, query = {}) {
  const where = {
    tenantId,
  };

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === "true";
  }

  return prisma.subscriptionPlan.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getPlanById(tenantId, planId) {
  const plan = await prisma.subscriptionPlan.findFirst({
    where: {
      id: planId,
      tenantId,
    },
  });

  if (!plan) {
    throw createError("Plan not found", 404);
  }

  return plan;
}

export async function updatePlan(tenantId, planId, data) {
  const existingPlan = await getPlanById(tenantId, planId);

  const updateData = {};

  if (data.name !== undefined) {
    const normalizedName = String(data.name).trim();

    if (!normalizedName) {
      throw createError("name cannot be empty");
    }

    if (normalizedName !== existingPlan.name) {
      const duplicatePlan = await prisma.subscriptionPlan.findFirst({
        where: {
          tenantId,
          name: normalizedName,
          id: {
            not: planId,
          },
        },
      });

      if (duplicatePlan) {
        throw createError("Plan name already exists for this tenant", 409);
      }
    }

    updateData.name = normalizedName;
  }

  if (data.price !== undefined) {
    updateData.price = validatePrice(data.price);
  }

  if (data.currency !== undefined) {
    updateData.currency = String(data.currency).trim().toUpperCase();
  }

  if (data.billingPeriod !== undefined) {
    updateData.billingPeriod = validateBillingPeriod(data.billingPeriod);
  }

  if (data.isActive !== undefined) {
    updateData.isActive = Boolean(data.isActive);
  }

  return prisma.subscriptionPlan.update({
    where: {
      id: planId,
    },
    data: updateData,
  });
}

export async function deletePlan(tenantId, planId) {
  const plan = await prisma.subscriptionPlan.findFirst({
    where: {
      id: planId,
      tenantId,
    },
    include: {
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
  });

  if (!plan) {
    throw createError("Plan not found", 404);
  }

  if (plan._count.subscriptions > 0) {
    throw createError(
      "Cannot delete a plan that already has subscriptions. Deactivate it instead.",
      409,
    );
  }

  await prisma.subscriptionPlan.delete({
    where: {
      id: planId,
    },
  });

  return {
    id: planId,
    deleted: true,
  };
}
