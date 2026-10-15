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
    // Unrelated mutations re-arm known candidates without resetting retries.
    document.body.style.color = "red";
    await settle();
    expect(onEscape).toHaveBeenCalledTimes(4);
  });
  it("keeps retries bounded when a non-editable control reports input", async () => {
    const query = modern();
    const onEscape = vi.fn();
    query.addEventListener("keydown", onEscape);
    const box = document.createElement("input");
    box.type = "checkbox";
    document.body.append(box);
    stop = startController(document);
    await settle();
    expect(onEscape).toHaveBeenCalledTimes(4);
    box.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await settle();
    expect(onEscape).toHaveBeenCalledTimes(4);
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
  it("reconsiders an inactive query when a nested node receives focus", async () => {
    const query = modern(":", true);
    const inner = query.firstElementChild as HTMLElement;
    const onEscape = vi.fn(() => query.remove());
    query.addEventListener("keydown", onEscape);
    inner.blur();
    stop = startController(document);
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    inner.focus();
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("reconsiders a legacy popup when its editor regains focus", async () => {
    const { field, menu } = legacy();
    const onEscape = vi.fn(() => menu.remove());
    field.addEventListener("keydown", onEscape);
    field.blur();
    stop = startController(document);
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    field.focus();
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

describe("candidate registry", () => {
  it("does no document-wide work on input, focus, composition or attribute churn without candidates", async () => {
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    document.body.append(editor);
    stop = startController(document);
    await settle();
    const isContentEditable = vi.spyOn(
      HTMLElement.prototype,
      "isContentEditable",
      "get",
    );
    const documentSearch = vi.spyOn(Document.prototype, "querySelectorAll");
    const elementSearch = vi.spyOn(Element.prototype, "querySelectorAll");
    const closest = vi.spyOn(Element.prototype, "closest");
    editor.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    editor.className = "busy";
    editor.style.color = "red";
    editor.append(document.createElement("br"));
    editor.replaceChildren();
    editor.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    editor.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true }),
    );
    editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await settle();
    expect(isContentEditable).not.toHaveBeenCalled();
    expect(documentSearch).not.toHaveBeenCalled();
    expect(elementSearch).not.toHaveBeenCalled();
    expect(closest).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("queries a subtree added in one batch once, through its root", async () => {
    const field = document.createElement("textarea");
    field.value = "Bonjour :";
    document.body.append(field);
    field.focus();
    field.setSelectionRange(9, 9);
    const onEscape = vi.fn();
    field.addEventListener("keydown", onEscape);
    stop = startController(document);
    const search = vi.spyOn(Element.prototype, "querySelectorAll");
    const portal = document.createElement("div");
    document.body.append(portal);
    const menu = document.createElement("div");
    menu.className = "ak-emoji-typeahead";
    portal.append(menu);
    const row = document.createElement("div");
    menu.append(row);
    row.append(document.createElement("span"));
    await settle();
    expect(onEscape).toHaveBeenCalledTimes(4);
    // One query per selector, both on the portal.
    expect(search.mock.contexts).toEqual([portal, portal]);
  });
  it("registers a candidate in an unrelated subtree added in the same batch", async () => {
    const field = document.createElement("textarea");
    field.value = "Bonjour :";
    document.body.append(field);
    field.focus();
    field.setSelectionRange(9, 9);
    const onEscape = vi.fn();
    field.addEventListener("keydown", onEscape);
    stop = startController(document);
    const first = document.createElement("div");
    first.append(document.createElement("span"));
    document.body.append(first);
    const second = document.createElement("div");
    const menu = document.createElement("div");
    menu.className = "ak-emoji-typeahead";
    second.append(menu);
    document.body.append(second);
    await settle();
    expect(onEscape).toHaveBeenCalledTimes(4);
  });
  it("does not query childless added elements", async () => {
    stop = startController(document);
    await settle();
    const search = vi.spyOn(Element.prototype, "querySelectorAll");
    document.body.append(document.createElement("br"));
    await settle();
    expect(search).not.toHaveBeenCalled();
  });
  it("detects a query field that becomes editable after mounting", async () => {
    const root = document.createElement("div");
    root.setAttribute("contenteditable", "true");
    const query = document.createElement("span");
    query.dataset["queryPrefix"] = ":";
    query.setAttribute("contenteditable", "false");
    query.tabIndex = -1;
    root.append(query);
    document.body.append(root);
    query.focus();
    const onEscape = vi.fn(() => query.remove());
    query.addEventListener("keydown", onEscape);
    stop = startController(document);
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    query.setAttribute("contenteditable", "true");
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("cancels a legacy popup revealed by removing hidden", async () => {
    const { field, menu } = legacy();
    menu.hidden = true;
    const onEscape = vi.fn(() => {
      menu.hidden = true;
    });
    field.addEventListener("keydown", onEscape);
    stop = startController(document);
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    menu.hidden = false;
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("detects a legacy popup that gains its class after mounting", async () => {
    const { field, menu } = legacy();
    menu.className = "";
    const onEscape = vi.fn(() => menu.remove());
    field.addEventListener("keydown", onEscape);
    stop = startController(document);
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    menu.className = "ak-emoji-typeahead";
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("re-checks a known candidate when an ancestor style changes without input", async () => {
    const { field, menu } = legacy();
    field.setSelectionRange(0, 0);
    const onEscape = vi.fn(() => menu.remove());
    field.addEventListener("keydown", onEscape);
    stop = startController(document);
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    field.setSelectionRange(field.value.length, field.value.length);
    const sibling = document.createElement("p");
    document.body.append(sibling);
    sibling.className = "unrelated";
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    document.body.style.color = "red";
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("re-reads the document after a large mutation batch", async () => {
    stop = startController(document);
    for (let index = 0; index < 1100; index++)
      document.body.append(document.createElement("span"));
    document.body.className = "loaded";
    const { field, menu } = legacy();
    const onEscape = vi.fn(() => menu.remove());
    field.addEventListener("keydown", onEscape);
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("reads a large batch through the document element", async () => {
    stop = startController(document);
    await settle();
    const matches = vi.spyOn(Element.prototype, "matches");
    const search = vi.spyOn(Element.prototype, "querySelectorAll");
    for (let index = 0; index < 1100; index++)
      document.body.append(document.createElement("span"));
    await settle();
    expect(matches.mock.contexts).toEqual([document.documentElement]);
    expect(search.mock.contexts).toEqual([
      document.documentElement,
      document.documentElement,
    ]);
  });
  it("cancels a popup mounted in a large batch without other changes", async () => {
    const field = document.createElement("textarea");
    field.value = "Bonjour :";
    document.body.append(field);
    field.focus();
    field.setSelectionRange(9, 9);
    const menu = document.createElement("div");
    menu.className = "ak-emoji-typeahead";
    const onEscape = vi.fn(() => menu.remove());
    field.addEventListener("keydown", onEscape);
    stop = startController(document);
    for (let index = 0; index < 1100; index++)
      document.body.append(document.createElement("span"));
    document.body.append(menu);
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("re-arms only candidates inside large-batch additions or changed elements", async () => {
    const { field, menu } = legacy();
    field.setSelectionRange(0, 0);
    const onEscape = vi.fn(() => menu.remove());
    field.addEventListener("keydown", onEscape);
    stop = startController(document);
    await settle();
    // The caret now follows a colon query, but nothing reports it.
    field.setSelectionRange(field.value.length, field.value.length);
    for (let index = 0; index < 1100; index++)
      document.body.append(document.createElement("span"));
    await settle();
    expect(onEscape).not.toHaveBeenCalled();
    document.body.style.color = "red";
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
  });
  it("resets retries for remaining candidates on input after one is removed", async () => {
    const first = legacy();
    const onEscape = vi.fn();
    first.field.addEventListener("keydown", onEscape);
    const stale = document.createElement("div");
    stale.className = "ak-emoji-typeahead";
    document.body.append(stale);
    stop = startController(document);
    await settle();
    expect(onEscape).toHaveBeenCalledTimes(8);
    stale.remove();
    first.field.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await settle();
    expect(onEscape).toHaveBeenCalledTimes(12);
  });
  it("resets retries for a popup re-attached in the same task as input", async () => {
    const { field, menu } = legacy();
    const onEscape = vi.fn();
    field.addEventListener("keydown", onEscape);
    stop = startController(document);
    await settle();
    expect(onEscape).toHaveBeenCalledTimes(4);
    menu.remove();
    await settle();
    document.body.append(menu);
    field.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await settle();
    expect(onEscape).toHaveBeenCalledTimes(8);
  });
  it("releases removed candidates when removal records arrive", async () => {
    const { field, menu } = legacy("Bonjour");
    stop = startController(document);
    await settle();
    menu.remove();
    await settle();
    const editable = vi.spyOn(HTMLTextAreaElement.prototype, "disabled", "get");
    field.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(editable).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("releases a repurposed popup before input does any work", async () => {
    const { field, menu } = legacy("Bonjour");
    stop = startController(document);
    await settle();
    menu.className = "unrelated";
    const editable = vi.spyOn(HTMLTextAreaElement.prototype, "disabled", "get");
    field.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(editable).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("releases a repurposed query when its attribute record arrives", async () => {
    const query = modern();
    stop = startController(document);
    await settle();
    query.dataset["queryPrefix"] = "@";
    const isContentEditable = vi.spyOn(
      HTMLElement.prototype,
      "isContentEditable",
      "get",
    );
    query.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(isContentEditable).not.toHaveBeenCalled();
    await settle();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("handles a large batch before the document element exists", async () => {
    const early = document.implementation.createHTMLDocument();
    early.documentElement.remove();
    stop = startController(early);
    for (let index = 0; index < 1100; index++)
      early.append(early.createComment(""));
    await settle();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("page events inside the synthetic Escape", () => {
  // Page listeners can answer Escape synchronously with mutations plus input
  // or focus events. Those must not shorten the retry cadence of the cycle.
  it("keeps the retry cadence when an ignoring handler mutates and reports input", async () => {
    const query = modern();
    const portal = document.body.appendChild(document.createElement("div"));
    const times: number[] = [];
    query.addEventListener("keydown", () => {
      times.push(Date.now());
      portal.classList.toggle("busy");
      document.body.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const start = Date.now();
    stop = startController(document);
    await vi.advanceTimersByTimeAsync(1000);
    expect(times.map((time) => time - start)).toEqual([0, 32, 64, 96]);
  });
  it("keeps the retry cadence when an ignoring handler mutates and reports focus", async () => {
    const query = modern();
    const portal = document.body.appendChild(document.createElement("div"));
    const times: number[] = [];
    query.addEventListener("keydown", () => {
      times.push(Date.now());
      portal.classList.toggle("busy");
      document.body.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });
    const start = Date.now();
    stop = startController(document);
    await vi.advanceTimersByTimeAsync(1000);
    expect(times.map((time) => time - start)).toEqual([0, 32, 64, 96]);
  });
  it("still reaches a handler registered later when a page-wide listener reports input", async () => {
    const query = modern();
    const portal = document.body.appendChild(document.createElement("div"));
    const pageListener = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      portal.classList.toggle("busy");
      document.body.dispatchEvent(new Event("input", { bubbles: true }));
    };
    document.addEventListener("keydown", pageListener, true);
    try {
      stop = startController(document);
      await vi.advanceTimersByTimeAsync(45);
      const onEscape = vi.fn(() => query.remove());
      query.addEventListener("keydown", onEscape);
      await vi.advanceTimersByTimeAsync(200);
      expect(onEscape).toHaveBeenCalledOnce();
    } finally {
      document.removeEventListener("keydown", pageListener, true);
    }
  });
  it("stops after four attempts when the handler blurs, mutates and refocuses within a retry interval", async () => {
    const query = modern();
    const editor = query.parentElement as HTMLElement;
    const portal = document.body.appendChild(document.createElement("div"));
    let calls = 0;
    query.addEventListener("keydown", () => {
      calls++;
      portal.classList.toggle("busy");
      editor.focus();
      setTimeout(() => query.focus(), 14);
    });
    stop = startController(document);
    await vi.advanceTimersByTimeAsync(3000);
    expect(calls).toBe(4);
  });
  it("registers a popup mounted by the handler and retries it on the next interval", async () => {
    const { field } = legacy("Bonjour :sm");
    const times: number[] = [];
    let mounted = false;
    field.addEventListener("keydown", () => {
      times.push(Date.now());
      if (mounted) return;
      mounted = true;
      document.body.append(document.createTextNode(" "));
      const second = document.createElement("div");
      second.className = "ak-emoji-typeahead";
      document.body.append(second);
      const query = document.createElement("span");
      query.dataset["queryPrefix"] = ":";
      query.setAttribute("contenteditable", "true");
      document.body.append(query);
      document.body.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const start = Date.now();
    stop = startController(document);
    await vi.advanceTimersByTimeAsync(1000);
    expect(times.map((time) => time - start)).toEqual([
      0, 32, 32, 64, 64, 96, 96, 128,
    ]);
  });
  it("registers an element the handler turns into a popup and retries it on the next interval", async () => {
    const { field } = legacy("Bonjour :sm");
    const later = document.body.appendChild(document.createElement("div"));
    const times: number[] = [];
    field.addEventListener("keydown", () => {
      times.push(Date.now());
      if (later.className) return;
      later.className = "ak-emoji-typeahead";
      document.body.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const start = Date.now();
    stop = startController(document);
    await vi.advanceTimersByTimeAsync(1000);
    expect(times.map((time) => time - start)).toEqual([
      0, 32, 32, 64, 64, 96, 96, 128,
    ]);
  });
  it("sends one Escape when the handler removes the query and refocuses the editor", async () => {
    const query = modern();
    const editor = query.parentElement as HTMLElement;
    const onEscape = vi.fn(() => {
      query.remove();
      editor.classList.add("ProseMirror-focused");
      editor.focus();
    });
    query.addEventListener("keydown", onEscape);
    stop = startController(document);
    await settle();
    expect(onEscape).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
