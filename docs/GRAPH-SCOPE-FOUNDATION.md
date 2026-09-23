# Step 1 — shared graph-scope foundation

This release introduces `app/js/graph-scope.js` as the common foundation for all hierarchy levels.

## Registered scopes

| Scope | Graph node | XML ProcedureLogic owner |
|---|---|---|
| `phase` | Phase | Operation RecipeElement |
| `operation` | Operation | UnitProcedure RecipeElement |
| `unit-procedure` | UnitProcedure | MasterRecipe |

## Shared primitives now owned by the foundation

- direct XML child and text access;
- link endpoint reading;
- authoritative DOM clone;
- Step endpoint validation;
- serialize, reparse and authoritative commit.

## Deliberate Step 1 boundary

Existing Phase and Operation behaviours are not redirected in this release. This is a no-behaviour-change extraction foundation: it registers the scopes and makes the shared primitives available before individual actions migrate one at a time.

The next migration moves the existing Phase transition/loop transaction helpers onto `RecipeGraphScope.xml`, then calls those same helpers through the Operation adapter.

## Regression check

- Load a Phase recipe and verify established Phase drag/drop behaviour.
- Verify Operation add/move/delete and first-item insertion behaviour already passing in v16.
- There are no new visible actions in Step 1.
