import { Router } from "express";
import multer from "multer";

import { getHome } from "../controllers/home.controller.js";
import { getHealth } from "../controllers/health.controller.js";
import { uploadProfilePhoto } from "../controllers/upload.controller.js";
import { updateProfile } from "../controllers/profile.controller.js";

import {
  getAllEquipment,
  getFeaturedEquipment,
  getOwnerEquipment,
  createEquipment,
} from "../controllers/equipment.controller.js";

import {
  createBooking,
  getMyBookings,
  cancelBooking,
} from "../controllers/booking.controller.js";

import { createCheckoutSession } from "../controllers/payment.controller.js";
import { getAdminDashboard } from "../controllers/admin.controller.js";

import {
  requireAuth,
  verifyCustomer,
  verifyOwner,
  verifyAdmin,
} from "../middleware/auth.middleware.js";

import { validate } from "../middleware/validate.middleware.js";
import { createBookingSchema } from "../validations/booking.validation.js";
import { createEquipmentSchema } from "../validations/equipment.validation.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new Error("Only JPG, PNG, WebP, and GIF images are allowed.")
      );
    }
  },
});

router.get("/", getHome);
router.get("/health", getHealth);

router.post(
  "/upload/profile-photo",
  upload.single("image"),
  uploadProfilePhoto
);

router.get("/equipment/featured", getFeaturedEquipment);
router.get("/equipment", getAllEquipment);

// Only authenticated owners can add equipment.
router.post(
  "/equipment",
  requireAuth,
  verifyOwner,
  validate(createEquipmentSchema),
  createEquipment
);

router.get(
  "/owner/equipment",
  requireAuth,
  verifyOwner,
  getOwnerEquipment
);

router.get(
  "/admin/dashboard",
  requireAuth,
  verifyAdmin,
  getAdminDashboard
);

router.post(
  "/bookings",
  requireAuth,
  verifyCustomer,
  validate(createBookingSchema),
  createBooking
);

router.get(
  "/bookings/my-bookings",
  requireAuth,
  verifyCustomer,
  getMyBookings
);

router.patch(
  "/bookings/:id/cancel",
  requireAuth,
  verifyCustomer,
  cancelBooking
);

router.post(
  "/payments/create-checkout-session",
  requireAuth,
  verifyCustomer,
  createCheckoutSession
);

router.get("/profile/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: "User profile retrieved successfully.",
    user: res.locals.user,
  });
});

router.patch("/profile/me", requireAuth, updateProfile);

export default router;
