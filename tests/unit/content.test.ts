import { beforeEach, expect, it, vi } from "vitest";
import { startController } from "../../src/controller.ts";
import { isAllowedLocation } from "../../src/dom.ts";

vi.mock("../../src/controller.ts", () => ({ startController: vi.fn() }));
vi.mock("../../src/dom.ts", () => ({ isAllowedLocation: vi.fn() }));
beforeEach(() => {
  vi.resetModules();
});
it("starts on an allowed host", async () => {
  vi.mocked(isAllowedLocation).mockReturnValue(true);
  await import("../../src/content.ts");
  expect(isAllowedLocation).toHaveBeenCalledWith(location);
  expect(startController).toHaveBeenCalledWith(document);
});
it("does nothing on an unrelated host", async () => {
  vi.mocked(isAllowedLocation).mockReturnValue(false);
  await import("../../src/content.ts");
  expect(startController).not.toHaveBeenCalled();
});
