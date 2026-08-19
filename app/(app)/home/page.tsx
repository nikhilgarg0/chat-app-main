"use client";

import { authFetch } from "@/lib/authFetch";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Copy, Check, Trash2, Plus, Sparkles, Building2, User } from "lucide-react";
import { useSidebar } from "@/components/SidebarContext";
import PageLoader from "@/components/ui/PageLoader";
import GuidedUserFlow from "@/components/ui/GuidedUserFlow";

function InviteCodeReveal({ code }: { code: string }) {
  const [status, setStatus] = useState<"hidden" | "revealed" | "copied">("hidden");
  
  if (status === "hidden") {
    return (
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStatus("revealed"); }}
        className="flex-shrink-0 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full px-2.5 py-1 text-[10px] font-mono text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-all cursor-pointer shadow-sm"
      >
        Reveal Code
      </button>
    );
  }

  return (
    <button 
      onClick={(e) => { 
        e.preventDefault();
        e.stopPropagation(); 
        navigator.clipboard.writeText(code);
        setStatus("copied");
        setTimeout(() => setStatus("revealed"), 2000);
      }}
      className="flex-shrink-0 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 rounded-full px-2.5 py-1 text-[10px] font-mono flex items-center gap-1.5 transition-all cursor-pointer hover:bg-[var(--accent)]/20 shadow-sm"
      title="Copy to clipboard"
    >
      {code}
      {status === "copied" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function DeleteConfirmDialog({ workspaceName, onConfirm, onCancel }: { workspaceName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onCancel}>
      <div 
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-apple p-6 max-w-sm w-full mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-[var(--text-primary)]">Delete Workspace</h3>
            <p className="text-sm text-[var(--text-secondary)]">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          All channels, messages, and data in <span className="font-semibold text-[var(--text-primary)]">{workspaceName}</span> will be permanently deleted.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel} className="text-sm h-9 px-4">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} className="text-sm h-9 px-4">
            Delete Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toggleSidebar } = useSidebar();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [workspaceName, setWorkspaceName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // UI state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "create-workspace") {
      setShowCreateForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const [profRes, wsRes] = await Promise.all([
          authFetch(`/api/users/profile?firebaseUid=${user.uid}`),
          authFetch(`/api/workspaces?firebaseUid=${user.uid}`)
        ]);

        if (profRes.ok) {
          const profData = await profRes.json();
          setUserProfile(profData.user);
        }

        if (wsRes.ok) {
          const wsData = await wsRes.json();
          if (wsData.success) {
            setWorkspaces(wsData.workspaces);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const handleCreateWorkspace = async () => {
    setCreateError("");
    if (!workspaceName.trim()) return;
    setIsCreating(true);

    try {
      const body: any = {
        name: workspaceName.trim(),
        firebaseUid: auth.currentUser?.uid,
      };
      if (customCode.trim()) {
        body.customInviteCode = customCode.trim();
      }

      const res = await authFetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create workspace");
      }

      router.push(`/workspace/${data.workspace._id}`);
    } catch (err: any) {
      setCreateError(getErrorMessage(err));
      setIsCreating(false);
    }
  };

  const handleJoinWorkspace = async () => {
    setJoinError("");
    setJoinSuccess("");
    if (!inviteCode.trim()) return;
    setIsJoining(true);

    try {
      const res = await authFetch("/api/workspaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
          firebaseUid: auth.currentUser?.uid,
        }),
      });
      const data = await res.json();

      if (data.alreadyMember) {
        router.push(`/workspace/${data.workspace._id}`);
        return;
      }

      if (data.requestSent) {
        setJoinSuccess(`Request sent to join "${data.workspaceName}". The owner will review it.`);
        setInviteCode("");
        setIsJoining(false);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to join workspace");
      }

      router.push(`/workspace/${data.workspace._id}`);
    } catch (err: any) {
      setJoinError(getErrorMessage(err));
      setIsJoining(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await authFetch(`/api/workspaces/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete workspace");
      }

      setWorkspaces((prev) => prev.filter((ws) => ws._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err: any) {
      console.error(err);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <PageLoader />;

  const currentUid = auth.currentUser?.uid;

  return (
    <main className="flex flex-1 flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Main Content */}
      <div className="flex flex-col items-center w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-slide-up overflow-y-auto flex-1">
        {/* Guided User Flow Banner */}
        <GuidedUserFlow
          userProfile={userProfile}
          workspacesCount={workspaces.length}
          hasChannels={workspaces.some((w) => w.channels?.length > 0)}
        />

        {/* Hero Title & Actions */}
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
              Your Workspaces
            </h1>
            <p className="text-sm text-[var(--text-secondary)] opacity-60 mt-1">
              Select a workspace or create a new team hub to start chatting.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowJoinForm(true); setShowCreateForm(false); }}
              className="flex-1 sm:flex-initial gap-1.5 rounded-lg"
            >
              <Building2 className="h-4 w-4" />
              <span>Join with Code</span>
            </Button>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-16 px-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-center animate-slide-up">
            <div className="w-12 h-12 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center mb-4 text-[var(--accent)]">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)] mb-1.5 tracking-tight">You don't have any workspaces yet</h2>
            <p className="text-sm text-[var(--text-secondary)] opacity-60 mb-6 max-w-sm">Join an existing workspace with an invite code to start collaborating.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => { setShowJoinForm(true); setShowCreateForm(false); }} variant="primary" className="px-6 rounded-lg">
                Join Workspace with Code
              </Button>
            </div>
          </div>
        ) : null}

        {workspaces.length > 0 && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {workspaces.map((ws: any) => {
              const isOwner = ws.ownerId === currentUid;
              return (
                <div
                  key={ws._id}
                  className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-apple transition-all duration-200 apple-press cursor-pointer min-h-[150px]"
                  onClick={() => router.push(`/workspace/${ws._id}`)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                        {ws.name}
                      </h3>
                      {isOwner && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shrink-0">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 font-mono">
                      Invite Code: <span className="font-bold text-[var(--text-secondary)]">{ws.inviteCode}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
                    <span className="text-xs text-[var(--text-secondary)] font-medium">
                      {ws.members?.length || 1} member{(ws.members?.length || 1) !== 1 ? 's' : ''}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(ws);
                          }}
                          className="text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      <Button
                        variant="primary"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/workspace/${ws._id}`);
                        }}
                        className="rounded-lg text-xs font-semibold px-3"
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Join Workspace Section */}
        <div className="w-full flex flex-col items-center mt-4">
          {!showJoinForm ? (
            <button
              onClick={() => { setShowJoinForm(true); setShowCreateForm(false); setJoinSuccess(""); setJoinError(""); }}
              className="text-sm font-medium text-[var(--accent)] hover:underline cursor-pointer"
            >
              Join with code →
            </button>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-md flex flex-col gap-3 animate-slide-up">
                <div className="flex justify-between gap-2 bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border)]">
                  <input
                    placeholder="Enter invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    autoFocus
                    onKeyDown={e => e.key === "Enter" && handleJoinWorkspace()}
                    className="flex-1 bg-transparent border-0 text-sm px-3 uppercase font-mono tracking-wider outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                  />
                  <Button
                    onClick={handleJoinWorkspace}
                    disabled={!inviteCode.trim() || isJoining}
                    variant="primary"
                    size="sm"
                    className="rounded-lg"
                  >
                    {isJoining ? "Requesting..." : "Join Workspace"}
                  </Button>
                </div>
                {joinError && <div className="text-sm text-red-500 font-medium text-center">{joinError}</div>}
                {joinSuccess && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-500">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{joinSuccess}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>


      </div>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          workspaceName={deleteTarget.name}
          onConfirm={handleDeleteWorkspace}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}
