
import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../config/auth.js";

type UserRole = "customer" | "owner" | "admin";

// Protect routes that require an authenticated user
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in first.",
      });
    }

    res.locals.session = session;
    res.locals.user = {
      ...session.user,
      role: (session.user as typeof session.user & {
        role?: UserRole;
      }).role || "customer",
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Restrict access to a specific role
const allowRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first.",
      });
    }

    if (!roles.includes(user.role as UserRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
};

// Role-specific middleware
export const verifyCustomer = allowRoles("customer");
export const verifyOwner = allowRoles("owner");
export const verifyAdmin = allowRoles("admin");
