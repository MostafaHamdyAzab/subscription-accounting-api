import * as paymentsService from "./payments.service.js";

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

export async function createPayment(req, res) {
  try {
    const result = await paymentsService.createPayment(
      req.user.tenantId,
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: result,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function listPayments(req, res) {
  try {
    const payments = await paymentsService.listPayments(
      req.user.tenantId,
      req.query,
    );

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function getPaymentById(req, res) {
  try {
    const payment = await paymentsService.getPaymentById(
      req.user.tenantId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    handleError(res, error);
  }
}
