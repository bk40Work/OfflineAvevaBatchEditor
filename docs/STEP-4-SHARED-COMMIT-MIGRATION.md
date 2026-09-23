# Step 4 — shared commit migration

Step 4 completes the shared XML transaction primitives for existing Phase and Operation services.

## Shared graph-scope contract

- clone authoritative DOM;
- validate Step endpoints;
- serialize, reparse and commit the authoritative projection;
- scope-neutral `transact()` runner for subsequent action migrations.

## Migrated consumers

- Phase movement commits via `RecipeGraphScope.xml.commit()`.
- Operation move/add/delete/name/first-item commits via `RecipeGraphScope.xml.commit()`.

## No user-interface changes

No menu, renderer, picker, transition, loop, fork or join behaviour is enabled or altered in Step 4. Repeat the full Phase and Operation regression suites.
