import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { csrfGuard } from "../middleware/csrf.middleware";
import {
  accountLimiter,
  authIpLimiter,
} from "../middleware/rateLimit.middleware";
import {
  changePasswordSchema,
  forgotSchema,
  loginSchema,
  resetSchema,
} from "../schema/auth.schema";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
router.use(authIpLimiter);

router.post("/register", accountLimiter, AuthController.register);
router.post("/register/owner", accountLimiter, AuthController.registerOwner);
router.post(
  "/forgot-password",
  accountLimiter,
  validate(forgotSchema),
  AuthController.forgotPassword,
);
router.post(
  "/reset-password",
  validate(resetSchema),
  AuthController.resetPassword,
);
router.post(
  "/login",
  accountLimiter,
  validate(loginSchema),
  AuthController.login,
);

// cookies
router.post("/refresh", csrfGuard, AuthController.refresh);
router.post("/logout", csrfGuard, AuthController.logout);

// bearer-token protected
router.post("/logout-all", requireAuth, AuthController.logoutAll);
router.get("/me", requireAuth, AuthController.me);
router.get("/sessions", requireAuth, AuthController.sessions);
router.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  AuthController.changePassword,
);

export default router;
