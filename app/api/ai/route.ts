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
    const cleanCommand = command.toLowerCase().trim();

    if (cleanCommand === "ask" || cleanCommand === "ai") {
      const userQuestion = messages?.trim() || "What can you tell me about this channel?";
      prompt = `You are Nexus AI, a smart workspace assistant.\n\nChannel Conversation History:\n${contextStr || "No previous messages in this channel."}\n\nUser Question: ${userQuestion}\n\nProvide a direct, concise, and helpful response.`;
    } else if (cleanCommand === "summarize" || cleanCommand === "summary") {
      prompt = `You are Nexus AI, a smart workspace assistant.\n\nChannel Conversation History:\n${contextStr || "No previous messages in this channel."}\n\nTask: Summarize this channel's conversation in 3-5 concise bullet points highlighting key discussions and outcomes.`;
    } else if (cleanCommand === "todo" || cleanCommand === "tasks") {
      prompt = `You are Nexus AI, a smart workspace assistant.\n\nChannel Conversation History:\n${contextStr || "No previous messages in this channel."}\n\nTask: Extract all actionable to-dos, tasks, and follow-ups from this channel's discussion. Format as a clean checklist. If no tasks are present, clearly state that.`;
    } else {
      const query = messages?.trim() || cleanCommand;
      prompt = `You are Nexus AI, a smart workspace assistant.\n\nChannel Conversation History:\n${contextStr || "No previous messages in this channel."}\n\nUser Prompt: ${query}\n\nProvide a helpful, well-formatted response.`;
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
