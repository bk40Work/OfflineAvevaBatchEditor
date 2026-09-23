# Step 10 — Operation Transition movement

A non-loop Operation Transition now has a six-dot drag handle and separate drop boundaries before each Operation and End. On drop, the authoritative Unit Procedure ProcedureLogic is cloned and rewired: its old predecessor connects to the old successor, and the destination predecessor connects to the moved Transition which then points to the destination boundary.

Guardrails: Transition must have exactly one ControlLink input/output; no Other link; destination must have one linear incoming link. Loops, forks, joins and ambiguous graph cases remain fixed.
