// Capture the real unpacked extension against the existing local editor fixture.
// This is a manual asset tool, not an additional browser test suite.
import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { crc32 } from "node:zlib";
import { chromium, expect } from "@playwright/test";
import { mountEditor } from "./e2e/fixture.ts";

const root = resolve(import.meta.dirname, "..");
const assets = join(root, "store/assets");
const extension = join(root, "dist");
const manifest = JSON.parse(
  await readFile(join(extension, "manifest.json"), "utf8"),
) as { version: string };
const version = manifest.version;
const html = await readFile(join(assets, "source/editor.html"), "utf8");
const icon = await readFile(join(root, "assets/icon.svg"));
const profile = await mkdtemp(join(tmpdir(), "sans-emoji-store-"));
const context = await chromium.launchPersistentContext(profile, {
  headless: true,
  channel: "chromium",
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  locale: "en-US",
  colorScheme: "light",
  reducedMotion: "reduce",
  args: [
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
  ],
});
const copy = {
  en: {
    fixture: "Local editor test fixture",
    sample: "Sample text",
    picker: "Emoji picker",
    disclosure:
      "Demonstration of the shared Chrome & Firefox build. This is not an Atlassian product screen.",
    punctuation: [
      "Keep writing after a colon.",
      "Dismiss colon-triggered emoji suggestions. Keep your text.",
    ],
    manual: [
      "Keep the emoji picker.",
      "The toolbar picker remains available when you want an emoji.",
    ],
  },
  fr: {
    fixture: "Éditeur de démonstration local",
    sample: "Texte d’exemple",
    picker: "Sélecteur d’emoji",
    disclosure:
      "Démonstration de la version commune Chrome et Firefox. Ce n’est pas une interface Atlassian.",
    punctuation: [
      "Écrivez après les deux-points.",
      "Fermez les suggestions d’emoji. Gardez votre texte.",
    ],
    manual: [
      "Gardez le sélecteur d’emoji.",
      "Le sélecteur de la barre d’outils reste disponible.",
    ],
  },
} as const;

