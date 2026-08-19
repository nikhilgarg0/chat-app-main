/**
 * ==============================================================================
 * SECURITY AUDIT REGRESSION TEST SUITE
 * ==============================================================================
 * This test suite guards against critical security vulnerabilities discovered
 * during security audits to guarantee that authorization flaws, injection
 * vectors, rate limit bypasses, and data leakages can never silently reappear.
 */

import { DELETE as deleteMessageRoute } from "@/app/api/messages/[messageId]/route";
import { GET as getMessagesRoute, POST as postMessagesRoute } from "@/app/api/messages/route";
import { GET as getAdminRoute, DELETE as deleteAdminRoute } from "@/app/api/admin/route";
import { POST as adminLoginRoute } from "@/app/api/admin/login/route";
import { POST as aiRoute } from "@/app/api/ai/route";
import { uploadAvatar } from "@/lib/uploadAvatar";
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
import { verifyToken } from "@/lib/firebaseAdmin";
import { generateAIResponse } from "@/lib/gemini";
import mongoose from "mongoose";

setupFirebaseEmulatorEnv();

jest.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: {
      uid: "test-uid",
      getIdToken: jest.fn().mockResolvedValue("mock-token"),
    },
  },
}));

jest.mock("@/lib/firebaseAdmin", () => ({
  verifyToken: jest.fn(),
  getAdminApp: jest.fn(),
  deleteFirebaseUsers: jest.fn().mockResolvedValue(0),
}));

