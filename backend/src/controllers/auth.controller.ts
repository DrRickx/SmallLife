import { env } from "../config/env";
import type { Request, Response } from "express";
import catchAsync from "../utils/CatchAsync";
import { registerSchema } from "../schema/auth.schema";
import { AuthService } from "../services/auth.services";
import AppError from "../utils/AppError";

const COOKIE = "refresh_token";
const cookieOpts = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/auth", // the browser only sends it to auth routes
};

const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(COOKIE, token, {
    ...cookieOpts,
    maxAge: env.REFRESH_TTL_DAYS * 86_400_000,
  });

const clearRefreshCookie = (res: Response) =>
  res.clearCookie(COOKIE, cookieOpts);

const meta = (req: Request) => {
  const ip = req.ip;
  const userAgent = req.get("user-agent");

  return {
    ...(ip !== undefined ? { ip } : {}),
    ...(userAgent !== undefined ? { userAgent } : {}),
  };
};

function sendSession(
  res: Response,
  s: { user?: unknown; accessToken: string; refreshToken: string },
  status = 200,
) {
  setRefreshCookie(res, s.refreshToken);
  res.status(status).json({ user: s.user, accessToken: s.accessToken });
}

export class AuthController {
  static register = catchAsync(async (req: Request, res: Response) => {
    const data = registerSchema.parse(req.body);
    sendSession(res, await AuthService.register(data, meta(req)), 201);
  });

  static registerOwner = catchAsync(async (req: Request, res: Response) => {
    const data = registerSchema.parse(req.body);
    sendSession(res, await AuthService.registerOwner(data, meta(req)), 201);
  });

  static login = catchAsync(async (req: Request, res: Response) => {
    const { identifier, password } = req.body;
    sendSession(res, await AuthService.login(identifier, password, meta(req)));
  });

  static refresh = catchAsync(async (req: Request, res: Response) => {
    const token = req.cookies?.[COOKIE];
    if (!token) throw new AppError("No Session", 401, "NO_SESSION");
    try {
      sendSession(res, await AuthService.refresh(token, meta(req)));
    } catch (err: any) {
      clearRefreshCookie(res);
      throw err;
    }
  });

  static logout = catchAsync(async (req: Request, res: Response) => {
    await AuthService.logout(req.cookies?.[COOKIE]);
    clearRefreshCookie(res);
    res.status(204).end();
  });

  static logoutAll = catchAsync(async (req: Request, res: Response) => {
    await AuthService.logoutAll(req.user!.id);
    clearRefreshCookie(res);
    res.status(204).end();
  });

  static me = catchAsync(async (req: Request, res: Response) => {
    res.json({ user: await AuthService.getMe(req.user!.id) });
  });

  static sessions = catchAsync(async (req: Request, res: Response) => {
    res.json({ sessions: await AuthService.listSessions(req.user!.id) });
  });

  static changePassword = catchAsync(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    sendSession(
      res,
      await AuthService.changePassword(
        req.user!.id,
        currentPassword,
        newPassword,
        meta(req),
      ),
    );
  });

  static forgotPassword = catchAsync(async (req: Request, res: Response) => {
    await AuthService.forgotPassword(req.body.email);
    res.json({ message: "If that email exists, a reset link has been sent." });
  });

  static resetPassword = catchAsync(async (req: Request, res: Response) => {
    await AuthService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ message: "Password updated. Please log in." });
  });
}
