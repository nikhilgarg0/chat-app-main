import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const { channelId, username, isTyping, firebaseUid: bodyUid } = body;

    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || bodyUid || searchParams.get("firebaseUid");

    if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await pusherServer.trigger(`chat-${channelId}`, "user-typing", { username, isTyping });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
