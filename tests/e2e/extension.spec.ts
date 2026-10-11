import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test as base, expect } from "@playwright/test";
import { isAllowedLocation } from "../../src/dom.ts";
import { mountEditor } from "./fixture.ts";

const test = base.extend({
  context: async ({ playwright, browserName }, use) => {
    const profile = await mkdtemp(join(tmpdir(), "sans-emoji-browser-"));
    const extension = resolve("dist");
    const browser =
      browserName === "firefox" ? await playwright.firefox.launch() : null;
    const context = browser
      ? await browser.newContext()
      : await playwright.chromium.launchPersistentContext(profile, {
          headless: true,
          channel: "chromium",
          args: [
            `--disable-extensions-except=${extension}`,
            `--load-extension=${extension}`,
          ],
        });
    try {
      if (browser)
        await context.addInitScript({
          path: join(extension, "content.js"),
        });
      const css = await readFile(join(extension, "content.css"), "utf8");
      await context.route("**/*", (route) => {
        // Firefox uses injected assets; Chromium exercises manifest CSS loading.
        const styles =
          browser && isAllowedLocation(new URL(route.request().url()))
            ? `<style>${css}</style>`
            : "";
        return route.fulfill({
          contentType: "text/html",
          body: `<!doctype html><html lang="en"><head><title>Local editor fixture</title>${styles}</head><body></body></html>`,
        });
      });
      await use(context);
    } finally {
      await context.close();
      await browser?.close();
      await rm(profile, { recursive: true, force: true });
    }
  },
});

for (const host of [
  "test.atlassian.net",
  "jira.atlassian.com",
  "bitbucket.org",
]) {
  for (const space of [" ", "\u00a0", "\u202f"]) {
    test(`preserves French punctuation on ${host}, space U+${space.charCodeAt(0).toString(16)}`, async ({
      page,
    }) => {
      await page.goto(`https://${host}/fixture`);
      await page.evaluate(mountEditor, { space, trigger: ":", legacy: false });
      await page.keyboard.press(":");
      await expect(page.locator('[data-query-prefix=":"]')).toHaveCount(0);
      await expect(page.locator("#status")).toHaveAttribute(
        "data-visible-at-mount",
        "false",
      );
      await expect(page.locator("#editor")).toBeFocused();
      await page.keyboard.type(" suite");
      expect(await page.locator("#editor").textContent()).toBe(
        `Bonjour${space}: suite`,
      );
      await page.keyboard.press("Enter");
      await page.keyboard.type("next");
      await expect(page.locator("#editor")).toContainText("next");
      await page.keyboard.press("Tab");
      await expect(page.locator("#picker")).toBeFocused();
    });
  }
}
for (const trigger of ["@", "/"]) {
  test(`keeps ${trigger} autocomplete and manual emoji picker`, async ({
    page,
  }) => {
    await page.goto("https://test.atlassian.net/fixture");
    await page.evaluate(mountEditor, { space: " ", trigger, legacy: false });
    await page.keyboard.press(trigger);
    // Observe longer than the controller retry window before asserting non-interference.
    await page.waitForTimeout(200);
    await expect(page.locator("[data-query-prefix]")).toBeVisible();
    await expect(page.locator("#suggestions")).toBeVisible();
    await expect(page.locator("#status")).toHaveAttribute(
      "data-visible-at-mount",
      "true",
    );
    await page.locator("#picker").click();
    await expect(page.locator(".ak-emoji-picker")).toBeVisible();
  });
}
for (const host of [
  "example.org",
  "fakeatlassian.net",
  "atlassian.net.example.org",
]) {
  test(`leaves unrelated host ${host} alone`, async ({ page }) => {
    await page.goto(`https://${host}/fixture`);
    await page.evaluate(mountEditor, {
      space: " ",
      trigger: ":",
      legacy: false,
    });
    await page.keyboard.press(":");
    await page.waitForTimeout(200);
    await expect(page.locator("[data-query-prefix]")).toBeVisible();
    await expect(page.locator("#suggestions")).toBeVisible();
  });
}
test("dismisses legacy textarea autocomplete without modifying its text", async ({
  page,
}) => {
  await page.goto("https://bitbucket.org/fixture");
  await page.evaluate(mountEditor, { space: " ", trigger: ":", legacy: true });
  await page.keyboard.press(":");
  await expect(page.locator(".ak-emoji-typeahead")).toHaveCount(0);
  await expect(page.locator("#editor")).toHaveValue("Bonjour :");
  await expect(page.locator("#status")).toHaveAttribute(
    "data-visible-at-mount",
    "false",
  );
});
test("waits for composition to finish", async ({ page }) => {
  await page.goto("https://test.atlassian.net/fixture");
  await page.evaluate(mountEditor, { space: " ", trigger: ":", legacy: false });
  await page.locator("#editor").dispatchEvent("compositionstart");
  await page.keyboard.press(":");
  await expect(page.locator("[data-query-prefix]")).toBeVisible();
  await expect(page.locator("#suggestions")).toBeHidden();
  await page.locator("#editor").dispatchEvent("compositionend");
  await expect(page.locator("[data-query-prefix]")).toHaveCount(0);
});
test("works in matching embedded frames", async ({ page }) => {
  await page.goto("https://test.atlassian.net/fixture");
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.src = "https://frame.atlassian.net/fixture";
    document.body.append(frame);
  });
  const frame = await (
    await page.locator("iframe").elementHandle()
  )?.contentFrame();
  if (!frame) throw new Error("Missing fixture frame");
  await frame.waitForLoadState();
  await frame.evaluate(mountEditor, {
    space: " ",
    trigger: ":",
    legacy: false,
  });
  await frame.locator("#editor").press(":");
  await expect(frame.locator("[data-query-prefix]")).toHaveCount(0);
  await expect(frame.locator("#editor")).toHaveText("Bonjour :");
  await expect(frame.locator("#status")).toHaveAttribute(
    "data-visible-at-mount",
    "false",
  );
});

