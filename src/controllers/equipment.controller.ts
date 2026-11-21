
import { Request, Response, NextFunction } from "express";
import { connectDB } from "../config/db.js";

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

    res.status(200).json({
      success: true,
      message: "Equipment retrieved successfully.",
      total: equipment.length,
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
};
