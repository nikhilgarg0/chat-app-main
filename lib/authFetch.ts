import { getAuth } from "firebase/auth";

export async function authFetch(url: string, options: RequestInit = {}) {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  let token: string | undefined;

  if (currentUser) {
    try {
      token = await currentUser.getIdToken();
    } catch (err) {
      console.warn(`[authFetch Warning] Could not retrieve ID token for ${url}:`, err);
    }
  }

  // Ensure firebaseUid query param is present as fallback if missing
  let targetUrl = url;
  if (currentUser?.uid && !url.includes("firebaseUid=")) {
    const separator = url.includes("?") ? "&" : "?";
    targetUrl = `${url}${separator}firebaseUid=${encodeURIComponent(currentUser.uid)}`;
  }

  const res = await fetch(targetUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // Log explicit diagnostic message to developer console if request fails
  if (!res.ok) {
    let serverErrorDetails = "";
    try {
      const clonedRes = res.clone();
      const errorData = await clonedRes.json();
      serverErrorDetails = errorData.error || errorData.message || "";
    } catch {
      serverErrorDetails = res.statusText;
    }

    console.error(
      `[Developer Diagnostic Logger] API Request Failed:\n` +
      `  • Endpoint: ${options.method || "GET"} ${url}\n` +
      `  • Status Code: ${res.status} ${res.statusText}\n` +
      `  • User Auth Status: ${currentUser ? `Logged in (UID: ${currentUser.uid})` : "Not Authenticated"}\n` +
      `  • Token Provided: ${Boolean(token)}\n` +
      `  • Server Error: ${serverErrorDetails || "Unauthorized or Internal Server Error"}`
    );
  }

  return res;
}