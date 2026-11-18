import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { AppError } from "../utils/AppError";

export const validate =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return next(new AppError(400, "Validation failed", errors));
    }
    req.body = result.data;
    next();
  };

// Same idea for the query string. The cleaned values are stored in res.locals.query.
export const validateQuery =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return next(new AppError(400, "Invalid search filters", errors));
    }
    res.locals.query = result.data;
    next();
  };
