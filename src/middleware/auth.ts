import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/tokens";
import { AppError } from "../utils/AppError";
import { Role } from "../models/User";

export const protect = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "Not authenticated. Please log in."));
  }
  try {
    const payload = verifyAccessToken(header.split(" ")[1]);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token."));
  }
};

export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, "You do not have permission to perform this action."));
    }
    next();
  };

  
