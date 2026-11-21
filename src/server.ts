
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./config/auth.js";
import { connectDB } from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5001;

// CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
// Better Auth handler (must be before express.json)
app.all("/api/auth/{*any}", toNodeHandler(auth));

// Body parser for other API routes
app.use(express.json());

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

// Connect database and start server
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Rentora server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Rentora server:", error);
    process.exit(1);
  }
}

startServer();
