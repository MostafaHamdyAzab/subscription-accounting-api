import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/role.middleware.js";
import {
  generateMonthlyInvoices,
  listInvoices,
  getInvoiceById,
} from "./invoices.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/generate-monthly", requireAdmin, generateMonthlyInvoices);
router.get("/", listInvoices);
router.get("/:id", getInvoiceById);

export default router;
