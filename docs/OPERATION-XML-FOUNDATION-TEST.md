# Operation XML-authoritative foundation — test guide

This release migrates the **Operations** lane only. It replaces legacy move arrows with Phase-style cards, six-dot drag handles, and revealed drop boundaries.

## Scope

Enabled: moving an Operation before another Operation when both are on a single, ordinary `ControlLink` route in the selected Unit Procedure.

Not yet enabled: Operation creation, deletion, Transitions, branches, joins, loops, or cross-Unit-Procedure moves. Those controls are intentionally not presented as migrated graph actions in this foundation.

## Test

1. Use a recipe / Unit Procedure with at least three ordinary linear Operations.
2. Enter Edit mode and select that Unit Procedure.
3. Check that Operation cards use the six-dot handle and no ▲ / ▼ buttons.
4. Drag the final Operation to the boundary immediately before the first or middle Operation.
5. Confirm the displayed order changes.
6. Export the XML, reload it, and confirm the same Operation order remains.
7. Repeat one reverse move.

## Expected protection

If the source or target sits on a Transition, fork, Join, loop, or other non-linear route, the move must be rejected with the linear-foundation message and must not change the recipe.

## Phase regression

Load `move-2.xml` and confirm existing Phase drag/drop behaviour remains unchanged. This release does not alter Phase XML movement.
