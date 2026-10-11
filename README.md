# Sans Emoji

A Manifest V3 extension for Chrome and Firefox that dismisses colon-triggered emoji autocomplete on Atlassian sites. Particularly useful for French text such as `Bonjour : voici les détails`. Both browsers use the same build in `dist/`.

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
| `pnpm build` | Typecheck and recreate one unpacked `dist/` for Chrome and Firefox |
| `pnpm package` | Run checks, rebuild, and create one shared extension ZIP plus the Firefox source ZIP |
| `pnpm test:browser` | Build and run Chromium/Firefox regression tests |
| `pnpm icons` | Export the icon PNGs; requires Inkscape |

Install pnpm 12 using the [official installation instructions](https://pnpm.io/installation/). pnpm permits only esbuild's dependency build script through `allowBuilds`; normal builds do not require a system `zip` executable or Inkscape.

## Project layout

- `src/dom.ts`: domain restrictions, editable-field detection, and Escape cancellation.
- `src/controller.ts`: DOM observation, composition handling, bounded retries, and cleanup.
- `src/content.ts`: the browser content-script entry point.
- `tooling/`: typed bundling, ZIP packaging, and icon export.
- `scripts/`: typed command entry points, run directly by Node.js.
- `extension/`: shared manifest, popup suppression stylesheet, and committed PNG icons.
- `assets/icon.svg`: editable neutral-face icon with a red slash and no prohibition circle.
- `tests/unit/`: Vitest tests for every runtime and tooling module.
- `tests/e2e/`: typed Playwright fixtures and browser tests.
- `dist/`: generated shared extension (`manifest.json`, `content.js`, `content.css`, icons, and license), plus ZIPs after packaging.
- `release-notes/`: release notes for each published version.
- `AGENTS.md`: project conventions and release-note requirements.

esbuild produces one standalone content-script bundle targeting Chrome and Firefox, with no imports. The build copies `extension/manifest.json` unchanged: it includes the Firefox extension ID, minimum version, and no-data declaration in `browser_specific_settings`, which Chrome ignores. Packaging uses fflate and fixed ZIP timestamps for reproducible archives.

## Versioning

Uses calendar versioning (`YYYY.M.D`), starting at **2026.10.10** (October 10, 2026). The components are the release year, month, and day, with no leading zeros; the last component is the day of the month, not a release counter. Update both `package.json` and `extension/manifest.json` when releasing; the build rejects mismatched versions.

## Install the extension

Run `pnpm build` first.

**Chrome:** open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/`. Reload open Atlassian tabs.

**Firefox:** open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/manifest.json`. Reload open Atlassian tabs. This installation lasts until Firefox restarts. Permanent installation in standard Firefox requires Mozilla signing, either for an AMO listing or unlisted distribution. Requires Firefox 140+.

`pnpm build` clears and recreates `dist/`, removing stale files, old browser subfolders, and previously generated ZIPs. It produces only the unpacked extension; run `pnpm package` to generate ZIPs again.

If you previously loaded `dist/chrome` or `dist/firefox/manifest.json`, remove that old development installation and load the shared path above. For subsequent changes, run `pnpm build`, click **Reload** for the extension in the browser's extension manager, and refresh your Atlassian tabs. Disable the extension through the browser's extensions manager and reload the page to turn it off.

## Package for distribution

After updating both version fields and writing `release-notes/<version>.md`, run:

```sh
pnpm install --frozen-lockfile
pnpm package
```

This command runs typechecking, linting, and unit tests with coverage, rebuilds the shared `dist/` folder, and writes:

| Archive | Purpose |
| --- | --- |
| `dist/sans-emoji.zip` | Upload the same extension ZIP to the Chrome Web Store or Mozilla Add-ons for listing or unlisted signing |
| `dist/sans-emoji-sources.zip` | Attach separately as the matching Firefox review source |

The shared extension ZIP contains the build used by both browsers. Only extension assets go into it; it excludes source files and other archives. Packaging removes obsolete browser-specific ZIPs and produces exactly the two archives above.

The source archive contains the current local source files (including uncommitted edits), build scripts, configuration, lockfile, tests, committed icons, documentation, and release notes. It excludes dependencies, Git metadata, and generated output through an explicit input allowlist. Packaging does not require a Git checkout. The archives use stable timestamps and file ordering so identical inputs produce identical packages.

The extension ZIP is unsigned. Packaging does not publish it or obtain Mozilla signing. Firefox requires a signed add-on for permanent installation in standard releases; renaming a ZIP to `.xpi` does not sign it.

### Rebuild the Firefox review sources

Extract `sans-emoji-sources.zip` into an empty directory. On macOS or Linux, use Node.js 24+ and pnpm 12.10.1 (pinned in `package.json`), then run from that directory:

```sh
pnpm install --frozen-lockfile
pnpm build
```

The resulting `dist/` files reproduce the contents of `sans-emoji.zip`. No Inkscape, browser installation, Git metadata, or global TypeScript installation is needed. Run `pnpm package` instead to regenerate both archives, including the source ZIP. See [Mozilla's source submission requirements](https://extensionworkshop.com/documentation/publish/source-code-submission/).


## Behavior and scope

- Runs only on HTTPS `atlassian.net`, `atlassian.com`, `bitbucket.org`, and their subdomains, including frames with matching URLs.
- Dismisses all colon-triggered emoji autocomplete, including intentional `:smile` searches. Separate toolbar emoji pickers, existing emoji, mentions, and slash commands are not targeted.
- Supports ordinary spaces and non-breaking French spaces without rewriting punctuation or inserting invisible characters.
- Uses the editor's own Escape handler to preserve text and selection. It does not intercept normal typing or implement its own undo operations.
- Loads a popup suppression stylesheet at document start so recognized emoji suggestions stay invisible from their first frame, including during IME composition and delayed cancellation. The inline query field and typed text remain visible.
- No network requests, telemetry, storage, background process, or additional API permissions. Site access is required only for the listed domains.
- Custom company domains, self-hosted installations elsewhere, and frames on unrelated domains are excluded.

The controller recognizes Atlaskit's `[data-query-prefix=":"][contenteditable="true"]` input and the older `.ak-emoji-typeahead` popup. Legacy dismissal additionally requires a colon query immediately before the active editor's caret. A MutationObserver handles newly mounted editors, and IME composition finishes before dismissal.

The stylesheet hides `.ak-emoji-typeahead` and hides `.fabric-editor-typeahead` while a colon query field exists. It preserves popup geometry so positioning and legacy cancellation still work. Mentions and slash commands remain visible when no colon query is present; separate toolbar emoji pickers are not targeted.

If an editor ignores synthetic Escape, retries stop after four attempts and recognized suggestions remain invisible. CSS cannot cancel the editor's internal autocomplete state: an unsupported handler may still consume Enter or Tab. Legacy editors that delegate Escape handling above the focused field may need a dedicated adapter. Changes to Atlassian's internal markup can require updated selectors.

The DOM hooks were checked against published `@atlaskit/editor-plugin-type-ahead@27.0.4` and `@atlaskit/emoji@72.5.10`. They are internal conventions, not a stable Atlassian API.

## Testing and coverage

Unit coverage includes **every TypeScript file in `src/`, `tooling/`, and `scripts/`**, including command entry points and files not imported by any test. Each file must reach **100% statements, branches, functions, and lines**. There are no coverage-ignore directives or production-code exclusions. Test fixtures, declarative configuration, generated bundles, and third-party dependencies are outside the unit coverage denominator.

The suite checks domain boundaries, nullable selections, French spacing, modern and legacy menus, focus, late mounting/handler attachment, IME composition, bounded retries, listener cleanup, packaging, version consistency, deterministic ZIPs, and icon exporter commands/failures. Build and packaging tests bundle real temporary TypeScript projects, verify removal of obsolete build output, preserve the shared manifest and Firefox metadata, check that packaging creates exactly the two expected archives, and rebuild the extracted review sources to reproduce both ZIPs byte for byte. jsdom lacks layout and `isContentEditable`, so unit fixtures supply those browser primitives.

Coverage reports are written to `coverage/index.html`, `coverage/lcov.info`, and `coverage/coverage-summary.json`.

Install the test browsers once, then run the browser suite:

```sh
pnpm exec playwright install chromium firefox
pnpm test:browser
```

Chromium loads the actual unpacked extension from `dist/` in isolated temporary profiles. Firefox runs the same `dist/content.js` through Playwright injection and embeds `dist/content.css` in matching fixture documents; this checks browser behavior, not Firefox add-on installation/signing. All page requests are fulfilled with local HTML; tests never access Atlassian accounts. The tests exercise native keyboard input, French spacing, Enter/Tab, unrelated domains, mentions, slash commands, IME handling, legacy menus, and matching frames. Popup visibility is checked synchronously at mount and on animation frames, including delayed and unsupported Escape handlers.

GitHub Actions runs the strict checks, coverage gate, build, and browser tests on pushes and pull requests, and uploads reports and packages. Distribution packaging runs in CI through `pnpm package`.

These tests use representative editor DOM fixtures. They cannot establish compatibility with every live Jira/Bitbucket editor or verify those editors' real undo/redo transactions. On a signed-in tenant, check `Bonjour : suite`, NBSP/narrow-NBSP variants, Enter/Tab, undo/redo, mentions, slash commands, and the toolbar emoji picker. No issue submission is needed.

## Icon

The icon is a yellow neutral face inspired by 😐, crossed by a red diagonal slash with no prohibition circle. Transparent PNGs at 16–512 px are committed in `extension/icons/`. Edit `assets/icon.svg` and run `pnpm icons` to regenerate them.

## License

Sans Emoji is open source under the [MIT License](LICENSE). Copyright © 2026 Sébastien Guillon. The license is included in local builds and both distribution archives.

`private: true` in `package.json` prevents accidental publication to the npm registry; the GitHub repository and extension are public and MIT-licensed.

## References

- [Jira request JRACLOUD-39164](https://jira.atlassian.com/browse/JRACLOUD-39164)
- [Confluence Server request CONFSERVER-92667](https://jira.atlassian.com/browse/CONFSERVER-92667)
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Firefox temporary installation](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)
- [Firefox signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
