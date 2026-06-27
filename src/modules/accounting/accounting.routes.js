import express from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/role.middleware.js";
import {
  listAccounts,
  listJournalEntries,
  getJournalEntryById,
} from "./accounting.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(requireAdmin);

router.get("/accounts", listAccounts);
router.get("/journal-entries", listJournalEntries);
router.get("/journal-entries/:id", getJournalEntryById);

export default router;
