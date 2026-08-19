import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const verifiedUid = await verifyToken(req);
    const body = await req.json();
    const { 
      firebaseUid, email, username, displayName, avatarUrl,
      bio, customStatus, timezone, socialLinks, 
      notificationPrefs, theme, coverColor, onboardingComplete
    } = body;

    const targetUid = verifiedUid || firebaseUid;

    if (!targetUid) {
      return NextResponse.json(
        { success: false, error: "Missing user identifier" },
        { status: 401 }
      );
    }

    if (verifiedUid && firebaseUid && verifiedUid !== firebaseUid) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ firebaseUid: targetUid });

    const updateData: any = {
      firebaseUid: targetUid,
    };

    // Handle email
    if (typeof email === "string" && email.trim()) {
      updateData.email = email.trim().toLowerCase();
    } else if (!existingUser) {
      return NextResponse.json(
        { success: false, error: "Email is required for new accounts" },
        { status: 400 }
      );
    }

    // Handle display name
    if (typeof displayName === "string" && displayName.trim()) {
      updateData.displayName = displayName.trim();
    } else if (displayName !== undefined && typeof displayName === "string" && !displayName.trim()) {
      return NextResponse.json(
        { success: false, error: "Display name cannot be empty" },
        { status: 400 }
      );
    } else if (!existingUser) {
      return NextResponse.json(
        { success: false, error: "Display name is required" },
        { status: 400 }
      );
    }

    // Handle username
    if (username !== undefined && typeof username === "string") {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername) {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
          return NextResponse.json(
            { success: false, error: "Username must be 3-20 characters long (alphanumeric and underscore only)." },
            { status: 400 }
          );
        }

        // Check if username belongs to another user
        const existingUsernameUser = await User.findOne({ username: cleanUsername }).select("firebaseUid").lean();
        if (existingUsernameUser && existingUsernameUser.firebaseUid !== targetUid) {
          return NextResponse.json(
            { success: false, error: "Username is already taken." },
            { status: 409 }
          );
        }
        updateData.username = cleanUsername;
      }
    }

    if (avatarUrl !== undefined && typeof avatarUrl === "string") updateData.avatarUrl = avatarUrl;
    if (typeof bio === "string") updateData.bio = bio.trim().substring(0, 160);
    if (typeof customStatus === "string") updateData.customStatus = customStatus.trim().substring(0, 80);
    if (typeof timezone === "string") updateData.timezone = timezone.trim();
    
    if (socialLinks && typeof socialLinks === "object") {
      const cleanedSocial: Record<string, string> = {};
      if (typeof socialLinks.twitter === "string") cleanedSocial.twitter = socialLinks.twitter.trim();
      if (typeof socialLinks.github === "string") cleanedSocial.github = socialLinks.github.trim();
      if (typeof socialLinks.linkedin === "string") cleanedSocial.linkedin = socialLinks.linkedin.trim();
      if (typeof socialLinks.website === "string") cleanedSocial.website = socialLinks.website.trim();
      updateData.socialLinks = cleanedSocial;
    }

    if (notificationPrefs && typeof notificationPrefs === "object") {
      updateData.notificationPrefs = {
        mentions: typeof notificationPrefs.mentions === "boolean" ? notificationPrefs.mentions : true,
        allMessages: typeof notificationPrefs.allMessages === "boolean" ? notificationPrefs.allMessages : false,
        sounds: typeof notificationPrefs.sounds === "boolean" ? notificationPrefs.sounds : true,
      };
    }

    if (typeof theme === "string" && ["light", "dark", "system"].includes(theme)) {
      updateData.theme = theme;
    }

    if (typeof coverColor === "string") {
      updateData.coverColor = coverColor.trim();
    }

    if (typeof onboardingComplete === "boolean") {
      updateData.onboardingComplete = onboardingComplete;
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: targetUid },
      { $set: updateData },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Profile POST Error:", error);
    if (error.code === 11000) {
      const errStr = JSON.stringify(error) + " " + (error.message || "");
      if (error.keyPattern?.username || error.keyValue?.username || errStr.includes("username")) {
        return NextResponse.json(
          { success: false, error: "Username is already taken." },
          { status: 409 }
        );
      }
      if (error.keyPattern?.email || error.keyValue?.email || errStr.includes("email")) {
        return NextResponse.json(
          { success: false, error: "Email is already registered with another account." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: "A unique constraint conflict occurred." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Allow both auth token and firebaseUid query param for backward compat
    // but prefer token-based auth when available
    const uid = await verifyToken(req);
    const { searchParams } = new URL(req.url);
    const queryUid = searchParams.get("firebaseUid");

    // Use verified token UID, or fall back to query param
    const targetUid = uid || queryUid;

    if (!targetUid) {
      return NextResponse.json(
        { success: false, error: "Missing firebaseUid" },
        { status: 400 }
      );
    }

    // If auth token exists but doesn't match the queried uid, forbid
    if (uid && queryUid && uid !== queryUid) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    await connectDB();
    const user = await User.findOne({ firebaseUid: targetUid });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Profile GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || url.searchParams.get("firebaseUid");
    if (!uid) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findOneAndDelete({ firebaseUid: uid });
    
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Profile DELETE Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
