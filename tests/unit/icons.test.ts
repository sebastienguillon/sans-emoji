// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { generateIcons, ICON_SIZES } from "../../tooling/icons.ts";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("node:fs", () => ({ mkdirSync: vi.fn() }));
it("exports every size with alpha and safely passes paths containing spaces", () => {
  const root = "/tmp/Sans Emoji";
  generateIcons(root);
  expect(mkdirSync).toHaveBeenCalledWith(join(root, "extension/icons"), {
    recursive: true,
  });
  expect(execFileSync).toHaveBeenCalledTimes(8);
  for (const size of ICON_SIZES)
    expect(execFileSync).toHaveBeenCalledWith(
      "inkscape",
      [
        join(root, "assets/icon.svg"),
        "--export-type=png",
        `--export-filename=${join(root, "extension/icons", `icon${size}.png`)}`,
        `--export-width=${size}`,
        `--export-height=${size}`,
        "--export-background-opacity=0",
      ],
      { stdio: "inherit" },
    );
});
it("propagates exporter errors instead of claiming success", () => {
  vi.mocked(execFileSync).mockImplementationOnce(() => {
    throw new Error("Inkscape unavailable");
  });
  expect(() => generateIcons("/tmp/sans-emoji")).toThrow(
    "Inkscape unavailable",
  );
});
