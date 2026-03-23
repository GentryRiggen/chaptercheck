import { v } from "convex/values";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

export const submit = action({
  args: {
    name: v.string(),
    email: v.string(),
    category: v.union(
      v.literal("bug_report"),
      v.literal("feature_request"),
      v.literal("general_question"),
      v.literal("account_issue")
    ),
    message: v.string(),
    turnstileToken: v.string(),
    // Honeypot — should always be empty. Bots auto-fill hidden fields.
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Honeypot check — silently reject if filled
    if (args.website) {
      // Return success to not tip off the bot
      return;
    }

    // Verify Turnstile token with Cloudflare
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      throw new Error("Turnstile is not configured");
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: args.turnstileToken,
        }),
      }
    );

    const result = (await verifyResponse.json()) as TurnstileVerifyResponse;

    if (!result.success) {
      throw new Error("Verification failed. Please try again.");
    }

    // Insert the support request via internal mutation
    await ctx.runMutation(internal.supportRequests.mutations.insertRequest, {
      name: args.name,
      email: args.email,
      category: args.category,
      message: args.message,
    });
  },
});
