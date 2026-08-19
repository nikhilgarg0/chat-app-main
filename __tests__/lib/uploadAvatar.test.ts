import { uploadAvatar } from "@/lib/uploadAvatar";
import { auth } from "@/lib/firebase";

jest.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: null,
  },
}));

describe("lib/uploadAvatar", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    (auth as any).currentUser = null;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("successfully uploads a valid image and returns the download URL", async () => {
    const mockFile = new File(["image-bytes"], "avatar.png", { type: "image/png" });
    const mockToken = "valid_firebase_jwt_token";

    (auth as any).currentUser = {
      getIdToken: jest.fn().mockResolvedValue(mockToken),
    };

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ url: "https://storage.example.com/avatar.png" }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const url = await uploadAvatar(mockFile, "user_123");

    expect(url).toBe("https://storage.example.com/avatar.png");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/upload/avatar",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
        body: expect.any(FormData),
      })
    );
  });

  test("throws error when file is not an image MIME type", async () => {
    const textFile = new File(["plain text"], "notes.txt", { type: "text/plain" });

    await expect(uploadAvatar(textFile, "user_123")).rejects.toThrow(
      "File must be an image."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("throws error when file size exceeds 2MB limit", async () => {
    const oversizeBuffer = new Uint8Array(2 * 1024 * 1024 + 1); // 2MB + 1 byte
    const largeFile = new File([oversizeBuffer], "large.png", { type: "image/png" });

    await expect(uploadAvatar(largeFile, "user_123")).rejects.toThrow(
      "Image must be smaller than 2MB."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("allows file with size exactly at 2MB limit (2,097,152 bytes)", async () => {
    const exactBuffer = new Uint8Array(2 * 1024 * 1024);
    const exactFile = new File([exactBuffer], "exact.png", { type: "image/png" });

    (auth as any).currentUser = {
      getIdToken: jest.fn().mockResolvedValue("mock_token"),
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ url: "https://example.com/exact.png" }),
    });

    const url = await uploadAvatar(exactFile, "user_123");
    expect(url).toBe("https://example.com/exact.png");
  });

  test("throws error when user is not authenticated", async () => {
    const mockFile = new File(["image-bytes"], "avatar.png", { type: "image/png" });
    (auth as any).currentUser = null;

    await expect(uploadAvatar(mockFile, "user_123")).rejects.toThrow(
      "Not authenticated"
    );
  });

  test("throws custom error message returned by upload API endpoint", async () => {
    const mockFile = new File(["image-bytes"], "avatar.png", { type: "image/png" });
    (auth as any).currentUser = {
      getIdToken: jest.fn().mockResolvedValue("mock_token"),
    };

    const mockErrorResponse = {
      ok: false,
      json: jest.fn().mockResolvedValue({ error: "Storage bucket quota reached" }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockErrorResponse);

    await expect(uploadAvatar(mockFile, "user_123")).rejects.toThrow(
      "Storage bucket quota reached"
    );
  });

  test("falls back to default error message when API fails without JSON error body", async () => {
    const mockFile = new File(["image-bytes"], "avatar.png", { type: "image/png" });
    (auth as any).currentUser = {
      getIdToken: jest.fn().mockResolvedValue("mock_token"),
    };

    const mockErrorResponse = {
      ok: false,
      json: jest.fn().mockRejectedValue(new Error("HTML response")),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockErrorResponse);

    await expect(uploadAvatar(mockFile, "user_123")).rejects.toThrow(
      "Failed to upload avatar"
    );
  });

  test("supports various image formats including webp, gif, and unicode filenames", async () => {
    const emojiFile = new File(["webp-bytes"], "profile_🔥_🚀.webp", {
      type: "image/webp",
    });
    (auth as any).currentUser = {
      getIdToken: jest.fn().mockResolvedValue("mock_token"),
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ url: "https://example.com/emoji.webp" }),
    });

    const result = await uploadAvatar(emojiFile, "user_123");
    expect(result).toBe("https://example.com/emoji.webp");
  });
});
