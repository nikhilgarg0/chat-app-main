import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Workspace } from "@/models/Workspace";
import { Channel } from "@/models/Channel";
import Message from "@/models/Message";
import { User } from "@/models/User";
import { JoinRequest } from "@/models/JoinRequest";
import { verifyAdminToken } from "./login/route";
import { deleteFirebaseUsers } from "@/lib/firebaseAdmin";

// Helper: extract and verify admin token from Authorization header
function getAdmin(req: Request): { email: string } | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1];
  const payload = verifyAdminToken(token);
  if (!payload) return null;
  return { email: payload.email };
}

// GET — Dashboard stats
export async function GET(req: Request) {
  try {
    const admin = getAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [userCount, workspaceCount, channelCount, messageCount, joinRequestCount] = await Promise.all([
      User.countDocuments(),
      Workspace.countDocuments(),
      Channel.countDocuments(),
      Message.countDocuments(),
      JoinRequest.countDocuments({ status: "pending" }),
    ]);

    // Recent users
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10).select("displayName email avatarUrl createdAt onboardingComplete");

    // Recent workspaces
    const recentWorkspaces = await Workspace.find().sort({ createdAt: -1 }).limit(10).select("name slug ownerId members inviteCode createdAt");

    return NextResponse.json({
      success: true,
      stats: { userCount, workspaceCount, channelCount, messageCount, joinRequestCount },
      recentUsers,
      recentWorkspaces,
    });
  } catch (error: any) {
    console.error("Admin GET Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE — Nuke database
export async function DELETE(req: Request) {
  try {
    const admin = getAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { target } = await req.json();

    await connectDB();

    const results: Record<string, number> = {};

    if (target === "all" || target === "messages") {
      const r = await Message.deleteMany({});
      results.messages = r.deletedCount;
    }
    if (target === "all" || target === "joinRequests") {
      const r = await JoinRequest.deleteMany({});
      results.joinRequests = r.deletedCount;
    }
    if (target === "all" || target === "channels") {
      const r = await Channel.deleteMany({});
      results.channels = r.deletedCount;
    }
    if (target === "all" || target === "workspaces") {
      const r = await Workspace.deleteMany({});
      results.workspaces = r.deletedCount;
    }
    if (target === "all" || target === "users") {
      // Collect all firebaseUids before deleting MongoDB docs
      const uids = await User.distinct("firebaseUid");
      const r = await User.deleteMany({});
      results.users = r.deletedCount;
      // Delete from Firebase Auth
      await deleteFirebaseUsers(uids);
    }

    return NextResponse.json({ success: true, deleted: results });
  } catch (error: any) {
    console.error("Admin DELETE Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
