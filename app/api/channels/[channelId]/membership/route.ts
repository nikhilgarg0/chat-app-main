import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Channel } from "@/models/Channel";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function GET(req: Request, context: { params: Promise<{ channelId: string }> }) {
  try {
    const url = new URL(req.url);
    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || url.searchParams.get("firebaseUid");
    if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const { channelId } = params;
    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
      return NextResponse.json({ success: false, isMember: false });
    }

    await connectDB();
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return NextResponse.json({ success: false, isMember: false });
    }

    const isMember = channel.members?.includes(uid) || false;

    return NextResponse.json({ success: true, isMember });
  } catch (error: any) {
    console.error("[GET Membership Error]:", error);
    return NextResponse.json({ success: false, isMember: false });
  }
}

