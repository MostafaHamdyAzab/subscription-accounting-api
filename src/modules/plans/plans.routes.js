import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/role.middleware.js";
import {
  createPlan,
  listPlans,
  getPlanById,
  updatePlan,
  deletePlan,
} from "./plans.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireAdmin, createPlan);
router.get("/", listPlans);
router.get("/:id", getPlanById);
router.patch("/:id", requireAdmin, updatePlan);
router.delete("/:id", requireAdmin, deletePlan);

export default router;
