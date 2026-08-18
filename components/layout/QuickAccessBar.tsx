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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--bg-glass)] px-4 backdrop-blur-xl transition-all">
      {/* Left: Mobile Sidebar Toggle + Brand Logo */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Toggle sidebar menu"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <Link href="/home" className="flex items-center gap-2 font-bold text-lg text-[var(--text-primary)] tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
            <Compass className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline-block bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
            NEXUS
          </span>
        </Link>
      </div>

      {/* Center / Quick Access Actions Bar */}
      <div className="flex items-center gap-2">
        {/* Quick Create Workspace */}
        <Button
          variant="glass"
          size="sm"
          onClick={onOpenCreateWorkspace}
          className="hidden sm:inline-flex gap-1.5 text-xs font-medium"
        >
          <Building2 className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>New Workspace</span>
        </Button>

        {/* Quick New Channel */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenCreateChannel}
          className="hidden md:inline-flex gap-1.5 text-xs font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Channel</span>
        </Button>

        {/* AI Assistant Direct Launch */}
        <Button
          variant="ai"
          size="sm"
          onClick={onOpenAi}
          className="gap-1.5 text-xs font-semibold"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Nexus AI</span>
        </Button>
      </div>

      {/* Right Controls: Search, Theme Toggle, Profile */}
      <div className="flex items-center gap-2">
        {/* Global Theme Switcher */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Toggle Dark/Light Mode"
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Profile Shortcut */}
        <Link href="/profile">
          <Button
            variant="outline"
            size="icon-sm"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Profile & Settings"
          >
            <User className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </header>
  );
}
