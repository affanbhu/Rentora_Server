
import { Request, Response } from "express";

// Health check controller
export const getHealth = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Rentora server is running successfully.",
    timestamp: new Date().toISOString(),
  });
};
