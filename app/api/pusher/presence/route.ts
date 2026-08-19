import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { verifyToken } from "@/lib/firebaseAdmin";
import { recordUserPresence, getActiveWorkspaceUsers } from "@/lib/presenceTracker";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Missing workspaceId" }, { status: 400 });
    }

    const activeUsers = getActiveWorkspaceUsers(workspaceId);
    return NextResponse.json({ success: true, onlineUsers: activeUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const { workspaceId, username, status, firebaseUid: bodyUid } = body;

    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || bodyUid || searchParams.get("firebaseUid");

    if (!uid) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!workspaceId || !username || !status) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    // Record in local presence tracker
    recordUserPresence(workspaceId, username, uid, status);

    // Broadcast via Pusher to all workspace subscribers
    await pusherServer.trigger(`workspace-${workspaceId}`, "presence-update", {
      username,
      status,
      firebaseUid: uid
    });

    return NextResponse.json({ success: true, onlineUsers: getActiveWorkspaceUsers(workspaceId) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

