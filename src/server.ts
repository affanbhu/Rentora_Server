
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./config/auth.js";
import { connectDB } from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
import {
  requireJwtAuth,
  verifyJwtCustomer,
  verifyJwtOwner,
  verifyJwtAdmin,
} from "./middleware/auth.middleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Ensure MongoDB is connected before handling requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// Better Auth handler
app.all("/api/auth/{*any}", toNodeHandler(auth));

// Body parser
app.use(express.json());

// General JWT verification test endpoint
app.get("/api/jwt-test", requireJwtAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: "JWT verified successfully.",
    user: {
      id: res.locals.user.id,
      email: res.locals.user.email,
      role: res.locals.user.role,
    },
  });
});

// Customer role test endpoint
app.get(
  "/api/jwt-test/customer",
  ...verifyJwtCustomer,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Customer access granted.",
      role: res.locals.user.role,
    });
  }
);

// Owner role test endpoint
app.get(
  "/api/jwt-test/owner",
  ...verifyJwtOwner,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Owner access granted.",
      role: res.locals.user.role,
    });
  }
);

// Admin role test endpoint
app.get(
  "/api/jwt-test/admin",
  ...verifyJwtAdmin,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Admin access granted.",
      role: res.locals.user.role,
    });
  }
);

// API routes
app.use("/api", apiRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Central error handler
app.use(errorHandler);

// Local development server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Rentora server is running on http://localhost:${PORT}`);
  });
}

// Vercel serverless entry point
export default app;
