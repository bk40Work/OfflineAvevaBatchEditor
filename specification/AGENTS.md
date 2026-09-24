# Rules for AI assistants working on this repository

Read `docs/ARCHITECTURE.md` and `docs/AVEVA-ROUTE-RULES.md` first.

1. **Never write Link, Step or Transition XML outside `app/js/core/sfc.js`.** Route edits are tree operations in `edit-ops.js`, called from `actions.js`, and committed with `RecipeDoc.commit(tree)`.
2. **No scenario-specific code.** Do not add handlers for a named case (for example "Move2b"), for fixture IDs, or for phase names. If an AVEVA export shows a new structural pattern, express it as a rule in `sfc.build()` and add the native before/after pair to `tests/test-scenarios.js`.
3. **Every change goes through `RecipeDoc.edit()`** so it is undoable and rolled back on error. The UI never edits the DOM directly.
4. **Run `cd tests && npm test` before and after any change.** All tests must pass. Add a test for every bug fixed.
5. There is one implementation of each feature. Do not keep "legacy" or "v2" copies side by side. Git history holds the old code (the pre-2026-09 editor is in the repository history only).
6. The site configuration (`app/config/*.js`) is data. Do not put logic there.
