"use client";

import { useEffect, useState } from "react";

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

  const isError =
    type === "error" ||
    (message.toLowerCase().includes("error") && !message.toLowerCase().includes("no error")) ||
    message.toLowerCase().includes("failed");

  const isSuccess =
    type === "success" ||
    message.toLowerCase().includes("success") ||
    message.toLowerCase().includes("copied") ||
    message.toLowerCase().includes("exported");

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-lg border text-[13px] font-medium transition-all duration-200 shadow-lg pointer-events-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${
        isError
          ? "bg-red-500/10 border-red-500/20 text-red-500"
          : isSuccess
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-primary)]"
      }`}
    >
      {message}
    </div>
  );
}

