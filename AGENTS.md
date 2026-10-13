# Project instructions

- Use pnpm 12+ consistently for dependencies, scripts, CI, and documentation. Keep `pnpm-lock.yaml`; do not introduce npm or Yarn lockfiles.
- Keep all executable project code in strict TypeScript 7. Maintain 100% unit coverage for `src/`, `tooling/`, and `scripts/`.
- Keep browser source, Node tooling, and test fixtures in their separate TypeScript environments; `pnpm typecheck` must check all three. `pnpm check` includes a clean build and extension linting. Keep store copy in `store/` and release history in `release-notes/`.
- `pnpm build` recreates a single unpacked `dist/` build for manual installation in both Chrome and Firefox. Keep Firefox metadata in the shared `extension/manifest.json`. `pnpm package` runs checks and creates `dist/sans-emoji.zip` for both browsers plus the matching Firefox review source ZIP, `dist/sans-emoji-sources.zip`. Keep the source archive allowlist in `tooling/package.ts` current when adding build inputs.
- Use `YYYY.M.D` calendar versions. Keep `package.json` and `extension/manifest.json` versions identical.
- For every release, produce release notes in `release-notes/<version>.md` before packaging or publishing. Describe user-visible changes, fixes, and known limitations; record relevant validation. Base the notes on changes since the previous release (or the initial feature set for the first release). Do not claim unverified behavior or successful checks that were not run. Include the notes in the release handoff or publishing workflow.
