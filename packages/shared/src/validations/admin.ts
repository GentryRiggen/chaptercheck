import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be at most 100 characters"),
  lastName: z
    .string()
    .max(100, "Last name must be at most 100 characters")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  role: z.enum(["admin", "editor", "viewer"]),
  hasPremium: z.boolean(),
  messagingEnabled: z.boolean(),
  storageAccountId: z.string().optional().or(z.literal("")),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
  hasPremium: z.boolean(),
  messagingEnabled: z.boolean(),
  storageAccountId: z.string().optional().or(z.literal("")),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;

export const approveUserSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
  hasPremium: z.boolean(),
  storageAccountId: z.string().optional().or(z.literal("")),
});

export type ApproveUserFormValues = z.infer<typeof approveUserSchema>;
