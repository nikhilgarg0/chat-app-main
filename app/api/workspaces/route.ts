import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Workspace } from "@/models/Workspace";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
  try {
    const verifiedUid = await verifyToken(req);
    const { searchParams } = new URL(req.url);
    const queryUid = searchParams.get("firebaseUid");
    const uid = verifiedUid || queryUid;

    if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const workspaces = await Workspace.find({
      $or: [
        { "members.firebaseUid": uid },
        { ownerId: uid }
      ]
    }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, workspaces });

  } catch (error: any) {
    console.error("Workspaces GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const verifiedUid = await verifyToken(req);
    const body = await req.json();
    const { name, customInviteCode, firebaseUid } = body;
    const uid = verifiedUid || firebaseUid;

    if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    if (!name) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }


    await connectDB();

    let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!baseSlug) baseSlug = "workspace";

    // Allow custom invite code or generate a random one
    let inviteCode: string;

    if (customInviteCode && typeof customInviteCode === "string") {
      const cleaned = customInviteCode.trim().toUpperCase();

      // Validate: 4-8 alphanumeric characters
      if (!/^[A-Z0-9]{4,8}$/.test(cleaned)) {
        return NextResponse.json(
          { success: false, error: "Invite code must be 4-8 alphanumeric characters" },
          { status: 400 }
        );
      }

      // Check uniqueness
      const existing = await Workspace.findOne({ inviteCode: cleaned });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "That invite code is already taken. Try another one." },
          { status: 409 }
        );
      }

      inviteCode = cleaned;
    } else {
      inviteCode = crypto.randomUUID().substring(0, 6).toUpperCase();
    }

    try {
      const workspace = await Workspace.create({
        name,
        slug: baseSlug,
        ownerId: uid,
        members: [{ firebaseUid: uid, role: "owner" }],
        inviteCode,
      });
      return NextResponse.json({ success: true, workspace });
    } catch (err: any) {
      // Duplicate slug — append a random suffix and retry once
      if (err.code === 11000 && err.keyPattern?.slug) {
        const fallbackSlug = `${baseSlug}-${crypto.randomUUID().substring(0, 4)}`;
        const workspace = await Workspace.create({
          name,
          slug: fallbackSlug,
          ownerId: uid,
          members: [{ firebaseUid: uid, role: "owner" }],
          inviteCode,
        });
        return NextResponse.json({ success: true, workspace });
      }
      if (err.code === 11000 && err.keyPattern?.inviteCode) {
        return NextResponse.json(
          { success: false, error: "Invite code collision. Please try again." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
