
import { Router } from "express";
import { getHome } from "../controllers/home.controller.js";
import { getHealth } from "../controllers/health.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Home API
router.get("/", getHome);

// Health check API
router.get("/health", getHealth);

// Protected user profile API
router.get("/auth/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: "User profile retrieved successfully.",
    user: res.locals.user,
  });
});

export default router;