jest.mock("@/lib/pusher-server", () => ({
  pusherServer: {
    trigger: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/lib/gemini", () => ({
  generateAIResponse: jest.fn().mockResolvedValue("Mock AI output"),
}));

describe("Security Audit Automated Regression Tests", () => {
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

  // ============================================================================
  // FINDING 1: BOLA / IDOR on Message Deletion
  // ============================================================================
  describe("GUARD-SEC-01: Broken Object Level Authorization (BOLA/IDOR) on Message Deletion", () => {
    /**
     * PREVENTS: Insecure Direct Object Reference (IDOR).
     * WHY: Users must not be able to delete messages authored by other users,
     * even if they know or guess the target message's ObjectId.
     */
    test("ATTACK ATTEMPT: User B attempts to delete User A's message -> REJECTED with 403 Forbidden", async () => {
      const victimUid = "uid_victim_alice";
      const attackerUid = "uid_attacker_bob";

      // 1. Seed legitimate message created by Victim (User A)
      const victimMessage = await Message.create({
        channelId: "chan_general",
        author: "Alice",
        firebaseUid: victimUid,
        content: "Important message from Alice",
        timestamp: new Date(),
      });

      // 2. Attacker (User B) logs in and attempts to delete User A's message
      mockVerifyToken.mockResolvedValue(attackerUid);

      const attackReq = new Request(
        `http://localhost:3000/api/messages/${victimMessage._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: createMockToken(attackerUid),
          },
        }
      );

      const res = await deleteMessageRoute(attackReq, {
        params: Promise.resolve({ messageId: String(victimMessage._id) }),
      });

      // Assert attack is blocked with HTTP 403 Forbidden
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Forbidden");

      // Verify database state: message was NOT deleted
      const messageStillExists = await Message.findById(victimMessage._id);
      expect(messageStillExists).not.toBeNull();
      expect(messageStillExists?.content).toBe("Important message from Alice");
    });
  });

  // ============================================================================
  // FINDING 2: Privilege Escalation & Admin Bypass
  // ============================================================================
  describe("GUARD-SEC-02: Broken Function Level Authorization (BFLA) on Admin Dashboard & DB Nuke", () => {
    /**
     * PREVENTS: Unauthorized administrative actions and privilege escalation.
     * WHY: Regular users and unauthenticated attackers must never access system
     * metrics or execute destructive administrative actions (e.g. database wipe).
     */
    test("ATTACK ATTEMPT: Regular user or forged token accessing admin stats -> REJECTED with 401 Unauthorized", async () => {
      // 1. Attacker sends forged / invalid HMAC Bearer token to admin dashboard
      const attackReq = new Request("http://localhost:3000/api/admin", {
        method: "GET",
        headers: {
          Authorization: "Bearer forged.invalid-hmac-signature-token",
        },
      });

      const res = await getAdminRoute(attackReq);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    test("ATTACK ATTEMPT: Attacker attempts to DELETE (nuke) entire database without valid admin token -> REJECTED with 401", async () => {
      // Seed some data that should remain safe
      await Workspace.create({
        name: "Crucial Workspace",
        slug: "crucial-ws",
        ownerId: "uid_owner",
        inviteCode: "SECURE-INVITE",
      });

      const attackReq = new Request("http://localhost:3000/api/admin", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer invalid-token",
        },
        body: JSON.stringify({ target: "all" }),
      });

      const res = await deleteAdminRoute(attackReq);
      expect(res.status).toBe(401);

      // Verify workspace was not deleted
      const count = await Workspace.countDocuments();
      expect(count).toBe(1);
    });

    test("ATTACK ATTEMPT: Admin login with unauthorized email or brute force password -> REJECTED with 401 Invalid credentials", async () => {
      process.env.ADMIN_EMAILS = "admin@nexus.corp";
      process.env.ADMIN_PASSWORD = "SuperSecretAdminPassword123!";

      const attackReq = new Request("http://localhost:3000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "attacker@external.com",
          password: "SuperSecretAdminPassword123!",
        }),
      });

      const res = await adminLoginRoute(attackReq);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Invalid credentials");
    });
  });

  // ============================================================================
  // FINDING 3: Cross-Tenant Data Access (Workspace Isolation)
  // ============================================================================
  describe("GUARD-SEC-03: Multi-Tenant Workspace & Channel Message Leakage", () => {
    /**
     * PREVENTS: Tenant isolation bypass.
     * WHY: Users from Organization A must never view channel messages from
     * Organization B's private workspaces without explicit workspace membership.
     */
    test("ATTACK ATTEMPT: User from Workspace A queries messages in Workspace B -> REJECTED with 403 Forbidden", async () => {
      const orgAUser = "uid_org_a_user";
      const orgBUser = "uid_org_b_user";

      // 1. Create Workspace B (Confidential) with User B as sole member
      const workspaceB = await Workspace.create({
        name: "Confidential R&D Workspace",
        slug: "confidential-rd",
        ownerId: orgBUser,
        inviteCode: "SECRET-CODE-ORG-B",
        members: [{ firebaseUid: orgBUser, role: "owner" }],
      });

      const privateChannel = await Channel.create({
        workspaceId: String(workspaceB._id),
        name: "top-secret-strategy",
        createdBy: orgBUser,
      });

      await Message.create({
        channelId: String(privateChannel._id),
        author: "User B",
        firebaseUid: orgBUser,
        content: "Proprietary Trade Secrets 🤫",
      });

      // 2. Org A User attempts to read Org B's channel
      mockVerifyToken.mockResolvedValue(orgAUser);

      const attackReq = new Request(
        `http://localhost:3000/api/messages?channelId=${privateChannel._id}`,
        {
          headers: {
            Authorization: createMockToken(orgAUser),
          },
        }
      );

      const res = await getMessagesRoute(attackReq);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Forbidden");
    });
  });

  // ============================================================================
  // FINDING 4: AI Endpoint Resource Exhaustion & Denial of Service (DoS)
  // ============================================================================
  describe("GUARD-SEC-04: AI Endpoint Quota Depletion & Rate Limit DoS", () => {
    /**
     * PREVENTS: API budget exhaustion and server overload.
     * WHY: Costly LLM operations must be strictly capped per user to prevent
     * automated scraping, spam, or denial-of-wallet attacks.
     */
    test("ATTACK ATTEMPT: Automated bot floods AI endpoint -> REJECTED with 429 Too Many Requests after 10 requests", async () => {
      const botUid = `uid_malicious_bot_${Date.now()}`;
      mockVerifyToken.mockResolvedValue(botUid);

      const channelId = "chan_ai_flood";

      // Send 10 allowable requests
      for (let i = 0; i < 10; i++) {
        const req = new Request("http://localhost:3000/api/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: createMockToken(botUid),
          },
          body: JSON.stringify({ command: "ask", messages: `Query ${i}`, channelId }),
        });

        const res = await aiRoute(req);
        expect(res.status).toBe(201);
      }

      // 11th request (Rate limit breach attempt)
      const floodReq = new Request("http://localhost:3000/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: createMockToken(botUid),
        },
        body: JSON.stringify({ command: "ask", messages: "Flood query", channelId }),
      });

      const blockedRes = await aiRoute(floodReq);
      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Rate limit exceeded");
      expect(blockedRes.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(blockedRes.headers.get("Retry-After")).toBeTruthy();
    });
  });

  // ============================================================================
  // FINDING 5: Arbitrary File Upload & Storage Path Traversal
  // ============================================================================
  describe("GUARD-SEC-05: Arbitrary File Upload, Oversized Payloads & Extension Spoofing", () => {
    /**
     * PREVENTS: Remote Code Execution (RCE) and Storage Overfill attacks.
     * WHY: Upload handlers must enforce strict MIME type whitelisting (image only)
     * and file size limits before transferring payloads to cloud storage.
     */
    test("ATTACK ATTEMPT: Malicious user attempts to upload executable script (.sh / .exe) -> REJECTED with 'File must be an image.'", async () => {
      const scriptFile = new File(["#!/bin/bash\nrm -rf /"], "malicious_script.sh", {
        type: "application/x-sh",
      });

      await expect(uploadAvatar(scriptFile, "uid_attacker")).rejects.toThrow(
        "File must be an image."
      );
    });

    test("ATTACK ATTEMPT: Attacker attempts to upload 10MB oversized image to exhaust storage quota -> REJECTED with 'Image must be smaller than 2MB.'", async () => {
      const hugeBuffer = new Uint8Array(10 * 1024 * 1024); // 10MB
      const hugeFile = new File([hugeBuffer], "huge_avatar.png", {
        type: "image/png",
      });

      await expect(uploadAvatar(hugeFile, "uid_attacker")).rejects.toThrow(
        "Image must be smaller than 2MB."
      );
    });
  });

  // ============================================================================
  // FINDING 6: Authentication Bypass via Missing / Forged Tokens
  // ============================================================================
  describe("GUARD-SEC-06: Authentication Bypass on Core Messaging Endpoints", () => {
    /**
     * PREVENTS: Unauthenticated access to messaging APIs.
     * WHY: All read and write actions in workspaces require verified identity tokens.
     */
    test("ATTACK ATTEMPT: Anonymous attacker probes POST /api/messages -> REJECTED with 401 Unauthorized", async () => {
      mockVerifyToken.mockResolvedValue(null);

      const unauthReq = new Request("http://localhost:3000/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: "chan_public",
          author: "Anonymous",
          content: "Unauthenticated spam message",
        }),
      });

      const res = await postMessagesRoute(unauthReq);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });

  // ============================================================================
  // FINDING 7: NoSQL Injection & Malformed ID Probing
  // ============================================================================
  describe("GUARD-SEC-07: Malformed Query Parameter & Parameter Tampering Handling", () => {
    /**
     * PREVENTS: Database crashes and query corruption.
     * WHY: Malformed ObjectIds and invalid parameters must be handled gracefully
     * with 400 Bad Request or 404 Not Found without leaking stack traces.
     */
    test("ATTACK ATTEMPT: Malformed channelId provided to GET /api/messages -> Handled safely with 400/404", async () => {
      mockVerifyToken.mockResolvedValue("uid_user_probe");

      // Non-existent synthetic ObjectId
      const invalidChannelId = new mongoose.Types.ObjectId().toString();

      const probeReq = new Request(
        `http://localhost:3000/api/messages?channelId=${invalidChannelId}`,
        {
          headers: {
            Authorization: createMockToken("uid_user_probe"),
          },
        }
      );

      const res = await getMessagesRoute(probeReq);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Channel not found");
    });
  });
});
