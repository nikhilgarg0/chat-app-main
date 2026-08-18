import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET(req: Request, { params }: { params: Promise<{ firebaseUid: string }> }) {
  try {
    const { firebaseUid } = await params;

    if (!firebaseUid) {
      return NextResponse.json({ success: false, error: "Missing firebaseUid" }, { status: 400 });
    }

    await connectDB();
    
    // Select only public fields. Look up strictly by firebaseUid (unique).
    const user = await User.findOne({ firebaseUid }).select(
      "displayName avatarUrl bio customStatus timezone socialLinks coverColor -_id"
    );

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Public Profile GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
