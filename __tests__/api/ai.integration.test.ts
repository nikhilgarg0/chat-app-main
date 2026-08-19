import { POST } from "@/app/api/ai/route";
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
import { generateAIResponse } from "@/lib/gemini";
import { pusherServer } from "@/lib/pusher-server";
import { verifyToken } from "@/lib/firebaseAdmin";

setupFirebaseEmulatorEnv();

jest.mock("@/lib/firebaseAdmin", () => ({
  verifyToken: jest.fn(),
  getAdminApp: jest.fn(),
}));

jest.mock("@/lib/pusher-server", () => ({
  pusherServer: {
    trigger: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/lib/gemini", () => ({
  generateAIResponse: jest.fn(),
}));

describe("Integration: /app/api/ai/route.ts (Gemini + Rate Limiting)", () => {
  let mockVerifyToken: jest.MockedFunction<typeof verifyToken>;
  let mockGenerateAIResponse: jest.MockedFunction<typeof generateAIResponse>;

  beforeAll(async () => {
    await connectTestDB();
    mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
    mockGenerateAIResponse = generateAIResponse as jest.MockedFunction<
      typeof generateAIResponse
    >;
  });

  afterEach(async () => {
    await clearTestDB();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  test("successfully processes AI command, calls stubbed Gemini model, and broadcasts response", async () => {
    const userUid = "uid_ai_user_1";
    const channelId = "chan_ai_demo";
    mockVerifyToken.mockResolvedValue(userUid);

    // 1. Seed existing channel conversation history in MongoDB Memory Server
    await Message.create({
      channelId,
      author: "Bob",
      content: "Let's launch the new feature tomorrow!",
      createdAt: new Date("2026-08-19T09:00:00Z"),
    });
    await Message.create({
      channelId,
      author: "Alice",
      content: "Agreed. I'll finish the final integration tests today.",
      createdAt: new Date("2026-08-19T09:05:00Z"),
    });

    // 2. Mock Gemini AI realistic response
    const mockAiSummary = "• Launch scheduled for tomorrow.\n• Alice completing integration tests today.";
    mockGenerateAIResponse.mockResolvedValue(mockAiSummary);

    // 3. Send AI summarize request
    const req = new Request("http://localhost:3000/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: createMockToken(userUid),
      },
      body: JSON.stringify({
        command: "summarize",
        channelId,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message.author).toBe("Nexus AI");
    expect(data.message.content).toBe(mockAiSummary);
    expect(data.message.type).toBe("ai");

    // Verify stubbed Gemini was called with the aggregated channel history context
    expect(mockGenerateAIResponse).toHaveBeenCalledTimes(1);
    expect(mockGenerateAIResponse).toHaveBeenCalledWith(
      expect.stringContaining("Bob: Let's launch the new feature tomorrow!"),
      ""
    );

    // Verify message persisted to MongoDB Memory Server
    const dbAiMessage = await Message.findOne({ channelId, type: "ai" });
    expect(dbAiMessage).not.toBeNull();
    expect(dbAiMessage?.content).toBe(mockAiSummary);

    // Verify Pusher broadcast event
    expect(pusherServer.trigger).toHaveBeenCalledWith(
      `chat-${channelId}`,
      "new-message",
      expect.objectContaining({
        author: "Nexus AI",
        content: mockAiSummary,
        type: "ai",
      })
    );
  });

  test("enforces rate limit of 10 requests per user and returns 429 Too Many Requests on breach", async () => {
    const rateLimitUid = `uid_ratelimit_${Date.now()}`;
    mockVerifyToken.mockResolvedValue(rateLimitUid);
    mockGenerateAIResponse.mockResolvedValue("Quick AI response");

    const channelId = "chan_rate_limit";

    // Send 10 allowed requests
    for (let i = 0; i < 10; i++) {
      const req = new Request("http://localhost:3000/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: createMockToken(rateLimitUid),
        },
        body: JSON.stringify({ command: "ask", messages: `Query ${i}`, channelId }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
    }

    // 11th request must exceed the rate limit
    const blockedReq = new Request("http://localhost:3000/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: createMockToken(rateLimitUid),
      },
      body: JSON.stringify({ command: "ask", messages: "Breaching query", channelId }),
    });

    const blockedRes = await POST(blockedReq);
    expect(blockedRes.status).toBe(429);

    const blockedData = await blockedRes.json();
    expect(blockedData.success).toBe(false);
    expect(blockedData.error).toContain("Rate limit exceeded");
    expect(blockedRes.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(blockedRes.headers.get("Retry-After")).toBeTruthy();
  });

  test("fails with 401 Unauthorized when unauthenticated", async () => {
    mockVerifyToken.mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "ask", channelId: "c1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  test("fails with 400 Bad Request when required fields are missing", async () => {
    mockVerifyToken.mockResolvedValue("uid_user_ai");

    // Missing channelId
    const req = new Request("http://localhost:3000/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: createMockToken("uid_user_ai"),
      },
      body: JSON.stringify({ command: "ask" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing required fields");
  });
});
