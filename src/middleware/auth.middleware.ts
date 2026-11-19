
import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../config/auth.js";

// Protect routes that require an authenticated user
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the current user's session
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    // Reject requests without a valid session
    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in first.",
      });
    }

    // Make session and user available to protected routes
    res.locals.session = session;
    res.locals.user = session.user;

    next();
  } catch (error) {
    next(error);
  }
};
