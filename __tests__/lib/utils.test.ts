import { cn, getErrorMessage, formatMessageTime } from "@/lib/utils";

describe("lib/utils", () => {
  describe("cn (Class Name Merging)", () => {
    test("merges single and multiple string class names", () => {
      expect(cn("px-4", "py-2")).toBe("px-4 py-2");
      expect(cn("font-bold", "text-sm", "text-center")).toBe("font-bold text-sm text-center");
    });

    test("resolves Tailwind utility conflicts using twMerge", () => {
      expect(cn("p-4", "p-8")).toBe("p-8");
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
      expect(cn("bg-red-500", "bg-emerald-600")).toBe("bg-emerald-600");
    });

    test("handles conditional objects correctly", () => {
      expect(
        cn("btn", {
          "btn-primary": true,
          "btn-disabled": false,
          "opacity-50": null as any,
        })
      ).toBe("btn btn-primary");
    });

    test("handles array inputs including nested arrays", () => {
      expect(cn(["btn", "btn-lg"], ["shadow-md", { active: true, hidden: false }])).toBe(
        "btn btn-lg shadow-md active"
      );
    });

    test("handles edge cases: empty strings, undefined, null, boolean flags, numbers", () => {
      expect(cn()).toBe("");
      expect(cn("", null, undefined, false, true)).toBe("");
      expect(cn("valid", "", null, undefined, "also-valid")).toBe("valid also-valid");
      expect(cn("count", 0 as any)).toBe("count");
    });

    test("handles special characters, unicode, and emojis in class names", () => {
      expect(cn("emoji-🔥", "data-[state=open]:bg-white", "content-['hello_world']")).toBe(
        "emoji-🔥 data-[state=open]:bg-white content-['hello_world']"
      );
    });
  });

  describe("getErrorMessage (Error Mapping)", () => {
    describe("Firebase Authentication Error Codes", () => {
      test.each([
        ["auth/invalid-credential"],
        ["auth/user-not-found"],
        ["auth/wrong-password"],
        ["auth/invalid-email"],
        ["invalid-credential"],
        ["user-not-found"],
      ])("maps '%s' to invalid credentials message", (code) => {
        expect(getErrorMessage({ code })).toBe(
          "Invalid email or password. Please check your credentials and try again."
        );
        expect(getErrorMessage(new Error(code))).toBe(
          "Invalid email or password. Please check your credentials and try again."
        );
      });

      test("maps 'too-many-requests' to rate limit message", () => {
        expect(getErrorMessage({ code: "auth/too-many-requests" })).toBe(
          "Too many failed attempts. Please wait a moment and try again."
        );
      });

      test("maps 'email-already-in-use' to duplicate account message", () => {
        expect(getErrorMessage({ code: "auth/email-already-in-use" })).toBe(
          "An account with this email already exists. Try signing in instead."
        );
      });

      test("maps 'weak-password' to password length guidance", () => {
        expect(getErrorMessage({ code: "auth/weak-password" })).toBe(
          "Password should be at least 6 characters long."
        );
      });

      test("maps 'popup-closed' to Google sign-in cancellation message", () => {
        expect(getErrorMessage({ code: "auth/popup-closed-by-user" })).toBe(
          "Google sign-in was cancelled."
        );
      });

      test("maps 'network-request-failed' to network connectivity message", () => {
        expect(getErrorMessage({ code: "auth/network-request-failed" })).toBe(
          "Network connection issue. Please check your internet connection and try again."
        );
      });

      test("maps unhandled Firebase raw errors starting with 'Firebase:' to general auth error", () => {
        expect(getErrorMessage({ message: "Firebase: Error (auth/internal-error)." })).toBe(
          "Authentication failed. Please check your account details."
        );
      });
    });

    describe("Authorization & Permission Errors", () => {
      test.each(["Unauthorized", "401", "unauthorized"])(
        "maps '%s' to session re-authentication message",
        (code) => {
          expect(getErrorMessage({ message: `Request failed with ${code}` })).toBe(
            "Your session requires re-authentication. Please refresh or sign in again."
          );
        }
      );

      test.each(["Forbidden", "403", "forbidden"])(
        "maps '%s' to permission denied message",
        (code) => {
          expect(getErrorMessage({ message: `Access ${code}` })).toBe(
            "You do not have permission to perform this action or access this workspace."
          );
        }
      );

      test.each(["Workspace not found", "User not found"])(
        "maps '%s' to not found message",
        (code) => {
          expect(getErrorMessage({ message: code })).toBe(
            "The requested workspace or user profile could not be found."
          );
        }
      );

      test("maps 'Internal Server Error' to server error message", () => {
        expect(getErrorMessage({ message: "500 Internal Server Error" })).toBe(
          "An unexpected server error occurred. Please try again in a few moments."
        );
      });
    });

    describe("Custom strings and Pass-through messages", () => {
      test("returns raw custom error message if passed in an object or Error instance", () => {
        const customMsg = "Custom payment failure: Card expired";
        expect(getErrorMessage({ message: customMsg })).toBe(customMsg);
        expect(getErrorMessage(new Error(customMsg))).toBe(customMsg);
      });

      test("prefers 'code' over 'message' if code is present", () => {
        const errorObj = {
          code: "auth/too-many-requests",
          message: "Generic message",
        };
        expect(getErrorMessage(errorObj)).toBe(
          "Too many failed attempts. Please wait a moment and try again."
        );
      });
    });

    describe("Edge Cases & Malformed Inputs", () => {
      test("handles null and undefined gracefully", () => {
        expect(getErrorMessage(null)).toBe("An unexpected error occurred. Please try again.");
        expect(getErrorMessage(undefined)).toBe("An unexpected error occurred. Please try again.");
      });

      test("handles empty objects, empty strings, and empty messages", () => {
        expect(getErrorMessage({})).toBe("An unexpected error occurred. Please try again.");
        expect(getErrorMessage("")).toBe("An unexpected error occurred. Please try again.");
        expect(getErrorMessage({ message: "" })).toBe("An unexpected error occurred. Please try again.");
        expect(getErrorMessage({ code: "" })).toBe("An unexpected error occurred. Please try again.");
      });

      test("handles non-string code/message types safely", () => {
        expect(getErrorMessage({ code: 500 })).toBe("An unexpected error occurred.");
        expect(getErrorMessage({ code: null, message: {} })).toBe("An unexpected error occurred.");
        expect(getErrorMessage(12345)).toBe("An unexpected error occurred. Please try again.");
        expect(getErrorMessage(true)).toBe("An unexpected error occurred. Please try again.");
      });

      test("handles special characters, emojis, and very long input strings in Error objects", () => {
        const emojiError = "🔥 Failed with code #999 [Special characters: <>&\"\'] 🚀";
        expect(getErrorMessage(new Error(emojiError))).toBe(emojiError);
        expect(getErrorMessage({ message: emojiError })).toBe(emojiError);

        const longError = "A".repeat(5000);
        expect(getErrorMessage(new Error(longError))).toBe(longError);
      });

      test("falls back to generic error when a raw string primitive is passed (since string has no .code or .message property)", () => {
        // Explaining ambiguous behavior: string primitives do not have .code or .message properties
        expect(getErrorMessage("raw string error")).toBe(
          "An unexpected error occurred. Please try again."
        );
      });
    });
  });

  describe("formatMessageTime (Timestamp Formatting)", () => {
    test("formats valid Date objects to localized 12-hour time format", () => {
      const date = new Date(2026, 7, 19, 14, 30, 0); // 2:30 PM
      const formatted = formatMessageTime(date);
      expect(formatted).toMatch(/2:30\s?PM/i);
    });

    test("formats morning and midnight times correctly", () => {
      const midnight = new Date(2026, 0, 1, 0, 5, 0); // 12:05 AM
      expect(formatMessageTime(midnight)).toMatch(/12:05\s?AM/i);

      const morning = new Date(2026, 0, 1, 9, 15, 0); // 9:15 AM
      expect(formatMessageTime(morning)).toMatch(/9:15\s?AM/i);
    });

    test("formats valid ISO timestamp strings", () => {
      const iso = "2026-08-19T14:30:00.000Z";
      const formatted = formatMessageTime(iso);
      expect(formatted).toBeTruthy();
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    test("handles edge cases: null, undefined, empty string", () => {
      expect(formatMessageTime(null)).toBe("");
      expect(formatMessageTime(undefined)).toBe("");
      expect(formatMessageTime("")).toBe("");
    });

    test("falls back to raw string when string parsing fails or is invalid", () => {
      expect(formatMessageTime("not-a-valid-date")).toBe("not-a-valid-date");
      expect(formatMessageTime("2026-99-99T99:99:99")).toBe("2026-99-99T99:99:99");
    });

    test("handles strings with special characters and emojis gracefully", () => {
      const specialString = "💬 2026/08/19 @ 14:00 ⚡";
      const result = formatMessageTime(specialString);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    test("falls back to String(Date) for Invalid Date object", () => {
      const invalidDate = new Date("invalid date string");
      expect(formatMessageTime(invalidDate)).toBe("Invalid Date");
    });
  });
});
