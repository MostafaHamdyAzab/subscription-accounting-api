import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/role.middleware.js";
import {
  createPayment,
  listPayments,
  getPaymentById,
} from "./payments.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireAdmin, createPayment);
router.get("/", listPayments);
router.get("/:id", getPaymentById);

export default router;
