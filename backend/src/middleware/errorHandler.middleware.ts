import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import AppError from "../utils/AppError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
  }
  if (err instanceof AppError) {
    if (err.statusCode >= 500) console.error(err);
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }
  console.error("Unhandled request error:", err);
  return res.status(500).json({ error: "Internal server error" });
}
