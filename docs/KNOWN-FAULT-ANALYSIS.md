# Existing Move2b fault analysis

## Observed result

The supplied screenshot is from the frozen `release-candidate` path. After the Move2b action it displays:

- `Branch entry #94`; and
- `Empty branch lane #68`.

Both are incorrect. In the native Move2b target, #68 remains the join-continuation DUMMY which feeds the subsequent fork; it is not an empty branch lane. No synthetic Branch entry is permitted.

## Code-path cause in the frozen runtime

The rejected V12 dispatcher in the former `js/global-movement.js` executed its work in this order:

1. `detach()` converted the dragged business RecipeElement into `Other/DUMMY` using `otherify()` and removed its Step.
2. `paste()` then invoked `cloneBusinessRE()` using that same source RecipeElement.
3. The clone therefore inherited the newly converted DUMMY payload, rather than the original business Phase payload.

That ordering explains the synthetic DUMMY/Branch-entry artefact seen in the screenshot. The generic dispatcher then rewired the fork without the source-lane/join ownership required by the Move2b evidence, leaving continuation DUMMY #68 in a topology the renderer interpreted as an empty lane.

## Controlled correction

The Move2b service clones the business Phase **before** removing the source RecipeElement. It shortens the source lane by replacing the source Step with its predecessor in the existing convergence group, then reconstructs the fixed Transition's normal route and grouped fork. It snapshots and verifies every `Other` link before committing.

The old dispatcher is preserved only under the developer workbench's `developer-retired-movement/` folder. It is not loaded by the candidate.
