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
    if (!channelId) {
      return NextResponse.json({ success: false, error: "Missing channelId" }, { status: 400 });
    }

    await connectDB();
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    const isMember = channel.members.includes(uid);

    return NextResponse.json({ success: true, isMember });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
