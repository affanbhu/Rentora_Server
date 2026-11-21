
import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { equipmentSlug, startDate, endDate } = req.body;
    const user = res.locals.user;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start.toISOString().slice(0, 10) !== startDate ||
      end.toISOString().slice(0, 10) !== endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid dates in YYYY-MM-DD format.",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today || end < start) {
      return res.status(400).json({
        success: false,
        message: "Please select valid rental dates.",
      });
    }

    const db = await connectDB();

    const equipment = await db.collection("equipment").findOne({
      slug: equipmentSlug,
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found.",
      });
    }

    if (equipment.availability !== "Available") {
      return res.status(400).json({
        success: false,
        message: "This equipment is not available.",
      });
    }

    const overlappingBooking = await db.collection("bookings").findOne({
      equipmentSlug,
      status: { $in: ["pending", "confirmed"] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });

    if (overlappingBooking) {
      return res.status(409).json({
        success: false,
        message: "This equipment is already booked for the selected dates.",
      });
    }

    const totalDays =
      Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

    const totalPrice = totalDays * equipment.dailyRate;

    const booking = {
      userId: new ObjectId(user.id),
      userName: user.name,
      userEmail: user.email,
      equipmentId: equipment._id,
      equipmentSlug,
      equipmentName: equipment.name,
      startDate,
      endDate,
      totalDays,
      dailyRate: equipment.dailyRate,
      totalPrice,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(booking);

    return res.status(201).json({
      success: true,
      message: "Booking request submitted successfully.",
      data: {
        ...booking,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    next(error);
  }
};
