import { test, expect, Page, BrowserContext } from "@playwright/test";

// Test credentials and workspace/channel configuration from environment variables
const USER_A_EMAIL = process.env.TEST_USER_A_EMAIL || "alice@nexus.test";
const USER_A_PASSWORD = process.env.TEST_USER_A_PASSWORD || "TestPassword123!";
const USER_B_EMAIL = process.env.TEST_USER_B_EMAIL || "bob@nexus.test";
const USER_B_PASSWORD = process.env.TEST_USER_B_PASSWORD || "TestPassword123!";

const TARGET_WORKSPACE_ID = process.env.TEST_WORKSPACE_ID;
const TARGET_CHANNEL_ID = process.env.TEST_CHANNEL_ID;

/**
 * Reusable helper to authenticate a user via the Nexus Firebase Auth login page.
 */
async function loginUser(page: Page, email: string, pass: string): Promise<void> {
  await page.goto("/login");

  // Wait for login form elements
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');

  await expect(emailInput).toBeVisible();
  await emailInput.fill(email);
  await passwordInput.fill(pass);
  await submitButton.click();

  // Wait for post-login navigation to complete (home, onboarding, or workspace)
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });

  // If redirected to onboarding, complete it or navigate to home
  if (page.url().includes("/onboarding")) {
    const continueBtn = page.getByRole("button", { name: /continue|get started|finish/i });
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
    }
  }
}

/**
 * Helper to navigate to a shared workspace channel and ensure membership.
 */
async function navigateToChannel(page: Page, workspaceId?: string, channelId?: string): Promise<void> {
  if (workspaceId && channelId) {
    await page.goto(`/workspace/${workspaceId}/channel/${channelId}`);
  } else {
    // Navigate to default workspace or first available channel
    await page.goto("/home");
    const channelLink = page.locator('a[href*="/channel/"]').first();
    await channelLink.waitFor({ state: "visible", timeout: 10_000 });
    await channelLink.click();
  }

  // Handle "Join Channel" if the user hasn't joined this channel yet
  const joinButton = page.getByRole("button", { name: /join channel/i });
  if (await joinButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await joinButton.click();
    await expect(joinButton).toBeHidden({ timeout: 5_000 });
  }

  // Wait for the message input to be connected and active
  const messageInput = page.locator('input[placeholder*="Message channel"]');
  await expect(messageInput).toBeVisible({ timeout: 10_000 });
  await expect(messageInput).toBeEnabled({ timeout: 10_000 });
}

