import { authFetch } from "@/lib/authFetch";
import { getAuth } from "firebase/auth";

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
}));

describe("lib/authFetch", () => {
  const originalFetch = global.fetch;
  let mockGetAuth: jest.MockedFunction<typeof getAuth>;

  beforeEach(() => {
    mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
    global.fetch = jest.fn();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("attaches Authorization header and firebaseUid parameter for authenticated user", async () => {
    const mockUser = {
      uid: "user_123",
      getIdToken: jest.fn().mockResolvedValue("mock_jwt_token_abc"),
    };
    mockGetAuth.mockReturnValue({ currentUser: mockUser } as any);

    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: "ok" }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const res = await authFetch("/api/workspaces");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/workspaces?firebaseUid=user_123",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer mock_jwt_token_abc",
        }),
      })
    );
    expect(res).toBe(mockResponse);
  });

  test("correctly appends firebaseUid with '&' when URL already contains query params", async () => {
    const mockUser = {
      uid: "user_456",
      getIdToken: jest.fn().mockResolvedValue("token_xyz"),
    };
    mockGetAuth.mockReturnValue({ currentUser: mockUser } as any);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    await authFetch("/api/messages?workspaceId=ws_999");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/messages?workspaceId=ws_999&firebaseUid=user_456",
      expect.anything()
    );
  });

  test("does not duplicate firebaseUid parameter if already present in URL", async () => {
    const mockUser = {
      uid: "user_789",
      getIdToken: jest.fn().mockResolvedValue("token_789"),
    };
    mockGetAuth.mockReturnValue({ currentUser: mockUser } as any);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    await authFetch("/api/messages?firebaseUid=explicit_uid");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/messages?firebaseUid=explicit_uid",
      expect.anything()
    );
  });

  test("handles unauthenticated user (currentUser = null) gracefully", async () => {
    mockGetAuth.mockReturnValue({ currentUser: null } as any);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    await authFetch("/api/public-endpoint");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/public-endpoint",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
  });

  test("handles getIdToken rejection gracefully without throwing", async () => {
    const mockUser = {
      uid: "user_fail_token",
      getIdToken: jest.fn().mockRejectedValue(new Error("Token expired")),
    };
    mockGetAuth.mockReturnValue({ currentUser: mockUser } as any);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    const res = await authFetch("/api/profile");

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[authFetch Warning]"),
      expect.any(Error)
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/profile?firebaseUid=user_fail_token",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
      })
    );
    expect(res.ok).toBe(true);
  });

  test("logs diagnostic error message when response is not ok and parses JSON error", async () => {
    const mockUser = {
      uid: "user_err",
      getIdToken: jest.fn().mockResolvedValue("token_err"),
    };
    mockGetAuth.mockReturnValue({ currentUser: mockUser } as any);

    const mockFailedResponse = {
      ok: false,
      status: 403,
      statusText: "Forbidden",
      clone: () => ({
        json: jest.fn().mockResolvedValue({ error: "Access denied to workspace" }),
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockFailedResponse);

    const res = await authFetch("/api/workspaces/private", { method: "DELETE" });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[Developer Diagnostic Logger] API Request Failed:")
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Access denied to workspace")
    );
    expect(res).toBe(mockFailedResponse);
  });

  test("falls back to statusText when cloning/parsing error JSON fails", async () => {
    mockGetAuth.mockReturnValue({ currentUser: null } as any);

    const mockFailedResponse = {
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      clone: () => ({
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON body")),
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockFailedResponse);

    await authFetch("/api/server-error");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Bad Gateway")
    );
  });

  test("preserves custom options, body, and custom headers", async () => {
    mockGetAuth.mockReturnValue({ currentUser: null } as any);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 201 });

    const postData = JSON.stringify({ message: "Hello 🚀" });
    await authFetch("/api/messages", {
      method: "POST",
      body: postData,
      headers: {
        "X-Custom-Trace-ID": "trace-987",
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/messages",
      expect.objectContaining({
        method: "POST",
        body: postData,
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Custom-Trace-ID": "trace-987",
        }),
      })
    );
  });

  test("correctly encodes special characters in firebaseUid", async () => {
    const specialUid = "user+special/test:key@123#";
    const mockUser = {
      uid: specialUid,
      getIdToken: jest.fn().mockResolvedValue("tok"),
    };
    mockGetAuth.mockReturnValue({ currentUser: mockUser } as any);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    await authFetch("/api/user");

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/user?firebaseUid=${encodeURIComponent(specialUid)}`,
      expect.anything()
    );
  });
});
