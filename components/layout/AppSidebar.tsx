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
import BrandLogo from "@/components/ui/BrandLogo";
import {
  Sun, Moon, Check, X, Bell, Volume2, VolumeX, Shield,
  Monitor, LayoutGrid, Keyboard, Settings as SettingsIcon,
  User, HelpCircle, ExternalLink, Sparkles
} from "lucide-react";

export default function AppSidebar() {

  const { workspaceId, channelId } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { isSidebarOpen, setIsSidebarOpen, toggleSidebar } = useSidebar();

  const [workspace, setWorkspace] = useState<any>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map());
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [desktopAlerts, setDesktopAlerts] = useState(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
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
    const uid = auth.currentUser?.uid || "";

    // 1. Fetch initial list of online users in this workspace
    authFetch(`/api/pusher/presence?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.onlineUsers)) {
          setOnlineUsers((prev) => {
            const next = new Map(prev);
            data.onlineUsers.forEach((u: any) => {
              if (u.username) next.set(u.username, u.firebaseUid);
            });
            // Ensure self is included
            next.set(uname, uid);
            return next;
          });
        }
      })
      .catch(() => { });

    // 2. Send heartbeat function
    const sendHeartbeat = (status = "online") => {
      authFetch("/api/pusher/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, username: uname, status, firebaseUid: uid })
      }).catch(() => { });
    };

    // Initial heartbeat
    sendHeartbeat("online");

    // Periodic heartbeat every 12 seconds
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat("online");
    }, 12000);

    // 3. Subscribe to Pusher workspace events
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

    const handleBeforeUnload = () => {
      sendHeartbeat("offline");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      sendHeartbeat("offline");
      pusherClient.unsubscribe(presenceChannel);
    };
  }, [workspaceId, userProfile?.displayName]);



  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) { }
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
            <BrandLogo size="md" href="/home" />


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
                      className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all min-h-[36px] md:min-h-[30px] ${isActive
                        ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                        }`}
                    >
                      <div className={`w-[22px] h-[22px] rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${isActive
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
                </div>

                <div className="px-2 space-y-0.5">
                  {workspace.channels?.map((ch: any) => {
                    const isActive = ch._id === channelId;
                    return (
                      <Link
                        key={ch._id}
                        href={`/workspace/${workspace._id}/channel/${ch._id}`}
                        onClick={() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                        className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition-all min-h-[36px] md:min-h-[28px] ${isActive
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
                    className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-all mt-0.5 ${pathname === `/workspace/${workspace._id}/browse`
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
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl animate-slide-up overflow-hidden z-50 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-elevated)]/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <p className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-[0.08em]">Settings & Preferences</p>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-y-auto [&::-webkit-scrollbar]:hidden flex-1 p-2 space-y-3">
                  {/* Account / Profile card */}
                  <Link
                    href="/profile"
                    onClick={() => setShowSettings(false)}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-elevated)]/60 hover:bg-[var(--bg-elevated)] border border-[var(--border)] transition-all group"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-[var(--accent)]/20">
                      <UserAvatar avatarUrl={userProfile?.avatarUrl} displayName={userProfile?.displayName || "Guest"} size={36} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{userProfile?.displayName || "Guest"}</p>
                      <p className="text-[11px] text-[var(--text-tertiary)] truncate">{userProfile?.email || "Account & Profile"}</p>
                    </div>
                    <span className="text-[11px] text-[var(--accent)] font-medium group-hover:translate-x-0.5 transition-transform">Edit →</span>
                  </Link>

                  {/* Theme Selector */}
                  <div className="px-2">
                    <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
                      Appearance
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border)]">
                      <button
                        onClick={() => setTheme("light")}
                        className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${theme === "light"
                          ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                          }`}
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Light</span>
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${theme === "dark"
                          ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                          }`}
                      >
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Dark</span>
                      </button>
                      <button
                        onClick={() => setTheme("system")}
                        className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${theme === "system"
                          ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]"
                          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                          }`}
                      >
                        <Monitor className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>System</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Toggles */}
                  <div className="px-2 space-y-1">
                    <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
                      Notifications & Audio
                    </label>

                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors">
                      <div className="flex items-center gap-2.5">
                        {soundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
                        <span className="text-[13px] text-[var(--text-primary)]">Notification Sounds</span>
                      </div>
                      <button
                        onClick={() => setSoundMuted(!soundMuted)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${soundMuted ? "bg-[var(--border-strong)]" : "bg-[var(--accent)]"}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${soundMuted ? "translate-x-0" : "translate-x-4"}`} />
                      </button>
                    </div>

                    {/* Desktop Alerts Toggle */}
                    <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-[var(--accent)]" />
                        <span className="text-[13px] text-[var(--text-primary)]">Desktop Popups</span>
                      </div>
                      <button
                        onClick={() => setDesktopAlerts(!desktopAlerts)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${!desktopAlerts ? "bg-[var(--border-strong)]" : "bg-[var(--accent)]"}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${!desktopAlerts ? "translate-x-0" : "translate-x-4"}`} />
                      </button>
                    </div>
                  </div>

                  {/* Navigation & Utilities */}
                  <div className="px-2 space-y-0.5 pt-1 border-t border-[var(--border)]">
                    <Link
                      href="/home"
                      onClick={() => setShowSettings(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <LayoutGrid className="w-4 h-4 text-[var(--accent)]" />
                      <span>All Workspaces</span>
                    </Link>

                    <button
                      onClick={() => { setShowShortcutsModal(true); setShowSettings(false); }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors text-left"
                    >
                      <Keyboard className="w-4 h-4 text-purple-500" />
                      <span>Keyboard Shortcuts</span>
                    </button>

                    <Link
                      href="/admin"
                      onClick={() => setShowSettings(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <Shield className="w-4 h-4 text-amber-500" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </div>
                </div>

                {/* Footer Sign Out */}
                <div className="p-2 border-t border-[var(--border)] bg-[var(--bg-elevated)]/30 shrink-0">
                  <button
                    onClick={() => { setShowSettings(false); handleLogout(); }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors font-medium text-[13px]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
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
                className={`p-2 rounded-lg transition-colors shrink-0 ${showSettings
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

      {/* ── KEYBOARD SHORTCUTS MODAL ── */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-scale-in">
            <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]/50">
                <span className="text-[var(--text-secondary)]">Toggle Sidebar</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)]">Ctrl + B</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]/50">
                <span className="text-[var(--text-secondary)]">Send Message</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)]">Enter</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]/50">
                <span className="text-[var(--text-secondary)]">New Line in Chat</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)]">Shift + Enter</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[var(--text-secondary)]">Close Menus / Modals</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)]">Esc</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="mt-6 w-full py-2 bg-[var(--accent)] text-white rounded-xl font-medium text-xs hover:opacity-90 transition-opacity"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
