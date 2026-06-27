import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { getIncomeStatement, getBalanceSheet } from "./reports.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/income-statement", getIncomeStatement);
router.get("/balance-sheet", getBalanceSheet);

export default router;
