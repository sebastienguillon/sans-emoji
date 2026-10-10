import { describe, expect, it, vi } from "vitest";
import {
  dismiss,
  dismissalTarget,
  isAllowedLocation,
  isEditable,
} from "../../src/dom.ts";
import { legacy, modern } from "./setup.ts";

describe("domain scope", () => {
  it.each([
    "atlassian.net",
    "test.atlassian.net",
    "atlassian.com",
    "jira.atlassian.com",
    "bitbucket.org",
    "sub.bitbucket.org",
  ])("allows HTTPS %s", (hostname) => {
    expect(isAllowedLocation({ protocol: "https:", hostname })).toBe(true);
  });
  it.each([
    "example.org",
    "fakeatlassian.net",
    "atlassian.net.example.org",
    "bitbucket.org.evil",
    "",
  ])("rejects %s", (hostname) => {
    expect(isAllowedLocation({ protocol: "https:", hostname })).toBe(false);
  });
  it.each(["http:", "file:", "about:"])("rejects protocol %s", (protocol) => {
    expect(isAllowedLocation({ protocol, hostname: "atlassian.net" })).toBe(
      false,
    );
  });
});

describe("editable targets", () => {
  it("rejects absent and non-HTML targets", () => {
    expect(isEditable(null)).toBe(false);
    expect(isEditable(document)).toBe(false);
    expect(
      isEditable(document.createElementNS("http://www.w3.org/2000/svg", "svg")),
    ).toBe(false);
  });
  it.each(["text", "search"])("accepts writable %s inputs", (type) => {
    const input = document.createElement("input");
    input.type = type;
    expect(isEditable(input)).toBe(true);
    input.disabled = true;
    expect(isEditable(input)).toBe(false);
    input.disabled = false;
    input.readOnly = true;
    expect(isEditable(input)).toBe(false);
  });
  it("rejects unsupported input types and noneditable elements", () => {
    const input = document.createElement("input");
    input.type = "password";
    expect(isEditable(input)).toBe(false);
    expect(isEditable(document.createElement("div"))).toBe(false);
  });
  it("checks textarea disabled and readonly states", () => {
    const field = document.createElement("textarea");
    expect(isEditable(field)).toBe(true);
    field.disabled = true;
    expect(isEditable(field)).toBe(false);
    field.disabled = false;
    field.readOnly = true;
    expect(isEditable(field)).toBe(false);
  });
  it("recognizes inherited editable regions", () => {
    const query = modern();
    expect(isEditable(query)).toBe(true);
  });
});

describe("dismissal target", () => {
  it.each([false, true])(
    "uses the modern query when focused (nested input: %s)",
    (nested) => {
      const query = modern(":", nested);
      expect(dismissalTarget(query, document)).toBe(query);
    },
  );
  it("ignores detached, invisible and unfocused candidates", () => {
    const query = modern();
    query.hidden = true;
    expect(dismissalTarget(query, document)).toBeNull();
    query.hidden = false;
    modern();
    expect(dismissalTarget(query, document)).toBeNull();
    document.activeElement instanceof HTMLElement &&
      document.activeElement.blur();
    expect(dismissalTarget(query, document)).toBeNull();
    query.remove();
    expect(dismissalTarget(query, document)).toBeNull();
  });
  it("rejects non-HTML elements masquerading as a modern query", () => {
    const candidate = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    candidate.setAttribute("data-query-prefix", ":");
    candidate.setAttribute("contenteditable", "true");
    document.body.append(candidate);
    modern();
    expect(dismissalTarget(candidate, document)).toBeNull();
  });
  it.each([
    "Bonjour :suite",
    "Bonjour\u00a0:suite",
    "Bonjour\u202f:suite",
    ":",
  ])("detects legacy colon query %s without modifying text", (text) => {
    const { field, menu } = legacy(text);
    expect(dismissalTarget(menu, document)).toBe(field);
    expect(field.value).toBe(text);
  });
  it.each(["https://example.org", "Bonjour", "Bonjour : suite", ":smile:"])(
    "rejects non-query text %s",
    (text) => {
      const { menu } = legacy(text);
      expect(dismissalTarget(menu, document)).toBeNull();
    },
  );
  it("rejects range selections and unsupported input selection APIs", () => {
    const { field, menu } = legacy();
    field.setSelectionRange(0, 3);
    expect(dismissalTarget(menu, document)).toBeNull();
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    vi.spyOn(input, "selectionStart", "get").mockReturnValue(null);
    expect(dismissalTarget(menu, document)).toBeNull();
  });
  it("supports a legacy text input", () => {
    const { menu } = legacy();
    const input = document.createElement("input");
    input.value = "Bonjour :";
    document.body.append(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    expect(dismissalTarget(menu, document)).toBe(input);
  });
  it("reads the caret inside a legacy rich-text editor", () => {
    const { menu } = legacy();
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    editor.textContent = "Bonjour :suite";
    document.body.append(editor);
    editor.focus();
    const selection = document.getSelection();
    if (!selection) throw new Error("Missing selection");
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    expect(dismissalTarget(menu, document)).toBe(editor);
    expect(editor.textContent).toBe("Bonjour :suite");

    selection.selectAllChildren(editor);
    expect(dismissalTarget(menu, document)).toBeNull();
    selection.removeAllRanges();
    expect(dismissalTarget(menu, document)).toBeNull();
    selection.selectAllChildren(menu);
    selection.collapseToEnd();
    expect(dismissalTarget(menu, document)).toBeNull();
    vi.spyOn(document, "getSelection").mockReturnValue(null);
    expect(dismissalTarget(menu, document)).toBeNull();
  });
  it("rejects a collapsed selection without a range", () => {
    const { menu } = legacy();
    modern();
    vi.spyOn(document, "getSelection").mockReturnValue({
      isCollapsed: true,
      rangeCount: 0,
    } as Selection);
    expect(dismissalTarget(menu, document)).toBeNull();
  });
});

describe("Escape cancellation", () => {
  it("sends compatible Escape fields while containing only its own event", () => {
    const query = modern();
    const outer = vi.fn();
    const received: KeyboardEvent[] = [];
    document.addEventListener("keydown", outer);
    query.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        received.push(event);
        query.dispatchEvent(
          new KeyboardEvent("keydown", { key: "x", bubbles: true }),
        );
      }
    });
    dismiss(query);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
      cancelable: true,
    });
    expect(outer).toHaveBeenCalledTimes(1);
    query.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(outer).toHaveBeenCalledTimes(2);
    document.removeEventListener("keydown", outer);
  });
  it("removes the temporary listener even when dispatch fails", () => {
    const query = modern();
    const remove = vi.spyOn(query, "removeEventListener");
    vi.spyOn(query, "dispatchEvent").mockImplementation(() => {
      throw new Error("dispatch failed");
    });
    expect(() => dismiss(query)).toThrow("dispatch failed");
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});
