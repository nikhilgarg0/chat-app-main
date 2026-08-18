"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import { auth } from "@/lib/firebase";
import AvatarUpload from "@/components/ui/AvatarUpload";
import { Twitter, Github, Linkedin, Globe, ArrowLeft, CheckCircle2, AlertCircle, Copy, PaintBucket, Bell, Monitor, User as UserIcon } from "lucide-react";
import Toast from "@/components/ui/Toast";
import { ProfileSkeleton } from "@/components/ui/Skeletons";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorVisible, setErrorVisible] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [originalData, setOriginalData] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    displayName: "",
    email: "",
    bio: "",
    customStatus: "",
    timezone: "UTC",
    coverColor: "#0a84ff",
    socialLinks: { twitter: "", github: "", linkedin: "", website: "" },
    notificationPrefs: { mentions: true, allMessages: false, sounds: true },
    theme: "system",
    avatarUrl: "",
  });

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
              coverColor: data.user.coverColor || "#0a84ff",
              theme: data.user.theme || "system",
              bio: data.user.bio || "",
              customStatus: data.user.customStatus || "",
              timezone: data.user.timezone || "UTC",
              avatarUrl: data.user.avatarUrl || ""
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
      setToastMessage("User ID copied");
    }
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="flex flex-col flex-1 relative bg-[var(--bg-base)] overflow-y-auto overflow-x-hidden pb-40">
      
      {/* GLOWING BACKGROUND (Ambient) */}
      <div 
        className="absolute top-[-20%] left-[-10%] w-[120%] h-[60vh] opacity-30 dark:opacity-20 blur-[100px] pointer-events-none transition-colors duration-1000"
        style={{ background: `radial-gradient(ellipse at center, ${formData.coverColor} 0%, transparent 70%)` }}
      />

      {/* STICKY GLASS HEADER */}
      <div className="sticky top-0 z-50 px-4 py-3 bg-[var(--bg-base)]/60 backdrop-blur-3xl border-b border-[var(--border)] flex items-center justify-between shadow-sm">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-full transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <span className="text-[13px] font-semibold tracking-wider uppercase text-[var(--text-secondary)]">Profile Settings</span>
        <div className="w-[70px]"></div> {/* spacer to center title */}
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 relative z-10 animate-slide-up mt-8">
        
        {/* HERO CARD */}
        <div className="bg-[var(--bg-surface)] backdrop-blur-xl border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl shadow-black/5 dark:shadow-black/40 mb-8 transition-all relative group">
          
          {/* Cover Banner */}
          <div 
            className="w-full h-32 sm:h-48 relative transition-colors duration-500 overflow-hidden"
            style={{ backgroundColor: formData.coverColor }}
          >
            {/* Overlay texture */}
            <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
            
            <label 
              className="absolute top-4 right-4 bg-black/30 backdrop-blur-md hover:bg-black/50 text-white p-2 rounded-full cursor-pointer transition-all flex items-center justify-center border border-white/10 group/colbtn shadow-lg"
              title="Change cover color"
            >
              <PaintBucket className="w-4 h-4 group-hover/colbtn:rotate-12 transition-transform" />
              <input 
                type="color" 
                value={formData.coverColor} 
                onChange={(e) => handleChange("coverColor", e.target.value)} 
                className="opacity-0 w-0 h-0 absolute"
              />
            </label>
          </div>

          <div className="px-6 pb-8 sm:px-10 flex flex-col sm:flex-row gap-6 relative">
            {/* Avatar overlaps banner */}
            <div className="-mt-16 sm:-mt-20 relative z-10 p-2 bg-[var(--bg-surface)] rounded-full border border-[var(--border)] shadow-xl inline-block">
              <AvatarUpload 
                currentAvatarUrl={formData.avatarUrl}
                displayName={formData.displayName}
                onUploadComplete={(url) => handleChange("avatarUrl", url)}
                onError={(msg) => setErrorVisible(msg)}
              />
            </div>

            <div className="flex-1 mt-2 sm:mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-display font-bold text-[var(--text-primary)] tracking-tight">
                    {formData.displayName || "Unknown User"}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[14px] text-[var(--text-secondary)]">{formData.email}</p>
                    <span className="w-1 h-1 bg-[var(--border-strong)] rounded-full" />
                    <button 
                      onClick={copyUserId} 
                      className="group/copy flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors py-1 px-2 rounded-md hover:bg-[var(--bg-elevated)]" 
                      title="Copy User ID"
                    >
                      <Copy className="w-3.5 h-3.5 group-hover/copy:scale-110 transition-transform" />
                      ID
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Input right in the header */}
              <div className="mt-5 relative w-full max-w-md">
                <input
                  type="text"
                  placeholder="What's your status right now?"
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-xl border border-[var(--border)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-glow)] outline-none transition-all placeholder:text-[var(--text-tertiary)] text-sm"
                  value={formData.customStatus}
                  onChange={(e) => handleChange("customStatus", e.target.value)}
                  maxLength={80}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[16px]">💭</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorVisible && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[14px] font-medium flex items-center shadow-sm animate-slide-up">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            {errorVisible}
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Main Info */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Basic Info Card */}
            <div className="bg-[var(--bg-surface)] backdrop-blur-md border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><UserIcon className="w-5 h-5" /></div>
                <h2 className="text-lg font-bold">Personal Details</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] font-mono">@</span>
                    <input 
                      type="text" 
                      className="w-full pl-9 pr-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-glow)] outline-none transition-all font-medium" 
                      value={formData.username || ""}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                        handleChange("username", val);
                      }}
                      maxLength={20}
                    />
                  </div>
                  {formData.username && formData.username.length < 3 && <p className="text-xs text-red-500 mt-2 ml-1">Must be at least 3 characters</p>}
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">Display Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-glow)] outline-none transition-all font-medium" 
                    value={formData.displayName}
                    onChange={(e) => handleChange("displayName", e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="flex justify-between items-center text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">
                    <span>Bio</span>
                    <span className="text-[var(--text-tertiary)] font-normal normal-case">{formData.bio?.length || 0} / 160</span>
                  </label>
                  <textarea 
                    className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-glow)] outline-none transition-all resize-none text-[15px] leading-relaxed" 
                    rows={3}
                    placeholder="Tell your team about yourself..."
                    value={formData.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    maxLength={160}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 ml-1">Timezone</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-glow)] outline-none transition-all appearance-none cursor-pointer font-medium"
                      value={formData.timezone}
                      onChange={(e) => handleChange("timezone", e.target.value)}
                    >
                      {Intl.supportedValuesOf('timeZone').map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none w-2 h-2 border-b-2 border-r-2 border-[var(--text-tertiary)] rotate-45" />
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links Card */}
            <div className="bg-[var(--bg-surface)] backdrop-blur-md border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><Globe className="w-5 h-5" /></div>
                <h2 className="text-lg font-bold">Social Profiles</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { id: 'twitter', icon: Twitter, color: 'text-sky-500', placeholder: 'Twitter Username' },
                  { id: 'github', icon: Github, color: 'text-gray-600 dark:text-gray-300', placeholder: 'GitHub Username' },
                  { id: 'linkedin', icon: Linkedin, color: 'text-blue-600', placeholder: 'LinkedIn URL' },
                  { id: 'website', icon: Globe, color: 'text-green-500', placeholder: 'Personal Website' }
                ].map((social) => (
                  <div key={social.id} className="group flex items-center bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl focus-within:border-[var(--accent)] focus-within:ring-4 focus-within:ring-[var(--accent-glow)] transition-all overflow-hidden">
                    <div className="pl-4 pr-3 py-3 border-r border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02]">
                      <social.icon className={`w-[18px] h-[18px] ${social.color} opacity-80 group-focus-within:opacity-100 transition-opacity`} />
                    </div>
                    <input 
                      type="text" 
                      className="flex-1 px-4 py-3 bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] w-full" 
                      value={formData.socialLinks[social.id]} 
                      onChange={(e) => handleChange(`socialLinks.${social.id}`, e.target.value)} 
                      placeholder={social.placeholder} 
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Settings */}
          <div className="space-y-8">
            
            {/* Preferences */}
            <div className="bg-[var(--bg-surface)] backdrop-blur-md border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg"><Monitor className="w-5 h-5" /></div>
                <h2 className="text-lg font-bold">App Settings</h2>
              </div>
              
              <div className="mb-8">
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Theme</label>
                <div className="flex bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border)]">
                  {['light', 'dark', 'system'].map((t) => (
                    <button
                      key={t}
                      onClick={() => handleChange("theme", t)}
                      className={`flex-1 py-2 text-[13px] capitalize font-medium rounded-lg transition-all ${
                        formData.theme === t 
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border)]' 
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Notifications</span>
                  <Bell className="w-3.5 h-3.5" />
                </label>
                <div className="space-y-4">
                  {[
                    { key: "mentions", label: "Mentions & replies", desc: "Get notified when someone @tags you" },
                    { key: "allMessages", label: "All messages", desc: "Notify for every new message" },
                    { key: "sounds", label: "Play sounds", desc: "Play a \"bing\" on incoming messages" }
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-4 cursor-pointer group">
                      <div className="relative mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={formData.notificationPrefs[item.key as keyof typeof formData.notificationPrefs]} 
                          onChange={(e) => handleNotificationChange(item.key, e.target.checked)} 
                          className="peer sr-only" 
                        />
                        <div className="w-10 h-6 bg-[var(--border-strong)] rounded-full peer-checked:bg-[var(--success)] transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-[var(--success)]/20" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow border border-black/5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-medium text-[var(--text-primary)]">{item.label}</p>
                        <p className="text-[12px] text-[var(--text-secondary)] leading-snug">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
        
        {/* Sticky Save Actions (Floating Bar) */}
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isDirty ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"}`}>
          <div className="bg-[var(--text-primary)]/95 backdrop-blur-2xl text-[var(--bg-base)] rounded-full p-2 pl-6 sm:pl-8 flex items-center gap-4 shadow-2xl border border-white/10 dark:border-white/5">
            <span className="text-[14px] font-medium whitespace-nowrap hidden sm:block">
              You have unsaved changes
            </span>
            <span className="text-[14px] font-medium whitespace-nowrap block sm:hidden">
              Unsaved
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleDiscard} 
                disabled={saving} 
                className="text-[13px] font-medium text-[var(--bg-base)]/70 hover:text-[var(--bg-base)] transition-colors px-3 py-2 disabled:opacity-50"
              >
                Discard
              </button>
              <button 
                onClick={() => handleSave(formData, false)} 
                disabled={saving || !formData.username || formData.username.length < 3 || usernameAvailable === false} 
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all active:scale-95 flex items-center gap-2 shadow-[0_4px_12px_var(--accent-glow)] min-w-[120px] justify-center"
              >
                {saving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    Save
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
