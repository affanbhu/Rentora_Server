
import { Request, Response, NextFunction } from "express";
import { connectDB } from "../config/db.js";

export const getAdminDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = await connectDB();

    const usersCollection = db.collection("user");
    const equipmentCollection = db.collection("equipment");
    const bookingsCollection = db.collection("bookings");

    const [
      totalUsers,
      totalCustomers,
      totalOwners,
      totalEquipment,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      paidBookings,
      recentUsers,
      recentBookings,
      recentEquipment,
    ] = await Promise.all([
      // Total registered users
      usersCollection.countDocuments(),

      // Customers, including users without an explicitly stored role
      usersCollection.countDocuments({
        $or: [
          { role: "customer" },
          { role: { $exists: false } },
        ],
      }),

      // Total owners
      usersCollection.countDocuments({ role: "owner" }),

      // Total equipment
      equipmentCollection.countDocuments(),

      // Total bookings
      bookingsCollection.countDocuments(),

      // Pending bookings
      bookingsCollection.countDocuments({ status: "pending" }),

      // Confirmed bookings
      bookingsCollection.countDocuments({ status: "confirmed" }),

      // Paid bookings
      bookingsCollection.countDocuments({ paymentStatus: "paid" }),

      // Latest five users
      usersCollection
        .find(
          {},
          {
            projection: {
              name: 1,
              email: 1,
              role: 1,
              createdAt: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),

      // Latest five bookings
      bookingsCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),

      // Latest five equipment records
      equipmentCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Admin dashboard data retrieved successfully.",
      stats: {
        totalUsers,
        totalCustomers,
        totalOwners,
        totalEquipment,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        paidBookings,
      },
      recentUsers,
      recentBookings,
      recentEquipment,
    });
  } catch (error) {
    next(error);
  }
};
