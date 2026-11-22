
import { Router } from "express";
import { getHome } from "../controllers/home.controller.js";
import { getHealth } from "../controllers/health.controller.js";

import {
  getAllEquipment,
  getOwnerEquipment,
} from "../controllers/equipment.controller.js";

import {
  createBooking,
  getMyBookings,
  cancelBooking,
} from "../controllers/booking.controller.js";

import { createCheckoutSession } from "../controllers/payment.controller.js";

import {
  requireAuth,
  verifyCustomer,
  verifyOwner,
} from "../middleware/auth.middleware.js";

import { validate } from "../middleware/validate.middleware.js";
import { createBookingSchema } from "../validations/booking.validation.js";

const router = Router();

// Home API
router.get("/", getHome);

// Health check API
router.get("/health", getHealth);

// Public equipment listing
router.get("/equipment", getAllEquipment);

// Owner equipment listing (owners only)
router.get(
  "/owner/equipment",
  requireAuth,
  verifyOwner,
  getOwnerEquipment
);

// Create a booking (customers only)
router.post(
  "/bookings",
  requireAuth,
  verifyCustomer,
  validate(createBookingSchema),
  createBooking
);

// Get bookings for the logged-in customer
router.get(
  "/bookings/my-bookings",
  requireAuth,
  verifyCustomer,
  getMyBookings
);

// Cancel a pending booking (customers only)
router.patch(
  "/bookings/:id/cancel",
  requireAuth,
  verifyCustomer,
  cancelBooking
);

// Create Stripe Checkout session (customers only)
router.post(
  "/payments/create-checkout-session",
  requireAuth,
  verifyCustomer,
  createCheckoutSession
);

// Protected user profile API
router.get("/profile/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: "User profile retrieved successfully.",
    user: res.locals.user,
  });
});

export default router;
