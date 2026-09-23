# Step 9 — Operation graph parity

Adds Operation-node branch creation, horizontally scrollable Operation branch lanes, and guarded Transition deletion. A Transition with an Other loop link remains fixed and cannot be deleted.

Transition drag is intentionally not enabled in this release: Operation Transition relocation needs the full cross-boundary graph classifier, including fork/join placement, before it can be safely claimed as Phase-equivalent. The visual handle is not emitted for loops.
