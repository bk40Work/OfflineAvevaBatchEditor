# Legacy removal manifest

## Removal rule used

This pass removes only an earlier named global `function` declaration where the **same file contains a later declaration with the same name**. The final declaration is retained because it is the declaration that wins in the browser's global-script environment.

No uniquely named function, inline handler, XML action, CSS selector, or external-facing browser global was removed. Those require behaviour-level review before deletion.

## Removed shadowed declarations

| Consolidated file | Former line | Removed symbol | Retained implementation |
|---|---:|---|---|
| `app/js/ui/editor-ui.js` | 1396 | `addPhaseToEndOfBranch` | Final declaration of `addPhaseToEndOfBranch` in the same file |
| `app/js/ui/editor-ui.js` | 1348 | `addBranchToOp` | Final declaration of `addBranchToOp` in the same file |
| `app/js/graph/phase-graph.js` | 4985 | `graphDeleteSelectedNode` | Final declaration of `graphDeleteSelectedNode` in the same file |
| `app/js/graph/phase-graph.js` | 4505 | `graphDeleteSelectedNode` | Final declaration of `graphDeleteSelectedNode` in the same file |
| `app/js/graph/phase-graph.js` | 4276 | `graphDeleteCommit` | Final declaration of `graphDeleteCommit` in the same file |

## Result

- Removed shadowed declarations: **5**
- Remaining JavaScript modules: **5**
- Remaining stylesheet modules: **1**

This is the first destructive legacy pass. It eliminates only code that was already unreachable by name resolution. The remaining legacy work is not automatically safe: much of it has unique names but may still be reachable from inline handlers or older UI paths.
