import { Request, Response, NextFunction } from "express";
import { connectDB } from "../config/db.js";
import { CreateEquipmentInput } from "../validations/equipment.validation.js";

// Read a single query-string value safely.
const getQueryValue = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

// Get all equipment with server-side search, filtering, and sorting.
export const getAllEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = await connectDB();

    const search = getQueryValue(req.query.search);
    const category = getQueryValue(req.query.category);
    const location = getQueryValue(req.query.location);
    const availability = getQueryValue(req.query.availability);
    const rentalType = getQueryValue(req.query.rentalType);
    const minPriceValue = getQueryValue(req.query.minPrice);
    const maxPriceValue = getQueryValue(req.query.maxPrice);
    const sortBy = getQueryValue(req.query.sortBy);

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "All Categories") {
      filter.category = { $regex: `^${category}$`, $options: "i" };
    }

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    if (availability && availability !== "All") {
      filter.availability = {
        $regex: `^${availability}$`,
        $options: "i",
      };
    }

    if (rentalType && rentalType !== "All") {
      if (rentalType.toLowerCase() === "daily") {
        filter.$and = [
          ...(Array.isArray(filter.$and) ? filter.$and : []),
          {
            $or: [
              { rentalType: { $regex: "^daily$", $options: "i" } },
              { rentalType: { $exists: false } },
            ],
          },
        ];
      } else {
        filter.rentalType = {
          $regex: `^${rentalType}$`,
          $options: "i",
        };
      }
    }

    const minPrice = minPriceValue ? Number(minPriceValue) : undefined;
    const maxPrice = maxPriceValue ? Number(maxPriceValue) : undefined;

    if (
      (minPrice !== undefined && !Number.isFinite(minPrice)) ||
      (maxPrice !== undefined && !Number.isFinite(maxPrice)) ||
      (minPrice !== undefined && minPrice < 0) ||
      (maxPrice !== undefined && maxPrice < 0) ||
      (minPrice !== undefined &&
        maxPrice !== undefined &&
        minPrice > maxPrice)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid price range.",
      });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Record<string, number> = {};

      if (minPrice !== undefined) priceFilter.$gte = minPrice;
      if (maxPrice !== undefined) priceFilter.$lte = maxPrice;

      filter.dailyRate = priceFilter;
    }

    const sortOptions: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      priceLowToHigh: { dailyRate: 1 },
      priceHighToLow: { dailyRate: -1 },
      nameAZ: { name: 1 },
      nameZA: { name: -1 },
    };

    const sort = sortOptions[sortBy] || sortOptions.newest;

    const equipment = await db
      .collection("equipment")
      .find(filter)
      .sort(sort)
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

// Get six available featured equipment items.
export const getFeaturedEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = await connectDB();

    const equipment = await db
      .collection("equipment")
      .find({ availability: { $regex: "^available$", $options: "i" } })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Featured equipment retrieved successfully.",
      total: equipment.length,
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
};

// Get equipment belonging to the logged-in owner.
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

// Create equipment for the authenticated owner.
export const createEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user as {
      id?: string;
      name?: string;
      email?: string;
    };

    if (!user?.id) {
      return res.status(401).json({
        success: false,
        message: "Please log in before adding equipment.",
      });
    }

    const input = req.body as CreateEquipmentInput;
    const db = await connectDB();
    const equipmentCollection = db.collection("equipment");

    const baseSlug =
      input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "equipment";

    let slug = baseSlug;
    let suffix = 1;

    while (await equipmentCollection.findOne({ slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const now = new Date();

    const newEquipment = {
      slug,
      name: input.name,
      category: input.category,
      description: input.description,
      dailyRate: input.dailyRate,
      location: input.location,
      imageUrl: input.imageUrl,
      availability: "Available",
      ownerId: user.id,
      ownerName: user.name || "",
      ownerEmail: user.email || "",
      createdAt: now,
      updatedAt: now,
    };

    const result = await equipmentCollection.insertOne(newEquipment);

    return res.status(201).json({
      success: true,
      message: "Equipment added successfully.",
      data: {
        ...newEquipment,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    next(error);
  }
};
