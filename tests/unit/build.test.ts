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
import {
  browserManifest,
  buildProject,
  type Manifest,
} from "../../tooling/build.ts";

const roots: string[] = [];
const manifest: Manifest = {
  manifest_version: 3,
  name: "Sans Emoji",
  version: "2026.10.10",
  icons: { "16": "icons/icon16.png" },
};
async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sans-emoji-build-"));
  roots.push(root);
  await mkdir(join(root, "extension/icons"), { recursive: true });
  await mkdir(join(root, "src"));
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
describe("browser manifests", () => {
  it("keeps Chrome independent from the source manifest", () => {
    const result = browserManifest(manifest, "chrome");
    expect(result).toEqual(manifest);
    expect(result).not.toBe(manifest);
    result.icons["16"] = "changed";
    expect(manifest.icons["16"]).toBe("icons/icon16.png");
  });
  it("adds Firefox ID, supported version and no-data declaration", () => {
    expect(
      browserManifest(manifest, "firefox").browser_specific_settings?.gecko,
    ).toEqual({
      id: "sans-emoji@extensions.local",
      strict_min_version: "140.0",
      data_collection_permissions: { required: ["none"] },
    });
    expect(manifest.browser_specific_settings).toBeUndefined();
  });
});
describe("local build", () => {
  it("bundles both browsers into clean folders without creating ZIPs", async () => {
    const root = await fixture();
    await mkdir(join(root, "dist/chrome"), { recursive: true });
    await writeFile(join(root, "dist/chrome/stale.js"), "stale");
    await buildProject(root);
    expect((await readdir(join(root, "dist"))).sort()).toEqual([
      "chrome",
      "firefox",
    ]);
    for (const browser of ["chrome", "firefox"]) {
      const directory = join(root, "dist", browser);
      expect((await readdir(directory)).sort()).toEqual([
        "content.js",
        "icons",
        "manifest.json",
      ]);
      const content = await readFile(join(directory, "content.js"), "utf8");
      expect(content).toContain("compiled");
      expect(content).not.toContain(": string");
      expect(
        JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")),
      ).toEqual(browserManifest(manifest, browser as "chrome" | "firefox"));
      expect(await readFile(join(directory, "icons/icon16.png"))).toEqual(
        Buffer.from([1, 2, 3]),
      );
    }
    const first = await readFile(join(root, "dist/chrome/content.js"));
    await buildProject(root);
    expect(await readFile(join(root, "dist/chrome/content.js"))).toEqual(first);
    const otherRoot = await fixture();
    await buildProject(otherRoot);
    expect(await readFile(join(otherRoot, "dist/chrome/content.js"))).toEqual(
      first,
    );
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
