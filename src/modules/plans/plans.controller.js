import * as plansService from "./plans.service.js";

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

export async function createPlan(req, res) {
  try {
    const plan = await plansService.createPlan(req.user.tenantId, req.body);

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      data: plan,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function listPlans(req, res) {
  try {
    const plans = await plansService.listPlans(req.user.tenantId, req.query);

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function getPlanById(req, res) {
  try {
    const plan = await plansService.getPlanById(
      req.user.tenantId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function updatePlan(req, res) {
  try {
    const plan = await plansService.updatePlan(
      req.user.tenantId,
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Plan updated successfully",
      data: plan,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function deletePlan(req, res) {
  try {
    const result = await plansService.deletePlan(
      req.user.tenantId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: "Plan deleted successfully",
      data: result,
    });
  } catch (error) {
    handleError(res, error);
  }
}
