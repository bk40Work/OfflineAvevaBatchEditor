# Move2c / Move2d regression tests

These are topology tests, not ID or recipe-name rules. They use `move-2.xml` as the starting graph and the supplied `move-2c.xml` / `move-2d.xml` as evidence of the structural intent.

## 2c — lane exit becomes continuation before the subsequent fork

1. Load `move-2.xml`, select the operation, and enable edit mode.
2. Drag `circulatePump` from the end of the first Fork, Branch A.
3. Drop it in the rendered boundary after that Join and before the Subsequent fork.

Expected:

- Branch A now ends at `coolingOn`; Branch B is unchanged.
- `circulatePump` is shown after the first Join and immediately before the Subsequent fork.
- The Subsequent fork remains present and now follows `circulatePump`.
- The first Join still has both branch inputs.
- Transition 5 and its `Other` return are unchanged.
- Export, reload and confirm the same visual topology.

## 2d — continuation returns into a branch lane

Starting from a successful 2c state:

1. Drag the continuation `circulatePump`.
2. Drop it at the end of the first Fork, Branch A, immediately before its Join.

Expected:

- `circulatePump` appears after `coolingOn` in Branch A.
- The Subsequent fork remains present, with a retained structural DUMMY as its source.
- The first Join again takes Branch A and Branch B as inputs.
- No `Other` loop link is changed.
- Export and reload preserve the graph.

## Cross-lane round trip

1. Move a non-loop-owned Phase from Fork A to Fork B.
2. Move that same Phase back to Fork A.

Expected: both fork and join groups remain resolvable on the reverse move; no “branch fork is no longer present” error.

For any failure, record only the exact error text, source Phase, visible destination caption, and whether the graph changed after export/reload.
