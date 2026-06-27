import * as authService from "./auth.service.js";

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

export async function registerTenant(req, res) {
  try {
    const result = await authService.registerTenant(req.body);

    res.status(201).json({
      success: true,
      message: "Tenant registered successfully",
      data: result,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function login(req, res) {
  try {
    const result = await authService.login(req.body);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    handleError(res, error);
  }
}
//my info
export async function me(req, res) {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
}
