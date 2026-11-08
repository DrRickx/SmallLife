import { env } from "../config/env";
import AppError from "../utils/AppError";
import type { Request, Response, NextFunction } from "express";

export function csrfGuard(req: Request, _res: Response, next: NextFunction) {
  const origin = req.get("origin");
  if (
    !origin ||
    !env.ALLOWED_ORIGINS.includes(origin) ||
    req.get("x-requested-with") !== "fetch"
  ) {
    throw new AppError("CSRF check failed", 403, "CSRF_CHECK_FAILED");
  }
  next();
}