try {
  // No requests reach Atlassian: only the local HTML and icon can be served.
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "https://test.atlassian.net") return route.abort();
    if (url.pathname === "/icon.svg")
      return route.fulfill({ contentType: "image/svg+xml", body: icon });
    if (url.pathname === "/fixture")
      return route.fulfill({ contentType: "text/html", body: html });
    return route.abort();
  });
  const page = await context.newPage();
  for (const language of ["en", "fr"] as const) {
    const labels = copy[language];
    await page.goto("https://test.atlassian.net/fixture");
    const frame = await page.locator("body").innerHTML();
    await page.evaluate(mountEditor, {
      space: " ",
      trigger: ":",
      legacy: false,
    });
    await page.evaluate(
      ({ frame, language, labels }) => {
        const editor = document.querySelector<HTMLElement>("#editor");
        const picker = document.querySelector<HTMLButtonElement>("#picker");
        const status = document.querySelector<HTMLElement>("#status");
        if (!editor || !picker || !status)
          throw new Error("Missing editor fixture");
        document.body.innerHTML = frame;
        document.documentElement.lang = language;
        document.querySelector("#editor-slot")?.append(editor);
        document.querySelector("#picker-slot")?.append(picker);
        document.body.append(status);
        editor.removeAttribute("style");
        picker.textContent = labels.picker;
        for (const [id, text] of Object.entries({
          "fixture-label": labels.fixture,
          "sample-label": labels.sample,
          disclosure: labels.disclosure,
          headline: labels.punctuation[0],
          description: labels.punctuation[1],
        })) {
          const element = document.getElementById(id);
          if (element) element.textContent = text;
        }
      },
      { frame, language, labels },
    );
    await page.locator("#editor").press("End");
    await page.keyboard.press(":");
    await expect(page.locator('[data-query-prefix=":"]')).toHaveCount(0);
    await expect(page.locator("#suggestions")).toHaveCount(0);
    await expect(page.locator("#status")).toHaveAttribute(
      "data-visible-at-mount",
      "false",
    );
    await page.keyboard.insertText(" voici les détails");
    await expect(page.locator("#editor")).toHaveText(
      "Bonjour : voici les détails",
    );
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".brand img")).toHaveJSProperty("complete", true);
    await page.screenshot({
      path: join(
        assets,
        `${version}-${language}-screenshot-01-punctuation.png`,
      ),
      animations: "disabled",
      caret: "hide",
    });
    await page.evaluate((labels) => {
      const headline = document.getElementById("headline");
      const description = document.getElementById("description");
      if (headline) headline.textContent = labels.manual[0];
      if (description) description.textContent = labels.manual[1];
    }, labels);
    await page.locator("#picker").click();
    await expect(page.locator(".ak-emoji-picker")).toBeVisible();
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: join(assets, `${version}-${language}-screenshot-02-picker.png`),
      animations: "disabled",
      caret: "hide",
    });
  }
  for (const kind of ["small", "marquee"]) {
    execFileSync(
      "inkscape",
      [
        join(assets, `source/promo-${kind}.svg`),
        "--export-type=png",
        `--export-filename=${join(assets, `${version}-promo-${kind}.png`)}`,
        "--export-background-opacity=1",
        "--export-png-color-mode=RGB_8",
      ],
      { stdio: "inherit" },
    );
  }
  for (const size of [64, 128]) {
    await copyFile(
      join(extension, `icons/icon${size}.png`),
      join(assets, `${version}-icon-${size}.png`),
    );
  }
  const origins: Record<string, string> = {};
  for (const language of ["en", "fr"]) {
    for (const state of ["01-punctuation", "02-picker"]) {
      origins[`${version}-${language}-screenshot-${state}.png`] =
        `Origin: Genuine Chromium ${context.browser()?.version()} capture of Sans Emoji ${version}, loaded as an unpacked extension. Local tests/e2e/fixture.ts with store/assets/source/editor.html presentation; all requests intercepted locally. No Atlassian tenant or private account data. Captured by tests/store-assets.ts; no compositing or AI-generated imagery.`;
    }
  }
  for (const kind of ["small", "marquee"]) {
    origins[`${version}-promo-${kind}.png`] =
      `Origin: Authored vector artwork in store/assets/source/promo-${kind}.svg, using the paths from assets/icon.svg and the existing docs/styles.css palette and system typography. Exported with Inkscape; no AI-generated imagery.`;
  }
  for (const size of [64, 128]) {
    origins[`${version}-icon-${size}.png`] =
      `Origin: extension/icons/icon${size}.png from Sans Emoji ${version}, generated from assets/icon.svg. Pixels unchanged; only this provenance metadata was added.`;
  }
  // PNG text metadata preserves the capture/export origin without changing pixels.
  for (const [name, origin] of Object.entries(origins)) {
    const path = join(assets, name);
    const png = await readFile(path);
    const data = Buffer.from(`impeccable:prompt\0${origin}`, "latin1");
    const chunk = Buffer.alloc(data.length + 12);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write("tEXt", 4);
    data.copy(chunk, 8);
    chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
    await writeFile(
      path,
      Buffer.concat([png.subarray(0, -12), chunk, png.subarray(-12)]),
    );
  }
  await writeFile(
    join(assets, "capture.json"),
    `${JSON.stringify(
      {
        extensionVersion: version,
        browser: `Chromium ${context.browser()?.version()}`,
        platform: process.platform,
        viewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
        fixture: "tests/e2e/fixture.ts",
        presentation: "store/assets/source/editor.html",
        network:
          "All requests intercepted locally; no Atlassian tenant accessed.",
        checks: [
          "Colon preserved",
          "Suggestions hidden synchronously at mount",
          "Suggestions dismissed",
          "Continued typing preserved",
          "Manual emoji picker visible",
        ],
        origins,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
}
