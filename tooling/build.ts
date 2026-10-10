import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { zipSync } from "fflate";

export interface Manifest {
  manifest_version: number;
  name: string;
  version: string;
  icons: Record<string, string>;
  browser_specific_settings?: {
    gecko: {
      id: string;
      strict_min_version: string;
      data_collection_permissions: { required: string[] };
    };
  };
}
export type Browser = "chrome" | "firefox";

export function browserManifest(
  manifest: Manifest,
  browser: Browser,
): Manifest {
  const output = structuredClone(manifest);
  if (browser === "firefox") {
    output.browser_specific_settings = {
      gecko: {
        id: "sans-emoji@extensions.local",
        strict_min_version: "140.0",
        data_collection_permissions: { required: ["none"] },
      },
    };
  }
  return output;
}

export async function buildProject(root: string): Promise<void> {
  const manifest = JSON.parse(
    await readFile(join(root, "extension/manifest.json"), "utf8"),
  ) as Manifest;
  const metadata = JSON.parse(
    await readFile(join(root, "package.json"), "utf8"),
  ) as { version: string };
  if (manifest.version !== metadata.version)
    throw new Error("Package and manifest versions must match.");
  const dist = join(root, "dist");
  await mkdir(dist, { recursive: true });
  for (const browser of ["chrome", "firefox"] as const) {
    const destination = join(dist, browser);
    await rm(destination, { recursive: true, force: true });
    await mkdir(destination, { recursive: true });
    await build({
      absWorkingDir: root,
      entryPoints: [join(root, "src/content.ts")],
      outfile: join(destination, "content.js"),
      bundle: true,
      format: "iife",
      platform: "browser",
      target: ["chrome120", "firefox140"],
      legalComments: "none",
      logLevel: "silent",
    });
    await cp(join(root, "extension/icons"), join(destination, "icons"), {
      recursive: true,
    });
    await writeFile(
      join(destination, "manifest.json"),
      `${JSON.stringify(browserManifest(manifest, browser), null, 2)}\n`,
    );
    const names = [
      "manifest.json",
      "content.js",
      ...(await readdir(join(destination, "icons")))
        .sort()
        .map((name) => `icons/${name}`),
    ];
    const entries: Record<string, [Uint8Array, { mtime: Date }]> = {};
    // Stable ZIP timestamps make identical inputs produce identical archives.
    for (const name of names)
      entries[name] = [
        await readFile(join(destination, name)),
        { mtime: new Date(2000, 0, 1) },
      ];
    await writeFile(
      join(dist, `sans-emoji-${browser}.zip`),
      zipSync(entries, { level: 9 }),
    );
  }
}
