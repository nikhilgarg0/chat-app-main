import { NextResponse } from "next/server";
import { getAdminApp, verifyToken } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const uid = await verifyToken(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const app = getAdminApp();
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json({ error: "Storage bucket misconfigured" }, { status: 500 });
    }
    const bucket = app.storage().bucket(bucketName);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const filename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const path = `avatars/${uid}/${timestamp}-${filename}`;
    
    // Generate a secure access token exactly like Firebase client SDK does
    const downloadToken = crypto.randomUUID();
    
    const fileNode = bucket.file(path);
    await fileNode.save(buffer, {
      metadata: { 
        contentType: file.type,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken
        }
      }
    });

    // Construct the Firebase-compatible public download URL
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Server upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file to storage" }, { status: 500 });
  }
}
