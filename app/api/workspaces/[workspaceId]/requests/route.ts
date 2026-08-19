import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Workspace } from "@/models/Workspace";
import { JoinRequest } from "@/models/JoinRequest";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/firebaseAdmin";

// GET — List pending join requests for a workspace (owner only)
export async function GET(req: Request, context: { params: Promise<{ workspaceId: string }> }) {
  try {
    const url = new URL(req.url);
    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || url.searchParams.get("firebaseUid");
    if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    await connectDB();


    const workspace = await Workspace.findById(params.workspaceId);
    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Only owner can view requests
    const isOwner = workspace.members.some((m: any) => m.firebaseUid === uid && m.role === "owner");
    if (!isOwner) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const requests = await JoinRequest.find({
      workspaceId: params.workspaceId,
      status: "pending",
    }).sort({ createdAt: -1 });

    // Enrich with user profile info
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const user = await User.findOne({ firebaseUid: r.firebaseUid });
        return {
          _id: r._id,
          firebaseUid: r.firebaseUid,
          status: r.status,
          createdAt: r.createdAt,
          displayName: user?.displayName || "Unknown User",
          email: user?.email || "",
          avatarUrl: user?.avatarUrl || "",
        };
      })
    );

    return NextResponse.json({ success: true, requests: enriched });
  } catch (error: any) {
    console.error("JoinRequests GET Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

// POST — Approve or reject a join request (owner only)
export async function POST(req: Request, context: { params: Promise<{ workspaceId: string }> }) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const { requestId, action, firebaseUid: bodyUid } = body;
    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || bodyUid || url.searchParams.get("firebaseUid");
    if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const params = await context.params;


    if (!requestId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Missing requestId or invalid action" }, { status: 400 });
    }

    await connectDB();

    const workspace = await Workspace.findById(params.workspaceId);
    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Only owner can respond
    const isOwner = workspace.members.some((m: any) => m.firebaseUid === uid && m.role === "owner");
    if (!isOwner) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest || joinRequest.workspaceId.toString() !== params.workspaceId) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    if (joinRequest.status !== "pending") {
      return NextResponse.json({ success: false, error: "Request already handled" }, { status: 409 });
    }

    if (action === "approve") {
      // Add user to workspace members
      const alreadyMember = workspace.members.some((m: any) => m.firebaseUid === joinRequest.firebaseUid);
      if (!alreadyMember) {
        workspace.members.push({ firebaseUid: joinRequest.firebaseUid, role: "member" });
        await workspace.save();
      }
      joinRequest.status = "approved";
    } else {
      joinRequest.status = "rejected";
    }

    joinRequest.respondedAt = new Date();
    joinRequest.respondedBy = uid;
    await joinRequest.save();

    return NextResponse.json({ success: true, status: joinRequest.status });
  } catch (error: any) {
    console.error("JoinRequests POST Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
