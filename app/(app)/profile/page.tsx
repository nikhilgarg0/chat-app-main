"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { auth } from "@/lib/firebase";
import AvatarUpload from "@/components/ui/AvatarUpload";
import { 
  Twitter, 
  Github, 
  Linkedin, 
  Globe, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  PaintBucket, 
  Bell, 
  Monitor, 
  User as UserIcon, 
  MessageSquare,
  XCircle,
  Loader2,
  Share2,
  Download,
  ShieldCheck
} from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";
import Toast from "@/components/ui/Toast";
import { ProfileSkeleton } from "@/components/ui/Skeletons";

export default function ProfilePage() {
  const router = useRouter();
  const { setTheme: setGlobalTheme } = useTheme();
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errorVisible, setErrorVisible] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [originalData, setOriginalData] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    displayName: "",
    username: "",
    email: "",
    bio: "",
    customStatus: "",
    timezone: "UTC",
    coverColor: "#2563eb",
    socialLinks: { twitter: "", github: "", linkedin: "", website: "" },
    notificationPrefs: { mentions: true, allMessages: false, sounds: true },
    theme: "system",
    avatarUrl: "",
  });

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const res = await authFetch(`/api/users/profile?firebaseUid=${user.uid}`);
          const data = await res.json();
          if (data.success && data.user) {
            const loaded = {
              ...data.user,
              socialLinks: data.user.socialLinks || { twitter: "", github: "", linkedin: "", website: "" },
              notificationPrefs: data.user.notificationPrefs || { mentions: true, allMessages: false, sounds: true },
              coverColor: data.user.coverColor || "#2563eb",
              theme: data.user.theme || "system",
              bio: data.user.bio || "",
              customStatus: data.user.customStatus || "",
              timezone: data.user.timezone || "UTC",
              avatarUrl: data.user.avatarUrl || "",
              username: data.user.username || ""
            };
            setOriginalData(loaded);
            setFormData(loaded);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        router.push("/login");
      }
    });
    return unsub;
  }, [router]);

  // Real-time username availability validation
  useEffect(() => {
    if (!formData.username || formData.username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    if (originalData?.username && formData.username === originalData.username) {
      setUsernameAvailable(true);
      return;
    }

    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const res = await authFetch(
          `/api/users/check-username?username=${encodeURIComponent(formData.username)}&currentUid=${auth.currentUser?.uid}`
        );
        const data = await res.json();
        setUsernameAvailable(data.available === true);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.username, originalData?.username]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const next = { ...prev };
      const keys = field.split(".");
      if (keys.length === 2) {
        next[keys[0]] = { ...next[keys[0]], [keys[1]]: value };
      } else {
        next[field] = value;
      }
      return next;
    });
    setIsDirty(true);
  };

  const handleDiscard = () => {
    setFormData(JSON.parse(JSON.stringify(originalData)));
    setIsDirty(false);
    setErrorVisible(null);
  };

  const handleSave = async (dataToSave = formData, isSilent = false) => {
    if (!isSilent) setSaving(true);
    setErrorVisible(null);

    try {
      const res = await authFetch("/api/users/profile", {
        method: "POST",
        body: JSON.stringify({
          firebaseUid: auth.currentUser?.uid,
          ...dataToSave,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOriginalData(JSON.parse(JSON.stringify(dataToSave)));
        setIsDirty(false);
        if (!isSilent) setToastMessage("Profile updated successfully");
      } else {
        if (!isSilent) setErrorVisible(data.error || "Failed to save profile");
      }
    } catch (e: any) {
      if (!isSilent) setErrorVisible(e.message || "An error occurred.");
    } finally {
      if (!isSilent) setSaving(false);
    }
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    const newPrefs = { ...formData.notificationPrefs, [key]: value };
    const newData = { ...formData, notificationPrefs: newPrefs };
    setFormData(newData);
    // Auto-save silently for toggle preferences
    handleSave(newData, true);
  };
  
  const copyUserId = () => {
    if (auth.currentUser?.uid) {
      navigator.clipboard.writeText(auth.currentUser.uid);
      setToastMessage("User ID copied to clipboard");
    }
  };

  const copyProfileLink = () => {
    const handle = formData.username || auth.currentUser?.uid;
    if (handle) {
      const url = `${window.location.origin}/user/${handle}`;
      navigator.clipboard.writeText(url);
      setToastMessage("Profile link copied to clipboard");
    }
  };

  const exportUserData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nexus-profile-${formData.username || "data"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setToastMessage("Profile data exported successfully");
  };

  if (loading) return <ProfileSkeleton />;

  const statusPresets = ["Working Remotely", "In a Meeting", "Focus Mode", "Out of Office"];
  const colorPresets = ["#2563eb", "#1e293b", "#334155", "#0f172a", "#059669"];

  return (
    <div className="flex flex-col flex-1 relative bg-[var(--bg-base)] overflow-y-auto overflow-x-hidden pb-40">
      
      {/* STICKY GLASS HEADER */}
      <div className="sticky top-0 z-50 px-4 py-3 bg-[var(--bg-glass)] backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-[13px] font-medium tracking-wider uppercase text-[var(--text-secondary)] opacity-60">Profile Settings</span>
        <div className="w-[70px]"></div>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 relative z-10 animate-slide-up mt-6 space-y-6">
        
        {/* HERO CARD */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden transition-all relative">
          
          {/* Cover Banner */}
          <div 
            className="w-full h-28 sm:h-36 relative transition-colors duration-300 overflow-hidden"
            style={{ backgroundColor: formData.coverColor }}
          >
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 p-1.5 rounded-lg border border-white/20">
              {colorPresets.map((c) => (
                <button
                  key={c}
                  onClick={() => handleChange("coverColor", c)}
                  className={`w-4 h-4 rounded-full border transition-transform ${formData.coverColor === c ? "scale-125 border-white" : "border-transparent opacity-80"}`}
                  style={{ backgroundColor: c }}
                  title={`Color ${c}`}
                />
              ))}
              <label className="cursor-pointer text-white ml-1 hover:opacity-80" title="Custom color">
                <PaintBucket className="w-3.5 h-3.5" />
                <input 
                  type="color" 
                  value={formData.coverColor} 
                  onChange={(e) => handleChange("coverColor", e.target.value)} 
                  className="opacity-0 w-0 h-0 absolute"
                />
              </label>
            </div>
          </div>

          <div className="px-6 pb-6 sm:px-8 flex flex-col sm:flex-row gap-6 relative">
            {/* Avatar overlaps banner */}
            <div className="-mt-12 sm:-mt-14 relative z-10 p-1.5 bg-[var(--bg-surface)] rounded-full border border-[var(--border)] shadow-md inline-block">
              <AvatarUpload 
                currentAvatarUrl={formData.avatarUrl}
                displayName={formData.displayName}
                onUploadComplete={(url) => handleChange("avatarUrl", url)}
                onError={(msg) => setErrorVisible(msg)}
              />
            </div>

            <div className="flex-1 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-[28px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
                      {formData.displayName || "Unknown User"}
                    </h1>
                    <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[var(--text-secondary)] opacity-60">
                    <span className="font-mono">@{formData.username || "no_username"}</span>
                    <span>•</span>
                    <span>{formData.email}</span>
                    <span>•</span>
                    <button 
                      onClick={copyUserId} 
                      className="hover:opacity-100 transition-opacity flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-[var(--bg-elevated)]" 
                      title="Copy raw UID"
                    >
                      <Copy className="w-3 h-3" />
                      Copy ID
                    </button>
                    <button 
                      onClick={copyProfileLink} 
                      className="hover:opacity-100 transition-opacity flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-[var(--bg-elevated)]" 
                      title="Copy shareable link"
                    >
                      <Share2 className="w-3 h-3" />
                      Share Profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Input with Quick Presets */}
              <div className="mt-4 space-y-2">
                <div className="relative w-full max-w-md">
                  <input
                    type="text"
                    placeholder="What's your status right now?"
                    className="w-full pl-9 pr-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg border border-[var(--border)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--text-tertiary)] text-sm"
                    value={formData.customStatus}
                    onChange={(e) => handleChange("customStatus", e.target.value)}
                    maxLength={80}
                  />
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-[var(--text-secondary)] opacity-60">Presets:</span>
                  {statusPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleChange("customStatus", preset)}
                      className="text-xs px-2.5 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorVisible && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm font-medium flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            {errorVisible}
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Main Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Info Card */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <UserIcon className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight">Personal Details</h2>
              </div>
              
              <div className="space-y-4">
                {/* Username Field with Live Validation */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[13px] font-medium text-[var(--text-secondary)]">
                      Unique Handle (@username)
                    </label>
                    {checkingUsername ? (
                      <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                      </span>
                    ) : usernameAvailable === true ? (
                      <span className="text-xs text-emerald-500 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Available
                      </span>
                    ) : usernameAvailable === false ? (
                      <span className="text-xs text-red-500 flex items-center gap-1 font-medium">
                        <XCircle className="w-3 h-3" /> Taken
                      </span>
                    ) : null}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] font-mono">@</span>
                    <input 
                      type="text" 
                      className={`w-full pl-8 pr-4 py-2 bg-[var(--bg-elevated)] border rounded-lg text-[var(--text-primary)] text-sm outline-none transition-all ${
                        usernameAvailable === false ? "border-red-500" : usernameAvailable === true ? "border-emerald-500/50" : "border-[var(--border)] focus:border-[var(--accent)]"
                      }`} 
                      value={formData.username || ""}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                        handleChange("username", val);
                      }}
                      maxLength={20}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] opacity-60 mt-1">
                    Every user has a unique username used for direct links and mentions.
                  </p>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Display Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:border-[var(--accent)] outline-none transition-all" 
                    value={formData.displayName}
                    onChange={(e) => handleChange("displayName", e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="flex justify-between items-center text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
                    <span>Bio</span>
                    <span className="text-xs text-[var(--text-tertiary)] font-normal">{formData.bio?.length || 0} / 160</span>
                  </label>
                  <textarea 
                    className="w-full px-3.5 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:border-[var(--accent)] outline-none transition-all resize-none leading-relaxed" 
                    rows={3}
                    placeholder="Tell your team about yourself..."
                    value={formData.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    maxLength={160}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Timezone</label>
                  <div className="relative">
                    <select 
                      className="w-full px-3.5 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:border-[var(--accent)] outline-none transition-all appearance-none cursor-pointer"
                      value={formData.timezone}
                      onChange={(e) => handleChange("timezone", e.target.value)}
                    >
                      {Intl.supportedValuesOf('timeZone').map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none w-2 h-2 border-b-2 border-r-2 border-[var(--text-tertiary)] rotate-45" />
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links Card */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight">Social Profiles</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'twitter', icon: Twitter, color: 'text-sky-500', placeholder: 'Twitter Username' },
                  { id: 'github', icon: Github, color: 'text-gray-400', placeholder: 'GitHub Username' },
                  { id: 'linkedin', icon: Linkedin, color: 'text-blue-500', placeholder: 'LinkedIn URL' },
                  { id: 'website', icon: Globe, color: 'text-emerald-500', placeholder: 'Personal Website' }
                ].map((social) => (
                  <div key={social.id} className="flex items-center bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus-within:border-[var(--accent)] transition-all overflow-hidden">
                    <div className="pl-3 pr-2 py-2 border-r border-[var(--border)]">
                      <social.icon className={`w-4 h-4 ${social.color}`} />
                    </div>
                    <input 
                      type="text" 
                      className="flex-1 px-3 py-2 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] w-full" 
                      value={formData.socialLinks[social.id]} 
                      onChange={(e) => handleChange(`socialLinks.${social.id}`, e.target.value)} 
                      placeholder={social.placeholder} 
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Settings & Actions */}
          <div className="space-y-6">
            
            {/* Preferences */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight">App Settings</h2>
              </div>
              
              <div className="mb-6">
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">Theme</label>
                <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border)]">
                  {['light', 'dark', 'system'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        handleChange("theme", t);
                        setGlobalTheme(t as "light" | "dark" | "system");
                      }}

                      className={`flex-1 py-1.5 text-[13px] capitalize font-medium rounded-md transition-all ${
                        formData.theme === t 
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)]' 
                        : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-3 flex items-center justify-between">
                  <span>Notifications</span>
                  <Bell className="w-4 h-4 opacity-60" />
                </label>
                <div className="space-y-3">
                  {[
                    { key: "mentions", label: "Mentions & replies", desc: "Get notified when tagged" },
                    { key: "allMessages", label: "All messages", desc: "Notify for every new message" },
                    { key: "sounds", label: "Play sounds", desc: "Play notification audio" }
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                      <div className="relative mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={formData.notificationPrefs[item.key as keyof typeof formData.notificationPrefs]} 
                          onChange={(e) => handleNotificationChange(item.key, e.target.checked)} 
                          className="peer sr-only" 
                        />
                        <div className="w-9 h-5 bg-[var(--border-strong)] rounded-full peer-checked:bg-[var(--accent)] transition-colors" />
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{item.label}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] opacity-60">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Account Management & Export */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6 space-y-3">
              <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight">Account Tools</h2>
              <p className="text-xs text-[var(--text-secondary)] opacity-60">
                Export your profile data or copy your permanent identifiers.
              </p>

              <button
                type="button"
                onClick={exportUserData}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-[var(--accent)]" />
                Export Profile Data (.json)
              </button>
            </div>

          </div>
        </div>
        
        {/* Sticky Save Actions (Floating Bar) */}
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${isDirty ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"}`}>
          <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg p-2 pl-6 sm:pl-8 flex items-center gap-4 border border-[var(--border-strong)] shadow-xl">
            <span className="text-sm font-medium whitespace-nowrap hidden sm:block">
              You have unsaved changes
            </span>
            <span className="text-sm font-medium whitespace-nowrap block sm:hidden">
              Unsaved
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleDiscard} 
                disabled={saving} 
                className="text-[13px] font-medium text-[var(--text-secondary)] opacity-60 hover:opacity-100 transition-opacity px-3 py-1.5 disabled:opacity-50"
              >
                Discard
              </button>
              <button 
                onClick={() => handleSave(formData, false)} 
                disabled={saving || !formData.username || formData.username.length < 3 || usernameAvailable === false} 
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all active:scale-95 flex items-center gap-1.5 justify-center cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    Save Changes
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Global Toast */}
        {toastMessage && (
          <Toast message={toastMessage} onDone={() => setToastMessage(null)} />
        )}

      </div>

    </div>
  );
}
