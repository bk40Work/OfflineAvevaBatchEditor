# Step 2 — Phase transaction migration

Step 2 makes the Phase movement service a real consumer of the Step 1 shared graph-scope foundation.

## Migrated calls

- authoritative XML clone → `RecipeGraphScope.xml.cloneAuthoritative()`;
- Step endpoint validation → `RecipeGraphScope.xml.validateStepEndpoints()`.

## Unchanged

- Phase drag UI and drop boundaries;
- Phase move classifications and rewiring rules;
- Phase XML mutation decisions;
- Phase renderer, Transition, loop, fork, Join and DUMMY UI.

## Test

Repeat the passing Phase regression suite, including Move2b / 2c / 2d and singleton lane retention. No new UI action is enabled in this step.
