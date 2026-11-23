import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";

// Get favorites for the logged-in customer
export const getFavorites = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const db = await connectDB();

    const favorites = await db
      .collection("favorites")
      .find({ userId: user.id })
      .sort({ createdAt: -1 })
      .toArray();

    const equipmentIds = favorites.map(
      (favorite) => favorite.equipmentId as ObjectId
    );

    const equipment = equipmentIds.length
      ? await db
          .collection("equipment")
          .find({ _id: { $in: equipmentIds } })
          .toArray()
      : [];

    return res.status(200).json({
      success: true,
      message: "Your favorites retrieved successfully.",
      total: equipment.length,
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
};

// Add equipment to favorites
export const addFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const equipmentId = req.params.equipmentId;

    if (typeof equipmentId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    if (!ObjectId.isValid(equipmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    const db = await connectDB();
    const equipmentObjectId = new ObjectId(equipmentId);

    const equipment = await db.collection("equipment").findOne({
      _id: equipmentObjectId,
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found.",
      });
    }

    const existingFavorite = await db.collection("favorites").findOne({
      userId: user.id,
      equipmentId: equipmentObjectId,
    });

    if (existingFavorite) {
      return res.status(200).json({
        success: true,
        message: "Equipment is already in your favorites.",
      });
    }

    await db.collection("favorites").insertOne({
      userId: user.id,
      equipmentId: equipmentObjectId,
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Equipment added to favorites successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// Remove equipment from favorites
export const removeFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const equipmentId = req.params.equipmentId;

    if (typeof equipmentId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    if (!ObjectId.isValid(equipmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    const db = await connectDB();

    const result = await db.collection("favorites").deleteOne({
      userId: user.id,
      equipmentId: new ObjectId(equipmentId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Favorite equipment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Equipment removed from favorites successfully.",
    });
  } catch (error) {
    next(error);
  }
};
