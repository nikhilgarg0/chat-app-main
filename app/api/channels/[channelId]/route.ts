import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Channel } from "@/models/Channel";
import { Workspace } from "@/models/Workspace";
import { verifyToken } from "@/lib/firebaseAdmin";
import { pusherServer } from "@/lib/pusher-server";
import Message from "@/models/Message";


export async function DELETE(req: Request, context: { params: Promise<{ channelId: string }> }) {
  try {
    const url = new URL(req.url);
    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || url.searchParams.get("firebaseUid");
    if (!uid) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }


    const params = await context.params;
    const { channelId } = params;

    if (!channelId) {
      return NextResponse.json({ success: false, error: "Missing channelId" }, { status: 400 });
    }

    const action = url.searchParams.get("action");


    await connectDB();

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    if (action === "leave") {
      channel.members = channel.members.filter((m: string) => m !== uid);
      await channel.save();
      return NextResponse.json({ success: true });
    }

    const workspace = await Workspace.findById(channel.workspaceId);
    
    const isChannelCreator = channel.createdBy === uid;
    const isWorkspaceOwner = workspace?.members.some((m: any) => m.firebaseUid === uid && m.role === "owner");
    
    if (!isChannelCreator && !isWorkspaceOwner) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (workspace) {
      workspace.channels = workspace.channels.filter((c: any) => c.toString() !== channelId);
      await workspace.save();
    }

    await Channel.findByIdAndDelete(channelId);
    
    try {
      await Message.deleteMany({ channelId });
    } catch (e) {
      // ignore message delete error
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request, context: { params: Promise<{ channelId: string }> }) {
  try {
    const url = new URL(req.url);
    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || url.searchParams.get("firebaseUid");
    if (!uid) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }


    const params = await context.params;
    const { channelId } = params;

    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    await connectDB();
    const channel = await Channel.findById(channelId).select("name workspaceId");
    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, channel });
  } catch (error: any) {
    console.error("[GET Channel API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }

}

export async function POST(req: Request, context: { params: Promise<{ channelId: string }> }) {
  try {
    const url = new URL(req.url);
    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || url.searchParams.get("firebaseUid");
    if (!uid) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }


    const params = await context.params;
    const { channelId } = params;
    
    if (!channelId) {
      return NextResponse.json({ success: false, error: "Missing channelId" }, { status: 400 });
    }

    const body = await req.json();
    if (body.action !== "join") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    await connectDB();

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    const workspace = await Workspace.findById(channel.workspaceId);
    if (!workspace || !workspace.members.some((m: any) => m.firebaseUid === uid)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (channel.members.includes(uid)) {
      return NextResponse.json({ success: true, alreadyMember: true });
    }

    channel.members.push(uid);
    await channel.save();

    // Notify workspace sidebar in real-time
    try {
      await pusherServer.trigger(
        `workspace-${channel.workspaceId}`,
        "channel-joined",
        { channel: channel.toObject(), firebaseUid: uid }
      );
    } catch (e) {
      console.error("Pusher channel-joined error:", e);
    }

    return NextResponse.json({ success: true, channel });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