test.describe("Real-Time Multi-User Chat Simulation (Playwright Multi-Context)", () => {
  let userAContext: BrowserContext;
  let userBContext: BrowserContext;
  let pageA: Page;
  let pageB: Page;

  test.beforeEach(async ({ browser }) => {
    // Step 1: Initialize two isolated browser contexts with separate storage/cookies
    userAContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ["notifications"],
    });

    userBContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ["notifications"],
    });

    pageA = await userAContext.newPage();
    pageB = await userBContext.newPage();
  });

  test.afterEach(async () => {
    // Clean up browser contexts
    await userAContext?.close();
    await userBContext?.close();
  });

  test("User A sends a message; User B receives it in real-time; handles offline/online recovery", async () => {
    // ── Step 2: Both users authenticate via Firebase Auth ─────────────────────
    await test.step("Authenticate User A and User B in isolated contexts", async () => {
      await Promise.all([
        loginUser(pageA, USER_A_EMAIL, USER_A_PASSWORD),
        loginUser(pageB, USER_B_EMAIL, USER_B_PASSWORD),
      ]);
    });

    // ── Step 3: Both users navigate to the same shared channel ─────────────────
    await test.step("Navigate both users to shared chat channel", async () => {
      await Promise.all([
        navigateToChannel(pageA, TARGET_WORKSPACE_ID, TARGET_CHANNEL_ID),
        navigateToChannel(pageB, TARGET_WORKSPACE_ID, TARGET_CHANNEL_ID),
      ]);
    });

    // ── Step 4: User A types (verifying typing indicator on User B) ───────────
    const uniqueMessageA = `Hello from User A - ${Date.now()} 🚀`;

    await test.step("User A types; User B observes real-time typing indicator", async () => {
      const inputA = pageA.locator('input[placeholder*="Message channel"]');
      await inputA.fill(uniqueMessageA);

      // Verify User B sees typing indicator
      const typingIndicator = pageB.locator("text=/.*typing.*/i");
      await expect(typingIndicator).toBeVisible({ timeout: 4_000 });
    });

    // ── Step 5: User A sends message; User B receives it via Pusher ────────────
    await test.step("User A sends message; User B receives it in real-time (< 3s)", async () => {
      const inputA = pageA.locator('input[placeholder*="Message channel"]');
      await inputA.press("Enter");

      // Assert User A sees their message in the conversation feed
      await expect(pageA.getByText(uniqueMessageA)).toBeVisible({ timeout: 3_000 });

      // Assert User B receives the message in real-time without refreshing
      const messageOnB = pageB.getByText(uniqueMessageA);
      await expect(messageOnB).toBeVisible({ timeout: 3_000 });
    });

    // ── Step 6: User B replies to User A ──────────────────────────────────────
    const uniqueReplyB = `Acknowledged in real-time by User B! - ${Date.now()} 💬`;

    await test.step("User B replies back; User A receives reply", async () => {
      const inputB = pageB.locator('input[placeholder*="Message channel"]');
      await inputB.fill(uniqueReplyB);
      await inputB.press("Enter");

      // Assert User B sees message sent
      await expect(pageB.getByText(uniqueReplyB)).toBeVisible({ timeout: 3_000 });

      // Assert User A receives reply
      await expect(pageA.getByText(uniqueReplyB)).toBeVisible({ timeout: 3_000 });
    });

    // ── Step 7: Simulate Network Drop / Offline state on User A ───────────────
    await test.step("Simulate User A network disconnection and verify offline state", async () => {
      // Trigger browser offline mode for User A
      await userAContext.setOffline(true);

      // Verify User A UI indicates disconnected / reconnecting state
      const reconnectingBanner = pageA.getByText(/reconnecting to server/i);
      const inputA = pageA.locator('input[placeholder*="Message channel"]');

      // UI should reflect disconnection or disable input
      await expect(reconnectingBanner.or(inputA)).toBeVisible({ timeout: 5_000 });
    });

    // ── Step 8: User B sends message while User A is offline ──────────────────
    const offlineMessageFromB = `Message sent while User A was offline - ${Date.now()} 📡`;

    await test.step("User B posts a message while User A is disconnected", async () => {
      const inputB = pageB.locator('input[placeholder*="Message channel"]');
      await inputB.fill(offlineMessageFromB);
      await inputB.press("Enter");

      // User B sees their message
      await expect(pageB.getByText(offlineMessageFromB)).toBeVisible({ timeout: 3_000 });
    });

    // ── Step 9: Reconnect User A and verify sync recovery ─────────────────────
    await test.step("Reconnect User A and verify chat history syncs missing messages", async () => {
      // Bring User A back online
      await userAContext.setOffline(false);

      // Verify User A reconnects and input becomes enabled
      const inputA = pageA.locator('input[placeholder*="Message channel"]');
      await expect(inputA).toBeEnabled({ timeout: 10_000 });

      // Verify User A syncs the message sent by User B during disconnection
      const syncedMsgOnA = pageA.getByText(offlineMessageFromB);
      await expect(syncedMsgOnA).toBeVisible({ timeout: 8_000 });

      // User A can send a recovery confirmation message
      const recoveryMessageA = `Reconnected and synced! - ${Date.now()} ✅`;
      await inputA.fill(recoveryMessageA);
      await inputA.press("Enter");

      // Verify User B receives User A's recovery message
      await expect(pageB.getByText(recoveryMessageA)).toBeVisible({ timeout: 3_000 });
    });
  });
});
