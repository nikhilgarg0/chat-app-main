import { EventEmitter } from "events";

export type ConnectionState =
  | "initialized"
  | "connecting"
  | "connected"
  | "unavailable"
  | "failed"
  | "disconnected";

export interface StateChangeEvent {
  previous: ConnectionState;
  current: ConnectionState;
}

export type EventCallback = (data: any) => void;

/**
 * In-memory representation of a Pusher Channel.
 */
export class FakePusherChannel extends EventEmitter {
  name: string;
  isSubscribed: boolean = false;
  members?: Map<string, any>;

  constructor(name: string) {
    super();
    this.name = name;
    if (name.startsWith("presence-")) {
      this.members = new Map();
    }
  }

  bind(eventName: string, callback: EventCallback): this {
    this.on(eventName, callback);
    return this;
  }

  unbind(eventName?: string, callback?: EventCallback): this {
    if (!eventName) {
      this.removeAllListeners();
    } else if (callback) {
      this.off(eventName, callback);
    } else {
      this.removeAllListeners(eventName);
    }
    return this;
  }

  unbind_all(): this {
    this.removeAllListeners();
    return this;
  }

  /**
   * Internal method to dispatch an event to listeners.
   */
  emitEvent(eventName: string, data: any): void {
    this.emit(eventName, data);
  }
}

/**
 * Fake Pusher Connection state manager.
 */
export class FakePusherConnection extends EventEmitter {
  state: ConnectionState = "initialized";

  bind(eventName: string, callback: (event: any) => void): this {
    this.on(eventName, callback);
    return this;
  }

  unbind(eventName: string, callback?: (event: any) => void): this {
    if (callback) {
      this.off(eventName, callback);
    } else {
      this.removeAllListeners(eventName);
    }
    return this;
  }

  setState(newState: ConnectionState): void {
    const previous = this.state;
    this.state = newState;
    this.emit("state_change", { previous, current: newState });
    this.emit(newState);
  }
}

/**
 * Fake Pusher Client replicating pusher-js for isolated unit and integration testing.
 */
export class FakePusherClient {
  key: string;
  options: any;
  channels: Map<string, FakePusherChannel> = new Map();
  connection: FakePusherConnection = new FakePusherConnection();

  /** Channel authorization rules for testing auth failure (private/presence) */
  private channelAuthRules: Map<string, boolean> = new Map();

  constructor(key: string = "mock-key", options: any = {}) {
    this.key = key;
    this.options = options;
    // Automatically transition to connected state on startup
    this.connection.setState("connected");
  }

  /**
   * Configure whether authorization should succeed or fail for a channel.
   */
  setChannelAuthorization(channelName: string, isAuthorized: boolean): void {
    this.channelAuthRules.set(channelName, isAuthorized);
  }

  subscribe(channelName: string): FakePusherChannel {
    let channel = this.channels.get(channelName);
    if (!channel) {
      channel = new FakePusherChannel(channelName);
      this.channels.set(channelName, channel);
    }

    // Check if channel is private/presence and if authorization is denied
    const isPrivate = channelName.startsWith("private-") || channelName.startsWith("presence-");
    const isAuthorized = this.channelAuthRules.has(channelName)
      ? this.channelAuthRules.get(channelName)!
      : true;

    // Asynchronously trigger subscription success or error
    process.nextTick(() => {
      if (isPrivate && !isAuthorized) {
        channel!.isSubscribed = false;
        channel!.emit("pusher:subscription_error", {
          status: 403,
          error: "Channel authorization failed: Forbidden",
        });
      } else {
        channel!.isSubscribed = true;
        channel!.emit("pusher:subscription_succeeded", {
          channel: channelName,
        });
      }
    });

    return channel;
  }

  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.isSubscribed = false;
      channel.unbind_all();
      this.channels.delete(channelName);
    }
  }

  channel(channelName: string): FakePusherChannel | undefined {
    return this.channels.get(channelName);
  }

  allChannels(): FakePusherChannel[] {
    return Array.from(this.channels.values());
  }

  disconnect(): void {
    this.connection.setState("disconnected");
  }

  connect(): void {
    this.connection.setState("connecting");
    process.nextTick(() => {
      this.connection.setState("connected");
    });
  }
}

/**
 * Fake Pusher Server for triggering server-side events to subscribers in testing.
 */
export class FakePusherServer {
  private clientInstance: FakePusherClient;

  constructor(clientInstance: FakePusherClient) {
    this.clientInstance = clientInstance;
  }

  async trigger(channelName: string | string[], eventName: string, data: any): Promise<void> {
    const channels = Array.isArray(channelName) ? channelName : [channelName];

    for (const chName of channels) {
      const channel = this.clientInstance.channels.get(chName);
      if (channel) {
        channel.emitEvent(eventName, data);
      }
    }
  }
}

/**
 * Reusable test helper providing a synchronized Fake Client + Server Pusher ecosystem.
 */
export function createFakePusherEnvironment(key: string = "mock-key", options: any = {}) {
  const client = new FakePusherClient(key, options);
  const server = new FakePusherServer(client);

  return {
    client,
    server,
    simulateDisconnect: () => client.connection.setState("unavailable"),
    simulateReconnect: () => client.connection.setState("connected"),
    simulateServerEvent: (channelName: string, eventName: string, data: any) =>
      server.trigger(channelName, eventName, data),
    reset: () => {
      for (const channel of client.channels.values()) {
        channel.unbind_all();
      }
      client.channels.clear();
      client.connection.removeAllListeners();
      client.connection.setState("connected");
    },
  };
}
