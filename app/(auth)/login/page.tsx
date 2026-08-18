"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { auth, signInWithGoogle } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getErrorMessage } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
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

  return (
    <>
      {/* Heading */}
      <div className="space-y-1.5 mb-2">
        <h2 className="text-[28px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
          Welcome Back
        </h2>
        <p className="text-sm text-[var(--text-secondary)] opacity-60">
          Enter your email and password to access your account
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] font-medium">
          {error}
        </div>
      )}

      {/* Form */}
      <form className="flex flex-col gap-4" onSubmit={handleLogin}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[var(--text-secondary)]">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] text-sm focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[var(--text-secondary)]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3.5 pr-10 py-2.5 text-[var(--text-primary)] text-sm focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-60 hover:opacity-100 transition-opacity"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full h-10 flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-semibold text-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
          Sign In
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-[12px]">
          <span className="bg-[var(--bg-surface)] px-3 text-[var(--text-secondary)] opacity-60">
            or
          </span>
        </div>
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full h-10 flex items-center justify-center gap-2.5 bg-transparent border border-[var(--border)] text-[var(--text-primary)] rounded-lg font-medium text-sm hover:bg-[var(--bg-elevated)] transition-all cursor-pointer disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Sign In with Google
      </button>

      {/* Footer Link */}
      <div className="text-center mt-3">
        <span className="text-sm text-[var(--text-secondary)] opacity-60">Don&apos;t have an account? </span>
        <Link href="/register" className="text-sm font-medium text-[var(--accent)] hover:underline">
          Sign Up
        </Link>
      </div>

    </>
  );
}
