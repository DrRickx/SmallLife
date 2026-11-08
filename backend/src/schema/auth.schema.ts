import z from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginRequestBody = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export type RegisterRequestBody = z.infer<typeof registerSchema>;

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
