import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/role.middleware.js";
import {
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "./customers.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireAdmin, createCustomer);
router.get("/", listCustomers);
router.get("/:id", getCustomerById);
router.patch("/:id", requireAdmin, updateCustomer);
router.delete("/:id", requireAdmin, deleteCustomer);

export default router;
