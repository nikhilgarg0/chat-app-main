import { connectTestDB, clearTestDB, disconnectTestDB } from "../setup/dbHandler";
import { POST, GET, DELETE } from "@/app/api/users/profile/route";
import { User } from "@/models/User";
import * as firebaseAdmin from "@/lib/firebaseAdmin";

jest.mock("@/lib/firebaseAdmin", () => ({
  verifyToken: jest.fn(),
  deleteFirebaseUser: jest.fn().mockResolvedValue(undefined),
}));

describe("Profile API Integration Tests", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  describe("POST /api/users/profile", () => {
    it("should create a new user profile with returnDocument: 'after'", async () => {
      (firebaseAdmin.verifyToken as jest.Mock).mockResolvedValue("user_123");

      const req = new Request("http://localhost:3000/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: "user_123",
          email: "test@example.com",
          displayName: "Test User",
          username: "testuser",
          bio: "Hello world",
          customStatus: "Working Remotely",
          timezone: "America/New_York",
          theme: "dark",
          coverColor: "#2563eb",
          socialLinks: {
            twitter: "test_twitter",
            github: "test_github"
          },
          notificationPrefs: {
            mentions: true,
            allMessages: true,
            sounds: false
          }
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.firebaseUid).toBe("user_123");
      expect(data.user.email).toBe("test@example.com");
      expect(data.user.displayName).toBe("Test User");
      expect(data.user.username).toBe("testuser");
      expect(data.user.bio).toBe("Hello world");
      expect(data.user.customStatus).toBe("Working Remotely");
      expect(data.user.theme).toBe("dark");
      expect(data.user.socialLinks.twitter).toBe("test_twitter");
      expect(data.user.socialLinks.github).toBe("test_github");
      expect(data.user.notificationPrefs.sounds).toBe(false);
    });

    it("should allow an existing user to update their profile without providing email", async () => {
      // Seed existing user
      await User.create({
        firebaseUid: "user_existing",
        email: "existing@example.com",
        displayName: "Old Name",
        username: "oldname",
      });

      (firebaseAdmin.verifyToken as jest.Mock).mockResolvedValue("user_existing");

      const req = new Request("http://localhost:3000/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: "user_existing",
          displayName: "Updated Name",
          bio: "New bio text",
          customStatus: "In a meeting",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.displayName).toBe("Updated Name");
      expect(data.user.email).toBe("existing@example.com");
      expect(data.user.bio).toBe("New bio text");
      expect(data.user.customStatus).toBe("In a meeting");
    });

    it("should return 409 if trying to take an existing user's username", async () => {
      await User.create({
        firebaseUid: "user_alice",
        email: "alice@example.com",
        displayName: "Alice",
        username: "superstar",
      });

      await User.create({
        firebaseUid: "user_bob",
        email: "bob@example.com",
        displayName: "Bob",
        username: "bobbie",
      });

      (firebaseAdmin.verifyToken as jest.Mock).mockResolvedValue("user_bob");

      const req = new Request("http://localhost:3000/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: "user_bob",
          displayName: "Bob Updated",
          username: "superstar",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(409);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Username is already taken");
    });

    it("should allow a user to update other fields while keeping their current username", async () => {
      await User.create({
        firebaseUid: "user_charlie",
        email: "charlie@example.com",
        displayName: "Charlie",
        username: "charlie123",
      });

      (firebaseAdmin.verifyToken as jest.Mock).mockResolvedValue("user_charlie");

      const req = new Request("http://localhost:3000/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: "user_charlie",
          displayName: "Charlie The Great",
          username: "charlie123",
          bio: "I am Charlie",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.displayName).toBe("Charlie The Great");
      expect(data.user.username).toBe("charlie123");
    });

    it("should return 400 if displayName is empty", async () => {
      await User.create({
        firebaseUid: "user_david",
        email: "david@example.com",
        displayName: "David",
      });

      (firebaseAdmin.verifyToken as jest.Mock).mockResolvedValue("user_david");

      const req = new Request("http://localhost:3000/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: "user_david",
          displayName: "   ",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Display name cannot be empty");
    });

    it("should return 400 if invalid username format is provided", async () => {
      (firebaseAdmin.verifyToken as jest.Mock).mockResolvedValue("user_new");

      const req = new Request("http://localhost:3000/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: "user_new",
          email: "new@example.com",
          displayName: "New User",
          username: "ab", // too short
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Username must be 3-20 characters long");
    });
  });

  describe("GET /api/users/profile", () => {
    it("should retrieve profile by auth token", async () => {
      await User.create({
        firebaseUid: "user_get_1",
        email: "get1@example.com",
        displayName: "Get User 1",
        bio: "Bio 1",
      });

      (firebaseAdmin.verifyToken as jest.Mock).mockResolvedValue("user_get_1");

      const req = new Request("http://localhost:3000/api/users/profile");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.displayName).toBe("Get User 1");
    });

    it("should return 404 if user does not exist", async () => {
      (firebaseAdmin.verifyToken as jest.Mock).mockResolvedValue("non_existent_uid");

      const req = new Request("http://localhost:3000/api/users/profile");
      const res = await GET(req);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("User not found");
    });

    it("should return 403 if token UID does not match query UID", async () => {
      (firebaseAdmin.verifyToken as jest.Mock).mockResolvedValue("user_token_uid");

      const req = new Request("http://localhost:3000/api/users/profile?firebaseUid=other_uid");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/users/profile", () => {
    it("should delete user profile", async () => {
      await User.create({
        firebaseUid: "user_del",
        email: "del@example.com",
        displayName: "Del User",
      });

      (firebaseAdmin.verifyToken as jest.Mock).mockResolvedValue("user_del");

      const req = new Request("http://localhost:3000/api/users/profile", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);

      const found = await User.findOne({ firebaseUid: "user_del" });
      expect(found).toBeNull();
    });
  });
});
