import { z } from "zod";

export const bookSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
    subtitle: z
      .string()
      .max(200, "Subtitle must be at most 200 characters")
      .optional()
      .or(z.literal("")),
    description: z
      .string()
      .max(5000, "Description must be at most 5000 characters")
      .optional()
      .or(z.literal("")),
    isbn: z.string().max(20, "ISBN must be at most 20 characters").optional().or(z.literal("")),
    publishedYear: z
      .number()
      .min(1000)
      .max(new Date().getFullYear() + 10)
      .optional()
      .nullable(),
    language: z
      .string()
      .max(50, "Language must be at most 50 characters")
      .optional()
      .or(z.literal("")),
    coverImageR2Key: z.string().optional(),
    seriesId: z.string().optional(),
    seriesOrder: z.number().optional().nullable(),
    authorIds: z.array(z.string()).min(1, "At least one author is required"),
    genreIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.seriesId && (data.seriesOrder === null || data.seriesOrder === undefined)) {
        return false;
      }
      return true;
    },
    {
      message: "Book position is required when a series is selected",
      path: ["seriesOrder"],
    }
  );

export type BookFormValues = z.infer<typeof bookSchema>;
