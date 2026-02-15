import { z } from "zod";

export const genreSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
});

export type GenreFormValues = z.infer<typeof genreSchema>;
