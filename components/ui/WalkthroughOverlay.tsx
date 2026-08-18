"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Layers, Hash, User, Home, Check } from "lucide-react";

type Step = {
  icon: React.ReactNode;
  emoji: string;
  title: string;
  description: string;
  tip: string;
  color: string; // tailwind gradient from-color
  accentColor: string; // for icon bg
};

const STEPS: Step[] = [
  {
    icon: <Home className="w-6 h-6" />,
    emoji: "🏠",
    title: "Your Home Dashboard",
    description:
      "This is your home base. From here you can see all the workspaces you belong to and create new ones.",
    tip: "Click any workspace card to jump straight into it.",
    color: "from-blue-500/20 to-indigo-500/10",
    accentColor: "bg-blue-500/15 text-blue-400",
  },
  {
    icon: <Layers className="w-6 h-6" />,
    emoji: "🏢",
    title: "Workspaces",
    description:
      "Workspaces are where teams live. Create one for your company, project, or group — or join an existing one with an invite code.",
    tip: 'Hit "New Workspace" on the home page or paste an invite code to join.',
    color: "from-purple-500/20 to-violet-500/10",
    accentColor: "bg-purple-500/15 text-purple-400",
  },
  {
    icon: <Hash className="w-6 h-6" />,
    emoji: "#",
    title: "Channels",
    description:
      "Inside each workspace you'll find channels — dedicated spaces for topics, projects or teams. Click the + in the sidebar to create one.",
    tip: "Use the Browse button in the sidebar to discover all channels in a workspace.",
    color: "from-green-500/20 to-emerald-500/10",
    accentColor: "bg-green-500/15 text-green-400",
  },
  {
    icon: <User className="w-6 h-6" />,
    emoji: "✨",
    title: "Your Profile",
    description:
      "Personalise your avatar, bio, social links, timezone and status. Click your name at the bottom-left of the sidebar anytime.",
    tip: "Set a custom status so teammates know what you're up to.",
    color: "from-orange-500/20 to-amber-500/10",
    accentColor: "bg-orange-500/15 text-orange-400",
  },
];

interface Props {
  onDone: () => void;
}

export default function WalkthroughOverlay({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const goNext = () => {
    if (isLast) {
      finish();
    } else {
      setAnimKey((k) => k + 1);
      setStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (step === 0) return;
    setAnimKey((k) => k + 1);
    setStep((s) => s - 1);
  };

  const finish = () => {
    setExiting(true);
    setTimeout(onDone, 350);
  };

  // keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step]);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center transition-all duration-350 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={finish}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md mx-4"
        style={{ animation: "walkthroughIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
      >
        {/* Dismiss */}
        <button
          onClick={finish}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all shadow-lg"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl">
          {/* Hero area */}
          <div className={`relative h-44 bg-gradient-to-br ${current.color} flex items-center justify-center overflow-hidden`}>
            {/* Decorative blobs */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5 blur-xl" />

            {/* Big emoji step indicator */}
            <div
              key={`emoji-${animKey}`}
              className="relative flex flex-col items-center gap-3"
              style={{ animation: "stepSlideIn 0.35s ease forwards" }}
            >
              <div className={`w-20 h-20 rounded-2xl ${current.accentColor} border border-white/10 flex items-center justify-center text-4xl shadow-xl`}>
                {current.emoji}
              </div>
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-full px-4 py-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setAnimKey(k => k + 1); setStep(i); }}
                    className={`rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-6 h-2 bg-white"
                        : i < step
                        ? "w-2 h-2 bg-white/60"
                        : "w-2 h-2 bg-white/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div
              key={`content-${animKey}`}
              style={{ animation: "stepSlideIn 0.35s ease forwards" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest">
                  Step {step + 1} of {STEPS.length}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                {current.title}
              </h2>
              <p className="text-[var(--text-secondary)] text-[14px] leading-relaxed mb-4">
                {current.description}
              </p>

              {/* Tip pill */}
              <div className="flex items-start gap-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-3">
                <span className="text-base shrink-0 mt-0.5">💡</span>
                <p className="text-[13px] text-[var(--text-secondary)] leading-snug">
                  {current.tip}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-5">
              <button
                onClick={goPrev}
                disabled={step === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <button
                onClick={goNext}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-semibold transition-all active:scale-[0.97] shadow-lg shadow-[var(--accent)]/20"
              >
                {isLast ? (
                  <>
                    <Check className="w-4 h-4" />
                    Let's go!
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Skip link */}
        <button
          onClick={finish}
          className="w-full mt-3 text-center text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Skip walkthrough
        </button>
      </div>

      <style>{`
        @keyframes walkthroughIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes stepSlideIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
