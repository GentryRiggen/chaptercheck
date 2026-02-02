import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v } from "convex/values";

import { action } from "../_generated/server";
import { getR2Client, getStoragePrefix } from "../lib/r2Client";
import type { OpenLibraryAuthorSuggestion, OpenLibraryBookSuggestion } from "./types";

// Search books on Open Library
export const searchBooks = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args): Promise<OpenLibraryBookSuggestion[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    if (args.query.trim().length < 2) {
      return [];
    }

    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(args.query)}&limit=5&fields=key,title,subtitle,first_sentence,isbn,first_publish_year,language,cover_i,author_name,author_key`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error("Open Library search failed:", response.status);
        return [];
      }

      const data = await response.json();

      return (data.docs || []).map(
        (doc: {
          key: string;
          title: string;
          subtitle?: string;
          first_sentence?: string[];
          isbn?: string[];
          first_publish_year?: number;
          language?: string[];
          cover_i?: number;
          author_name?: string[];
          author_key?: string[];
        }): OpenLibraryBookSuggestion => ({
          key: doc.key,
          title: doc.title,
          subtitle: doc.subtitle,
          description: doc.first_sentence?.[0],
          isbn: doc.isbn?.[0],
          publishedYear: doc.first_publish_year,
          language: doc.language?.[0],
          coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : undefined,
          authors: (doc.author_name || []).map((name: string, i: number) => ({
            name,
            key: doc.author_key?.[i],
          })),
        })
      );
    } catch (error) {
      console.error("Error searching Open Library:", error);
      return [];
    }
  },
});

// Search authors on Open Library
export const searchAuthors = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args): Promise<OpenLibraryAuthorSuggestion[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    if (args.query.trim().length < 2) {
      return [];
    }

    try {
      const url = `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(args.query)}&limit=5`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error("Open Library author search failed:", response.status);
        return [];
      }

      const data = await response.json();

      return (data.docs || []).map(
        (doc: {
          key: string;
          name: string;
          bio?: string;
          top_work?: string;
        }): OpenLibraryAuthorSuggestion => ({
          key: doc.key,
          name: doc.name,
          bio: doc.bio,
          photoUrl: doc.key ? `https://covers.openlibrary.org/a/olid/${doc.key}-M.jpg` : undefined,
          topWork: doc.top_work,
        })
      );
    } catch (error) {
      console.error("Error searching Open Library authors:", error);
      return [];
    }
  },
});

// Upload an image from a URL to R2 storage
export const uploadImageFromUrl = action({
  args: {
    imageUrl: v.string(),
    pathPrefix: v.string(), // e.g., "books" or "authors"
    fileName: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    try {
      // Fetch the image
      const response = await fetch(args.imageUrl);
      if (!response.ok) {
        console.log(`Failed to fetch image from ${args.imageUrl}: ${response.status}`);
        return null;
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Reject placeholder images (Open Library returns ~43 byte 1x1 GIF when no image)
      if (uint8Array.length < 1000) {
        console.log(
          `Image too small (${uint8Array.length} bytes), likely a placeholder: ${args.imageUrl}`
        );
        return null;
      }

      const r2Client = getR2Client();
      const bucketName = process.env.R2_BUCKET_NAME;

      if (!bucketName) {
        throw new Error("R2_BUCKET_NAME not configured");
      }

      const timestamp = Date.now();
      const sanitizedFileName = args.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const r2Key = `${getStoragePrefix()}/media/${args.pathPrefix}/${timestamp}-${sanitizedFileName}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
        Body: uint8Array,
        ContentType: contentType,
      });

      await r2Client.send(command);

      return r2Key;
    } catch (error) {
      console.error(`Error uploading image from ${args.imageUrl}:`, error);
      return null;
    }
  },
});
