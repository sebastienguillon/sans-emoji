// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { beforeEach, expect, it, vi } from "vitest";
import { lintExtension } from "../../tooling/lint-extension.ts";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));

const androidWarning = {
  code: "KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION",
  message: "Android minimum is too old",
  file: "manifest.json",
};
const warning = {
  code: "OTHER_WARNING",
  message: "Check this",
  file: "content.js",
};
const root = "/project";
beforeEach(() => {
  vi.mocked(readFile).mockResolvedValue("{}");
  vi.mocked(execFileSync).mockReturnValue(
    JSON.stringify({ errors: [], warnings: [], notices: [] }),
  );
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

it("validates the built extension from its root without personal web-ext settings", async () => {
  await lintExtension(root);
  expect(readFile).toHaveBeenCalledWith("/project/dist/manifest.json", "utf8");
  expect(execFileSync).toHaveBeenCalledWith(
    "pnpm",
    [
      "exec",
      "web-ext",
      "lint",
      "--source-dir",
      "dist",
      "--output",
      "json",
      "--no-config-discovery",
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  expect(console.info).toHaveBeenCalledWith(
    "Extension validation: 0 errors, 0 actionable warnings, 0 notices.",
  );
});

it("reports an inapplicable Android minimum warning for a desktop-only manifest", async () => {
  vi.mocked(readFile).mockResolvedValue(
    JSON.stringify({
      browser_specific_settings: { gecko: { strict_min_version: "140.0" } },
    }),
  );
  vi.mocked(execFileSync).mockReturnValue(
    JSON.stringify({
      errors: [],
      warnings: [androidWarning],
      notices: [warning],
    }),
  );
  await lintExtension(root);
  expect(console.info).toHaveBeenCalledWith(
    "Skipped 1 Android minimum-version warning(s): the manifest does not enable Android.",
  );
  expect(console.error).toHaveBeenCalledWith("OTHER_WARNING: Check this");
});

it("fails Android compatibility warnings when the manifest opts into Android", async () => {
  vi.mocked(readFile).mockResolvedValue(
    JSON.stringify({ browser_specific_settings: { gecko_android: {} } }),
  );
  vi.mocked(execFileSync).mockReturnValue(
    JSON.stringify({ errors: [], warnings: [androidWarning], notices: [] }),
  );
  await expect(lintExtension(root)).rejects.toThrow(
    "Extension validation failed",
  );
  expect(console.error).toHaveBeenCalledWith(
    `${androidWarning.code}: ${androidWarning.message}`,
  );
});

it("fails other warnings, including an Android code outside the manifest", async () => {
  vi.mocked(execFileSync).mockReturnValue(
    JSON.stringify({
      errors: [],
      warnings: [warning, { ...androidWarning, file: "content.js" }],
      notices: [],
    }),
  );
  await expect(lintExtension(root)).rejects.toThrow(
    "Extension validation failed",
  );
  expect(console.info).toHaveBeenCalledWith(
    "Extension validation: 0 errors, 2 actionable warnings, 0 notices.",
  );
});

it("fails errors even when their code would be ignored as a desktop-only warning", async () => {
  vi.mocked(execFileSync).mockReturnValue(
    JSON.stringify({ errors: [androidWarning], warnings: [], notices: [] }),
  );
  await expect(lintExtension(root)).rejects.toThrow(
    "Extension validation failed",
  );
});

it("propagates linter process failures", async () => {
  vi.mocked(execFileSync).mockImplementation(() => {
    throw new Error("linter failed");
  });
  await expect(lintExtension(root)).rejects.toThrow("linter failed");
});

it("fails when the built manifest is missing", async () => {
  vi.mocked(readFile).mockRejectedValue(new Error("missing manifest"));
  await expect(lintExtension(root)).rejects.toThrow("missing manifest");
  expect(execFileSync).not.toHaveBeenCalled();
});
