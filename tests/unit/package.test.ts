// @vitest-environment node
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { strFromU8, unzipSync } from "fflate";
import { afterEach, expect, it } from "vitest";
import { buildProject } from "../../tooling/build.ts";
import { packageProject, SOURCE_PATHS } from "../../tooling/package.ts";

const project = fileURLToPath(new URL("../../", import.meta.url));
const roots: string[] = [];
async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sans-emoji-package-"));
  roots.push(root);
  return root;
}
async function fixture(): Promise<string> {
  const root = await temporaryRoot();
  for (const path of SOURCE_PATHS)
    await cp(join(project, path), join(root, path), { recursive: true });
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("packages fresh browser builds and reproducible sources that rebuild the shipped code", async () => {
  const root = await fixture();
  for (const path of [
    "node_modules/private",
    ".git/config",
    "coverage/report",
    "dist/chrome/stale.js",
    "output/local",
    ".env",
  ]) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), "excluded");
  }
  await packageProject(root);
  const sources = await readFile(join(root, "dist/sans-emoji-sources.zip"));
  const files = unzipSync(sources);
  expect(Object.keys(files)).toEqual(
    expect.arrayContaining([
      "src/content.ts",
      "tooling/build.ts",
      "tooling/package.ts",
      "scripts/build.ts",
      "scripts/package.ts",
      "extension/manifest.json",
      "extension/icons/icon16.png",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "tsconfig.json",
      "package.json",
      "README.md",
      "AGENTS.md",
      "tests/unit/package.test.ts",
    ]),
  );
  expect(
    Object.keys(files).some(
      (path) =>
        /^(node_modules|dist|coverage|output|\.git)\//.test(path) ||
        path === ".env",
    ),
  ).toBe(false);
  const extracted = await temporaryRoot();
  for (const [path, bytes] of Object.entries(files)) {
    expect(bytes).toEqual(new Uint8Array(await readFile(join(root, path))));
    await mkdir(dirname(join(extracted, path)), { recursive: true });
    await writeFile(join(extracted, path), bytes);
  }
  await buildProject(extracted);
  for (const browser of ["chrome", "firefox"]) {
    const bytes = await readFile(join(root, `dist/sans-emoji-${browser}.zip`));
    const archive = unzipSync(bytes);
    expect(Object.keys(archive)).toContain("manifest.json");
    expect(Object.keys(archive)).toContain("content.js");
    expect(Object.keys(archive)).toContain("icons/icon16.png");
    expect(Object.keys(archive)).not.toContain("stale.js");
    for (const [path, content] of Object.entries(archive)) {
      expect(content).toEqual(
        new Uint8Array(await readFile(join(extracted, "dist", browser, path))),
      );
    }
    const manifest = archive["manifest.json"];
    if (!manifest) throw new Error("Missing manifest");
    expect(JSON.parse(strFromU8(manifest)).version).toBe(
      JSON.parse(await readFile(join(root, "package.json"), "utf8")).version,
    );
  }
  // Repack the extracted sources in a different directory, without Git metadata.
  await packageProject(extracted);
  for (const name of ["chrome", "firefox", "sources"]) {
    expect(
      await readFile(join(extracted, `dist/sans-emoji-${name}.zip`)),
    ).toEqual(await readFile(join(root, `dist/sans-emoji-${name}.zip`)));
  }
});
it("rejects symlinks instead of including files outside the source tree", async () => {
  const root = await fixture();
  await symlink(join(root, "package.json"), join(root, "src/external.ts"));
  await expect(packageProject(root)).rejects.toThrow(
    "Cannot package non-regular file: src/external.ts",
  );
});
it("requires all source inputs", async () => {
  const root = await fixture();
  await rm(join(root, "pnpm-lock.yaml"));
  await expect(packageProject(root)).rejects.toThrow();
});
it("rejects a release whose package and manifest versions differ", async () => {
  const root = await fixture();
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ version: "2099.1.1" }),
  );
  await expect(packageProject(root)).rejects.toThrow("versions must match");
});
