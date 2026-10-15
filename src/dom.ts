export const QUERY_SELECTOR = '[data-query-prefix=":"][contenteditable="true"]';
export const LEGACY_SELECTOR = ".ak-emoji-typeahead";
export const CANDIDATE_SELECTORS = [QUERY_SELECTOR, LEGACY_SELECTOR] as const;
export const CANDIDATE_SELECTOR = CANDIDATE_SELECTORS.join(", ");

const DOMAINS = ["atlassian.net", "atlassian.com", "bitbucket.org"] as const;

export function isAllowedLocation(
  location: Pick<Location, "protocol" | "hostname">,
): boolean {
  return (
    location.protocol === "https:" &&
    DOMAINS.some(
      (domain) =>
        location.hostname === domain ||
        location.hostname.endsWith(`.${domain}`),
    )
  );
}

export function isEditable(
  element: EventTarget | null,
): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (element instanceof HTMLInputElement) {
    return (
      /^(text|search)$/.test(element.type) &&
      !element.disabled &&
      !element.readOnly
    );
  }
  if (element instanceof HTMLTextAreaElement)
    return !element.disabled && !element.readOnly;
  return element.isContentEditable;
}

export function dismissalTarget(
  candidate: Element,
  document: Document,
): HTMLElement | null {
  if (!candidate.isConnected || !candidate.getClientRects().length) return null;
  const active = document.activeElement;
  if (!isEditable(active)) return null;
  if (candidate.matches(QUERY_SELECTOR)) {
    return candidate instanceof HTMLElement && candidate.contains(active)
      ? candidate
      : null;
  }

  // Legacy popups are portaled outside their editor. Require a colon query
  // immediately before its caret before sending any cancellation event.
  let before: string;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement
  ) {
    if (
      active.selectionStart === null ||
      active.selectionStart !== active.selectionEnd
    )
      return null;
    before = active.value.slice(0, active.selectionStart);
  } else {
    const selection = document.getSelection();
    if (
      !selection?.isCollapsed ||
      !selection.rangeCount ||
      !selection.anchorNode ||
      !active.contains(selection.anchorNode)
    )
      return null;
    const range = selection.getRangeAt(0).cloneRange();
    range.selectNodeContents(active);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    before = range.toString();
  }
  return /(?:^|\s):[^\s:]*$/u.test(before) ? active : null;
}

export function dismiss(target: HTMLElement): void {
  // Let Atlaskit restore the colon/query through its own cancellation transaction.
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    which: 27,
    bubbles: true,
    cancelable: true,
  });
  const contain = (received: Event): void => {
    if (received === event) received.stopPropagation();
  };
  target.addEventListener("keydown", contain);
  try {
    target.dispatchEvent(event);
  } finally {
    target.removeEventListener("keydown", contain);
  }
}
