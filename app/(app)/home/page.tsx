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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Your Workspaces
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Select a workspace or create a new team hub to start chatting.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="gradient"
              size="sm"
              onClick={() => { setShowCreateForm(true); setShowJoinForm(false); }}
              className="flex-1 sm:flex-initial gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Create Workspace</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowJoinForm(true); setShowCreateForm(false); }}
              className="flex-1 sm:flex-initial gap-1.5"
            >
              <Building2 className="h-4 w-4" />
              <span>Join with Code</span>
            </Button>
          </div>
        </div>


        {workspaces.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-16 px-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-sm mb-8 text-center animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">You don't have any workspaces yet</h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-sm">Create a new workspace or join an existing one to start collaborating.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => { setShowCreateForm(true); setShowJoinForm(false); }} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6">
                Create Workspace
              </Button>
            </div>
          </div>
        ) : null}

        {(workspaces.length > 0 || showCreateForm) && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {workspaces.map((ws: any) => {
              const isOwner = ws.ownerId === currentUid;
              return (
                <div
                  key={ws._id}
                  className="group flex flex-col justify-between p-5 rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border)] shadow-apple-sm hover:shadow-apple transition-all cursor-pointer relative"
                  onClick={() => router.push(`/workspace/${ws._id}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-display font-semibold text-lg truncate pr-3">{ws.name}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <InviteCodeReveal code={ws.inviteCode} />
                      {isOwner && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(ws); }}
                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        <span className="text-xs font-medium">{ws.members?.length || 1} Members</span>
                      </div>
                      {isOwner && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                          Owner
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={(e) => { e.stopPropagation(); router.push(`/workspace/${ws._id}`); }}
                      className="h-9 px-4 rounded-[980px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-0 transition-all text-sm font-medium focus:ring-0 active:scale-[0.98]"
                    >
                      Open
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* New Workspace Card */}
            <div
              onClick={() => { setShowCreateForm(true); setShowJoinForm(false); }}
              className={`group flex flex-col justify-center items-center p-5 rounded-[16px] border border-dashed transition-all cursor-pointer min-h-[140px]
                ${showCreateForm
                  ? "border-[var(--accent)] bg-[var(--bg-surface)] cursor-default shadow-apple"
                  : "border-[var(--border-strong)] hover:border-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"}`}
            >
              {!showCreateForm ? (
                <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  <span className="text-sm font-medium">New Workspace</span>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-3 animate-slide-up" onClick={e => e.stopPropagation()}>
                  <input
                    placeholder="Workspace Name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    autoFocus
                    onKeyDown={e => e.key === "Enter" && handleCreateWorkspace()}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[10px] px-[14px] py-[10px] text-[var(--text-primary)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                  />
                  <div className="flex gap-2 items-center">
                    <input
                      placeholder="Custom code (optional, 4-8 chars)"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                      onKeyDown={e => e.key === "Enter" && handleCreateWorkspace()}
                      className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[10px] px-[14px] py-[10px] text-[var(--text-primary)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)] outline-none transition-all placeholder:text-[var(--text-tertiary)] font-mono tracking-wider text-sm uppercase"
                    />
                    <Button
                      onClick={handleCreateWorkspace}
                      disabled={!workspaceName.trim() || isCreating}
                      className="h-auto px-5 rounded-[980px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium border-0 transition-all active:scale-[0.98] shrink-0"
                    >
                      {isCreating ? "Creating..." : "Create"}
                    </Button>
                  </div>
                  {customCode && (
                    <p className="text-[11px] text-[var(--text-tertiary)] -mt-1 ml-1">
                      {customCode.length < 4 ? `Need ${4 - customCode.length} more character(s)` : `Code: ${customCode}`}
                    </p>
                  )}
                  {createError && <span className="text-xs text-red-500 ml-1">{createError}</span>}
                  <button
                    onClick={() => { setShowCreateForm(false); setWorkspaceName(""); setCustomCode(""); setCreateError(""); }}
                    className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors self-center mt-1"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Join Workspace Section */}
        <div className="w-full flex flex-col items-center mt-4">
          {!showJoinForm ? (
            <button
              onClick={() => { setShowJoinForm(true); setShowCreateForm(false); setJoinSuccess(""); setJoinError(""); }}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium border-b border-transparent hover:border-[var(--text-secondary)] pb-0.5"
            >
              Join with code
            </button>
          ) : (
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-md flex flex-col gap-3 animate-slide-up">
                <div className="flex justify-between gap-3 bg-[var(--bg-surface)] p-2 rounded-[16px] border border-[var(--border)] shadow-apple">
                  <input
                    placeholder="Enter invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    autoFocus
                    onKeyDown={e => e.key === "Enter" && handleJoinWorkspace()}
                    className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 text-sm px-4 uppercase font-mono tracking-wider outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                  />
                  <Button
                    onClick={handleJoinWorkspace}
                    disabled={!inviteCode.trim() || isJoining}
                    className="h-10 px-6 rounded-[980px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-0 transition-all text-sm font-medium focus:ring-0 active:scale-[0.98]"
                  >
                    {isJoining ? "Requesting..." : "Request to Join"}
                  </Button>
                </div>
                {joinError && <div className="text-sm text-red-500 font-medium text-center">{joinError}</div>}
                {joinSuccess && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 text-sm text-[var(--success)]">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
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
