# AVEVA Offline Recipe Editor — consolidated review package

This package contains only the browser runtime for the active SC configuration. Open `index.html` locally in a modern browser.

## Runtime layout

- `index.html` — application shell and only load manifest.
- `config/` — selected SC model and materials data.
- `css/` — core, viewer, edit, responsive, zoom and print styles. Structural drag visibility is owned by `css/viewer.css`.
- `js/` — application code. Movement interaction is consolidated in `js/global-movement.js`; transition drop rendering is in `js/editor.js`; branch/join drop rendering is in `js/nested-branch-render.js`.

The controlled requirements document is `../specification/aveva-recipe-editor-functional-design-review-v0-4.docx`. Test fixtures, native evidence, historical notes, alternate site data and saved recipe archives are deliberately excluded from this runtime package.

## Status

This is a structural consolidation review package, not a release acceptance claim. The functional-design review identifies which movement behaviours remain unaccepted.
