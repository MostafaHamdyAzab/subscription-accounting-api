import * as revenueRecognitionService from "./revenueRecognition.service.js";

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

export async function recognizeMonthlyRevenue(req, res) {
  try {
    const result = await revenueRecognitionService.recognizeMonthlyRevenue(
      req.user.tenantId,
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Revenue recognized successfully",
      data: result,
    });
  } catch (error) {
    handleError(res, error);
  }
}
