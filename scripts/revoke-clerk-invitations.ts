/**
 * Script to revoke pending Clerk invitations
 */

import { createClerkClient } from "@clerk/backend";
import { config } from "dotenv";
import * as path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  console.error("Error: CLERK_SECRET_KEY not found in .env.local");
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

const invitationIds = [
  "inv_39EgZIqv1d6t5lLCai4TQMkjW1r",
  "inv_39EgZKbUYITbZpV0mPG5m4XhlFx",
  "inv_39EgZP5qYCm3YvTkb0qP4ZJWUIo",
  "inv_39EgZN1boYEdrHTz48VSRubkIcs",
  "inv_39EgZOIWWNnn1lARRKL1uAVq9Ud",
  "inv_39EgZMe3Xw8BSdPepsGEbojnLbA",
  "inv_39EgZOr6bsNN1jzbLMBuJgowUxc",
];

async function main() {
  console.log("Revoking invitations...\n");

  for (const id of invitationIds) {
    try {
      await clerk.invitations.revokeInvitation(id);
      console.log(`✅ Revoked: ${id}`);
    } catch (error) {
      const err = error as Error;
      console.error(`❌ Failed to revoke ${id}:`, err.message);
    }
  }

  console.log("\n✨ Done!");
}

main().catch(console.error);
