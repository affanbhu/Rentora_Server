
import { Request, Response, NextFunction } from "express";
import { connectDB } from "../config/db.js";

// Get all equipment (public)
export const getAllEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = await connectDB();

    const equipment = await db
      .collection("equipment")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Equipment retrieved successfully.",
      total: equipment.length,
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
};

// Get equipment belonging to the logged-in owner
export const getOwnerEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const db = await connectDB();

    const equipment = await db
      .collection("equipment")
      .find({ ownerId: user.id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Your equipment retrieved successfully.",
      total: equipment.length,
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
};
