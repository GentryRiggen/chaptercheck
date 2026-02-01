import { z } from "zod";

export const emailSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export type EmailFormValues = z.infer<typeof emailSchema>;

export const otpSchema = z.object({
  code: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must contain only numbers"),
});

export type OtpFormValues = z.infer<typeof otpSchema>;

export const accountSettingsSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be at most 100 characters"),
  lastName: z
    .string()
    .max(100, "Last name must be at most 100 characters")
    .optional()
    .or(z.literal("")),
});

export type AccountSettingsFormValues = z.infer<typeof accountSettingsSchema>;
