"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export default function SplashScreen({
  onFinish,
  minDurationMs = 1200,
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const finishTimer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 400); // match transition duration
      return () => clearTimeout(finishTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)] transition-opacity duration-400 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Radial glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-[radial-gradient(circle,rgba(37,99,235,0.2)_0%,transparent_70%)] pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center gap-6 animate-slide-up">
        {/* Animated Brand Mark */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-[var(--accent)]/20 blur-xl animate-pulse" />
          <div className="relative p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl">
            <Image
              src="/logos/Logo_White.png"
              alt="Nexus Logo"
              width={56}
              height={56}
              className="object-contain"
              priority
            />
          </div>
        </div>


        {/* Wordmark */}
        <Image
          src="/logos/Wordmark_White.png"
          alt="Nexus"
          width={120}
          height={32}
          className="object-contain opacity-95"
          priority
        />

        {/* Tagline & Progress Bar */}
        <div className="flex flex-col items-center gap-3 mt-2">
          <p className="text-[13px] font-medium text-[#CEE2FF]/70 tracking-wide">
            Connecting your team workspace...
          </p>

          <div className="w-36 h-1 bg-[#002E4D] rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0073B5] via-[#0099EE] to-[#81BDFF] animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
