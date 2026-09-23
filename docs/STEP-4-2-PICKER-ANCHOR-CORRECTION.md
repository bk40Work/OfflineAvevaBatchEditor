# Step 4.2 — Picker anchor correction

## Defect corrected
The Phase/Transfer picker was positioned from `window.event.target`. Dropdown handling makes that browser-global event unreliable, so both first-item insertion in an empty Operation and insertion after an existing graph node could fall back to the viewport top-left.

## Change
- `showPhasePicker()` has one additional optional input: the explicit clicked anchor element.
- The empty-Operation `⋮` menu passes its selected option (`this`) as the anchor.
- The existing-Phase action menu passes its selected option (`this`) as the anchor.
- Existing viewer empty-Operation buttons do the same.
- The picker retains a legacy `window.event` fallback for callers not touched in this correction.

## Intentionally unchanged
- One picker component and one option-building implementation continue to serve both routes.
- First-item XML insertion remains the native `Begin → Phase/Transfer → End` transaction.
- Existing-node insertion remains the native graph-node transaction.
- Phase movement, graph scope, shared commit code and all Operation behaviour are unchanged from Step 4.1.

## Regression checks
1. In an empty Operation, open `⋮ → Insert Process Phase`; confirm picker opens beside the selected menu option, not at page top-left.
2. In an existing Phase node menu, select `Insert Process Phase after this node`; confirm the same picker opens beside the selected option.
3. Confirm both present the same filtered Phase choices for the same Process Instance.
4. Add a first Phase, then export/reload and confirm native `Begin → Phase → End` persistence.
5. Add after an existing Phase, then export/reload and confirm the native graph route is retained.
