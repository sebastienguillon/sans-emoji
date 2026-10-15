# Unreleased

Changes after the prepared [2026.10.14 release](2026.10.14.md).

## Performance

- Keep a registry of emoji query fields and popups from mutation records instead of searching the document on every keystroke, focus change and composition end, and instead of searching the subtree of every element whose class or style changes. On a synthetic 29,164-element page, typing overhead fell from about 1 ms to 0.002 ms or less per keystroke in Chromium and from about 0.5 ms to under 0.04 ms in Firefox, and a class or style change on a page-wide container fell from about 0.9 ms to under 0.01 ms in both.
- Key the stylesheet's document-wide fallback on `data-query-prefix` only. Once any `@`, `/` or `:` menu had been styled, Firefox re-checked the whole document whenever an editable node view changed, adding 28–30 ms per frame of subtree churn on the same page; that overhead is now about 0.2 ms. Chromium's corresponding style cost is unchanged.
## Fixes

- Cancel a query field that becomes editable after it mounts. The previous controller did not observe `contenteditable` changes.
- In Firefox, update an already-rendered suggestion panel when a colon query's decoration mark is inserted or removed after another element in its paragraph, for example after bold text or before the paragraph's trailing break. The panel could stay visible when the query mounted, or stay hidden after it was removed. Reproduced with Firefox 157 fixtures; Chromium was not affected.

## Known limitations

- The modern hiding rule now applies while any `[data-query-prefix=":"]` element exists. Atlaskit sets that attribute only on its contenteditable query field.
- A suggestion panel without emoji items, such as Atlaskit's error fallback, can paint after its query disappears and until Atlaskit unmounts it.
- Chromium still re-checks the document after inserting or removing attributed elements once any menu has been styled. The figures above come from headless browsers on a synthetic page; no live tenant was benchmarked.

## Validation

Recorded on October 15, 2026, for the working tree; not yet a versioned release:

- With Node.js 24.18.0 and pnpm 12.10.1, `pnpm check` passed: all three TypeScript environments, Biome, 103 unit tests at 100% statement, branch, function and line coverage, a clean build, and extension validation with zero errors or actionable warnings (the desktop-only Android warning was skipped).
- `pnpm exec playwright test` passed all 80 Chromium and Firefox fixture checks, including Atlaskit-style decoration marks, next-frame query focus, a query that becomes editable after mounting, a legacy popup shown again through its inline style, and already-rendered menus. With the previous stylesheet, the four already-rendered checks after an inline element or before a trailing break failed in Firefox and passed in Chromium.
- A differential fuzzer ran the 2026.10.14 controller and the new one on 5,500 seeded sequences (about 5.1 million DOM operations) in jsdom. Every divergence was either the intended detection of a query that becomes editable or the order in which two or more simultaneous candidates are cancelled.
- The performance figures come from two benchmark runs in headless Chromium 156.0.8078.4 and Firefox 157.0 on a synthetic page. An earlier review build, before the final retry-timing fix, also retained less JavaScript heap than 2026.10.14 after forced garbage collection, and passed the fixture suite as a real Firefox temporary add-on.
- Not yet checked: live signed-in Jira, Confluence or Bitbucket editors with this build; a real Firefox add-on run of the final build; the Chrome 120 and Firefox 140 minimum versions; `pnpm package`.
