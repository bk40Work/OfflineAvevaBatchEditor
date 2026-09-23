# Clean runtime architecture

## Delivered module ownership

| Runtime module | Owns | Historical files absorbed |
|---|---|---|
| `js/core/runtime.js` | application state, XML parsing, XML authority, graph scope contract | app, parser, XML authority, graph scope |
| `js/recipe/recipe-editor.js` | equipment, materials, export and printing | equipment instances, materials, exporter, print |
| `js/graph/phase-graph.js` | existing Phase graph actions, branch/loop/join display and Phase movement | movement, all former Phase branch modules, graph delete, universal actions |
| `js/graph/operation-graph.js` | Operation XML actions and movement | operation movement service |
| `js/ui/editor-ui.js` | viewer, menus, picker, zoom, lane rendering | viewer, editor, picker, process-class picker, lane zoom, lane |
| `css/editor-runtime.css` | all application styling | all former CSS files |

## Deleted from this delivery

The old `app/js/*.js` feature files and `app/css/*.css` feature files no longer exist in this package. There is one load path and one owner module for each area above.

## Explicit limitation

This is a **structural consolidation**. It preserves the original source-section order inside each responsibility module; it does not claim that historical duplicate functions have been semantically reconciled. Those duplicates are now visible together in one reviewable file rather than being hidden across competing files.

## Next review order

1. Review `js/graph/phase-graph.js` against the locked Phase baseline.
2. Replace the independent Operation branch/action paths in `js/graph/operation-graph.js` with the shared graph contract in `js/core/runtime.js`.
3. Remove duplicate functions only after a reviewer selects the authoritative implementation.
