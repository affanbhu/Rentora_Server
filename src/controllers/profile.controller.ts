import type { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../config/auth.js";

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, image, phoneNumber, address } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "Name is required.",
      });
      return;
    }

    if (image !== undefined && image !== null && typeof image !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid profile image.",
      });
      return;
    }

    if (phoneNumber !== undefined && typeof phoneNumber !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid phone number.",
      });
      return;
    }

    if (address !== undefined && typeof address !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid address.",
      });
      return;
    }

    const updatedUser = await auth.api.updateUser({
      headers: fromNodeHeaders(req.headers),
      body: {
        name: name.trim(),
        ...(image !== undefined ? { image } : {}),
        ...(phoneNumber !== undefined
          ? { phoneNumber: phoneNumber.trim() }
          : {}),
        ...(address !== undefined ? { address: address.trim() } : {}),
      },
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update profile. Please try again.",
    });
  }
};
