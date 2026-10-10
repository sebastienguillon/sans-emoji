import {
  CANDIDATE_SELECTOR,
  dismiss,
  dismissalTarget,
  isEditable,
  LEGACY_SELECTOR,
  QUERY_SELECTOR,
} from "./dom.ts";

export function startController(document: Document): () => void {
  const attempts = new WeakMap<Element, number>();
  const candidates = new Set<Element>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let composing = false;

  function schedule(delay: number): void {
    if (candidates.size && timer === null && !composing)
      timer = setTimeout(flush, delay);
  }

  function flush(): void {
    timer = null;
    if (composing) return;
    for (const candidate of candidates) {
      if (!candidate.isConnected || !candidate.matches(CANDIDATE_SELECTOR)) {
        candidates.delete(candidate);
        continue;
      }
      const target = dismissalTarget(candidate, document);
      if (!target) {
        attempts.delete(candidate);
        candidates.delete(candidate);
        continue;
      }
      const count = attempts.get(candidate) ?? 0;
      if (count >= 4) {
        // Fail open: never hide a still-active keyboard menu or retry forever.
        candidates.delete(candidate);
        continue;
      }
      attempts.set(candidate, count + 1);
      dismiss(target);
    }
    schedule(32);
  }

  function scan(root: Node | null): void {
    if (!(root instanceof Element)) return;
    if (root.matches(CANDIDATE_SELECTOR)) candidates.add(root);
    root.querySelectorAll(CANDIDATE_SELECTOR).forEach((node) => {
      candidates.add(node);
    });
    schedule(0);
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") scan(record.target);
      else record.addedNodes.forEach(scan);
    }
  });
  observer.observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-query-prefix", "class", "hidden", "style"],
  });

  function onFocus(event: FocusEvent): void {
    if (event.target instanceof Element) {
      const query = event.target.closest(QUERY_SELECTOR);
      if (query) scan(query);
    }
    document.querySelectorAll(LEGACY_SELECTOR).forEach(scan);
  }
  function onCompositionStart(): void {
    composing = true;
  }
  function onCompositionEnd(): void {
    composing = false;
    scan(document.documentElement);
  }
  function onInput(event: Event): void {
    if (isEditable(event.target)) {
      document.querySelectorAll(CANDIDATE_SELECTOR).forEach((candidate) => {
        attempts.delete(candidate);
        scan(candidate);
      });
    }
  }

  document.addEventListener("focusin", onFocus, true);
  document.addEventListener("compositionstart", onCompositionStart, true);
  document.addEventListener("compositionend", onCompositionEnd, true);
  document.addEventListener("input", onInput, true);
  scan(document.documentElement);

  return () => {
    observer.disconnect();
    if (timer !== null) clearTimeout(timer);
    candidates.clear();
    document.removeEventListener("focusin", onFocus, true);
    document.removeEventListener("compositionstart", onCompositionStart, true);
    document.removeEventListener("compositionend", onCompositionEnd, true);
    document.removeEventListener("input", onInput, true);
  };
}
