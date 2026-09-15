# Classroom Tycoon editing rules

- Preserve the Korean classroom simulator and existing player save histories.
- The user authorizes automatic version increments for every later fix. Never ask them to pick or approve a version number.
- For each user-visible release, run `node scripts/release.mjs --next "변경 내용" ...`; it increments `1.0.0-beta.N`, dates it in Asia/Seoul, and updates the newest three in-game history entries. Use an explicit version only for a deliberate major/minor release.
- Keep the checked-in `.githooks/pre-commit` active with `git config core.hooksPath .githooks` in new checkouts. It generates a beta version if staged game edits have no release update yet. Do not bump again for commits belonging to the same unpublished release when release-info is already staged.
- New physical spaces must have their own geometry, placement constraints and Korean labels.
- Keep student support and school procedures grounded in professional NPC handoffs. Do not invent medical diagnoses, disciplinary decisions or certification of real training. Never derive ability from family background or support labels.
- Verify state transitions and saved records with meaningful model tests; use the Sites execution profile's permitted verification path. Do not start browser or dev-server work unless the applicable Sites instructions and user request allow it.
- Existing versions' scope documents are history. Update `docs/BETA_SCOPE.md` and the player-facing `dist/beta-notes.html` for the active release; do not claim PRD acceptance checks that have not actually passed.
- Use `docs/PRD_v0.5.md` for current implementation contracts; retain v0.4 as history. After changing approved documents or release metadata, run `node scripts/publish-docs.mjs` and `node scripts/publish-docs.mjs --check`. Stage the generated `dist/prd.html` and `dist/docs/` with their sources; do not hand-edit generated copies.
- Preserve the Site audience and follow the Sites publication workflow for the exact committed source.
