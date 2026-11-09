import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "../config/db";
import {
  passwordResets,
  sessions,
  users,
  type User,
} from "../db/schema/schema";
import {
  fakeVerify,
  hashPassword,
  randomToken,
  sha256,
  signAccessToken,
  verifyPassword,
} from "../utils/Crypto";
import { env } from "../config/env";
import AppError, { ConflictError, NotFoundError } from "../utils/AppError";
import type {
  AdminCreateUserBody,
  RegisterRequestBody,
} from "../schema/auth.schema";

export type Meta = { ip?: string; userAgent?: string };

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const minutes = (n: number) => new Date(Date.now() + n * 60_000);
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

export const revokeFamily = (familyId: string) =>
  db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.familyId, familyId), isNull(sessions.revokedAt)));

export const revokeAllForUser = (
  userId: string,
  exec: Pick<typeof db, "update"> = db,
) =>
  exec
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

const publicUser = (u: User) => ({
  id: u.id,
  username: u.username,
  role: u.role,
  createdAt: u.createdAt,
});

const invalidCredentials = () =>
  new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");

export class AuthService {
  static findAuthUser = async (id: string) => {
    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        tokenVersion: users.tokenVersion,
      })
      .from(users)
      .where(eq(users.id, id));
    return user;
  };

  static issueSession = async (
    user: Pick<User, "id" | "role" | "tokenVersion">,
    meta: Meta,
    familyId: string = crypto.randomUUID(),
    exec: Pick<typeof db, "insert"> = db,
  ) => {
    const refreshToken = randomToken();
    await exec.insert(sessions).values({
      userId: user.id,
      familyId,
      refreshHash: sha256(refreshToken), // store the hash only
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip,
      expiresAt: days(env.REFRESH_TTL_DAYS),
    });
    return { accessToken: signAccessToken(user), refreshToken };
  };

  // Login user
  static login = async (identifier: string, password: string, meta: Meta) => {
    const id = identifier.trim().toLowerCase();
    const column = id.includes("@") ? users.email : users.username;

    const [user] = await db.select().from(users).where(eq(column, id));

    if (!user) {
      await fakeVerify(password);
      throw invalidCredentials();
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(
        "Account temporarily locked. Try again later.",
        429,
        "ACCOUNT_LOCKED",
      );
    }

    const ok = await verifyPassword(user.password, password);
    if (!ok) {
      // Increment in SQL so parallel guesses can't undercount
      const [updated] = await db
        .update(users)
        .set({ failedLogins: sql`${users.failedLogins} + 1` })
        .where(eq(users.id, user.id))
        .returning({ failedLogins: users.failedLogins });

      if (updated && updated.failedLogins >= MAX_FAILS) {
        await db
          .update(users)
          .set({ failedLogins: 0, lockedUntil: minutes(LOCK_MINUTES) })
          .where(eq(users.id, user.id));
      }
      throw invalidCredentials();
    }

    if (user.failedLogins || user.lockedUntil) {
      await db
        .update(users)
        .set({ failedLogins: 0, lockedUntil: null })
        .where(eq(users.id, user.id));
    }

    return {
      user: publicUser(user),
      ...(await AuthService.issueSession(user, meta)),
    };
  };

  static register = async (data: RegisterRequestBody, meta: Meta) => {
    const { username, email, password } = data;
    return AuthService.createUser(
      { username, email, password, role: "sales" },
      meta,
    );
  };

  static registerOwner = async (data: RegisterRequestBody, meta: Meta) => {
    const { username, email, password } = data;
    return AuthService.createUser(
      { username, email, password, role: "owner" },
      meta,
    );
  };

  // Admin-only: call from a route guarded by an admin check
  static adminCreateUser = async (data: AdminCreateUserBody, meta: Meta) =>
    AuthService.createUser(data, meta);

  private static createUser = async (
    data: AdminCreateUserBody, // RegisterRequestBody + optional role
    meta: Meta,
  ) => {
    const { username, email, password, role } = data;
    const hashedPassword = await hashPassword(password);

    const [exists] = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)));
    if (exists) {
      throw new ConflictError("Email or username already registered.");
    }

    let user: User;
    try {
      const [createdUser] = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          ...(role && { role }), // omitted, so the DB default applies
        })
        .returning();
      if (!createdUser) {
        throw new AppError(
          "Failed to create user.",
          500,
          "USER_CREATION_FAILED",
        );
      }
      user = createdUser;
    } catch (err) {
      // Race: two requests passed the check above; the unique constraint catches it
      const code = (err as any)?.cause?.code ?? (err as any)?.code;
      if (code === "23505") {
        throw new ConflictError("Email or username already registered.");
      }
      throw err;
    }

    return {
      user: publicUser(user),
      ...(await AuthService.issueSession(user, meta)),
    };
  };

  //   Refresh token
  static refresh = async (rawToken: string, meta: Meta) => {
    const [s] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshHash, sha256(rawToken)));
    if (!s) throw new AppError("Invalid Token", 401, "INVALID_TOKEN");

    // An already-used token showing up again means it was stolen (or replayed): kill the whole chain.
    if (s.revokedAt) {
      await revokeFamily(s.familyId);
      throw new AppError("Session revoked", 401, "SESSION_REVOKED");
    }

    if (s.expiresAt < new Date())
      throw new AppError("Session Expired", 401, "SESSION_EXPIRED");

    const [user] = await db.select().from(users).where(eq(users.id, s.userId));
    if (!user) throw new AppError("Invalid Session", 401, "INVALID_SESSION");

    return db.transaction(async (tx) => {
      const used = await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.id, s.id), isNull(sessions.revokedAt)));
      if (used.length === 0)
        throw new AppError("Session revoked", 401, "SESSION_REVOKED");
      return {
        user: publicUser(user),
        ...(await AuthService.issueSession(user, meta, s.familyId, tx)),
      };
    });
  };

  //   Logout
  static logout = async (rawToken: string | undefined) => {
    if (!rawToken) return;
    const [s] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshHash, sha256(rawToken)));
    if (s) await revokeFamily(s.familyId);
  };

  // Logout all
  static logoutAll = async (userId: string) => {
    await db.transaction(async (tx) => {
      await revokeAllForUser(userId, tx);
      // bumping tokenVersion also kills access tokens that are still unexpired
      await tx
        .update(users)
        .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
        .where(eq(users.id, userId));
    });
  };

  static getMe = async (userId: string) => {
    const [u] = await db.select().from(users).where(eq(users.id, userId));
    if (!u) throw new NotFoundError("User not found");
    return publicUser(u);
  };

  static listSessions = async (userId: string) => {
    db.select({
      id: sessions.id,
      userAgent: sessions.userAgent,
      ip: sessions.ip,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      );
  };

  //   Change password
  static changePassword = async (
    userId: string,
    current: string,
    next: string,
    meta: Meta,
  ) => {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !(await verifyPassword(user.password, current))) {
      throw new AppError(
        "Current password is incorrect",
        401,
        "INCORRECT_PASSWORD",
      );
    }
    const passwordHash = await hashPassword(next);
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(users)
        .set({
          password: passwordHash,
          tokenVersion: sql`${users.tokenVersion} + 1`,
        })
        .where(eq(users.id, userId))
        .returning();
      if (!updated) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
      }
      await revokeAllForUser(userId, tx);
      return AuthService.issueSession(updated, meta, undefined, tx); // keep this device logged in
    });
  };

  static forgotPassword = async (email: string) => {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (!user) return; // same response either way: don't reveal who is registered
    const token = randomToken();
    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: minutes(30),
    });
    // TODO: send by email (Resend / SMTP). Never return the token in the HTTP response.
    console.log(
      `[dev only] reset link: ${env.ALLOWED_ORIGINS[0]}/reset-password?token=${token}`,
    );
  };

  static resetPassword = async (token: string, newPassword: string) => {
    const [r] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, sha256(token)),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date()),
        ),
      );
    if (!r) throw new AppError("Invalid or expired reset token", 400);

    const passwordHash = await hashPassword(newPassword);
    await db.transaction(async (tx) => {
      await tx
        .update(passwordResets)
        .set({ usedAt: new Date() })
        .where(eq(passwordResets.id, r.id));
      await tx
        .update(users)
        .set({
          password: passwordHash,
          failedLogins: 0,
          lockedUntil: null,
          tokenVersion: sql`${users.tokenVersion} + 1`,
        })
        .where(eq(users.id, r.userId));
      await revokeAllForUser(r.userId, tx);
    });
  };
}
