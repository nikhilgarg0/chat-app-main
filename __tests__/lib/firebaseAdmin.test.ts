import {
  getAdminApp,
  verifyToken,
  deleteFirebaseUser,
  deleteFirebaseUsers,
} from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

const mockVerifyIdToken = jest.fn();
const mockDeleteUser = jest.fn();
const mockDeleteUsers = jest.fn();

const mockAuth = {
  verifyIdToken: mockVerifyIdToken,
  deleteUser: mockDeleteUser,
  deleteUsers: mockDeleteUsers,
};

const mockAppInstance = {
  auth: jest.fn().mockReturnValue(mockAuth),
};

jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn().mockReturnValue({}),
  },
}));

describe("lib/firebaseAdmin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    (admin.apps as any) = [];
    (admin.initializeApp as jest.Mock).mockReturnValue(mockAppInstance);
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe("getAdminApp", () => {
    test("returns cached app if already initialized in admin.apps", () => {
      const existingApp = { name: "existing-app" } as any;
      (admin.apps as any) = [existingApp];

      const app = getAdminApp();
      expect(app).toBe(existingApp);
      expect(admin.initializeApp).not.toHaveBeenCalled();
    });

    test("initializes new app when credentials are provided in env", () => {
      process.env.FIREBASE_ADMIN_PROJECT_ID = "test-project";
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL = "test@example.iam.gserviceaccount.com";
      process.env.FIREBASE_ADMIN_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQE=\\n-----END PRIVATE KEY-----\\n";
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "test-bucket.appspot.com";

      const app = getAdminApp();

      expect(admin.initializeApp).toHaveBeenCalledWith({
        credential: expect.anything(),
        storageBucket: "test-bucket.appspot.com",
      });
      expect(admin.credential.cert).toHaveBeenCalledWith({
        projectId: "test-project",
        clientEmail: "test@example.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQE=\n-----END PRIVATE KEY-----\n",
      });
      expect(app).toBe(mockAppInstance);
    });

    test("throws descriptive error when required environment variables are missing", () => {
      delete process.env.FIREBASE_ADMIN_PROJECT_ID;
      delete process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      delete process.env.FIREBASE_ADMIN_PRIVATE_KEY;

      expect(() => getAdminApp()).toThrow("Missing Firebase Admin credentials.");
    });
  });

  describe("verifyToken", () => {
    test("returns null if Authorization header is missing", async () => {
      const req = new Request("http://localhost:3000/api/test");
      const uid = await verifyToken(req);
      expect(uid).toBeNull();
    });

    test("returns null if Authorization header does not start with Bearer", async () => {
      const req = new Request("http://localhost:3000/api/test", {
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      });
      const uid = await verifyToken(req);
      expect(uid).toBeNull();
    });

    test("returns decoded UID for valid Bearer token", async () => {
      (admin.apps as any) = [mockAppInstance];
      mockVerifyIdToken.mockResolvedValue({ uid: "user_valid_123" });

      const req = new Request("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer valid_id_token_xyz" },
      });

      const uid = await verifyToken(req);
      expect(uid).toBe("user_valid_123");
      expect(mockVerifyIdToken).toHaveBeenCalledWith("valid_id_token_xyz");
    });

    test("catches token verification error, logs warning, and returns null", async () => {
      (admin.apps as any) = [mockAppInstance];
      mockVerifyIdToken.mockRejectedValue(new Error("Firebase ID token has expired"));

      const req = new Request("http://localhost:3000/api/test", {
        headers: { Authorization: "Bearer expired_token" },
      });

      const uid = await verifyToken(req);
      expect(uid).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        "[FirebaseAdmin Warning] verifyToken error:",
        "Firebase ID token has expired"
      );
    });
  });

  describe("deleteFirebaseUser", () => {
    test("deletes user successfully by uid", async () => {
      (admin.apps as any) = [mockAppInstance];
      mockDeleteUser.mockResolvedValue(undefined);

      await expect(deleteFirebaseUser("target_uid_123")).resolves.toBeUndefined();
      expect(mockDeleteUser).toHaveBeenCalledWith("target_uid_123");
    });

    test("silently ignores 'auth/user-not-found' errors", async () => {
      (admin.apps as any) = [mockAppInstance];
      const notFoundErr = new Error("User not found") as any;
      notFoundErr.code = "auth/user-not-found";
      mockDeleteUser.mockRejectedValue(notFoundErr);

      await expect(deleteFirebaseUser("already_deleted_uid")).resolves.toBeUndefined();
    });

    test("rethrows unexpected deletion errors", async () => {
      (admin.apps as any) = [mockAppInstance];
      const internalErr = new Error("Internal Firebase error") as any;
      internalErr.code = "auth/internal-error";
      mockDeleteUser.mockRejectedValue(internalErr);

      await expect(deleteFirebaseUser("target_uid")).rejects.toThrow("Internal Firebase error");
    });
  });

  describe("deleteFirebaseUsers (Batch Deletion)", () => {
    test("returns 0 immediately for empty list of UIDs", async () => {
      const count = await deleteFirebaseUsers([]);
      expect(count).toBe(0);
      expect(mockDeleteUsers).not.toHaveBeenCalled();
    });

    test("deletes single batch of users when count <= 1000", async () => {
      (admin.apps as any) = [mockAppInstance];
      mockDeleteUsers.mockResolvedValue({ successCount: 3, failureCount: 0 });

      const uids = ["uid_1", "uid_2", "uid_3"];
      const deletedCount = await deleteFirebaseUsers(uids);

      expect(deletedCount).toBe(3);
      expect(mockDeleteUsers).toHaveBeenCalledTimes(1);
      expect(mockDeleteUsers).toHaveBeenCalledWith(["uid_1", "uid_2", "uid_3"]);
    });

    test("chunks deletions into batches of 1000 for large UID lists", async () => {
      (admin.apps as any) = [mockAppInstance];
      mockDeleteUsers
        .mockResolvedValueOnce({ successCount: 1000, failureCount: 0 })
        .mockResolvedValueOnce({ successCount: 1000, failureCount: 0 })
        .mockResolvedValueOnce({ successCount: 250, failureCount: 0 });

      // Generate 2250 test UIDs
      const largeUidList = Array.from({ length: 2250 }, (_, i) => `uid_${i}`);

      const totalDeleted = await deleteFirebaseUsers(largeUidList);

      expect(totalDeleted).toBe(2250);
      expect(mockDeleteUsers).toHaveBeenCalledTimes(3);
      expect(mockDeleteUsers).toHaveBeenNthCalledWith(1, largeUidList.slice(0, 1000));
      expect(mockDeleteUsers).toHaveBeenNthCalledWith(2, largeUidList.slice(1000, 2000));
      expect(mockDeleteUsers).toHaveBeenNthCalledWith(3, largeUidList.slice(2000, 2250));
    });
  });
});
