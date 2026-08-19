/**
 * Firebase Local Emulator Suite conventions & configuration.
 *
 * When running with the Firebase Local Emulator Suite:
 * 1. FIREBASE_AUTH_EMULATOR_HOST specifies the local emulator endpoint (e.g. "127.0.0.1:9099").
 * 2. Project IDs prefixed with "demo-" tell the Firebase Admin SDK to operate in offline/emulator mode
 *    without validating real private keys with Google's servers.
 */

export const EMULATOR_CONFIG = {
  projectId: "demo-chat-app",
  clientEmail: "firebase-adminsdk@demo-chat-app.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQE=\n-----END PRIVATE KEY-----\n",
  authEmulatorHost: "127.0.0.1:9099",
};

export function setupFirebaseEmulatorEnv() {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = EMULATOR_CONFIG.authEmulatorHost;
  process.env.FIREBASE_ADMIN_PROJECT_ID = EMULATOR_CONFIG.projectId;
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL = EMULATOR_CONFIG.clientEmail;
  process.env.FIREBASE_ADMIN_PRIVATE_KEY = EMULATOR_CONFIG.privateKey;
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = `${EMULATOR_CONFIG.projectId}.appspot.com`;
  process.env.PUSHER_APP_ID = "mock-pusher-app-id";
  process.env.NEXT_PUBLIC_PUSHER_KEY = "mock-pusher-key";
  process.env.PUSHER_SECRET = "mock-pusher-secret";
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER = "mt1";
}

/**
 * Creates a deterministic mock bearer token following Firebase Emulator conventions.
 */
export function createMockToken(uid: string): string {
  return `Bearer mock-emulator-token-${uid}`;
}
