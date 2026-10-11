// Runs in the browser through page.evaluate. This is a representative DOM
// fixture, not Atlassian's editor or a substitute for testing a signed-in tenant.
export function mountEditor(options: {
  space: string;
  trigger: string;
  legacy: boolean;
  handlerDelay?: number;
  ignoreEscape?: boolean;
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
  const mountMenu = (className: string): HTMLElement => {
    const menu = document.createElement("div");
    menu.id = "suggestions";
    menu.className = className;
    menu.style.cssText =
      "opacity: 1; visibility: visible; pointer-events: auto";
    menu.textContent = "Suggestions";
    document.body.append(menu);
    // Record visibility synchronously, before any observer/timer can dismiss it.
    const style = getComputedStyle(menu);
    const status = document.querySelector("#status");
    status?.setAttribute(
      "data-visible-at-mount",
      String(style.visibility !== "hidden" && style.opacity !== "0"),
    );
    const sampleFrame = (): void => {
      if (!menu.isConnected) return;
      const frameStyle = getComputedStyle(menu);
      if (frameStyle.visibility !== "hidden" && frameStyle.opacity !== "0")
        status?.setAttribute("data-visible-frame", "true");
      requestAnimationFrame(sampleFrame);
    };
    requestAnimationFrame(sampleFrame);
    return menu;
  };
  const registerCancellation = (
    target: HTMLElement,
    cancel: () => void,
  ): void => {
    const register = (): void => {
      target.addEventListener("keydown", (event) => {
        if (
          event instanceof KeyboardEvent &&
          event.key === "Escape" &&
          !options.ignoreEscape
        ) {
          cancel();
          event.preventDefault();
          event.stopPropagation();
        }
      });
    };
    if (options.handlerDelay) setTimeout(register, options.handlerDelay);
    else register();
  };
  editor.addEventListener("input", () => {
    const text =
      editor instanceof HTMLTextAreaElement ? editor.value : editor.textContent;
    if (!text.endsWith(options.trigger)) return;
    if (options.legacy) {
      const menu = mountMenu("ak-emoji-typeahead");
      registerCancellation(editor, () => menu.remove());
      return;
    }
    editor.textContent = text.slice(0, -1);
    const query = document.createElement("span");
    query.setAttribute("contenteditable", "true");
    query.setAttribute("role", "combobox");
    query.setAttribute("data-query-prefix", options.trigger);
    query.tabIndex = -1;
    query.textContent = options.trigger;
    editor.append(query);
    const menu = mountMenu("fabric-editor-typeahead");
    registerCancellation(query, () => {
      menu.remove();
      query.replaceWith(document.createTextNode(options.trigger));
      focusEnd();
    });
    query.focus();
  });
  focusEnd();
}
