import {
  recordUserPresence,
  getActiveWorkspaceUsers,
} from "@/lib/presenceTracker";

describe("lib/presenceTracker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("records user as online and returns active users for workspace", () => {
    const wsId = "ws_test_1";
    recordUserPresence(wsId, "alice", "uid_alice", "online");

    const users = getActiveWorkspaceUsers(wsId);
    expect(users).toEqual([{ username: "alice", firebaseUid: "uid_alice" }]);
  });

  test("supports multiple online users in the same workspace", () => {
    const wsId = "ws_test_multi";
    recordUserPresence(wsId, "alice", "uid_alice", "online");
    recordUserPresence(wsId, "bob", "uid_bob", "online");
    recordUserPresence(wsId, "charlie", "uid_charlie", "online");

    const users = getActiveWorkspaceUsers(wsId);
    expect(users).toHaveLength(3);
    expect(users).toEqual(
      expect.arrayContaining([
        { username: "alice", firebaseUid: "uid_alice" },
        { username: "bob", firebaseUid: "uid_bob" },
        { username: "charlie", firebaseUid: "uid_charlie" },
      ])
    );
  });

  test("isolates presence between different workspaces", () => {
    const wsA = "ws_alpha";
    const wsB = "ws_beta";

    recordUserPresence(wsA, "alice", "uid_alice", "online");
    recordUserPresence(wsB, "bob", "uid_bob", "online");

    expect(getActiveWorkspaceUsers(wsA)).toEqual([
      { username: "alice", firebaseUid: "uid_alice" },
    ]);
    expect(getActiveWorkspaceUsers(wsB)).toEqual([
      { username: "bob", firebaseUid: "uid_bob" },
    ]);
  });

  test("removes user when status is updated to 'offline'", () => {
    const wsId = "ws_test_offline";
    recordUserPresence(wsId, "alice", "uid_alice", "online");
    recordUserPresence(wsId, "bob", "uid_bob", "online");

    recordUserPresence(wsId, "alice", "uid_alice", "offline");

    const users = getActiveWorkspaceUsers(wsId);
    expect(users).toEqual([{ username: "bob", firebaseUid: "uid_bob" }]);
  });

  test("cleans up stale users after TTL (30 seconds) expires", () => {
    const wsId = "ws_test_ttl";
    recordUserPresence(wsId, "alice", "uid_alice", "online");

    // Immediately active
    expect(getActiveWorkspaceUsers(wsId)).toHaveLength(1);

    // Fast-forward 31 seconds
    jest.advanceTimersByTime(31_000);

    // Stale user should be removed
    expect(getActiveWorkspaceUsers(wsId)).toHaveLength(0);
  });

  test("heartbeat/refresh keeps user active beyond initial TTL", () => {
    const wsId = "ws_test_heartbeat";
    recordUserPresence(wsId, "alice", "uid_alice", "online");

    // Advance 20 seconds
    jest.advanceTimersByTime(20_000);

    // Heartbeat received
    recordUserPresence(wsId, "alice", "uid_alice", "online");

    // Advance another 15 seconds (total 35s since start, but only 15s since last heartbeat)
    jest.advanceTimersByTime(15_000);

    const users = getActiveWorkspaceUsers(wsId);
    expect(users).toEqual([{ username: "alice", firebaseUid: "uid_alice" }]);
  });

  test("returns empty array for non-existent workspace", () => {
    expect(getActiveWorkspaceUsers("non_existent_workspace_xyz")).toEqual([]);
  });

  test("handles special characters, emojis, and unicode usernames", () => {
    const wsId = "ws_unicode";
    const emojiUser = "Alex 👩‍💻 🚀 #1";
    recordUserPresence(wsId, emojiUser, "uid_emoji", "online");

    const users = getActiveWorkspaceUsers(wsId);
    expect(users).toEqual([{ username: emojiUser, firebaseUid: "uid_emoji" }]);
  });

  test("safely handles marking an untracked user offline without error", () => {
    const wsId = "ws_untracked";
    expect(() => {
      recordUserPresence(wsId, "ghost_user", "uid_ghost", "offline");
    }).not.toThrow();
    expect(getActiveWorkspaceUsers(wsId)).toEqual([]);
  });
});
