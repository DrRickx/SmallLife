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
  if (err instanceof AppError)
    return res.status(Number(err.status)).json({ error: err.message });
  console.error(err); // never send internals to the client
  res.status(500).json({ error: "Internal server error" });
}
