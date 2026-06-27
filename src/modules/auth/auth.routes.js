import express from "express";
import { registerTenant, login, me } from "./auth.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register-tenant", registerTenant);
router.post("/login", login);
router.get("/me", authMiddleware, me);

export default router;
