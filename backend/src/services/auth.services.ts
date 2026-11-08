import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { sessions, users, type User } from "../db/schema/schema";
import { randomToken, sha256, signAccessToken } from "../utils/Crypto";
import { env } from "../config/env";

export type Meta = { ip?: string; userAgent?: string };

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const minutes = (n: number) => new Date(Date.now() + n * 60_000);
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

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
  ) => {
    const refreshToken = randomToken();
    await db.insert(sessions).values({
      userId: user.id,
      familyId,
      refreshHash: sha256(refreshToken), // store the hash only
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip,
      expiresAt: days(env.REFRESH_TTL_DAYS),
    });
    return { accessToken: signAccessToken(user), refreshToken };
  };
}
