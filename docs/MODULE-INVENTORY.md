# Module inventory

The runtime now loads five JavaScript modules and one stylesheet. No legacy JavaScript or CSS file is loaded by `index.html`.

```text
core/runtime.js
recipe/recipe-editor.js
graph/phase-graph.js
graph/operation-graph.js
ui/editor-ui.js
css/editor-runtime.css
```

Each former file is marked in its owning module with `Former file:` boundaries. This is deliberate: reviewers can identify and remove stale paths without having to search across a historical file tree.
