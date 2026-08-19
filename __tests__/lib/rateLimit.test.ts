import { checkRateLimit } from "@/lib/rateLimit";

describe("lib/rateLimit (checkRateLimit)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("allows the first request and correctly calculates remaining quota", () => {
    const key = `user_first_${Date.now()}`;
    const result = checkRateLimit(key, { maxRequests: 5, windowMs: 10_000 });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  test("decrements remaining count on successive requests", () => {
    const key = `user_successive_${Date.now()}`;
    const options = { maxRequests: 3, windowMs: 10_000 };

    const first = checkRateLimit(key, options);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    const second = checkRateLimit(key, options);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);

    const third = checkRateLimit(key, options);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  test("blocks requests once maxRequests limit is exceeded", () => {
    const key = `user_blocked_${Date.now()}`;
    const options = { maxRequests: 2, windowMs: 10_000 };

    checkRateLimit(key, options); // count 1
    checkRateLimit(key, options); // count 2 (remaining 0)

    const blocked1 = checkRateLimit(key, options);
    expect(blocked1.allowed).toBe(false);
    expect(blocked1.remaining).toBe(0);

    const blocked2 = checkRateLimit(key, options);
    expect(blocked2.allowed).toBe(false);
    expect(blocked2.remaining).toBe(0);
  });

  test("resets quota after windowMs has elapsed", () => {
    const key = `user_reset_${Date.now()}`;
    const options = { maxRequests: 2, windowMs: 5_000 };

    checkRateLimit(key, options); // count 1
    checkRateLimit(key, options); // count 2
    const blocked = checkRateLimit(key, options);
    expect(blocked.allowed).toBe(false);

    // Fast-forward beyond the window duration
    jest.advanceTimersByTime(5_001);

    const afterExpiry = checkRateLimit(key, options);
    expect(afterExpiry.allowed).toBe(true);
    expect(afterExpiry.remaining).toBe(1);
  });

  test("isolates rate limits between distinct keys", () => {
    const userA = `user_A_${Date.now()}`;
    const userB = `user_B_${Date.now()}`;
    const options = { maxRequests: 1, windowMs: 10_000 };

    expect(checkRateLimit(userA, options).allowed).toBe(true);
    expect(checkRateLimit(userA, options).allowed).toBe(false);

    // User B should not be affected by User A
    expect(checkRateLimit(userB, options).allowed).toBe(true);
  });

  test("handles special characters, emojis, and empty keys", () => {
    const emojiKey = "user:🔥:🚀:@#$";
    const emptyKey = "";
    const options = { maxRequests: 2, windowMs: 10_000 };

    const emojiResult = checkRateLimit(emojiKey, options);
    expect(emojiResult.allowed).toBe(true);
    expect(emojiResult.remaining).toBe(1);

    const emptyResult = checkRateLimit(emptyKey, options);
    expect(emptyResult.allowed).toBe(true);
    expect(emptyResult.remaining).toBe(1);
  });

  test("handles edge case of maxRequests = 1", () => {
    const key = `single_limit_${Date.now()}`;
    const options = { maxRequests: 1, windowMs: 1_000 };

    const first = checkRateLimit(key, options);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(0);

    const second = checkRateLimit(key, options);
    expect(second.allowed).toBe(false);
    expect(second.remaining).toBe(0);
  });
});
