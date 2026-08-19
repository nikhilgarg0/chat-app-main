import {
  requestNotificationPermission,
  showNotification,
  playNotificationSound,
} from "@/lib/notifications";

describe("lib/notifications", () => {
  const originalWindow = (global as any).window;
  const originalNotification = (global as any).Notification;
  const originalAudioContext = (global as any).AudioContext;

  beforeEach(() => {
    (global as any).window = {};
    delete (global as any).Notification;
  });

  afterEach(() => {
    (global as any).window = originalWindow;
    (global as any).Notification = originalNotification;
    (global as any).AudioContext = originalAudioContext;
    jest.restoreAllMocks();
  });

  describe("requestNotificationPermission", () => {
    test("returns false when Notification is not supported on window", async () => {
      delete (global.window as any).Notification;
      delete (global as any).Notification;
      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });

    test("returns true immediately if permission is already 'granted'", async () => {
      const mockNotification = {
        permission: "granted",
        requestPermission: jest.fn(),
      };
      (global.window as any).Notification = mockNotification;
      (global as any).Notification = mockNotification;

      const result = await requestNotificationPermission();
      expect(result).toBe(true);
      expect(mockNotification.requestPermission).not.toHaveBeenCalled();
    });

    test("requests permission and returns true when user accepts", async () => {
      const mockRequestPermission = jest.fn().mockResolvedValue("granted");
      const mockNotification = {
        permission: "default",
        requestPermission: mockRequestPermission,
      };
      (global.window as any).Notification = mockNotification;
      (global as any).Notification = mockNotification;

      const result = await requestNotificationPermission();
      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test("requests permission and returns false when user denies", async () => {
      const mockRequestPermission = jest.fn().mockResolvedValue("denied");
      const mockNotification = {
        permission: "default",
        requestPermission: mockRequestPermission,
      };
      (global.window as any).Notification = mockNotification;
      (global as any).Notification = mockNotification;

      const result = await requestNotificationPermission();
      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test("returns false immediately if permission is already 'denied'", async () => {
      const mockRequestPermission = jest.fn();
      const mockNotification = {
        permission: "denied",
        requestPermission: mockRequestPermission,
      };
      (global.window as any).Notification = mockNotification;
      (global as any).Notification = mockNotification;

      const result = await requestNotificationPermission();
      expect(result).toBe(false);
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });
  });

  describe("showNotification", () => {
    test("does not trigger Notification when Notification is not on window", () => {
      delete (global.window as any).Notification;
      delete (global as any).Notification;
      expect(() => showNotification("Hello", "World")).not.toThrow();
    });

    test("does not trigger Notification when permission is not 'granted'", () => {
      const MockNotification = jest.fn();
      (MockNotification as any).permission = "denied";
      (global.window as any).Notification = MockNotification;
      (global as any).Notification = MockNotification;

      showNotification("Hello", "World");
      expect(MockNotification).not.toHaveBeenCalled();
    });

    test("instantiates Notification with title, body, and icon when granted", () => {
      const MockNotification = jest.fn();
      (MockNotification as any).permission = "granted";
      (global.window as any).Notification = MockNotification;
      (global as any).Notification = MockNotification;

      showNotification("New Message 🔔", "Hello from Alice! 🚀", "/avatar.png");

      expect(MockNotification).toHaveBeenCalledTimes(1);
      expect(MockNotification).toHaveBeenCalledWith("New Message 🔔", {
        body: "Hello from Alice! 🚀",
        icon: "/avatar.png",
      });
    });

    test("handles undefined icon and empty strings gracefully", () => {
      const MockNotification = jest.fn();
      (MockNotification as any).permission = "granted";
      (global.window as any).Notification = MockNotification;
      (global as any).Notification = MockNotification;

      showNotification("", "");
      expect(MockNotification).toHaveBeenCalledWith("", {
        body: "",
        icon: undefined,
      });
    });
  });

  describe("playNotificationSound", () => {
    test("returns safely if AudioContext is not supported", () => {
      delete (global.window as any).AudioContext;
      delete (global.window as any).webkitAudioContext;
      delete (global as any).AudioContext;

      expect(() => playNotificationSound()).not.toThrow();
    });

    test("creates oscillator and gain node with audio envelope when supported", () => {
      const mockSetValueAtTime = jest.fn();
      const mockExponentialRampToValueAtTime = jest.fn();
      const mockConnect = jest.fn();
      const mockStart = jest.fn();
      const mockStop = jest.fn();

      const mockGainNode = {
        gain: {
          setValueAtTime: mockSetValueAtTime,
          exponentialRampToValueAtTime: mockExponentialRampToValueAtTime,
        },
        connect: mockConnect,
      };

      const mockOscillator = {
        type: "sine",
        frequency: {
          setValueAtTime: mockSetValueAtTime,
        },
        connect: mockConnect,
        start: mockStart,
        stop: mockStop,
      };

      const mockAudioCtx = {
        currentTime: 0,
        destination: {},
        createOscillator: jest.fn().mockReturnValue(mockOscillator),
        createGain: jest.fn().mockReturnValue(mockGainNode),
      };

      (global.window as any).AudioContext = jest.fn().mockImplementation(() => mockAudioCtx);
      (global as any).AudioContext = (global.window as any).AudioContext;

      playNotificationSound();

      expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
      expect(mockAudioCtx.createGain).toHaveBeenCalled();
      expect(mockOscillator.type).toBe("sine");
      expect(mockSetValueAtTime).toHaveBeenCalledWith(440, 0); // 440 Hz
      expect(mockSetValueAtTime).toHaveBeenCalledWith(0.1, 0); // initial gain 0.1
      expect(mockExponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 0.04);
      expect(mockStart).toHaveBeenCalled();
      expect(mockStop).toHaveBeenCalledWith(0.04);
    });

    test("handles AudioContext throwing an error gracefully without crashing", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      (global.window as any).AudioContext = jest.fn().mockImplementation(() => {
        throw new Error("Audio autoplay not allowed");
      });
      (global as any).AudioContext = (global.window as any).AudioContext;

      expect(() => playNotificationSound()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to play notification sound",
        expect.any(Error)
      );
    });
  });
});
