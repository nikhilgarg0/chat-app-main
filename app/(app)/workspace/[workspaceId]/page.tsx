"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSidebar } from "@/components/SidebarContext";
import { authFetch } from "@/lib/authFetch";
import { auth } from "@/lib/firebase";
import UserAvatar from "@/components/ui/UserAvatar";
import { Check, X, Users, Copy, Hash, Bell } from "lucide-react";
import { WorkspaceOverviewSkeleton } from "@/components/ui/Skeletons";

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<any>(null);
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [isOwner, setIsOwner] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // ✅ FIX 1: Track the Firebase user in state so we know when auth is ready
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ✅ FIX 2: Wait for Firebase Auth to initialize before doing anything
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // ✅ FIX 3: Only fetch workspace once currentUser is available,
  //           and use currentUser.uid instead of auth.currentUser?.uid
  useEffect(() => {
    const fetchWS = async () => {
      if (!currentUser) return; // wait until Firebase Auth is ready
      try {
        const res = await authFetch(`/api/workspaces/${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          setWorkspace(data.workspace);

          // Check if current user is owner
          const ownerCheck = data.workspace.members?.some(
            (m: any) => m.firebaseUid === currentUser.uid && m.role === "owner"
          );
          setIsOwner(ownerCheck);
        }
      } catch (err) { }
    };
    if (workspaceId) fetchWS();
  }, [workspaceId, currentUser]); // ✅ currentUser added as dependency

  // Fetch pending join requests if owner (unchanged)
  useEffect(() => {
    if (!isOwner || !workspaceId) return;

    const fetchRequests = async () => {
      setLoadingRequests(true);
      try {
        const res = await authFetch(`/api/workspaces/${workspaceId}/requests`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setJoinRequests(data.requests);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchRequests();
  }, [isOwner, workspaceId]);

  const handleRequestAction = async (requestId: string, action: "approve" | "reject") => {
    setRespondingTo(requestId);
    try {
      const res = await authFetch(`/api/workspaces/${workspaceId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setJoinRequests((prev) => prev.filter((r) => r._id !== requestId));
        // If approved, update member count
        if (action === "approve" && workspace) {
          setWorkspace((prev: any) => ({
            ...prev,
            members: [...(prev.members || []), { role: "member" }],
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRespondingTo(null);
    }
  };

  const copyInviteCode = () => {
    if (workspace?.inviteCode) {
      navigator.clipboard.writeText(workspace.inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-1 flex-col relative h-full bg-[var(--bg-base)] w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[20px] backdrop-saturate-[180%] z-20 shrink-0 sticky top-0">
        <div className="flex items-center gap-2">
          {!isSidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="p-1 -ml-1 mr-1 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Open Sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
          )}
          <span className="text-[var(--text-primary)] font-display font-semibold text-base lg:text-lg tracking-tight">Overview</span>
          {joinRequests.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold animate-pulse">
              {joinRequests.length}
            </span>
          )}
        </div>
      </div>

      {/* Show skeleton while workspace data is still loading */}
      {!workspace ? (
        <WorkspaceOverviewSkeleton />
      ) : (
        <div className="flex flex-1 flex-col items-center p-4 sm:p-8 z-10 animate-slide-up relative overflow-y-auto w-full">


          {/* Workspace Hero */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 rounded-[20px] bg-[var(--bg-elevated)] border border-[var(--border-strong)] shadow-apple flex items-center justify-center mb-6 mx-auto">
              <svg className="w-10 h-10 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-[var(--text-primary)] mb-4">
              {workspace?.name || "Workspace"}
            </h1>

            {workspace && (
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <button
                  onClick={copyInviteCode}
                  className="px-3 py-1.5 bg-[var(--bg-surface)] rounded-full text-[var(--text-secondary)] font-mono border border-[var(--border)] shadow-sm text-xs hover:border-[var(--accent)] transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Click to copy"
                >
                  Invite: <span className="text-[var(--text-primary)] font-semibold tracking-widest">{workspace.inviteCode}</span>
                  {codeCopied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                </button>
                <div className="w-1 h-1 rounded-full bg-[var(--text-tertiary)] hidden sm:block"></div>
                <span className="text-[13px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {workspace.members?.length || 1} Member{workspace.members?.length !== 1 ? 's' : ''}
                </span>
                <div className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]"></div>
                <span className="text-[13px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  {workspace.channels?.length || 0} Channel{workspace.channels?.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            <p className="text-[var(--text-secondary)] max-w-sm text-[15px] leading-relaxed mb-6 mx-auto">
              Select a channel below to jump into the conversation.
            </p>
          </div>

          {/* Direct Channels List Section */}
          <div className="w-full max-w-3xl mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight">
                  Workspace Channels
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-mono border border-[var(--border)]">
                  {workspace?.channels?.length || 0}
                </span>
              </div>

              <button
                onClick={() => router.push(`/workspace/${workspaceId}/browse`)}
                className="text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer"
              >
                Browse all →
              </button>
            </div>

            {workspace?.channels && workspace.channels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {workspace.channels.map((ch: any) => (
                  <div
                    key={ch._id}
                    onClick={() => router.push(`/workspace/${workspaceId}/channel/${ch._id}`)}
                    className="group flex items-center justify-between p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-apple transition-all duration-200 apple-press cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--accent)] shrink-0 font-mono font-bold">
                        #
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                          {ch.name}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] opacity-60 truncate mt-0.5">
                          {ch.topic || "Topic channel for discussion"}
                        </p>
                      </div>
                    </div>

                    <button className="text-xs font-semibold text-[var(--accent)] px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 transition-colors shrink-0 ml-2">
                      Open
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-[var(--border)] text-center text-xs text-[var(--text-tertiary)]">
                No channels created yet. Create one from the sidebar!
              </div>
            )}
          </div>


          {/* Join Requests Section (Owner Only) */}
          {isOwner && joinRequests.length > 0 && (
            <div className="w-full max-w-lg mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="font-display font-semibold text-base text-[var(--text-primary)]">
                  Pending Join Requests
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[11px] font-bold">
                  {joinRequests.length}
                </span>
              </div>

              <div className="space-y-2">
                {joinRequests.map((req) => (
                  <div
                    key={req._id}
                    className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm transition-all hover:shadow-apple-sm animate-slide-up"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar avatarUrl={req.avatarUrl} displayName={req.displayName} size={40} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[var(--text-primary)] truncate">{req.displayName}</p>
                        {req.email && (
                          <p className="text-xs text-[var(--text-tertiary)] truncate">{req.email}</p>
                        )}
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                          {new Date(req.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <button
                        onClick={() => handleRequestAction(req._id, "approve")}
                        disabled={respondingTo === req._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 border border-[var(--success)]/20 text-xs font-medium transition-all active:scale-[0.96] disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRequestAction(req._id, "reject")}
                        disabled={respondingTo === req._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 text-xs font-medium transition-all active:scale-[0.96] disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isOwner && !loadingRequests && joinRequests.length === 0 && (
            <div className="w-full max-w-lg mt-4 text-center">
              <p className="text-xs text-[var(--text-tertiary)]">No pending join requests.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
