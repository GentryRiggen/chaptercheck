import { z } from "zod";

export const shelfSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .or(z.literal("")),
  isOrdered: z.boolean(),
  isPublic: z.boolean(),
});

export type ShelfFormValues = z.infer<typeof shelfSchema>;
