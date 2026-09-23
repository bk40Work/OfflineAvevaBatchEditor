# Move2b controlled implementation

## What changed

- Removed six competing movement modules from the runtime manifest and application folder. They are preserved under the workbench's developer-only `developer-retired-movement/` folder.
- Added one readable `app/js/movement-service.js`. It is the sole owner of Phase movement interaction and XML mutation.
- Updated the Phase drag handle and the Transition-to-Fork drop boundary to use that service.
- Removed unaccepted generic, post-Join and lane-to-Join movement targets from this candidate.
- Routed the retained arrow entry point to the new service. Ordinary arrow moves remain deliberately unavailable until they are separately evidence-backed; the service rejects them without mutation.
- Removed legacy Transition-movement controls from Transition cards.

## Move2b implementation rule

The service accepts only a Phase that is the final item of a fork lane, whose predecessor is a target of the selected fixed-loop Transition's native divergent group. It then:

1. clones the authoritative XML DOM;
2. shortens the source lane by retargeting the original grouped convergence to the source predecessor;
3. removes the source Phase and Step;
4. recreates the business Phase and Step after the selected Transition;
5. changes the Transition's normal divergent link to a normal `ControlLink`;
6. creates a new grouped divergent link from the recreated Phase to the original lane entries;
7. confirms every Step endpoint exists and every `Other` link is byte-for-byte topologically unchanged;
8. reparses before replacing the live projection.

The service does not create a Branch entry or an Empty branch lane.

## Not yet accepted

Move2a, Move2c, Move2d, generic Phase movement, ordinary-path arrows and Transition movement remain out of scope. The candidate must not be described as a general movement release.
