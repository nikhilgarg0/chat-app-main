import { auth } from "./firebase";

export async function uploadAvatar(file: File, firebaseUid: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Image must be smaller than 2MB.");
  }

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not authenticated");

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload/avatar", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to upload avatar");
  }

  const data = await res.json();
  return data.url;
}
