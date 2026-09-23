/**
 * Consolidated runtime module: graph / operation-graph.js
 *
 * Purpose: This module owns the related runtime concerns listed below.
 * Legacy source sections are retained in their original execution order so this
 * consolidation does not introduce a second implementation path.
 *
 * IMPORTANT: The old per-feature files have been removed from this delivery.
 * Future edits must be made here, in this owning module, not by restoring a
 * historical feature file.
 */

/* ==========================================================================
 * Former file: js/operation-movement-service.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

/* operation-movement-service.js — XML-authoritative linear Operation relocation.
 * This is deliberately separate from Phase movement only at the scope locator:
 * it edits the selected UnitProcedure's native ProcedureLogic and child Operation
 * RecipeElements, clones/reparses before commit, and never swaps the display array.
 */
(function () {
  "use strict";
  function local(n) {
    return (n && (n.localName || n.nodeName)) || "";
  }
  function kids(n, name) {
    return Array.prototype.filter.call(n.children || [], function (x) {
      return local(x) === name;
    });
  }
  function one(n, name) {
    return kids(n, name)[0] || null;
  }
  function text(n, name) {
    var x = one(n, name);
    return x ? (x.textContent || "").trim() : "";
  }
  function setText(n, name, value) {
    var x = one(n, name);
    if (!x) {
      x = n.ownerDocument.createElementNS(n.namespaceURI, name);
      n.appendChild(x);
    }
    x.textContent = String(value);
  }
  function directOps(up) {
    return kids(up, "RecipeElement").filter(function (re) {
      return text(re, "RecipeElementType") === "Operation";
    });
  }
  function directEnd(up) {
    return (
      kids(up, "RecipeElement").filter(function (re) {
        return text(re, "RecipeElementType") === "End";
      })[0] || null
    );
  }
  function endpoint(link, side) {
    var tag = side === "from" ? "FromID" : "ToID",
      vt = side === "from" ? "FromIDValue" : "ToIDValue",
      tt = side === "from" ? "FromType" : "ToType";
    return kids(link, tag).map(function (x) {
      return { type: text(x, tt), id: text(x, vt) };
    });
  }
  function replaceEndpoints(link, side, values) {
    var tag = side === "from" ? "FromID" : "ToID",
      vt = side === "from" ? "FromIDValue" : "ToIDValue",
      tt = side === "from" ? "FromType" : "ToType",
      old = kids(link, tag),
      ref = old.length ? old[old.length - 1].nextSibling : null,
      doc = link.ownerDocument;
    old.forEach(function (x) {
      link.removeChild(x);
    });
    values.forEach(function (v) {
      var x = doc.createElementNS(link.namespaceURI, tag);
      setText(x, vt, v.id);
      setText(x, tt, v.type);
      setText(x, "IDScope", "Internal");
      link.insertBefore(x, ref);
    });
  }
  function same(a, b) {
    return a.type === b.type && String(a.id) === String(b.id);
  }
  function links(pl) {
    return kids(pl, "Link");
  }
  function steps(pl) {
    return kids(pl, "Step");
  }
  function stepForRE(pl, reId) {
    return (
      steps(pl).filter(function (s) {
        return text(s, "RecipeElementID") === String(reId);
      })[0] || null
    );
  }
  function isControl(link) {
    return text(link, "LinkType") === "ControlLink";
  }
  function upFor(recipe, u) {
    var wanted = recipe.unit_procedures[u] && recipe.unit_procedures[u]._reId;
    if (!wanted) return null;
    return (
      Array.prototype.filter.call(
        recipe._xmlDoc.getElementsByTagName("*"),
        function (x) {
          return (
            local(x) === "RecipeElement" &&
            text(x, "RecipeElementType") === "UnitProcedure" &&
            text(x, "ID") === String(wanted)
          );
        },
      )[0] || null
    );
  }
  function cloneDoc(recipe) {
    /* Step 3: Operation transactions use the same authoritative clone primitive as Phase transactions. */ if (
      window.RecipeGraphScope &&
      window.RecipeGraphScope.xml
    )
      return window.RecipeGraphScope.xml.cloneAuthoritative(recipe);
    var xml = new XMLSerializer().serializeToString(recipe._xmlDoc),
      doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror")[0])
      throw Error("The current XML cannot be cloned.");
    return doc;
  }
  function validate(pl) {
    /* Step 3: Operation transactions share the Phase endpoint validator. */ if (
      window.RecipeGraphScope &&
      window.RecipeGraphScope.xml
    )
      return window.RecipeGraphScope.xml.validateStepEndpoints(pl);
    var ids = {};
    steps(pl).forEach(function (s) {
      ids[text(s, "ID")] = true;
    });
    var bad = [];
    links(pl).forEach(function (l) {
      ["from", "to"].forEach(function (side) {
        endpoint(l, side).forEach(function (e) {
          if (e.type === "Step" && !ids[e.id])
            bad.push("#" + text(l, "ID") + " → missing Step #" + e.id);
        });
      });
    });
    return bad;
  }

  function nextId(doc) {
    var n = 0;
    Array.prototype.forEach.call(doc.getElementsByTagName("*"), function (x) {
      if (local(x) === "ID" && /^\d+$/.test((x.textContent || "").trim()))
        n = Math.max(n, Number(x.textContent));
    });
    return function () {
      n += 1;
      return String(n);
    };
  }
  function appendLink(pl, from, to, next) {
    var l = pl.ownerDocument.createElementNS(pl.namespaceURI, "Link");
    setText(l, "ID", next());
    replaceEndpoints(l, "from", [from]);
    replaceEndpoints(l, "to", [to]);
    setText(l, "LinkType", "ControlLink");
    setText(l, "Depiction", "Line");
    pl.appendChild(l);
    return l;
  }
  function appendStep(pl, reId, next) {
    var st = pl.ownerDocument.createElementNS(pl.namespaceURI, "Step");
    setText(st, "ID", next());
    setText(st, "RecipeElementID", reId);
    setText(st, "RecipeElementVersion", "0");
    pl.appendChild(st);
    return st;
  }
  function makeOperation(up, pl, next, name) {
    var d = up.ownerDocument,
      ns = up.namespaceURI,
      op = d.createElementNS(ns, "RecipeElement"),
      opId = next(),
      beginId = next(),
      endId = next(),
      beginStep = next(),
      endStep = next();
    setText(op, "ID", opId);
    setText(op, "RecipeElementType", "Operation");
    var childPL = d.createElementNS(ns, "ProcedureLogic");
    appendStep(childPL, beginId, function () {
      return beginStep;
    });
    appendStep(childPL, endId, function () {
      return endStep;
    });
    appendLink(
      childPL,
      { type: "Step", id: beginStep },
      { type: "Step", id: endStep },
      next,
    );
    op.appendChild(childPL);
    var begin = d.createElementNS(ns, "RecipeElement");
    setText(begin, "ID", beginId);
    setText(begin, "RecipeElementType", "Begin");
    op.appendChild(begin);
    var end = d.createElementNS(ns, "RecipeElement");
    setText(end, "ID", endId);
    setText(end, "RecipeElementType", "End");
    op.appendChild(end);
    var info = d.createElementNS(
        "http://www.wbf.org/xml/B2MML-V0401-AllExtensions",
        "OperationInformation",
      ),
      nm = d.createElementNS(
        "http://www.wbf.org/xml/B2MML-V0401-AllExtensions",
        "Name",
      );
    nm.textContent = name || "New Operation";
    info.appendChild(nm);
    op.appendChild(info);
    var parentStep = appendStep(pl, opId, next);
    return {
      element: op,
      id: opId,
      step: { type: "Step", id: text(parentStep, "ID") },
    };
  }
  function commit(doc) {
    try {
      var fresh;
      if (window.RecipeGraphScope && window.RecipeGraphScope.xml)
        fresh = window.RecipeGraphScope.xml.commit(currentRecipeData, doc);
      else {
        var xml = new XMLSerializer().serializeToString(doc);
        fresh = parseB2MML(xml);
        if (!fresh)
          return {
            ok: false,
            reason: "The proposed Operation change could not be reparsed.",
          };
        xmlAuthorityAttach(fresh, doc, xml);
        xmlAuthorityReplaceCurrent(fresh);
      }
      currentRecipeData._structuralEdit = true;
      renderAll();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason:
          (error && error.message) ||
          "The proposed Operation change could not be reparsed.",
      };
    }
  }
  function add(request) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var trial = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: trial }),
        up = upFor(shadow, request.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic");
      if (!pl)
        return {
          ok: false,
          reason: "The selected Unit Procedure has no native ProcedureLogic.",
        };
      var anchorRE =
          request.anchorOperationId === "__end__"
            ? directEnd(up)
            : directOps(up).filter(function (x) {
                return text(x, "ID") === String(request.anchorOperationId);
              })[0],
        anchorStep = anchorRE && stepForRE(pl, text(anchorRE, "ID"));
      if (!anchorRE || !anchorStep)
        return {
          ok: false,
          reason: "The selected Operation boundary is no longer present.",
        };
      var anchor = { type: "Step", id: text(anchorStep, "ID") },
        incoming = links(pl).filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "to").length === 1 &&
            same(endpoint(l, "to")[0], anchor)
          );
        });
      if (incoming.length !== 1)
        return {
          ok: false,
          reason:
            "Add Operation is available only on one linear incoming route.",
        };
      var next = nextId(trial),
        created = makeOperation(up, pl, next, request.name),
        oldFrom = endpoint(incoming[0], "from")[0];
      replaceEndpoints(incoming[0], "to", [created.step]);
      appendLink(pl, created.step, anchor, next);
      up.insertBefore(created.element, anchorRE);
      var issues = validate(pl);
      if (issues.length)
        return {
          ok: false,
          reason: "Add validation failed: " + issues.join(", "),
        };
      return commit(trial);
    } catch (e) {
      return { ok: false, reason: (e && e.message) || "Add Operation failed." };
    }
  }
  function remove(request) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var trial = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: trial }),
        up = upFor(shadow, request.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        id = String(request.operationId),
        step = pl && stepForRE(pl, id),
        target = directOps(up).filter(function (x) {
          return text(x, "ID") === id;
        })[0];
      if (!pl || !step || !target)
        return {
          ok: false,
          reason: "The selected Operation is no longer present.",
        };
      var ep = { type: "Step", id: text(step, "ID") },
        incoming = links(pl).filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "to").length === 1 &&
            same(endpoint(l, "to")[0], ep)
          );
        }),
        outgoing = links(pl).filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "from").length === 1 &&
            same(endpoint(l, "from")[0], ep)
          );
        });
      if (incoming.length !== 1 || outgoing.length !== 1)
        return {
          ok: false,
          reason:
            "Delete Operation is available only on one linear incoming and outgoing route.",
        };
      var successor = endpoint(outgoing[0], "to")[0];
      replaceEndpoints(incoming[0], "to", [successor]);
      outgoing[0].parentNode.removeChild(outgoing[0]);
      step.parentNode.removeChild(step);
      target.parentNode.removeChild(target);
      var issues = validate(pl);
      if (issues.length)
        return {
          ok: false,
          reason: "Delete validation failed: " + issues.join(", "),
        };
      return commit(trial);
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || "Delete Operation failed.",
      };
    }
  }
  window.requestOperationAdd = function (r) {
    var out = add(r);
    if (!out.ok) alert("Add not applied: " + out.reason);
    return out;
  };
  window.requestOperationDelete = function (r) {
    var out = remove(r);
    if (!out.ok) alert("Delete not applied: " + out.reason);
    return out;
  };
  function rename(request) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var value = String(request.name || "").trim();
      if (!value)
        return { ok: false, reason: "Operation Name cannot be empty." };
      var trial = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: trial }),
        up = upFor(shadow, request.unitProcedureIndex),
        op =
          up &&
          directOps(up).filter(function (x) {
            return text(x, "ID") === String(request.operationId);
          })[0];
      if (!op)
        return {
          ok: false,
          reason: "The selected Operation is no longer present.",
        };
      var info = Array.prototype.filter.call(op.children || [], function (x) {
        return local(x) === "OperationInformation";
      })[0];
      if (!info) {
        info = trial.createElementNS(
          "http://www.wbf.org/xml/B2MML-V0401-AllExtensions",
          "OperationInformation",
        );
        op.appendChild(info);
      }
      var nameNode = Array.prototype.filter.call(
        info.children || [],
        function (x) {
          return local(x) === "Name";
        },
      )[0];
      if (!nameNode) {
        nameNode = trial.createElementNS(
          "http://www.wbf.org/xml/B2MML-V0401-AllExtensions",
          "Name",
        );
        info.appendChild(nameNode);
      }
      nameNode.textContent = value;
      return commit(trial);
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || "Operation Name update failed.",
      };
    }
  }
  window.requestOperationRename = function (r) {
    var out = rename(r);
    if (!out.ok) alert("Name not applied: " + out.reason);
    return out;
  };
  function opTransition(r) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var doc = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        up = upFor(shadow, r.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        st = pl && stepForRE(pl, String(r.operationId));
      if (!pl || !st) return { ok: false, reason: "Operation missing." };
      var src = { type: "Step", id: text(st, "ID") },
        out = links(pl).filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "from").length === 1 &&
            same(endpoint(l, "from")[0], src)
          );
        });
      if (out.length !== 1)
        return {
          ok: false,
          reason: "Operation needs one linear outgoing route.",
        };
      var n = nextId(doc),
        tid = n(),
        tr = doc.createElementNS(pl.namespaceURI, "Transition");
      setText(tr, "ID", tid);
      setText(tr, "Condition", 'Ask( "Condition?" )');
      pl.appendChild(tr);
      replaceEndpoints(out[0], "from", [{ type: "Transition", id: tid }]);
      appendLink(pl, src, { type: "Transition", id: tid }, n);
      var bad = validate(pl);
      if (bad.length) return { ok: false, reason: bad.join(", ") };
      return commit(doc);
    } catch (e) {
      return { ok: false, reason: e.message || "Transition failed." };
    }
  }
  window.requestOperationTransition = function (r) {
    var x = opTransition(r);
    if (!x.ok) alert("Transition not applied: " + x.reason);
    return x;
  };
  /* Operation graph action: replace its one normal exit with a Transition and add
   AVEVA's native Other return link to the selected Operation Step. */
  function opLoop(r) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var doc = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        up = upFor(shadow, r.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        st = pl && stepForRE(pl, String(r.operationId));
      if (!pl || !st) return { ok: false, reason: "Operation missing." };
      var src = { type: "Step", id: text(st, "ID") },
        out = links(pl).filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "from").length === 1 &&
            same(endpoint(l, "from")[0], src)
          );
        });
      if (out.length !== 1)
        return {
          ok: false,
          reason: "Loop creation requires one normal outgoing route.",
        };
      var n = nextId(doc),
        tid = n(),
        tr = doc.createElementNS(pl.namespaceURI, "Transition"),
        ret = doc.createElementNS(pl.namespaceURI, "Link");
      setText(tr, "ID", tid);
      setText(tr, "Condition", 'Ask( "Repeat?" )');
      pl.appendChild(tr);
      replaceEndpoints(out[0], "from", [{ type: "Transition", id: tid }]);
      appendLink(pl, src, { type: "Transition", id: tid }, n);
      setText(ret, "ID", n());
      replaceEndpoints(ret, "from", [{ type: "Transition", id: tid }]);
      replaceEndpoints(ret, "to", [src]);
      setText(ret, "LinkType", "Other");
      setText(ret, "Depiction", "Line");
      pl.appendChild(ret);
      var bad = validate(pl);
      if (bad.length) return { ok: false, reason: bad.join(", ") };
      return commit(doc);
    } catch (e) {
      return { ok: false, reason: (e && e.message) || "Loop creation failed." };
    }
  }
  window.requestOperationLoop = function (r) {
    var x = opLoop(r);
    if (!x.ok) alert("Loop not applied: " + x.reason);
    return x;
  };
  /* Scope-aware graph insertion: Transition -> new Operation Step -> original normal successor. */
  function insertAfterTransition(r) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var name = String(r.name || "").trim();
      if (!name)
        return { ok: false, reason: "Operation name cannot be empty." };
      var doc = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        up = upFor(shadow, r.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        tid = String(r.transitionId);
      if (!pl)
        return {
          ok: false,
          reason: "The selected Unit Procedure has no native ProcedureLogic.",
        };
      var outgoing = links(pl).filter(function (l) {
        return (
          isControl(l) &&
          endpoint(l, "from").length === 1 &&
          same(endpoint(l, "from")[0], { type: "Transition", id: tid }) &&
          endpoint(l, "to").length === 1
        );
      });
      if (outgoing.length !== 1)
        return {
          ok: false,
          reason:
            "The selected Transition needs exactly one normal outgoing route.",
        };
      var dest = endpoint(outgoing[0], "to")[0];
      if (!dest)
        return {
          ok: false,
          reason: "The selected Transition has no destination.",
        };
      var anchorRE =
        dest.type === "Step" &&
        steps(pl).filter(function (st) {
          return text(st, "ID") === String(dest.id);
        })[0];
      anchorRE = anchorRE && text(anchorRE, "RecipeElementID");
      var anchorElement =
        anchorRE &&
        Array.prototype.filter.call(up.children || [], function (x) {
          return (
            local(x) === "RecipeElement" && text(x, "ID") === String(anchorRE)
          );
        })[0];
      if (!anchorElement)
        return {
          ok: false,
          reason:
            "The Transition destination is not a native Operation boundary.",
        };
      var n = nextId(doc),
        created = makeOperation(up, pl, n, name);
      replaceEndpoints(outgoing[0], "to", [created.step]);
      appendLink(pl, created.step, dest, n);
      up.insertBefore(created.element, anchorElement);
      var bad = validate(pl);
      if (bad.length)
        return {
          ok: false,
          reason: "Insert validation failed: " + bad.join(", "),
        };
      return commit(doc);
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || "Insert Operation after Transition failed.",
      };
    }
  }
  window.requestOperationInsertAfterTransition = function (r) {
    var x = insertAfterTransition(r);
    if (!x.ok) alert("Operation not inserted: " + x.reason);
    return x;
  };
  function transitionAfterTransition(r) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var doc = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        up = upFor(shadow, r.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        tid = String(r.transitionId);
      if (!pl) return { ok: false, reason: "Unit Procedure missing." };
      var outgoing = links(pl).filter(function (l) {
        return (
          isControl(l) &&
          endpoint(l, "from").length === 1 &&
          same(endpoint(l, "from")[0], { type: "Transition", id: tid }) &&
          endpoint(l, "to").length === 1
        );
      });
      if (outgoing.length !== 1)
        return {
          ok: false,
          reason: "Transition requires one normal outgoing route.",
        };
      var n = nextId(doc),
        newTid = n(),
        tr = doc.createElementNS(pl.namespaceURI, "Transition");
      setText(tr, "ID", newTid);
      setText(tr, "Condition", 'Ask( "Condition?" )');
      pl.appendChild(tr);
      replaceEndpoints(outgoing[0], "from", [
        { type: "Transition", id: newTid },
      ]);
      appendLink(
        pl,
        { type: "Transition", id: tid },
        { type: "Transition", id: newTid },
        n,
      );
      var bad = validate(pl);
      if (bad.length) return { ok: false, reason: bad.join(", ") };
      return commit(doc);
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || "Transition insert failed.",
      };
    }
  }
  window.requestOperationTransitionAfterTransition = function (r) {
    var x = transitionAfterTransition(r);
    if (!x.ok) alert("Transition not inserted: " + x.reason);
    return x;
  };
  function transitionCondition(r) {
    var recipe = currentRecipeData,
      value = String(r.condition || "").trim();
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    if (!value) return { ok: false, reason: "Condition cannot be empty." };
    try {
      var doc = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        up = upFor(shadow, r.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        tid = String(r.transitionId),
        tr =
          pl &&
          kids(pl, "Transition").filter(function (x) {
            return text(x, "ID") === tid;
          })[0];
      if (!tr) return { ok: false, reason: "Transition missing." };
      setText(tr, "Condition", value);
      return commit(doc);
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || "Condition update failed.",
      };
    }
  }
  window.requestOperationTransitionCondition = function (r) {
    var x = transitionCondition(r);
    if (!x.ok) alert("Condition not saved: " + x.reason);
    return x;
  };
  function operationLoop(r) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var doc = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        up = upFor(shadow, r.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        tid = String(r.transitionId),
        targetId = String(r.targetOperationId);
      if (!pl) return { ok: false, reason: "Unit Procedure missing." };
      var target = stepForRE(pl, targetId);
      if (!target)
        return { ok: false, reason: "Selected loop target missing." };
      var duplicate = links(pl).some(function (l) {
        return (
          text(l, "LinkType") === "Other" &&
          endpoint(l, "from").some(function (e) {
            return same(e, { type: "Transition", id: tid });
          })
        );
      });
      if (duplicate)
        return { ok: false, reason: "Transition already has a loop return." };
      var n = nextId(doc),
        ret = doc.createElementNS(pl.namespaceURI, "Link");
      setText(ret, "ID", n());
      replaceEndpoints(ret, "from", [{ type: "Transition", id: tid }]);
      replaceEndpoints(ret, "to", [{ type: "Step", id: text(target, "ID") }]);
      setText(ret, "LinkType", "Other");
      setText(ret, "Depiction", "Line");
      pl.appendChild(ret);
      var bad = validate(pl);
      if (bad.length) return { ok: false, reason: bad.join(", ") };
      return commit(doc);
    } catch (e) {
      return { ok: false, reason: (e && e.message) || "Loop creation failed." };
    }
  }
  window.requestOperationLoopAfterTransition = function (r) {
    var x = operationLoop(r);
    if (!x.ok) alert("Loop not created: " + x.reason);
    return x;
  };
  function makeDummy(up, next) {
    var d = up.ownerDocument,
      re = d.createElementNS(up.namespaceURI, "RecipeElement"),
      id = next();
    setText(re, "ID", id);
    var typ = d.createElementNS(up.namespaceURI, "RecipeElementType");
    typ.setAttribute("OtherValue", "DUMMY");
    typ.textContent = "Other";
    re.appendChild(typ);
    return { element: re, id: id };
  }
  function appendTypedLink(pl, from, to, type, next) {
    var l = pl.ownerDocument.createElementNS(pl.namespaceURI, "Link");
    setText(l, "ID", next());
    replaceEndpoints(l, "from", from);
    replaceEndpoints(l, "to", to);
    setText(l, "LinkType", type);
    setText(l, "Depiction", "Line");
    pl.appendChild(l);
    return l;
  }
  function branchAfterTransition(r) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var count = Math.max(2, Number(r.laneCount) || 2),
        mode = r.mode === "Single" ? "Single" : "All",
        doc = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        up = upFor(shadow, r.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        tid = String(r.transitionId);
      if (!pl) return { ok: false, reason: "Unit Procedure missing." };
      var outgoing = links(pl).filter(function (l) {
        return (
          isControl(l) &&
          endpoint(l, "from").length === 1 &&
          same(endpoint(l, "from")[0], { type: "Transition", id: tid }) &&
          endpoint(l, "to").length === 1
        );
      });
      if (outgoing.length !== 1)
        return {
          ok: false,
          reason: "Transition requires one normal outgoing route.",
        };
      var dest = endpoint(outgoing[0], "to")[0],
        n = nextId(doc),
        lanes = [];
      for (var i = 0; i < count; i++) {
        var x = makeDummy(up, n),
          st = appendStep(pl, x.id, n);
        up.appendChild(x.element);
        lanes.push({ dummy: x, step: { type: "Step", id: text(st, "ID") } });
      }
      outgoing[0].parentNode.removeChild(outgoing[0]);
      appendTypedLink(
        pl,
        [{ type: "Transition", id: tid }],
        lanes.map(function (x) {
          return x.step;
        }),
        mode === "All" ? "ParallelDivergent" : "SerialDivergent",
        n,
      );
      appendTypedLink(
        pl,
        lanes.map(function (x) {
          return x.step;
        }),
        [dest],
        mode === "All" ? "ParallelConvergent" : "SerialConvergent",
        n,
      );
      var bad = validate(pl);
      if (bad.length) return { ok: false, reason: bad.join(", ") };
      return commit(doc);
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || "Branch creation failed.",
      };
    }
  }
  window.requestOperationBranchAfterTransition = function (r) {
    var x = branchAfterTransition(r);
    if (!x.ok) alert("Branch not created: " + x.reason);
    return x;
  };
  function insertOperationInLane(r) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var name = String(r.name || "").trim();
      if (!name) return { ok: false, reason: "Operation name required." };
      var doc = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        up = upFor(shadow, r.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        dummyId = String(r.dummyId);
      if (!pl) return { ok: false, reason: "Unit Procedure missing." };
      var dummyStep = stepForRE(pl, dummyId),
        src = { type: "Step", id: text(dummyStep, "ID") },
        join = links(pl).filter(function (l) {
          return (
            (text(l, "LinkType") === "ParallelConvergent" ||
              text(l, "LinkType") === "SerialConvergent") &&
            endpoint(l, "from").some(function (e) {
              return same(e, src);
            }) &&
            endpoint(l, "to").length === 1
          );
        });
      if (join.length !== 1)
        return { ok: false, reason: "Branch lane join missing." };
      var dest = endpoint(join[0], "to")[0],
        n = nextId(doc),
        created = makeOperation(up, pl, n, name);
      replaceEndpoints(
        join[0],
        "from",
        endpoint(join[0], "from").map(function (e) {
          return same(e, src) ? created.step : e;
        }),
      );
      appendLink(pl, src, created.step, n);
      var dummy = Array.prototype.filter.call(up.children || [], function (x) {
        return local(x) === "RecipeElement" && text(x, "ID") === dummyId;
      })[0];
      up.insertBefore(created.element, dummy || null);
      var bad = validate(pl);
      if (bad.length) return { ok: false, reason: bad.join(", ") };
      return commit(doc);
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || "Lane insertion failed.",
      };
    }
  }
  window.requestOperationLaneInsert = function (r) {
    var x = insertOperationInLane(r);
    if (!x.ok) alert("Operation not inserted: " + x.reason);
    return x;
  };
  function move(request) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    if (request.unitProcedureIndex !== Number(request.unitProcedureIndex))
      return { ok: false, reason: "Invalid Unit Procedure." };
    if (request.sourceOperationId === request.anchorOperationId)
      return { ok: false, reason: "Choose a different Operation." };
    try {
      var trial = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: trial }),
        up = upFor(shadow, request.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic");
      if (!pl)
        return {
          ok: false,
          reason: "The selected Unit Procedure has no native ProcedureLogic.",
        };
      var sourceOperationId = String(request.sourceOperationId),
        anchorOperationId = String(request.anchorOperationId),
        anchorRE =
          anchorOperationId === "__end__"
            ? directEnd(up)
            : directOps(up).filter(function (x) {
                return text(x, "ID") === anchorOperationId;
              })[0],
        anchorReId = anchorRE && text(anchorRE, "ID"),
        srcStep = stepForRE(pl, sourceOperationId),
        anchorStep = stepForRE(pl, anchorReId);
      if (!srcStep || !anchorStep)
        return {
          ok: false,
          reason: "The source or destination Operation is no longer present.",
        };
      var src = { type: "Step", id: text(srcStep, "ID") },
        anchor = { type: "Step", id: text(anchorStep, "ID") },
        all = links(pl),
        incoming = all.filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "to").length === 1 &&
            same(endpoint(l, "to")[0], src)
          );
        }),
        outgoing = all.filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "from").length === 1 &&
            same(endpoint(l, "from")[0], src)
          );
        }),
        destination = all.filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "to").length === 1 &&
            same(endpoint(l, "to")[0], anchor)
          );
        });
      if (
        incoming.length !== 1 ||
        outgoing.length !== 1 ||
        destination.length !== 1
      )
        return {
          ok: false,
          reason:
            "Only Operations with one linear incoming and outgoing route are enabled in this foundation.",
        };
      if (destination[0] === incoming[0] || destination[0] === outgoing[0])
        return {
          ok: false,
          reason: "The Operation is already at this boundary.",
        };
      var predecessor = endpoint(incoming[0], "from")[0],
        successor = endpoint(outgoing[0], "to")[0];
      if (!predecessor || !successor)
        return { ok: false, reason: "The Operation route is incomplete." };
      replaceEndpoints(incoming[0], "to", [successor]);
      replaceEndpoints(destination[0], "to", [src]);
      replaceEndpoints(outgoing[0], "to", [anchor]);
      var sourceRE = directOps(up).filter(function (x) {
        return text(x, "ID") === sourceOperationId;
      })[0];
      if (!sourceRE || !anchorRE)
        return {
          ok: false,
          reason: "The Operation XML element could not be located.",
        };
      up.insertBefore(sourceRE, anchorRE);
      var issues = validate(pl);
      if (issues.length)
        return {
          ok: false,
          reason: "Move validation failed: " + issues.join(", "),
        };
      var xml = new XMLSerializer().serializeToString(trial),
        fresh = parseB2MML(xml);
      if (!fresh)
        return {
          ok: false,
          reason: "The proposed Operation move could not be reparsed.",
        };
      xmlAuthorityAttach(fresh, trial, xml);
      xmlAuthorityReplaceCurrent(fresh);
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || "Operation movement failed.",
      };
    }
  }

  function transitionDelete(r) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var doc = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        up = upFor(shadow, r.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        tid = String(r.transitionId);
      if (!pl) return { ok: false, reason: "Unit Procedure missing." };
      var all = links(pl),
        incoming = all.filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "to").length === 1 &&
            same(endpoint(l, "to")[0], { type: "Transition", id: tid })
          );
        }),
        outgoing = all.filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "from").length === 1 &&
            same(endpoint(l, "from")[0], { type: "Transition", id: tid })
          );
        }),
        other = all.filter(function (l) {
          return (
            text(l, "LinkType") === "Other" &&
            endpoint(l, "from").some(function (e) {
              return same(e, { type: "Transition", id: tid });
            })
          );
        });
      if (other.length)
        return {
          ok: false,
          reason: "A loop Transition is fixed and cannot be deleted.",
        };
      if (
        incoming.length !== 1 ||
        outgoing.length !== 1 ||
        endpoint(incoming[0], "from").length !== 1 ||
        endpoint(outgoing[0], "to").length !== 1
      )
        return {
          ok: false,
          reason: "Delete is available only for a linear Transition.",
        };
      replaceEndpoints(incoming[0], "to", endpoint(outgoing[0], "to"));
      outgoing[0].parentNode.removeChild(outgoing[0]);
      kids(pl, "Transition")
        .filter(function (t) {
          return text(t, "ID") === tid;
        })
        .forEach(function (t) {
          t.parentNode.removeChild(t);
        });
      var bad = validate(pl);
      if (bad.length) return { ok: false, reason: bad.join(", ") };
      return commit(doc);
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || "Transition delete failed.",
      };
    }
  }
  window.requestOperationTransitionDelete = function (r) {
    var x = transitionDelete(r);
    if (!x.ok) alert("Transition not deleted: " + x.reason);
    return x;
  };
  function branchAfterOperation(r) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var doc = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        up = upFor(shadow, r.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        opId = String(r.operationId),
        st = pl && stepForRE(pl, opId);
      if (!pl || !st) return { ok: false, reason: "Operation missing." };
      var tid = nextId(doc),
        tr = doc.createElementNS(pl.namespaceURI, "Transition"),
        out = links(pl).filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "from").length === 1 &&
            same(endpoint(l, "from")[0], {
              type: "Step",
              id: text(st, "ID"),
            }) &&
            endpoint(l, "to").length === 1
          );
        });
      if (out.length !== 1)
        return { ok: false, reason: "Branch needs one normal Operation exit." };
      setText(tr, "ID", tid);
      setText(tr, "Condition", 'Ask( "Condition?" )');
      pl.appendChild(tr);
      replaceEndpoints(out[0], "from", [{ type: "Transition", id: tid }]);
      appendLink(
        pl,
        { type: "Step", id: text(st, "ID") },
        { type: "Transition", id: tid },
        nextId(doc),
      );
      var xml = new XMLSerializer().serializeToString(doc),
        fresh = parseB2MML(xml);
      if (!fresh)
        return { ok: false, reason: "Could not create branch anchor." };
      xmlAuthorityAttach(fresh, doc, xml);
      xmlAuthorityReplaceCurrent(fresh);
      return branchAfterTransition({
        unitProcedureIndex: r.unitProcedureIndex,
        transitionId: tid,
        mode: r.mode,
        laneCount: r.laneCount,
      });
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || "Branch creation failed.",
      };
    }
  }
  window.requestOperationBranchAfterNode = function (r) {
    var x = branchAfterOperation(r);
    if (!x.ok) alert("Branch not created: " + x.reason);
    return x;
  };
  window.requestOperationMove = function (r) {
    var out = move(r);
    if (!out.ok) alert("Move not applied: " + out.reason);
    else {
      currentRecipeData._structuralEdit = true;
      renderAll();
    }
    return out;
  };
  window.operationDropHtml = function (u, anchorId) {
    return editMode
      ? '<div class="operation-drop-target graph-drop-boundary" data-operation-u="' +
          u +
          '" data-operation-anchor="' +
          esc(String(anchorId)) +
          '">Drop Operation here</div>'
      : "";
  };
  window.operationTransitionDropHtml = function (u, anchorId) {
    return editMode
      ? '<div class="operation-transition-drop-target graph-drop-boundary" data-operation-transition-u="' +
          u +
          '" data-operation-transition-anchor="' +
          esc(String(anchorId)) +
          '">Drop Transition here</div>'
      : "";
  };
  function moveTransition(r) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var doc = cloneDoc(recipe),
        shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        up = upFor(shadow, r.unitProcedureIndex),
        pl = up && one(up, "ProcedureLogic"),
        tid = String(r.transitionId);
      if (!pl) return { ok: false, reason: "Unit Procedure missing." };
      var all = links(pl),
        te = { type: "Transition", id: tid },
        incoming = all.filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "to").length === 1 &&
            same(endpoint(l, "to")[0], te)
          );
        }),
        outgoing = all.filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "from").length === 1 &&
            same(endpoint(l, "from")[0], te)
          );
        }),
        other = all.filter(function (l) {
          return (
            text(l, "LinkType") === "Other" &&
            (endpoint(l, "from").some(function (e) {
              return same(e, te);
            }) ||
              endpoint(l, "to").some(function (e) {
                return same(e, te);
              }))
          );
        });
      if (other.length)
        return {
          ok: false,
          reason: "Loop Transitions are fixed and cannot be moved.",
        };
      if (
        incoming.length !== 1 ||
        outgoing.length !== 1 ||
        endpoint(incoming[0], "from").length !== 1 ||
        endpoint(outgoing[0], "to").length !== 1
      )
        return {
          ok: false,
          reason:
            "Only a linear Transition with one normal input and output can be moved.",
        };
      var anchorId = String(r.anchorOperationId),
        anchorRE =
          anchorId === "__end__"
            ? directEnd(up)
            : directOps(up).filter(function (x) {
                return text(x, "ID") === anchorId;
              })[0],
        anchorStep = anchorRE && stepForRE(pl, text(anchorRE, "ID"));
      if (!anchorStep)
        return { ok: false, reason: "Destination boundary is unavailable." };
      var anchor = { type: "Step", id: text(anchorStep, "ID") },
        dest = all.filter(function (l) {
          return (
            isControl(l) &&
            endpoint(l, "to").length === 1 &&
            same(endpoint(l, "to")[0], anchor)
          );
        });
      if (dest.length !== 1)
        return {
          ok: false,
          reason: "Destination needs one linear incoming route.",
        };
      if (dest[0] === incoming[0] || dest[0] === outgoing[0])
        return { ok: false, reason: "Transition is already at that boundary." };
      var successor = endpoint(outgoing[0], "to")[0],
        predecessor = endpoint(dest[0], "from")[0];
      replaceEndpoints(incoming[0], "to", [successor]);
      replaceEndpoints(dest[0], "to", [te]);
      replaceEndpoints(outgoing[0], "to", [anchor]);
      var bad = validate(pl);
      if (bad.length) return { ok: false, reason: bad.join(", ") };
      return commit(doc);
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || "Transition movement failed.",
      };
    }
  }
  window.requestOperationTransitionMove = function (r) {
    var x = moveTransition(r);
    if (!x.ok) alert("Transition not moved: " + x.reason);
    return x;
  };
  var transitionDrag = null;
  document.addEventListener(
    "pointerdown",
    function (e) {
      var h =
        e.target &&
        e.target.closest &&
        e.target.closest(".operation-transition-drag-handle");
      if (!h || e.button !== 0) return;
      transitionDrag = {
        id: e.pointerId,
        handle: h,
        u: Number(h.dataset.operationU),
        tid: String(h.dataset.transitionId),
        x: e.clientX,
        y: e.clientY,
        started: false,
      };
      if (h.setPointerCapture) h.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    true,
  );
  document.addEventListener(
    "pointermove",
    function (e) {
      if (!transitionDrag || e.pointerId !== transitionDrag.id) return;
      var dx = e.clientX - transitionDrag.x,
        dy = e.clientY - transitionDrag.y;
      if (!transitionDrag.started && dx * dx + dy * dy >= 16) {
        transitionDrag.started = true;
        document.body.classList.add("operation-transition-move-dragging");
        transitionDrag.handle
          .closest(".operation-transition-node")
          .classList.add("graph-dragging");
      }
      if (transitionDrag.started) {
        document
          .querySelectorAll(
            ".operation-transition-drop-target.graph-drop-active",
          )
          .forEach(function (x) {
            x.classList.remove("graph-drop-active");
          });
        var t = document.elementFromPoint(e.clientX, e.clientY);
        t = t && t.closest && t.closest(".operation-transition-drop-target");
        if (t) t.classList.add("graph-drop-active");
        e.preventDefault();
      }
    },
    true,
  );
  document.addEventListener(
    "pointerup",
    function (e) {
      if (!transitionDrag || e.pointerId !== transitionDrag.id) return;
      var d = transitionDrag,
        t = document.elementFromPoint(e.clientX, e.clientY);
      t = t && t.closest && t.closest(".operation-transition-drop-target");
      transitionDrag = null;
      d.handle
        .closest(".operation-transition-node")
        .classList.remove("graph-dragging");
      document.body.classList.remove("operation-transition-move-dragging");
      document
        .querySelectorAll(".operation-transition-drop-target.graph-drop-active")
        .forEach(function (x) {
          x.classList.remove("graph-drop-active");
        });
      if (d.started && t && Number(t.dataset.operationTransitionU) === d.u)
        window.requestOperationTransitionMove({
          unitProcedureIndex: d.u,
          transitionId: d.tid,
          anchorOperationId: String(t.dataset.operationTransitionAnchor),
        });
    },
    true,
  );

  var drag = null;
  document.addEventListener(
    "pointerdown",
    function (e) {
      var h =
        e.target &&
        e.target.closest &&
        e.target.closest(".operation-drag-handle");
      if (!h || e.button !== 0) return;
      drag = {
        id: e.pointerId,
        handle: h,
        u: Number(h.dataset.operationU),
        source: String(h.dataset.operationId),
        x: e.clientX,
        y: e.clientY,
        started: false,
      };
      if (h.setPointerCapture) h.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    true,
  );
  document.addEventListener(
    "pointermove",
    function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (!drag.started && dx * dx + dy * dy >= 16) {
        drag.started = true;
        document.body.classList.add("operation-move-dragging");
        drag.handle.classList.add("graph-dragging");
      }
      if (drag.started) {
        document.querySelectorAll(".graph-drop-active").forEach(function (x) {
          x.classList.remove("graph-drop-active");
        });
        var t = document.elementFromPoint(e.clientX, e.clientY);
        t = t && t.closest && t.closest(".operation-drop-target");
        if (t) t.classList.add("graph-drop-active");
        e.preventDefault();
      }
    },
    true,
  );
  document.addEventListener(
    "pointerup",
    function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var state = drag,
        t = document.elementFromPoint(e.clientX, e.clientY);
      t = t && t.closest && t.closest(".operation-drop-target");
      drag = null;
      state.handle.classList.remove("graph-dragging");
      document.body.classList.remove("operation-move-dragging");
      document.querySelectorAll(".graph-drop-active").forEach(function (x) {
        x.classList.remove("graph-drop-active");
      });
      if (state.started && t && Number(t.dataset.operationU) === state.u)
        window.requestOperationMove({
          unitProcedureIndex: state.u,
          sourceOperationId: state.source,
          anchorOperationId: String(t.dataset.operationAnchor),
        });
    },
    true,
  );
})();
