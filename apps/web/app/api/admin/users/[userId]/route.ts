import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
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

  const { userId: targetUserId } = await params;

  if (!targetUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Look up the Convex user to get their clerkId
  try {
    const targetUser = await convex.query(api.users.queries.getAdminUserDetail, {
      userId: targetUserId as Id<"users">,
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete from Clerk — the webhook will cascade to Convex cleanup
    const clerk = await clerkClient();
    await clerk.users.deleteUser(targetUser.clerkId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
