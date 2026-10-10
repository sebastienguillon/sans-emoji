// Runs in the browser through page.evaluate. This is a representative DOM
// fixture, not Atlassian's editor or a substitute for testing a signed-in tenant.
export function mountEditor(options: {
  space: string;
  trigger: string;
  legacy: boolean;
}): void {
  document.body.innerHTML =
    '<button id="picker" type="button">Emoji picker</button><div id="status"></div>';
  const editor = options.legacy
    ? document.createElement("textarea")
    : document.createElement("div");
  editor.id = "editor";
  editor.setAttribute("aria-label", "Editor");
  editor.setAttribute("role", "textbox");
  editor.setAttribute("contenteditable", "true");
  editor.style.cssText =
    "white-space: pre-wrap; min-height: 100px; border: 1px solid black; padding: 16px";
  const initial = `Bonjour${options.space}`;
  if (editor instanceof HTMLTextAreaElement) editor.value = initial;
  else editor.textContent = initial;
  document.body.prepend(editor);
  document.querySelector("#picker")?.addEventListener("click", () => {
    const picker = document.createElement("div");
    picker.className = "ak-emoji-picker";
    picker.textContent = "😀";
    document.body.append(picker);
  });
  const focusEnd = (): void => {
    editor.focus();
    if (editor instanceof HTMLTextAreaElement)
      editor.setSelectionRange(editor.value.length, editor.value.length);
    else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };
  editor.addEventListener("input", () => {
    const text =
      editor instanceof HTMLTextAreaElement ? editor.value : editor.textContent;
    if (!text.endsWith(options.trigger)) return;
    if (options.legacy) {
      const menu = document.createElement("div");
      menu.className = "ak-emoji-typeahead";
      menu.textContent = "Emoji suggestions";
      document.body.append(menu);
      editor.addEventListener(
        "keydown",
        (event) => {
          if (event instanceof KeyboardEvent && event.key === "Escape") {
            menu.remove();
            event.preventDefault();
          }
        },
        { once: true },
      );
      return;
    }
    editor.textContent = text.slice(0, -1);
    const query = document.createElement("span");
    query.setAttribute("contenteditable", "true");
    query.setAttribute("role", "combobox");
    query.setAttribute("data-query-prefix", options.trigger);
    query.tabIndex = -1;
    query.textContent = options.trigger;
    query.addEventListener("keydown", (event) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        query.replaceWith(document.createTextNode(options.trigger));
        focusEnd();
        event.preventDefault();
        event.stopPropagation();
      }
    });
    editor.append(query);
    query.focus();
  });
  focusEnd();
}
