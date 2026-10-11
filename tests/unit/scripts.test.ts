// @vitest-environment node
import { fileURLToPath } from "node:url";
import { expect, it, vi } from "vitest";
import { buildProject } from "../../tooling/build.ts";
import { generateIcons } from "../../tooling/icons.ts";
import { packageProject } from "../../tooling/package.ts";

vi.mock("../../tooling/build.ts", () => ({ buildProject: vi.fn() }));
vi.mock("../../tooling/icons.ts", () => ({ generateIcons: vi.fn() }));
vi.mock("../../tooling/package.ts", () => ({ packageProject: vi.fn() }));
const root = fileURLToPath(new URL("../../", import.meta.url));
it("build CLI resolves the project root independently of cwd", async () => {
  await import("../../scripts/build.ts");
  expect(buildProject).toHaveBeenCalledWith(root);
});
it("icon CLI resolves the project root independently of cwd", async () => {
  await import("../../scripts/icons.ts");
  expect(generateIcons).toHaveBeenCalledWith(root);
});
it("package CLI resolves the project root independently of cwd", async () => {
  await import("../../scripts/package.ts");
  expect(packageProject).toHaveBeenCalledWith(root);
});
