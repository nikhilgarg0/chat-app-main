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

export default function OnboardingPage() {
  const router = useRouter();
  const { theme } = useTheme();
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

  const [wsName, setWsName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [liveTime, setLiveTime] = useState("");

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
      } catch (err) {}

      setDisplayName(user.displayName || user.email?.split("@")[0] || "");
      setAvatarUrl(user.photoURL || "");

      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected) setTimezone(detected);
      } catch (e) {}

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

  const handleComplete = async (onSuccess: () => Promise<void>) => {
    const user = auth.currentUser;
    if (!user) return;
    setIsSubmitting(true);
    try {
      const res = await authFetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          onboardingComplete: true,
          displayName,
          username,
          avatarUrl,
          bio,
          customStatus,
          timezone,
        }),
      });
      if (res.ok) {
        await onSuccess();
      } else {
        setToast("Failed to complete onboarding.");
        setIsSubmitting(false);
      }
    } catch (err) {
      setToast("Error saving profile.");
      setIsSubmitting(false);
    }
  };

  const createWorkspace = () => {
    handleComplete(async () => {
      try {
        const res = await authFetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: wsName, firebaseUid: auth.currentUser?.uid }),
        });
        const data = await res.json();
        if (res.ok && data.success) router.push(`/workspace/${data.workspace._id}`);
        else { setToast(data.error); setIsSubmitting(false); }
      } catch (e) { setToast("Error creating workspace"); setIsSubmitting(false); }
    });
  };

  const joinWorkspace = () => {
    handleComplete(async () => {
      try {
        const res = await authFetch("/api/workspaces/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: inviteCode.trim(), firebaseUid: auth.currentUser?.uid }),
        });
        const data = await res.json();
        if (res.ok && data.success) router.push(`/workspace/${data.workspaceId || data.workspace?._id}`);
        else { setToast(data.error); setIsSubmitting(false); }
      } catch (e) { setToast("Error joining workspace"); setIsSubmitting(false); }
    });
  };

  const skipWorkspace = () => {
    handleComplete(async () => {
      router.push("/home");
    });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] px-4 font-body transition-opacity duration-300">
      <div className="w-full max-w-[480px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-8 shadow-apple transition-transform duration-300">
        
        {/* Progress labels & dots */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Step {currentStep} of 4: {["Welcome", "Profile", "Timezone", "Workspace"][currentStep-1]}
          </span>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <button 
                key={step} 
                onClick={() => step < currentStep ? setCurrentStep(step) : null} 
                className={`w-2 h-2 rounded-full transition-colors ${step <= currentStep ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"} ${step < currentStep ? "cursor-pointer hover:scale-125" : "cursor-default"}`} 
                disabled={step > currentStep}
              />
            ))}
          </div>
        </div>

        {currentStep === 1 && (
          <div className="flex flex-col items-center text-center animate-slide-up">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Image
                src={theme === "light" ? "/logos/Logo_Black.png" : "/logos/Logo_White.png"}
                alt="Nexus"
                width={40}
                height={40}
                className="object-contain"
              />
              <Image
                src={theme === "light" ? "/logos/Wordmark_Black.png" : "/logos/Wordmark_White.png"}
                alt="Nexus"
                width={100}
                height={30}
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome, {displayName}</h2>
            <p className="text-[var(--text-secondary)] mb-8">Let's get your workspace set up in just a few steps.</p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <span className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full px-4 py-2 text-sm font-medium">⚡ Real-time chat</span>
              <span className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full px-4 py-2 text-sm font-medium">🤖 AI assistant</span>
              <span className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full px-4 py-2 text-sm font-medium">🔒 Secure by default</span>
            </div>

            <button 
              onClick={() => setCurrentStep(2)} 
              className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-full font-medium transition-colors active:scale-[0.98]"
            >
              Get started →
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="flex flex-col animate-slide-up">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Make it yours</h2>
              <p className="text-[var(--text-secondary)]">Choose your identity on the platform.</p>
            </div>

            <div className="flex justify-center mb-6">
              <AvatarUpload 
                currentAvatarUrl={avatarUrl}
                displayName={displayName}
                onUploadComplete={setAvatarUrl}
                onError={setToast}
              />
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

        {currentStep === 3 && (
          <div className="flex flex-col animate-slide-up">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Set your timezone</h2>
              <p className="text-[var(--text-secondary)]">We'll show you teammates' local times correctly.</p>
            </div>

            <div className="mb-6">
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-3 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:border-[var(--accent)] outline-none transition-all appearance-none cursor-pointer">
                {typeof Intl !== 'undefined' && Intl.supportedValuesOf ? (
                  Intl.supportedValuesOf('timeZone').map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))
                ) : (
                  <option value={timezone}>{timezone}</option>
                )}
              </select>
              {liveTime && <p className="mt-4 text-center text-sm font-medium text-[var(--accent)]">Your current time: {liveTime}</p>}
            </div>

            <div className="flex items-center justify-between gap-4 mt-auto">
              <button onClick={() => setCurrentStep(2)} className="px-6 py-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-full font-medium transition-colors">Back</button>
              <button onClick={() => setCurrentStep(4)} className="px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-full font-medium transition-colors active:scale-[0.98]">Continue →</button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="flex flex-col animate-slide-up h-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Join or create a workspace</h2>
              <p className="text-[var(--text-secondary)]">Workspaces are where your team communicates.</p>
            </div>

            <div className="flex flex-col gap-4 mb-6 text-left">
              <div className="border-2 border-[var(--accent)] rounded-xl p-5 bg-[var(--bg-surface)] shadow-[0_0_0_1px_var(--accent-glow)] relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[var(--accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">RECOMMENDED</div>
                <h3 className="font-semibold mb-2">Create a new workspace</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Start fresh and invite your team to collaborate.</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="Workspace name" value={wsName} onChange={e => setWsName(e.target.value)} className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg outline-none max-w-[200px]" />
                  <button disabled={!wsName.trim() || isSubmitting} onClick={createWorkspace} className="px-5 py-2 bg-[var(--accent)] text-white rounded-lg font-medium active:scale-[0.98] disabled:opacity-50">Create</button>
                </div>
              </div>

              <div className="flex items-center gap-4 py-1">
                <div className="h-px bg-[var(--border)] flex-1"></div>
                <span className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider">or join existing</span>
                <div className="h-px bg-[var(--border)] flex-1"></div>
              </div>

              <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--bg-surface)] opacity-80 hover:opacity-100 transition-opacity">
                <h3 className="font-medium mb-3 text-sm">Have an invite code?</h3>
                <div className="flex gap-2">
                  <input type="text" placeholder="Enter code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg outline-none text-sm max-w-[200px]" />
                  <button disabled={!inviteCode.trim() || isSubmitting} onClick={joinWorkspace} className="px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg font-medium active:scale-[0.98] disabled:opacity-50 text-sm">Join</button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 mt-auto pt-2">
              <button onClick={() => setCurrentStep(3)} className="px-6 py-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-full font-medium transition-colors">Back</button>
              <button onClick={skipWorkspace} disabled={isSubmitting} className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline transition-colors">
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>
      
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
