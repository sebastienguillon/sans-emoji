import { execFileSync } from "node:child_process";

interface Finding {
  code: string;
  message: string;
}

export async function lintExtension(root: string): Promise<void> {
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
  for (const finding of [
    ...report.errors,
    ...report.warnings,
    ...report.notices,
  ])
    console.error(`${finding.code}: ${finding.message}`);
  console.info(
    `Extension validation: ${report.errors.length} errors, ${report.warnings.length} warnings, ${report.notices.length} notices.`,
  );
  if (report.errors.length || report.warnings.length)
    throw new Error("Extension validation failed.");
}
