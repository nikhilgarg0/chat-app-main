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
import BrandLogo from "@/components/ui/BrandLogo";
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
    <div className="sticky top-3 z-30 w-full flex justify-center px-4 pointer-events-none mb-2">
      <header className="pointer-events-auto flex h-11 items-center justify-between gap-3 sm:gap-4 rounded-full border border-[var(--border)] bg-[var(--bg-glass)] px-3.5 sm:px-4 backdrop-blur-2xl shadow-lg transition-all max-w-4xl w-full">
        {/* Left: Mobile Sidebar Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleSidebar}
            className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full apple-press"
            aria-label="Toggle sidebar menu"
          >
            {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>


        {/* Center / Quick Access Actions Bar */}
        <div className="flex items-center gap-2">
          {/* Quick Create Workspace */}
          <Button
            variant="ghost"
            size="xs"
            onClick={onOpenCreateWorkspace}
            className="hidden sm:inline-flex gap-1.5 text-[13px] font-medium rounded-full bg-[var(--bg-elevated)]/60 hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] apple-press px-3"
          >
            <Building2 className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>New Workspace</span>
          </Button>

          {/* Quick New Channel */}
          <Button
            variant="ghost"
            size="xs"
            onClick={onOpenCreateChannel}
            className="hidden md:inline-flex gap-1.5 text-[13px] font-medium rounded-full bg-[var(--bg-elevated)]/60 hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] apple-press px-3"
          >
            <Plus className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            <span>New Channel</span>
          </Button>
        </div>

        <div className="h-4 w-px bg-[var(--border)] shrink-0" />

        {/* Right Controls: Theme Toggle & Profile */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Global Theme Switcher */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full apple-press"
            title="Toggle Dark/Light Mode"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>

          {/* Profile Shortcut */}
          <Link href="/profile">
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full apple-press"
              title="Profile & Settings"
            >
              <User className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>
    </div>


  );
}

