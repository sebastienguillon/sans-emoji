# Store listing — English

## Name

Sans Emoji

## Summary

Dismiss colon-triggered emoji autocomplete on Atlassian sites without changing your text.

## Description

Sans Emoji hides colon-triggered emoji suggestions on Atlassian sites, so you can keep writing your sentence.

Type French punctuation such as “Bonjour : voici les détails” with ordinary or non-breaking spaces. Recognized suggestion panels stay hidden while the extension asks the editor to cancel autocomplete through its own Escape handler. Sans Emoji does not rewrite your text.

It works automatically on HTTPS atlassian.net, atlassian.com and bitbucket.org pages, including their subdomains. There are no settings to configure or toolbar popup to open.

Intentional colon searches such as :smile are suppressed too. Existing emoji remain unchanged, and the editor's separate toolbar emoji picker stays available when you want to insert one.

Editor content is processed locally in your browser. The extension makes no network requests, stores no user data and has no analytics or telemetry. Your Atlassian site continues to process your writing as usual.

Atlassian editors can change. Custom company domains are outside the extension's scope. If an editor ignores the cancellation event, its suggestion panel stays hidden but Enter or Tab may still act on autocomplete; press Escape or disable the extension and refresh the page. Multiple simultaneous menus are not independently scoped while a colon query is active.

Sans Emoji is an independent project by Sébastien Guillon, not affiliated with or endorsed by Atlassian.
