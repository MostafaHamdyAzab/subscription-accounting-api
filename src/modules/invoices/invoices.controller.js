import * as invoicesService from "./invoices.service.js";

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

export async function generateMonthlyInvoices(req, res) {
  try {
    const result = await invoicesService.generateMonthlyInvoices(
      req.user.tenantId,
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Monthly invoices generated successfully",
      data: result,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function listInvoices(req, res) {
  try {
    const invoices = await invoicesService.listInvoices(
      req.user.tenantId,
      req.query,
    );

    res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function getInvoiceById(req, res) {
  try {
    const invoice = await invoicesService.getInvoiceById(
      req.user.tenantId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    handleError(res, error);
  }
}
