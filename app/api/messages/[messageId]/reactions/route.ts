import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";
import { pusherServer } from "@/lib/pusher-server";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function POST(req: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const { emoji, username, firebaseUid: bodyUid } = body;

    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || bodyUid || url.searchParams.get("firebaseUid");
    if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { messageId } = await context.params;

    if (!messageId || !emoji) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    await connectDB();

    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ success: false, error: "Message not found" }, { status: 404 });
    }

    const currentReactions = message.reactions || new Map();
    let userArray = currentReactions.get(emoji) || [];

    if (userArray.includes(uid)) {
      userArray = userArray.filter((id: string) => id !== uid);
    } else {
      userArray.push(uid);
    }

    if (userArray.length === 0) {
      currentReactions.delete(emoji);
    } else {
      currentReactions.set(emoji, userArray);
    }

    message.reactions = currentReactions;
    await message.save();

    const reactionsObj = Object.fromEntries(message.reactions);

    await pusherServer.trigger(`chat-${message.channelId}`, "reaction-update", {
      messageId: message._id,
      reactions: reactionsObj,
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
