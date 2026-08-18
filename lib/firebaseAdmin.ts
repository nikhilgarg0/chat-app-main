import admin from "firebase-admin";

export function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. " +
      "Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in your environment."
    );
  }

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
  } catch {
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