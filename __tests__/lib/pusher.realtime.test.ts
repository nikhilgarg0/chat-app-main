import {
  createFakePusherEnvironment,
  FakePusherClient,
  FakePusherServer,
} from "@/__tests__/setup/fakePusher";

describe("Pusher Real-Time Message Delivery & Lifecycle Testing (In Isolation)", () => {
  let fakePusher: ReturnType<typeof createFakePusherEnvironment>;

  beforeEach(() => {
    fakePusher = createFakePusherEnvironment("test-key", { cluster: "mt1" });
  });

  afterEach(() => {
    fakePusher.reset();
  });

  describe("1. Channel Subscription & Server Trigger", () => {
    test("simulates client subscribing to a channel and receiving subscription success event", async () => {
      const channel = fakePusher.client.subscribe("chat-general");
      const successCallback = jest.fn();

      channel.bind("pusher:subscription_succeeded", successCallback);

      // Wait for async subscription event
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(successCallback).toHaveBeenCalledTimes(1);
      expect(successCallback).toHaveBeenCalledWith({ channel: "chat-general" });
      expect(channel.isSubscribed).toBe(true);
    });

    test("simulates server-side trigger event and asserts client callback receives exact payload", async () => {
      const channel = fakePusher.client.subscribe("chat-channel-123");
      const messageCallback = jest.fn();

      channel.bind("new-message", messageCallback);

      const payload = {
        _id: "msg_abc_999",
        channelId: "chat-channel-123",
        author: "Alice",
        content: "Testing real-time delivery in isolation 🚀",
        timestamp: "2026-08-19T10:00:00.000Z",
        avatarUrl: "https://example.com/alice.png",
      };

      // Server triggers event
      await fakePusher.server.trigger("chat-channel-123", "new-message", payload);

      expect(messageCallback).toHaveBeenCalledTimes(1);
      expect(messageCallback).toHaveBeenCalledWith(payload);
    });

    test("broadcasts server events to multiple subscribers on the same channel", async () => {
      const client1 = fakePusher.client;
      const client2 = new FakePusherClient("key-2");
      // Connect client2 to the server
      const sharedServer = new FakePusherServer(client1);

      const ch1 = client1.subscribe("chat-shared");
      const ch2 = client2.subscribe("chat-shared");

      const cb1 = jest.fn();
      const cb2 = jest.fn();

      ch1.bind("new-message", cb1);
      ch2.bind("new-message", cb2);

      // Trigger via client1 and client2 directly
      ch1.emitEvent("new-message", { content: "Shared message" });
      ch2.emitEvent("new-message", { content: "Shared message" });

      expect(cb1).toHaveBeenCalledWith({ content: "Shared message" });
      expect(cb2).toHaveBeenCalledWith({ content: "Shared message" });
    });

    test("maintains channel isolation (events on Channel A do not leak to Channel B)", async () => {
      const chA = fakePusher.client.subscribe("chat-room-a");
      const chB = fakePusher.client.subscribe("chat-room-b");

      const cbA = jest.fn();
      const cbB = jest.fn();

      chA.bind("new-message", cbA);
      chB.bind("new-message", cbB);

      // Trigger only Room A
      await fakePusher.server.trigger("chat-room-a", "new-message", { text: "For Room A only" });

      expect(cbA).toHaveBeenCalledTimes(1);
      expect(cbA).toHaveBeenCalledWith({ text: "For Room A only" });
      expect(cbB).not.toHaveBeenCalled();
    });
  });

  describe("2. Channel Authorization Failure (Private & Presence Channels)", () => {
    test("triggers 'pusher:subscription_error' when private channel authorization fails (403 Forbidden)", async () => {
      const privateChannelName = "private-restricted-workspace";

      // Deny authorization for this channel
      fakePusher.client.setChannelAuthorization(privateChannelName, false);

      const channel = fakePusher.client.subscribe(privateChannelName);
      const errorCallback = jest.fn();
      const successCallback = jest.fn();

      channel.bind("pusher:subscription_error", errorCallback);
      channel.bind("pusher:subscription_succeeded", successCallback);

      // Wait for async auth resolution
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(errorCallback).toHaveBeenCalledWith({
        status: 403,
        error: expect.stringContaining("Forbidden"),
      });
      expect(successCallback).not.toHaveBeenCalled();
      expect(channel.isSubscribed).toBe(false);
    });

    test("allows private channel subscription when authorization succeeds", async () => {
      const privateChannelName = "private-allowed-workspace";

      // Explicitly allow authorization
      fakePusher.client.setChannelAuthorization(privateChannelName, true);

      const channel = fakePusher.client.subscribe(privateChannelName);
      const successCallback = jest.fn();
      const errorCallback = jest.fn();

      channel.bind("pusher:subscription_succeeded", successCallback);
      channel.bind("pusher:subscription_error", errorCallback);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(successCallback).toHaveBeenCalledTimes(1);
      expect(errorCallback).not.toHaveBeenCalled();
      expect(channel.isSubscribed).toBe(true);
    });
  });

  describe("3. Connection Lifecycle: Drop & Reconnection State Machine", () => {
    test("tracks connection state transitions during disconnect and reconnection", () => {
      const stateChangeCallback = jest.fn();
      fakePusher.client.connection.bind("state_change", stateChangeCallback);

      // Initial state is 'connected'
      expect(fakePusher.client.connection.state).toBe("connected");

      // 1. Simulate network drop
      fakePusher.simulateDisconnect();
      expect(fakePusher.client.connection.state).toBe("unavailable");
      expect(stateChangeCallback).toHaveBeenCalledWith({
        previous: "connected",
        current: "unavailable",
      });

      // 2. Simulate reconnection
      fakePusher.simulateReconnect();
      expect(fakePusher.client.connection.state).toBe("connected");
      expect(stateChangeCallback).toHaveBeenCalledWith({
        previous: "unavailable",
        current: "connected",
      });

      expect(stateChangeCallback).toHaveBeenCalledTimes(2);
    });

    test("delivers real-time messages successfully after reconnection", async () => {
      const channel = fakePusher.client.subscribe("chat-recovery");
      const messageCallback = jest.fn();
      channel.bind("new-message", messageCallback);

      // Drop connection
      fakePusher.simulateDisconnect();

      // Restore connection
      fakePusher.simulateReconnect();

      // Send new message after recovery
      const postRecoveryPayload = { content: "Message sent after reconnection ✅" };
      await fakePusher.server.trigger("chat-recovery", "new-message", postRecoveryPayload);

      expect(messageCallback).toHaveBeenCalledWith(postRecoveryPayload);
    });
  });

  describe("4. Cleanup & Event Unbinding", () => {
    test("unbinds specific event callback without affecting other listeners", async () => {
      const channel = fakePusher.client.subscribe("chat-events");
      const cb1 = jest.fn();
      const cb2 = jest.fn();

      channel.bind("new-message", cb1);
      channel.bind("new-message", cb2);

      // Unbind only cb1
      channel.unbind("new-message", cb1);

      await fakePusher.server.trigger("chat-events", "new-message", { test: true });

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledWith({ test: true });
    });

    test("unsubscribing removes channel and prevents subsequent event execution", async () => {
      const channel = fakePusher.client.subscribe("chat-temporary");
      const callback = jest.fn();
      channel.bind("new-message", callback);

      fakePusher.client.unsubscribe("chat-temporary");

      await fakePusher.server.trigger("chat-temporary", "new-message", { text: "Should not arrive" });

      expect(callback).not.toHaveBeenCalled();
      expect(fakePusher.client.channel("chat-temporary")).toBeUndefined();
    });
  });
});
