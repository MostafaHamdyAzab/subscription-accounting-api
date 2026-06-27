import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/role.middleware.js";
import {
  createSubscription,
  listSubscriptions,
  getSubscriptionById,
  updateSubscription,
  cancelSubscription,
  deleteSubscription,
} from "./subscriptions.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireAdmin, createSubscription);
router.get("/", listSubscriptions);
router.get("/:id", getSubscriptionById);
router.patch("/:id", requireAdmin, updateSubscription);
router.patch("/:id/cancel", requireAdmin, cancelSubscription);
router.delete("/:id", requireAdmin, deleteSubscription);

export default router;
