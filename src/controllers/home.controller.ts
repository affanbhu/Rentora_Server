import { Request, Response, NextFunction } from "express";
import { connectDB } from "../config/db.js";

export const getHome = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = await connectDB();

    const usersCollection = db.collection("user");
    const equipmentCollection = db.collection("equipment");
    const bookingsCollection = db.collection("bookings");

    const [totalEquipment, totalCustomers, totalBookings] =
      await Promise.all([
        equipmentCollection.countDocuments(),

        usersCollection.countDocuments({
          $or: [
            { role: "customer" },
            { role: { $exists: false } },
          ],
        }),

        bookingsCollection.countDocuments(),
      ]);

    return res.status(200).json({
      success: true,
      message: "Homepage data retrieved successfully.",
      stats: {
        totalEquipment,
        totalCustomers,
        totalBookings,
      },
    });
  } catch (error) {
    next(error);
  }
};
