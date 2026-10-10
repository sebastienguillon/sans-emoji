import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startController } from "../../src/controller.ts";
import { legacy, modern } from "./setup.ts";

let stop: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
});
const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(200);
};

describe("controller lifecycle", () => {
  it("cancels existing emoji autocomplete and stops polling once removed", async () => {
    const query = modern();
    const onEscape = vi.fn(() => query.remove());
    query.addEventListener("keydown", onEscape);
    stop = startController(document);
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("finds newly mounted nested inputs and delayed handler registration", async () => {
    stop = startController(document);
    const query = modern(":", true);
    const onEscape = vi.fn(() => query.remove());
    await vi.advanceTimersByTimeAsync(45);
    query.addEventListener("keydown", onEscape);
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it.each(["@", "/"])(
    "does not touch %s autocomplete or manual pickers",
    async (prefix) => {
      const query = modern(prefix);
      const onEscape = vi.fn();
      query.addEventListener("keydown", onEscape);
      const picker = document.createElement("div");
      picker.className = "ak-emoji-picker";
      document.body.append(picker);
      stop = startController(document);
      await settle();
      expect(onEscape).not.toHaveBeenCalled();
      expect(picker.isConnected).toBe(true);
    },
  );
  it("bounds retries for an unsupported handler", async () => {
    const query = modern();
    const onEscape = vi.fn();
    query.addEventListener("keydown", onEscape);
    stop = startController(document);
    await settle();
    expect(onEscape).toHaveBeenCalledTimes(4);
    expect(query.isConnected).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("abandons nodes removed or repurposed before a scheduled flush", async () => {
    const removed = modern();
    stop = startController(document);
    removed.remove();
    const query = modern();
    query.dataset["queryPrefix"] = "@";
    await settle();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("reconsiders inactive queries when they later receive focus", async () => {
    const query = modern();
    const onEscape = vi.fn(() => query.remove());
    query.addEventListener("keydown", onEscape);
    query.blur();
    stop = startController(document);
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    query.focus();
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("waits during composition even when a timer was already scheduled", async () => {
    const query = modern();
    const onEscape = vi.fn(() => query.remove());
    query.addEventListener("keydown", onEscape);
    stop = startController(document);
    query.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    query.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true }),
    );
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("waits when the query mounts during composition", async () => {
    stop = startController(document);
    document.dispatchEvent(new CompositionEvent("compositionstart"));
    const query = modern();
    const onEscape = vi.fn(() => query.remove());
    query.addEventListener("keydown", onEscape);
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    document.dispatchEvent(new CompositionEvent("compositionend"));
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("handles repeated legacy popup openings and input resets", async () => {
    const { field, menu } = legacy();
    const onEscape = vi.fn(() => {
      menu.hidden = true;
    });
    field.addEventListener("keydown", onEscape);
    stop = startController(document);
    for (let index = 0; index < 6; index++) {
      menu.hidden = false;
      field.dispatchEvent(new InputEvent("input", { bubbles: true }));
      await settle();
    }
    expect(onEscape).toHaveBeenCalledTimes(6);
    expect(field.value).toBe("Bonjour :smile");
  });
  it("handles legacy focus, non-element events, text nodes and noneditable input", async () => {
    stop = startController(document);
    const { field, menu } = legacy();
    const onEscape = vi.fn(() => {
      menu.hidden = true;
    });
    field.addEventListener("keydown", onEscape);
    document.dispatchEvent(new FocusEvent("focusin"));
    document.dispatchEvent(new InputEvent("input"));
    document.body.append(document.createTextNode("unrelated"));
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("reacts to a query-prefix attribute added after mounting", async () => {
    const query = modern("@");
    const onEscape = vi.fn(() => query.remove());
    query.addEventListener("keydown", onEscape);
    stop = startController(document);
    query.dataset["queryPrefix"] = ":";
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("cleans up pending timers, observers and every event listener", async () => {
    const query = modern();
    const onEscape = vi.fn();
    query.addEventListener("keydown", onEscape);
    const cleanup = startController(document);
    cleanup();
    query.dispatchEvent(new InputEvent("input", { bubbles: true }));
    query.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true }),
    );
    query.blur();
    query.focus();
    modern();
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    cleanup();
  });
  it("can initialize before the document element is available", async () => {
    const early = document.implementation.createHTMLDocument();
    early.documentElement.remove();
    stop = startController(early);
    await settle();
    expect(vi.getTimerCount()).toBe(0);
  });
});
