import admin from "firebase-admin";

/**
 * Normalizes Firebase Admin private keys across different environments (Vercel, .env, Docker, etc.)
 * Handles:
 * - Surrounding quotes added during copy/paste or Vercel env insertion
 * - Escaped newlines (\n and \\n)
 * - Single-line whitespace-separated keys
 * - Pasted full JSON service account structures
 * - Base64 encoded private keys
 */
export function formatPrivateKey(rawKey: string): string {
  let key = rawKey.trim();

  // Strip surrounding quotes if present (e.g. from Vercel UI or .env)
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // If the user pasted the entire service account JSON into the private key field
  if (key.startsWith("{") && key.endsWith("}")) {
    try {
      const parsed = JSON.parse(key);
      if (parsed.private_key) {
        key = parsed.private_key;
      }
    } catch {
      // Continue if not valid JSON
    }
  }

  // If base64 encoded PEM string
  if (!key.includes("-----BEGIN") && key.length > 100) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf-8");
      if (decoded.includes("-----BEGIN")) {
        key = decoded;
      }
    } catch {
      // Continue if not base64
    }
  }

  // Replace literal/escaped newlines and carriage returns
  key = key.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Match header, body, and footer and ensure standard PEM line breaks
  const match = key.match(/(-----BEGIN[^-]+-----)([\s\S]*?)(-----END[^-]+-----)/);
  if (match) {
    const header = match[1].trim();
    const base64Body = match[2].replace(/\s+/g, "");
    const footer = match[3].trim();
    return `${header}\n${base64Body}\n${footer}\n`;
  }

  return key;
}

export function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Allow full service account JSON as an alternative environment variable
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: formatPrivateKey(parsed.private_key),
          }),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      }
    } catch (e) {
      console.warn("[FirebaseAdmin Warning] Failed to parse service account JSON from env:", e);
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. " +
      "Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in your environment."
    );
  }

  const privateKey = formatPrivateKey(rawPrivateKey);

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export async function verifyToken(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const app = getAdminApp();
    const decoded = await app.auth().verifyIdToken(auth.split("Bearer ")[1]);
    return decoded.uid;
  } catch (err: any) {
    console.warn("[FirebaseAdmin Warning] verifyToken error:", err?.message || err);
    return null;
  }
}

/**
 * Delete a single user from Firebase Authentication.
 * Silently ignores "user-not-found" errors (already deleted or never existed).
 */
export async function deleteFirebaseUser(uid: string): Promise<void> {
  try {
    const app = getAdminApp();
    await app.auth().deleteUser(uid);
  } catch (err: any) {
    if (err?.code !== "auth/user-not-found") throw err;
  }
}

/**
 * Delete multiple users from Firebase Authentication in batches of 1000.
 * Returns the count of successfully deleted users.
 */
export async function deleteFirebaseUsers(uids: string[]): Promise<number> {
  if (uids.length === 0) return 0;
  const app = getAdminApp();
  let deleted = 0;
  // Firebase Admin supports at most 1000 UIDs per batch
  for (let i = 0; i < uids.length; i += 1000) {
    const batch = uids.slice(i, i + 1000);
    const result = await app.auth().deleteUsers(batch);
    deleted += result.successCount;
  }
  return deleted;
}