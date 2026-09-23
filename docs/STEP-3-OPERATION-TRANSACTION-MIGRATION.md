# Step 3 — Operation transaction migration

Step 3 makes the existing Operation XML service a consumer of the same shared graph-scope transaction primitives already proven by Phase movement in Step 2.

## Migrated calls

- authoritative XML clone → `RecipeGraphScope.xml.cloneAuthoritative()`;
- Step endpoint validation → `RecipeGraphScope.xml.validateStepEndpoints()`.

## Unchanged

- Operation cards, drag/drop, add/delete, name update and first-item insertion;
- Phase movement service and its UI/mutation behaviour;
- no Operation transition, loop, fork or Join action is enabled by this step.

## Test

Repeat passing Operation add/move/delete/first-item tests and the Phase regression suite. There are no new user-visible actions in Step 3.
