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
    <div className="sticky top-2 sm:top-4 z-30 w-full flex items-center justify-between px-2 sm:px-6 pointer-events-none mb-2">
      {/* Left Floating Action Pod (Mobile Sidebar Toggle) */}
      <div className="pointer-events-auto md:hidden flex items-center gap-1 sm:gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-glass)] p-1 sm:p-1.5 backdrop-blur-2xl shadow-lg transition-all">
        {/* Mobile Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleSidebar}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full apple-press"
          aria-label="Toggle sidebar menu"
        >
          {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Right Floating Action Pod */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-glass)] p-1 sm:p-1.5 backdrop-blur-2xl shadow-lg transition-all">
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
    </div>




  );
}

