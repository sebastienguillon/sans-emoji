// @vitest-environment node
import { fileURLToPath } from "node:url";
import { expect, it, vi } from "vitest";
import { buildProject } from "../../tooling/build.ts";
import { generateIcons } from "../../tooling/icons.ts";

vi.mock("../../tooling/build.ts", () => ({ buildProject: vi.fn() }));
vi.mock("../../tooling/icons.ts", () => ({ generateIcons: vi.fn() }));
const root = fileURLToPath(new URL("../../", import.meta.url));
it("build CLI resolves the project root independently of cwd", async () => {
  await import("../../scripts/build.ts");
  expect(buildProject).toHaveBeenCalledWith(root);
});
it("icon CLI resolves the project root independently of cwd", async () => {
  await import("../../scripts/icons.ts");
  expect(generateIcons).toHaveBeenCalledWith(root);
});
