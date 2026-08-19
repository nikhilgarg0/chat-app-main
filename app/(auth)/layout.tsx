"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import PageLoader from "@/components/ui/PageLoader";
import { Sparkles, Shield, Zap, Bot, Users } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        router.push("/home");
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <main className="flex min-h-[100dvh] w-full bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden relative selection:bg-[var(--accent)] selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[var(--accent)]/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#3b82f6]/10 rounded-full blur-[140px] pointer-events-none translate-x-1/3 translate-y-1/3" />

      {/* ── Left Panel — Enterprise Brand Showcase ────────────────── */}
      <div className="hidden lg:flex flex-1 relative m-4 mr-0 select-none">
        <div className="relative w-full rounded-2xl overflow-hidden border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl flex flex-col justify-between p-10 xl:p-12">
          
          {/* Subtle Background Pattern & Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-surface)] via-[var(--bg-elevated)]/60 to-[var(--bg-surface)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(114,137,218,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.12),transparent_50%)]" />
          
          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(var(--text-primary) 1px, transparent 1px)`,
              backgroundSize: '24px 24px'
            }}
          />

          {/* Top Brand & Status Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/30 border border-white/20">
                <Image src="/logos/Logo_White.png" alt="Nexus Logo" width={22} height={22} className="object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight font-display text-[var(--text-primary)]">Nexus</span>
                <span className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Enterprise Suite</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-elevated)]/80 border border-[var(--border)] backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">SOC2 Type II Verified</span>
            </div>
          </div>

          {/* Middle: Hero Value Proposition & Interactive Live Chat Preview */}
          <div className="relative z-10 my-auto py-8 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-semibold tracking-wide">
                <Sparkles size={13} />
                <span>Next-Gen Collaborative Workspace</span>
              </div>
              <h1 className="text-3xl xl:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.15]">
                Where high-velocity teams communicate at the speed of thought.
              </h1>
              <p className="text-[var(--text-secondary)] text-sm xl:text-base leading-relaxed max-w-lg">
                Real-time channel messaging, ultra-low latency WebSockets, and embedded autonomous Gemini AI.
              </p>
            </div>

            {/* Live Interactive Product Mock Card */}
            <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-glass)] backdrop-blur-xl p-4 shadow-xl space-y-3 max-w-md">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--accent)] font-mono text-sm font-bold">#</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">engineering-core</span>
                </div>
                <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  12ms latency
                </span>
              </div>

              {/* Message 1 */}
              <div className="flex items-start gap-2.5 text-xs">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                  SC
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">Sarah Chen</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">10:42 AM</span>
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Deployed the new event pipeline to production. Ready for load testing! 🚀
                  </p>
                </div>
              </div>

              {/* Message 2: Nexus AI Assistant */}
              <div className="flex items-start gap-2.5 text-xs bg-[var(--accent)]/5 border border-[var(--accent)]/15 rounded-lg p-2.5">
                <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Bot size={14} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[var(--accent)] text-[11px]">Nexus AI</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[var(--accent)]/20 text-[var(--accent)] rounded font-mono font-medium">GEMINI 2.0</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)]">Just now</span>
                  </div>
                  <p className="text-[var(--text-secondary)] text-[11px] leading-snug">
                    Telemetry confirms all 24 regional edge nodes are healthy. Latency dropped by 38ms.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)]/60 border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)]">
                <Zap size={13} className="text-amber-500" />
                <span>Sub-millisecond Pusher Delivery</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)]/60 border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)]">
                <Shield size={13} className="text-emerald-500" />
                <span>End-to-End Firebase Security</span>
              </div>
            </div>
          </div>

          {/* Bottom Trust & Footer */}
          <div className="relative z-10 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[var(--text-secondary)]" />
              <span>Trusted by 10,000+ engineers worldwide</span>
            </div>
            <span>© {new Date().getFullYear()} Nexus Platform</span>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Form Canvas ───────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 lg:px-12 xl:px-16 py-8 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[440px] my-auto">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/25">
              <Image src="/logos/Logo_White.png" alt="Nexus Logo" width={20} height={20} className="object-contain" />
            </div>
            <span className="font-bold text-xl tracking-tight text-[var(--text-primary)]">Nexus</span>
          </div>

          {/* Main Auth Content Box */}
          <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] p-6 sm:p-9 shadow-2xl backdrop-blur-2xl transition-all">
            {children}
          </div>

          {/* Security Assurance Badge */}
          <div className="mt-6 text-center text-[12px] text-[var(--text-tertiary)] flex items-center justify-center gap-2">
            <Shield size={13} className="text-emerald-500 shrink-0" />
            <span>Encrypted with 256-bit TLS • Firebase Auth Certified</span>
          </div>
        </div>
      </div>
    </main>
  );
}
