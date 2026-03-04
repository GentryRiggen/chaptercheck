import { api } from "@chaptercheck/convex-backend/_generated/api";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  const { getToken, userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify the caller is an admin via Convex
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Failed to get auth token" }, { status: 401 });
  }
  convex.setAuth(token);

  try {
    const currentUser = await convex.query(api.users.queries.getCurrentUserWithPermissions);
    if (!currentUser?.permissions?.canManageUsers) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to verify permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { firstName, lastName, email } = body as {
    firstName: string;
    lastName?: string;
    email: string;
  };

  if (!firstName || !email) {
    return NextResponse.json({ error: "firstName and email are required" }, { status: 400 });
  }

  const clerk = await clerkClient();

  // Check for existing Clerk user by email
  const existingUsers = await clerk.users.getUserList({
    emailAddress: [email],
  });

  if (existingUsers.totalCount > 0) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Create the Clerk user (no password — they'll use email code sign-in)
  const newUser = await clerk.users.createUser({
    firstName,
    lastName: lastName || undefined,
    emailAddress: [email],
    skipPasswordRequirement: true,
  });

  return NextResponse.json({ clerkId: newUser.id }, { status: 201 });
}
