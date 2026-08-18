"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Sparkles, 
  Building2, 
  MessageSquarePlus, 
  UserCheck, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step {
  id: string;
  title: string;
  description: string;
  actionText: string;
  actionHref: string;
  icon: React.ElementType;
  completed: boolean;
}

interface GuidedUserFlowProps {
  userProfile?: any;
  workspacesCount?: number;
  hasChannels?: boolean;
}

export default function GuidedUserFlow({
  userProfile,
  workspacesCount = 0,
  hasChannels = false,
}: GuidedUserFlowProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isProfileComplete = Boolean(
    userProfile?.displayName && (userProfile?.avatarUrl || userProfile?.bio)
  );

  const steps: Step[] = [
    {
      id: "profile",
      title: "Set Up Your Profile",
      description: "Add a display name, bio, and profile picture to stand out.",
      actionText: "Customize Profile",
      actionHref: "/profile",
      icon: UserCheck,
      completed: isProfileComplete,
    },
    {
      id: "workspace",
      title: "Create or Join a Workspace",
      description: "Workspaces are your team's central hub for channels & DMs.",
      actionText: "Go to Workspace",
      actionHref: "/home",
      icon: Building2,
      completed: workspacesCount > 0,
    },
    {
      id: "channel",
      title: "Start a Conversation",
      description: "Create a topic channel or send a direct message to a teammate.",
      actionText: "Browse Channels",
      actionHref: "/home",
      icon: MessageSquarePlus,
      completed: hasChannels,
    },
    {
      id: "ai",
      title: "Try Nexus AI Assistant",
      description: "Ask AI to draft messages, summarize discussions, or answer questions.",
      actionText: "Chat with AI",
      actionHref: "/home?openAi=true",
      icon: Sparkles,
      completed: false, // interactive prompt
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-glass)] backdrop-blur-xl p-5 shadow-lg transition-all">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Getting Started with Nexus
              </h2>
              <span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)] border border-[var(--accent)]/20">
                {completedCount}/{steps.length} Steps
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Follow these steps to unleash the full power of your team workspace.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-colors"
          aria-label="Toggle step checklist"
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface)] border border-[var(--border)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Cards Grid */}
      {!isCollapsed && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
                  step.completed
                    ? "border-green-500/30 bg-green-500/5 dark:bg-green-500/10"
                    : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/40 hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-tertiary)]">
                      Step {idx + 1}
                    </span>
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-[var(--text-tertiary)]" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      className={`h-4 w-4 ${
                        step.completed
                          ? "text-green-500"
                          : step.id === "ai"
                          ? "text-purple-500"
                          : "text-[var(--accent)]"
                      }`}
                    />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {step.title}
                    </h3>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                    {step.description}
                  </p>
                </div>

                {!step.completed ? (
                  <Link href={step.actionHref} className="w-full mt-auto">
                    <Button
                      variant={step.id === "ai" ? "ai" : "primary"}
                      size="sm"
                      className="w-full justify-between text-xs"
                    >
                      <span>{step.actionText}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 mt-auto">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Completed</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
