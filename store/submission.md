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

The same `dist/sans-emoji.zip` is used for Chrome and Firefox. Firefox requires version 140 or later. The extension has no settings, toolbar popup, or account of its own, but testing in a live Atlassian editor requires access to the underlying site. Provide reviewers with a dedicated test account and an editable test page containing only sample content. Do not assume they have their own Atlassian account or access to your tenant. Mozilla's [submission guidelines](https://extensionworkshop.com/documentation/publish/add-on-policies/#submission-guidelines) require testing credentials when an account is needed for any part of an add-on's functionality.

1. Install the extension and refresh the supported editor page.
2. Type `Bonjour : suite`, including variants with non-breaking spaces. The recognized suggestion panel should remain hidden and the text should remain intact.
3. Check Enter/Tab, undo/redo, mentions, slash commands, and the separate toolbar emoji picker. Intentional `:smile` searches are suppressed as well.
4. Record the browser, version, editor, and observed results. Do not submit a comment or issue merely to test typing.

Known limitations: internal editor markup may change; custom domains are outside scope; an editor that ignores synthetic Escape may keep an invisible autocomplete state; simultaneous menus are not independently scoped while a colon query exists. Live editor checks must be recorded for the release rather than inferred from automated fixtures.

### Firefox dashboard checklist

- **Version notes:** enter the user-visible features, fixes, and relevant limitations from the matching [versioned release notes](../release-notes/). For `2026.10.14`, use the prepared public notes in [its release handoff](releases/2026.10.14.md). These notes must also be entered in the dashboard; including the Markdown file in the source ZIP does not fill the field. Do not paste development history, validation logs, or credentials into public version notes.
- **Notes to Reviewer:** use the template below. Copy it into AMO's private reviewer field, then replace the placeholders there. Supply a supported HTTPS test-site URL, exact editor location, dedicated test username/password, and any additional login steps. Verify the account can log in and edit the sample page from a fresh browser session, and keep access working during review. Do not put credentials in this repository, either ZIP, public release notes, or listing copy.
- **Source code:** upload `dist/sans-emoji-sources.zip` separately, because the extension's TypeScript is bundled into JavaScript. Include the build instructions below in the reviewer notes.
- **Validation report:** open the full report and read the actual warning. A checklist reminder does not establish which technical warning was reported. Local validation's desktop-only Android exception does not prove AMO's warning is the same.

The fixture screenshots and automated tests are supporting evidence, not a replacement for live reviewer access. No test tenant or reviewer account has been provisioned by preparing these files.

### Private reviewer-note template

Complete this in the AMO dashboard. Do not submit the placeholders as working access details.

```text
Sans Emoji runs automatically in supported Atlassian editors. It has no settings or toolbar popup. Desktop Firefox 140 or later is required.

Dedicated test access:
Test site: [supported HTTPS Atlassian site]
Editor URL: [direct URL of an editable page containing sample content]
Username: [enter dedicated test username privately in AMO]
Password: [enter dedicated test password privately in AMO]
Login and editor-opening steps: [exact steps, including any additional authentication]

Steps to test:
1. Install the add-on, sign in using the test account, and open the editor above. Refresh the page if it was open before installation.
2. Type "Bonjour : suite", with a space before the colon. The recognized emoji suggestion panel should remain hidden, while the typed text remains intact.
3. Verify typing, Enter/Tab, undo/redo, @mentions, slash commands, and the separate toolbar emoji picker. Intentional :smile autocomplete is suppressed as well; use the toolbar picker to insert an emoji.
4. Discard the draft when finished; no comment or issue submission is needed.

Known limitations: custom company domains are outside scope; Atlassian markup changes can affect support. An editor that ignores synthetic Escape may retain an invisible autocomplete state. Simultaneous menus are not independently scoped while a colon query exists.

Privacy: editor content is processed locally. The extension does not store or transmit user data, make network requests, or include analytics or remote code.

Sources: the separate sans-emoji-sources.zip contains the original TypeScript and build inputs. Extract it, use Node.js 24+ and pnpm 12.10.1, then run:
pnpm install --frozen-lockfile
pnpm build

The generated dist/ files reproduce the extension package. Browser installation, Inkscape, and Git metadata are not needed for this build.

Automated tests use local editor fixtures. Chromium loads the unpacked extension; Firefox injects the compiled script and stylesheet. These fixtures do not verify signing, Firefox installation, or live Atlassian compatibility.
```

### Source reproduction

For Mozilla source review, extract `dist/sans-emoji-sources.zip`, then run:

```sh
pnpm install --frozen-lockfile
pnpm build
```

Use Node.js 24+ and pnpm 12.10.1. `pnpm package` also runs checks, validates the built extension, and reproduces both ZIPs. The archive includes the split TypeScript configurations and all build inputs, and does not require Git metadata. See the [build reproduction instructions](../README.md#rebuild-the-firefox-review-sources).

The browser fixtures run with `pnpm exec playwright install chromium firefox` followed by `pnpm test:browser`. Chromium loads the actual extension; Firefox injects its script and stylesheet. These fixtures do not verify Firefox signing or every live Atlassian editor. Running `pnpm test:browser` rebuilds `dist/` and removes existing ZIPs; use `pnpm exec playwright test` after packaging to preserve them.
