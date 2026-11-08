import rateLimit from "express-rate-limit";

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
};

// per IP, all auth routes
export const authIpLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 30,
});

// per target account, so a botnet can't hammer one email from many IPs
export const accountLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 10,
  keyGenerator: (req) => `acct:${String(req.body?.email ?? "").toLowerCase()}`,
  validate: { keyGeneratorIpFallback: false },
});
