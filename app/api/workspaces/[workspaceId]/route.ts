import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Workspace } from "@/models/Workspace";
import { Channel } from "@/models/Channel";
import Message from "@/models/Message";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function GET(req: Request, context: { params: Promise<{ workspaceId: string }> }) {
  try {
    const uid = await verifyToken(req);
    const params = await context.params;
    if (!params.workspaceId) {
      return NextResponse.json(
        { success: false, error: "Missing workspaceId" },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Explicitly populate Channel here to ensure the model is loaded
    await Channel.init();

    // Use verified token UID, or fall back to query param for backward compat
    const url = new URL(req.url);
    const firebaseUid = uid || url.searchParams.get("firebaseUid");

    const workspace = await Workspace.findById(params.workspaceId).populate("channels");

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Verify membership if we have a uid
    if (firebaseUid) {
      const isMember = workspace.members.some((m: any) => m.firebaseUid === firebaseUid);
      if (!isMember) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      const allChannels = workspace.channels;
      const joinedChannels = allChannels.filter((c: any) => c.members && c.members.includes(firebaseUid));
      return NextResponse.json({ success: true, workspace, allChannels, joinedChannels });
    }

    return NextResponse.json({ success: true, workspace });
  } catch (error: any) {
    console.error("Workspace GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ workspaceId: string }> }) {
  try {
    const url = new URL(req.url);
    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || url.searchParams.get("firebaseUid");
    if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    if (!params.workspaceId) {
      return NextResponse.json({ success: false, error: "Missing workspaceId" }, { status: 400 });
    }

    await connectDB();
    const workspace = await Workspace.findById(params.workspaceId);
    
    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    // Only workspace owner can delete
    const isOwner = workspace.members.some((m: any) => m.firebaseUid === uid && m.role === "owner");
    if (!isOwner) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    
    // Clean up all associated data
    const channelIds = workspace.channels.map((c: any) => c.toString());
    
    await Promise.all([
      Workspace.findByIdAndDelete(params.workspaceId),
      Channel.deleteMany({ workspaceId: params.workspaceId }),
      Message.deleteMany({ channelId: { $in: channelIds } }),
    ]);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Workspace DELETE Error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
