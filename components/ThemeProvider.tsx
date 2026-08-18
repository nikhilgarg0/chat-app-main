"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { auth } from "@/lib/firebase";

type ThemeState = "light" | "dark" | "system";

type ThemeContextType = {
  theme: ThemeState;
  setTheme: (value: ThemeState) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeState>("system");
  const [mounted, setMounted] = useState(false);

  const applyThemeClass = (t: ThemeState) => {
    if (t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    setMounted(true);

    // Immediately sync theme state from the DOM so the first render after
    // mounting reflects the real visual state (avoids wrong logo/toggle flash).
    const alreadyDark = document.documentElement.classList.contains("dark");
    if (alreadyDark) {
      setThemeState("dark");
    }

    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const res = await authFetch(`/api/users/profile?firebaseUid=${user.uid}`);
          const data = await res.json();
          if (data.success && data.user?.theme) {
            if (["light", "dark", "system"].includes(data.user.theme)) {
              setThemeState(data.user.theme);
              applyThemeClass(data.user.theme);
            }
          } else {
            applyThemeClass("system");
          }
        } catch (e) {
          applyThemeClass("system");
        }
      } else {
        applyThemeClass("system");
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (theme === "system" && mounted) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyThemeClass("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme, mounted]);

  const setTheme = (value: ThemeState) => {
    setThemeState(value);
    applyThemeClass(value);
    
    if (auth.currentUser) {
      authFetch("/api/users/profile", {
        method: "POST",
        body: JSON.stringify({
          firebaseUid: auth.currentUser.uid,
          email: auth.currentUser.email || "no-email@example.com",
          displayName: auth.currentUser.displayName || "User",
          theme: value
        })
      }).catch(console.error);
    }
  };

  const toggleTheme = () => {
    const nextMap: Record<ThemeState, ThemeState> = {
      light: "dark",
      dark: "system",
      system: "light"
    };
    setTheme(nextMap[theme]);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
