# Move2b manual acceptance record

## Use this candidate only

Extract `aveva-recipe-editor-move2b-clean-runtime-candidate.zip` and open:

`move2b-clean-runtime/app/index.html`

Do **not** use the earlier `release-candidate/app/index.html`; that is the frozen failing baseline shown in the fault screenshot.

## Test action

1. Load developer evidence file `evidence/move2/move-2.xml` from the workbench.
2. Turn on Edit mode.
3. In first Fork Branch A, hold the drag handle of `circulatePump`.
4. While holding it, release on the target displayed after Transition #5 and before the first Fork.
5. Confirm that the target hides again after the move.

## Must be true before save

- Transition #5 still shows its loop to return DUMMY #48.
- The normal route is Transition #5 → `circulatePump` → Fork.
- First Fork Branch A contains `coolingOn` only.
- First Fork Branch B remains `coolingOff → circulateMaxShea(r)`.
- The first Join remains intact.
- The continuation DUMMY feeds the subsequent Fork and is not rendered as `Empty branch lane`.
- There is no `Branch entry` card and no new third fork lane.
- The subsequent fork and its nested fork remain intact.

## Round-trip gate

Export the changed XML, reopen it in the same candidate, and repeat the checks above. Record pass only when the reopened topology remains the same.

If the move is rejected, capture the exact error message. The live recipe must remain unchanged.
