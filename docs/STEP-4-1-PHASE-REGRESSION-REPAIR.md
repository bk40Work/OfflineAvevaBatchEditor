# Step 4.1 — Phase regression repair

## Purpose
Restore the validated Phase movement transaction commit sequence after Step 4 regression reports: Phase picker appearing at the top-left and Transition nodes no longer being draggable.

## Evidence
A direct Step 3 → Step 4 comparison showed `picker.js`, lane rendering, and drag bindings were unchanged. The sole Phase movement change was the replacement of its local serialize → reparse → XML authority attach → current recipe replace sequence with `RecipeGraphScope.xml.commit()`.

## Change
Only `app/js/movement-service.js` has changed from Step 4:
- `commitMove()` again uses its exact Step 3 commit sequence.
- Phase picker code, rendering, drag bindings, movement classification, endpoint validation, and all Phase graph logic are untouched.
- `graph-scope.js` remains unchanged, including `RecipeGraphScope.xml.commit()` and `transact()`.
- Operation Step 4 commit migration remains unchanged.

## Regression checks
1. Open the supplied `move-2-4.xml`.
2. In the affected Operation, verify the Phase picker opens at its invoking boundary/card rather than viewport top-left.
3. Verify a Transition node retains its 6-dot handle and can be dragged to an allowed existing boundary.
4. Verify Phase move persists after export/reload.
5. Re-run Operation add, delete, rename and first-item insertion checks.

No XML fixtures were changed.
