import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";
import { generateAIResponse } from "@/lib/gemini";
import { pusherServer } from "@/lib/pusher-server";
import { verifyToken } from "@/lib/firebaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { formatMessageTime } from "@/lib/utils";

// Rate limit: 10 AI requests per user per minute
const AI_RATE_LIMIT = { maxRequests: 10, windowMs: 60_000 };

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const { command, messages, channelId, firebaseUid: bodyUid } = body;

    const verifiedUid = await verifyToken(req);
    const uid = verifiedUid || bodyUid || searchParams.get("firebaseUid");

    if (!uid) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const { allowed, remaining, resetAt } = checkRateLimit(`ai:${uid}`, AI_RATE_LIMIT);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please wait before making another AI request." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
            "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    if (!command || !channelId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const contextMessages = await Message.find({ channelId })
      .sort({ createdAt: -1 })
      .limit(50);

    const contextStr = contextMessages
      .reverse()
      .map((m: any) => `[${formatMessageTime(m.timestamp || m.createdAt)}] ${m.author}: ${m.content}`)
      .join("\n");

    let prompt = "";

    if (command === "ask") {
      const userQuestion = messages || "";
      prompt = `You are Nexus AI, a helpful assistant.\nBased on this conversation:\n${contextStr}\n\nAnswer this question: ${userQuestion}\nBe concise and helpful.`;
    } else if (command === "summarize") {
      prompt = `You are Nexus AI. Summarize this conversation in 3-5 bullet points:\n${contextStr}`;
    } else if (command === "todo") {
      prompt = `You are Nexus AI. Extract all action items and tasks from this conversation:\n${contextStr}\nFormat as a numbered list.`;
    } else {
      return NextResponse.json({ success: false, error: "Invalid command" }, { status: 400 });
    }

    const aiResponseText = await generateAIResponse(prompt, "");

    const now = new Date();
    const msgId = crypto.randomUUID();

    const message = await Message.create({
      channelId,
      author: "Nexus AI",
      content: aiResponseText,
      timestamp: now,
      time: formatMessageTime(now),
      msgId,
      type: "ai",
    });

    try {
      await pusherServer.trigger(`chat-${channelId}`, "new-message", {
        _id: String(message._id),
        channelId,
        author: "Nexus AI",
        content: aiResponseText,
        timestamp: now.toISOString(),
        time: formatMessageTime(now),
        msgId,
        type: "ai",
      });
    } catch (pusherError) {
      console.error("Pusher trigger error:", pusherError);
    }

    return NextResponse.json(
      { success: true, message },
      {
        status: 201,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    );
  } catch (error: any) {
    console.error("AI Route Error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while processing your AI request." },
      { status: 500 }
    );
  }
}
