// In-memory workspace presence tracker with 30s TTL cleanup

interface PresenceUser {
  username: string;
  firebaseUid: string;
  lastSeen: number;
}

// Global presence store across API invocations in Node runtime
const workspacePresenceMap = new Map<string, Map<string, PresenceUser>>();

export function recordUserPresence(workspaceId: string, username: string, firebaseUid: string, status: "online" | "offline") {
  if (!workspacePresenceMap.has(workspaceId)) {
    workspacePresenceMap.set(workspaceId, new Map());
  }

  const wsMap = workspacePresenceMap.get(workspaceId)!;

  if (status === "offline") {
    wsMap.delete(username);
  } else {
    wsMap.set(username, {
      username,
      firebaseUid,
      lastSeen: Date.now()
    });
  }

  cleanStaleUsers(workspaceId);
}

export function getActiveWorkspaceUsers(workspaceId: string): Array<{ username: string; firebaseUid: string }> {
  cleanStaleUsers(workspaceId);
  const wsMap = workspacePresenceMap.get(workspaceId);
  if (!wsMap) return [];

  return Array.from(wsMap.values()).map(u => ({
    username: u.username,
    firebaseUid: u.firebaseUid
  }));
}

function cleanStaleUsers(workspaceId: string) {
  const wsMap = workspacePresenceMap.get(workspaceId);
  if (!wsMap) return;

  const now = Date.now();
  const TTL_MS = 30000; // 30 seconds

  for (const [username, user] of wsMap.entries()) {
    if (now - user.lastSeen > TTL_MS) {
      wsMap.delete(username);
    }
  }
}
