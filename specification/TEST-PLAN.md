# Test plan

## Automated (run before every change)

| Suite | Command | Proves |
|---|---|---|
| Round trip | `cd tests && node test-roundtrip.js` | Every route in every native file rebuilds identical to AVEVA's export, and the tree is unchanged after a rewrite |
| Native scenarios | `node test-scenarios.js` | 33 AVEVA before/after pairs (Move_ → Move_13, Move2a–2d, Simple → Simple7 creation, Simple8 → Simple12e deletion) are reproduced exactly by the editor's actions, and survive save → reload |
| Behaviour and fuzz | `node test-edits.js` | Unit Procedure and Operation lanes, loops, lanes, undo/redo, formula clean-up, cross-container moves, refused edits leave the XML untouched, and about 1,300 random edits never produce an invalid route |
| Browser | `python3 ui/test_ui.py` | The real UI: drag and drop, pickers, properties, menus, keyboard, cut/paste across operations, new recipe from scratch, save → reopen |

`npm test` runs the first three.

## Manual acceptance in AVEVA (recommended once per release)

For each row: open the file, make the edit in this editor, **Save XML**, import it into AVEVA, then compare with the reference file (or check visually).

| # | Open | Action | Expected (reference) |
|---|---|---|---|
| 1 | Move_2.xml | Drag circulatePump (Branch A end) to the position before the first fork | Move_2b_correct.xml |
| 2 | Move_2.xml | Drag feedCipWater out of the loop to before the first fork | Move_2a.xml (loop keeps a DUMMY) |
| 3 | Move_2.xml | Drag circulatePump to just after the first join | Move_2c.xml |
| 4 | Move_2c.xml | Drag circulatePump back to the end of Branch A | Move_2.xml |
| 5 | Simple8.xml | Operation "new": delete feedCipWater | Simple9.xml (empty lane) |
| 6 | Simple12.xml | Delete feedPWater (after the nested join) | Simple12a.xml |
| 7 | Simple12a.xml | Nested fork → lane B ⋮ → Delete this lane | Simple12b.xml |
| 8 | Any | New recipe → add process class → Unit Procedure → Operation → phases, transition, loop, branch → save | AVEVA imports it |
| 9 | GM_A17392.xml | Open and save with no changes | File identical apart from the new ModificationLog |
