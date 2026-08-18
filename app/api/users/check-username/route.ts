import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username")?.toLowerCase().trim();

    if (!username) {
      return NextResponse.json({ available: false, error: "Username is required" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ available: false, error: "Invalid username format" });
    }

    await connectDB();
    const existing = await User.findOne({ username }).select("firebaseUid").lean();

    // We check if it is taken, but if it is taken by the same user, it's fine!

    // Let's see if we have an auth context to allow them to keep their own username
    const authHeader = req.headers.get("Authorization");
    let currentUid = null;
    if (authHeader) {
      currentUid = await verifyToken(req);
    }
    // If it exists and the UID is different, it's unavailable.
    if (existing && existing.firebaseUid !== currentUid) {
      return NextResponse.json({ available: false, error: "Username is already taken" });
    }

    return NextResponse.json({ available: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
