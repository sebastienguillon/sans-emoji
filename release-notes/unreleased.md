# Unreleased

Changes after the initial [2026.10.10 notes](2026.10.10.md). No new release version has been assigned; `package.json` and the manifest still use `2026.10.10`.

## Changes

- Hide recognized emoji suggestion panels from their first frame, including during IME composition and delayed cancellation. Keep the inline query visible and continue using the editor's Escape handler to preserve text.
- Use one unpacked `dist/` build for Chrome and Firefox, with Firefox metadata in the shared manifest. Replace development installations that still point to the old browser subfolders.
- Produce one `sans-emoji.zip` for both browsers and a separate `sans-emoji-sources.zip` for Firefox review. Rebuilding clears stale files and old ZIPs.
- Include the MIT license in the unpacked build and both archives.
- Clarify installation, troubleshooting, test coverage, release preparation, and source reproduction in the README.
- Prepare a static overview, privacy policy, and support website in `docs/`, using SG-X's visual style, plus a source-level privacy document. Include them in Firefox review sources and document the intended GitHub Pages/store URLs; deployment remains a separate step.
- Add English and French store listing copy, submission notes, and image guidance in `store/`, keeping the authoritative release history in `release-notes/`.
- Validate the built extension with pinned Mozilla tooling as part of `pnpm check` and `pnpm package`. Fail errors and applicable warnings; explicitly report the Android minimum-version diagnostic as inapplicable only while the manifest remains desktop-only.
- Separate browser, Node tooling, and test TypeScript environments while preserving strictness, unit coverage, and reproducible source packaging.
- Pin CI actions to verified commits, disable persisted checkout credentials, bound job duration, and cancel superseded runs while keeping browser tests and report uploads.

## Validation

Recorded locally on October 13, 2026 for the project-organization changes:

- `pnpm package`: all three TypeScript environments, Biome, and 74 unit tests passed with 100% statement, branch, function, and line coverage across all 11 files in `src/`, `tooling/`, and `scripts/`. Packaging tests reproduced both archives byte for byte and checked the new source inputs.
- Extension validation reported zero errors and zero actionable warnings. One Android minimum-version warning was explicitly skipped because the manifest does not enable Android distribution; enabling Android in a temporary built manifest correctly made it fail. Removing a required manifest field also failed validation. The built manifest was restored afterward.
- `pnpm exec playwright test`: all 42 Chromium/Firefox fixtures passed against the shared packaged build. These checks use the same browser-loading limits described below.
- Temporary negative type checks proved that browser source rejects Node globals and imports, and Node tooling rejects DOM globals. Probe files were removed after the checks.
- `actionlint .github/workflows/ci.yml` passed. Action commit pins were resolved against their official repositories. Hosted GitHub Actions has not been run for these uncommitted changes.
- Checked 30 local README/store links, English name and summary against the manifest, and both listing summaries against the 132-character limit. No store submission, website deployment, release screenshot capture, or live Atlassian editor test was performed for these changes.

Recorded locally on October 11, 2026:

- `pnpm package`: typechecking, linting, and 66 unit tests passed, with 100% statement, branch, function, and line coverage for every file in `src/`, `tooling/`, and `scripts/`.
- Packaging tests verified the two-archive layout, removal of obsolete builds, preservation of Firefox metadata, and byte-for-byte reproduction from extracted sources.
- Website checks verified desktop and mobile layouts, navigation, keyboard access to the skip link and support disclosures, privacy-policy anchors, and 44 local links and assets. The static pages contain no scripts and produced no browser console warnings or errors.
- `pnpm test:browser`: 42 Chromium/Firefox fixture tests passed against the shared build, including popup visibility before cancellation. Chromium loaded the unpacked extension; Firefox used script and stylesheet injection.
- Live signed-in Atlassian editors, their real undo/redo behavior, Firefox add-on installation/signing, and store submission have not been validated by these automated tests.

## Known limitations

- If an editor ignores synthetic Escape, its suggestions remain hidden but its autocomplete state may still consume Enter or Tab.
- The modern suppression rule applies throughout the document while a colon query exists; simultaneous menus in multiple editors are not independently scoped.
- Internal Atlassian markup changes may require selector updates. Custom company domains and unrelated frame URLs remain outside scope.
- Firefox requires version 140+; permanent installation in standard releases requires Mozilla signing.
