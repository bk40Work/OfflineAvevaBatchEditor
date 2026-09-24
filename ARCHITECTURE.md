# Architecture

## Principles

1. **The B2MML DOM is the only source of truth.** No second copy of the recipe exists. Views are rendered from the DOM every time.
2. **One route model for all three lanes.** `sfc.js` parses any ProcedureLogic into a tree and writes a tree back. It is the *only* code that creates or changes `Link`, `Step` or `Transition` elements.
3. **Edits are list operations on the tree** (`edit-ops.js`). There is no special code for any scenario (Move2b and so on): the structural rules in `sfc.build()` make every edit AVEVA-correct.
4. **Every change is a verified transaction** (`RecipeDoc.edit` + `RecipeDoc.commit`):
   - snapshot the XML (undo);
   - mutate the tree, write it, re-parse the route and require it to equal the edited tree;
   - on any error, restore the snapshot. Nothing half-done can survive.

## Data flow

```
XML file ──parse──▶ RecipeDoc (DOM)
                        │  sfc.parse(owner)
                        ▼
                    route tree ──render──▶ lanes (HTML)
                        │ user action (actions.js → edit-ops.js)
                        ▼
                  edited tree ──sfc.write──▶ DOM ──verify──▶ re-render
```

## Modules

| File | Owns | Must not |
|---|---|---|
| `core/xml.js` | namespaces, element helpers, AVEVA-style serialisation | know about routes |
| `core/sfc.js` | ProcedureLogic ⇄ tree, DUMMY rules R1–R7, link-ID reuse, RecipeElement ordering | touch the UI |
| `core/recipe-doc.js` | load/save, ID allocation, transactions and undo, factories (phase, operation, unit procedure, transition), formula/header/equipment/BOM accessors | edit routes except through `commit(tree)` |
| `core/edit-ops.js` | insert, move, remove, lanes and loops on a tree | touch XML |
| `core/actions.js` | one undoable transaction per user action | contain XML surgery |
| `ui/lane-render.js` | tree → HTML | change anything |
| `ui/panels.js` | forms → HTML | change anything |
| `ui/app.js` | state, events, drag and drop, menus, dialogs | edit XML directly (it calls actions or `RecipeDoc` setters inside `doc.edit`) |

## Identity

- Tree item `uid`s last for one render only.
- Stable keys survive re-parsing: `S:<RecipeElementID>`, `T:<TransitionID>`, `L:<closing TransitionID>` (loop) and `P:<divergent LinkID>` (branch). Selection and pending moves use these keys.
- IDs of retained elements are preserved. New elements get `max(ID) + 1`. Links whose endpoints are unchanged keep their Link ID.

## Unstructured routes

If a route cannot be parsed as a structured chart (for example, damage from an older tool), that lane shows the reason and is read-only. The route is saved exactly as loaded.
