"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { authFetch } from "@/lib/authFetch";

import AppSidebar from "@/components/layout/AppSidebar";
import QuickAccessBar from "@/components/layout/QuickAccessBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import SplashScreen from "@/components/ui/SplashScreen";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!auth.currentUser) {
        router.push("/login");
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(timeoutId);
      if (!currentUser) {
        router.push("/login");
      } else {
        try {
          const profRes = await authFetch(`/api/users/profile?firebaseUid=${currentUser.uid}`);
          if (profRes.ok) {
            const profData = await profRes.json();
            if (profData.user && !profData.user.onboardingComplete) {
              if (pathname !== "/onboarding") {
                router.push("/onboarding");
                return;
              }
            }
          }
        } catch (e) {}
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [router, pathname]);

  if (loading) return <SplashScreen minDurationMs={1000} onFinish={() => {}} />;


  const isOnboarding = pathname === "/onboarding";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--accent)]/30">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] relative overflow-hidden">
        {!isOnboarding && (
          <QuickAccessBar
            onOpenCreateWorkspace={() => router.push("/home?action=create-workspace")}
            onOpenCreateChannel={() => router.push("/home?action=create-channel")}
            onOpenAi={() => router.push("/home?openAi=true")}
          />
        )}
        <main className={`flex-1 overflow-y-auto ${!isOnboarding ? "pb-16 md:pb-0" : ""}`}>
          {children}
        </main>
        {!isOnboarding && <MobileBottomNav />}
      </div>
    </div>
  );
}

