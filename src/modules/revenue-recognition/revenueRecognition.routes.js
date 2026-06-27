import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/role.middleware.js";
import { recognizeMonthlyRevenue } from "./revenueRecognition.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/month-end", requireAdmin, recognizeMonthlyRevenue);

export default router;
