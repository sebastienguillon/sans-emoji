import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";

export async function buildProject(root: string): Promise<void> {
  const manifestPath = join(root, "extension/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    version: string;
  };
  const metadata = JSON.parse(
    await readFile(join(root, "package.json"), "utf8"),
  ) as { version: string };
  if (manifest.version !== metadata.version)
    throw new Error("Package and manifest versions must match.");
  const dist = join(root, "dist");
  // Remove stale assets, old browser subfolders and previously packaged ZIPs.
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await build({
    absWorkingDir: root,
    entryPoints: [join(root, "src/content.ts")],
    outfile: join(dist, "content.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome120", "firefox142"],
    legalComments: "none",
    logLevel: "silent",
  });
  await cp(join(root, "LICENSE"), join(dist, "LICENSE"));
  await cp(join(root, "extension/content.css"), join(dist, "content.css"));
  await cp(join(root, "extension/icons"), join(dist, "icons"), {
    recursive: true,
  });
  await cp(manifestPath, join(dist, "manifest.json"));
}
