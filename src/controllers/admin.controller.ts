
import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";

// Get admin dashboard statistics.
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
      completedBookings,
      totalRevenueResult,
      monthlyBookings,
      recentUsers,
      recentBookings,
      recentEquipment,
    ] = await Promise.all([
      usersCollection.countDocuments(),

      usersCollection.countDocuments({
        $or: [
          { role: "customer" },
          { role: { $exists: false } },
        ],
      }),

      usersCollection.countDocuments({ role: "owner" }),
      equipmentCollection.countDocuments(),
      bookingsCollection.countDocuments(),
      bookingsCollection.countDocuments({ status: "pending" }),
      bookingsCollection.countDocuments({ status: "confirmed" }),
      bookingsCollection.countDocuments({ paymentStatus: "paid" }),
      bookingsCollection.countDocuments({ status: "completed" }),
      bookingsCollection.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]).toArray(),
      bookingsCollection.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth() - 5,
                1
              ),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            bookings: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]).toArray(),

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

      bookingsCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),

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
        completedBookings,
        totalRevenue: Number(totalRevenueResult[0]?.total || 0),
      },
      monthlyBookings,
      recentUsers,
      recentBookings,
      recentEquipment,
    });
  } catch (error) {
    next(error);
  }
};

// Get all registered users.
export const getAdminUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = await connectDB();

    const users = await db
      .collection("user")
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
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      total: users.length,
      data: users.map((user) => ({
        ...user,
        role: user.role || "customer",
      })),
    });
  } catch (error) {
    next(error);
  }
};

// Change a user's role.
export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin = res.locals.user as { id: string };
    const targetUserId = String(req.params.id ?? "");
    const { role } = req.body as { role?: string };

    const allowedRoles = ["customer", "owner", "admin"];

    if (!ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid role.",
      });
    }

    if (String(admin.id) === targetUserId) {
      return res.status(403).json({
        success: false,
        message: "You cannot change your own role.",
      });
    }

    const db = await connectDB();
    const usersCollection = db.collection("user");

    const userFilter = {
      _id: new ObjectId(targetUserId),
    };

    const targetUser = await usersCollection.findOne(userFilter);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Prevent removing the last administrator.
    if (targetUser.role === "admin" && role !== "admin") {
      const adminCount = await usersCollection.countDocuments({
        role: "admin",
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "The last administrator cannot be demoted.",
        });
      }
    }

    await usersCollection.updateOne(userFilter, {
      $set: {
        role,
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "User role updated successfully.",
      data: {
        userId: targetUserId,
        role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all bookings for admin rental management.
export const getAdminBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = await connectDB();

    const bookings = await db
      .collection("bookings")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "All rental bookings retrieved successfully.",
      total: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// Update a booking status as an administrator.
export const updateAdminBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookingId = String(req.params.id ?? "");
    const { status } = req.body as { status?: string };

    const allowedStatuses = [
      "confirmed",
      "rejected",
      "cancelled",
    ];

    if (!ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid booking status.",
      });
    }

    const db = await connectDB();
    const bookingsCollection = db.collection("bookings");

    const result = await bookingsCollection.updateOne(
      {
        _id: new ObjectId(bookingId),
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
        message: "Booking not found or it is no longer pending.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Booking ${status} successfully.`,
      data: {
        bookingId,
        status,
      },
    });
  } catch (error) {
    next(error);
  }
};
