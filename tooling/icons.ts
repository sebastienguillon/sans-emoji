import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export const ICON_SIZES = [16, 32, 48, 64, 96, 128, 256, 512] as const;

export function generateIcons(root: string): void {
  const directory = join(root, "extension/icons");
  mkdirSync(directory, { recursive: true });
  for (const size of ICON_SIZES) {
    execFileSync(
      "inkscape",
      [
        join(root, "assets/icon.svg"),
        "--export-type=png",
        `--export-filename=${join(directory, `icon${size}.png`)}`,
        `--export-width=${size}`,
        `--export-height=${size}`,
        "--export-background-opacity=0",
      ],
      { stdio: "inherit" },
    );
  }
}