for (const legacy of [false, true]) {
  test(`never paints suggestions while cancellation is unavailable (legacy: ${legacy})`, async ({
    page,
  }) => {
    await page.goto("https://test.atlassian.net/fixture");
    await page.evaluate(mountEditor, {
      space: " ",
      trigger: ":",
      legacy,
      ignoreEscape: true,
    });
    await page.keyboard.press(":");
    // Sample frames beyond all four retries, including unsupported handlers.
    await page.waitForTimeout(250);
    await expect(page.locator("#suggestions")).toBeAttached();
    await expect(page.locator("#suggestions")).toBeHidden();
    await expect(page.locator("#status")).toHaveAttribute(
      "data-visible-at-mount",
      "false",
    );
    await expect(page.locator("#status")).not.toHaveAttribute(
      "data-visible-frame",
      "true",
    );
    // Hiding must preserve geometry or legacy dismissal will skip the popup.
    expect(
      await page
        .locator("#suggestions")
        .evaluate((menu) => menu.getClientRects().length),
    ).toBeGreaterThan(0);
  });

  test(`hides suggestions until a delayed Escape handler cancels them (legacy: ${legacy})`, async ({
    page,
  }) => {
    await page.goto("https://test.atlassian.net/fixture");
    await page.evaluate(mountEditor, {
      space: " ",
      trigger: ":",
      legacy,
      handlerDelay: 45,
    });
    await page.keyboard.press(":");
    await expect(page.locator("#suggestions")).toHaveCount(0);
    await expect(page.locator("#status")).toHaveAttribute(
      "data-visible-at-mount",
      "false",
    );
    await expect(page.locator("#status")).not.toHaveAttribute(
      "data-visible-frame",
      "true",
    );
    await expect(page.locator("#editor")).toBeFocused();
  });
}
