"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import PageLoader from "@/components/ui/PageLoader";

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
    <main className="flex min-h-[100dvh] w-full bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden">
      {/* ── Left Panel — Vibrant Brand Art ────────────────── */}
      <div className="hidden lg:flex flex-1 relative m-4 mr-0">
        {/* Rounded art panel */}
        <div className="relative w-full rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)]">
          {/* Background image */}
          <img
            src="/auth-bg.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#001223]/90 via-[#001223]/40 to-transparent" />

          {/* Top branding */}
          <div className="relative z-10 p-8 flex items-center gap-3">
            <Image src="/logos/Logo_White.png" alt="Nexus" width={24} height={24} className="object-contain opacity-90" />
            <Image src="/logos/Wordmark_White.png" alt="Nexus" width={70} height={18} className="object-contain opacity-70" />
          </div>

          {/* Bottom quote text */}
          <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
            <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-white mb-2">
              Connect. Collaborate. Create.
            </h2>
            <p className="text-white/60 text-sm max-w-xs leading-relaxed">
              Your team&apos;s second brain — secure, fast, and remarkably intelligent.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Form ───────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-16 xl:px-24 py-8 relative">
        <div className="w-full max-w-[380px] relative z-10 flex flex-col gap-6 p-6 sm:p-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Image src="/logos/Logo_White.png" alt="Nexus" width={24} height={24} className="object-contain" />
              <Image src="/logos/Wordmark_White.png" alt="Nexus" width={70} height={18} className="object-contain" />
            </div>
          </div>

          {/* Desktop brand */}
          <div className="hidden lg:flex items-center gap-2 mb-2">
            <Image src="/logos/Logo_White.png" alt="Nexus" width={24} height={24} className="object-contain" />
            <Image src="/logos/Wordmark_White.png" alt="Nexus" width={70} height={18} className="object-contain" />
          </div>

          {children}
        </div>
      </div>
    </main>
  );

}
