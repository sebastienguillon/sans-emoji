// @vitest-environment node
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildProject } from "../../tooling/build.ts";

const roots: string[] = [];
const manifest = {
  manifest_version: 3,
  name: "Sans Emoji",
  version: "2026.10.10",
  icons: { "16": "icons/icon16.png" },
  browser_specific_settings: {
    gecko: {
      id: "sans-emoji@extensions.local",
      strict_min_version: "140.0",
      data_collection_permissions: { required: ["none"] },
    },
  },
};
async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sans-emoji-build-"));
  roots.push(root);
  await writeFile(join(root, "LICENSE"), "Test license notice");
  await mkdir(join(root, "extension/icons"), { recursive: true });
  await mkdir(join(root, "src"));
  await writeFile(
    join(root, "extension/content.css"),
    ".popup { opacity: 0; }",
  );
  await writeFile(
    join(root, "extension/manifest.json"),
    JSON.stringify(manifest),
  );
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ version: manifest.version }),
  );
  await writeFile(
    join(root, "extension/icons/icon16.png"),
    new Uint8Array([1, 2, 3]),
  );
  await writeFile(
    join(root, "src/content.ts"),
    'const message: string = "compiled"; console.log(message);',
  );
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
describe("local build", () => {
  it("creates one clean shared build, removing obsolete browser folders and ZIPs", async () => {
    const root = await fixture();
    for (const browser of ["chrome", "firefox"]) {
      await mkdir(join(root, "dist", browser), { recursive: true });
      await writeFile(join(root, "dist", browser, "stale.js"), "stale");
    }
    for (const name of [
      "stale.js",
      "sans-emoji.zip",
      "sans-emoji-chrome.zip",
      "sans-emoji-firefox.zip",
      "sans-emoji-sources.zip",
    ])
      await writeFile(join(root, "dist", name), "stale");
    await buildProject(root);
    const directory = join(root, "dist");
    expect((await readdir(directory)).sort()).toEqual([
      "LICENSE",
      "content.css",
      "content.js",
      "icons",
      "manifest.json",
    ]);
    expect(await readFile(join(directory, "LICENSE"), "utf8")).toBe(
      "Test license notice",
    );
    const content = await readFile(join(directory, "content.js"), "utf8");
    expect(await readFile(join(directory, "content.css"), "utf8")).toBe(
      ".popup { opacity: 0; }",
    );
    expect(content).toContain("compiled");
    expect(content).not.toContain(": string");
    expect(await readFile(join(directory, "manifest.json"))).toEqual(
      await readFile(join(root, "extension/manifest.json")),
    );
    expect(await readFile(join(directory, "icons/icon16.png"))).toEqual(
      Buffer.from([1, 2, 3]),
    );
    const first = await readFile(join(directory, "content.js"));
    await buildProject(root);
    expect(await readFile(join(directory, "content.js"))).toEqual(first);
    const otherRoot = await fixture();
    await buildProject(otherRoot);
    expect(await readFile(join(otherRoot, "dist/content.js"))).toEqual(first);
  });
  it("refuses mismatched package and extension versions", async () => {
    const root = await fixture();
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ version: "2026.11.1" }),
    );
    await expect(buildProject(root)).rejects.toThrow("versions must match");
  });
  it("propagates file system and bundler failures", async () => {
    const root = await fixture();
    await rm(join(root, "src/content.ts"));
    await expect(buildProject(root)).rejects.toThrow();
  });
});
