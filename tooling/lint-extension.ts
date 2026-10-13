import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface Finding {
  code: string;
  message: string;
  file: string;
}

export async function lintExtension(root: string): Promise<void> {
  const manifest = JSON.parse(
    await readFile(join(root, "dist/manifest.json"), "utf8"),
  ) as { browser_specific_settings?: { gecko_android?: unknown } };
  const report = JSON.parse(
    execFileSync(
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
    ),
  ) as { errors: Finding[]; warnings: Finding[]; notices: Finding[] };
  const androidEnabled =
    "gecko_android" in (manifest.browser_specific_settings ?? {});
  // Mozilla enables Android distribution only when gecko_android is present.
  // addons-linter still checks Android minimums for a desktop-only manifest.
  const warnings = report.warnings.filter(
    (finding) =>
      androidEnabled ||
      finding.code !== "KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION" ||
      finding.file !== "manifest.json",
  );
  const ignored = report.warnings.length - warnings.length;
  if (ignored)
    console.info(
      `Skipped ${ignored} Android minimum-version warning(s): the manifest does not enable Android.`,
    );
  for (const finding of [...report.errors, ...warnings, ...report.notices])
    console.error(`${finding.code}: ${finding.message}`);
  console.info(
    `Extension validation: ${report.errors.length} errors, ${warnings.length} actionable warnings, ${report.notices.length} notices.`,
  );
  if (report.errors.length || warnings.length)
    throw new Error("Extension validation failed.");
}
