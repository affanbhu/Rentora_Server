import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";

// Create a new booking
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
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      ownerId: equipment.ownerId || null,
      ownerName: equipment.ownerName || "",
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

// Get bookings for the logged-in customer
export const getMyBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const db = await connectDB();

    const bookings = await db
      .collection("bookings")
      .find({ userId: user.id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Your bookings retrieved successfully.",
      total: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// Get incoming bookings for the logged-in owner
export const getOwnerBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const db = await connectDB();

    const bookings = await db
      .collection("bookings")
      .find({ ownerId: user.id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Owner booking requests retrieved successfully.",
      total: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// Accept or reject a pending booking request
export const updateOwnerBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id;
    const user = res.locals.user;
    const { status } = req.body;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    if (!["confirmed", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be confirmed or rejected.",
      });
    }

    const db = await connectDB();

    const result = await db.collection("bookings").updateOne(
      {
        _id: new ObjectId(id),
        ownerId: user.id,
        status: "pending",
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or it can no longer be updated.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Booking ${status === "confirmed" ? "accepted" : "rejected"} successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// Cancel a pending booking by its customer
export const cancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id;
    const user = res.locals.user;

    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const db = await connectDB();

    const result = await db.collection("bookings").updateOne(
      {
        _id: new ObjectId(id),
        userId: user.id,
        status: "pending",
      },
      {
        $set: {
          status: "cancelled",
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or cannot be cancelled.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
    });
  } catch (error) {
    next(error);
  }
};
