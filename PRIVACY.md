# Privacy

Updated 11 October 2026.

Sans Emoji processes editor content locally to suppress colon-triggered emoji suggestions. The extension makes no network requests, stores no user data, and sends none to the developer or other services. It has no analytics, telemetry, background process, or remote code.

The website version of this policy is [docs/privacy.html](docs/privacy.html). Its intended public URL, after GitHub Pages is enabled, is <https://sebastienguillon.github.io/sans-emoji/privacy.html>.

## Where it runs and permissions

The [manifest](extension/manifest.json) limits site access to HTTPS `atlassian.net`, `atlassian.com`, `bitbucket.org`, and their subdomains, including frames whose own URLs match. This access lets the extension inspect editor elements, hide recognized suggestion panels, and send a cancellation event.

It does not request additional extension API permissions, including `storage`, `tabs`, `cookies`, `webRequest`, `downloads`, or history access. All executable extension code ships in the package.

## What it reads

- Page element structure and attributes, to identify query fields and suggestion panels.
- The focused field, input events, and input method editor composition events, to time cancellation in the active editor.
- Caret position and text before the caret in supported legacy editors, to recognize a colon query. This can include draft text; it is processed locally and is not saved or transmitted.
- The page's protocol and hostname, to check the supported HTTPS domain scope. No browsing-history log is created.

Cancellation sends a synthetic Escape key event. The editor handles its own text and selection; Sans Emoji does not submit writing. See [src/dom.ts](src/dom.ts), [src/controller.ts](src/controller.ts), and [extension/content.css](extension/content.css).

## Storage, retention, and transmission

The extension uses no local or sync storage, cookies, database, or saved files. Temporary references to candidate elements and retry counts stay in memory for the page's lifetime. Navigating away or closing the tab clears that state; it is not an activity log.

The extension makes no network requests. It does not transmit editor text, page content, or browsing activity. The Atlassian website still processes and saves writing according to its own behavior and policies; Sans Emoji does not prevent that site from accessing it.

## Your choices

Disable or remove Sans Emoji in the browser's extension manager and refresh open Atlassian tabs to remove the loaded script and stylesheet. There is no retained extension data to delete.

## Limited use

Sans Emoji's use of user data complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Editor content is used only for autocomplete suppression. It is not sold, used for advertising, transferred for unrelated purposes, or used to determine creditworthiness or lending eligibility. The developer does not receive or review editor content through the extension.

## Website visits and support

The static website uses no analytics scripts, third-party fonts, embedded trackers, or tracking cookies. When hosted on GitHub Pages, GitHub processes visitor information under the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement), including IP addresses for security purposes. Website hosting is separate from extension operation.

If you email the developer, your email address and the information you choose to send are used to respond to the request and are handled by the email providers involved. Send only what is needed; do not include passwords, session tokens, confidential issue text, or private project details. You can request deletion of support correspondence.

For questions, bug reports, or privacy requests, email Sébastien Guillon at <guillon.sebastien@gmail.com>. See [docs/support.html](docs/support.html) for troubleshooting.
