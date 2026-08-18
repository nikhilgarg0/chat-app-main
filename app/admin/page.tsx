"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/ui/UserAvatar";
import {
  Users, MessageSquare, Hash, Layers, Shield, Trash2,
  RefreshCw, AlertTriangle, Database, ChevronRight, Bell,
  Eye, EyeOff, LogOut, Lock, Mail, Search, X, ChevronLeft,
  ArrowLeft
} from "lucide-react";
import PageLoader from "@/components/ui/PageLoader";

type Stats = {
  userCount: number;
  workspaceCount: number;
  channelCount: number;
  messageCount: number;
  joinRequestCount: number;
};

type ListType = "users" | "workspaces" | "channels" | "messages" | "joinRequests";

// Admin-specific fetch helper
function adminFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("nexus_admin_token");
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ─── LIST PANEL COMPONENT ───
function ListPanel({
  type,
  onClose,
  onItemDeleted,
}: {
  type: ListType;
  onClose: () => void;
  onItemDeleted: () => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout>(undefined);

  const typeLabels: Record<ListType, string> = {
    users: "Users",
    workspaces: "Workspaces",
    channels: "Channels",
    messages: "Messages",
    joinRequests: "Join Requests",
  };

  const fetchItems = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/list?type=${type}&q=${encodeURIComponent(q)}&page=${p}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setItems(data.items);
          setTotal(data.total);
          setTotalPages(data.totalPages);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchItems("", 1);
  }, [fetchItems]);

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchItems(value, 1);
    }, 300);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchItems(search, newPage);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await adminFetch("/api/admin/list", {
        method: "DELETE",
        body: JSON.stringify({ type, id }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((item) => item._id !== id));
        setTotal((prev) => prev - 1);
        setDeleteConfirmId(null);
        onItemDeleted();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const renderItem = (item: any) => {
    const isConfirming = deleteConfirmId === item._id;
    const isDeleting = deletingId === item._id;

    return (
      <div
        key={item._id}
        className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors ${
          isConfirming ? "bg-red-500/5" : ""
        }`}
      >
        <div className="flex-1 min-w-0">
          {type === "users" && (
            <div className="flex items-center gap-3">
              <UserAvatar avatarUrl={item.avatarUrl} displayName={item.displayName} size={36} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.displayName}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] truncate">{item.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                {item.onboardingComplete ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)] font-medium">Active</span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">Onboarding</span>
                )}
              </div>
            </div>
          )}

          {type === "workspaces" && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-xs shrink-0">
                {item.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                  <span className="font-mono">{item.inviteCode}</span>
                  <span>•</span>
                  <span>{item.members?.length || 0} members</span>
                  <span>•</span>
                  <span>{item.channels?.length || 0} channels</span>
                </div>
              </div>
            </div>
          )}

          {type === "channels" && (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-tertiary)] font-mono text-sm">#</span>
                <p className="text-sm font-medium truncate">{item.name}</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] mt-0.5">
                <span>{item.members?.length || 0} members</span>
                <span>•</span>
                <span className="font-mono truncate max-w-[120px]">ws:{item.workspaceId?.slice(-6)}</span>
              </div>
            </div>
          )}

          {type === "messages" && (
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-[var(--text-primary)]">{item.author}</span>
                {item.type !== "text" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--ai-bg)] text-[var(--ai-accent)] font-medium">{item.type}</span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] truncate max-w-[400px]">{item.content}</p>
            </div>
          )}

          {type === "joinRequests" && (
            <div className="flex items-center gap-3">
              <UserAvatar avatarUrl={item.avatarUrl} displayName={item.displayName} size={32} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.displayName}</p>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                  <span className="truncate">{item.email}</span>
                  <span>→</span>
                  <span className="truncate font-medium">{item.workspaceName}</span>
                </div>
              </div>
              <div className="ml-auto shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  item.status === "pending"
                    ? "bg-yellow-500/10 text-yellow-500"
                    : item.status === "approved"
                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                    : "bg-red-500/10 text-red-500"
                }`}>{item.status}</span>
              </div>
            </div>
          )}
        </div>

        {/* Date */}
        <span className="text-[10px] text-[var(--text-tertiary)] shrink-0 hidden sm:block">
          {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })}
        </span>

        {/* Delete Button */}
        <div className="shrink-0">
          {isConfirming ? (
            <div className="flex items-center gap-1 animate-slide-up">
              <button
                onClick={() => handleDelete(item._id)}
                disabled={isDeleting}
                className="text-[11px] px-2 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-all font-medium disabled:opacity-50"
              >
                {isDeleting ? "..." : "Yes"}
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="text-[11px] px-2 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-all font-medium"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirmId(item._id)}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-all"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto py-8">
      <div
        className="w-full max-w-3xl bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl animate-slide-up mx-4 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-surface)] rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="font-display font-semibold text-base">{typeLabels[type]}</h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">{total.toLocaleString()} total records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={`Search ${typeLabels[type].toLowerCase()}...`}
              autoFocus
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); fetchItems("", 1); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
              <Search className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No results found</p>
            </div>
          ) : (
            items.map(renderItem)
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="text-xs text-[var(--text-tertiary)] font-mono">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN ADMIN PAGE ───
export default function AdminPage() {
  const router = useRouter();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard state
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentWorkspaces, setRecentWorkspaces] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [nukeTarget, setNukeTarget] = useState<string | null>(null);
  const [nukeConfirmText, setNukeConfirmText] = useState("");
  const [nuking, setNuking] = useState(false);
  const [nukeResult, setNukeResult] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState("");

  // List panel state
  const [activeListType, setActiveListType] = useState<ListType | null>(null);

  // Check if already authenticated
  useEffect(() => {
    const token = localStorage.getItem("nexus_admin_token");
    if (token) {
      adminFetch("/api/admin")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Invalid token");
        })
        .then((data) => {
          if (data.success) {
            setStats(data.stats);
            setRecentUsers(data.recentUsers);
            setRecentWorkspaces(data.recentWorkspaces);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem("nexus_admin_token");
          }
        })
        .catch(() => {
          localStorage.removeItem("nexus_admin_token");
        })
        .finally(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    if (!loginEmail.trim() || !loginPassword) return;
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.error || "Login failed");

      localStorage.setItem("nexus_admin_token", data.token);
      setIsAuthenticated(true);
      await fetchDashboard();
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("nexus_admin_token");
    setIsAuthenticated(false);
    setStats(null);
    setRecentUsers([]);
    setRecentWorkspaces([]);
    setLoginEmail("");
    setLoginPassword("");
  };

  const fetchDashboard = async () => {
    setRefreshing(true);
    try {
      const res = await adminFetch("/api/admin");
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          setRecentUsers(data.recentUsers);
          setRecentWorkspaces(data.recentWorkspaces);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load admin data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleNuke = async () => {
    if (!nukeTarget) return;
    const confirmWord = nukeTarget === "all" ? "RESET ALL" : `DELETE ${nukeTarget.toUpperCase()}`;
    if (nukeConfirmText !== confirmWord) return;

    setNuking(true);
    setNukeResult(null);
    try {
      const res = await adminFetch("/api/admin", {
        method: "DELETE",
        body: JSON.stringify({ target: nukeTarget }),
      });
      const data = await res.json();
      if (data.success) {
        setNukeResult(data.deleted);
        await fetchDashboard();
      } else {
        setError(data.error || "Delete failed");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setNuking(false);
      setNukeConfirmText("");
    }
  };

  // Loading
  if (checkingAuth) return <PageLoader />;

  // ─── LOGIN ───
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--bg-base)] px-4">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center mb-4 shadow-lg">
              <Shield className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-[var(--text-primary)]">Admin Portal</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Nexus Management Console</p>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-apple">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 ml-1">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="admin@example.com" autoFocus
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    type={showPassword ? "text" : "password"} value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()} placeholder="••••••••"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl pl-10 pr-10 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {loginError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 animate-slide-up">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {loginError}
                </div>
              )}
              <button onClick={handleLogin} disabled={!loginEmail.trim() || !loginPassword || isLoggingIn}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
              >
                {isLoggingIn ? (
                  <span className="flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Authenticating...</span>
                ) : "Sign in to Admin"}
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-[var(--text-tertiary)] mt-4">Authorized personnel only. Access is logged.</p>
        </div>
      </main>
    );
  }

  // ─── DASHBOARD ───
  const statCards: { key: ListType; label: string; value: number; icon: any; color: string; bg: string }[] = [
    { key: "users", label: "Users", value: stats?.userCount ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { key: "workspaces", label: "Workspaces", value: stats?.workspaceCount ?? 0, icon: Layers, color: "text-purple-500", bg: "bg-purple-500/10" },
    { key: "channels", label: "Channels", value: stats?.channelCount ?? 0, icon: Hash, color: "text-green-500", bg: "bg-green-500/10" },
    { key: "messages", label: "Messages", value: stats?.messageCount ?? 0, icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-500/10" },
    { key: "joinRequests", label: "Pending Requests", value: stats?.joinRequestCount ?? 0, icon: Bell, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];

  const nukeOptions = [
    { key: "messages", label: "Messages", desc: "Delete all messages across all channels", icon: MessageSquare },
    { key: "joinRequests", label: "Join Requests", desc: "Clear all pending/resolved join requests", icon: Bell },
    { key: "channels", label: "Channels", desc: "Delete all channels", icon: Hash },
    { key: "workspaces", label: "Workspaces", desc: "Delete all workspaces (channels & messages become orphaned)", icon: Layers },
    { key: "users", label: "Users", desc: "Delete all user profiles from MongoDB and Firebase Auth", icon: Users },
    { key: "all", label: "EVERYTHING", desc: "Wipe the entire database — users, workspaces, channels, messages, requests", icon: Database },
  ];

  return (
    <main className="min-h-[100dvh] bg-[var(--bg-base)] text-[var(--text-primary)] font-body">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[20px] backdrop-saturate-[180%] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-lg tracking-tight">Admin Portal</h1>
              <p className="text-[11px] text-[var(--text-tertiary)] font-mono">nexus.nikhilcodes.in/admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchDashboard} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all hover:shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-slide-up">

        {/* Stats Grid — CLICKABLE */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map(({ key, label, value, icon: Icon, color, bg }) => (
            <button
              key={key}
              onClick={() => setActiveListType(key)}
              className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm hover:shadow-apple-sm hover:border-[var(--border-strong)] transition-all text-left group cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-2xl font-display font-bold tracking-tight">{value.toLocaleString()}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{label}</p>
            </button>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-display font-semibold text-sm">Recent Users</h2>
              <button onClick={() => setActiveListType("users")} className="text-[11px] text-[var(--accent)] hover:underline font-medium">View all</button>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {recentUsers.length === 0 && <div className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]">No users yet</div>}
              {recentUsers.map((user: any) => (
                <div key={user._id} className="px-5 py-3 flex items-center gap-3 hover:bg-[var(--bg-elevated)] transition-colors">
                  <UserAvatar avatarUrl={user.avatarUrl} displayName={user.displayName} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.displayName}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {user.onboardingComplete ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)] font-medium">Active</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">Onboarding</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Workspaces */}
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-display font-semibold text-sm">Recent Workspaces</h2>
              <button onClick={() => setActiveListType("workspaces")} className="text-[11px] text-[var(--accent)] hover:underline font-medium">View all</button>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {recentWorkspaces.length === 0 && <div className="px-5 py-8 text-center text-sm text-[var(--text-tertiary)]">No workspaces yet</div>}
              {recentWorkspaces.map((ws: any) => (
                <div key={ws._id} className="px-5 py-3 flex items-center gap-3 hover:bg-[var(--bg-elevated)] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-xs">{ws.name[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ws.name}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)] font-mono">{ws.inviteCode}</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium shrink-0">{ws.members?.length || 0} members</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl bg-[var(--bg-surface)] border border-red-500/20 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-500/10 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="font-display font-semibold text-sm text-red-500">Danger Zone — Bulk Database Operations</h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-[var(--text-secondary)] mb-5">These operations are <strong className="text-red-500">irreversible</strong>. Select what to delete and type the confirmation phrase.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
              {nukeOptions.map(({ key, label, desc, icon: Icon }) => (
                <button key={key} onClick={() => { setNukeTarget(key); setNukeConfirmText(""); setNukeResult(null); }}
                  className={`p-3 rounded-xl border text-left transition-all group ${nukeTarget === key ? "border-red-500 bg-red-500/5 shadow-sm" : "border-[var(--border)] hover:border-red-500/30 hover:bg-red-500/5"}`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 ${nukeTarget === key ? "text-red-500" : "text-[var(--text-tertiary)] group-hover:text-red-400"}`} />
                  <p className={`text-xs font-semibold ${nukeTarget === key ? "text-red-500" : "text-[var(--text-primary)]"}`}>{label}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 leading-tight">{desc}</p>
                </button>
              ))}
            </div>
            {nukeTarget && (
              <div className="animate-slide-up space-y-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  Type <code className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-mono text-[11px] font-bold">{nukeTarget === "all" ? "RESET ALL" : `DELETE ${nukeTarget.toUpperCase()}`}</code> to confirm:
                </p>
                <div className="flex gap-2">
                  <input value={nukeConfirmText} onChange={(e) => setNukeConfirmText(e.target.value)} placeholder="Type confirmation..."
                    className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono focus:border-red-500 outline-none focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)] transition-all placeholder:text-[var(--text-tertiary)]"
                  />
                  <button onClick={handleNuke} disabled={nuking || nukeConfirmText !== (nukeTarget === "all" ? "RESET ALL" : `DELETE ${nukeTarget.toUpperCase()}`)}
                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                  >
                    {nuking ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Deleting...</> : <><Trash2 className="w-3.5 h-3.5" />Execute</>}
                  </button>
                </div>
              </div>
            )}
            {nukeResult && (
              <div className="mt-4 p-3 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 animate-slide-up">
                <p className="text-sm font-medium text-[var(--success)] mb-1">✓ Delete completed</p>
                <div className="flex flex-wrap gap-2">{Object.entries(nukeResult).map(([k, v]) => (
                  <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-mono">{k}: {v}</span>
                ))}</div>
              </div>
            )}
            {error && <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500">{error}</div>}
          </div>
        </div>

        <div className="text-center py-4"><p className="text-[11px] text-[var(--text-tertiary)]">Nexus Admin Portal • Only authorized users can access this page</p></div>
      </div>

      {/* List Panel Modal */}
      {activeListType && (
        <ListPanel
          type={activeListType}
          onClose={() => setActiveListType(null)}
          onItemDeleted={fetchDashboard}
        />
      )}
    </main>
  );
}
