
import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { auth } from "../config/auth.js";

type UserRole = "customer" | "owner" | "admin";

const authBaseURL = (
  process.env.BETTER_AUTH_URL || "http://localhost:5001"
).replace(/\/$/, "");

const JWKS = createRemoteJWKSet(
  new URL(`${authBaseURL}/api/auth/jwks`)
);

// Existing cookie-based authentication.
// Keep this working for existing routes.
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
      role:
        (session.user as typeof session.user & {
          role?: UserRole;
        }).role || "customer",
    };

    next();
  } catch (error) {
    next(error);
  }
};

// New JWT-based authentication.
export const requireJwtAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid authorization token.",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Missing authorization token.",
      });
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: authBaseURL,
      audience: authBaseURL,
    });

    const userId = payload.id || payload.sub;

    if (typeof userId !== "string" || !userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token user information.",
      });
    }

    const role: UserRole =
      payload.role === "owner" || payload.role === "admin"
        ? payload.role
        : "customer";

    res.locals.user = {
      id: userId,
      email:
        typeof payload.email === "string" ? payload.email : undefined,
      role,
    };

    res.locals.jwtPayload = payload;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired JWT.",
    });
  }
};

// Restrict access to a specific role.
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

// Existing cookie-based role middleware.
export const verifyCustomer = allowRoles("customer");
export const verifyOwner = allowRoles("owner");
export const verifyAdmin = allowRoles("admin");

// JWT-based role middleware.
export const verifyJwtCustomer = [
  requireJwtAuth,
  allowRoles("customer"),
];

export const verifyJwtOwner = [
  requireJwtAuth,
  allowRoles("owner"),
];

export const verifyJwtAdmin = [
  requireJwtAuth,
  allowRoles("admin"),
];
