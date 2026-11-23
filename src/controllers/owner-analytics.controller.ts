import { Request, Response, NextFunction } from "express";
import { connectDB } from "../config/db.js";

export const getOwnerAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user as { id: string };
    const db = await connectDB();

    const bookings = await db
      .collection("bookings")
      .find({ ownerId: user.id })
      .toArray();

    const totalListedEquipment = await db
      .collection("equipment")
      .countDocuments({ ownerId: user.id });

    const completedRentals = bookings.filter(
      (booking) => booking.status === "completed"
    ).length;

    const paidBookings = bookings.filter(
      (booking) => booking.paymentStatus === "paid"
    );

    const totalEarnings = paidBookings.reduce(
      (total, booking) => total + (Number(booking.totalPrice) || 0),
      0
    );

    const pendingBookings = bookings.filter(
      (booking) => booking.status === "pending"
    ).length;

    const confirmedBookings = bookings.filter(
      (booking) => booking.status === "confirmed"
    ).length;

    const monthlyRevenue = Array.from({ length: 12 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - index));

      const year = date.getFullYear();
      const month = date.getMonth();

      const revenue = paidBookings.reduce((total, booking) => {
        const paidAt = booking.paidAt
          ? new Date(booking.paidAt)
          : null;

        if (
          paidAt &&
          paidAt.getFullYear() === year &&
          paidAt.getMonth() === month
        ) {
          return total + (Number(booking.totalPrice) || 0);
        }

        return total;
      }, 0);

      return {
        month: date.toLocaleString("en-US", { month: "short" }),
        year,
        revenue,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Owner analytics retrieved successfully.",
      stats: {
        totalBookings: bookings.length,
        totalListedEquipment,
        completedRentals,
        paidBookings: paidBookings.length,
        pendingBookings,
        confirmedBookings,
        totalEarnings,
        averageBookingValue:
          paidBookings.length > 0
            ? Math.round(totalEarnings / paidBookings.length)
            : 0,
      },
      monthlyRevenue,
    });
  } catch (error) {
    next(error);
  }
};
