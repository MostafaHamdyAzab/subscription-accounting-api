import prisma from "../../config/prisma.js";

const ALLOWED_SUBSCRIPTION_STATUSES = ["ACTIVE", "CANCELLED", "EXPIRED"];

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseDate(value, fieldName) {
  if (!value) {
    throw createError(`${fieldName} is required`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createError(`${fieldName} must be a valid date`);
  }

  return date;
}

function parseOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createError(`${fieldName} must be a valid date`);
  }

  return date;
}

function validateStatus(status) {
  if (!status) {
    return "ACTIVE";
  }

  const normalizedStatus = String(status).trim().toUpperCase();

  if (!ALLOWED_SUBSCRIPTION_STATUSES.includes(normalizedStatus)) {
    throw createError("status must be ACTIVE, CANCELLED, or EXPIRED");
  }

  return normalizedStatus;
}

async function ensureCustomerBelongsToTenant(tenantId, customerId) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      tenantId,
    },
  });

  if (!customer) {
    throw createError("Customer not found for this tenant", 404);
  }

  return customer;
}

async function ensurePlanBelongsToTenant(tenantId, planId) {
  const plan = await prisma.subscriptionPlan.findFirst({
    where: {
      id: planId,
      tenantId,
    },
  });

  if (!plan) {
    throw createError("Plan not found for this tenant", 404);
  }

  if (!plan.isActive) {
    throw createError("Cannot subscribe to an inactive plan", 409);
  }

  return plan;
}

export async function createSubscription(tenantId, data) {
  const { customerId, planId, startDate, endDate } = data;

  if (!customerId || !planId || !startDate) {
    throw createError("customerId, planId and startDate are required");
  }

  await ensureCustomerBelongsToTenant(tenantId, customerId);
  await ensurePlanBelongsToTenant(tenantId, planId);

  const parsedStartDate = parseDate(startDate, "startDate");
  const parsedEndDate = parseOptionalDate(endDate, "endDate");

  if (parsedEndDate && parsedEndDate <= parsedStartDate) {
    throw createError("endDate must be after startDate");
  }

  return prisma.subscription.create({
    data: {
      tenantId,
      customerId,
      planId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      status: "ACTIVE",
    },
    include: {
      customer: true,
      plan: true,
    },
  });
}

export async function listSubscriptions(tenantId, query = {}) {
  const where = {
    tenantId,
  };

  if (query.status) {
    where.status = validateStatus(query.status);
  }

  if (query.customerId) {
    where.customerId = String(query.customerId);
  }

  if (query.planId) {
    where.planId = String(query.planId);
  }

  return prisma.subscription.findMany({
    where,
    include: {
      customer: true,
      plan: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getSubscriptionById(tenantId, subscriptionId) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      tenantId,
    },
    include: {
      customer: true,
      plan: true,
      invoices: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!subscription) {
    throw createError("Subscription not found", 404);
  }

  return subscription;
}

export async function updateSubscription(tenantId, subscriptionId, data) {
  const existingSubscription = await getSubscriptionById(
    tenantId,
    subscriptionId,
  );

  const updateData = {};

  if (data.planId !== undefined) {
    await ensurePlanBelongsToTenant(tenantId, data.planId);
    updateData.planId = data.planId;
  }

  if (data.startDate !== undefined) {
    updateData.startDate = parseDate(data.startDate, "startDate");
  }

  if (data.endDate !== undefined) {
    updateData.endDate = parseOptionalDate(data.endDate, "endDate");
  }

  if (data.status !== undefined) {
    updateData.status = validateStatus(data.status);
  }

  const finalStartDate = updateData.startDate || existingSubscription.startDate;
  const finalEndDate =
    updateData.endDate !== undefined
      ? updateData.endDate
      : existingSubscription.endDate;

  if (finalEndDate && finalEndDate <= finalStartDate) {
    throw createError("endDate must be after startDate");
  }

  return prisma.subscription.update({
    where: {
      id: subscriptionId,
    },
    data: updateData,
    include: {
      customer: true,
      plan: true,
    },
  });
}

export async function cancelSubscription(tenantId, subscriptionId) {
  await getSubscriptionById(tenantId, subscriptionId);

  return prisma.subscription.update({
    where: {
      id: subscriptionId,
    },
    data: {
      status: "CANCELLED",
      endDate: new Date(),
    },
    include: {
      customer: true,
      plan: true,
    },
  });
}

export async function deleteSubscription(tenantId, subscriptionId) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      tenantId,
    },
    include: {
      _count: {
        select: {
          invoices: true,
        },
      },
    },
  });

  if (!subscription) {
    throw createError("Subscription not found", 404);
  }

  if (subscription._count.invoices > 0) {
    throw createError(
      "Cannot delete a subscription that already has invoices. Cancel it instead.",
      409,
    );
  }

  await prisma.subscription.delete({
    where: {
      id: subscriptionId,
    },
  });

  return {
    id: subscriptionId,
    deleted: true,
  };
}
