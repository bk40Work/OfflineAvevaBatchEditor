# Step 8 — Operation branch after Transition
Native Unit Procedure graph transaction: Transition → Parallel/SerialDivergent → DUMMY Operation lanes → Parallel/SerialConvergent → original successor.

The picker selects parallel/serial mode and lane count. Each DUMMY lane exposes an Operation-name picker that replaces its convergent source with a native Operation Step and retains the DUMMY-to-Operation control link. XML endpoints are validated and each action reparses and commits. Phase code is unchanged.
