
import { Request, Response } from "express";

// Home controller
export const getHome = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Rentora API!",
  });
};
