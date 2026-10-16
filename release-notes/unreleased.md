# Unreleased

Changes after [2026.10.15](2026.10.15.md). The planned 2026.10.14 release was abandoned; its changes and the subsequent performance and Firefox fixes are included in 2026.10.15.

## Compatibility

- Require desktop Firefox 142 or later, up from 140. Mozilla's validation of the 2026.10.15 package warned that Firefox for Android 140, the Android minimum it derived from the desktop minimum, predates Android support for the required `data_collection_permissions` key, which arrived in version 142. The extension still targets desktop Firefox only; Android distribution remains disabled. Mozilla's release calendar lists 153 as the current ESR and 115 as the only older ESR still supported, so Firefox 140 ESR and 141 no longer receive updates.
- Local extension validation now fails on every linter warning, including the Android minimum-version warning it previously skipped, so it matches the warnings Mozilla's validation reports.
