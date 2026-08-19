// Global test environment variables setup
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/test-chat-app";
process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-chat-app";
process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "firebase-adminsdk@demo-chat-app.iam.gserviceaccount.com";
process.env.FIREBASE_ADMIN_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQE=\n-----END PRIVATE KEY-----\n";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "mock-api-key-test";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "demo-chat-app.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-chat-app";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "demo-chat-app.appspot.com";
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123456789";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456789:web:abcdef";
process.env.PUSHER_APP_ID = "mock-pusher-app-id";
process.env.NEXT_PUBLIC_PUSHER_KEY = "mock-pusher-key";
process.env.PUSHER_SECRET = "mock-pusher-secret";
process.env.NEXT_PUBLIC_PUSHER_CLUSTER = "mt1";
process.env.GEMINI_API_KEY = "mock-gemini-api-key";

// Allow ample time for in-memory MongoDB binary startup and downloads
jest.setTimeout(120_000);

