import * as reportsService from "./reports.service.js";

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

export async function getIncomeStatement(req, res) {
  try {
    const report = await reportsService.getIncomeStatement(
      req.user.tenantId,
      req.query,
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function getBalanceSheet(req, res) {
  try {
    const report = await reportsService.getBalanceSheet(
      req.user.tenantId,
      req.query,
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    handleError(res, error);
  }
}
