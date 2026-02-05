/**
 * Script to create Clerk users from a CSV file
 *
 * Usage: npx tsx scripts/create-clerk-users.ts <path-to-csv>
 *
 * CSV format: Firstname,Lastname,Email
 *
 * Creates users directly (no password needed - uses email code auth).
 * Make sure CLERK_SECRET_KEY is set in .env.local
 */

import { createClerkClient } from "@clerk/backend";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CONVEX_DEPLOYMENT = process.env.CONVEX_DEPLOYMENT;

if (!CLERK_SECRET_KEY) {
  console.error("Error: CLERK_SECRET_KEY not found in .env.local");
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

function getEnvironmentInfo(): { env: string; clerkEnv: string; convexDeployment: string } {
  const isDevClerk = CLERK_SECRET_KEY?.startsWith("sk_test_");
  const clerkEnv = isDevClerk ? "DEVELOPMENT" : "PRODUCTION";
  const convexDeployment = CONVEX_DEPLOYMENT || "unknown";
  const env = isDevClerk ? "DEV" : "PROD";
  return { env, clerkEnv, convexDeployment };
}

interface UserRow {
  firstName: string;
  lastName: string;
  email: string;
}

function parseCSV(filePath: string): UserRow[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const [firstName, lastName, email] = line.split(",").map((s) => s.trim());
    return { firstName, lastName, email };
  });
}

async function createUser(user: UserRow): Promise<void> {
  try {
    // First check if user already exists
    const existingUsers = await clerk.users.getUserList({
      emailAddress: [user.email],
    });

    if (existingUsers.data.length > 0) {
      console.log(`⏭️  User already exists: ${user.email}`);
      return;
    }

    // Create user directly (no password needed for email code auth)
    const createdUser = await clerk.users.createUser({
      emailAddress: [user.email],
      firstName: user.firstName,
      lastName: user.lastName,
    });

    console.log(`✅ Created: ${user.firstName} ${user.lastName} <${user.email}>`);
    console.log(`   User ID: ${createdUser.id}`);
  } catch (error) {
    const err = error as Error & { errors?: Array<{ message: string; code: string }> };
    console.error(`❌ Failed to create ${user.email}:`, err.errors?.[0]?.message || err.message);
  }
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error("Usage: npx tsx scripts/create-clerk-users.ts <path-to-csv>");
    console.error("Example: npx tsx scripts/create-clerk-users.ts ~/Downloads/users.csv");
    process.exit(1);
  }

  const resolvedPath = path.resolve(csvPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Show environment info
  const { env, clerkEnv, convexDeployment } = getEnvironmentInfo();
  console.log("\n" + "═".repeat(50));
  console.log(`  ENVIRONMENT: ${clerkEnv}`);
  console.log("═".repeat(50));
  console.log(`  Clerk:  ${env} (${CLERK_SECRET_KEY?.slice(0, 12)}...)`);
  console.log(`  Convex: ${convexDeployment}`);
  console.log("═".repeat(50));

  const envConfirm = await askQuestion(`\nProceed in ${clerkEnv} environment? (yes/no): `);
  if (envConfirm !== "yes" && envConfirm !== "y") {
    console.log("\nAborted.\n");
    process.exit(0);
  }

  console.log(`\n📋 Reading users from: ${resolvedPath}\n`);

  const users = parseCSV(resolvedPath);

  console.log(`Found ${users.length} users.\n`);
  console.log("─".repeat(50));

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`\nUser ${i + 1} of ${users.length}:`);
    console.log(`  First Name: ${user.firstName}`);
    console.log(`  Last Name:  ${user.lastName}`);
    console.log(`  Email:      ${user.email}`);

    const answer = await askQuestion("\nCreate this user? (y/n/all/quit): ");

    if (answer === "quit" || answer === "q") {
      console.log("\nAborted by user.");
      break;
    } else if (answer === "all" || answer === "a") {
      // Create this user and all remaining without prompting
      console.log("\nCreating remaining users...\n");
      for (let j = i; j < users.length; j++) {
        await createUser(users[j]);
        created++;
      }
      break;
    } else if (answer === "y" || answer === "yes") {
      await createUser(user);
      created++;
    } else {
      console.log("✗ Skipped");
      skipped++;
    }
  }

  console.log("\n" + "─".repeat(50));
  console.log(`\n✨ Done! Created: ${created}, Skipped: ${skipped}\n`);
}

main().catch(console.error);
