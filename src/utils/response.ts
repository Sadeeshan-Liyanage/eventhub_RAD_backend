import { Response } from "express";

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200, message?: string) =>
  res.status(statusCode).json({ success: true, message, data });
