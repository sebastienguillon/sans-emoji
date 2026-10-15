import {
  CANDIDATE_SELECTOR,
  CANDIDATE_SELECTORS,
  dismiss,
  dismissalTarget,
  isEditable,
  LEGACY_SELECTOR,
  QUERY_SELECTOR,
} from "./dom.ts";

// Parsing a server-rendered page reports every node: past this many records,
// one pair of document queries costs less than one subtree query per record.
const LARGE_BATCH = 1024;

export function startController(document: Document): () => void {
  const attempts = new WeakMap<Element, number>();
  // Every candidate in the document, kept current from mutation records so
  // input, focus and composition never search the document.
  const known = new Set<Element>();
  // Candidates in the current attempt cycle.
  const candidates = new Set<Element>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let composing = false;
  // Page listeners may answer our synthetic Escape with input or focus events.
  // Records they take must not re-arm until this flush has armed its retry.
  let flushing = false;
  let deferred: MutationRecord[] = [];

  function schedule(delay: number): void {
    if (candidates.size && timer === null && !composing)
      timer = setTimeout(flush, delay);
  }

  function flush(): void {
    timer = null;
    if (composing) return;
    flushing = true;
    try {
      for (const candidate of candidates) {
        if (!candidate.isConnected || !candidate.matches(CANDIDATE_SELECTOR)) {
          candidates.delete(candidate);
          known.delete(candidate);
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
          // Stop retrying unsupported handlers; declarative CSS keeps the popup hidden.
          candidates.delete(candidate);
          continue;
        }
        attempts.set(candidate, count + 1);
        dismiss(target);
      }
    } finally {
      flushing = false;
    }
    schedule(32);
    if (deferred.length) {
      const records = deferred;
      deferred = [];
      process(records);
    }
  }

  function registerTree(root: Element): void {
    if (root.matches(CANDIDATE_SELECTOR)) known.add(root);
    if (root.firstElementChild === null) return;
    // Query each selector on its own: engines keep their fast paths for a single
    // compound selector but match a selector list element by element.
    for (const selector of CANDIDATE_SELECTORS) {
      const found = root.querySelectorAll(selector);
      for (let index = 0; index < found.length; index++)
        known.add(found[index] as Element);
    }
  }

  // Forgets removed or repurposed candidates.
  function prune(): void {
    for (const candidate of known)
      if (!candidate.isConnected || !candidate.matches(CANDIDATE_SELECTOR))
        known.delete(candidate);
  }

  // Starts an attempt cycle for every current candidate inside root.
  function collect(root: Node, reset = false): void {
    prune();
    for (const candidate of known) {
      if (!root.contains(candidate)) continue;
      if (reset) attempts.delete(candidate);
      candidates.add(candidate);
    }
    schedule(0);
  }

  function process(records: MutationRecord[]): void {
    const whole = records.length > LARGE_BATCH;
    if (whole && document.documentElement)
      registerTree(document.documentElement);
    // A node whose parent was added earlier in the same batch is covered by
    // that parent's subtree query and collection.
    const added = new Set<Node | null>();
    for (const record of records) {
      if (record.type === "attributes") {
        const target = record.target as Element;
        // style and hidden only change whether existing candidates have a box.
        if (
          !whole &&
          record.attributeName !== "style" &&
          record.attributeName !== "hidden" &&
          target.matches(CANDIDATE_SELECTOR)
        )
          known.add(target);
        if (known.size) collect(target);
        continue;
      }
      // Test the registry first: reading removedNodes allocates a NodeList.
      if (known.size && record.removedNodes.length) prune();
      if (whole && !known.size) continue;
      // Index the live NodeList: its iterator is measurably slower in Chromium.
      const nodes = record.addedNodes;
      for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index] as Node;
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const covered = added.has(node.parentNode);
        // Read at callback time: an element without element children covers nothing.
        if ((node as Element).firstElementChild !== null) added.add(node);
        if (covered) continue;
        if (!whole) registerTree(node as Element);
        if (known.size) collect(node);
      }
    }
  }

  const observer = new MutationObserver(process);
  observer.observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      "data-query-prefix",
      "contenteditable",
      "class",
      "hidden",
      "style",
    ],
  });
  // Apply mutations made earlier in this task before reading the registry.
  function sync(): void {
    const records = observer.takeRecords();
    if (!flushing) {
      process(records);
      return;
    }
    // Keep the registry complete for the handler that reads it; re-arm after flush.
    for (const record of records) {
      if (record.type === "attributes") {
        const target = record.target as Element;
        if (target.matches(CANDIDATE_SELECTOR)) known.add(target);
        continue;
      }
      if (record.removedNodes.length) prune();
      const nodes = record.addedNodes;
      for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index] as Node;
        if (node.nodeType === Node.ELEMENT_NODE) registerTree(node as Element);
      }
    }
    deferred.push(...records);
  }

  function onFocus(event: FocusEvent): void {
    sync();
    if (!known.size) return;
    const query =
      event.target instanceof Element
        ? event.target.closest(QUERY_SELECTOR)
        : null;
    if (query) collect(query);
    for (const candidate of [...known])
      if (candidate.matches(LEGACY_SELECTOR)) collect(candidate);
  }
  function onCompositionStart(): void {
    composing = true;
  }
  function onCompositionEnd(): void {
    composing = false;
    sync();
    collect(document);
  }
  function onInput(event: Event): void {
    sync();
    if (known.size && isEditable(event.target)) collect(document, true);
  }

  document.addEventListener("focusin", onFocus, true);
  document.addEventListener("compositionstart", onCompositionStart, true);
  document.addEventListener("compositionend", onCompositionEnd, true);
  document.addEventListener("input", onInput, true);
  if (document.documentElement) {
    registerTree(document.documentElement);
    collect(document);
  }

  return () => {
    observer.disconnect();
    if (timer !== null) clearTimeout(timer);
    candidates.clear();
    known.clear();
    deferred = [];
    document.removeEventListener("focusin", onFocus, true);
    document.removeEventListener("compositionstart", onCompositionStart, true);
    document.removeEventListener("compositionend", onCompositionEnd, true);
    document.removeEventListener("input", onInput, true);
  };
}
