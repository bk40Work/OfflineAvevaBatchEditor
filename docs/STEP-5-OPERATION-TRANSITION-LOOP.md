# Step 5 — Operation graph actions: Transition and loop

This release starts the Operation graph-action migration without modifying the Phase lane.

- Removes the obsolete **Add Operation before / after** menu surface.
- Adds **Insert Operation after this node** (the existing native linear insertion transaction, renamed to the graph action).
- Retains native **Insert Transition after this Operation**.
- Adds native **Create loop after this Operation**: clones authoritative XML; creates a Transition; reroutes the normal ControlLink; creates an AVEVA `Other` return link to the selected Operation Step; validates endpoints; reparses and commits.
- Parses and displays the resulting Transition condition and loop target in the Operations lane.

No branch/fork/join action is exposed. The supplied fixtures contain no Unit-Procedure-level branch topology, so a branch implementation would be unverified and must follow after a representative native fixture is supplied.

Phase code is unchanged.
