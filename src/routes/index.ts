
import { Router } from "express";
import { getHome } from "../controllers/home.controller.js";
import { getHealth } from "../controllers/health.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerSchema } from "../validations/auth.validation.js";

const router = Router();

// Home API
router.get("/", getHome);

// Health check API
router.get("/health", getHealth);

// Temporary registration validation test
router.post("/test-register", validate(registerSchema), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Registration data validated successfully!",
    data: req.body,
  });
});

export default router;
