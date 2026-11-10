import catchAsync from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/Crypto";
import { AuthService } from "../services/auth.services";

export const requireAuth = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.get("authorization");
    if (!header?.startsWith("Bearer "))
      throw new AppError("Missing token", 401, "MISSING_TOKEN");

    let payload;
    try {
      payload = verifyAccessToken(header.slice(7));
    } catch (err: any) {
      throw new AppError("Invalid token", 401, "INVALID_TOKEN");
    }

    const user = await AuthService.findAuthUser(payload.sub);

    if (!user || user.tokenVersion !== payload.tv)
      throw new AppError("Token revoked", 401, "TOKEN_REVOKED");

    req.user = { id: user.id, email: user.email, role: user.role }; // role comes from the DB, not the token
    next();
  },
);

export const restrictTo = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have permission for this action",
          403,
          "FORBIDDEN",
        ),
      );
    }
    next();
  };
};
