# Graph actions consolidation

## Delivered change

The runtime no longer loads separate Phase and Operation graph modules.

Removed runtime files:

```text
graph/phase-graph.js
graph/operation-graph.js
```

Added runtime file:

```text
graph/graph-actions.js
```

`graph-actions.js` contains two clearly marked scope sections in the same runtime file, preserving their existing load order and all browser-global handlers. `index.html` loads `graph-actions.js` exactly once.

## Why this is intentionally structural

No action behaviour was changed in this release. The purpose is to stop the runtime selecting a graph implementation by separate file path. Future work extracts the duplicated scope algorithms inside this one module into shared functions, driven by `RecipeGraphScope` adapters.

## Runtime module list

```text
js/core/runtime.js
js/recipe/recipe-editor.js
js/graph/graph-actions.js
js/ui/editor-ui.js
css/editor-runtime.css
```

## Mechanical verification

Every JavaScript file was syntax-checked with `node --check`; the output archive was integrity checked.
