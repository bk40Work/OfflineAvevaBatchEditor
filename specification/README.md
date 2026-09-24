# AVEVA Batch — Offline Recipe Editor

A browser-based, fully offline editor for AVEVA Batch Management master recipes (B2MML `MasterRecipe` XML exports).

Open `app/index.html` in Chrome or Edge. No install, no server, no network access.

## What it does

| Area | Features |
|---|---|
| View | Three linked lanes: Unit Procedures → Operations → Phases. Transitions, loops and parallel branches (nested to any depth) are drawn as a flowchart. Phase parameters are shown on each card. Per-lane zoom. |
| Create | New blank recipe. Add process classes (from the site model) and materials. Add Unit Procedures, Operations and Phases (Process, Transfer, Allocate/Release) plus the standard items in every lane: **Transition**, **Loop back** and **Branch** (execute all or execute one, 2–50 lanes; the mode can be switched later from the branch's ⋮ menu). |
| Edit | Drag any item (phase, transition, loop or whole branch) to any position: into, out of or between branch lanes, into and out of loops, before or after joins. Drop a phase on an Operation card to move it to that operation, or use **Move…** and click the destination (this also works across unit procedures). Delete items, branch lanes, whole branches and loops. Edit parameters, material assignments, transition conditions, names, header, equipment and bill of materials. In the bill of materials, ▶ on a material shows where it is used (unit procedure, operation, phase, quantity) with allocated-vs-BOM status; quantities can be changed there and **Go to** opens the phase. |
| Safety | Undo/redo (Ctrl+Z / Ctrl+Y). Every edit is verified before it is accepted. A refused edit shows the reason and changes nothing. |
| Save | Author and comment are required. A ModificationLog entry is added (V1, V2 …) and the XML is downloaded. An unchanged recipe saves byte-identical to the AVEVA export. |
| Print | The whole recipe: every unit procedure, operation and phase route. |

## How to use it

1. **Open XML** (or drop a file on the page). Click a Unit Procedure to see its Operations, then an Operation to see its Phases. Click a phase or transition for its properties.
2. Click **✎ Edit**.
   - **Insert:** click a **+** on any connector line, or in an empty lane or loop.
   - **Move:** drag by the card (⠿ grip), or use **⋮ → Move…**. While dragging, every valid drop position is outlined in green.
   - **Delete and other actions:** use **⋮** on any card, branch bar, lane header or loop header, or select an item and press **Delete**.
3. **Save XML**, then import the file into AVEVA.

## Project layout

```
app/                       the application (open index.html)
  config/model_SC.js       site model: process classes, units, phases, transfers
  config/materials_SC.js   materials database
  js/core/                 recipe model: no UI code, unit-tested
    xml.js                 B2MML helpers and AVEVA-style serialisation
    sfc.js                 ProcedureLogic <-> route tree (the only code that writes Links/Steps)
    recipe-doc.js          the document: transactions, undo, element factories, header/equipment/BOM
    edit-ops.js            insert / move / delete as list operations on the tree
    actions.js             user-level actions (one undoable transaction each)
  js/ui/                   lane-render.js (view), panels.js (forms), app.js (controller)
  css/app.css
docs/                      ARCHITECTURE.md, AVEVA-ROUTE-RULES.md, TEST-PLAN.md
ExampleConfigs/            native AVEVA evidence files used by the tests
tests/                     automated tests (Node + Playwright)
AGENTS.md                  rules for AI assistants working on this code
```

## Running the tests

```
cd tests
npm install          # once: installs @xmldom/xmldom
npm test             # round trip, native scenarios, behaviour and fuzz tests
python3 ui/test_ui.py   # end-to-end browser test (needs Playwright + Chromium)
```

## Configuration for another site

Replace `app/config/model_SC.js` and `app/config/materials_SC.js`, keeping the same structure. `model.processes[class].phases[phase]` lists each phase's parameters with `type` set to `Process` or `Material`. Transfer phase parameters come from `model.transfer_phases`. Their `quantity*` parameters are created as material inputs, which is how AVEVA exports them.
