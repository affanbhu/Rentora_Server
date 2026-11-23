
import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";
import { CreateReviewInput } from "../validations/review.validation.js";

// Submit a review for successfully paid equipment.
export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user as {
      id: string;
      name?: string;
      email?: string;
    };

    const input = req.body as CreateReviewInput;

    if (!ObjectId.isValid(input.bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const db = await connectDB();

    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(input.bookingId),
      userId: user.id,
      paymentStatus: "paid",
      status: "confirmed",
    });

    if (!booking) {
      return res.status(403).json({
        success: false,
        message:
          "You can only review equipment from a successfully paid booking.",
      });
    }

    const reviewsCollection = db.collection("reviews");

    const existingReview = await reviewsCollection.findOne({
      bookingId: input.bookingId,
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this booking.",
      });
    }

    const now = new Date();

    const review = {
      bookingId: input.bookingId,
      equipmentId: booking.equipmentId,
      equipmentSlug: booking.equipmentSlug,
      equipmentName: booking.equipmentName,
      userId: user.id,
      userName: user.name || "Customer",
      rating: input.rating,
      comment: input.comment,
      createdAt: now,
      updatedAt: now,
    };

    const result = await reviewsCollection.insertOne(review);

    return res.status(201).json({
      success: true,
      message: "Your review has been submitted successfully.",
      data: {
        ...review,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all reviews for one equipment item.
export const getEquipmentReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const slug = req.params.slug;

    if (typeof slug !== "string" || !slug.trim()) {
      return res.status(400).json({
        success: false,
        message: "Equipment slug is required.",
      });
    }

    const db = await connectDB();
    const reviewsCollection = db.collection("reviews");

    const [reviews, ratingSummary] = await Promise.all([
      reviewsCollection
        .find({ equipmentSlug: slug })
        .sort({ createdAt: -1 })
        .toArray(),

      reviewsCollection
        .aggregate([
          { $match: { equipmentSlug: slug } },
          {
            $group: {
              _id: null,
              averageRating: { $avg: "$rating" },
              totalReviews: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const summary = ratingSummary[0] || {
      averageRating: 0,
      totalReviews: 0,
    };

    return res.status(200).json({
      success: true,
      message: "Equipment reviews retrieved successfully.",
      stats: {
        averageRating: Number(summary.averageRating.toFixed(1)),
        totalReviews: summary.totalReviews,
      },
      total: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// Get the six most recent reviews across all equipment.
export const getRecentReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = await connectDB();

    const reviews = await db
      .collection("reviews")
      .find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Recent customer reviews retrieved successfully.",
      total: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};
