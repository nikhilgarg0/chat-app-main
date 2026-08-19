import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Map raw Firebase/API error codes to user-friendly messages */
export function getErrorMessage(err: unknown): string {
  const code =
    (err as { code?: string })?.code ||
    (err as { message?: string })?.message ||
    "";
  if (typeof code !== "string") return "An unexpected error occurred.";

  if (
    code.includes("invalid-credential") ||
    code.includes("user-not-found") ||
    code.includes("wrong-password") ||
    code.includes("auth/invalid-email")
  )
    return "Invalid email or password. Please check your credentials and try again.";
  if (code.includes("too-many-requests"))
    return "Too many failed attempts. Please wait a moment and try again.";
  if (code.includes("email-already-in-use"))
    return "An account with this email already exists. Try signing in instead.";
  if (code.includes("weak-password"))
    return "Password should be at least 6 characters long.";
  if (code.includes("popup-closed")) return "Google sign-in was cancelled.";
  if (code.includes("network-request-failed"))
    return "Network connection issue. Please check your internet connection and try again.";

  // Authorization & Permission Errors
  if (code.includes("Unauthorized") || code.includes("401") || code.includes("unauthorized"))
    return "Your session requires re-authentication. Please refresh or sign in again.";
  if (code.includes("Forbidden") || code.includes("403") || code.includes("forbidden"))
    return "You do not have permission to perform this action or access this workspace.";
  if (code.includes("Workspace not found") || code.includes("User not found"))
    return "The requested workspace or user profile could not be found.";

  // Generic server error
  if (code.includes("Internal Server Error"))
    return "An unexpected server error occurred. Please try again in a few moments.";

  // Fallback for raw Firebase errors
  if (code.startsWith("Firebase:"))
    return "Authentication failed. Please check your account details.";

  return code || "An unexpected error occurred. Please try again.";
}


/**
 * Format an ISO timestamp (or Date) for display in the user's local timezone.
 * Falls back to the raw string if parsing fails.
 */
export function formatMessageTime(
  isoOrDate: string | Date | undefined | null
): string {
  if (!isoOrDate) return "";
  try {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) return String(isoOrDate);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return String(isoOrDate);
  }
}
