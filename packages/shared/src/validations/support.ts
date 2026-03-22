import { z } from "zod";

export const supportRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  category: z.enum(["bug_report", "feature_request", "general_question", "account_issue"]),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be at most 5000 characters"),
});

export type SupportRequestFormValues = z.infer<typeof supportRequestSchema>;
