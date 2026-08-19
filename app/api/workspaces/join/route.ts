import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Workspace } from "@/models/Workspace";
import { JoinRequest } from "@/models/JoinRequest";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const { inviteCode, firebaseUid: bodyUid } = body;

    const verifiedUid = await verifyToken(req);
    const queryUid = url.searchParams.get("firebaseUid");
    const uid = verifiedUid || bodyUid || queryUid;

    if (!uid) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!inviteCode) {
      return NextResponse.json(
        { success: false, error: "Missing invite code" },
        { status: 400 }
      );
    }

    await connectDB();

    const workspace = await Workspace.findOne({ inviteCode: inviteCode.trim().toUpperCase() });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Invalid invite code" },
        { status: 404 }
      );
    }

    // Already a member → just navigate
    const isMember = workspace.members.some((m: any) => m.firebaseUid === uid);
    if (isMember) {
      return NextResponse.json({ success: true, workspace, alreadyMember: true });
    }

    // Check if there's already a pending request
    const existingRequest = await JoinRequest.findOne({
      workspaceId: workspace._id,
      firebaseUid: uid,
      status: "pending",
    });

    if (existingRequest) {
      return NextResponse.json({
        success: false,
        error: "You already have a pending request for this workspace.",
        requestPending: true,
      }, { status: 409 });
    }

    // Create a new join request
    const joinRequest = await JoinRequest.create({
      workspaceId: workspace._id,
      firebaseUid: uid,
    });

    return NextResponse.json({
      success: true,
      requestSent: true,
      workspaceName: workspace.name,
      joinRequest,
    });
  } catch (error: any) {
    console.error("Workspace Join Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
