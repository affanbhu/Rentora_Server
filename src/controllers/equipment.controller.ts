
import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";
import { CreateEquipmentInput } from "../validations/equipment.validation.js";

const getQueryValue = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

// Keep existing AND conditions while adding new filters.
const addAndCondition = (
  filter: Record<string, unknown>,
  condition: Record<string, unknown>
) => {
  const existing = Array.isArray(filter.$and)
    ? filter.$and
    : [];

  filter.$and = [...existing, condition];
};

// Get all publicly approved equipment.
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

    // Approved equipment and older records without approvalStatus.
    addAndCondition(filter, {
      $or: [
        { approvalStatus: "approved" },
        { approvalStatus: { $exists: false } },
      ],
    });

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
        addAndCondition(filter, {
          $or: [
            { rentalType: { $regex: "^daily$", $options: "i" } },
            { rentalType: { $exists: false } },
          ],
        });
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

// Get exactly six available and approved featured equipment items.
export const getFeaturedEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = await connectDB();

    const equipment = await db
      .collection("equipment")
      .find({
        approvalStatus: "approved",
        availability: { $regex: "^available$", $options: "i" },
      })
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
      rentalType: input.rentalType,
      availableQuantity: input.availableQuantity,
      condition: input.condition,
      brand: input.brand,
      model: input.model,
      terms: input.terms,
      availability: "Available",
      approvalStatus: "pending",
      ownerId: user.id,
      ownerName: user.name || "",
      ownerEmail: user.email || "",
      createdAt: now,
      updatedAt: now,
    };

    const result = await equipmentCollection.insertOne(newEquipment);

    return res.status(201).json({
      success: true,
      message:
        "Equipment submitted successfully and is awaiting admin approval.",
      data: {
        ...newEquipment,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get equipment awaiting admin approval.
export const getPendingEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const db = await connectDB();

    const equipment = await db
      .collection("equipment")
      .find({ approvalStatus: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Pending equipment retrieved successfully.",
      total: equipment.length,
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
};

// Approve or reject equipment.
export const updateEquipmentApproval = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const equipmentId = String(req.params.id ?? "");
    const { approvalStatus } = req.body as {
      approvalStatus?: string;
    };

    if (!ObjectId.isValid(equipmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    if (!["approved", "rejected"].includes(approvalStatus || "")) {
      return res.status(400).json({
        success: false,
        message: "Approval status must be approved or rejected.",
      });
    }

    const db = await connectDB();
    const equipmentCollection = db.collection("equipment");

    const result = await equipmentCollection.updateOne(
      {
        _id: new ObjectId(equipmentId),
        approvalStatus: "pending",
      },
      {
        $set: {
          approvalStatus,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Pending equipment not found. It may already have been reviewed.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Equipment ${approvalStatus} successfully.`,
      data: {
        equipmentId,
        approvalStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update equipment belonging to the authenticated owner.
export const updateOwnerEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user as { id: string };
    const equipmentId = String(req.params.id ?? "");
    const input = req.body as CreateEquipmentInput;

    if (!ObjectId.isValid(equipmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    const db = await connectDB();

    const result = await db.collection("equipment").updateOne(
      {
        _id: new ObjectId(equipmentId),
        ownerId: user.id,
      },
      {
        $set: {
          name: input.name,
          category: input.category,
          description: input.description,
          dailyRate: input.dailyRate,
          location: input.location,
          imageUrl: input.imageUrl,
          rentalType: input.rentalType,
          availableQuantity: input.availableQuantity,
          condition: input.condition,
          brand: input.brand,
          model: input.model,
          terms: input.terms,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or you do not own this equipment.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Equipment updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// Delete equipment belonging to the authenticated owner.
export const deleteOwnerEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user as { id: string };
    const equipmentId = String(req.params.id ?? "");

    if (!ObjectId.isValid(equipmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    const db = await connectDB();
    const equipmentCollection = db.collection("equipment");

    const equipment = await equipmentCollection.findOne({
      _id: new ObjectId(equipmentId),
      ownerId: user.id,
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or you do not own this equipment.",
      });
    }

    const activeBooking = await db.collection("bookings").findOne({
      $or: [
        { equipmentId: equipment._id },
        { equipmentSlug: equipment.slug },
      ],
      status: { $in: ["pending", "confirmed"] },
    });

    if (activeBooking) {
      return res.status(409).json({
        success: false,
        message:
          "This equipment cannot be deleted because it has pending or confirmed bookings.",
      });
    }

    await equipmentCollection.deleteOne({
      _id: equipment._id,
      ownerId: user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Equipment deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// Get all equipment for admin management.
export const getAllAdminEquipment = async (
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

    return res.status(200).json({
      success: true,
      message: "All equipment retrieved successfully.",
      total: equipment.length,
      data: equipment,
    });
  } catch (error) {
    next(error);
  }
};

// Update any equipment as an administrator.
export const updateAdminEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const equipmentId = String(req.params.id ?? "");
    const input = req.body as CreateEquipmentInput;

    if (!ObjectId.isValid(equipmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    const db = await connectDB();

    const result = await db.collection("equipment").updateOne(
      { _id: new ObjectId(equipmentId) },
      {
        $set: {
          name: input.name,
          category: input.category,
          description: input.description,
          dailyRate: input.dailyRate,
          location: input.location,
          imageUrl: input.imageUrl,
          rentalType: input.rentalType,
          availableQuantity: input.availableQuantity,
          condition: input.condition,
          brand: input.brand,
          model: input.model,
          terms: input.terms,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Equipment updated successfully by admin.",
    });
  } catch (error) {
    next(error);
  }
};

// Delete any equipment as an administrator.
export const deleteAdminEquipment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const equipmentId = String(req.params.id ?? "");

    if (!ObjectId.isValid(equipmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    const db = await connectDB();
    const equipmentCollection = db.collection("equipment");

    const equipment = await equipmentCollection.findOne({
      _id: new ObjectId(equipmentId),
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found.",
      });
    }

    const activeBooking = await db.collection("bookings").findOne({
      $or: [
        { equipmentId: equipment._id },
        { equipmentSlug: equipment.slug },
      ],
      status: { $in: ["pending", "confirmed"] },
    });

    if (activeBooking) {
      return res.status(409).json({
        success: false,
        message:
          "This equipment cannot be deleted because it has pending or confirmed bookings.",
      });
    }

    await equipmentCollection.deleteOne({
      _id: equipment._id,
    });

    return res.status(200).json({
      success: true,
      message: "Equipment deleted successfully by admin.",
    });
  } catch (error) {
    next(error);
  }
};
