# Store materials

This folder keeps submission copy and asset guidance under version control. It is included in the Firefox review source ZIP, but not in the installed extension or the public `docs/` website.

| File | Purpose |
| --- | --- |
| [listing.en.md](listing.en.md) | English name, summary, and description for store dashboards |
| [listing.fr.md](listing.fr.md) | French translation of the listing copy |
| [submission.md](submission.md) | Single purpose, site-access justification, privacy references, and reviewer instructions |

The Markdown headings label dashboard fields; paste the field text rather than the headings. English name and summary match `extension/manifest.json`. French copy is prepared for stores that support translated listings; the extension manifest currently has English metadata and no `_locales/`. Adding Chrome listing locales may require a separate manifest-localization change. Do not imply that this folder enables localization in the installed extension.

## Release handoff

Follow [Packaging and releases](../README.md#packaging-and-releases). Use `dist/sans-emoji.zip` for either browser and attach `dist/sans-emoji-sources.zip` separately when Mozilla requests sources.

[Versioned release notes](../release-notes/) are the authoritative change history. Select the notes for the version being submitted; `release-notes/unreleased.md` describes pending work and is not a published release. Keep release notes out of the listing files to avoid parallel histories.

Before submission, check the copy against that release, complete the documented manual editor checks, and verify the public homepage, privacy, and support URLs. These files do not record a completed store submission or website deployment.

## Images

Use the existing [128 px icon](../extension/icons/icon128.png) and [512 px icon](../extension/icons/icon512.png) as the image sources for store forms. Their editable source is [assets/icon.svg](../assets/icon.svg); regeneration is documented in the [README](../README.md#icon-and-license). No separate copy is needed here.

Capture screenshots of the release running in an editor with non-sensitive sample text, such as `Bonjour : voici les détails`. A useful screenshot shows the typed colon with no suggestion panel; a second can show the normal toolbar emoji picker. Use genuine captures, and describe a local test fixture as a fixture if it is shown. Keep account names, issue contents, and private project details out of submitted images.

Chrome currently specifies a 128 × 128 store icon, 1280 × 800 screenshots, and a 440 × 280 small promotional tile in its [listing guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#graphic-assets). Check the current dashboard and [image guidance](https://developer.chrome.com/docs/webstore/images) before exporting. For Firefox, follow [Mozilla's listing guidance](https://www.extensionworkshop.com/documentation/develop/create-an-appealing-listing/).

Approved screenshots and promotional artwork can be kept in `store/assets/` with the release version and locale in their filenames. No release screenshots or promotional artwork have been added yet. The documentation-site preview in local `output/` is not an extension screenshot and is not part of the source archive.
