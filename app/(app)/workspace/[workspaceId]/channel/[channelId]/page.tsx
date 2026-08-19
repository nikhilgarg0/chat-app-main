"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import MessageBubble from "@/components/chat/MessageBubble";
import Toast from "@/components/ui/Toast";
import { auth } from "@/lib/firebase";
import { authFetch } from "@/lib/authFetch";
import { useSidebar } from "@/components/SidebarContext";
import { Lock } from "lucide-react";
import Link from "next/link";
import PageLoader from "@/components/ui/PageLoader";

const AI_COMMANDS = [
  { command: "/ask", description: "Ask AI a question about this conversation" },
  { command: "/summarize", description: "Summarize the conversation" },
  { command: "/todo", description: "Extract action items" }
];

export default function ChannelPage() {
  const { channelId, workspaceId } = useParams();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState({ mentions: true, allMessages: false, sounds: true });
  const [messageInput, setMessageInput] = useState("");
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [restInput, setRestInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [channelName, setChannelName] = useState(channelId as string);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [joining, setJoining] = useState(false);

  const { messages, setMessages, connected, sendMessage, sendTyping, typingUsers, refetchMessages, loadMoreMessages, hasMore } = useSocket(channelId as string, username, avatarUrl, notificationPrefs);
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const memRes = await authFetch(`/api/channels/${channelId}/membership?firebaseUid=${user.uid}`);
          const memData = memRes.ok ? await memRes.json() : { isMember: false };
          setIsMember(memData.isMember);

          if (memData.isMember) {
            const res = await authFetch(`/api/users/profile?firebaseUid=${user.uid}`);
            if (res.ok) {
              const data = await res.json();
              setUsername(data.user?.displayName || user.email?.split("@")[0] || "User");
              setAvatarUrl(data.user?.avatarUrl || "");
              if (data.user?.notificationPrefs) {
                setNotificationPrefs(data.user.notificationPrefs);
              }
            } else {
              setUsername(user.email?.split("@")[0] || "User");
            }
          }
        } catch (e) {
          setIsMember(false);
        }
      }
    });

    const fetchChannelName = async () => {
      try {
        const res = await authFetch(`/api/channels/${channelId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.channel) {
            setChannelName(data.channel.name);
          }
        }
      } catch (e) { }
    };
    fetchChannelName();

    return () => unsub();
  }, [workspaceId, channelId]);

  const handleJoinChannel = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ action: "join" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsMember(true);
        const profileRes = await authFetch(`/api/users/profile?firebaseUid=${user.uid}`);
        if (profileRes.ok) {
          const pdata = await profileRes.json();
          setUsername(pdata.user?.displayName || user.email?.split("@")[0] || "User");
          setAvatarUrl(pdata.user?.avatarUrl || "");
          if (pdata.user?.notificationPrefs) setNotificationPrefs(pdata.user.notificationPrefs);
        } else {
          setUsername(user.email?.split("@")[0] || "User");
        }
      } else {
        setToast("Failed to join channel.");
      }
    } catch {
      setToast("Error joining channel.");
    } finally {
      setJoining(false);
    }
  };


  const lastMessageId = (messages[messages.length - 1] as any)?._id
    ?? (messages[messages.length - 1] as any)?.msgId
    ?? null;

  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [lastMessageId]);

  const filteredCommands = AI_COMMANDS.filter((c) =>
    c.command.toLowerCase().startsWith(messageInput.toLowerCase())
  );

  useEffect(() => {
    if (messageInput.startsWith("/") && !messageInput.includes(" ") && filteredCommands.length > 0) {
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
  }, [messageInput, filteredCommands]);

  const COMMAND_PLACEHOLDERS: Record<string, string> = {
    "/ask": "Ask anything about this conversation...",
    "/summarize": "Press Enter to summarize...",
    "/todo": "Press Enter to extract action items...",
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleSelectCommand = (cmd: string) => {
    setActiveCommand(cmd);
    setRestInput("");
    setMessageInput(cmd + " ");
    setShowMenu(false);
    inputRef.current?.focus();
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (activeCommand) {
      setRestInput(val);
      setMessageInput(activeCommand + " " + val);
    } else {
      setMessageInput(val);
    }
    sendTyping(username, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(username, false);
    }, 2000);
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !username || isSending) return;
    setIsSending(true);
    const text = messageInput.trim();
    setMessageInput("");
    setActiveCommand(null);
    setRestInput("");
    sendTyping(username, false);

    try {
      if (text.startsWith("/ask ") || text.startsWith("/summarize") || text.startsWith("/todo")) {
        const parts = text.split(" ");
        const command = parts[0].substring(1);
        const arg = parts.slice(1).join(" ");

        setIsThinking(true);
        try {
          const res = await authFetch("/api/ai", {
            method: "POST",
            body: JSON.stringify({
              command,
              messages: arg,
              channelId,
              workspaceId
            })
          });

          if (res.ok) {
            await refetchMessages();
          } else if (res.status === 429) {
            setToast("Rate limit exceeded. Please wait before making another AI request.");
          } else {
            setToast("AI request failed. Please try again.");
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsThinking(false);
        }
      } else {
        const replyContext = replyTo
          ? { author: replyTo.author, content: (replyTo.content || "").slice(0, 60), msgId: replyTo.msgId }
          : null;
        sendMessage(username, text, replyContext as any);
        setReplyTo(null);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMenu && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleSelectCommand(filteredCommands[selectedIndex].command);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMenu(false);
        return;
      }
    }

    // Backspace on empty restInput clears the command pill
    if (e.key === "Backspace" && activeCommand && restInput === "") {
      e.preventDefault();
      setActiveCommand(null);
      setRestInput("");
      setMessageInput("");
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const onReact = async (messageId: string, emoji: string) => {
    if (!auth.currentUser) return;
    const firebaseUid = auth.currentUser.uid;

    // Snapshot current state for rollback
    let prevMessages: any[];
    (setMessages as any)((prev: any[]) => {
      prevMessages = prev;
      return prev.map((msg: any) => {
        if (msg._id !== messageId) return msg;
        const reactions = { ...(msg.reactions || {}) };
        const users: string[] = reactions[emoji] ? [...reactions[emoji]] : [];
        const idx = users.indexOf(firebaseUid);
        if (idx === -1) users.push(firebaseUid);
        else users.splice(idx, 1);
        reactions[emoji] = users;
        if (reactions[emoji].length === 0) delete reactions[emoji];
        return { ...msg, reactions };
      });
    });

    try {
      await authFetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji, firebaseUid, username })
      });
    } catch (e) {
      console.error(e);
      // Roll back to the state before the optimistic update
      (setMessages as any)(() => prevMessages);
    }
  };

  const onDelete = useCallback(async (messageId: string) => {
    // Optimistic removal
    (setMessages as any)((prev: any[]) => prev.filter((m: any) => m._id !== messageId));
    try {
      await authFetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error(e);
    }
  }, [setMessages]);

  const handleRetry = useCallback((failedMsg: any) => {
    (setMessages as any)((prev: any[]) => prev.filter((m: any) => m.msgId !== failedMsg.msgId));
    sendMessage(username, failedMsg.content, failedMsg.replyTo || null);
  }, [username, sendMessage, setMessages]);

  const handleLoadMore = async () => {
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    await loadMoreMessages();
    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = container.scrollHeight - prevScrollHeight;
      }
    });
  };

  const showToast = useCallback((msg: string) => setToast(msg), []);
  const onReply = useCallback((msg: any) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  }, []);

  if (isMember === null) return <PageLoader />;

  if (isMember === false) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-base)] w-full relative">
        {/* Header without hamburger if needed, or simple header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[20px] backdrop-saturate-[180%] z-20 shrink-0 sticky top-0">
          <div className="flex items-center flex-1">
            {!isSidebarOpen && (
              <button onClick={toggleSidebar} className="p-2 -ml-2 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors">
                <svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
            )}
          </div>
          <div className="flex items-center justify-center gap-1 flex-1 lg:flex-none">
            <span className="text-[var(--text-tertiary)] font-mono text-base">#</span>
            <h2 className="text-[var(--text-primary)] font-display font-bold text-base tracking-tight">{channelName}</h2>
          </div>
          <div className="flex-[1]"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-[20px] bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center shadow-sm mb-6">
            <Lock className="w-8 h-8 text-[var(--text-secondary)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">#{channelName}</h2>
          <p className="text-[var(--text-secondary)] mb-8">You haven't joined this channel yet.</p>
          
          <button 
            onClick={handleJoinChannel} 
            disabled={joining}
            className="px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-full transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {joining ? "Joining..." : "Join channel"}
          </button>
          
          <Link href={`/workspace/${workspaceId}/browse`} className="mt-6 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            Go back
          </Link>
        </div>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-base)] w-full">
      {/* Header - Glassmorphism */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[20px] backdrop-saturate-[180%] z-20 shrink-0 sticky top-0">

        {/* Left Side: Hamburger */}
        <div className="flex items-center flex-1">
          {!isSidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="p-2 -ml-2 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Open Sidebar"
            >
              <svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
          )}
        </div>

        {/* Center: Channel Name */}
        <div className="flex items-center justify-center gap-1 flex-1 lg:flex-none">
          <span className="text-[var(--text-tertiary)] font-mono text-base">#</span>
          <h2 className="text-[var(--text-primary)] font-display font-bold text-base md:text-lg tracking-tight truncate max-w-[140px] sm:max-w-none text-center">{channelName}</h2>
        </div>

        {/* Right Side: Status Pill */}
        <div className="flex items-center justify-end flex-1">
          <div className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-sm">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-[var(--success)]" : "bg-red-400 animate-pulse"}`}></div>
            <span className="text-[9px] md:text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">{connected ? "Live" : "Offline"}</span>
          </div>
        </div>

      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-0 py-4 scroll-smooth [&::-webkit-scrollbar]:hidden z-10 overscroll-contain flex flex-col" style={{ WebkitOverflowScrolling: "touch" }}>

        {hasMore && (
          <div className="flex justify-center py-3">
            <button
              onClick={handleLoadMore}
              className="text-[13px] text-[var(--accent)] font-medium px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Load earlier messages
            </button>
          </div>
        )}
        {messages.length === 0 && connected && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40 space-y-4 pt-10">
            <div className="w-16 h-16 rounded-[24px] bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] shadow-apple">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <div className="text-center font-body">
              <p className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">Encrypted Hub</p>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">Beginning of # {channelName}</p>
            </div>
          </div>
        )}
        
        {messages.length === 0 && !connected && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40 space-y-4 pt-10">
            <svg className="w-8 h-8 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <div className="text-center font-body">
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">Connecting to secure hub...</p>
            </div>
          </div>
        )}

        {messages.map((msg: any, i: number) => {
          let isGrouped = false;
          if (i > 0) {
            const prevMsg = messages[i - 1] as any;
            if (prevMsg.author === msg.author) {
              const t1 = prevMsg.timestamp || prevMsg.createdAt;
              const t2 = msg.timestamp || msg.createdAt;
              if (t1 && t2) {
                const diff = new Date(t2).getTime() - new Date(t1).getTime();
                if (diff < 5 * 60 * 1000) isGrouped = true;
              } else if (!t1 && !t2) {
                isGrouped = true; // optimistc before timestamps
              }
            }
          }

          return (
            <MessageBubble
              key={msg._id || i}
              message={msg}
              isOwn={msg.author === username}
              isGrouped={isGrouped}
              firebaseUid={auth.currentUser?.uid}
              onReact={onReact}
              onDelete={onDelete}
              onReply={onReply}
              onForward={(msg: any) => showToast(`Forwarded message: ${msg.content.substring(0, 20)}...`)}
              username={username}
              onShowToast={showToast}
              onRetry={handleRetry}
            />
          );
        })}

        <div className="flex flex-col gap-2">
          {isThinking && (
            <div className="flex items-start gap-3 px-4 py-2 mt-4 animate-slide-up">
              <div className="w-8 h-8 rounded-lg shrink-0 bg-transparent flex items-center justify-center border border-[var(--ai-accent)] border-opacity-30 shadow-[0_0_12px_var(--ai-bg)_inset] opacity-80 backdrop-blur-sm">
                <span className="text-[10px] text-[var(--ai-accent)] font-bold">AI</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold tracking-wide text-[var(--ai-accent)] flex items-center gap-2">
                  Nexus AI
                </span>
                <div className="flex gap-1 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--ai-accent)] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--ai-accent)] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--ai-accent)] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Typing Indicator */}
          {!isThinking && (() => {
            const activeTypers = typingUsers.filter((u: string) => u !== username);
            if (activeTypers.length === 0) return null;
            const verb = activeTypers.length === 1 ? 'is' : 'are';
            let names: string;
            if (activeTypers.length === 1) {
              names = activeTypers[0];
            } else if (activeTypers.length === 2) {
              names = `${activeTypers[0]} and ${activeTypers[1]}`;
            } else {
              names = `${activeTypers[0]}, ${activeTypers[1]} and ${activeTypers.length - 2} other${activeTypers.length - 2 > 1 ? 's' : ''}`;
            }
            return (
              <div className="flex items-center gap-1.5 animate-slide-up px-3 py-1.5 mt-2 ml-4 md:ml-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm self-start">
                <span className="text-[12px] text-[var(--text-tertiary)] font-medium italic">
                  {names} {verb} typing
                </span>
                <div className="flex gap-1 ml-1">
                  <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            );
          })()}
        </div>

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input wrapper - Glassmorphism */}
      <div className="p-4 bg-[var(--bg-glass)] backdrop-blur-[20px] backdrop-saturate-[180%] border-t border-[var(--border)] z-20 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-[1000px] mx-auto flex flex-col gap-0">

          {/* Reply bar — normal flow, sits above the input bar */}
          {replyTo && (
            <div style={{
              background: "var(--bg-elevated)",
              borderTop: "2px solid var(--accent)",
              borderBottom: "none",
              borderRadius: "8px 8px 0 0",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", marginBottom: 2 }}>
                  ↩ Replying to {replyTo.author}
                </div>
                <div style={{
                  fontSize: 12, color: "var(--text-secondary)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {(replyTo.content || "").slice(0, 60)}{(replyTo.content || "").length > 60 ? "…" : ""}
                </div>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                style={{
                  background: "transparent", border: "none",
                  color: "var(--text-tertiary)", fontSize: 16,
                  cursor: "pointer", flexShrink: 0, padding: 4,
                  lineHeight: 1,
                }}
              >✕</button>
            </div>
          )}



          {/* Input bar row — relative so the command menu can anchor to it */}
          <div className="relative group">

            {/* Splash Command Menu */}
            {showMenu && filteredCommands.length > 0 && (
              <div
                ref={menuRef}
                className="absolute bottom-full left-0 right-0 md:left-4 md:right-auto mb-3 w-full md:w-80 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] p-1.5 shadow-apple z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="text-[var(--ai-accent)] text-[10px] font-bold tracking-widest uppercase mb-1 px-2 pt-1 flex items-center gap-1.5">
                  ✦ AI Command
                </div>
                {filteredCommands.map((item, idx) => (
                  <div
                    key={item.command}
                    onClick={() => handleSelectCommand(item.command)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex flex-row items-center gap-3 px-[12px] py-[8px] rounded-[8px] cursor-pointer transition-colors ${idx === selectedIndex ? "bg-[var(--bg-elevated)]" : "hover:bg-[var(--bg-elevated)]"
                      }`}
                  >
                    <span className="text-[var(--accent)] font-mono font-medium text-[13px] shrink-0">{item.command}</span>
                    <span className="text-[var(--text-secondary)] text-[13px] truncate">{item.description}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className={`w-full flex flex-col gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/30 p-[4px] md:pr-[6px] transition-all relative z-10 min-h-[48px] ${replyTo ? "rounded-b-2xl rounded-t-none" : "rounded-2xl"}`}>
              {!connected && (
                <div className="w-full text-center py-1 mt-1">
                  <span className="text-xs font-medium text-red-400 bg-red-400/10 px-3 py-1 rounded-full">Reconnecting to server... Messages are disabled</span>
                </div>
              )}

              <div className="w-full flex-1 flex items-center gap-1 h-full pl-3 md:pl-4 py-1">
                {activeCommand && (
                  <span style={{
                    background: 'var(--ai-bg)',
                    color: 'var(--ai-accent)',
                    borderRadius: '999px',
                    padding: '2px 10px',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {activeCommand}
                  </span>
                )}
                <input
                  ref={inputRef}
                  placeholder={activeCommand ? (COMMAND_PLACEHOLDERS[activeCommand] ?? "Message channel...") : "Message channel..."}
                  value={activeCommand ? restInput : messageInput}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-0 ring-0 focus:ring-0 text-[15px] font-body text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                  autoFocus
                  disabled={!connected}
                />
                
                <button
                  onClick={handleSend}
                  disabled={!messageInput.trim() || !connected || !username || isThinking || isSending}
                  className="w-[44px] h-[44px] md:w-8 md:h-8 rounded-[16px] md:rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shrink-0 transition-all active:scale-[0.92] disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-[var(--accent)] disabled:cursor-not-allowed group/btn shadow-sm ml-auto"
                >
                  {(isThinking || isSending) ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 md:w-4 md:h-4 ml-[1px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
