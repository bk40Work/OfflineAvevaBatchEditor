# V3 shared graph actions test

## What changed

`graph-actions.js` now owns one native XML writer for:
- create Transition after a business node;
- create loop after a business node;
- create direct branch after a business node.

Operation menu calls are now thin adapters to these functions. They no longer use the historic Operation-specific writers for these three actions.

## Test only these Operation actions

1. **Insert Transition after Operation** — expected numeric ID and one normal outgoing route.
2. **Create loop after Operation** — expected numeric ID, normal route retained, one `Other` return to source.
3. **Create branch after Operation** — expected direct `Operation → divergent → DUMMY lanes → convergent → original successor`; no implicit Transition.
4. Export and reload after each action — expected same graph rendering.

## Do not test

Phase actions, Transition-menu insertions, branch-lane insertion, movement and deletion are unchanged in this version.
