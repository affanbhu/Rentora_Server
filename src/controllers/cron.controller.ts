import { Request, Response } from "express";
import { completeExpiredBookings } from "../services/booking-cron.service.js";

export const runBookingCompletionCron = async (
  req: Request,
  res: Response
) => {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return res.status(503).json({
      success: false,
      message: "CRON_SECRET is not configured.",
    });
  }

  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized cron request.",
    });
  }

  try {
    const result = await completeExpiredBookings();

    return res.status(200).json({
      success: true,
      message: "Booking completion job finished.",
      data: result,
    });
  } catch (error) {
    console.error("Booking completion cron failed:", error);

    return res.status(500).json({
      success: false,
      message: "Booking completion job failed.",
    });
  }
};
