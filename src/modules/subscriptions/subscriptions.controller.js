import * as subscriptionsService from "./subscriptions.service.js";

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

export async function createSubscription(req, res) {
  try {
    const subscription = await subscriptionsService.createSubscription(
      req.user.tenantId,
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: subscription,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function listSubscriptions(req, res) {
  try {
    const subscriptions = await subscriptionsService.listSubscriptions(
      req.user.tenantId,
      req.query,
    );

    res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function getSubscriptionById(req, res) {
  try {
    const subscription = await subscriptionsService.getSubscriptionById(
      req.user.tenantId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function updateSubscription(req, res) {
  try {
    const subscription = await subscriptionsService.updateSubscription(
      req.user.tenantId,
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: subscription,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function cancelSubscription(req, res) {
  try {
    const subscription = await subscriptionsService.cancelSubscription(
      req.user.tenantId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: "Subscription cancelled successfully",
      data: subscription,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function deleteSubscription(req, res) {
  try {
    const result = await subscriptionsService.deleteSubscription(
      req.user.tenantId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
      data: result,
    });
  } catch (error) {
    handleError(res, error);
  }
}
