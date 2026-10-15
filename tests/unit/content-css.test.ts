// @vitest-environment node
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";

const css = await readFile(
  new URL("../../extension/content.css", import.meta.url),
  "utf8",
);
const selectors = css
  .slice(css.lastIndexOf("*/") + 2, css.indexOf("{"))
  .replace(/\s+/gu, " ")
  .trim();

it("keys the document-wide query fallback on data-query-prefix only", () => {
  // Naming contenteditable made Firefox re-check the whole document on every
  // editable node view change once any menu had been styled (README performance notes).
  expect(selectors).toBe(
    '.ak-emoji-typeahead, .fabric-editor-typeahead:has(.ak-emoji-typeahead-item), :root:has([data-query-prefix=":"]) .fabric-editor-typeahead',
  );
});
