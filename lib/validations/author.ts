import { z } from "zod";

export const authorSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  bio: z
    .string()
    .max(2000, "Bio must be at most 2000 characters")
    .optional()
    .or(z.literal("")),
  imageR2Key: z.string().optional(),
});

export type AuthorFormValues = z.infer<typeof authorSchema>;
