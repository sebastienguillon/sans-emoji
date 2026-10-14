# Sans Emoji

Sans Emoji hides colon-triggered emoji suggestions on Atlassian sites and asks the editor to cancel autocomplete. It lets you type French punctuation such as `Bonjour : voici les détails` without the suggestion panel flashing on screen.

The same Manifest V3 extension works in Chrome and Firefox. It runs automatically on supported pages; there is no settings page or toolbar popup. Intentional `:smile` searches are suppressed too; use the editor's toolbar emoji picker to insert emoji.

[Install locally](#install-locally) · [Troubleshooting](#troubleshooting) · [Development](#development) · [Packaging and releases](#packaging-and-releases) · [Unreleased changes](release-notes/unreleased.md)

## Install locally

Build requirements: **Node.js 24+** and **pnpm 12+**. The project pins pnpm 12.10.1 and TypeScript 7.0.2; you do not need a global TypeScript installation. See the [Node.js downloads](https://nodejs.org/en/download) and [pnpm installation instructions](https://pnpm.io/installation/).

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
```

This creates one unpacked extension in `dist/`. Load that directory, not the repository root or `extension/`.

### Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select `dist/`.
4. Refresh your open Atlassian tabs.

See Google's [unpacked extension installation guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

### Firefox

Use Firefox **140 or later**.

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on** and select `dist/manifest.json`.
3. Refresh your open Atlassian tabs.

A [temporary installation](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) lasts until Firefox restarts or you remove the add-on. Permanent installation in standard Firefox requires [Mozilla signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/), either for an AMO listing or unlisted distribution.

### Update or disable a local installation

After changing the source, run `pnpm build`, reload Sans Emoji in the browser's extension manager, and refresh your Atlassian tabs. To disable it, turn it off in the extension manager and refresh the tabs.

If you previously loaded `dist/chrome` or `dist/firefox/manifest.json`, remove that development installation and load the shared path above once.

**Build output is disposable:** `pnpm build` and `pnpm check` clear and recreate `dist/`, including any previously generated ZIPs. Run `pnpm package` when you need fresh archives.

## Behavior and scope

- Runs on HTTPS `atlassian.net`, `atlassian.com`, `bitbucket.org`, and their subdomains, including frames whose own URLs match.
- Hides recognized emoji suggestion panels from their first frame, including while cancellation is delayed or input method editor (IME) composition is in progress.
- Sends Escape to the active query field or eligible legacy editor, letting the editor restore its own text and selection. It does not rewrite punctuation, insert invisible characters, or implement undo operations.
- Supports ordinary spaces, non-breaking spaces (U+00A0), and narrow non-breaking spaces (U+202F).
- Does not target existing emoji or separate toolbar emoji pickers. Mention and slash-command menus remain visible when no colon query is present.
- Does not run on custom company domains, other self-hosted domains, or frames with unrelated URLs.

### Privacy and permissions

The extension makes no network requests, stores no data, and has no telemetry or background process. Its scripts inspect the page's editor DOM locally to find and dismiss autocomplete. Site access is limited to the domains in [the manifest](extension/manifest.json); no additional extension API permissions are requested. See [PRIVACY.md](PRIVACY.md) for the full data-handling description and [the website policy](docs/privacy.html) for the public-facing version.

### How suppression works

The stylesheet loads at `document_start`. It hides the older `.ak-emoji-typeahead` popup and hides `.fabric-editor-typeahead` when it contains `.ak-emoji-typeahead-item` suggestions or while the document contains a `[data-query-prefix=":"][contenteditable="true"]` query field. Matching the emoji items also covers a popup that mounts late or remains mounted after its query field disappears. The inline query stays visible. Hidden popups are collapsed into a zero-sized, contained box at the viewport origin so their contents cannot create temporary page or container scrollbars. They retain a client rect for legacy detection and Escape cancellation.

A `MutationObserver` discovers query fields and popups. Cancellation waits for IME composition to finish and retries up to four times per attempt cycle; further editable input can reset the retries. Legacy cancellation also requires a colon query immediately before the active editor's caret.

These selectors are internal Atlaskit conventions, not a stable API. They were inspected in `@atlaskit/editor-plugin-type-ahead@27.0.4` and `@atlaskit/emoji@72.5.10`; those packages are not extension dependencies.

### Known limitations

- If an editor ignores synthetic Escape, recognized suggestions stay hidden but the editor may still consume Enter or Tab. Legacy editors that handle Escape above the focused field may need a dedicated adapter.
- The modern CSS rule applies to matching suggestion panels throughout the document while any colon query exists. Simultaneous autocomplete menus in multiple editors are not independently scoped.
- Atlassian markup changes may require new selectors. Automated tests use representative fixtures and do not establish compatibility with every live editor or verify its real undo/redo transactions.

## Troubleshooting

| Symptom | What to check or do |
| --- | --- |
| The popup still appears | Rebuild, reload the extension, and refresh the page. Check that the editor's URL is in scope. If it persists on a supported URL, the editor may use different markup. |
| Enter or Tab acts on an invisible suggestion | Press Escape to exit autocomplete. If the problem persists, disable the extension and refresh the page; the editor may not accept synthetic cancellation. |
| Firefox no longer has the extension after a restart | Load `dist/manifest.json` again. Temporary installations do not persist across restarts. |
| The browser cannot find the extension files | Run `pnpm build` from the repository root, then load the shared `dist/` path. Replace installations pointing to an old browser subfolder. |
| A build reports that versions must match | Set the same calendar version in `package.json` and `extension/manifest.json`. |
| Distribution ZIPs disappeared | `pnpm build`, `pnpm check`, and `pnpm test:browser` recreate `dist/`. Run `pnpm package` to regenerate the two archives. |

When reporting an editor problem, include the browser version, editor type, domain, and a short reproduction using non-sensitive text.

## Development

Use pnpm consistently and keep `pnpm-lock.yaml`. All executable project code is strict TypeScript 7. The extension has no runtime dependencies; build and test tools are development dependencies.

| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | Check browser source, Node tooling/configuration, and test fixtures in separate TypeScript environments |
| `pnpm lint` | Check formatting and lint rules with Biome |
| `pnpm lint:ext` | Validate the existing `dist/` with Mozilla's add-on linter; fail errors and applicable warnings |
| `pnpm format` | Apply formatting and safe lint fixes |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Watch unit tests |
| `pnpm test:coverage` | Run unit tests and enforce per-file coverage thresholds |
| `pnpm check` | Run typechecking, linting, unit coverage, a clean build, and extension validation |
| `pnpm build` | Typecheck and recreate the shared unpacked `dist/` build |
| `pnpm test:browser` | Rebuild and run Chromium/Firefox regression tests |
| `pnpm package` | Run `pnpm check`, then reproduce the build and create extension and source ZIPs |
| `pnpm icons` | Regenerate committed PNG icons; requires Inkscape on `PATH` |

`pnpm build` does not run lint or tests. `pnpm check` now recreates `dist/`, removing existing ZIPs, and validates the resulting extension. `pnpm package` performs those checks before creating both archives, but does not run browser tests. The workspace allows esbuild's dependency build script through `allowBuilds`; normal builds need neither Inkscape nor a system `zip` executable.

`pnpm lint:ext` uses pinned `web-ext` with personal configuration discovery disabled. It checks the existing build and does not rebuild or change its files; ZIPs in `dist/` are ignored by web-ext's default file rules. Run `pnpm build` first when the output is missing or stale. Mozilla's [linter](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-lint) checks manifest and extension compatibility, but is not store approval or a substitute for browser tests.

One diagnostic is explicitly reported as inapplicable: `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION` in `manifest.json`, only while the manifest has no `gecko_android` entry. Mozilla [requires that entry to enable Android distribution](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings#firefox_gecko_properties), but the linter checks Android minimums even for this desktop-only extension. All errors and other warnings fail validation. Adding Android support makes that warning fatal too; do not widen this exception to hide compatibility problems.

### TypeScript environments

Shared strictness rules live in `tsconfig.base.json`. `pnpm typecheck` runs all three environments:

| Configuration | Files and available APIs |
| --- | --- |
| `tsconfig.json` | `src/`: ECMAScript and browser DOM, without Node globals or ambient Node module types |
| `tsconfig.node.json` | `tooling/`, `scripts/`, and root test-runner configs: ECMAScript and Node, without DOM globals |
| `tests/tsconfig.json` | Unit tests, Playwright tests, and fixtures: Node and DOM, because the harness exercises both |

Tests may import browser code, but the separate browser check still rejects accidental uses of `process`, `Buffer`, or Node built-ins in `src/`. The Node check rejects accidental DOM access in build tooling. Every project TypeScript file remains covered by a typecheck; this split does not change runtime bundling or unit coverage requirements.

### Project layout

| Path | Contents |
| --- | --- |
| `src/` | Content-script entry point, DOM checks, cancellation, and controller |
| `extension/` | Shared manifest, popup suppression CSS, and committed PNG icons |
| `docs/` | Static public overview, privacy policy, and support website |
| `store/` | English/French listing copy, submission reference, and image guidance |
| `tooling/` | Bundling, ZIP packaging, extension validation, and icon generation |
| `scripts/` | TypeScript command entry points, run directly by Node.js |
| `tests/unit/` | Runtime and tooling unit tests |
| `tests/e2e/` | Playwright browser fixtures and regression tests |
| `assets/icon.svg` | Editable icon source |
| `dist/` | Generated extension files and, after packaging, two ZIPs |
| `release-notes/` | Versioned notes and pending changes |
| `tsconfig*.json` | Shared strictness, browser source, and Node tooling configurations |
| `AGENTS.md` | Project conventions and release requirements |

esbuild targets Chrome 120 and Firefox 140 and produces one standalone content script. The build copies the shared manifest unchanged, including Firefox's extension ID, minimum version, and no-data declaration. Chrome [ignores `browser_specific_settings`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings).

### Tests and their limits

```sh
pnpm check
pnpm exec playwright install chromium firefox
pnpm test:browser
```

On Linux, Playwright may also need system libraries; CI installs them with `pnpm exec playwright install --with-deps chromium firefox`.

Every TypeScript file in `src/`, `tooling/`, and `scripts/` must reach **100% statements, branches, functions, and lines**, per file. There are no coverage-ignore directives or production-code exclusions. Fixtures, declarative configuration, generated bundles, and dependencies are outside that denominator. Reports are written to `coverage/index.html`, `coverage/lcov.info`, and `coverage/coverage-summary.json`.

Unit tests cover domain boundaries, caret checks, French spacing, focus, IME handling, retries, and cleanup. Extension-validation tests enforce warning/error failures, the narrowly scoped Android exception, and process/file failure handling. Build and packaging tests use temporary projects, reject missing inputs and symlinks in source archives, check stale-output cleanup, and rebuild extracted sources to reproduce both ZIPs byte for byte. They verify that store materials and every TypeScript configuration are included in review sources, while store and website files stay out of the installed extension. jsdom fixtures supply layout and `isContentEditable`, which jsdom does not implement.

Chromium tests load the actual unpacked extension. Firefox tests inject the compiled script and stylesheet; they do not test Firefox add-on installation or signing. Both use local HTML fixtures with intercepted requests and never access an Atlassian account. They check typing, Enter/Tab, mentions, slash commands, toolbar pickers, domain scope, frames, IME handling, and popup visibility and scroll dimensions at mount and on animation frames. Playwright writes its report to `playwright-report/` and retains traces for failed tests.

Before a release, also check `Bonjour : suite`, both non-breaking-space variants, Enter/Tab, undo/redo, mentions, slash commands, and the toolbar emoji picker in a signed-in editor. Record the browser and editor tested; no issue submission is needed.

[GitHub Actions](.github/workflows/ci.yml) runs packaging checks, including extension validation, and browser tests on pushes and pull requests, then attempts to upload coverage, browser reports, and `dist/` even if a preceding step fails. It uses Ubuntu 24.04, a 20-minute job timeout, read-only repository permissions, and checkout with persisted credentials disabled. A newer run cancels an older run for the same workflow and Git ref.

Actions are pinned to full commit SHAs resolved from their official repositories, with the corresponding major version in a comment. Update both when upgrading; verify annotated tags against their underlying commit. pnpm remains pinned by `packageManager` in `package.json`, Node follows `.node-version`, and dependency installation uses the frozen lockfile. `actionlint .github/workflows/ci.yml` can validate workflow edits locally when actionlint is installed.

## Packaging and releases

Versions use `YYYY.M.D`, with no leading zeros. The final component is the day of the month, not a release counter. The version in `package.json` must match `extension/manifest.json`; the build rejects a mismatch.

[Unreleased changes](release-notes/unreleased.md) track work after the [2026.10.10 notes](release-notes/2026.10.10.md). Historical notes describe that version's behavior and validation, not the current checkout.

For a release:

1. Update both version fields.
2. Write `release-notes/<version>.md` from the changes since the previous version. Include user-visible changes, fixes, known limitations, and only validation actually completed. Use the unreleased notes as a starting point.
3. Install dependencies and browser binaries, then validate and package:

   ```sh
   pnpm install --frozen-lockfile
   pnpm exec playwright install chromium firefox
   pnpm package
   pnpm exec playwright test
   ```

4. Complete the manual editor checks above. If you update release notes or other source files after packaging, run `pnpm package` again so the review source ZIP matches the final files.
5. Prepare the listing copy and submission fields from [store/](store/README.md), verify the public links, and capture release screenshots as described there. Include the versioned release notes with the upload or release handoff. Clear the changes incorporated from the unreleased notes and regenerate packages if those notes changed.

The direct `pnpm exec playwright test` command uses the existing build and preserves its ZIPs. The `pnpm test:browser` shortcut rebuilds first and removes them.

Packaging leaves the unpacked build in `dist/` and creates exactly two archives:

| Archive | Use |
| --- | --- |
| `dist/sans-emoji.zip` | The same extension ZIP for Chrome Web Store or Mozilla Add-ons submission |
| `dist/sans-emoji-sources.zip` | Matching sources to attach separately for Firefox review |

The extension ZIP contains only the manifest, bundled script, stylesheet, icons, and license. The source ZIP includes current local files, including uncommitted edits: source, tooling, tests, all TypeScript configurations, lockfile, committed assets, documentation, store materials, and release notes. Its [allowlist](tooling/package.ts) excludes dependencies, Git metadata, and generated output. Keep that list current when adding build inputs. Both ZIPs continue to come from the same working files; source packaging does not use `git archive HEAD`.

Packaging needs no Git checkout. Fixed ZIP timestamps and sorted paths make archives reproducible for identical inputs. The extension ZIP is unsigned; this command does not publish it or request Mozilla signing. Renaming it to `.xpi` does not sign it.

### Rebuild the Firefox review sources

Extract `sans-emoji-sources.zip` into an empty directory. On macOS or Linux, install Node.js 24+ and pnpm 12.10.1, then run from the extracted directory:

```sh
pnpm install --frozen-lockfile
pnpm build
```

The resulting `dist/` files reproduce `sans-emoji.zip`. This build needs no browser installation, Inkscape, Git metadata, system `zip`, or global TypeScript. Use `pnpm package` to recreate both ZIPs instead. See [Mozilla's source submission requirements](https://extensionworkshop.com/documentation/publish/source-code-submission/).

## Public website and store URLs

[Store materials](store/README.md) keep dashboard copy and image guidance separate from the public website. [Release notes](release-notes/) remain the authoritative release history; the English and French listing files do not duplicate it.

The `docs/` folder contains a static overview, privacy policy, and support page, matching SG-X's cream-and-olive visual style. It uses a shared stylesheet and the extension's icon, with no JavaScript, third-party fonts, analytics, or site build step. The pages use the same developer contact as SG-X: `guillon.sebastien@gmail.com`.

Preview locally with Python 3:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs
```

Open `http://127.0.0.1:8765/`. Stop the server with Ctrl+C. Site files are included in the Firefox review source ZIP and excluded from the extension ZIP.

To publish with GitHub Pages, commit and push the files, then configure the repository's **Settings → Pages → Build and deployment** to **Deploy from a branch**, using **master** and **/docs**. See [GitHub's publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Everything in `docs/` will be public; keep it limited to website assets and public information.

These are the intended URLs, not a record of a completed deployment. After publishing, check that each loads publicly before using it in the Chrome Web Store dashboard:

| Dashboard field | URL |
| --- | --- |
| Homepage | `https://sebastienguillon.github.io/sans-emoji/` |
| Privacy policy | `https://sebastienguillon.github.io/sans-emoji/privacy.html` |
| Support | `https://sebastienguillon.github.io/sans-emoji/support.html` |

Chrome's [privacy guidance](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) requires disclosure of local processing too. The policy therefore explains editor and caret access, even though the extension stores and transmits no data. Keep the store's [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), `PRIVACY.md`, and `docs/privacy.html` consistent with the code. Update the support page when behavior changes. Store approval is a separate review; preparing these pages does not publish the extension.

The homepage currently links to local installation instructions. Replace that action with the verified store listing URL when a listing is available. The canonical URLs assume the GitHub Pages address above; update them if the hosting address changes.

## Icon and license

The icon is a yellow neutral face with a red diagonal slash and transparent background. To change it, edit [assets/icon.svg](assets/icon.svg), run `pnpm icons`, copy `extension/icons/icon512.png` to `docs/icon.png`, and commit the regenerated images.

Sans Emoji is licensed under the [MIT License](LICENSE), copyright © 2026 Sébastien Guillon. The license is included in the unpacked build and both archives. `private: true` in `package.json` prevents accidental publication to the package registry; it does not determine the repository's visibility.
