"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { pusherClient } from "@/lib/pusher-client";
import { authFetch } from "@/lib/authFetch";
import { useTheme } from "@/components/ThemeProvider";
import { useSidebar } from "@/components/SidebarContext";
import UserAvatar from "@/components/ui/UserAvatar";

export default function AppSidebar() {
  const { workspaceId, channelId } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { isSidebarOpen, setIsSidebarOpen, toggleSidebar } = useSidebar();

  const [workspace, setWorkspace] = useState<any>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map());
  const [showChannelInput, setShowChannelInput] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings popup on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettings]);

  useEffect(() => {
    const fetchUserAndWorkspaces = async () => {
      if (!auth.currentUser) return;
      try {
        const [profRes, wssRes] = await Promise.all([
          authFetch(`/api/users/profile?firebaseUid=${auth.currentUser.uid}`),
          authFetch(`/api/workspaces?firebaseUid=${auth.currentUser.uid}`)
        ]);
        if (profRes.ok) {
          const profData = await profRes.json();
          setUserProfile(profData.user);
        }
        if (wssRes.ok) {
          const wssData = await wssRes.json();
          if (wssData.success) setAllWorkspaces(wssData.workspaces);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUserAndWorkspaces();
  }, [pathname]);

  useEffect(() => {
    if (!workspaceId || typeof workspaceId !== "string" || !auth.currentUser) {
      setWorkspace(null);
      return;
    }
    const fetchWorkspaceDetails = async () => {
      try {
        const wsRes = await authFetch(`/api/workspaces/${workspaceId}?firebaseUid=${auth.currentUser?.uid}`);
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setWorkspace({
            ...wsData.workspace,
            channels: wsData.joinedChannels || wsData.workspace.channels
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkspaceDetails();
  }, [workspaceId]);

  useEffect(() => {
    if (!userProfile?.displayName || !workspaceId || typeof workspaceId !== "string") return;
    const uname = userProfile.displayName;

    authFetch("/api/pusher/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, username: uname, status: "online" })
    }).catch(() => { });

    const presenceChannel = `workspace-${workspaceId}`;
    const channel = pusherClient.subscribe(presenceChannel);

    channel.bind("presence-update", ({ username, status, firebaseUid }: { username: string; status: string; firebaseUid: string }) => {
      setOnlineUsers((prev) => {
        const next = new Map(prev);
        if (status === "online") next.set(username, firebaseUid);
        else next.delete(username);
        return next;
      });
    });

    channel.bind("channel-joined", ({ channel: newChannel, firebaseUid }: { channel: any; firebaseUid: string }) => {
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== firebaseUid) return;
      setWorkspace((prev: any) => {
        if (!prev) return prev;
        const alreadyExists = prev.channels?.some((c: any) => c._id === newChannel._id);
        if (alreadyExists) return prev;
        return { ...prev, channels: [...(prev.channels || []), newChannel] };
      });
    });

    channel.bind("channel-created", ({ channel: newChannel }: { channel: any }) => {
      setWorkspace((prev: any) => {
        if (!prev) return prev;
        const alreadyExists = prev.channels?.some((c: any) => c._id === newChannel._id);
        if (alreadyExists) return prev;
        return { ...prev, channels: [...(prev.channels || []), newChannel] };
      });
    });

    return () => {
      authFetch("/api/pusher/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, username: uname, status: "offline" })
      }).catch(() => { });
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [userProfile?.displayName, workspaceId]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) { }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !workspaceId) return;
    setIsCreatingChannel(true);
    try {
      const res = await authFetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: newChannelName.trim(),
          firebaseUid: auth.currentUser?.uid,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkspace((prev: any) => ({
          ...prev,
          channels: [...prev.channels, data.channel]
        }));
        setNewChannelName("");
        setShowChannelInput(false);
        router.push(`/workspace/${workspaceId}/channel/${data.channel._id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingChannel(false);
    }
  };

  if (pathname === "/onboarding") return null;

  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30 animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed md:relative z-40 h-full shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col
          bg-[var(--bg-surface)] border-r border-[var(--border)]
          ${isSidebarOpen
            ? "translate-x-0 w-[80vw] max-w-[280px] shadow-2xl md:shadow-none md:w-[256px] md:opacity-100"
            : "-translate-x-full w-[80vw] max-w-[280px] md:translate-x-0 md:w-0 md:opacity-0 md:border-r-0"
          }
        `}
      >
        <div className="w-[80vw] max-w-[280px] md:w-[256px] h-full flex flex-col">

          {/* ── HEADER ─────────────────────────────────────── */}
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-[var(--border)] shrink-0">
            <Link href="/home" className="flex items-center gap-2.5 hover:opacity-75 transition-opacity">
              <Image
                src={isDark ? "/logos/Logo_White.png" : "/logos/Logo_Black.png"}
                alt="Nexus"
                width={24}
                height={24}
                className="object-contain shrink-0"
              />
              <Image
                src={isDark ? "/logos/Wordmark_White.png" : "/logos/Wordmark_Black.png"}
                alt="Nexus"
                width={72}
                height={20}
                className="object-contain"
              />
            </Link>

            {/* Collapse button (desktop) */}
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors shrink-0"
              title="Collapse sidebar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            {/* Close button (mobile) */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden flex p-1.5 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors shrink-0"
              title="Close"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── SCROLLABLE BODY ─────────────────────────────── */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden flex flex-col py-3 gap-5">

            {/* Workspaces */}
            <section>
              <div className="px-4 mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] tracking-[0.08em] uppercase">
                  Workspaces
                </span>
                <Link
                  href="/home"
                  className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  title="All workspaces"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </Link>
              </div>

              <div className="px-2 space-y-0.5">
                {allWorkspaces.map(ws => {
                  const isActive = ws._id === workspaceId;
                  return (
                    <Link
                      key={ws._id}
                      href={`/workspace/${ws._id}`}
                      className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all min-h-[36px] md:min-h-[30px] ${
                        isActive
                          ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <div className={`w-[22px] h-[22px] rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                        isActive
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] group-hover:bg-[var(--border-strong)]"
                      }`}>
                        {ws.name[0]?.toUpperCase()}
                      </div>
                      <span className="truncate flex-1">{ws.name}</span>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 opacity-80" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Channels */}
            {workspace && (
              <section>
                <div className="px-4 mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] tracking-[0.08em] uppercase">
                    Channels
                  </span>
                  <button
                    onClick={() => setShowChannelInput(!showChannelInput)}
                    className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    title="New channel"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* New channel input */}
                {showChannelInput && (
                  <div className="mx-2 mb-1.5 animate-slide-up">
                    <div className="flex items-center gap-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 h-8 focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)] transition-all">
                      <span className="text-[var(--text-tertiary)] font-mono text-sm">#</span>
                      <input
                        value={newChannelName}
                        onChange={e => setNewChannelName(e.target.value)}
                        placeholder="channel-name"
                        autoFocus
                        disabled={isCreatingChannel}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleCreateChannel();
                          if (e.key === "Escape") { setShowChannelInput(false); setNewChannelName(""); }
                        }}
                        className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={handleCreateChannel}
                          disabled={!newChannelName.trim() || isCreatingChannel}
                          className="w-5 h-5 flex items-center justify-center rounded text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-30 transition-all text-xs font-bold"
                          title="Create"
                        >✓</button>
                        <button
                          onClick={() => { setShowChannelInput(false); setNewChannelName(""); }}
                          className="w-5 h-5 flex items-center justify-center rounded text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all text-xs"
                          title="Cancel"
                        >✕</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="px-2 space-y-0.5">
                  {workspace.channels?.map((ch: any) => {
                    const isActive = ch._id === channelId;
                    return (
                      <Link
                        key={ch._id}
                        href={`/workspace/${workspace._id}/channel/${ch._id}`}
                        onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                        className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition-all min-h-[36px] md:min-h-[28px] ${
                          isActive
                            ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-[var(--accent)]" />
                        )}
                        <span className={`font-mono text-[13px] shrink-0 ${isActive ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"}`}>#</span>
                        <span className="truncate">{ch.name}</span>
                      </Link>
                    );
                  })}

                  {/* Browse all channels */}
                  <Link
                    href={`/workspace/${workspace._id}/browse`}
                    onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                    className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-all mt-0.5 ${
                      pathname === `/workspace/${workspace._id}/browse`
                        ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium"
                        : "text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                    <span>Browse all</span>
                  </Link>
                </div>
              </section>
            )}

            {/* Online Users */}
            {workspace && onlineUsers.size > 0 && (
              <section>
                <div className="px-4 mb-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] tracking-[0.08em] uppercase">Online</span>
                  <span className="text-[10px] tabular-nums font-mono text-[var(--success)] bg-[var(--success)]/10 px-1.5 py-px rounded-full">{onlineUsers.size}</span>
                </div>
                <div className="px-2 space-y-0.5">
                  {Array.from(onlineUsers.entries()).map(([uname, uid]) => (
                    <Link
                      key={uname}
                      href={`/user/${encodeURIComponent(uid)}`}
                      onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)] transition-colors min-h-[28px]"
                    >
                      <span className="relative shrink-0">
                        <span className="block w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                        <span className="absolute inset-0 rounded-full bg-[var(--success)] animate-ping opacity-50" />
                      </span>
                      <span className="truncate">{uname}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── BOTTOM USER BAR ─────────────────────────────── */}
          <div className="shrink-0 border-t border-[var(--border)] px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] relative" ref={settingsRef}>

            {/* ── SETTINGS POPUP ── */}
            {showSettings && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] animate-slide-up overflow-hidden z-50">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.08em]">Settings</p>
                </div>

                {/* View Profile */}
                <Link
                  href="/profile"
                  onClick={() => setShowSettings(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-[var(--border)]">
                    <UserAvatar avatarUrl={userProfile?.avatarUrl} displayName={userProfile?.displayName || "Guest"} size={32} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{userProfile?.displayName || "Guest"}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">View profile →</p>
                  </div>
                </Link>

                <div className="h-px bg-[var(--border)] mx-3" />

                {/* Theme toggle row */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{isDark ? "🌙" : "☀️"}</span>
                    <span className="text-[13px] text-[var(--text-primary)]">{isDark ? "Dark mode" : "Light mode"}</span>
                  </div>
                  <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    className={`relative flex items-center w-[44px] h-[24px] rounded-full border transition-all duration-300 shrink-0 ${
                      isDark
                        ? "bg-[var(--accent)]/15 border-[var(--accent)]/30"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <span
                      className={`absolute w-[18px] h-[18px] rounded-full shadow-sm transition-all duration-300 ${
                        isDark
                          ? "translate-x-[22px] bg-[var(--accent)]"
                          : "translate-x-[2px] bg-amber-400"
                      }`}
                    />
                  </button>
                </div>

                <div className="h-px bg-[var(--border)] mx-3" />

                {/* Sign out */}
                <button
                  onClick={() => { setShowSettings(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/8 transition-colors group"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-[13px] font-medium">Sign out</span>
                </button>
              </div>
            )}

            {/* User row */}
            <div className="flex items-center gap-2 mb-1">
              {/* Avatar + name — takes up remaining space */}
              <Link
                href="/profile"
                className="flex items-center gap-2.5 flex-1 min-w-0 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors group"
              >
                <div className="shrink-0">
                  <UserAvatar avatarUrl={userProfile?.avatarUrl} displayName={userProfile?.displayName || "Guest"} size={30} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-medium text-[var(--text-primary)] truncate leading-tight">
                    {userProfile?.displayName || "Guest"}
                  </span>
                  {userProfile?.customStatus ? (
                    <span className="text-[11px] text-[var(--text-tertiary)] truncate leading-tight">{userProfile.customStatus}</span>
                  ) : (
                    <span className="text-[11px] text-[var(--text-tertiary)] leading-tight">View profile</span>
                  )}
                </div>
              </Link>

              {/* Settings button */}
              <button
                onClick={() => setShowSettings(prev => !prev)}
                title="Settings"
                className={`p-2 rounded-lg transition-colors shrink-0 ${
                  showSettings
                    ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>


            </div>

          </div>

        </div>
      </div>
    </>
  );
}
