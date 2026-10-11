// @vitest-environment node
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
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
it("creates only a shared extension ZIP and reproducible Firefox review sources", async () => {
  const root = await fixture();
  for (const path of [
    "node_modules/private",
    ".git/config",
    "coverage/report",
    "dist/chrome/stale.js",
    "dist/firefox/stale.js",
    "dist/stale.js",
    "dist/sans-emoji.zip",
    "dist/sans-emoji-chrome.zip",
    "dist/sans-emoji-firefox.zip",
    "dist/sans-emoji-sources.zip",
    "output/local",
    ".env",
  ]) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), "excluded");
  }
  await packageProject(root);
  expect((await readdir(join(root, "dist"))).sort()).toEqual([
    "LICENSE",
    "content.css",
    "content.js",
    "icons",
    "manifest.json",
    "sans-emoji-sources.zip",
    "sans-emoji.zip",
  ]);
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
      "extension/content.css",
      "extension/icons/icon16.png",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "tsconfig.json",
      "package.json",
      "README.md",
      "LICENSE",
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
  const archive = unzipSync(await readFile(join(root, "dist/sans-emoji.zip")));
  expect(archive["LICENSE"]).toEqual(
    new Uint8Array(await readFile(join(root, "LICENSE"))),
  );
  expect(Object.keys(archive)).toContain("manifest.json");
  expect(Object.keys(archive)).toContain("content.js");
  expect(archive["content.css"]).toEqual(
    new Uint8Array(await readFile(join(root, "extension/content.css"))),
  );
  expect(Object.keys(archive)).toContain("icons/icon16.png");
  expect(Object.keys(archive)).not.toContain("stale.js");
  expect(
    Object.keys(archive).some(
      (path) => /^(chrome|firefox)\//.test(path) || path.endsWith(".zip"),
    ),
  ).toBe(false);
  for (const [path, content] of Object.entries(archive)) {
    expect(content).toEqual(
      new Uint8Array(await readFile(join(extracted, "dist", path))),
    );
  }
  const manifest = archive["manifest.json"];
  if (!manifest) throw new Error("Missing manifest");
  expect(JSON.parse(strFromU8(manifest)).version).toBe(
    JSON.parse(await readFile(join(root, "package.json"), "utf8")).version,
  );
  expect(
    JSON.parse(strFromU8(manifest)).browser_specific_settings.gecko,
  ).toEqual({
    id: "sans-emoji@extensions.local",
    strict_min_version: "140.0",
    data_collection_permissions: { required: ["none"] },
  });
  // Repack the extracted sources in a different directory, without Git metadata.
  await packageProject(extracted);
  for (const name of ["sans-emoji.zip", "sans-emoji-sources.zip"]) {
    expect(await readFile(join(extracted, "dist", name))).toEqual(
      await readFile(join(root, "dist", name)),
    );
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
