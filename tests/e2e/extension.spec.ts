import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test as base, expect, type Page } from "@playwright/test";
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
  for (const overflow of ["document", "container"] as const) {
    test(`keeps ${trigger} autocomplete geometry in ${overflow} and manual emoji picker`, async ({
      page,
    }) => {
      await page.goto("https://test.atlassian.net/fixture");
      await page.evaluate(mountEditor, {
        space: " ",
        trigger,
        legacy: false,
        overflow,
      });
      await page.keyboard.press(trigger);
      // Observe longer than the controller retry window before asserting non-interference.
      await page.waitForTimeout(200);
      await expect(page.locator("[data-query-prefix]")).toBeVisible();
      await expect(page.locator("#suggestions")).toBeVisible();
      await expect(page.locator("#status")).toHaveAttribute(
        "data-visible-at-mount",
        "true",
      );
      await expect(page.locator("#status")).toHaveAttribute(
        "data-scroll-changed-at-mount",
        "true",
      );
      await expect(page.locator("#status")).toHaveAttribute(
        "data-scroll-changed-frame",
        "true",
      );
      await page.locator("#picker").click();
      await expect(page.locator(".ak-emoji-picker")).toBeVisible();
    });
  }
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
  for (const overflow of ["document", "container"] as const) {
    test(`never paints or changes ${overflow} scrolling while cancellation is unavailable (legacy: ${legacy})`, async ({
      page,
    }) => {
      await page.goto(
        `https://${legacy ? "bitbucket.org" : "test.atlassian.net"}/fixture`,
      );
      await page.evaluate(mountEditor, {
        space: " ",
        trigger: ":",
        legacy,
        ignoreEscape: true,
        overflow,
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
      await expect(page.locator("#status")).toHaveAttribute(
        "data-scroll-changed-at-mount",
        "false",
      );
      await expect(page.locator("#status")).not.toHaveAttribute(
        "data-scroll-changed-frame",
        "true",
      );
      // Legacy dismissal still needs a client rect to recognize a mounted popup.
      expect(
        await page
          .locator("#suggestions")
          .evaluate((menu) => menu.getClientRects().length),
      ).toBeGreaterThan(0);
    });
  }

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

for (const overflow of ["document", "container"] as const) {
  test(`hides an emoji portal mounted after query removal without changing ${overflow} scrolling`, async ({
    page,
  }) => {
    await page.goto("https://test.atlassian.net/fixture");
    await page.evaluate(mountEditor, {
      space: " ",
      trigger: ":",
      legacy: false,
      popupAfterQueryRemoval: true,
      overflow,
    });
    await page.keyboard.press(":");
    await expect(page.locator("#suggestions")).toBeAttached();
    await page.waitForTimeout(100);
    await expect(page.locator("[data-query-prefix]")).toHaveCount(0);
    await expect(page.locator("#suggestions")).toBeHidden();
    await expect(page.locator("#status")).toHaveAttribute(
      "data-visible-at-mount",
      "false",
    );
    await expect(page.locator("#status")).toHaveAttribute(
      "data-scroll-changed-at-mount",
      "false",
    );
    await expect(page.locator("#status")).not.toHaveAttribute(
      "data-visible-frame",
      "true",
    );
    await expect(page.locator("#status")).not.toHaveAttribute(
      "data-scroll-changed-frame",
      "true",
    );
    await expect(page.locator("#editor")).toBeFocused();
    await expect(page.locator("#editor")).toHaveText("Bonjour :");
  });

  test(`keeps delayed emoji portal removal from changing ${overflow} scrolling after query cancellation`, async ({
    page,
  }) => {
    await page.goto("https://test.atlassian.net/fixture");
    await page.evaluate(mountEditor, {
      space: " ",
      trigger: ":",
      legacy: false,
      popupRemovalDelay: 80,
      overflow,
    });
    await page.keyboard.press(":");
    await expect(page.locator("[data-query-prefix]")).toHaveCount(0);
    await expect(page.locator("#suggestions")).toHaveCount(0);
    for (const stage of ["mount", "query-removal"]) {
      await expect(page.locator("#status")).toHaveAttribute(
        `data-visible-at-${stage}`,
        "false",
      );
      await expect(page.locator("#status")).toHaveAttribute(
        `data-scroll-changed-at-${stage}`,
        "false",
      );
    }
    await expect(page.locator("#status")).not.toHaveAttribute(
      "data-visible-frame",
      "true",
    );
    await expect(page.locator("#status")).not.toHaveAttribute(
      "data-scroll-changed-frame",
      "true",
    );
    await expect(page.locator("#editor")).toBeFocused();
    await page.keyboard.type(" suite");
    await expect(page.locator("#editor")).toHaveText("Bonjour : suite");
  });
}

const expectCancelledQuery = async (page: Page): Promise<void> => {
  await expect(page.locator("[data-query-prefix]")).toHaveCount(0);
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
  await page.keyboard.type(" suite");
  await expect(page.locator("#editor")).toHaveText("Bonjour : suite");
};

for (const queryMark of ["attached", "detached"] as const) {
  test(`cancels a query rendered into a ${queryMark} decoration mark`, async ({
    page,
  }) => {
    await page.goto("https://test.atlassian.net/fixture");
    await page.evaluate(mountEditor, {
      space: " ",
      trigger: ":",
      legacy: false,
      queryMark,
    });
    await page.keyboard.press(":");
    await expectCancelledQuery(page);
  });
}

test("cancels a query focused on the next frame, as Atlaskit does", async ({
  page,
}) => {
  await page.goto("https://test.atlassian.net/fixture");
  await page.evaluate(mountEditor, {
    space: " ",
    trigger: ":",
    legacy: false,
    queryMark: "detached" as const,
    focusQuery: "frame" as const,
  });
  await page.keyboard.press(":");
  await expectCancelledQuery(page);
});

// Firefox 157 missed the :has() update for the previous contenteditable
// argument when the mark followed an element in its paragraph.
for (const [where, paragraphHtml] of [
  ["after text", "Bonjour "],
  ["after an inline element", "Bonjour <strong>gras</strong> "],
  ["before a trailing break", 'Bonjour <br class="ProseMirror-trailingBreak">'],
] as const) {
  for (const queryMark of ["attached", "detached"] as const) {
    test(`hides an already-rendered menu while a colon query in a ${queryMark} decoration mark exists ${where}`, async ({
      page,
    }) => {
      await page.goto("https://test.atlassian.net/fixture");
      const states = await page.evaluate(
        async ({ order, paragraphHtml }) => {
          const frame = (): Promise<void> =>
            new Promise((resolve) => requestAnimationFrame(() => resolve()));
          document.body.innerHTML = `<div id="editor" contenteditable="true"><p>${paragraphHtml}</p></div>`;
          const menu = document.createElement("div");
          menu.className = "fabric-editor-typeahead";
          menu.style.cssText =
            "position: absolute; width: 200px; height: 100px";
          menu.textContent = "Suggestions";
          document.body.append(menu);
          const visible = (): boolean =>
            getComputedStyle(menu).visibility !== "hidden";
          await frame();
          const before = visible();
          const mark = document.createElement("mark");
          mark.setAttribute("contenteditable", "false");
          mark.setAttribute("data-type-ahead-query", "true");
          const query = document.createElement("span");
          query.setAttribute("contenteditable", "true");
          query.setAttribute("data-query-prefix", ":");
          query.textContent = ":";
          const paragraph = document.querySelector("#editor p") as HTMLElement;
          const trailingBreak = paragraph.querySelector("br");
          const place = (node: Node): void => {
            if (trailingBreak) trailingBreak.before(node);
            else paragraph.append(node);
          };
          if (order === "attached") {
            place(mark);
            mark.append(query);
          } else {
            mark.append(query);
            place(mark);
          }
          const atInsertion = visible();
          await frame();
          const nextFrame = visible();
          mark.remove();
          return { before, atInsertion, nextFrame, afterRemoval: visible() };
        },
        { order: queryMark, paragraphHtml },
      );
      expect(states).toEqual({
        before: true,
        atInsertion: false,
        nextFrame: false,
        afterRemoval: true,
      });
    });
  }
}

test("retries Escape for a focused query that becomes editable without focus or input", async ({
  page,
}) => {
  await page.goto("https://test.atlassian.net/fixture");
  const before = await page.evaluate(async () => {
    const wait = (ms: number): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, ms));
    document.body.innerHTML = '<div id="editor" contenteditable="true"></div>';
    const query = document.createElement("span");
    query.id = "query";
    query.setAttribute("data-query-prefix", ":");
    query.setAttribute("contenteditable", "false");
    query.tabIndex = -1;
    const input = document.createElement("input");
    query.append(input);
    document.querySelector("#editor")?.append(query);
    input.focus();
    const counter = window as unknown as { escapes: number };
    counter.escapes = 0;
    query.addEventListener("keydown", (event) => {
      if (event.key === "Escape") counter.escapes++;
    });
    await wait(200);
    return counter.escapes;
  });
  expect(before).toBe(0);
  await page.evaluate(() =>
    document.querySelector("#query")?.setAttribute("contenteditable", "true"),
  );
  const escapes = (): Promise<number> =>
    page.evaluate(() => (window as unknown as { escapes: number }).escapes);
  await expect.poll(escapes).toBe(4);
  // Four attempts per cycle: nothing follows the last retry.
  await page.waitForTimeout(100);
  expect(await escapes()).toBe(4);
});

test("cancels a legacy popup shown again through its inline style without focus or input", async ({
  page,
}) => {
  await page.goto("https://bitbucket.org/fixture");
  const counts = await page.evaluate(async () => {
    const wait = (ms: number): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const field = document.createElement("textarea");
    field.value = "Bonjour :";
    document.body.append(field);
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
    const popup = document.createElement("div");
    popup.className = "ak-emoji-typeahead";
    popup.style.display = "none";
    document.body.append(popup);
    let escapes = 0;
    field.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      escapes++;
      popup.style.display = "none";
    });
    await wait(150);
    const whileHidden = escapes;
    popup.style.display = "block";
    await wait(150);
    const firstShow = escapes;
    popup.style.display = "block";
    await wait(150);
    return { whileHidden, firstShow, secondShow: escapes };
  });
  expect(counts).toEqual({ whileHidden: 0, firstShow: 1, secondShow: 2 });
});
