# AVEVA ProcedureLogic route rules

These rules were derived from the native AVEVA exports in `ExampleConfigs/`. They are verified automatically: `tests/test-roundtrip.js` rebuilds every route in every native file from the tree model and requires the result to be identical to AVEVA's own export, DUMMYs included.

## The chart is block-structured

Every ProcedureLogic (Master recipe → Unit Procedures, Unit Procedure → Operations, Operation → Phases) is a structured chart:

```
Route  := Begin  Seq  End
Seq    := Item*
Item   := Step (Phase / Operation / Unit Procedure)
        | Transition
        | Parallel branch  { lanes: Seq, Seq, … }   (2 or more lanes)
        | Loop             { body: Seq, closing Transition }
```

## How it is written in XML

| Structure | XML |
|---|---|
| Sequence | `ControlLink` from each node to the next |
| Parallel fork | **one** `ParallelDivergent` Link: one `FromID`, one `ToID` per lane (lane order = ToID order) |
| Parallel join | **one** `ParallelConvergent` Link: one `FromID` per lane end, one `ToID` |
| Loop | a DUMMY loop point, the body, then the closing Transition, plus an `Other` Link from that Transition back to the DUMMY |
| Transition | `<Transition>` in ProcedureLogic (ID, Condition, Description, ext:Name) |

## DUMMY placeholders (`RecipeElementType Other`, `OtherValue="DUMMY"`)

DUMMYs are structural. The editor never shows them as items and regenerates them on every write:

| Rule | Where AVEVA puts a DUMMY | Evidence |
|---|---|---|
| R1 | An empty branch lane is one DUMMY | Simple2, Simple9 |
| R2 | A lane that **starts** with a branch starts with a DUMMY (the inner fork source) | nests |
| R3 | A lane that **ends** with a branch ends with a DUMMY (the inner join target) | Simple4, Simple12a |
| R4 | A join followed directly by a fork goes through a continuation DUMMY | Move_2, Simple8 |
| R5 | A join never targets a Transition: join → DUMMY → Transition | (no convergent-to-Transition link exists in any export) |
| R6 | Two Transitions are never directly linked: T → DUMMY → T | (no T→T link exists in any export) |
| R7 | Every loop starts with a DUMMY loop point. An empty loop body holds one DUMMY | Move_2a |

Other facts:

- Fork sources may be Begin, a Step, a DUMMY or a Transition. Lane entries and lane ends may be Transitions.
- A branch as the first item after Begin forks directly from Begin (nests).
- The last join of a route may target End.
- AVEVA renumbers all IDs on export, so IDs carry no meaning. The editor keeps existing IDs and allocates new ones above the current maximum.
- Phase `Label` is unique across the recipe. New phases get max + 1.
- Process-parameter values live in `Formula` records (linked by `FormulaParameterID`). Material quantities live on the phase parameter, whose `FormulaParameterID` points to the BOM material record (`0` = no material).

## What this means for edits

Every edit AVEVA makes (move, insert, delete, delete lane, collapse a two-lane branch) is an ordinary list operation on the tree. Writing the tree back applies R1–R7 and reproduces AVEVA's topology exactly. `tests/test-scenarios.js` proves this against 33 native before/after pairs, including Move2a–2d and the Simple8 → Simple12e deletion chain.
