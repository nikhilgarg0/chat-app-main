import { generateAIResponse } from "@/lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";

const mockText = jest.fn();
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn();

jest.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: (...args: any[]) => mockGetGenerativeModel(...args),
    })),
  };
});

describe("lib/gemini (generateAIResponse)", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockReset();
    mockText.mockReset();

    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("generates and returns AI response from primary Gemini model (gemini-2.0-flash)", async () => {
    const mockGeneratedText = "Here is the AI summary of your conversation.";
    mockText.mockReturnValue(mockGeneratedText);
    mockGenerateContent.mockResolvedValue({
      response: {
        text: mockText,
      },
    });

    const prompt = "Summarize the key decisions";
    const context = "User1: Let's use Tailwind.\nUser2: Agreed.";

    const result = await generateAIResponse(prompt, context);

    expect(result).toBe(mockGeneratedText);
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: "gemini-2.0-flash" });
    expect(mockGenerateContent).toHaveBeenCalledWith(
      "Summarize the key decisions\n\nContext:\nUser1: Let's use Tailwind.\nUser2: Agreed."
    );
  });

  test("passes only the prompt when context is empty or omitted", async () => {
    mockText.mockReturnValue("Direct prompt response");
    mockGenerateContent.mockResolvedValue({
      response: {
        text: mockText,
      },
    });

    const result = await generateAIResponse("What is React?");

    expect(result).toBe("Direct prompt response");
    expect(mockGenerateContent).toHaveBeenCalledWith("What is React?");
  });

  test("handles empty prompt and empty context without crashing", async () => {
    mockText.mockReturnValue("Default response");
    mockGenerateContent.mockResolvedValue({
      response: {
        text: mockText,
      },
    });

    const result = await generateAIResponse("", "");

    expect(result).toBe("Default response");
    expect(mockGenerateContent).toHaveBeenCalledWith("");
  });

  test("handles rich text, markdown, special characters, and emojis in prompt & context", async () => {
    const emojiPrompt = "Translate this: 🚀 🔥 💡";
    const emojiContext = "```json\n{\"status\": \"ok\", \"special\": \"<>&\"}\n```";

    mockText.mockReturnValue("Rocket, Fire, Lightbulb");
    mockGenerateContent.mockResolvedValue({
      response: {
        text: mockText,
      },
    });

    const result = await generateAIResponse(emojiPrompt, emojiContext);

    expect(result).toBe("Rocket, Fire, Lightbulb");
    expect(mockGenerateContent).toHaveBeenCalledWith(
      `${emojiPrompt}\n\nContext:\n${emojiContext}`
    );
  });

  test("handles very long context (chat history) correctly", async () => {
    const longContext = "Line of message content.\n".repeat(1000);
    const prompt = "Analyze trends";

    mockText.mockReturnValue("Analyzed 1000 lines");
    mockGenerateContent.mockResolvedValue({
      response: {
        text: mockText,
      },
    });

    const result = await generateAIResponse(prompt, longContext);

    expect(result).toBe("Analyzed 1000 lines");
    expect(mockGenerateContent).toHaveBeenCalledWith(
      `${prompt}\n\nContext:\n${longContext}`
    );
  });

  test("falls back to gemini-1.5-flash when primary model fails", async () => {
    const primaryError = new Error("Quota exceeded on primary model");
    const fallbackText = "Fallback response from 1.5-flash";

    const mockFallbackGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: jest.fn().mockReturnValue(fallbackText),
      },
    });

    mockGetGenerativeModel
      .mockReturnValueOnce({
        generateContent: jest.fn().mockRejectedValue(primaryError),
      })
      .mockReturnValueOnce({
        generateContent: mockFallbackGenerateContent,
      });

    const result = await generateAIResponse("Summarize", "Some context");

    expect(result).toBe(fallbackText);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[Gemini AI Warning]"),
      "Quota exceeded on primary model"
    );
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(1, { model: "gemini-2.0-flash" });
    expect(mockGetGenerativeModel).toHaveBeenNthCalledWith(2, { model: "gemini-1.5-flash" });
  });

  test("logs error and rethrows when both primary and fallback models fail", async () => {
    const apiError = new Error("All Gemini models unavailable");

    mockGetGenerativeModel.mockReturnValue({
      generateContent: jest.fn().mockRejectedValue(apiError),
    });

    await expect(generateAIResponse("prompt", "context")).rejects.toThrow(
      "All Gemini models unavailable"
    );

    expect(console.error).toHaveBeenCalledWith("Gemini AI API Error:", "All Gemini models unavailable");
  });
});
