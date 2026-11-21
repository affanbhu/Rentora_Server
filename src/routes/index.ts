
import { Router } from "express";
import { getHome } from "../controllers/home.controller.js";
import { getHealth } from "../controllers/health.controller.js";
import { getAllEquipment } from "../controllers/equipment.controller.js";
import { createBooking } from "../controllers/booking.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Home API
router.get("/", getHome);

// Health check API
router.get("/health", getHealth);

// Get all equipment
router.get("/equipment", getAllEquipment);

// Create a booking (login required)
router.post("/bookings", requireAuth, createBooking);

// Protected user profile API
router.get("/profile/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: "User profile retrieved successfully.",
    user: res.locals.user,
  });
});

export default router;
