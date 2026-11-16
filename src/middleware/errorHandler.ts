import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};



export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = "Something went wrong";
  let errors: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err?.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e: any) => ({ field: e.path, message: e.message }));
  } else if (err?.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  } else if (err?.code === 11000) {
    statusCode = 409;
    message = `${Object.keys(err.keyValue || {})[0] || "Value"} already exists`;
  }

  if (statusCode === 500) console.error(err);

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(env.nodeEnv === "development" && statusCode === 500 ? { stack: err?.stack } : {}),
  });
};



