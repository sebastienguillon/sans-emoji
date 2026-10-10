// jsdom has no layout engine and does not implement isContentEditable.
// Supply only these browser primitives; editor behavior uses real DOM/events.
import { beforeEach, vi } from "vitest";

Object.defineProperty(HTMLElement.prototype, "isContentEditable", {
  configurable: true,
  get(this: HTMLElement): boolean {
    const host = this.closest("[contenteditable]");
    return host !== null && host.getAttribute("contenteditable") !== "false";
  },
});
beforeEach(() => {
  document.body.innerHTML = "";
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (
    this: Element,
  ) {
    return (this.hasAttribute("hidden")
      ? []
      : [new DOMRect(0, 0, 10, 10)]) as unknown as DOMRectList;
  });
});

export function modern(prefix = ":", nested = false): HTMLElement {
  const root = document.createElement("div");
  root.setAttribute("contenteditable", "true");
  const query = document.createElement("span");
  query.setAttribute("contenteditable", "true");
  query.dataset["queryPrefix"] = prefix;
  query.tabIndex = -1;
  if (nested) query.append(document.createElement("input"));
  root.append(query);
  document.body.append(root);
  (query.firstElementChild instanceof HTMLElement
    ? query.firstElementChild
    : query
  ).focus();
  return query;
}

export function legacy(text = "Bonjour :smile"): {
  field: HTMLTextAreaElement;
  menu: HTMLElement;
} {
  const field = document.createElement("textarea");
  field.value = text;
  const menu = document.createElement("div");
  menu.className = "ak-emoji-typeahead";
  document.body.append(field, menu);
  field.focus();
  field.setSelectionRange(text.length, text.length);
  return { field, menu };
}
