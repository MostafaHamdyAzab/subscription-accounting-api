import * as customersService from "./customers.service.js";

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

export async function createCustomer(req, res) {
  try {
    const customer = await customersService.createCustomer(
      req.user.tenantId,
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function listCustomers(req, res) {
  try {
    const customers = await customersService.listCustomers(
      req.user.tenantId,
      req.query,
    );

    res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function getCustomerById(req, res) {
  try {
    const customer = await customersService.getCustomerById(
      req.user.tenantId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function updateCustomer(req, res) {
  try {
    const customer = await customersService.updateCustomer(
      req.user.tenantId,
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function deleteCustomer(req, res) {
  try {
    const result = await customersService.deleteCustomer(
      req.user.tenantId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
      data: result,
    });
  } catch (error) {
    handleError(res, error);
  }
}
