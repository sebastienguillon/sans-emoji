import { lstat, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { zipSync } from "fflate";
import { buildProject } from "./build.ts";

// Include reviewable project inputs only, never dependencies or local output.
export const SOURCE_PATHS = [
  "src",
  "tooling",
  "scripts",
  "extension",
  "assets",
  "tests",
  "release-notes",
  ".github",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "biome.json",
  "vitest.config.ts",
  "playwright.config.ts",
  ".node-version",
  ".gitignore",
  "README.md",
  "AGENTS.md",
] as const;

async function archivePaths(
  root: string,
  paths: readonly string[],
): Promise<Uint8Array> {
  const entries: Record<string, [Uint8Array, { mtime: Date }]> = {};
  async function add(name: string): Promise<void> {
    const path = join(root, name);
    const stats = await lstat(path);
    if (stats.isDirectory()) {
      for (const child of (await readdir(path)).sort())
        await add(`${name}/${child}`);
    } else if (stats.isFile()) {
      // ZIP stores local calendar fields: use a fixed date for reproducibility.
      entries[name] = [await readFile(path), { mtime: new Date(2000, 0, 1) }];
    } else {
      throw new Error(`Cannot package non-regular file: ${name}`);
    }
  }
  for (const path of [...paths].sort()) await add(path);
  return zipSync(entries, { level: 9 });
}

export async function packageProject(root: string): Promise<void> {
  // Read sources first so missing inputs fail before creating new packages.
  const sources = await archivePaths(root, SOURCE_PATHS);
  await buildProject(root);
  for (const browser of ["chrome", "firefox"] as const) {
    const archive = await archivePaths(join(root, "dist", browser), [
      "manifest.json",
      "content.js",
      "icons",
    ]);
    await writeFile(join(root, "dist", `sans-emoji-${browser}.zip`), archive);
  }
  await writeFile(join(root, "dist/sans-emoji-sources.zip"), sources);
}
