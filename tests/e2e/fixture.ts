// Runs in the browser through page.evaluate. This is a representative DOM
// fixture, not Atlassian's editor or a substitute for testing a signed-in tenant.
export function mountEditor(options: {
  space: string;
  trigger: string;
  legacy: boolean;
  handlerDelay?: number;
  popupRemovalDelay?: number;
  popupAfterQueryRemoval?: boolean;
  ignoreEscape?: boolean;
  overflow?: "document" | "container";
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
  const mountMenu = (
    className: string,
  ): { menu: HTMLElement; recordQueryRemoval: () => void } => {
    let menuHost: HTMLElement = document.body;
    if (options.overflow === "container") {
      menuHost = document.createElement("div");
      menuHost.style.cssText =
        "position: relative; width: 320px; height: 100px; overflow: auto; border: 1px solid black";
      document.body.append(menuHost);
    }
    const scrollDimensions = (): string =>
      JSON.stringify([
        document.documentElement.scrollWidth,
        document.documentElement.scrollHeight,
        ...(options.overflow === "container"
          ? [menuHost.scrollWidth, menuHost.scrollHeight]
          : []),
      ]);
    const initialScrollDimensions = scrollDimensions();
    const menu = document.createElement("div");
    menu.id = "suggestions";
    menu.className = className;
    menu.style.cssText =
      "opacity: 1; visibility: visible; pointer-events: auto";
    if (options.overflow) {
      const top =
        options.overflow === "document" ? "calc(100vh - 20px)" : "80px";
      const left =
        options.overflow === "document" ? "calc(100vw - 20px)" : "300px";
      menu.style.cssText += `; position: absolute; top: ${top}; left: ${left}; width: 360px; height: 400px; padding: 16px; border: 1px solid black`;
    }
    menu.textContent = "Suggestions";
    if (options.overflow) {
      const content = document.createElement("div");
      content.style.cssText = "min-width: 360px; height: 400px";
      content.textContent = "Suggestions";
      menu.replaceChildren(content);
    }
    if (
      !options.legacy &&
      options.trigger === ":" &&
      (options.popupRemovalDelay || options.popupAfterQueryRemoval)
    ) {
      // Observed in Jira's portaled emoji menu, including after its query is gone.
      const item = document.createElement("div");
      item.className = "ak-emoji-typeahead-item";
      item.setAttribute("data-emoji-id", ":grinning:");
      item.setAttribute("role", "button");
      item.textContent = "😀";
      menu.append(item);
    }
    menuHost.append(menu);
    const status = document.querySelector("#status");
    const recordState = (stage: "mount" | "query-removal"): void => {
      const style = getComputedStyle(menu);
      status?.setAttribute(
        `data-visible-at-${stage}`,
        String(
          style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0",
        ),
      );
      if (options.overflow)
        status?.setAttribute(
          `data-scroll-changed-at-${stage}`,
          String(scrollDimensions() !== initialScrollDimensions),
        );
    };
    // Record visibility synchronously, before any observer/timer can dismiss it.
    recordState("mount");
    const sampleFrame = (): void => {
      if (!menu.isConnected) return;
      const frameStyle = getComputedStyle(menu);
      if (
        frameStyle.display !== "none" &&
        frameStyle.visibility !== "hidden" &&
        frameStyle.opacity !== "0"
      )
        status?.setAttribute("data-visible-frame", "true");
      if (options.overflow && scrollDimensions() !== initialScrollDimensions)
        status?.setAttribute("data-scroll-changed-frame", "true");
      requestAnimationFrame(sampleFrame);
    };
    requestAnimationFrame(sampleFrame);
    return { menu, recordQueryRemoval: () => recordState("query-removal") };
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
      const { menu } = mountMenu("ak-emoji-typeahead");
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
    if (options.popupAfterQueryRemoval) {
      query.replaceWith(document.createTextNode(options.trigger));
      focusEnd();
      setTimeout(() => mountMenu("fabric-editor-typeahead"), 45);
      return;
    }
    const { menu, recordQueryRemoval } = mountMenu("fabric-editor-typeahead");
    registerCancellation(query, () => {
      if (!options.popupRemovalDelay) menu.remove();
      query.replaceWith(document.createTextNode(options.trigger));
      focusEnd();
      if (options.popupRemovalDelay) {
        recordQueryRemoval();
        setTimeout(() => menu.remove(), options.popupRemovalDelay);
      }
    });
    query.focus();
  });
  focusEnd();
}
