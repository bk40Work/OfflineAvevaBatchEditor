# Step 6 — Operation picker after an Operation Transition

## Purpose
Make an Operation Transition use the same card/action/picker interaction shape as a Phase Transition, at the Operation scope.

## Included
- Operation Transition cards receive a `⋮` action menu.
- `Insert Operation after this Transition` opens the existing picker panel, positioned from the clicked action.
- The panel collects the Operation name; no Operation template catalogue exists in the loaded model.
- On confirmation the native Unit Procedure `ProcedureLogic` is mutated as: `Transition → new Operation Step → former normal successor`.
- The new Operation contains its native empty `Begin → End` route and `OperationInformation/Name`, and the authoritative XML is validated, reparsed and committed.

## Unchanged
- All Phase picker and Phase graph code.
- Existing Operation insertion after an Operation card.
- Loop implementation.
- No branch/fork/join functionality is added.

## Regression checks
1. Add an Operation Transition after an Operation.
2. Open the Transition `⋮`; choose Insert Operation after this Transition.
3. Confirm the picker opens adjacent to its menu entry; type a name and insert.
4. Verify route order is Operation → Transition → new Operation → End.
5. Export/reload and confirm the new Operation and its native Begin/End route persist.
