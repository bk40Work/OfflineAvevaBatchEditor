# Generic Phase movement coverage

This build treats the loaded AVEVA ProcedureLogic graph as authoritative. Move2 files are examples and are not used as fixture rules.

## Enabled

A business Phase can be dragged before any visible business Phase in the same Operation when the source has one unambiguous normal incoming route and one unambiguous normal outgoing route.

This includes:

- reordering on a linear route;
- moving between ordinary positions inside a branch lane;
- moving from a multi-item branch lane to the main route;
- moving from the main route into a branch lane;
- moving between branch lanes;
- dropping before a Phase immediately preceding a fork or following a join;
- the previously validated fixed-loop Transition-to-Fork transformation.

The mutation is transactional: clone authoritative XML, mutate native Steps/Links, validate Step references and unchanged `Other` loop links, reparse, then commit.

## Protected rather than guessed

The editor rejects these cases without mutation:

- a Phase which directly owns an `Other` loop route;
- a Phase forming the only Step between a divergent and convergent group (single-item lane), because moving it requires a retained structural DUMMY placeholder;
- ambiguous graph nodes with more than one normal incoming or outgoing route;
- movement between different Operations.

These protected cases need dedicated whole-structure transformations. They are not silently treated as ordinary Phase moves.

## Manual regression matrix

For each source recipe: move earlier/later on a linear route; main route to lane; lane to main route; lane A to lane B; first/middle/final item within a multi-item lane; before fork; after join; cancel a drag; attempt a loop-owned Phase; attempt a singleton lane; export, reload and compare routing and `Other` links.

## Boundary expansion v2

Rendered graph boundaries now include before each Phase, before each Transition, each branch-lane exit immediately before its Join, after a Join before a subsequent fork, after the final graph item before End, and the retained Transition-to-Fork boundary. A visual “after” position is represented by the following native graph boundary, so the mutation remains one consistent boundary-split operation.

## Generic Transition-to-Fork routing v3

The retired Move2b classifier and mutation are no longer present or called. Transition-to-Fork is now a normal graph boundary: the selected Phase is detached from its current unambiguous route, the native divergent group is retained with the Phase as its source, and a ControlLink is inserted from the Transition to that Phase. No fixed-loop, source-lane, label, ID, or example-specific condition is required.
