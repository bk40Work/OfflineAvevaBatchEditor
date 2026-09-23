# Operation add/delete — XML-authoritative test

## Scope

Enabled only on a selected Unit Procedure's ordinary linear Operation route. The Phase movement engine is unchanged.

## Add before / after

1. Choose an Operation with an ordinary linear predecessor and successor.
2. Open its `⋮` menu and select **Add Operation before**.
3. Confirm a new empty `New Operation` card appears before it.
4. Use `?` to name it.
5. Repeat with **Add Operation after**; when selected on the final Operation, the new Operation is inserted before End.
6. Export, reload and confirm card order and names remain.

## Delete

1. Choose a non-empty or empty Operation on an ordinary linear route.
2. Open `⋮` and select **Delete Operation**; confirm the deletion.
3. Confirm its adjacent Operations are directly connected in the displayed order.
4. Export and reload.

## Expected protection

If the selected Operation has a Transition, fork, Join, loop, or multiple route endpoints, add/delete must reject without changing XML. Operation-level transitions, loops and branches are the next increment.
