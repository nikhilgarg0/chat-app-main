"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { authFetch } from "@/lib/authFetch";
import Toast from "@/components/ui/Toast";
import PageLoader from "@/components/ui/PageLoader";
import AvatarUpload from "@/components/ui/AvatarUpload";
import { useTheme } from "@/components/ThemeProvider";
import WalkthroughOverlay from "@/components/ui/WalkthroughOverlay";
import { Sparkles, MessageSquare, Zap, ShieldCheck, ArrowRight, UserCircle, Globe2, Layers, Compass } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { theme } = useTheme();

  // Steps: 1 = Welcome, 2 = Profile, 3 = Timezone, 4 = Workspace, 5 = Walkthrough
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    if (!username.trim() || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/check-username?username=${username}`);
        const data = await res.json();
        setUsernameAvailable(data.available);
      } catch (err) {
        setUsernameAvailable(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [username]);

  const [wsName, setWsName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [liveTime, setLiveTime] = useState("");

  // Track onboarding completion separately so we don't accidentally redirect before walkthrough finishes
  const [onboardingSaved, setOnboardingSaved] = useState(false);
  const [savedWorkspaceId, setSavedWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const profRes = await authFetch(`/api/users/profile?firebaseUid=${user.uid}`);
        if (profRes.ok) {
          const profData = await profRes.json();
          if (profData.user?.onboardingComplete) {
            router.push("/home");
            return;
          }
        }
      } catch (err) { }

      setDisplayName(user.displayName || user.email?.split("@")[0] || "");
      setAvatarUrl(user.photoURL || "");

      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected) setTimezone(detected);
      } catch (e) { }

      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const timeStr = new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }).format(new Date());
        setLiveTime(timeStr);
      } catch (e) {
        setLiveTime("");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  // Saves the profile config to marking onboarding complete
  const saveProfileConfig = async (): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) return false;

    try {
      const res = await authFetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          onboardingComplete: true,
          username,
          displayName,
          username,
          avatarUrl,
          bio,
          customStatus,
          timezone,
        }),
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  };

  const createWorkspace = async () => {
    setIsSubmitting(true);
    const saved = await saveProfileConfig();
    if (!saved) { setToast("Error saving profile"); setIsSubmitting(false); return; }

    try {
      const res = await authFetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wsName, firebaseUid: auth.currentUser?.uid }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedWorkspaceId(data.workspace._id);
        setOnboardingSaved(true);
        setCurrentStep(5); // goto walkthrough
      } else { setToast(data.error); setIsSubmitting(false); }
    } catch (e) { setToast("Error creating workspace"); setIsSubmitting(false); }
  };

  const joinWorkspace = async () => {
    setIsSubmitting(true);
    const saved = await saveProfileConfig();
    if (!saved) { setToast("Error saving profile"); setIsSubmitting(false); return; }

    try {
      const res = await authFetch("/api/workspaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim(), firebaseUid: auth.currentUser?.uid }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedWorkspaceId(data.workspaceId || data.workspace?._id);
        setOnboardingSaved(true);
        setCurrentStep(5); // goto walkthrough
      } else { setToast(data.error); setIsSubmitting(false); }
    } catch (e) { setToast("Error joining workspace"); setIsSubmitting(false); }
  };

  const skipWorkspace = async () => {
    setIsSubmitting(true);
    const saved = await saveProfileConfig();
    if (!saved) { setToast("Error saving profile"); setIsSubmitting(false); return; }

    setOnboardingSaved(true);
    setCurrentStep(5); // goto walkthrough
  };

  // Called when walkthrough completes
  const handleWalkthroughDone = () => {
    if (savedWorkspaceId) {
      router.push(`/workspace/${savedWorkspaceId}`);
    } else {
      router.push("/home");
    }
  };

  if (loading) return <PageLoader />;

  // Dynamic gradient blobs depending on the step
  const blobColors = [
    "bg-blue-500/10",    // Step 1
    "bg-purple-500/10",  // Step 2
    "bg-green-500/10",   // Step 3
    "bg-orange-500/10",  // Step 4
    "bg-transparent"     // Step 5 (walkthrough uses own backdrop)
  ];

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] px-4 font-body transition-opacity duration-300 overflow-hidden">

      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-3xl mix-blend-multiply opacity-50 dark:opacity-20 animate-pulse transition-colors duration-1000 ${blobColors[currentStep - 1]}`}
          style={{ animationDuration: '8s' }}
        />
        <div
          className={`absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-3xl mix-blend-multiply opacity-50 dark:opacity-20 animate-pulse transition-colors duration-1000 ${blobColors[(currentStep % 4)]}`}
          style={{ animationDuration: '12s' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[520px] bg-[var(--bg-surface)] backdrop-blur-[40px] backdrop-saturate-[200%] border border-[var(--border)] rounded-[32px] p-8 sm:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] transition-transform duration-300">

        {/* Progress header (hidden on walkthrough step) */}
        {currentStep < 5 && (
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex items-center justify-center gap-3 w-full max-w-[200px]">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex-1 h-1.5 rounded-full bg-[var(--border-strong)] overflow-hidden relative">
                  <div
                    className="absolute inset-0 bg-[var(--accent)] transition-transform duration-500 origin-left"
                    style={{ transform: step <= currentStep ? 'scaleX(1)' : 'scaleX(0)' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: WELCOME */}
        {currentStep === 1 && (
          <div className="flex flex-col items-center text-center animate-slide-up">
            <div className="w-20 h-20 bg-gradient-to-br from-[var(--accent)] to-purple-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-[var(--accent)]/20 rotate-3 hover:rotate-6 transition-transform">
              <Sparkles className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl font-display font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)]">
              Welcome to Nexus
            </h2>
            <p className="text-[var(--text-secondary)] text-[15px] max-w-[320px] mb-8 leading-relaxed">
              We're thrilled to have you, <span className="font-semibold text-[var(--text-primary)]">{displayName}</span>. Let's get your digital HQ set up perfectly.
            </p>

            <div className="w-full flex justify-center mb-10">
              <div className="flex flex-wrap justify-center gap-2 max-w-[340px]">
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs font-medium shadow-sm"><Zap className="w-3.5 h-3.5 text-yellow-500" /> Real-time sync</div>
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs font-medium shadow-sm"><MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Channels & DMs</div>
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs font-medium shadow-sm"><ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Secure workspaces</div>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              className="group w-full py-3.5 bg-[var(--text-primary)] text-[var(--bg-base)] rounded-xl font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:shadow-xl"
            >
              Let's go
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* STEP 2: PROFILE */}
        {currentStep === 2 && (
          <div className="flex flex-col animate-slide-up">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Make it yours</h2>
              <p className="text-[var(--text-secondary)]">Choose your identity on the platform.</p>
            </div>

            <div className="flex justify-center mb-6">
              <div className="relative p-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full shadow-lg">
                <AvatarUpload
                  currentAvatarUrl={avatarUrl}
                  displayName={displayName}
                  onUploadComplete={setAvatarUrl}
                  onError={setToast}
                />
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium mb-1.5">Username <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] font-mono">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      setUsername(val);
                      setUsernameAvailable(null); // Reset until checked
                    }}
                    placeholder="unique_name"
                    maxLength={20}
                    className={`w-full pl-8 pr-3 py-2 bg-[var(--bg-elevated)] border rounded-lg outline-none transition-all ${usernameAvailable === false ? 'border-red-500 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]' : usernameAvailable === true ? 'border-green-500 focus:border-green-500 focus:shadow-[0_0_0_3px_rgba(34,197,94,0.2)]' : 'border-[var(--border)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-glow)]'}`}
                  />
                </div>
                {username.length > 0 && username.length < 3 && <p className="text-xs text-red-500 mt-1">Username must be at least 3 characters</p>}
                {usernameAvailable === false && <p className="text-xs text-red-500 mt-1">Username is already taken</p>}
                {usernameAvailable === true && <p className="text-xs text-green-500 mt-1">Username is available!</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Display Name <span className="text-red-500">*</span></label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:border-[var(--accent)] outline-none transition-all focus:shadow-[0_0_0_3px_var(--accent-glow)]" />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-1.5">Bio</label>
                <textarea rows={2} value={bio} onChange={e => setBio(e.target.value)} maxLength={160} placeholder="A little about yourself..." className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:border-[var(--accent)] outline-none transition-all resize-none focus:shadow-[0_0_0_3px_var(--accent-glow)]" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <button onClick={() => setCurrentStep(1)} className="px-6 py-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-full font-medium transition-colors">Back</button>
              <button disabled={!displayName.trim() || !username.trim() || username.length < 3 || usernameAvailable === false} onClick={() => setCurrentStep(3)} className="px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white rounded-full font-medium transition-colors active:scale-[0.98]">Continue →</button>

            </div>
          </div>
        )}

        {/* STEP 3: TIMEZONE */}
        {currentStep === 3 && (
          <div className="flex flex-col animate-slide-up">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2 tracking-tight">Where are you based?</h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-[280px] mx-auto">We use your timezone to show colleagues your local time on your profile.</p>
            </div>

            <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-6 mb-8 text-center relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent inset-x-0 opacity-50" />
              <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1 mt-1">Current Local Time</p>
              <p className="text-4xl font-mono font-light tracking-tight text-[var(--text-primary)] mb-5">{liveTime || "--:--"}</p>

              <div className="relative">
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] outline-none transition-all appearance-none cursor-pointer text-sm font-medium hover:border-[var(--border-strong)]">
                  {typeof Intl !== 'undefined' && Intl.supportedValuesOf ? (
                    Intl.supportedValuesOf('timeZone').map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))
                  ) : (
                    <option value={timezone}>{timezone}</option>
                  )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
                  <Compass className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-auto">
              <button onClick={() => setCurrentStep(2)} className="px-5 py-3 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-xl font-medium transition-colors text-sm">Back</button>
              <button onClick={() => setCurrentStep(4)} className="flex-1 px-5 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-semibold transition-colors active:scale-[0.98] shadow-lg shadow-[var(--accent)]/20 text-sm">Almost done</button>
            </div>
          </div>
        )}

        {/* STEP 4: WORKSPACE */}
        {currentStep === 4 && (
          <div className="flex flex-col animate-slide-up h-full">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2 tracking-tight">The final step</h2>
              <p className="text-sm text-[var(--text-secondary)]">Create a new workspace for your team, or join an existing one.</p>
            </div>

            <div className="flex flex-col gap-5 mb-8 text-left">
              {/* Box 1: Create */}
              <div className="group border-2 border-[var(--accent)]/30 focus-within:border-[var(--accent)] rounded-2xl p-5 bg-[var(--bg-surface)] relative overflow-hidden transition-all hover:shadow-[0_0_0_1px_var(--accent)_inset]">
                <div className="absolute top-0 right-0 bg-[var(--accent)] text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg tracking-widest uppercase">Recommended</div>
                <h3 className="font-semibold text-[15px] mb-1">Create a new workspace</h3>
                <p className="text-[13px] text-[var(--text-secondary)] mb-4">Start fresh as an owner and invite your team.</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. Acme Corp" value={wsName} onChange={e => setWsName(e.target.value)} className="flex-1 px-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl outline-none text-sm transition-all focus:border-[var(--accent)]" />
                  <button disabled={!wsName.trim() || isSubmitting} onClick={createWorkspace} className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl font-medium active:scale-[0.98] disabled:opacity-50 text-sm shadow-md">Create</button>
                </div>
              </div>

              {/* Box 2: Join */}
              <div className="border border-[var(--border)] focus-within:border-[var(--border-strong)] rounded-2xl p-5 bg-[var(--bg-surface)] transition-all">
                <h3 className="font-semibold text-[15px] mb-1">Have an invite code?</h3>
                <p className="text-[13px] text-[var(--text-secondary)] mb-4">Join an existing workspace instantly.</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="XYZ123" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="w-[140px] px-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl outline-none text-sm font-mono uppercase transition-all focus:border-[var(--accent)]" />
                  <button disabled={!inviteCode.trim() || isSubmitting} onClick={joinWorkspace} className="flex-1 px-4 py-2.5 bg-[var(--text-primary)] text-[var(--bg-base)] rounded-xl font-medium active:scale-[0.98] disabled:opacity-50 text-sm">Join Workspace</button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-auto">
              <button
                onClick={() => setCurrentStep(3)}
                disabled={isSubmitting}
                className="px-5 py-3 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-xl font-medium transition-colors text-sm disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={skipWorkspace}
                disabled={isSubmitting}
                className="px-5 py-3 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Skip for now"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STEP 5: WALKTHROUGH OVERLAY — triggered after everything is saved */}
      {currentStep === 5 && (
        <WalkthroughOverlay onDone={handleWalkthroughDone} />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
