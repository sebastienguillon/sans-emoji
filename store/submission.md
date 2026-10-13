# Submission reference

Use this with the listing copy and the release's versioned notes. Verify dashboard answers against the actual package and current store questions. This is a handoff reference, not a record of approval or publication.

## Single purpose

Suppress colon-triggered emoji suggestions in supported Atlassian editors so users can type punctuation without the suggestion panel interrupting their writing.

## Site-access justification

Sans Emoji needs access to HTTPS pages on `atlassian.net`, `atlassian.com`, `bitbucket.org`, and their subdomains to find active editor queries, hide recognized suggestion panels, and ask the editor to cancel autocomplete. Matching frames are included because editors can appear inside frames. The extension does not request access to unrelated websites or additional extension API permissions.

The source of truth is [extension/manifest.json](../extension/manifest.json). The script and stylesheet run at `document_start` so recognized panels are hidden before they can flash on screen.

## Data handling and remote code

The extension inspects editor structure, focus, input and composition events, and, for legacy editors, caret position and text before the caret. Processing is local and can include draft text. It does not save or transmit that text, make network requests, or include analytics, telemetry, a developer server, or remote code. All executable extension code ships in the ZIP. The underlying website still processes the user's writing as usual.

Keep the dashboard answers consistent with [PRIVACY.md](../PRIVACY.md) and the [public policy source](../docs/privacy.html). Do not describe the extension as having no access to user data: local processing still accesses editor content. Website hosting and email support are described separately in the policy. See Chrome's [privacy guidance](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) and [privacy-field documentation](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

## Public links and contact

These are the intended GitHub Pages URLs. Confirm that they load publicly before entering them in a dashboard; this document does not establish that they have been deployed.

| Field | Value |
| --- | --- |
| Homepage | `https://sebastienguillon.github.io/sans-emoji/` |
| Privacy policy | `https://sebastienguillon.github.io/sans-emoji/privacy.html` |
| Support | `https://sebastienguillon.github.io/sans-emoji/support.html` |
| Developer contact | `guillon.sebastien@gmail.com` |

## Reviewer instructions

The same `dist/sans-emoji.zip` is used for Chrome and Firefox. Firefox requires version 140 or later. The extension has no settings, toolbar popup, or account of its own; live testing uses the reviewer's own access to a supported Atlassian editor.

1. Install the extension and refresh the supported editor page.
2. Type `Bonjour : suite`, including variants with non-breaking spaces. The recognized suggestion panel should remain hidden and the text should remain intact.
3. Check Enter/Tab, undo/redo, mentions, slash commands, and the separate toolbar emoji picker. Intentional `:smile` searches are suppressed as well.
4. Record the browser, version, editor, and observed results. Do not submit a comment or issue merely to test typing.

Known limitations: internal editor markup may change; custom domains are outside scope; an editor that ignores synthetic Escape may keep an invisible autocomplete state; simultaneous menus are not independently scoped while a colon query exists. Live editor checks must be recorded for the release rather than inferred from automated fixtures.

For Mozilla source review, extract `dist/sans-emoji-sources.zip`, then run:

```sh
pnpm install --frozen-lockfile
pnpm build
```

Use Node.js 24+ and pnpm 12.10.1. `pnpm package` also runs checks, validates the built extension, and reproduces both ZIPs. The archive includes the split TypeScript configurations and all build inputs, and does not require Git metadata. See the [build reproduction instructions](../README.md#rebuild-the-firefox-review-sources).

The browser fixtures run with `pnpm exec playwright install chromium firefox` followed by `pnpm test:browser`. Chromium loads the actual extension; Firefox injects its script and stylesheet. These fixtures do not verify Firefox signing or every live Atlassian editor. Running `pnpm test:browser` rebuilds `dist/` and removes existing ZIPs; use `pnpm exec playwright test` after packaging to preserve them.
