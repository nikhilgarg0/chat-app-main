"use client";

import { useEffect, useState } from "react";

import { getErrorMessage } from "@/lib/utils";

interface ToastProps {
  message: string;
  type?: "info" | "error" | "success";
  onDone: () => void;
}

export default function Toast({ message, type = "info", onDone }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(false), 2600);
    const doneTimer = setTimeout(() => onDone(), 2900);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  const displayMsg = getErrorMessage(message);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-lg border text-[13px] font-medium transition-all duration-200 shadow-lg pointer-events-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${
        type === "error" || displayMsg.includes("failed") || displayMsg.includes("expired") || displayMsg.includes("Error")
          ? "bg-red-500/10 border-red-500/20 text-red-500"
          : "bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-primary)]"
      }`}
    >
      {displayMsg}
    </div>
  );
}

