"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Sparkles, 
  MessageSquare, 
  Search, 
  Sun, 
  Moon, 
  Building2, 
  User, 
  Menu,
  X,
  Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useSidebar } from "@/components/SidebarContext";

interface QuickAccessBarProps {
  onOpenCreateWorkspace?: () => void;
  onOpenCreateChannel?: () => void;
  onOpenAi?: () => void;
}

export default function QuickAccessBar({
  onOpenCreateWorkspace,
  onOpenCreateChannel,
  onOpenAi,
}: QuickAccessBarProps) {
  const { theme, setTheme } = useTheme();
  const { toggleSidebar, isSidebarOpen } = useSidebar();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex h-12 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--bg-glass)] px-4 backdrop-blur-md transition-all">
      {/* Left: Mobile Sidebar Toggle + Brand Logo */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg"
          aria-label="Toggle sidebar menu"
        >
          {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        <Link href="/home" className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] tracking-tight">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)] text-white">
            <Compass className="h-3.5 w-3.5" />
          </div>
          <span className="hidden sm:inline-block font-semibold tracking-tight text-[15px]">
            NEXUS
          </span>
        </Link>
      </div>

      {/* Center / Quick Access Actions Bar */}
      <div className="flex items-center gap-2">
        {/* Quick Create Workspace */}
        <Button
          variant="outline"
          size="xs"
          onClick={onOpenCreateWorkspace}
          className="hidden sm:inline-flex gap-1.5 text-[13px] font-medium rounded-lg"
        >
          <Building2 className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>New Workspace</span>
        </Button>

        {/* Quick New Channel */}
        <Button
          variant="outline"
          size="xs"
          onClick={onOpenCreateChannel}
          className="hidden md:inline-flex gap-1.5 text-[13px] font-medium rounded-lg"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Channel</span>
        </Button>

        {/* AI Assistant Direct Launch */}
        <Button
          variant="ai"
          size="xs"
          onClick={onOpenAi}
          className="gap-1.5 text-[13px] font-semibold rounded-lg"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Nexus AI</span>
        </Button>
      </div>

      {/* Right Controls: Search, Theme Toggle, Profile */}
      <div className="flex items-center gap-1.5">
        {/* Global Theme Switcher */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-[var(--text-secondary)] opacity-80 hover:opacity-100 rounded-lg"
          title="Toggle Dark/Light Mode"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>

        {/* Profile Shortcut */}
        <Link href="/profile">
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-[var(--text-secondary)] opacity-80 hover:opacity-100 rounded-lg"
            title="Profile & Settings"
          >
            <User className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </header>
  );
}

