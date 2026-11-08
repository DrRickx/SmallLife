import crypto from "node:crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { Role } from "../db/schema/schema";
import { env } from "../config/env";

export const hashPassword = (pw: string) => argon2.hash(pw);
export const verifyPassword = (hash: string, pw: string) =>
  argon2.verify(hash, pw);

let dummyHash: string | undefined;
/** Burn the same time as a real check when the email doesn't exist (blocks user enumeration by timing). */
export async function fakeVerify(pw: string) {
  dummyHash ??= await argon2.hash("dummy-password-for-timing");
  await argon2.verify(dummyHash, pw).catch(() => false);
}

// Access Token JWT
export type AccessPayload = jwt.JwtPayload & {
  sub: string;
  role: Role;
  tv: number;
};
export function signAccessToken(user: {
  id: string;
  role: Role;
  tokenVersion: number;
}) {
  return jwt.sign(
    { role: user.role, tv: user.tokenVersion },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: "HS256",
      subject: user.id,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expiresIn: env.ACCESS_TTL_SEC,
      jwtid: crypto.randomUUID(),
    },
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"], // pinned: never trust the token's own "alg"
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as AccessPayload;
}

// ---- opaque tokens (refresh, password reset) ----
export const randomToken = () => crypto.randomBytes(48).toString("base64url");
export const sha256 = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex");
