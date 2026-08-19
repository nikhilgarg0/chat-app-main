import { GET, POST } from "@/app/api/messages/route";
import {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
} from "@/__tests__/setup/dbHandler";
import {
  setupFirebaseEmulatorEnv,
  createMockToken,
} from "@/__tests__/setup/firebaseEmulator";
import Message from "@/models/Message";
import { Channel } from "@/models/Channel";
import { Workspace } from "@/models/Workspace";
import { User } from "@/models/User";
import { pusherServer } from "@/lib/pusher-server";
import { verifyToken } from "@/lib/firebaseAdmin";
import mongoose from "mongoose";

// Setup mock environment variables for emulator
setupFirebaseEmulatorEnv();

// Mock Firebase Admin token verification and Pusher triggers
jest.mock("@/lib/firebaseAdmin", () => ({
  verifyToken: jest.fn(),
  getAdminApp: jest.fn(),
}));

jest.mock("@/lib/pusher-server", () => ({
  pusherServer: {
    trigger: jest.fn().mockResolvedValue({}),
  },
}));

describe("Integration: /app/api/messages/route.ts", () => {
  let mockVerifyToken: jest.MockedFunction<typeof verifyToken>;

  beforeAll(async () => {
    await connectTestDB();
    mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
  });

  afterEach(async () => {
    await clearTestDB();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  describe("GET /api/messages", () => {
    test("successfully retrieves messages for authorized workspace member", async () => {
      const aliceUid = "uid_alice_123";
      mockVerifyToken.mockResolvedValue(aliceUid);

      // 1. Seed User profile with avatar
      await User.create({
        firebaseUid: aliceUid,
        email: "alice@example.com",
        displayName: "Alice Tester",
        avatarUrl: "https://example.com/alice.png",
        onboardingComplete: true,
      });

      // 2. Seed Workspace with Alice as member
      const workspace = await Workspace.create({
        name: "Acme Workspace",
        slug: "acme-workspace",
        ownerId: aliceUid,
        inviteCode: "INVITE-ACME",
        members: [{ firebaseUid: aliceUid, role: "owner" }],
      });

      // 3. Seed Channel in Workspace
      const channel = await Channel.create({
        workspaceId: String(workspace._id),
        name: "general",
        createdBy: aliceUid,
      });

      // 4. Seed Messages
      const msg1 = await Message.create({
        channelId: String(channel._id),
        author: "Alice Tester",
        firebaseUid: aliceUid,
        content: "First message in channel 🚀",
        time: "10:00 AM",
        timestamp: new Date("2026-08-19T10:00:00Z"),
      });

      const msg2 = await Message.create({
        channelId: String(channel._id),
        author: "Alice Tester",
        firebaseUid: aliceUid,
        content: "Second message in channel 💬",
        time: "10:05 AM",
        timestamp: new Date("2026-08-19T10:05:00Z"),
      });

      // 5. Execute GET request to Route Handler
      const req = new Request(
        `http://localhost:3000/api/messages?channelId=${channel._id}`,
        {
          method: "GET",
          headers: {
            Authorization: createMockToken(aliceUid),
          },
        }
      );

      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.messages).toHaveLength(2);
      expect(data.hasMore).toBe(false);

      // Verify chronological order and avatar population
      expect(data.messages[0].content).toBe("First message in channel 🚀");
      expect(data.messages[0].avatarUrl).toBe("https://example.com/alice.png");
      expect(data.messages[1].content).toBe("Second message in channel 💬");
    });

    test("filters messages with 'before' timestamp for pagination", async () => {
      const aliceUid = "uid_alice_page";
      mockVerifyToken.mockResolvedValue(aliceUid);

      const workspace = await Workspace.create({
        name: "Paginated Workspace",
        slug: "paginated-ws",
        ownerId: aliceUid,
        inviteCode: "INVITE-PAGE",
        members: [{ firebaseUid: aliceUid, role: "owner" }],
      });

      const channel = await Channel.create({
        workspaceId: String(workspace._id),
        name: "pagination-test",
        createdBy: aliceUid,
      });

      // Seed 3 messages at distinct times
      await Message.create({
        channelId: String(channel._id),
        author: "Alice",
        firebaseUid: aliceUid,
        content: "Old Message 1",
        createdAt: new Date("2026-01-01T10:00:00Z"),
      });
      await Message.create({
        channelId: String(channel._id),
        author: "Alice",
        firebaseUid: aliceUid,
        content: "Old Message 2",
        createdAt: new Date("2026-01-01T11:00:00Z"),
      });
      await Message.create({
        channelId: String(channel._id),
        author: "Alice",
        firebaseUid: aliceUid,
        content: "New Message 3",
        createdAt: new Date("2026-01-01T12:00:00Z"),
      });

      // Query before 12:00
      const req = new Request(
        `http://localhost:3000/api/messages?channelId=${channel._id}&before=2026-01-01T11:30:00Z`,
        {
          headers: { Authorization: createMockToken(aliceUid) },
        }
      );

      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.messages).toHaveLength(2);
      expect(data.messages.map((m: any) => m.content)).toEqual([
        "Old Message 1",
        "Old Message 2",
      ]);
    });

    test("fails with 401 Unauthorized when auth token is missing or invalid", async () => {
      mockVerifyToken.mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/messages?channelId=123", {
        method: "GET",
      });

      const res = await GET(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    test("fails with 400 Bad Request when channelId is missing", async () => {
      mockVerifyToken.mockResolvedValue("uid_user_123");

      const req = new Request("http://localhost:3000/api/messages", {
        headers: { Authorization: createMockToken("uid_user_123") },
      });

      const res = await GET(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Missing channelId");
    });

    test("fails with 403 Forbidden when user is not a member of the workspace", async () => {
      const ownerUid = "uid_workspace_owner";
      const strangerUid = "uid_stranger_intruder";

      mockVerifyToken.mockResolvedValue(strangerUid);

      // Create workspace where stranger is NOT a member
      const workspace = await Workspace.create({
        name: "Private Workspace",
        slug: "private-ws",
        ownerId: ownerUid,
        inviteCode: "INVITE-PRIV",
        members: [{ firebaseUid: ownerUid, role: "owner" }],
      });

      const channel = await Channel.create({
        workspaceId: String(workspace._id),
        name: "confidential",
        createdBy: ownerUid,
      });

      const req = new Request(
        `http://localhost:3000/api/messages?channelId=${channel._id}`,
        {
          headers: { Authorization: createMockToken(strangerUid) },
        }
      );

      const res = await GET(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Forbidden");
    });

    test("fails with 404 Not Found when channel does not exist", async () => {
      mockVerifyToken.mockResolvedValue("uid_alice");

      const nonExistentChannelId = new mongoose.Types.ObjectId().toString();
      const req = new Request(
        `http://localhost:3000/api/messages?channelId=${nonExistentChannelId}`,
        {
          headers: { Authorization: createMockToken("uid_alice") },
        }
      );

      const res = await GET(req);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Channel not found");
    });
  });

  describe("POST /api/messages", () => {
    test("successfully creates a new message and triggers Pusher real-time event", async () => {
      const aliceUid = "uid_alice_post";
      mockVerifyToken.mockResolvedValue(aliceUid);

      // Seed Alice's User profile
      await User.create({
        firebaseUid: aliceUid,
        email: "alice@chat.com",
        displayName: "Alice",
        avatarUrl: "https://example.com/avatar.jpg",
        onboardingComplete: true,
      });

      const channelId = "chan_general_999";
      const payload = {
        channelId,
        author: "Alice",
        content: "Testing real-time message posting! 🚀",
        msgId: "client-msg-uuid-1",
        replyTo: {
          author: "Bob",
          content: "Original question",
          msgId: "bob-msg-0",
        },
      };

      const req = new Request("http://localhost:3000/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: createMockToken(aliceUid),
        },
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message.content).toBe("Testing real-time message posting! 🚀");
      expect(data.message.author).toBe("Alice");
      expect(data.message.firebaseUid).toBe(aliceUid);
      expect(data.message.avatarUrl).toBe("https://example.com/avatar.jpg");
      expect(data.message.replyTo.msgId).toBe("bob-msg-0");

      // Verify message was stored in MongoDB Memory Server
      const storedMessage = await Message.findOne({ msgId: "client-msg-uuid-1" });
      expect(storedMessage).not.toBeNull();
      expect(storedMessage?.content).toBe("Testing real-time message posting! 🚀");

      // Verify Pusher broadcast event was triggered
      expect(pusherServer.trigger).toHaveBeenCalledTimes(1);
      expect(pusherServer.trigger).toHaveBeenCalledWith(
        `chat-${channelId}`,
        "new-message",
        expect.objectContaining({
          channelId,
          author: "Alice",
          content: "Testing real-time message posting! 🚀",
          avatarUrl: "https://example.com/avatar.jpg",
        })
      );
    });

    test("fails with 401 Unauthorized when posting without authentication", async () => {
      mockVerifyToken.mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: "c1",
          author: "Anonymous",
          content: "Spam",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    test("fails with 400 Bad Request when required payload fields are missing", async () => {
      mockVerifyToken.mockResolvedValue("uid_alice");

      // Missing 'content'
      const reqMissingContent = new Request("http://localhost:3000/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: createMockToken("uid_alice"),
        },
        body: JSON.stringify({
          channelId: "c1",
          author: "Alice",
        }),
      });

      const res1 = await POST(reqMissingContent);
      expect(res1.status).toBe(400);
      const data1 = await res1.json();
      expect(data1.error).toBe("All fields are required");

      // Empty body
      const reqEmpty = new Request("http://localhost:3000/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: createMockToken("uid_alice"),
        },
        body: JSON.stringify({}),
      });

      const res2 = await POST(reqEmpty);
      expect(res2.status).toBe(400);
      const data2 = await res2.json();
      expect(data2.error).toBe("All fields are required");
    });
  });
});
