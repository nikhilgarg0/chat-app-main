import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Workspace } from "@/models/Workspace";
import { Channel } from "@/models/Channel";
import Message from "@/models/Message";
import { User } from "@/models/User";
import { JoinRequest } from "@/models/JoinRequest";
import { verifyAdminToken } from "../login/route";
import { deleteFirebaseUser } from "@/lib/firebaseAdmin";

function getAdmin(req: Request): { email: string } | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1];
  const payload = verifyAdminToken(token);
  if (!payload) return null;
  return { email: payload.email };
}

// GET — List items of a specific collection with search + pagination
export async function GET(req: Request) {
  try {
    const admin = getAdmin(req);
    if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // users, workspaces, channels, messages, joinRequests
    const search = url.searchParams.get("q") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 30;
    const skip = (page - 1) * limit;

    await connectDB();

    let items: any[] = [];
    let total = 0;

    switch (type) {
      case "users": {
        const filter = search
          ? {
              $or: [
                { username: { $regex: search, $options: "i" } },
                { displayName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
              ],
            }
          : {};
        total = await User.countDocuments(filter);
        items = await User.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select("firebaseUid displayName email avatarUrl bio customStatus onboardingComplete createdAt");
        break;
      }

      case "workspaces": {
        const filter = search
          ? { $or: [
              { name: { $regex: search, $options: "i" } },
              { inviteCode: { $regex: search, $options: "i" } },
              { slug: { $regex: search, $options: "i" } },
            ]}
          : {};
        total = await Workspace.countDocuments(filter);
        items = await Workspace.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select("name slug ownerId members inviteCode channels createdAt");
        break;
      }

      case "channels": {
        const filter = search
          ? { name: { $regex: search, $options: "i" } }
          : {};
        total = await Channel.countDocuments(filter);
        items = await Channel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select("workspaceId name createdBy members createdAt");
        break;
      }

      case "messages": {
        const filter = search
          ? { $or: [
              { content: { $regex: search, $options: "i" } },
              { author: { $regex: search, $options: "i" } },
            ]}
          : {};
        total = await Message.countDocuments(filter);
        items = await Message.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select("channelId author content type createdAt");
        break;
      }

      case "joinRequests": {
        const filter = search
          ? { status: { $regex: search, $options: "i" } }
          : {};
        total = await JoinRequest.countDocuments(filter);
        const requests = await JoinRequest.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);
        // Enrich with user info
        items = await Promise.all(
          requests.map(async (r) => {
            const user = await User.findOne({ firebaseUid: r.firebaseUid }).select("displayName email avatarUrl");
            const workspace = await Workspace.findById(r.workspaceId).select("name");
            return {
              _id: r._id,
              firebaseUid: r.firebaseUid,
              status: r.status,
              createdAt: r.createdAt,
              respondedAt: r.respondedAt,
              displayName: user?.displayName || "Unknown",
              email: user?.email || "",
              avatarUrl: user?.avatarUrl || "",
              workspaceName: workspace?.name || "Deleted Workspace",
              workspaceId: r.workspaceId,
            };
          })
        );
        break;
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Admin List Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE — Delete a single item by type + id
export async function DELETE(req: Request) {
  try {
    const admin = getAdmin(req);
    if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { type, id } = await req.json();

    if (!type || !id) {
      return NextResponse.json({ success: false, error: "Missing type or id" }, { status: 400 });
    }

    await connectDB();

    switch (type) {
      case "users": {
        // Find the user first so we have the firebaseUid
        const user = await User.findByIdAndDelete(id);
        // Also delete from Firebase Auth if we have a UID
        if (user?.firebaseUid) {
          await deleteFirebaseUser(user.firebaseUid);
        }
        break;
      }
      case "workspaces": {
        const workspace = await Workspace.findById(id);
        if (workspace) {
          const channelIds = workspace.channels.map((c: any) => c.toString());
          await Promise.all([
            Workspace.findByIdAndDelete(id),
            Channel.deleteMany({ workspaceId: id }),
            Message.deleteMany({ channelId: { $in: channelIds } }),
            JoinRequest.deleteMany({ workspaceId: id }),
          ]);
        }
        break;
      }
      case "channels": {
        await Promise.all([
          Channel.findByIdAndDelete(id),
          Message.deleteMany({ channelId: id }),
        ]);
        // Also remove from workspace's channels array
        await Workspace.updateMany({}, { $pull: { channels: id } });
        break;
      }
      case "messages": {
        await Message.findByIdAndDelete(id);
        break;
      }
      case "joinRequests": {
        await JoinRequest.findByIdAndDelete(id);
        break;
      }
      default:
        return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Item Delete Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
