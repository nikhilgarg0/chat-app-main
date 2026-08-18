"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Sparkles, User, MessageSquare } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/home", icon: Home },
    { label: "Workspaces", href: "/workspace", icon: Building2 },
    { label: "AI Assistant", href: "/home?openAi=true", icon: Sparkles, isAi: true },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-around border-t border-[var(--border-strong)] bg-[var(--bg-glass)] px-2 backdrop-blur-2xl md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-1.5 transition-all ${
              isActive
                ? item.isAi
                  ? "text-purple-500 font-semibold"
                  : "text-[var(--accent)] font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-transform ${
                isActive ? "scale-110" : ""
              } ${item.isAi ? "bg-purple-500/10 text-purple-500" : ""}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
