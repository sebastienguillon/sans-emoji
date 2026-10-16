// @vitest-environment node
import { execFileSync } from "node:child_process";
import { beforeEach, expect, it, vi } from "vitest";
import { lintExtension } from "../../tooling/lint-extension.ts";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));

// AMO reports this for a desktop-only manifest too, so it must fail locally.
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
  vi.mocked(execFileSync).mockReturnValue(
    JSON.stringify({ errors: [], warnings: [], notices: [] }),
  );
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

it("validates the built extension from its root without personal web-ext settings", async () => {
  await lintExtension(root);
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
    "Extension validation: 0 errors, 0 warnings, 0 notices.",
  );
});

it("reports notices without failing", async () => {
  vi.mocked(execFileSync).mockReturnValue(
    JSON.stringify({ errors: [], warnings: [], notices: [warning] }),
  );
  await lintExtension(root);
  expect(console.error).toHaveBeenCalledWith("OTHER_WARNING: Check this");
  expect(console.info).toHaveBeenCalledWith(
    "Extension validation: 0 errors, 0 warnings, 1 notices.",
  );
});

it("fails every warning, including Android minimum-version warnings", async () => {
  vi.mocked(execFileSync).mockReturnValue(
    JSON.stringify({
      errors: [],
      warnings: [warning, androidWarning],
      notices: [],
    }),
  );
  await expect(lintExtension(root)).rejects.toThrow(
    "Extension validation failed",
  );
  expect(console.error).toHaveBeenCalledWith(
    `${androidWarning.code}: ${androidWarning.message}`,
  );
  expect(console.info).toHaveBeenCalledWith(
    "Extension validation: 0 errors, 2 warnings, 0 notices.",
  );
});

it("fails errors", async () => {
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
