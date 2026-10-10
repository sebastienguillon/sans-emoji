# Sans Emoji

A Manifest V3 extension for Chrome and Firefox that dismisses colon-triggered emoji autocomplete on Atlassian sites. Particularly useful for French text such as `Bonjour : voici les détails`.

## Development

Use **Node.js 24+**, **pnpm 12+**, and **TypeScript 7**. The project pins pnpm 12.10.1 and TypeScript 7.0.2; `pnpm-lock.yaml` pins the dependency tree. The extension itself has no runtime dependencies.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

`pnpm check` runs the strict TypeScript compiler, Biome, and unit tests with coverage enforcement. The compiler also checks tooling, test files, and configuration. In addition to `strict`, it enables unchecked-index checks, exact optional properties, unused-code checks, explicit index-signature access, and return/fallthrough checks.

| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | TypeScript 7 strict checking |
| `pnpm lint` | Formatting and lint checks |
| `pnpm format` | Apply formatting and safe lint fixes |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Watch unit tests |
| `pnpm test:coverage` | Run tests and enforce coverage thresholds |
| `pnpm check` | Typecheck, lint, and coverage |
| `pnpm build` | Typecheck and create Chrome/Firefox folders and ZIPs |
| `pnpm test:browser` | Build and run Chromium/Firefox regression tests |
| `pnpm icons` | Export the icon PNGs; requires Inkscape |

Install pnpm 12 using the [official installation instructions](https://pnpm.io/installation/). pnpm permits only esbuild's dependency build script through `allowBuilds`; normal builds do not require a system `zip` executable or Inkscape.

## Project layout

- `src/dom.ts`: domain restrictions, editable-field detection, and Escape cancellation.
- `src/controller.ts`: DOM observation, composition handling, bounded retries, and cleanup.
- `src/content.ts`: the browser content-script entry point.
- `tooling/`: typed bundling, browser manifests, ZIP packaging, and icon export.
- `scripts/`: typed command entry points, run directly by Node.js.
- `extension/`: shared manifest and committed PNG icons.
- `assets/icon.svg`: editable neutral-face icon with a red slash and no prohibition circle.
- `tests/unit/`: Vitest tests for every runtime and tooling module.
- `tests/e2e/`: typed Playwright fixtures and browser tests.
- `dist/`: generated, installable extension folders and ZIPs.

esbuild produces a standalone content-script bundle with no imports. Packaging uses fflate and fixed ZIP timestamps for reproducible archives.

## Versioning

Uses calendar versioning (`YYYY.M.PATCH`), starting at **2026.10.0**. Update both `package.json` and `extension/manifest.json` when releasing; the build rejects mismatched versions.

## Install the extension

Run `pnpm build` first.

**Chrome:** open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/chrome`. Reload open Atlassian tabs.

**Firefox:** open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/firefox/manifest.json`. Reload open Atlassian tabs. This installation lasts until Firefox restarts. Permanent installation in standard Firefox requires Mozilla signing, either for an AMO listing or unlisted distribution. Requires Firefox 140+.

The build creates `dist/sans-emoji-chrome.zip` and `dist/sans-emoji-firefox.zip`. These are unsigned development builds. Disable the extension through the browser's extensions manager and reload the page to turn it off.

## Behavior and scope

- Runs only on HTTPS `atlassian.net`, `atlassian.com`, `bitbucket.org`, and their subdomains, including frames with matching URLs.
- Dismisses all colon-triggered emoji autocomplete, including intentional `:smile` searches. Separate toolbar emoji pickers, existing emoji, mentions, and slash commands are not targeted.
- Supports ordinary spaces and non-breaking French spaces without rewriting punctuation or inserting invisible characters.
- Uses the editor's own Escape handler to preserve text and selection. It does not intercept normal typing or implement its own undo operations.
- No network requests, telemetry, storage, background process, or additional API permissions. Site access is required only for the listed domains.
- Custom company domains, self-hosted installations elsewhere, and frames on unrelated domains are excluded.

The controller recognizes Atlaskit's `[data-query-prefix=":"][contenteditable="true"]` input and the older `.ak-emoji-typeahead` popup. Legacy dismissal additionally requires a colon query immediately before the active editor's caret. A MutationObserver handles newly mounted editors, and IME composition finishes before dismissal.

A popup may appear briefly before cancellation. If the editor changes its markup or ignores synthetic Escape, retries stop after four attempts. The extension leaves the menu visible so a hidden active popup cannot unexpectedly consume Enter or Tab. Legacy editors that delegate Escape handling above the focused field may need a dedicated adapter.

The DOM hooks were checked against published `@atlaskit/editor-plugin-type-ahead@27.0.4` and `@atlaskit/emoji@72.5.10`. They are internal conventions, not a stable Atlassian API.

## Testing and coverage

Unit coverage includes **every TypeScript file in `src/`, `tooling/`, and `scripts/`**, including command entry points and files not imported by any test. Each file must reach **100% statements, branches, functions, and lines**. There are no coverage-ignore directives or production-code exclusions. Test fixtures, declarative configuration, generated bundles, and third-party dependencies are outside the unit coverage denominator.

The suite checks domain boundaries, nullable selections, French spacing, modern and legacy menus, focus, late mounting/handler attachment, IME composition, bounded retries, listener cleanup, packaging, version consistency, deterministic ZIPs, and icon exporter commands/failures. Build tests bundle real temporary TypeScript projects and inspect their ZIP contents. jsdom lacks layout and `isContentEditable`, so unit fixtures supply those browser primitives.

Coverage reports are written to `coverage/index.html`, `coverage/lcov.info`, and `coverage/coverage-summary.json`.

Install the test browsers once, then run the browser suite:

```sh
pnpm exec playwright install chromium firefox
pnpm test:browser
```

Chromium loads the actual unpacked extension in isolated temporary profiles. Firefox runs the compiled content script through Playwright injection; this checks browser behavior, not Firefox add-on installation/signing. All page requests are fulfilled with local HTML; tests never access Atlassian accounts. The tests exercise native keyboard input, French spacing, Enter/Tab, unrelated domains, mentions, slash commands, IME handling, legacy menus, and matching frames.

GitHub Actions runs the strict checks, coverage gate, build, and browser tests on pushes and pull requests, and uploads reports and packages. CI has been configured locally; its first hosted run happens after the project is pushed.

These tests use representative editor DOM fixtures. They cannot establish compatibility with every live Jira/Bitbucket editor or verify those editors' real undo/redo transactions. On a signed-in tenant, check `Bonjour : suite`, NBSP/narrow-NBSP variants, Enter/Tab, undo/redo, mentions, slash commands, and the toolbar emoji picker. No issue submission is needed.

## Icon

The icon is a yellow neutral face inspired by 😐, crossed by a red diagonal slash with no prohibition circle. Transparent PNGs at 16–512 px are committed in `extension/icons/`. Edit `assets/icon.svg` and run `pnpm icons` to regenerate them.

## References

- [Jira request JRACLOUD-39164](https://jira.atlassian.com/browse/JRACLOUD-39164)
- [Confluence Server request CONFSERVER-92667](https://jira.atlassian.com/browse/CONFSERVER-92667)
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Firefox temporary installation](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)
- [Firefox signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
