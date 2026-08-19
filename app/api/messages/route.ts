import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";
import { Channel } from "@/models/Channel";
import { Workspace } from "@/models/Workspace";
import { User } from "@/models/User";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { verifyToken } from "@/lib/firebaseAdmin";
import { formatMessageTime } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const verifiedUid = await verifyToken(req);
    const { searchParams } = new URL(req.url);
    const queryUid = searchParams.get("firebaseUid");
    const uid = verifiedUid || queryUid;

    if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const channelId = searchParams.get("channelId");
    const before = searchParams.get("before");

    if (!channelId) {
      return NextResponse.json({ success: false, error: "Missing channelId" }, { status: 400 });
    }

    // S3 — Verify workspace membership before reading messages
    const channel = await Channel.findById(channelId).lean();
    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    const workspace = await Workspace.findById(channel.workspaceId).lean();
    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const isMember = (workspace as any).members?.some((m: any) => m.firebaseUid === uid);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const query: any = { channelId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Map avatarUrls to messages
    const uids = [...new Set(messages.map((m: any) => m.firebaseUid).filter(Boolean))];
    const users = await User.find({ firebaseUid: { $in: uids } }, "firebaseUid avatarUrl").lean();
    const avatarMap = new Map(users.map((u: any) => [u.firebaseUid, u.avatarUrl]));

    const messagesWithAvatars = messages.map((m: any) => ({
      ...m,
      avatarUrl: m.type === "ai" ? null : avatarMap.get(m.firebaseUid) || ""
    }));

    messagesWithAvatars.reverse(); // chronological order for the client

    return NextResponse.json({ success: true, messages: messagesWithAvatars, hasMore: messagesWithAvatars.length === 50 });
  } catch (error) {
    console.error("Messages GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const verifiedUid = await verifyToken(req);
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const { channelId, author, content, timestamp, time, msgId, replyTo, firebaseUid: bodyUid } = body;
    const queryUid = searchParams.get("firebaseUid");
    const uid = verifiedUid || bodyUid || queryUid;

    if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();

    if (!channelId || !author || !content) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    // Store ISO timestamp; keep `time` for backward compat display
    const now = timestamp ? new Date(timestamp) : new Date();
    const displayTime = time || formatMessageTime(now);

    const message = await Message.create({
      channelId, author, content,
      timestamp: now,
      time: displayTime,
      msgId,
      firebaseUid: uid,
      ...(replyTo ? { replyTo } : {}),
    });

    const user = await User.findOne({ firebaseUid: uid }, "avatarUrl").lean();
    const avatarUrl = (user as any)?.avatarUrl || "";

    try {
      await pusherServer.trigger(`chat-${channelId}`, "new-message", {
        _id: String(message._id),
        channelId,
        author,
        content,
        timestamp: now.toISOString(),
        time: displayTime,
        msgId,
        createdAt: message.createdAt?.toISOString(),
        avatarUrl,
        ...(replyTo ? { replyTo } : {}),
      });
    } catch (pusherError) {
      console.error("Pusher trigger error:", pusherError);
    }

    return NextResponse.json({ success: true, message: { ...message.toObject(), avatarUrl } }, { status: 201 });
  } catch (error) {
    console.error("Messages POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
