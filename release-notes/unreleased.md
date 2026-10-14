# Unreleased

Changes after the first tagged release, [2026.10.10](2026.10.10.md).

## Popup layout

- Collapsed hidden emoji suggestions into a zero-sized, contained box so mounting their contents cannot briefly expand the page or a scroll container and introduce a scrollbar. The inline colon/query remains visible, and legacy popup cancellation retains its client-rect check.
- Matched modern popups by their emoji suggestion items as well as the inline query. This keeps late-mounted popups and popups awaiting removal suppressed after the query field disappears.
- Added browser regressions that measure scrolling immediately when modern and legacy popups mount and on subsequent animation frames, including when cancellation is unavailable or the popup and query have different lifetimes. Mentions, slash commands, and the manual emoji picker remain covered.
- Validation: `pnpm with current check` passed all three TypeScript environments, lint, 74 unit tests with 100% coverage, the clean build, and extension validation with no errors or actionable warnings. `pnpm with current exec playwright test` passed all 58 Chromium/Firefox fixture checks. Eight overflow cases reproduced the original problem, and four delayed-removal cases exposed the query-selector timing gap before its fix.
- Verified the stylesheet in a signed-in Jira description editor in Zen using a temporary style element: the old popup expanded document height from 1,166 px to 1,554 px; with the complete fix, recorded popup states kept it at 1,166 px, including after the query disappeared. The popup was subsequently removed. The draft text and image were restored without saving the issue. Bitbucket was covered by local fixtures, not a live account check.
- The commands used the installed pnpm 12.4.2 because automatic selection of the pinned version stalled. No release archives were produced for this change.
