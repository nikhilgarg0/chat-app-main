"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2 
} from "lucide-react";
import { auth, signInWithGoogle } from "@/lib/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { getErrorMessage } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetMessage("");
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await result.user.getIdToken();
      const profRes = await fetch(`/api/users/profile?firebaseUid=${result.user.uid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const profData = await profRes.json();
      if (profData.user?.onboardingComplete) {
        router.push("/home");
      } else {
        router.push("/onboarding");
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setResetMessage("");
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0],
          avatarUrl: user.photoURL || ""
        }),
      });
      
      const data = await res.json();
      if (data.user?.onboardingComplete) {
        router.push("/home");
      } else {
        router.push("/onboarding");
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email address above, then click 'Forgot password?'.");
      return;
    }
    setError("");
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetMessage(`Password reset link sent to ${email.trim()}. Check your inbox.`);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Heading Block ─────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
            Account Portal
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] font-display">
          Welcome back
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          Sign in to access your workspaces, encrypted channels, and team AI.
        </p>
      </div>

      {/* ── Status Messages ──────────────────────────────── */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm font-medium flex items-start gap-2.5 animate-slide-up">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {resetMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-medium flex items-start gap-2.5 animate-slide-up">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span className="leading-snug">{resetMessage}</span>
        </div>
      )}

      {/* ── One-Click Google OAuth ─────────────────────────── */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full h-11 flex items-center justify-center gap-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 text-[var(--text-primary)] border border-[var(--border)] rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--border-strong)] active:scale-[0.99] shadow-sm group"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* ── Divider ───────────────────────────────────────── */}
      <div className="relative flex items-center justify-center my-1">
        <div className="w-full border-t border-[var(--border)]" />
        <span className="absolute px-3 bg-[var(--bg-surface)] text-[11px] font-mono tracking-widest text-[var(--text-tertiary)] uppercase">
          or sign in with email
        </span>
      </div>

      {/* ── Credentials Form ──────────────────────────────── */}
      <form className="flex flex-col gap-4" onSubmit={handleLogin}>
        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl pl-10 pr-3.5 py-2.5 text-[var(--text-primary)] text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all placeholder:text-[var(--text-tertiary)]"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isResetting}
              className="text-xs font-medium text-[var(--accent)] hover:underline transition-colors cursor-pointer"
            >
              {isResetting ? "Sending..." : "Forgot password?"}
            </button>
          </div>
          <div className="relative flex items-center">
            <Lock size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl pl-10 pr-10 py-2.5 text-[var(--text-primary)] text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all placeholder:text-[var(--text-tertiary)] font-mono text-xs sm:text-sm tracking-widest selection:tracking-normal"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Remember device checkbox */}
        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--accent)] accent-[var(--accent)] focus:ring-[var(--accent)]/30 cursor-pointer"
          />
          <label htmlFor="rememberMe" className="text-xs text-[var(--text-secondary)] select-none cursor-pointer">
            Remember this device for 30 days
          </label>
        </div>

        {/* Submit Action Button */}
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full h-11 mt-1 flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent)]/25 active:scale-[0.98] group"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Verifying credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In to Workspace</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {/* ── Footer Link ───────────────────────────────────── */}
      <div className="pt-2 border-t border-[var(--border)] text-center text-xs text-[var(--text-secondary)] flex flex-col gap-2">
        <div>
          <span>New to Nexus? </span>
          <Link href="/register" className="font-semibold text-[var(--accent)] hover:underline transition-colors">
            Create an enterprise account
          </Link>
        </div>
        <div className="text-[11px] text-[var(--text-tertiary)] flex items-center justify-center gap-2 pt-1">
          <Link href="#" className="hover:underline">Privacy Policy</Link>
          <span>•</span>
          <Link href="#" className="hover:underline">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
