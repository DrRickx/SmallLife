import z from "zod";
import { roleEnum } from "../db/schema/schema";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginRequestBody = z.infer<typeof loginSchema>;

type Role = (typeof roleEnum.enumValues)[number];

export const registerSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  email: z.email("Invalid email address").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128),
});

// For admin-only user creation
export const adminCreateUserSchema = registerSchema.extend({
  role: z.enum(roleEnum.enumValues).optional(),
});

export type RegisterRequestBody = z.infer<typeof registerSchema>;
export type AdminCreateUserBody = z.infer<typeof adminCreateUserSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long"),
});
export const forgotSchema = z.object({
  email: z.email("Invalid email address").toLowerCase().trim(),
});
export const resetSchema = z.object({
  token: z.string().min(20),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long"),
});
