# Store images

Upload PNG files from this folder. These assets show **Sans Emoji 2026.10.15** and use the existing cream, olive, system typography, and crossed-out emoji icon from the documentation site. Promotional tiles contain only the product name, so either listing language can use them.

## Upload map

| Image | Dimensions | Where to use it |
| --- | --- | --- |
| [English: punctuation](2026.10.15-en-screenshot-01-punctuation.png) | 1280 × 800 | First screenshot, Chrome and Firefox |
| [English: manual picker](2026.10.15-en-screenshot-02-picker.png) | 1280 × 800 | Second screenshot, Chrome and Firefox |
| [French: punctuation](2026.10.15-fr-screenshot-01-punctuation.png) | 1280 × 800 | French alternative to the first screenshot |
| [French: manual picker](2026.10.15-fr-screenshot-02-picker.png) | 1280 × 800 | French alternative to the second screenshot |
| [Small promotional tile](2026.10.15-promo-small.png) | 440 × 280 | Required Chrome promotional image |
| [Marquee promotional tile](2026.10.15-promo-marquee.png) | 1400 × 560 | Optional Chrome promotional image |
| [Store icon](2026.10.15-icon-128.png) | 128 × 128 | Chrome icon |
| [Store icon](2026.10.15-icon-64.png) | 64 × 64 | Firefox listing icon |

Use one language's two screenshots, in the order above; do not upload both language pairs as four different features. French images are prepared for translated listings. They do not add French manifest metadata; see the [store localization note](../README.md).

The PNG screenshots and promotional tiles are opaque RGB images with square corners. Icons retain transparency. Firefox can use the same screenshots and does not require either Chrome promotional tile. Sizes were checked against [Chrome's image requirements](https://developer.chrome.com/docs/webstore/images) and [Mozilla's listing guidance](https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/) on 2026-10-13.

## Screenshot captions

Use these as descriptions or alternative text where the dashboard supports them. Keep the fixture disclosure when translating.

| Screenshot | English | French |
| --- | --- | --- |
| Punctuation | Sans Emoji preserves “Bonjour : voici les détails” while dismissing colon-triggered emoji suggestions. Captured in a local editor test fixture, not an Atlassian product screen. | Sans Emoji conserve « Bonjour : voici les détails » et ferme les suggestions d’emoji déclenchées par les deux-points. Capture d’un éditeur de démonstration local, et non d’une interface Atlassian. |
| Manual picker | The toolbar emoji picker remains visible when opened manually. Captured in a local editor test fixture, not an Atlassian product screen. | Le sélecteur d’emoji de la barre d’outils reste visible lorsqu’il est ouvert manuellement. Capture d’un éditeur de démonstration local, et non d’une interface Atlassian. |

## Capture provenance and limits

These are genuine browser captures of the unpacked extension running against [the existing editor test fixture](../../tests/e2e/fixture.ts). The fixture is visibly identified in every image. Its editor and one-emoji picker are a demonstration, not Jira, Confluence, Bitbucket, Atlaskit, or an extension settings screen.

Chromium loads `dist/` using its extension loader. Requests to `https://test.atlassian.net/fixture` are intercepted and fulfilled locally; no Atlassian tenant, account, issue, or private project is accessed. Only layout and labels are styled for presentation. The extension handles the colon, and the existing fixture handles typing and the manual picker. Screenshots are not composited or retouched; the blinking caret is omitted during capture.

[capture.json](capture.json) records the browser version, viewport, fixture sources, and assertions run during capture. Each PNG also embeds its origin in a `tEXt` metadata field named `impeccable:prompt`. There is no AI-generated imagery. Store icons reuse the installed extension's pixels, with provenance metadata added.

The shared build allows the same browser-neutral illustrations on both listings. These captures do **not** establish successful installation in Firefox or compatibility with every live Atlassian editor. Complete the [manual editor checks](../../README.md#tests-and-their-limits) before submission. Store acceptance of fixture demonstrations has not been verified; if a reviewer requests live product screenshots, replace them with non-sensitive signed-in captures and retain accurate captions.

## Edit and regenerate

- [editor.html](source/editor.html) controls the screenshot layout. The localized text and capture procedure live in [tests/store-assets.ts](../../tests/store-assets.ts).
- [promo-small.svg](source/promo-small.svg) and [promo-marquee.svg](source/promo-marquee.svg) are editable vector masters. Their embedded icon paths come from [assets/icon.svg](../../assets/icon.svg); update both masters if that icon changes.
- The color and typography reference is [docs/styles.css](../../docs/styles.css). The masters use the same system font stack. Font and emoji rendering can vary by operating system; these exports were produced on macOS.

From the project root, with the pinned pnpm dependencies, Playwright's Chromium, and Inkscape installed:

```sh
pnpm build
pnpm exec playwright install chromium
pnpm exec node tests/store-assets.ts
```

The capture tool uses strict TypeScript checked by `pnpm typecheck`. It asserts the colon is preserved, suggestions are hidden at mount and then dismissed, subsequent text is preserved, and the manual picker is visible before saving. It exports the promotional tiles and icon copies and embeds provenance without altering their pixels.

The filenames use the version read from the built manifest. Before capturing a new version, preserve the previous `capture.json` under its versioned name, as with [2026.10.14-capture.json](2026.10.14-capture.json). Running the tool overwrites that version's eight PNGs and `capture.json`; review all outputs before uploading. Exact raster bytes can differ across renderer, font, and operating-system versions. Packaging remains deterministic for a fixed set of source files; image regeneration is separate from `pnpm package`.

This folder and the capture tool are included in the Firefox review source ZIP, not the installed extension ZIP. See the [2026.10.15 release notes](../../release-notes/2026.10.15.md) for this submission-material update.

Historical assets remain available for reference. The original `2026.10.10-*.png` images have their provenance in [2026.10.10-capture.json](2026.10.10-capture.json); they were prepared after the `v2026.10.10` tag, which is unchanged. The abandoned `2026.10.14` preparation retains its `2026.10.14-*.png` images and [2026.10.14-capture.json](2026.10.14-capture.json). Use the current upload map for the replacement 2026.10.15 submission.
