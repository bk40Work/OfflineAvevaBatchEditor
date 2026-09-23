/**
 * graph-actions.js
 *
 * Sole runtime owner for graph editing behaviour at every hierarchy scope.
 *
 * Scope adapters:
 * - Phase scope: enclosing Operation ProcedureLogic; business node = Phase.
 * - Operation scope: enclosing Unit Procedure ProcedureLogic; business node = Operation.
 * - Unit Procedure scope: reserved for the Master Recipe ProcedureLogic migration.
 *
 * This consolidation preserves the existing execution order: the proven Phase
 * graph implementation loads first, followed by the Operation scope implementation.
 * There are no separately loaded phase-graph.js or operation-graph.js files.
 *
 * IMPORTANT: this is a structural centralisation release. It deliberately does
 * not alter a graph action, XML mutation rule, picker route, or UI contract.
 */

/* ============================================================================
 * PHASE SCOPE IMPLEMENTATION
 * ---------------------------------------------------------------------------
 * Former runtime module: graph/phase-graph.js
 * Future shared-action extraction occurs within this file, not in a new
 * phase-specific runtime file.
 * ========================================================================== */

/**
 * Consolidated runtime module: graph / phase-graph.js
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
 * Former file: js/movement-service.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

/*
 * movement-service.js
 *
 * XML-authoritative Phase movement owner.
 *
 * Generic atomic movement is derived from the loaded ProcedureLogic graph;
 * recipe names, labels and numeric IDs are never movement rules. Every graph
 * boundary, including Transition-to-Fork, is resolved from native endpoints.
 * Each mutation runs on a cloned XML DOM, validates, reparses, and commits only on
 * success. Unsupported whole-structure cases are rejected without mutation.
 */
(function () {
  "use strict";

  function localName(node) {
    return (node && (node.localName || node.nodeName)) || "";
  }

  function directChildren(node, name) {
    return Array.prototype.filter.call(node.children || [], function (child) {
      return localName(child) === name;
    });
  }

  function firstChild(node, name) {
    return directChildren(node, name)[0] || null;
  }

  function childText(node, name) {
    var child = firstChild(node, name);
    return child ? (child.textContent || "").trim() : "";
  }

  function setChildText(node, name, value) {
    var child = firstChild(node, name);
    if (!child) {
      child = node.ownerDocument.createElementNS(node.namespaceURI, name);
      node.appendChild(child);
    }
    child.textContent = String(value);
  }

  function procedureLogicFor(recipe, unitProcedureIndex, operationIndex) {
    var unitProcedures = (recipe && recipe.unit_procedures) || [];
    var operation =
      unitProcedures[unitProcedureIndex] &&
      unitProcedures[unitProcedureIndex].operations[operationIndex];

    if (!operation || !recipe._xmlDoc) {
      return null;
    }

    var operations = Array.prototype.filter.call(
      recipe._xmlDoc.getElementsByTagName("*"),
      function (node) {
        return (
          localName(node) === "RecipeElement" &&
          childText(node, "RecipeElementType") === "Operation"
        );
      },
    );

    var index = 0;
    for (var unitIndex = 0; unitIndex < unitProcedures.length; unitIndex += 1) {
      var currentOperations = unitProcedures[unitIndex].operations || [];
      for (
        var currentIndex = 0;
        currentIndex < currentOperations.length;
        currentIndex += 1
      ) {
        if (
          unitIndex === unitProcedureIndex &&
          currentIndex === operationIndex
        ) {
          return firstChild(operations[index], "ProcedureLogic");
        }
        index += 1;
      }
    }

    return null;
  }

  function links(logic) {
    return directChildren(logic, "Link");
  }

  function steps(logic) {
    return directChildren(logic, "Step");
  }

  function linkType(link) {
    return childText(link, "LinkType");
  }

  function isOtherLink(link) {
    return linkType(link) === "Other";
  }

  function endpoints(link, side) {
    var elementName = side === "from" ? "FromID" : "ToID";
    var valueName = side === "from" ? "FromIDValue" : "ToIDValue";
    var typeName = side === "from" ? "FromType" : "ToType";

    return directChildren(link, elementName).map(function (node) {
      return {
        type: childText(node, typeName),
        id: childText(node, valueName),
      };
    });
  }

  function replaceEndpoints(link, side, values) {
    var elementName = side === "from" ? "FromID" : "ToID";
    var valueName = side === "from" ? "FromIDValue" : "ToIDValue";
    var typeName = side === "from" ? "FromType" : "ToType";
    var oldEndpoints = directChildren(link, elementName);
    var insertionPoint = oldEndpoints.length
      ? oldEndpoints[oldEndpoints.length - 1].nextSibling
      : null;
    var document = link.ownerDocument;

    oldEndpoints.forEach(function (node) {
      link.removeChild(node);
    });

    values.forEach(function (value) {
      var endpoint = document.createElementNS(link.namespaceURI, elementName);
      setChildText(endpoint, valueName, value.id);
      setChildText(endpoint, typeName, value.type);
      setChildText(endpoint, "IDScope", "Internal");
      link.insertBefore(endpoint, insertionPoint);
    });
  }

  function stepForRecipeElement(logic, recipeElementId) {
    return (
      steps(logic).filter(function (step) {
        return childText(step, "RecipeElementID") === String(recipeElementId);
      })[0] || null
    );
  }

  function recipeElementForId(document, recipeElementId) {
    return (
      Array.prototype.filter.call(
        document.getElementsByTagName("*"),
        function (node) {
          return (
            localName(node) === "RecipeElement" &&
            childText(node, "ID") === String(recipeElementId)
          );
        },
      )[0] || null
    );
  }

  function numericIdAllocator(document) {
    var maximum = 0;
    Array.prototype.forEach.call(
      document.getElementsByTagName("*"),
      function (node) {
        if (localName(node) !== "ID") {
          return;
        }
        var value = (node.textContent || "").trim();
        if (/^\d+$/.test(value)) {
          maximum = Math.max(maximum, Number(value));
        }
      },
    );

    return function nextId() {
      maximum += 1;
      return String(maximum);
    };
  }

  function sameEndpoint(left, right) {
    return left.type === right.type && String(left.id) === String(right.id);
  }

  function includesEndpoint(values, wanted) {
    return values.some(function (value) {
      return sameEndpoint(value, wanted);
    });
  }

  function linkWithEndpoint(allLinks, side, wanted, allowedTypes) {
    return allLinks.filter(function (link) {
      return (
        (!allowedTypes || allowedTypes.indexOf(linkType(link)) >= 0) &&
        includesEndpoint(endpoints(link, side), wanted)
      );
    });
  }

  function describeEndpoint(endpoint) {
    return endpoint.type + " #" + endpoint.id;
  }

  function snapshotOtherLinks(logic) {
    return links(logic)
      .filter(isOtherLink)
      .map(function (link) {
        return {
          id: childText(link, "ID"),
          from: endpoints(link, "from"),
          to: endpoints(link, "to"),
        };
      });
  }

  function equivalentOtherLinks(before, after) {
    if (before.length !== after.length) {
      return false;
    }

    return before.every(function (savedLink) {
      return after.some(function (currentLink) {
        return (
          savedLink.id === currentLink.id &&
          JSON.stringify(savedLink.from) === JSON.stringify(currentLink.from) &&
          JSON.stringify(savedLink.to) === JSON.stringify(currentLink.to)
        );
      });
    });
  }

  function cloneBusinessRecipeElement(sourceRecipeElement, newRecipeElementId) {
    var clone = sourceRecipeElement.cloneNode(true);
    setChildText(clone, "ID", newRecipeElementId);
    sourceRecipeElement.parentNode.insertBefore(
      clone,
      sourceRecipeElement.nextSibling,
    );
    return clone;
  }

  function replaceBusinessRecipeElementWithDummy(recipeElement) {
    Array.prototype.slice
      .call(recipeElement.children || [])
      .forEach(function (child) {
        if (localName(child) !== "ID") recipeElement.removeChild(child);
      });
    var type = recipeElement.ownerDocument.createElementNS(
      recipeElement.namespaceURI,
      "RecipeElementType",
    );
    type.setAttribute("OtherValue", "DUMMY");
    type.textContent = "Other";
    recipeElement.appendChild(type);
  }

  function addStep(logic, recipeElementId, nextId) {
    var step = logic.ownerDocument.createElementNS(logic.namespaceURI, "Step");
    setChildText(step, "ID", nextId());
    setChildText(step, "RecipeElementID", recipeElementId);
    setChildText(step, "RecipeElementVersion", "0");
    logic.appendChild(step);
    return step;
  }

  function appendLink(logic, from, to, type, nextId) {
    var link = logic.ownerDocument.createElementNS(logic.namespaceURI, "Link");
    setChildText(link, "ID", nextId());
    replaceEndpoints(link, "from", from);
    replaceEndpoints(link, "to", to);
    setChildText(link, "LinkType", type);
    setChildText(link, "Depiction", "Line");
    logic.appendChild(link);
    return link;
  }

  function hasStep(logic, stepId) {
    return steps(logic).some(function (step) {
      return childText(step, "ID") === String(stepId);
    });
  }

  function validateStepEndpoints(logic) {
    /* Step 2: Phase movement now consumes the shared graph-scope validator. */
    if (window.RecipeGraphScope && window.RecipeGraphScope.xml) {
      return window.RecipeGraphScope.xml.validateStepEndpoints(logic);
    }
    var missing = [];
    links(logic).forEach(function (link) {
      ["from", "to"].forEach(function (side) {
        endpoints(link, side).forEach(function (endpoint) {
          if (endpoint.type === "Step" && !hasStep(logic, endpoint.id)) {
            missing.push(
              "Link #" +
                childText(link, "ID") +
                " references missing Step #" +
                endpoint.id,
            );
          }
        });
      });
    });
    return missing;
  }

  /* Generic movement below resolves topology from the selected native boundary. */

  function isDivergent(link) {
    return (
      linkType(link) === "ParallelDivergent" ||
      linkType(link) === "SerialDivergent"
    );
  }

  function isConvergent(link) {
    return (
      linkType(link) === "ParallelConvergent" ||
      linkType(link) === "SerialConvergent"
    );
  }

  function replaceOneEndpoint(link, side, oldValue, newValue) {
    var values = endpoints(link, side),
      changed = false;
    values = values.map(function (value) {
      if (!changed && sameEndpoint(value, oldValue)) {
        changed = true;
        return newValue;
      }
      return value;
    });
    if (!changed)
      throw new Error("The selected graph endpoint could not be found.");
    replaceEndpoints(link, side, values);
  }

  function removeLink(logic, link) {
    if (link && link.parentNode === logic) logic.removeChild(link);
  }

  function normalEndpointLinks(logic, side, endpoint) {
    return linkWithEndpoint(links(logic), side, endpoint).filter(
      function (link) {
        return !isOtherLink(link);
      },
    );
  }

  function classifyAtomicMove(
    logic,
    sourceRecipeElementId,
    anchorRecipeElementId,
  ) {
    sourceRecipeElementId = String(sourceRecipeElementId);
    anchorRecipeElementId = String(anchorRecipeElementId);
    if (sourceRecipeElementId === anchorRecipeElementId)
      return { ok: false, reason: "Choose a different destination." };
    var sourceStep = stepForRecipeElement(logic, sourceRecipeElementId);
    var anchorStep = stepForRecipeElement(logic, anchorRecipeElementId);
    if (!sourceStep || !anchorStep)
      return {
        ok: false,
        reason: "The source or destination has no native ProcedureLogic Step.",
      };
    var source = { type: "Step", id: childText(sourceStep, "ID") };
    var anchor = { type: "Step", id: childText(anchorStep, "ID") };
    var incoming = normalEndpointLinks(logic, "to", source);
    var outgoing = normalEndpointLinks(logic, "from", source);
    if (incoming.length !== 1 || outgoing.length !== 1)
      return {
        ok: false,
        reason:
          "This Phase does not have one unambiguous normal entry and exit.",
      };
    if (
      links(logic).some(function (link) {
        return (
          isOtherLink(link) &&
          (includesEndpoint(endpoints(link, "from"), source) ||
            includesEndpoint(endpoints(link, "to"), source))
        );
      })
    )
      return {
        ok: false,
        reason:
          "This Phase owns a loop route and must move with its complete loop structure.",
      };
    var predecessorValues = endpoints(incoming[0], "from"),
      successorValues = endpoints(outgoing[0], "to");
    if (predecessorValues.length !== 1 || successorValues.length !== 1)
      return {
        ok: false,
        reason: "This Phase is attached to an ambiguous grouped boundary.",
      };
    if (isDivergent(incoming[0]) && isConvergent(outgoing[0]))
      return {
        ok: false,
        reason:
          "A single-item branch lane needs a retained structural placeholder and is not moved as an atomic Phase.",
      };
    var destination = normalEndpointLinks(logic, "to", anchor);
    if (destination.length !== 1)
      return {
        ok: false,
        reason: "The destination has no single normal entry boundary.",
      };
    if (destination[0] === incoming[0] || destination[0] === outgoing[0])
      return { ok: false, reason: "The Phase is already at this position." };
    return {
      ok: true,
      sourceStep: sourceStep,
      anchorStep: anchorStep,
      source: source,
      anchor: anchor,
      incoming: incoming[0],
      outgoing: outgoing[0],
      predecessor: predecessorValues[0],
      successor: successorValues[0],
      destination: destination[0],
      sourceRecipeElementId: sourceRecipeElementId,
      anchorRecipeElementId: anchorRecipeElementId,
    };
  }

  function applyAtomicMove(logic, plan) {
    /* Remove the source from its current route while retaining native fork/join grouping. */
    if (isDivergent(plan.incoming)) {
      replaceOneEndpoint(plan.incoming, "to", plan.source, plan.successor);
      removeLink(logic, plan.outgoing);
    } else if (isConvergent(plan.outgoing)) {
      replaceOneEndpoint(plan.outgoing, "from", plan.source, plan.predecessor);
      removeLink(logic, plan.incoming);
    } else {
      replaceOneEndpoint(plan.incoming, "to", plan.source, plan.successor);
      removeLink(logic, plan.outgoing);
    }
    /* Split the selected incoming boundary with the retained source Step. */
    replaceOneEndpoint(plan.destination, "to", plan.anchor, plan.source);
    appendLink(
      logic,
      [plan.source],
      [plan.anchor],
      "ControlLink",
      numericIdAllocator(logic.ownerDocument),
    );
    var sourceRecipeElement = recipeElementForId(
      logic.ownerDocument,
      plan.sourceRecipeElementId,
    );
    var anchorRecipeElement = recipeElementForId(
      logic.ownerDocument,
      plan.anchorRecipeElementId,
    );
    if (
      sourceRecipeElement &&
      anchorRecipeElement &&
      sourceRecipeElement.parentNode === anchorRecipeElement.parentNode
    )
      anchorRecipeElement.parentNode.insertBefore(
        sourceRecipeElement,
        anchorRecipeElement,
      );
    return { movedRecipeElementId: plan.sourceRecipeElementId };
  }

  function validateAtomicResult(logic, otherBefore) {
    var problems = validateStepEndpoints(logic);
    if (!equivalentOtherLinks(otherBefore, snapshotOtherLinks(logic)))
      problems.push("A fixed Other loop route changed during the move.");
    return problems;
  }

  function resolveBoundary(logic, destination) {
    var all = links(logic),
      target,
      hits,
      forkStep,
      divergent,
      laneStart,
      current,
      seen = {},
      outgoing,
      next;
    if (
      destination.type === "before-phase" ||
      destination.type === "before-node"
    ) {
      target = stepForRecipeElement(logic, destination.anchorRecipeElementId);
      if (!target)
        return {
          ok: false,
          reason: "The destination Step is no longer present.",
        };
      target = { type: "Step", id: childText(target, "ID") };
      hits = normalEndpointLinks(logic, "to", target);
      return hits.length === 1
        ? { ok: true, mode: "before", link: hits[0], target: target }
        : {
            ok: false,
            reason: "The destination has no single incoming graph boundary.",
          };
    }
    if (destination.type === "before-transition") {
      target = { type: "Transition", id: String(destination.transitionId) };
      hits = normalEndpointLinks(logic, "to", target);
      return hits.length === 1
        ? { ok: true, mode: "before", link: hits[0], target: target }
        : {
            ok: false,
            reason: "The Transition has no single incoming graph boundary.",
          };
    }
    if (destination.type === "after-transition-before-fork") {
      target = { type: "Transition", id: String(destination.transitionId) };
      hits = all.filter(function (link) {
        return (
          isDivergent(link) && includesEndpoint(endpoints(link, "from"), target)
        );
      });
      if (hits.length !== 1)
        return {
          ok: false,
          reason: "The Transition does not own one unambiguous fork boundary.",
        };
      return {
        ok: true,
        mode: "after-transition-before-fork",
        link: hits[0],
        sourceEndpoint: target,
        forkTargets: endpoints(hits[0], "to"),
        forkType: linkType(hits[0]),
      };
    }
    if (destination.type === "before-join") {
      /* Renderer regions use @T:<id> for Transition-led forks and a RecipeElement ID for Step-led forks. */
      var forkReference = String(destination.forkRecipeElementId || ""),
        forkEndpoint;
      if (forkReference.indexOf("@T:") === 0) {
        forkEndpoint = { type: "Transition", id: forkReference.slice(3) };
      } else {
        forkStep = stepForRecipeElement(logic, forkReference);
        if (!forkStep)
          return { ok: false, reason: "The branch fork is no longer present." };
        forkEndpoint = { type: "Step", id: childText(forkStep, "ID") };
      }
      divergent = all.filter(function (link) {
        return (
          isDivergent(link) &&
          includesEndpoint(endpoints(link, "from"), forkEndpoint)
        );
      })[0];
      if (!divergent)
        return { ok: false, reason: "The branch divergence is unavailable." };
      laneStart = endpoints(divergent, "to")[Number(destination.laneIndex)];
      if (!laneStart)
        return { ok: false, reason: "That branch lane is unavailable." };
      current = laneStart;
      while (current && current.type === "Step" && !seen[current.id]) {
        seen[current.id] = true;
        outgoing = normalEndpointLinks(logic, "from", current);
        if (outgoing.length !== 1) break;
        if (isConvergent(outgoing[0]))
          return {
            ok: true,
            mode: "before-join",
            link: outgoing[0],
            laneEnd: current,
            target: endpoints(outgoing[0], "to")[0],
          };
        next = endpoints(outgoing[0], "to");
        if (next.length !== 1) break;
        current = next[0];
        if (current.type === "Transition") {
          outgoing = normalEndpointLinks(logic, "from", current);
          if (outgoing.length !== 1) break;
          if (isConvergent(outgoing[0]))
            return {
              ok: true,
              mode: "before-join",
              link: outgoing[0],
              laneEnd: current,
              target: endpoints(outgoing[0], "to")[0],
            };
          next = endpoints(outgoing[0], "to");
          if (next.length !== 1) break;
          current = next[0];
        }
      }
      return {
        ok: false,
        reason: "The branch lane has no unambiguous Join boundary.",
      };
    }
    return { ok: false, reason: "Unsupported graph boundary." };
  }

  function classifyAtomicBoundaryMove(
    logic,
    sourceRecipeElementId,
    destination,
  ) {
    sourceRecipeElementId = String(sourceRecipeElementId);
    var sourceStep = stepForRecipeElement(logic, sourceRecipeElementId);
    if (!sourceStep)
      return {
        ok: false,
        reason: "The dragged Phase has no native ProcedureLogic Step.",
      };
    var source = { type: "Step", id: childText(sourceStep, "ID") },
      incoming = normalEndpointLinks(logic, "to", source),
      outgoing = normalEndpointLinks(logic, "from", source);
    if (incoming.length !== 1 || outgoing.length !== 1)
      return {
        ok: false,
        reason:
          "This Phase does not have one unambiguous normal entry and exit.",
      };
    if (
      links(logic).some(function (link) {
        return (
          isOtherLink(link) &&
          (includesEndpoint(endpoints(link, "from"), source) ||
            includesEndpoint(endpoints(link, "to"), source))
        );
      })
    )
      return {
        ok: false,
        reason:
          "This Phase owns a loop route and must move with its complete loop structure.",
      };
    var predecessors = endpoints(incoming[0], "from"),
      successors = endpoints(outgoing[0], "to");
    var boundary = resolveBoundary(logic, destination);
    if (!boundary.ok) return boundary;
    /* 2c family: a final lane Phase becomes the continuation between this Join and the next fork. */
    if (
      boundary.mode === "before" &&
      boundary.link === outgoing[0] &&
      isConvergent(outgoing[0]) &&
      boundary.target.type === "Step"
    ) {
      var nextFork = normalEndpointLinks(logic, "from", boundary.target).filter(
        isDivergent,
      );
      if (nextFork.length === 1)
        return {
          ok: true,
          kind: "lift-lane-exit-to-continuation",
          sourceRecipeElementId: sourceRecipeElementId,
          source: source,
          incoming: incoming[0],
          outgoing: outgoing[0],
          predecessor: predecessors[0],
          boundary: boundary,
          nextFork: nextFork[0],
        };
    }
    /* 2d family: a continuation Phase that owns the next fork re-enters a lane before its preceding Join. */
    /* Match branch-lane deletion: a direct fork-to-join source becomes a DUMMY in place,
       then its cloned business Phase is inserted at whichever valid boundary was selected. */
    if (isDivergent(incoming[0]) && isConvergent(outgoing[0])) {
      return {
        ok: true,
        kind: "move-singleton-lane",
        sourceRecipeElementId: sourceRecipeElementId,
        source: source,
        incoming: incoming[0],
        outgoing: outgoing[0],
        boundary: boundary,
      };
    }
    /* A business Phase that currently owns a fork can be returned into any selected lane.
       Its Step remains as the fork's structural DUMMY source; the business Phase is cloned into the lane. */
    if (boundary.mode === "before-join" && isDivergent(outgoing[0])) {
      return {
        ok: true,
        kind: "return-fork-source-to-lane",
        sourceRecipeElementId: sourceRecipeElementId,
        source: source,
        incoming: incoming[0],
        outgoing: outgoing[0],
        boundary: boundary,
      };
    }
    /* Source and destination may share the same convergence Link: this is a real A-to-B lane move, not a no-op. */
    if (
      boundary.mode === "before-join" &&
      isConvergent(outgoing[0]) &&
      boundary.link === outgoing[0]
    ) {
      if (predecessors.length !== 1)
        return {
          ok: false,
          reason: "The source lane has no unambiguous predecessor.",
        };
      return {
        ok: true,
        kind: "move-lane-end-to-lane-end",
        sourceRecipeElementId: sourceRecipeElementId,
        source: source,
        incoming: incoming[0],
        outgoing: outgoing[0],
        predecessor: predecessors[0],
        boundary: boundary,
      };
    }
    if (predecessors.length !== 1 || successors.length !== 1)
      return {
        ok: false,
        reason: "This Phase is attached to an ambiguous grouped boundary.",
      };
    if (boundary.link === incoming[0] || boundary.link === outgoing[0])
      return { ok: false, reason: "The Phase is already at this boundary." };
    return {
      ok: true,
      kind: "atomic",
      sourceRecipeElementId: sourceRecipeElementId,
      sourceStep: sourceStep,
      source: source,
      incoming: incoming[0],
      outgoing: outgoing[0],
      predecessor: predecessors[0],
      successor: successors[0],
      boundary: boundary,
    };
  }

  function detachAtomic(logic, plan) {
    if (isDivergent(plan.incoming)) {
      replaceOneEndpoint(plan.incoming, "to", plan.source, plan.successor);
      removeLink(logic, plan.outgoing);
    } else if (isConvergent(plan.outgoing)) {
      replaceOneEndpoint(plan.outgoing, "from", plan.source, plan.predecessor);
      removeLink(logic, plan.incoming);
    } else {
      replaceOneEndpoint(plan.incoming, "to", plan.source, plan.successor);
      removeLink(logic, plan.outgoing);
    }
  }

  function applyAtomicBoundaryMove(logic, plan) {
    var b = plan.boundary,
      nextId = numericIdAllocator(logic.ownerDocument);
    if (plan.kind === "lift-lane-exit-to-continuation") {
      /* Keep the Join and subsequent Fork identities; only replace their shared continuation endpoint. */
      replaceOneEndpoint(plan.outgoing, "from", plan.source, plan.predecessor);
      replaceOneEndpoint(plan.outgoing, "to", b.target, plan.source);
      replaceOneEndpoint(plan.nextFork, "from", b.target, plan.source);
      removeLink(logic, plan.incoming);
      return { movedRecipeElementId: plan.sourceRecipeElementId };
    }
    if (plan.kind === "move-singleton-lane") {
      /* The source Step and both grouped links stay in place as an empty lane, exactly as delete does. */
      var singletonRecipeElement = recipeElementForId(
        logic.ownerDocument,
        plan.sourceRecipeElementId,
      );
      if (!singletonRecipeElement)
        throw new Error("The source business Phase is no longer present.");
      var singletonNewRecipeElementId = nextId(),
        singletonClone = cloneBusinessRecipeElement(
          singletonRecipeElement,
          singletonNewRecipeElementId,
        ),
        singletonNewStep = addStep(logic, singletonNewRecipeElementId, nextId),
        singletonEndpoint = {
          type: "Step",
          id: childText(singletonNewStep, "ID"),
        };
      replaceBusinessRecipeElementWithDummy(singletonRecipeElement);
      if (b.mode === "before") {
        replaceOneEndpoint(b.link, "to", b.target, singletonEndpoint);
        appendLink(
          logic,
          [singletonEndpoint],
          [b.target],
          "ControlLink",
          nextId,
        );
      } else if (b.mode === "before-join") {
        replaceOneEndpoint(b.link, "from", b.laneEnd, singletonEndpoint);
        appendLink(
          logic,
          [b.laneEnd],
          [singletonEndpoint],
          "ControlLink",
          nextId,
        );
      } else if (b.mode === "after-transition-before-fork") {
        replaceEndpoints(b.link, "from", [singletonEndpoint]);
        appendLink(
          logic,
          [b.sourceEndpoint],
          [singletonEndpoint],
          "ControlLink",
          nextId,
        );
      } else {
        throw new Error(
          "The selected destination cannot accept a moved branch-lane Phase.",
        );
      }
      return { movedRecipeElementId: singletonNewRecipeElementId };
    }
    if (plan.kind === "return-fork-source-to-lane") {
      /* The fork needs a stable structural source. Retain it as DUMMY and clone the business Phase into the selected lane. */
      var sourceRecipeElement = recipeElementForId(
        logic.ownerDocument,
        plan.sourceRecipeElementId,
      );
      if (!sourceRecipeElement)
        throw new Error(
          "The continuation business Phase is no longer present.",
        );
      var newRecipeElementId = nextId(),
        clone = cloneBusinessRecipeElement(
          sourceRecipeElement,
          newRecipeElementId,
        ),
        newStep = addStep(logic, newRecipeElementId, nextId),
        newEndpoint = { type: "Step", id: childText(newStep, "ID") };
      replaceBusinessRecipeElementWithDummy(sourceRecipeElement);
      replaceOneEndpoint(b.link, "from", b.laneEnd, newEndpoint);
      appendLink(logic, [b.laneEnd], [newEndpoint], "ControlLink", nextId);
      return { movedRecipeElementId: newRecipeElementId };
    }
    if (plan.kind === "move-lane-end-to-lane-end") {
      /* Shorten the old lane, then make the same business Step the final item of the destination lane. */
      replaceOneEndpoint(plan.outgoing, "from", plan.source, plan.predecessor);
      removeLink(logic, plan.incoming);
      replaceOneEndpoint(b.link, "from", b.laneEnd, plan.source);
      appendLink(logic, [b.laneEnd], [plan.source], "ControlLink", nextId);
      return { movedRecipeElementId: plan.sourceRecipeElementId };
    }
    detachAtomic(logic, plan);
    if (b.mode === "before") {
      replaceOneEndpoint(b.link, "to", b.target, plan.source);
      appendLink(logic, [plan.source], [b.target], "ControlLink", nextId);
    } else if (b.mode === "before-join") {
      replaceOneEndpoint(b.link, "from", b.laneEnd, plan.source);
      appendLink(logic, [b.laneEnd], [plan.source], "ControlLink", nextId);
    } else if (b.mode === "after-transition-before-fork") {
      replaceEndpoints(b.link, "from", [plan.source]);
      appendLink(
        logic,
        [b.sourceEndpoint],
        [plan.source],
        "ControlLink",
        nextId,
      );
    }
    return { movedRecipeElementId: plan.sourceRecipeElementId };
  }

  function cloneAuthoritativeDocument(recipe) {
    /* Step 2: use the same authoritative XML transaction primitive registered for all scopes. */
    if (window.RecipeGraphScope && window.RecipeGraphScope.xml) {
      return window.RecipeGraphScope.xml.cloneAuthoritative(recipe);
    }
    var xml = new XMLSerializer().serializeToString(recipe._xmlDoc);
    var document = new DOMParser().parseFromString(xml, "text/xml");
    if (document.getElementsByTagName("parsererror")[0]) {
      throw new Error(
        "The current authoritative XML cannot be cloned because it is invalid.",
      );
    }
    return document;
  }

  function commitMove(request) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative) {
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    }

    if (
      !request.destination ||
      [
        "before-phase",
        "before-node",
        "before-transition",
        "before-join",
        "after-transition-before-fork",
      ].indexOf(request.destination.type) < 0
    ) {
      return { ok: false, reason: "That graph destination is not available." };
    }

    var trialDocument;
    try {
      trialDocument = cloneAuthoritativeDocument(recipe);
      var shadowRecipe = Object.assign({}, recipe, { _xmlDoc: trialDocument });
      var logic = procedureLogicFor(
        shadowRecipe,
        request.unitProcedureIndex,
        request.operationIndex,
      );
      if (!logic) {
        return {
          ok: false,
          reason:
            "The selected Operation cannot be located in the authoritative XML.",
        };
      }

      var otherBefore = snapshotOtherLinks(logic),
        plan,
        result,
        problems;
      plan = classifyAtomicBoundaryMove(
        logic,
        request.sourceRecipeElementId,
        request.destination,
      );
      if (!plan.ok) return plan;
      result = applyAtomicBoundaryMove(logic, plan);
      problems = validateAtomicResult(logic, otherBefore);
      if (problems.length) {
        return { ok: false, reason: problems.join(" ") };
      }

      /* Phase movement remains on the validated Move2b commit path.  This is deliberately
         isolated while the shared commit adapter is regression-tested against graph nodes. */
      var xml = new XMLSerializer().serializeToString(trialDocument);
      var fresh = parseB2MML(xml);
      if (!fresh) {
        return {
          ok: false,
          reason: "The proposed XML change could not be reparsed as a recipe.",
        };
      }
      xmlAuthorityAttach(fresh, trialDocument, xml);
      xmlAuthorityReplaceCurrent(fresh);
      return { ok: true, movedRecipeElementId: result.newRecipeElementId };
    } catch (error) {
      return {
        ok: false,
        reason:
          (error && error.message) ||
          "The XML movement service failed unexpectedly.",
      };
    }
  }

  function notifyFailure(reason) {
    window.alert("Move not applied: " + reason);
  }

  window.requestPhaseMove = function (request) {
    var outcome = commitMove(request);
    if (!outcome.ok) {
      notifyFailure(outcome.reason);
      return outcome;
    }
    currentRecipeData._structuralEdit = true;
    renderAll();
    return outcome;
  };

  window.movementTransitionForkDropHtml = function (
    unitProcedureIndex,
    operationIndex,
    transitionId,
  ) {
    return (
      '<div class="movement-drop-target graph-drop-boundary" ' +
      'data-movement-destination="after-transition-before-fork" ' +
      'data-transition-id="' +
      esc(String(transitionId)) +
      '" ' +
      'data-movement-u="' +
      unitProcedureIndex +
      '" ' +
      'data-movement-o="' +
      operationIndex +
      '">' +
      "Drop Phase here <span>after Transition #" +
      esc(String(transitionId)) +
      " · before Fork</span>" +
      "</div>"
    );
  };

  window.movementPhaseDropHtml = function (
    unitProcedureIndex,
    operationIndex,
    anchorRecipeElementId,
  ) {
    return (
      '<div class="movement-drop-target graph-drop-boundary" ' +
      'data-movement-destination="before-phase" data-anchor-recipe-element-id="' +
      esc(String(anchorRecipeElementId)) +
      '" ' +
      'data-movement-u="' +
      unitProcedureIndex +
      '" data-movement-o="' +
      operationIndex +
      '">Drop Phase here <span>before #' +
      esc(String(anchorRecipeElementId)) +
      "</span></div>"
    );
  };

  window.movementNodeDropHtml = function (u, o, reId, label) {
    return (
      '<div class="movement-drop-target graph-drop-boundary" data-movement-destination="before-node" data-anchor-recipe-element-id="' +
      esc(String(reId)) +
      '" data-movement-u="' +
      u +
      '" data-movement-o="' +
      o +
      '">Drop Phase here <span>' +
      esc(label || "before #" + reId) +
      "</span></div>"
    );
  };
  window.movementTransitionDropHtml = function (u, o, tid) {
    return (
      '<div class="movement-drop-target graph-drop-boundary" data-movement-destination="before-transition" data-transition-id="' +
      esc(String(tid)) +
      '" data-movement-u="' +
      u +
      '" data-movement-o="' +
      o +
      '">Drop Phase here <span>before Transition #' +
      esc(String(tid)) +
      "</span></div>"
    );
  };
  window.movementLaneJoinDropHtml = function (u, o, forkId, laneIndex) {
    return (
      '<div class="movement-drop-target graph-drop-boundary" data-movement-destination="before-join" data-fork-recipe-element-id="' +
      esc(String(forkId)) +
      '" data-lane-index="' +
      laneIndex +
      '" data-movement-u="' +
      u +
      '" data-movement-o="' +
      o +
      '">Drop Phase here <span>at end of Branch ' +
      (typeof branchDisplayLetter === "function"
        ? branchDisplayLetter(laneIndex)
        : laneIndex + 1) +
      " · before Join</span></div>"
    );
  };

  window.movementArrowCapabilities = function () {
    /* Arrows are intentionally hidden until an ordinary route move is proven through this same service. */
    return { up: false, down: false };
  };

  function clearDragState() {
    document.body.classList.remove("graph-move-dragging");
    document.querySelectorAll(".graph-drop-active").forEach(function (target) {
      target.classList.remove("graph-drop-active");
    });
  }

  function targetAt(pointX, pointY) {
    var target = document.elementFromPoint(pointX, pointY);
    return target && target.closest && target.closest(".movement-drop-target");
  }

  function activateTarget(pointX, pointY) {
    document.querySelectorAll(".graph-drop-active").forEach(function (target) {
      target.classList.remove("graph-drop-active");
    });
    var target = targetAt(pointX, pointY);
    if (target) {
      target.classList.add("graph-drop-active");
    }
    return target;
  }

  function requestFromDrag(state, target) {
    return {
      unitProcedureIndex: state.unitProcedureIndex,
      operationIndex: state.operationIndex,
      sourceRecipeElementId: state.sourceRecipeElementId,
      destination: {
        type: target.dataset.movementDestination,
        transitionId: target.dataset.transitionId,
        anchorRecipeElementId: target.dataset.anchorRecipeElementId,
        forkRecipeElementId: target.dataset.forkRecipeElementId,
        laneIndex: target.dataset.laneIndex,
      },
    };
  }

  var dragState = null;

  document.addEventListener(
    "pointerdown",
    function (event) {
      var handle =
        event.target &&
        event.target.closest &&
        event.target.closest(".movement-phase-drag-handle");
      if (!handle || event.button !== 0) {
        return;
      }

      dragState = {
        pointerId: event.pointerId,
        handle: handle,
        unitProcedureIndex: Number(handle.dataset.phaseU),
        operationIndex: Number(handle.dataset.phaseO),
        sourceRecipeElementId: String(handle.dataset.phaseId),
        startX: event.clientX,
        startY: event.clientY,
        started: false,
      };
      if (handle.setPointerCapture) {
        handle.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
    },
    true,
  );

  document.addEventListener(
    "pointermove",
    function (event) {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      var horizontal = event.clientX - dragState.startX;
      var vertical = event.clientY - dragState.startY;
      if (
        !dragState.started &&
        horizontal * horizontal + vertical * vertical >= 16
      ) {
        dragState.started = true;
        dragState.handle.classList.add("graph-dragging");
        document.body.classList.add("graph-move-dragging");
      }

      if (dragState.started) {
        activateTarget(event.clientX, event.clientY);
        event.preventDefault();
      }
    },
    true,
  );

  document.addEventListener(
    "pointerup",
    function (event) {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      var state = dragState;
      var target = state.started
        ? activateTarget(event.clientX, event.clientY)
        : null;
      state.handle.classList.remove("graph-dragging");
      dragState = null;

      if (target) {
        window.requestPhaseMove(requestFromDrag(state, target));
      }
      clearDragState();
    },
    true,
  );

  document.addEventListener(
    "pointercancel",
    function () {
      dragState = null;
      clearDragState();
    },
    true,
  );
})();

/* ==========================================================================
 * Former file: js/branch-utils.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// ============================================================================
// BRANCH UTILITIES - Computation and manipulation of branch structures
// ============================================================================

/**
 * Build branch structure from operation links.
 * Returns a structured view of branches for rendering.
 * CORRECTED: Handles multiple ToID elements (not array-based) for Aveva compatibility.
 */
function computeBranchStructure(op) {
  var result = {
    hasFork: false,
    forkSource: null, // Phase where branch splits
    forkTargets: [], // Entry points [BranchA, BranchB]
    hasConvergence: false,
    convergenceTarget: null, // Phase where branches join
    convergenceSources: [], // Exit points [BranchA, BranchB]
    branches: {
      A: { entry: null, phases: [], exit: null },
      B: { entry: null, phases: [], exit: null },
    },
    linearPhases: [], // Phases outside branches
  };

  if (!op.Links || op.Links.length === 0) {
    result.linearPhases = op.phases.map(function (p) {
      return p.label;
    });
    return result;
  }

  // Build forward control link map
  var ctrlFwd = {}; // from -> to
  var ctrlBack = {}; // to -> from

  op.Links.forEach(function (l) {
    if (l.LinkType === "ControlLink" && l.FromID && l.ToID) {
      var fromVal = l.FromID.FromIDValue;
      var toVal = l.ToID.ToIDValue;
      if (fromVal && toVal) {
        ctrlFwd[fromVal] = toVal;
        ctrlBack[toVal] = fromVal;
      }
    }
  });

  // Find ParallelDivergent (fork) - look for Link with multiple ToID properties
  var forkLink = op.Links.find(function (l) {
    return l.LinkType === "ParallelDivergent";
  });

  if (!forkLink) {
    result.linearPhases = op.phases.map(function (p) {
      return p.label;
    });
    return result;
  }

  result.hasFork = true;

  // Handle FromID (single)
  if (forkLink.FromID && forkLink.FromID.FromIDValue) {
    result.forkSource = forkLink.FromID.FromIDValue;
  }

  // Handle multiple ToID elements (NOT an array - multiple properties)
  // Look for ToID, ToID_1, ToID_2, etc.
  var forkTargets = [];
  if (forkLink.ToID && forkLink.ToID.ToIDValue) {
    forkTargets.push(forkLink.ToID.ToIDValue);
  }
  // Check for additional ToID properties
  var idx = 1;
  while (forkLink["ToID_" + idx] && forkLink["ToID_" + idx].ToIDValue) {
    forkTargets.push(forkLink["ToID_" + idx].ToIDValue);
    idx++;
  }

  if (forkTargets.length >= 2) {
    result.forkTargets = forkTargets;
  } else {
    // Not a proper parallel branch
    result.linearPhases = op.phases.map(function (p) {
      return p.label;
    });
    return result;
  }

  // Find ParallelConvergent (convergence) - look for Link with multiple FromID properties
  var convLink = op.Links.find(function (l) {
    return l.LinkType === "ParallelConvergent";
  });

  if (convLink) {
    result.hasConvergence = true;

    // Handle ToID (single)
    if (convLink.ToID && convLink.ToID.ToIDValue) {
      result.convergenceTarget = convLink.ToID.ToIDValue;
    }

    // Handle multiple FromID elements (NOT an array - multiple properties)
    var convSources = [];
    if (convLink.FromID && convLink.FromID.FromIDValue) {
      convSources.push(convLink.FromID.FromIDValue);
    }
    // Check for additional FromID properties
    var idx = 1;
    while (convLink["FromID_" + idx] && convLink["FromID_" + idx].FromIDValue) {
      convSources.push(convLink["FromID_" + idx].FromIDValue);
      idx++;
    }

    if (convSources.length >= 2) {
      result.convergenceSources = convSources;
    }
  }

  // TRACE BRANCHES
  var convergenceSet = {};
  result.convergenceSources.forEach(function (s) {
    convergenceSet[s] = true;
  });

  // Validate we have both branch entry points
  if (result.forkTargets.length >= 2) {
    // Branch A
    result.branches["A"].entry = result.forkTargets[0];
    var curA = result.forkTargets[0];
    var visited = {};

    while (curA && !convergenceSet[curA] && !visited[curA]) {
      visited[curA] = true;
      result.branches["A"].phases.push(curA);
      var next = ctrlFwd[curA];
      if (!next || convergenceSet[next]) {
        result.branches["A"].exit = curA;
        break;
      }
      curA = next;
      if (result.branches["A"].phases.length > 50) break; // Safety
    }

    // Branch B
    result.branches["B"].entry = result.forkTargets[1];
    var curB = result.forkTargets[1];
    visited = {};

    while (curB && !convergenceSet[curB] && !visited[curB]) {
      visited[curB] = true;
      result.branches["B"].phases.push(curB);
      var next = ctrlFwd[curB];
      if (!next || convergenceSet[next]) {
        result.branches["B"].exit = curA;
        break;
      }
      curB = next;
      if (result.branches["B"].phases.length > 50) break; // Safety
    }
  }

  // Build linear phases list (phases not in any branch)
  var allBranchPhases = {};
  result.branches["A"].phases.forEach(function (p) {
    allBranchPhases[p] = true;
  });
  result.branches["B"].phases.forEach(function (p) {
    allBranchPhases[p] = true;
  });

  op.phases.forEach(function (p) {
    if (!allBranchPhases[p.label] && p.label !== result.forkSource) {
      result.linearPhases.push(p.label);
    }
  });

  return result;
}

/**
 * Determine which branch a phase belongs to.
 * Returns 'A', 'B', or null (not in a branch / linear)
 */
function getPhaseBranch(op, phaseLabel) {
  var structure = computeBranchStructure(op);
  if (!structure.hasFork) return null;

  if (structure.branches["A"].phases.indexOf(phaseLabel) >= 0) return "A";
  if (structure.branches["B"].phases.indexOf(phaseLabel) >= 0) return "B";
  return null;
}

/**
 * Find the last phase in a branch.
 */
function getLastPhaseInBranch(op, branchId) {
  var structure = computeBranchStructure(op);
  var branchPhases = structure.branches[branchId].phases;
  if (branchPhases.length === 0) return null;
  return branchPhases[branchPhases.length - 1];
}

/**
 * Trace phases from start label following ControlLinks.
 * Returns array of phase labels in order.
 */
function traceForwardFrom(op, startLabel, stopAt) {
  var ctrlFwd = {};
  op.Links.forEach(function (l) {
    if (l.LinkType === "ControlLink" && l.FromID && l.ToID) {
      ctrlFwd[l.FromID.FromIDValue] = l.ToID.ToIDValue;
    }
  });

  var result = [];
  var cur = startLabel;
  var stopSet = {};
  if (Array.isArray(stopAt)) {
    stopAt.forEach(function (s) {
      stopSet[s] = true;
    });
  } else if (stopAt) {
    stopSet[stopAt] = true;
  }

  while (cur && !stopSet[cur]) {
    result.push(cur);
    cur = ctrlFwd[cur];
    if (result.length > 100) break; // Safety
  }

  return result;
}

// ============================================================================
// BRANCH CREATION FUNCTIONS - CORRECTED for Aveva XML schema
// ============================================================================

/**
 * CREATE BRANCH - Insert a new parallel branch after a phase.
 * Creates the **multiple ToID elements** structure for Aveva compatibility.
 * This is the KEY FIX: uses ToID, ToID_1 instead of ToID: [...]
 */
function createBranchAfter(op, afterPhaseLabel, processId) {
  // Find the ControlLink from afterPhaseLabel
  var linkIdx = -1;
  for (var i = 0; i < op.Links.length; i++) {
    if (
      op.Links[i].LinkType === "ControlLink" &&
      op.Links[i].FromID &&
      op.Links[i].FromID.FromIDValue === afterPhaseLabel
    ) {
      linkIdx = i;
      break;
    }
  }

  if (linkIdx < 0) {
    console.error("No outgoing link from phase:", afterPhaseLabel);
    return false;
  }

  var oldLink = op.Links[linkIdx];
  var oldTarget = oldLink.ToID.ToIDValue;

  // Create two new phases for branch entry points
  var timestamp = Date.now();
  var branchAId = "branchA_" + timestamp;
  var branchBId = "branchB_" + timestamp;

  var newPhaseA = {
    label: "BranchA_" + timestamp,
    phase_type: "Process",
    _reId: branchAId,
    params: [],
  };

  var newPhaseB = {
    label: "BranchB_" + timestamp,
    phase_type: "Process",
    _reId: branchBId,
    params: [],
  };

  op.phases.push(newPhaseA);
  op.phases.push(newPhaseB);

  // Remove old ControlLink
  op.Links.splice(linkIdx, 1);

  // Add ParallelDivergent link with **MULTIPLE ToID elements**
  // CORRECT STRUCTURE: Single Link with ToID, ToID_1 as separate properties
  var divergentLink = {
    ID: "link_dv_" + timestamp,
    LinkType: "ParallelDivergent",
    FromID: {
      FromIDValue: afterPhaseLabel,
      FromType: "Step",
      IDScope: "Internal",
    },
    ToID: { ToIDValue: branchAId, ToType: "Step", IDScope: "Internal" },
  };

  // Add second ToID as separate property (ToID_1)
  // This creates the structure: { ToID: {...}, ToID_1: {...} }
  divergentLink.ToID_1 = {
    ToIDValue: branchBId,
    ToType: "Step",
    IDScope: "Internal",
  };

  op.Links.push(divergentLink);

  // Add ControlLinks from each branch entry to old target
  op.Links.push({
    ID: "link_cl_a_" + timestamp,
    LinkType: "ControlLink",
    FromID: { FromIDValue: branchAId, FromType: "Step", IDScope: "Internal" },
    ToID: { ToIDValue: oldTarget, ToType: "Step", IDScope: "Internal" },
  });

  op.Links.push({
    ID: "link_cl_b_" + timestamp,
    LinkType: "ControlLink",
    FromID: { FromIDValue: branchBId, FromType: "Step", IDScope: "Internal" },
    ToID: { ToIDValue: oldTarget, ToType: "Step", IDScope: "Internal" },
  });

  return true;
}

// ============================================================================
// BRANCH MANIPULATION FUNCTIONS - CORRECTED for Aveva XML schema
// ============================================================================

/**
 * INSERT PHASE INTO BRANCH - Add a new phase to a specific branch.
 * CORRECTED: Handles multiple FromID elements (not arrays) for Aveva compatibility.
 */
function insertPhaseIntoBranch(op, branchId, newPhase) {
  var structure = computeBranchStructure(op);
  if (!structure.hasFork) {
    console.error("No branch exists");
    return false;
  }

  var branch = structure.branches[branchId];

  // If branch is empty (just entry), insert after entry
  var insertAfter =
    branch.phases.length > 0
      ? branch.phases[branch.phases.length - 1] // Last phase in branch
      : branch.entry; // Entry point

  // Find the link pointing away from insertAfter
  var linkIdx = -1;
  var linkToUpdate = null;
  for (var i = 0; i < op.Links.length; i++) {
    var l = op.Links[i];
    if (
      l.LinkType === "ControlLink" &&
      l.FromID &&
      l.FromID.FromIDValue === insertAfter
    ) {
      linkIdx = i;
      linkToUpdate = l;
      break;
    }
  }

  if (linkIdx < 0) {
    // No ControlLink - might be pointing directly to convergence
    // Check for ParallelConvergent where this phase is a source
    for (var i = 0; i < op.Links.length; i++) {
      var l = op.Links[i];
      if (l.LinkType === "ParallelConvergent") {
        // Check multiple FromID properties (not array)
        var hasFrom = false;
        if (l.FromID && l.FromID.FromIDValue === insertAfter) {
          hasFrom = true;
        } else {
          var idx = 1;
          while (l["FromID_" + idx] && !hasFrom) {
            if (l["FromID_" + idx].FromIDValue === insertAfter) {
              hasFrom = true;
            }
            idx++;
          }
        }

        if (hasFrom) {
          linkIdx = i;
          linkToUpdate = l;
          break;
        }
      }
    }
  }

  if (linkIdx < 0) {
    console.error("Cannot find link from phase:", insertAfter);
    return false;
  }

  op.phases.push(newPhase);

  // Update the link
  if (linkToUpdate.LinkType === "ControlLink") {
    var oldTarget = linkToUpdate.ToID.ToIDValue;
    linkToUpdate.ToID.ToIDValue = newPhase.label;

    // Add new link from new phase to old target
    op.Links.push({
      ID: "link_cl_" + Date.now(),
      LinkType: "ControlLink",
      FromID: {
        FromIDValue: newPhase.label,
        FromType: "Step",
        IDScope: "Internal",
      },
      ToID: { ToIDValue: oldTarget, ToType: "Step", IDScope: "Internal" },
    });
  } else if (linkToUpdate.LinkType === "ParallelConvergent") {
    // Find the source index in multiple FromID properties
    var foundIdx = -1;
    var foundProp = null;

    if (
      linkToUpdate.FromID &&
      linkToUpdate.FromID.FromIDValue === insertAfter
    ) {
      foundIdx = 0;
      foundProp = "FromID";
    } else {
      var idx = 1;
      while (linkToUpdate["FromID_" + idx] && foundIdx < 0) {
        if (linkToUpdate["FromID_" + idx].FromIDValue === insertAfter) {
          foundIdx = idx;
          foundProp = "FromID_" + idx;
        }
        idx++;
      }
    }

    if (foundIdx >= 0) {
      var convTarget = linkToUpdate.ToID.ToIDValue;

      // Remove this phase from convergence (set to null temporarily)
      if (foundProp === "FromID") {
        linkToUpdate.FromID = {
          FromIDValue: null,
          FromType: "Step",
          IDScope: "Internal",
        };
      } else {
        linkToUpdate[foundProp] = {
          FromIDValue: null,
          FromType: "Step",
          IDScope: "Internal",
        };
      }

      // Add ControlLink from insertAfter to new phase
      op.Links.push({
        ID: "link_cl_" + Date.now(),
        LinkType: "ControlLink",
        FromID: {
          FromIDValue: insertAfter,
          FromType: "Step",
          IDScope: "Internal",
        },
        ToID: {
          ToIDValue: newPhase.label,
          ToType: "Step",
          IDScope: "Internal",
        },
      });

      // Add new phase to convergence
      // Find first available slot
      if (linkToUpdate.FromID && !linkToUpdate.FromID.FromIDValue) {
        linkToUpdate.FromID = {
          FromIDValue: newPhase.label,
          FromType: "Step",
          IDScope: "Internal",
        };
      } else {
        var idx = 1;
        while (
          linkToUpdate["FromID_" + idx] &&
          linkToUpdate["FromID_" + idx].FromIDValue
        ) {
          idx++;
        }
        linkToUpdate["FromID_" + idx] = {
          FromIDValue: newPhase.label,
          FromType: "Step",
          IDScope: "Internal",
        };
      }
    }
  }

  return true;
}

/**
 * CLOSE BRANCH - Create convergence at a specific phase.
 * The phase becomes the convergence target.
 * CORRECTED: Handles multiple FromID elements (not arrays) for Aveva compatibility.
 */
function closeBranchBefore(op, convergencePhaseLabel) {
  var structure = computeBranchStructure(op);
  if (!structure.hasFork) {
    console.error("No open branch to close");
    return false;
  }

  if (structure.hasConvergence) {
    console.error("Branch already closed");
    return false;
  }

  // Find what points to convergencePhaseLabel
  var sources = [];
  for (var i = op.Links.length - 1; i >= 0; i--) {
    var l = op.Links[i];

    // Check ControlLink
    if (
      l.LinkType === "ControlLink" &&
      l.ToID &&
      l.ToID.ToIDValue === convergencePhaseLabel
    ) {
      sources.push({
        FromIDValue: l.FromID.FromIDValue,
        FromType: "Step",
        IDScope: "Internal",
      });
      op.Links.splice(i, 1);
    }

    // Check ParallelDivergent - look for multiple ToID properties
    else if (l.LinkType === "ParallelDivergent" && l.FromID) {
      var targetFound = false;

      // Check ToID
      if (l.ToID && l.ToID.ToIDValue === convergencePhaseLabel) {
        targetFound = true;
      } else {
        // Check ToID_1, ToID_2, etc.
        var idx = 1;
        while (l["ToID_" + idx] && !targetFound) {
          if (l["ToID_" + idx].ToIDValue === convergencePhaseLabel) {
            targetFound = true;
          }
          idx++;
        }
      }

      if (targetFound) {
        sources.push({
          FromIDValue: l.FromID.FromIDValue,
          FromType: "Step",
          IDScope: "Internal",
        });
      }
    }
  }

  if (sources.length < 2) {
    console.error("Need at least 2 sources for convergence, found:", sources);
    return false;
  }

  // Create ParallelConvergent link with multiple FromID properties (not array)
  var convLink = {
    ID: "link_cv_" + Date.now(),
    LinkType: "ParallelConvergent",
    FromID: {
      FromIDValue: sources[0].FromIDValue,
      FromType: "Step",
      IDScope: "Internal",
    },
    ToID: {
      ToIDValue: convergencePhaseLabel,
      ToType: "Step",
      IDScope: "Internal",
    },
  };

  // Add additional FromID as separate properties
  for (var s = 1; s < sources.length; s++) {
    convLink["FromID_" + s] = {
      FromIDValue: sources[s].FromIDValue,
      FromType: "Step",
      IDScope: "Internal",
    };
  }

  op.Links.push(convLink);

  return true;
}

// ============================================================================
// Helper function - used by lane.js during branch creation
// ============================================================================

/**
 * Attempts to create a branch in an operation at the last phase.
 * This is called by the UI when user clicks "Add Branch Lane"
 */
function addBranchToOp(u, o) {
  currentRecipeData._structuralEdit = true;
  var up = currentRecipeData.unit_procedures[u];
  var op = up.operations[o];

  // Initialize Links array if needed
  if (!op.Links) op.Links = [];

  // Find the last phase in the operation
  var lastPhase = op.phases.length > 0 ? op.phases[op.phases.length - 1] : null;

  if (!lastPhase) {
    alert("Cannot create branch in empty operation. Add a phase first.");
    return;
  }

  // Use createBranchAfter for proper structure
  var success = createBranchAfter(op, lastPhase.label);

  if (success) {
    renderAll();
    alert(
      "Branch created successfully! Branch A and Branch B are now parallel.",
    );
  }
}

// Export for use in node.js context
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    computeBranchStructure: computeBranchStructure,
    getPhaseBranch: getPhaseBranch,
    getLastPhaseInBranch: getLastPhaseInBranch,
    traceForwardFrom: traceForwardFrom,
    createBranchAfter: createBranchAfter,
    insertPhaseIntoBranch: insertPhaseIntoBranch,
    closeBranchBefore: closeBranchBefore,
  };
}

// ============================================================================
// Stage 2 — ID-based linear insertion helpers
// ============================================================================
// Insert a phase after a specific Phase RecipeElement ID. The outgoing
// ControlLink is rewired by identity, never by display label.
function insertPhaseAfter(op, afterReId, newPhase) {
  var outgoing = null;
  for (var i = 0; i < op.links.length; i++) {
    var link = op.links[i];
    if (
      link.type === "ControlLink" &&
      link.from_type === "Step" &&
      link.from_re_id === afterReId
    ) {
      outgoing = link;
      break;
    }
  }
  if (!outgoing) {
    console.error(
      "Cannot find outgoing ControlLink from RecipeElement",
      afterReId,
    );
    return false;
  }
  var index = -1;
  for (var p = 0; p < op.phases.length; p++)
    if (op.phases[p]._reId === afterReId) {
      index = p;
      break;
    }
  if (index < 0) {
    console.error("Cannot find phase to insert after", afterReId);
    return false;
  }
  var oldLabel = outgoing.to,
    oldStepId = outgoing.to_id,
    oldReId = outgoing.to_re_id,
    oldType = outgoing.to_type;
  outgoing.to = newPhase.label;
  outgoing.to_id = "";
  outgoing.to_re_id = newPhase._reId;
  outgoing.to_type = "Step";
  op.links.push({
    type: "ControlLink",
    from: newPhase.label,
    from_id: "",
    from_re_id: newPhase._reId,
    from_type: "Step",
    to: oldLabel,
    to_id: oldStepId || "",
    to_re_id: oldReId || "",
    to_type: oldType || "Step",
  });
  op.phases.splice(index + 1, 0, newPhase);
  return true;
}

// Append to a linear operation. If it already has phases, use the final phase;
// otherwise replace the existing Begin -> End ControlLink.
function appendPhaseToOperation(op, newPhase) {
  if (op.phases.length)
    return insertPhaseAfter(
      op,
      op.phases[op.phases.length - 1]._reId,
      newPhase,
    );
  var beginId = op._beginReId,
    outgoing = null;
  for (var i = 0; i < op.links.length; i++) {
    var link = op.links[i];
    if (
      link.type === "ControlLink" &&
      link.from_type === "Step" &&
      link.from_re_id === beginId
    ) {
      outgoing = link;
      break;
    }
  }
  if (!outgoing) {
    console.error("Cannot find Begin ControlLink for empty operation");
    return false;
  }
  var oldLabel = outgoing.to,
    oldStepId = outgoing.to_id,
    oldReId = outgoing.to_re_id,
    oldType = outgoing.to_type;
  outgoing.to = newPhase.label;
  outgoing.to_id = "";
  outgoing.to_re_id = newPhase._reId;
  outgoing.to_type = "Step";
  op.links.push({
    type: "ControlLink",
    from: newPhase.label,
    from_id: "",
    from_re_id: newPhase._reId,
    from_type: "Step",
    to: oldLabel,
    to_id: oldStepId || "",
    to_re_id: oldReId || "",
    to_type: oldType || "Step",
  });
  op.phases.push(newPhase);
  return true;
}

/* ==========================================================================
 * Former file: js/branch-display.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// ============================================================================
// branch-display.js - read-only AVEVA branch identification and presentation
// ============================================================================
// Uses RecipeElement IDs exclusively for graph routing. It supports a closed
// Parallel branch (execute All) or Serial branch (execute Single) with two or
// more targets. This module performs no graph editing or XML serialisation.
// A region is accepted only when every fork target reaches the corresponding
// convergent link, which prevents an open branch being drawn as closed.

var BRANCH_DISPLAY_ONLY = true;

function branchDisplayPhaseId(phase) {
  return (phase && (phase._reId || phase.node_id)) || "";
}

function branchDisplayUnique(values) {
  return values.filter(function (value, index) {
    return value && values.indexOf(value) === index;
  });
}

function branchDisplayBoundaryIds(op) {
  var ids = {};
  if (op && op._beginReId) ids[op._beginReId] = "Begin";
  if (op && op._endReId) ids[op._endReId] = "End";
  return ids;
}

function branchDisplayLetter(index) {
  var label = "";
  do {
    label = String.fromCharCode(65 + (index % 26)) + label;
    index = Math.floor(index / 26) - 1;
  } while (index >= 0);
  return label;
}

function collectReadOnlyBranchRegions(op) {
  var links = (op && op.links) || [];
  var phaseIds = {},
    boundaryIds = branchDisplayBoundaryIds(op);
  ((op && op.phases) || []).forEach(function (phase) {
    var id = branchDisplayPhaseId(phase);
    if (id) phaseIds[id] = true;
  });
  function isNode(id) {
    return !!(phaseIds[id] || boundaryIds[id]);
  }

  var controlBySource = {};
  links.forEach(function (link) {
    if (
      link.type === "ControlLink" &&
      link.from_type === "Step" &&
      link.to_type === "Step" &&
      link.from_re_id &&
      link.to_re_id
    ) {
      if (!controlBySource[link.from_re_id])
        controlBySource[link.from_re_id] = [];
      controlBySource[link.from_re_id].push(link.to_re_id);
    }
  });

  var definitions = [
    {
      forkType: "ParallelDivergent",
      joinType: "ParallelConvergent",
      mode: "All",
      family: "Parallel",
    },
    {
      forkType: "SerialDivergent",
      joinType: "SerialConvergent",
      mode: "Single",
      family: "Serial",
    },
  ];
  var regions = [];

  definitions.forEach(function (definition) {
    var forkBySource = {},
      joinsByTarget = {};
    links.forEach(function (link) {
      if (
        link.from_type !== "Step" ||
        link.to_type !== "Step" ||
        !link.from_re_id ||
        !link.to_re_id
      )
        return;
      if (link.type === definition.forkType) {
        if (!forkBySource[link.from_re_id]) forkBySource[link.from_re_id] = [];
        forkBySource[link.from_re_id].push(link.to_re_id);
      }
      if (link.type === definition.joinType) {
        if (!joinsByTarget[link.to_re_id]) joinsByTarget[link.to_re_id] = [];
        joinsByTarget[link.to_re_id].push(link.from_re_id);
      }
    });

    Object.keys(forkBySource).forEach(function (forkSource) {
      var forkTargets = branchDisplayUnique(forkBySource[forkSource]);
      if (
        forkTargets.length < 2 ||
        !isNode(forkSource) ||
        forkTargets.some(function (id) {
          return !phaseIds[id];
        })
      )
        return;

      var lanePaths = [];
      for (var laneIndex = 0; laneIndex < forkTargets.length; laneIndex++) {
        var current = forkTargets[laneIndex],
          path = [],
          seen = {},
          valid = true;
        while (current && !seen[current]) {
          seen[current] = true;
          if (!phaseIds[current]) {
            valid = false;
            break;
          }
          path.push(current);
          var successors = branchDisplayUnique(controlBySource[current] || []);
          if (successors.length === 0) break;
          if (successors.length !== 1) {
            valid = false;
            break;
          }
          current = successors[0];
        }
        if (!valid || !path.length) {
          lanePaths = [];
          break;
        }
        lanePaths.push(path);
      }
      if (lanePaths.length !== forkTargets.length) return;

      var exits = lanePaths.map(function (path) {
        return path[path.length - 1];
      });
      var joinTarget = "";
      Object.keys(joinsByTarget).some(function (target) {
        var joinSources = branchDisplayUnique(joinsByTarget[target]);
        var allLanesJoin = exits.every(function (exit) {
          return joinSources.indexOf(exit) >= 0;
        });
        // An AVEVA convergence belongs to this exact fork only when it closes
        // precisely these N lane exits, not a subset or a neighbouring region.
        if (
          allLanesJoin &&
          joinSources.length === exits.length &&
          isNode(target)
        ) {
          joinTarget = target;
          return true;
        }
        return false;
      });
      if (!joinTarget) return;

      regions.push({
        type: definition.family,
        mode: definition.mode,
        forkType: definition.forkType,
        joinType: definition.joinType,
        forkSource: forkSource,
        forkTargets: forkTargets,
        lanes: lanePaths.map(function (path, index) {
          return {
            label: branchDisplayLetter(index),
            entry: path[0],
            phases: path,
            exit: path[path.length - 1],
          };
        }),
        joinTarget: joinTarget,
        joinSources: exits,
      });
    });
  });
  return regions;
}

function isReadOnlyBranchOperation(op) {
  return collectReadOnlyBranchRegions(op).length > 0;
}

/* ==========================================================================
 * Former file: js/recursive-branch-display.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// recursive-branch-display.js - nested AVEVA branch region discovery for display.
function nestedBranchNodeId(ph) {
  return (ph && (ph._reId || ph.node_id)) || "";
}
function nestedBranchDefs() {
  return [
    { fork: "ParallelDivergent", join: "ParallelConvergent", mode: "All" },
    { fork: "SerialDivergent", join: "SerialConvergent", mode: "Single" },
  ];
}
function nestedBranchUnique(values) {
  return values.filter(function (v, i, a) {
    return v && a.indexOf(v) === i;
  });
}
function nestedBranchDistances(adjacency, start) {
  var dist = {},
    queue = [start];
  dist[start] = 0;
  while (queue.length) {
    var node = queue.shift(),
      next = adjacency[node] || [];
    for (var i = 0; i < next.length; i++)
      if (dist[next[i]] === undefined) {
        dist[next[i]] = dist[node] + 1;
        queue.push(next[i]);
      }
  }
  return dist;
}
function nestedBranchBestMatching(targets, sources, distances) {
  var used = {},
    best = null;
  function walk(index, total, pairs) {
    if (index === targets.length) {
      if (!best || total < best.total)
        best = { total: total, pairs: pairs.slice() };
      return;
    }
    for (var i = 0; i < sources.length; i++) {
      var source = sources[i],
        distance = distances[targets[index]][source];
      if (used[source] || distance === undefined) continue;
      used[source] = true;
      pairs.push(source);
      walk(index + 1, total + distance, pairs);
      pairs.pop();
      delete used[source];
    }
  }
  walk(0, 0, []);
  return best;
}
function collectNestedBranchRegions(op) {
  var links = (op && op.links) || [],
    adjacency = {};
  function add(a, b) {
    if (!a || !b) return;
    (adjacency[a] || (adjacency[a] = [])).push(b);
  }
  function key(link, side) {
    var t = side === "from" ? link.from_type : link.to_type;
    if (t === "Transition")
      return "@T:" + (side === "from" ? link.from_id : link.to_id);
    return t === "Step"
      ? String(
          side === "from"
            ? link.from_re_id || link.from_node
            : link.to_re_id || link.to_node,
        )
      : "";
  }
  links.forEach(function (l) {
    if (l.type === "ControlLink") add(key(l, "from"), key(l, "to"));
  });
  var result = [];
  nestedBranchDefs().forEach(function (def) {
    var forks = {},
      joins = {};
    links.forEach(function (l) {
      if (l.type === def.fork && l.to_type === "Step" && l.to_re_id) {
        var f = key(l, "from"),
          t = key(l, "to");
        if (f) {
          (forks[f] || (forks[f] = [])).push(t);
          add(f, t);
        }
      }
      if (l.type === def.join && l.to_type === "Step" && l.to_re_id) {
        var f = key(l, "from"),
          t = key(l, "to"),
          joinKey = l._linkId || t;
        if (f) {
          if (!joins[joinKey]) joins[joinKey] = { target: t, sources: [] };
          joins[joinKey].sources.push(f);
          add(f, t);
        }
      }
    });
    Object.keys(adjacency).forEach(function (k) {
      adjacency[k] = nestedBranchUnique(adjacency[k]);
    });
    Object.keys(forks).forEach(function (f) {
      var targets = nestedBranchUnique(forks[f]);
      if (targets.length < 2) return;
      var dist = {},
        c = [];
      targets.forEach(function (t) {
        dist[t] = nestedBranchDistances(adjacency, t);
      });
      Object.keys(joins).forEach(function (j) {
        var joinDef = joins[j],
          sources = nestedBranchUnique(joinDef.sources);
        if (sources.length !== targets.length) return;
        var m = nestedBranchBestMatching(targets, sources, dist);
        if (m)
          c.push({
            joinTarget: joinDef.target,
            joinSources: sources,
            total: m.total,
            joinLinkId: j,
          });
      });
      c.sort(function (x, y) {
        return x.total - y.total;
      });
      if (c.length)
        result.push({
          forkSource: f,
          targets: targets,
          joinTarget: c[0].joinTarget,
          joinSources: c[0].joinSources,
          mode: def.mode,
          joinType: def.join,
          forkType: def.fork,
        });
    });
  });
  return result;
}

/* ==========================================================================
 * Former file: js/nested-branch-render.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// nested-branch-render.js - recursive visual rendering for nested AVEVA branches.
// Stage 6B.3: nested regions are owned by one specific parent lane before any HTML is emitted.
function nestedUnique(values) {
  return values.filter(function (v, i, a) {
    return v && a.indexOf(v) === i;
  });
}
function nestedControlSuccessors(op, id) {
  var links = (op && op.links) || [],
    out = [];
  links.forEach(function (link) {
    // A child fork can sit immediately after an enclosing Parallel/Serial join
    // (native Simple9). Follow that convergent continuation for containment;
    // `Other` stays excluded because it is solely a loop-back leg.
    if (
      (link.type !== "ControlLink" &&
        link.type !== "ParallelConvergent" &&
        link.type !== "SerialConvergent") ||
      link.from_type !== "Step" ||
      link.from_re_id !== id
    )
      return;
    if (link.to_type === "Step" && link.to_re_id) out.push(link.to_re_id);
    // A Transition is an inline node. Follow only its normal ControlLink exit;
    // never follow its Other loop leg during forward layout traversal.
    if (link.to_type === "Transition" && link.to_id)
      links.forEach(function (exit) {
        if (
          (exit.type === "ControlLink" ||
            exit.type === "ParallelConvergent" ||
            exit.type === "SerialConvergent") &&
          exit.from_type === "Transition" &&
          exit.from_id === link.to_id &&
          exit.to_type === "Step" &&
          exit.to_re_id
        )
          out.push(exit.to_re_id);
      });
  });
  return nestedUnique(out);
}
function nestedPhaseHtml(op, id, up, u, o, transAfter, loopBacks) {
  var found = lanePhaseById(op, id);
  if (!found) return "";
  var moves =
    typeof movementArrowCapabilities === "function"
      ? movementArrowCapabilities(op, id)
      : { up: false, down: false };
  return buildLanePhaseHtml(
    found.phase,
    up,
    u,
    o,
    found.index,
    transAfter,
    loopBacks,
    true,
    moves,
    true,
  );
}

/* Build a true containment tree. A child may be rendered only by the lane that reaches
   its fork before the parent region's corresponding join source. */
function nestedRegionHierarchy(op) {
  var regions = collectNestedBranchRegions(op),
    byFork = {};
  regions.forEach(function (region) {
    region._parentFork = null;
    region._parentLane = -1;
    region._childrenByLane = [];
    region._childrenBuilt = false;
    byFork[region.forkSource] = region;
  });
  function assignChildren(parent) {
    if (parent._childrenBuilt) return;
    parent._childrenBuilt = true;
    parent.targets.forEach(function (start, laneIndex) {
      var current = start,
        seen = {};
      parent._childrenByLane[laneIndex] = [];
      // After deleting a post-nested Phase (e.g. #41), the parent lane entry
      // #25 can also become its outer join source. Attach the nested fork at
      // that entry before the join-stop rule, otherwise its lanes are rendered
      // as loose linear cards inside Branch A.
      var entryChild = byFork[start];
      if (
        entryChild &&
        entryChild !== parent &&
        entryChild._parentFork === null
      ) {
        entryChild._parentFork = parent.forkSource;
        entryChild._parentLane = laneIndex;
        parent._childrenByLane[laneIndex].push(entryChild);
        assignChildren(entryChild);
      }
      while (
        current &&
        !seen[current] &&
        parent.joinSources.indexOf(current) < 0
      ) {
        seen[current] = true;
        var child = byFork[current];
        if (child && child !== parent) {
          // First enclosing lane owns the child; never re-parent it from another reachability path.
          if (child._parentFork === null) {
            child._parentFork = parent.forkSource;
            child._parentLane = laneIndex;
            parent._childrenByLane[laneIndex].push(child);
            assignChildren(child);
          }
          current = child.joinTarget;
          continue;
        }
        var next = nestedControlSuccessors(op, current);
        if (next.length !== 1) break;
        current = next[0];
      }
      // A native continuation DUMMY immediately after this region's join may be
      // the source of the next fork (Simple8/9). The lane walk stops at its join
      // source by design, so attach that child explicitly at the join boundary.
      if (parent.joinSources.indexOf(current) >= 0) {
        var postJoinChild = byFork[parent.joinTarget];
        if (
          postJoinChild &&
          postJoinChild !== parent &&
          postJoinChild._parentFork === null
        ) {
          // This is a subsequent main-path fork after a Join, not a child inside
          // this lane. Parent ownership prevents duplicate roots; the explicit
          // relation keeps its UI label and deletion semantics separate.
          postJoinChild._parentFork = parent.forkSource;
          postJoinChild._parentLane = -1;
          postJoinChild._relation = "subsequent";
          assignChildren(postJoinChild);
        }
      }
    });
  }
  regions.forEach(function (region) {
    assignChildren(region);
  });
  // Apply native join-continuation ownership independently of traversal order.
  // A fork at another region's join target (Simple8/Simple9 #72) is never a
  // second root: it is rendered exactly once after that enclosing Join.
  regions.forEach(function (child) {
    var parent = regions.filter(function (candidate) {
      return (
        candidate !== child &&
        String(candidate.joinTarget) === String(child.forkSource)
      );
    })[0];
    // Join continuation is stronger than traversal/discovery order. Always
    // sequence this fork after its owning join; never leave it as a root or
    // lane-nested child because the result is a duplicate/reversed display.
    if (parent) {
      child._parentFork = parent.forkSource;
      child._parentLane = -1;
      child._relation = "subsequent";
    }
  });
  return {
    regions: regions,
    byFork: byFork,
    roots: regions.filter(function (region) {
      return region._parentFork === null;
    }),
  };
}
function nestedTransitionCard(op, tid, u, o) {
  return typeof transitionNodeHtml === "function"
    ? transitionNodeHtml(op, u, o, tid)
    : '<div class="lane-transition-node">Transition #' + esc(tid) + "</div>";
}
function nestedStepTransition(op, id) {
  return (
    (
      (op.links || []).filter(function (l) {
        return (
          l.type === "ControlLink" &&
          l.from_type === "Step" &&
          l.from_re_id === id &&
          l.to_type === "Transition"
        );
      })[0] || {}
    ).to_id || ""
  );
}
function nestedTransitionStep(op, tid) {
  /* Native Simple9 Transition 9 can exit directly into ParallelDivergent. Other remains excluded because it is only a loop-back annotation. */ return (
    (
      (op.links || []).filter(function (l) {
        return (
          (l.type === "ControlLink" ||
            l.type === "ParallelDivergent" ||
            l.type === "SerialDivergent" ||
            l.type === "ParallelConvergent" ||
            l.type === "SerialConvergent") &&
          l.from_type === "Transition" &&
          l.from_id === tid &&
          l.to_type === "Step"
        );
      })[0] || {}
    ).to_re_id || ""
  );
}
function nestedTransitionChain(op, tid, u, o, stopIds) {
  var links = (op && op.links) || [],
    seen = {},
    h = "",
    current = tid;
  while (current && !seen[current]) {
    seen[current] = true;
    h += nestedTransitionCard(op, current, u, o);
    if (stopIds && stopIds["@T:" + current])
      return { html: h, next: "", stopped: true };
    var next = links.filter(function (link) {
      return (
        link.type !== "Other" &&
        link.from_type === "Transition" &&
        link.from_id === current
      );
    })[0];
    if (!next) return { html: h, next: "" };
    if (next.to_type === "Transition") {
      current = next.to_id;
      continue;
    }
    return { html: h, next: next.to_re_id || "" };
  }
  return { html: h, next: "" };
}
function nestedRenderSequence(
  op,
  start,
  stopIds,
  owner,
  byFork,
  up,
  u,
  o,
  transAfter,
  loopBacks,
  depth,
  consumed,
) {
  var cur = start,
    seen = {},
    h = "";
  while (cur && !seen[cur]) {
    seen[cur] = true;
    consumed[cur] = true;
    var child = byFork[cur],
      atFork = child && child._parentFork === owner.forkSource,
      phaseAtFork = atFork && lanePhaseById(op, cur);
    /* A Phase is the visible source of its nested fork (simple4: Label 2). Only a structural DUMMY fork anchor is hidden. */ if (
      !atFork ||
      (phaseAtFork && !phaseAtFork.phase._dummy)
    )
      h += nestedPhaseHtml(op, cur, up, u, o, transAfter, loopBacks);
    if (stopIds[cur]) break;
    if (atFork) {
      h +=
        '<div class="lane-branch-child-viewport">' +
        renderNestedBranchRegion(
          child,
          op,
          byFork,
          up,
          u,
          o,
          transAfter,
          loopBacks,
          depth + 1,
          consumed,
        ) +
        "</div>";
      cur = child.joinTarget;
      continue;
    }
    var tid = nestedStepTransition(op, cur);
    if (tid) {
      var chain = nestedTransitionChain(op, tid, u, o, stopIds);
      h += chain.html;
      if (chain.stopped) break;
      cur = chain.next;
      continue;
    }
    var next = nestedControlSuccessors(op, cur);
    if (next.length !== 1) break;
    cur = next[0];
  }
  return h;
}

function renderNestedBranchRegion(
  region,
  op,
  byFork,
  up,
  u,
  o,
  transAfter,
  loopBacks,
  depth,
  consumed,
) {
  var isAll = region.mode === "All",
    isSubsequent = region._relation === "subsequent",
    title = isSubsequent ? "Subsequent fork" : depth ? "Nested fork" : "Fork",
    h =
      '<section class="lane-branch lane-branch-readonly lane-branch-' +
      (isAll ? "all" : "single") +
      " " +
      (isSubsequent ? "lane-branch-subsequent" : "lane-branch-nested") +
      '" data-nested-depth="' +
      depth +
      '" data-region-fork="' +
      region.forkSource +
      '" data-parent-fork="' +
      (region._parentFork || "") +
      '">';
  h +=
    '<div class="lane-branch-fork"><span class="lane-branch-symbol">' +
    (isAll ? "⇱" : "◇") +
    "</span><span><strong>" +
    title +
    "</strong> · " +
    (isAll
      ? "Parallel branches · <strong>All</strong>"
      : "Serial branches · <strong>Single</strong>") +
    '</span><span class="lane-branch-mode">' +
    (isAll ? "Execute all" : "Execute one") +
    '</span></div><div class="lane-branch-lanes">';
  for (var i = 0; i < region.targets.length; i++) {
    var stops = {};
    region.joinSources.forEach(function (id) {
      stops[id] = true;
    });
    var laneMenu =
      typeof editMode !== "undefined" &&
      editMode &&
      typeof branchLaneDeleteMenuHtml === "function"
        ? '<span class="act-bar">' +
          branchLaneDeleteMenuHtml(u, o, region.forkSource, i) +
          "</span>"
        : "";
    h +=
      '<div class="lane-branch-lane" data-parent-fork="' +
      region.forkSource +
      '" data-lane-index="' +
      i +
      '"><div class="lane-branch-label">Branch ' +
      branchDisplayLetter(i) +
      laneMenu +
      "</div>";
    h += nestedRenderSequence(
      op,
      region.targets[i],
      stops,
      region,
      byFork,
      up,
      u,
      o,
      transAfter,
      loopBacks,
      depth,
      consumed,
    );
    if (editMode && typeof movementLaneJoinDropHtml === "function")
      h += movementLaneJoinDropHtml(u, o, region.forkSource, i);
    h += "</div>";
  }
  h +=
    '</div><div class="lane-branch-join"><span class="lane-branch-symbol">⇲</span><span><strong>' +
    (depth ? "Nested join" : "Join") +
    "</strong> · " +
    (isAll ? "Parallel" : "Serial") +
    " convergent</span>" +
    (typeof editMode !== "undefined" &&
    editMode &&
    typeof universalJoinMenuHtml === "function"
      ? '<span class="act-bar">' +
        universalJoinMenuHtml(u, o, region.forkSource) +
        "</span>"
      : "") +
    "</div></section>";
  // Simple8/9 continuation: the join target can itself be the structural
  // DUMMY source of the next fork. Emit that connector and child region once,
  // here, under the enclosing region—not again as an independent root.
  var postJoinChild = byFork[region.joinTarget];
  if (postJoinChild && postJoinChild._parentFork === region.forkSource) {
    // #72 is a structural join-continuation connector when it immediately
    // feeds the next main-path fork. It must not appear as a loose empty lane
    // between the two regions; the subsequent fork owns that position.
    var continuation = lanePhaseById(op, region.joinTarget);
    if (!consumed[region.joinTarget]) {
      consumed[region.joinTarget] = true;
      if (continuation && continuation.phase && !continuation.phase._dummy)
        h += nestedPhaseHtml(
          op,
          region.joinTarget,
          up,
          u,
          o,
          transAfter,
          loopBacks,
        );
    }

    if (editMode && typeof movementNodeDropHtml === "function")
      h += movementNodeDropHtml(
        u,
        o,
        region.joinTarget,
        "after Join · before Subsequent fork",
      );
    h +=
      '<div class="lane-branch-child-viewport lane-branch-postjoin-child">' +
      renderNestedBranchRegion(
        postJoinChild,
        op,
        byFork,
        up,
        u,
        o,
        transAfter,
        loopBacks,
        depth + 1,
        consumed,
      ) +
      "</div>";
  }
  return h;
}
function nestedRenderPrefixToFork(
  op,
  stopId,
  up,
  u,
  o,
  transAfter,
  loopBacks,
  consumed,
) {
  /* The graph may contain a linear initial path before the first fork. After an
    insertion immediately before a branch, that selected Phase must remain
    visible: Begin -> selected Phase -> inserted Phase/fork. */
  var cur = op._beginReId,
    seen = {},
    h = "";
  while (cur && !seen[cur] && cur !== stopId) {
    seen[cur] = true;
    if (cur !== op._beginReId && !consumed[cur]) {
      consumed[cur] = true;
      h += nestedPhaseHtml(op, cur, up, u, o, transAfter, loopBacks);
    }
    var tid = nestedStepTransition(op, cur);
    if (tid) {
      var chain = nestedTransitionChain(
        op,
        tid,
        u,
        o,
        stopId && stopId.indexOf("@T:") === 0
          ? (function () {
              var x = {};
              x[stopId] = true;
              return x;
            })()
          : null,
      );
      h += chain.html;
      /* A root fork may be Transition-led. After rendering the complete normal chain, the branch renderer owns its targets. */ if (
        chain.stopped
      )
        break;
      cur = chain.next;
      continue;
    }
    var next = nestedControlSuccessors(op, cur);
    if (next.length !== 1) break;
    cur = next[0];
  }
  return h;
}
function renderNestedOperationPhases(op, up, u, o, transAfter, loopBacks) {
  // A surviving Simple10 graph has one valid Transition-led branch after the
  // second Simple9 region is deleted. It must remain in the canonical branch
  // renderer; the linear fallback cannot represent a Transition-origin fork.
  var hierarchy = nestedRegionHierarchy(op);
  if (!hierarchy.roots.length) return "";
  var consumed = {},
    h = '<div class="nested-operation-graph">';
  hierarchy.roots.forEach(function (region, index) {
    /* Render initial linear prefix only before the first root fork. */ if (
      index === 0
    )
      h += nestedRenderPrefixToFork(
        op,
        region.forkSource,
        up,
        u,
        o,
        transAfter,
        loopBacks,
        consumed,
      );
    /* A Join continuation may immediately become the next branch's fork source (Simple8). It has one RecipeElement identity and must render once: after the first Join, before the next fork. */ if (
      region.forkSource !== op._beginReId &&
      !consumed[region.forkSource]
    ) {
      consumed[region.forkSource] = true;
      var rootForkNode = lanePhaseById(op, region.forkSource);
      if (rootForkNode && rootForkNode.phase && !rootForkNode.phase._dummy)
        h += nestedPhaseHtml(
          op,
          region.forkSource,
          up,
          u,
          o,
          transAfter,
          loopBacks,
        );
    }
    h += renderNestedBranchRegion(
      region,
      op,
      hierarchy.byFork,
      up,
      u,
      o,
      transAfter,
      loopBacks,
      0,
      consumed,
    );
    if (region.joinTarget !== op._endReId && !consumed[region.joinTarget]) {
      consumed[region.joinTarget] = true;
      h += nestedPhaseHtml(
        op,
        region.joinTarget,
        up,
        u,
        o,
        transAfter,
        loopBacks,
      );
    }
  });
  return h + "</div>";
}

/* ==========================================================================
 * Former file: js/branch-create.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// ============================================================================
// branch-create.js - Stage 4B: WQE-aligned blank N-way branch lanes
// ============================================================================
// AVEVA represents an empty lane as RecipeElementType Other, OtherValue DUMMY.
// Stage 4B creates a complete closed N-way branch of those DUMMY slots, then
// permits a Phase/Transfer to replace a selected slot or follow a selected
// branch phase. All graph routing is by RecipeElement ID, never display label.

var branchCreateCtx = null;

function branchCreatePhaseId(phase) {
  return (phase && (phase._reId || phase.node_id)) || "";
}
function branchCreateLetter(index) {
  var label = "";
  do {
    label = String.fromCharCode(65 + (index % 26)) + label;
    index = Math.floor(index / 26) - 1;
  } while (index >= 0);
  return label;
}

function branchCreateEndpointExists(op, id) {
  if (!id) return false;
  if (op && (op._beginReId === id || op._endReId === id)) return true;
  return ((op && op.phases) || []).some(function (phase) {
    return branchCreatePhaseId(phase) === id;
  });
}

function branchCreateEligibility(op, anchorId) {
  if (!op || !anchorId) return { ok: false, reason: "Select a phase first." };
  var phases = op.phases || [],
    links = op.links || [],
    phaseIds = {};
  phases.forEach(function (phase) {
    var id = branchCreatePhaseId(phase);
    if (id) phaseIds[id] = true;
  });
  if (!phaseIds[anchorId])
    return {
      ok: false,
      reason: "The selected phase is not in this operation.",
    };
  if (!op._beginReId || !op._endReId)
    return {
      ok: false,
      reason: "The operation has no usable Begin/End boundaries.",
    };
  if (!links.length)
    return { ok: false, reason: "The operation has no ProcedureLogic links." };

  // Creation starts only from one complete, direct control path. Existing
  // branches, transitions, loops, decisions and ambiguous links are deferred.
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    if (
      link.type !== "ControlLink" ||
      link.from_type !== "Step" ||
      link.to_type !== "Step" ||
      !link.from_re_id ||
      !link.to_re_id
    ) {
      return {
        ok: false,
        reason:
          "Branch creation is available only in a fully linear operation.",
      };
    }
    if (
      !branchCreateEndpointExists(op, link.from_re_id) ||
      !branchCreateEndpointExists(op, link.to_re_id)
    ) {
      return {
        ok: false,
        reason: "The operation contains a link with an unknown endpoint.",
      };
    }
  }
  var incoming = {},
    outgoing = {};
  links.forEach(function (link) {
    incoming[link.to_re_id] = (incoming[link.to_re_id] || 0) + 1;
    outgoing[link.from_re_id] = (outgoing[link.from_re_id] || 0) + 1;
  });
  var allIds = [op._beginReId]
    .concat(Object.keys(phaseIds))
    .concat([op._endReId]);
  for (var p = 0; p < allIds.length; p++) {
    var id = allIds[p],
      expectedIn = id === op._beginReId ? 0 : 1,
      expectedOut = id === op._endReId ? 0 : 1;
    if (
      (incoming[id] || 0) !== expectedIn ||
      (outgoing[id] || 0) !== expectedOut
    )
      return {
        ok: false,
        reason: "The operation is not one unambiguous linear path.",
      };
  }
  if (links.length !== phases.length + 1)
    return {
      ok: false,
      reason: "The operation is not one complete linear path.",
    };
  var anchorOutgoing = links.filter(function (link) {
    return link.from_re_id === anchorId;
  });
  if (anchorOutgoing.length !== 1)
    return {
      ok: false,
      reason: "The selected phase has no unique linear successor.",
    };
  var successor = anchorOutgoing[0];
  if (
    successor.to_type !== "Step" ||
    !branchCreateEndpointExists(op, successor.to_re_id)
  )
    return {
      ok: false,
      reason: "The selected phase does not lead to a valid Step successor.",
    };
  return { ok: true, outgoing: successor, successorId: successor.to_re_id };
}

function branchCreateStepLink(type, fromPhase, toLabel, toId, toReId) {
  return {
    type: type,
    from: fromPhase.label || fromPhase._reId,
    from_id: "",
    from_node: fromPhase._reId,
    from_re_id: fromPhase._reId,
    from_type: "Step",
    to: toLabel || "",
    to_id: toId || "",
    to_node: toReId || "",
    to_re_id: toReId || "",
    to_type: "Step",
  };
}

function newBranchDummy() {
  var id = allocateRecipeElementId();
  return {
    _reId: id,
    node_id: id,
    label: "",
    phase_type: "Dummy",
    parent_instance: "",
    description: "",
    params: [],
    _dummy: true,
  };
}

// Ensure every Step endpoint carries its RecipeElement identity before save.
// New branches must never depend on display labels for graph routing.
function normaliseOperationStepEndpoints(op) {
  var byLabel = {},
    known = {};
  if (!op) return;
  [op._beginReId, op._endReId].forEach(function (id) {
    if (id) known[String(id)] = true;
  });
  (op.phases || []).forEach(function (phase) {
    var id = branchCreatePhaseId(phase);
    if (id) {
      known[String(id)] = true;
      if (phase.label) byLabel[phase.label] = id;
    }
  });
  (op.links || []).forEach(function (link) {
    ["from", "to"].forEach(function (side) {
      if (link[side + "_type"] !== "Step") return;
      var rid = link[side + "_re_id"] || link[side + "_node"] || "";
      if (!rid) {
        var label = link[side] || "";
        if (label === "Begin") rid = op._beginReId || "";
        else if (label === "End") rid = op._endReId || "";
        else if (byLabel[label]) rid = byLabel[label];
      }
      if (rid && known[String(rid)]) {
        link[side + "_re_id"] = String(rid);
        link[side + "_node"] = String(rid);
      }
    });
  });
}

function createClosedBlankBranchAfter(op, anchorId, mode, laneCount) {
  var eligibility = branchCreateEligibility(op, anchorId);
  if (!eligibility.ok) return eligibility;
  if (mode !== "All" && mode !== "Single")
    return { ok: false, reason: "Choose All or Single execution." };
  laneCount = parseInt(laneCount, 10);
  if (!laneCount || laneCount < 2)
    return { ok: false, reason: "A branch needs at least two lanes." };
  var anchor = null,
    anchorIndex = -1;
  for (var i = 0; i < op.phases.length; i++)
    if (branchCreatePhaseId(op.phases[i]) === anchorId) {
      anchor = op.phases[i];
      anchorIndex = i;
      break;
    }
  if (!anchor || anchorIndex < 0)
    return { ok: false, reason: "The branch anchor could not be found." };

  var dummies = [];
  for (var lane = 0; lane < laneCount; lane++) dummies.push(newBranchDummy());
  var old = eligibility.outgoing;
  var forkType = mode === "All" ? "ParallelDivergent" : "SerialDivergent";
  var joinType = mode === "All" ? "ParallelConvergent" : "SerialConvergent";
  var additions = [];
  dummies.forEach(function (dummy) {
    additions.push(branchCreateStepLink(forkType, anchor, "", "", dummy._reId));
  });
  dummies.forEach(function (dummy) {
    additions.push(
      branchCreateStepLink(joinType, dummy, old.to, old.to_id, old.to_re_id),
    );
  });

  // One commit: replacing the original direct edge with a complete closed graph.
  op.links = op.links
    .filter(function (link) {
      return link !== old;
    })
    .concat(additions);
  op.phases.splice.apply(op.phases, [anchorIndex + 1, 0].concat(dummies));
  normaliseOperationStepEndpoints(op);
  op._graphEdit = true;
  return {
    ok: true,
    mode: mode,
    laneCount: laneCount,
    anchorId: anchorId,
    successorId: old.to_re_id,
    dummyIds: dummies.map(branchCreatePhaseId),
  };
}

function branchLaneReference(op, phaseId) {
  var regions =
    typeof collectReadOnlyBranchRegions === "function"
      ? collectReadOnlyBranchRegions(op)
      : [];
  for (var regionIndex = 0; regionIndex < regions.length; regionIndex++) {
    var region = regions[regionIndex];
    for (var laneIndex = 0; laneIndex < region.lanes.length; laneIndex++) {
      var lane = region.lanes[laneIndex],
        phaseIndex = lane.phases.indexOf(phaseId);
      if (phaseIndex >= 0)
        return {
          region: region,
          regionIndex: regionIndex,
          lane: lane,
          laneIndex: laneIndex,
          phaseIndex: phaseIndex,
        };
    }
  }
  return null;
}

function branchLanePhase(op, phaseId) {
  phaseId = phaseId === undefined || phaseId === null ? "" : String(phaseId);
  for (var i = 0; i < (op.phases || []).length; i++)
    if (branchCreatePhaseId(op.phases[i]) === phaseId)
      return { phase: op.phases[i], index: i };
  return null;
}

function branchLaneMenuHtml(u, o, phaseId) {
  var op =
      currentRecipeData &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations[o],
    found = branchLanePhase(op, phaseId),
    ref = op && branchLaneReference(op, phaseId);
  if (!found || !ref) return "";
  var label = found.phase._dummy
    ? "Add to empty Branch " + ref.lane.label
    : "Add after Branch " + ref.lane.label + " item";
  return (
    '<div class="act-more" onclick="toggleDD(this,event)"><button class="act-more-btn">⋮</button><div class="dropdown">' +
    '<div class="dd-label">' +
    label +
    "</div>" +
    '<div class="dd-item" onclick="startBranchLaneAdd(' +
    u +
    "," +
    o +
    ",'" +
    phaseId +
    "','Process')\">Insert Process Phase after this node</div>" +
    '<div class="dd-item" onclick="startBranchLaneAdd(' +
    u +
    "," +
    o +
    ",'" +
    phaseId +
    "','Transfer')\">Insert Transfer after this node</div>" +
    '<div class="dd-item" onclick="startBranchLaneAdd(' +
    u +
    "," +
    o +
    ",'" +
    phaseId +
    "','AllocateProcess')\">Insert Allocate Process after this node</div>" +
    '<div class="dd-item" onclick="startBranchLaneAdd(' +
    u +
    "," +
    o +
    ",'" +
    phaseId +
    "','ReleaseProcess')\">Insert Release Process after this node</div>" +
    '<div class="dd-item" onclick="startBranchLaneAdd(' +
    u +
    "," +
    o +
    ",'" +
    phaseId +
    "','AllocateTransfer')\">Insert Allocate Transfer after this node</div>" +
    '<div class="dd-item" onclick="startBranchLaneAdd(' +
    u +
    "," +
    o +
    ",'" +
    phaseId +
    "','ReleaseTransfer')\">Insert Release Transfer after this node</div>" +
    "</div></div>"
  );
}

function startBranchLaneAdd(u, o, phaseId, type) {
  var op =
    currentRecipeData &&
    currentRecipeData.unit_procedures[u] &&
    currentRecipeData.unit_procedures[u].operations[o];
  if (
    !op ||
    !branchLaneReference(op, phaseId) ||
    typeof showPhasePicker !== "function"
  )
    return;
  showPhasePicker(u, o, -1, type, phaseId);
}

function branchSetEndpoint(link, side, phase) {
  var id = branchCreatePhaseId(phase);
  if (side === "from") {
    link.from = phase.label || id;
    link.from_id = "";
    link.from_node = id;
    link.from_re_id = id;
    link.from_type = "Step";
  } else {
    link.to = phase.label || id;
    link.to_id = "";
    link.to_node = id;
    link.to_re_id = id;
    link.to_type = "Step";
  }
}

function insertPhaseIntoBranchLane(op, targetId, newPhase) {
  var ref = branchLaneReference(op, targetId),
    target = branchLanePhase(op, targetId);
  if (!ref || !target || !newPhase)
    return { ok: false, reason: "Select a valid branch lane item." };

  // The AVEVA DUMMY slot is intentionally replaced in place. Its RecipeElement
  // and Step identity stay stable; only Other:DUMMY becomes a Phase.
  if (target.phase._dummy === true && target.phase.phase_type === "Dummy") {
    newPhase._reId = targetId;
    newPhase.node_id = targetId;
    newPhase._replaceDummy = true;
    target.phase = newPhase;
    op.phases[target.index] = newPhase;
    op._graphEdit = true;
    return { ok: true, action: "replace-dummy", phaseId: targetId };
  }

  var links = op.links || [],
    nextId = ref.lane.phases[ref.phaseIndex + 1] || "",
    outgoing = null;
  if (nextId) {
    outgoing = links.filter(function (link) {
      return (
        link.type === "ControlLink" &&
        link.from_type === "Step" &&
        link.to_type === "Step" &&
        link.from_re_id === targetId &&
        link.to_re_id === nextId
      );
    })[0];
    if (!outgoing)
      return {
        ok: false,
        reason: "The selected branch item has no direct lane successor.",
      };
    branchSetEndpoint(outgoing, "to", newPhase);
    links.push(
      branchCreateStepLink(
        "ControlLink",
        target.phase,
        newPhase.label,
        "",
        newPhase._reId,
      ),
    );
  } else {
    outgoing = links.filter(function (link) {
      return (
        link.type === ref.region.joinType &&
        link.from_type === "Step" &&
        link.to_type === "Step" &&
        link.from_re_id === targetId &&
        link.to_re_id === ref.region.joinTarget
      );
    })[0];
    if (!outgoing)
      return {
        ok: false,
        reason: "The selected branch exit has no matching convergent link.",
      };
    branchSetEndpoint(outgoing, "from", newPhase);
    links.push(
      branchCreateStepLink(
        "ControlLink",
        target.phase,
        newPhase.label,
        "",
        newPhase._reId,
      ),
    );
  }
  op.phases.splice(target.index + 1, 0, newPhase);
  op._graphEdit = true;
  return { ok: true, action: "insert-after", phaseId: newPhase._reId };
}

function showBranchCreateDialog(u, o, p) {
  var up = currentRecipeData && currentRecipeData.unit_procedures[u],
    op = up && up.operations[o],
    anchor = op && op.phases[p],
    eligibility = branchCreateEligibility(op, branchCreatePhaseId(anchor));
  if (!eligibility.ok) {
    console.warn("Branch creation not offered:", eligibility.reason);
    return;
  }
  branchCreateCtx = {
    u: u,
    o: o,
    p: p,
    anchorId: branchCreatePhaseId(anchor),
    nodeBranch: true,
  };
  document.getElementById("branchCreateAnchor").textContent =
    "After " +
    (anchor.label || branchCreateCtx.anchorId) +
    "; blank lanes will join before " +
    branchCreateSuccessorName(op, eligibility.successorId) +
    ".";
  document.getElementById("branchCreateError").textContent = "";
  document.getElementById("branchCreateCount").value = "2";
  document.querySelector(
    'input[name="branchCreateMode"][value="All"]',
  ).checked = true;
  renderBranchCreateLanes();
  document.getElementById("branchCreateOverlay").style.display = "block";
  document.getElementById("branchCreateDialog").style.display = "block";
}

function branchCreateSuccessorName(op, id) {
  if (op && id === op._endReId) return "End";
  var found = branchLanePhase(op, id);
  return (found && found.phase.label) || id || "the original successor";
}

function renderBranchCreateLanes() {
  if (!branchCreateCtx) return;
  var count = Math.max(
      2,
      parseInt(document.getElementById("branchCreateCount").value, 10) || 2,
    ),
    h = "";
  document.getElementById("branchCreateCount").value = String(count);
  for (var lane = 0; lane < count; lane++)
    h +=
      '<div class="branch-create-lane"><span>Lane ' +
      branchCreateLetter(lane) +
      '</span><span class="branch-create-empty">Empty AVEVA DUMMY slot</span></div>';
  document.getElementById("branchCreateLanes").innerHTML = h;
}

function confirmBranchCreate() {
  if (!branchCreateCtx) return;
  var op =
    currentRecipeData &&
    currentRecipeData.unit_procedures[branchCreateCtx.u] &&
    currentRecipeData.unit_procedures[branchCreateCtx.u].operations[
      branchCreateCtx.o
    ];
  var selected = document.querySelector(
      'input[name="branchCreateMode"]:checked',
    ),
    mode = selected ? selected.value : "",
    count = parseInt(document.getElementById("branchCreateCount").value, 10),
    error = document.getElementById("branchCreateError");
  var result;
  if (branchCreateCtx.joinBranch) {
    var continuation =
      typeof joinCreateContinuation === "function"
        ? joinCreateContinuation(op, branchCreateCtx.joinFork)
        : { ok: false, reason: "Join continuation creation is unavailable." };
    result = continuation.ok
      ? createBranchAfterNode(op, continuation.continuationId, mode, count)
      : continuation;
  } else
    result = branchCreateCtx.transitionBranch
      ? createBranchAfterTransition(
          op,
          branchCreateCtx.transitionId,
          mode,
          count,
        )
      : createBranchAfterNode(op, branchCreateCtx.anchorId, mode, count);
  if (!result.ok) {
    error.textContent = result.reason;
    return;
  }
  currentRecipeData._structuralEdit = true;
  cancelBranchCreateDialog();
  renderAll();
}

function cancelBranchCreateDialog() {
  var overlay = document.getElementById("branchCreateOverlay"),
    dialog = document.getElementById("branchCreateDialog");
  if (overlay) overlay.style.display = "none";
  if (dialog) dialog.style.display = "none";
  branchCreateCtx = null;
}

// Stage 6I — one insertion primitive for every selectable RecipeElement node.
// It does not classify the node by lane, fork, join or nesting level.
function nodeOutgoingStepLinks(op, nodeId) {
  /* A Phase may be immediately before a fork. Inserting after it moves its divergent links to the new node, retaining the native graph as source -> new node -> fork. */ return (
    (op && op.links) ||
    []
  ).filter(function (link) {
    return (
      link.from_type === "Step" &&
      String(link.from_re_id) === String(nodeId) &&
      link.to_type === "Step" &&
      link.to_re_id &&
      (link.type === "ControlLink" ||
        link.type === "ParallelDivergent" ||
        link.type === "SerialDivergent" ||
        link.type === "ParallelConvergent" ||
        link.type === "SerialConvergent")
    );
  });
}
function insertItemAfterNode(op, nodeId, newPhase) {
  var selected = branchLanePhase(op, nodeId);
  if (!selected || !newPhase)
    return { ok: false, reason: "Select a valid RecipeElement node." };
  var outgoing = nodeOutgoingStepLinks(op, nodeId);
  if (!outgoing.length)
    return {
      ok: false,
      reason: "The selected node has no outgoing Step link.",
    };
  // AVEVA DUMMY is an empty selectable RecipeElement, not an insertion anchor.
  // Its first added item replaces it in place, retaining the same ID and every
  // existing outgoing edge. The replacement therefore remains the editable node.
  if (selected.phase._dummy === true && selected.phase.phase_type === "Dummy") {
    newPhase._reId = nodeId;
    newPhase.node_id = nodeId;
    newPhase._replaceDummy = true;
    op.phases[selected.index] = newPhase;
    normaliseOperationStepEndpoints(op);
    op._graphEdit = true;
    return {
      ok: true,
      action: "replace-dummy-node",
      nodeId: nodeId,
      phaseId: nodeId,
      outgoingCount: outgoing.length,
    };
  }
  // A populated node receives a new node after it. Preserve each original edge
  // type/destination by moving its source to the new item.
  outgoing.forEach(function (link) {
    branchSetEndpoint(link, "from", newPhase);
  });
  op.links.push(
    branchCreateStepLink(
      "ControlLink",
      selected.phase,
      newPhase.label,
      "",
      newPhase._reId,
    ),
  );
  op.phases.splice(selected.index + 1, 0, newPhase);
  normaliseOperationStepEndpoints(op);
  op._graphEdit = true;
  return {
    ok: true,
    action: "insert-after-node",
    nodeId: nodeId,
    phaseId: newPhase._reId,
    outgoingCount: outgoing.length,
  };
}
function startNodeAdd(u, o, nodeId, type) {
  var op =
    currentRecipeData &&
    currentRecipeData.unit_procedures[u] &&
    currentRecipeData.unit_procedures[u].operations[o];
  if (
    !op ||
    !branchLanePhase(op, nodeId) ||
    typeof showPhasePicker !== "function"
  )
    return;
  showPhasePicker(u, o, -1, type, nodeId);
}

// Stage 6R — AVEVA branch-at-node topology, matched to nests3.xml.
// The selected node is the divergent source. New lanes converge to an explicit
// DUMMY connector, which inherits the selected node's original outgoing links.
function branchAfterNodeEligibility(op, nodeId) {
  nodeId = nodeId === undefined || nodeId === null ? "" : String(nodeId);
  var selected = branchLanePhase(op, nodeId);
  if (!selected)
    return { ok: false, reason: "Select a valid RecipeElement node." };
  var outgoing = nodeOutgoingStepLinks(op, nodeId);
  if (!outgoing.length)
    return {
      ok: false,
      reason: "The selected node has no outgoing Step link.",
    };
  return { ok: true, selected: selected, outgoing: outgoing };
}
function createBranchAfterNode(op, nodeId, mode, laneCount) {
  nodeId = nodeId === undefined || nodeId === null ? "" : String(nodeId);
  var e = branchAfterNodeEligibility(op, nodeId);
  if (!e.ok) return e;
  if (mode !== "All" && mode !== "Single")
    return { ok: false, reason: "Choose All or Single execution." };
  laneCount = parseInt(laneCount, 10);
  if (!laneCount || laneCount < 2)
    return { ok: false, reason: "A branch needs at least two lanes." };
  var forkType = mode === "All" ? "ParallelDivergent" : "SerialDivergent",
    joinType = mode === "All" ? "ParallelConvergent" : "SerialConvergent",
    old = e.outgoing.slice(),
    lanes = [],
    additions = [];
  for (var i = 0; i < laneCount; i++) lanes.push(newBranchDummy());
  // simple2: the old route was ControlLink to End, so lane exits converge direct to End.
  var directToEnd =
      old.length === 1 &&
      old[0].type === "ControlLink" &&
      String(old[0].to_re_id) === String(op._endReId),
    rejoin = null;
  if (!directToEnd) {
    // simple4: old route is the parent/outer convergence. Nested lanes first
    // converge to one DUMMY rejoin; that rejoin then replaces the old source.
    rejoin = newBranchDummy();
    rejoin._branchRejoinNode = true;
  }
  lanes.forEach(function (lane) {
    additions.push(
      branchCreateStepLink(forkType, e.selected.phase, "", "", lane._reId),
    );
    if (rejoin)
      additions.push(
        branchCreateStepLink(joinType, lane, "", "", rejoin._reId),
      );
    else
      old.forEach(function (link) {
        additions.push(
          branchCreateStepLink(
            joinType,
            lane,
            link.to,
            link.to_id,
            link.to_re_id,
          ),
        );
      });
  });
  if (rejoin)
    old.forEach(function (link) {
      branchSetEndpoint(link, "from", rejoin);
    });
  else
    op.links = op.links.filter(function (link) {
      return old.indexOf(link) < 0;
    });
  op.links = op.links.concat(additions);
  var insert = [].concat(lanes);
  if (rejoin) insert.push(rejoin);
  op.phases.splice.apply(op.phases, [e.selected.index + 1, 0].concat(insert));
  if (typeof normaliseOperationStepEndpoints === "function")
    normaliseOperationStepEndpoints(op);
  op._graphEdit = true;
  return {
    ok: true,
    action: directToEnd
      ? "create-simple2-branch"
      : "create-simple4-nested-branch",
    nodeId: nodeId,
    laneIds: lanes.map(branchCreatePhaseId),
    rejoinId: rejoin ? rejoin._reId : "",
    mode: mode,
    laneCount: laneCount,
  };
}

function showBranchAfterNodeDialog(u, o, nodeId) {
  nodeId = nodeId === undefined || nodeId === null ? "" : String(nodeId);
  var op =
      currentRecipeData &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations[o],
    e = branchAfterNodeEligibility(op, nodeId);
  if (!e.ok) {
    console.warn("Branch creation not offered:", e.reason);
    return;
  }
  branchCreateCtx = { u: u, o: o, anchorId: nodeId, nodeBranch: true };
  document.getElementById("branchCreateAnchor").textContent =
    "After " +
    (e.selected.phase.label || nodeId) +
    "; new lanes converge into the original route.";
  document.getElementById("branchCreateError").textContent = "";
  document.getElementById("branchCreateCount").value = "2";
  document.querySelector(
    'input[name="branchCreateMode"][value="All"]',
  ).checked = true;
  renderBranchCreateLanes();
  document.getElementById("branchCreateOverlay").style.display = "block";
  document.getElementById("branchCreateDialog").style.display = "block";
}

// Stage 6V.1 — the same AVEVA branch topology is valid after a Transition.
// The Transition remains the divergent source; lane DUMMYs converge to an
// explicit connector which inherits the Transition's former normal exit(s).
function transitionBranchStepLink(type, tid, toReId) {
  return {
    type: type,
    from: "TRANS:" + tid,
    from_id: tid,
    from_node: "",
    from_re_id: "",
    from_type: "Transition",
    to: "",
    to_id: "",
    to_node: toReId,
    to_re_id: toReId,
    to_type: "Step",
  };
}
function branchAfterTransitionEligibility(op, tid) {
  if (!op || !tid) return { ok: false, reason: "Select a valid Transition." };
  var exits = (op.links || []).filter(function (link) {
    return (
      link.from_type === "Transition" &&
      link.from_id === tid &&
      link.type !== "Other" &&
      link.to_type === "Step" &&
      link.to_re_id
    );
  });
  if (!exits.length)
    return { ok: false, reason: "The Transition has no onward Step exit." };
  return { ok: true, outgoing: exits };
}
function createBranchAfterTransition(op, tid, mode, laneCount) {
  var e = branchAfterTransitionEligibility(op, tid);
  if (!e.ok) return e;
  if (mode !== "All" && mode !== "Single")
    return { ok: false, reason: "Choose All or Single execution." };
  laneCount = parseInt(laneCount, 10);
  if (!laneCount || laneCount < 2)
    return { ok: false, reason: "A branch needs at least two lanes." };
  var forkType = mode === "All" ? "ParallelDivergent" : "SerialDivergent",
    joinType = mode === "All" ? "ParallelConvergent" : "SerialConvergent",
    lanes = [],
    connector = newBranchDummy(),
    additions = [];
  connector._branchJoinConnector = true;
  for (var i = 0; i < laneCount; i++) lanes.push(newBranchDummy());
  lanes.forEach(function (lane) {
    additions.push(transitionBranchStepLink(forkType, tid, lane._reId));
    additions.push(
      branchCreateStepLink(joinType, lane, "", "", connector._reId),
    );
  });
  e.outgoing.forEach(function (link) {
    branchSetEndpoint(link, "from", connector);
  });
  op.links = op.links.concat(additions);
  op.phases.push.apply(op.phases, lanes.concat([connector]));
  op._graphEdit = true;
  return {
    ok: true,
    action: "create-branch-after-transition",
    transitionId: tid,
    mode: mode,
    laneCount: laneCount,
    laneIds: lanes.map(branchCreatePhaseId),
    connectorId: connector._reId,
    outgoingCount: e.outgoing.length,
  };
}
function showBranchAfterTransitionDialog(u, o, tid) {
  var op =
      currentRecipeData &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations[o],
    e = branchAfterTransitionEligibility(op, tid);
  if (!e.ok) {
    console.warn("Transition branch creation not offered:", e.reason);
    return;
  }
  branchCreateCtx = { u: u, o: o, transitionId: tid, transitionBranch: true };
  document.getElementById("branchCreateAnchor").textContent =
    "After Transition #" +
    tid +
    "; new lanes converge into the Transition’s original exit route.";
  document.getElementById("branchCreateError").textContent = "";
  document.getElementById("branchCreateCount").value = "2";
  document.querySelector(
    'input[name="branchCreateMode"][value="All"]',
  ).checked = true;
  renderBranchCreateLanes();
  document.getElementById("branchCreateOverlay").style.display = "block";
  document.getElementById("branchCreateDialog").style.display = "block";
}

/* ==========================================================================
 * Former file: js/join-insert.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// join-insert.js — every convergent branch boundary is one selectable insertion point.
// It is intentionally independent of nesting depth. A new item is inserted between
// the convergence and its former successor: lane joins -> new item -> former target.
function joinInsertRegion(op, forkSource) {
  var regions = [];
  if (typeof collectNestedBranchRegions === "function")
    regions = regions.concat(collectNestedBranchRegions(op) || []);
  if (typeof collectReadOnlyBranchRegions === "function")
    regions = regions.concat(collectReadOnlyBranchRegions(op) || []);
  for (var i = 0; i < regions.length; i++)
    if (String(regions[i].forkSource) === String(forkSource)) return regions[i];
  return null;
}
function joinInsertLinks(op, region) {
  return ((op && op.links) || []).filter(function (link) {
    return (
      link.type === region.joinType &&
      link.to_type === "Step" &&
      String(link.to_re_id) === String(region.joinTarget)
    );
  });
}
function insertItemAfterJoin(op, forkSource, newPhase) {
  var region = joinInsertRegion(op, forkSource);
  if (!region)
    return { ok: false, reason: "This branch join could not be resolved." };
  var joins = joinInsertLinks(op, region);
  if (joins.length < 2)
    return {
      ok: false,
      reason: "The branch join has no complete convergent links.",
    };
  var old = joins[0],
    formerTarget = { to: old.to, to_id: old.to_id, to_re_id: old.to_re_id };
  if (!formerTarget.to_re_id)
    return {
      ok: false,
      reason: "The branch join has no continuation endpoint.",
    };
  // Move every lane's convergent target to the new item, then continue from it
  // to the original target. This is the same topology at outer and nested levels.
  joins.forEach(function (link) {
    branchSetEndpoint(link, "to", newPhase);
  });
  op.links.push(
    branchCreateStepLink(
      "ControlLink",
      newPhase,
      formerTarget.to,
      formerTarget.to_id,
      formerTarget.to_re_id,
    ),
  );
  var target = branchLanePhase(op, formerTarget.to_re_id),
    at = target ? target.index : (op.phases || []).length;
  op.phases.splice(at, 0, newPhase);
  if (typeof normaliseOperationStepEndpoints === "function")
    normaliseOperationStepEndpoints(op);
  op._graphEdit = true;
  return {
    ok: true,
    action: "insert-after-join",
    forkSource: String(forkSource),
    phaseId: newPhase._reId,
    formerTarget: formerTarget.to_re_id,
    joinCount: joins.length,
  };
}
function startJoinAdd(u, o, forkSource, type) {
  var op =
    currentRecipeData &&
    currentRecipeData.unit_procedures[u] &&
    currentRecipeData.unit_procedures[u].operations[o];
  if (
    !op ||
    !joinInsertRegion(op, forkSource) ||
    typeof showPhasePicker !== "function"
  )
    return;
  showPhasePicker(u, o, -1, type, "join:" + String(forkSource));
}
function joinInsertMenuHtml(u, o, forkSource) {
  return (
    '<div class="act-more node-more" onclick="toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for branch join" title="Add after this join">⋮</button><div class="dropdown"><div class="dd-label">Branch join</div><div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    String(forkSource) +
    '\',\'Process\')">Add Process Phase after this join</div><div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    String(forkSource) +
    '\',\'Transfer\')">Add Transfer after this join</div><div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    String(forkSource) +
    '\',\'AllocateProcess\')">Allocate Process after this join</div><div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    String(forkSource) +
    '\',\'ReleaseProcess\')">Release Process after this join</div><div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    String(forkSource) +
    '\',\'AllocateTransfer\')">Allocate Transfer after this join</div><div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    String(forkSource) +
    "','ReleaseTransfer')\">Release Transfer after this join</div></div></div>"
  );
}

/* ==========================================================================
 * Former file: js/universal-actions.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// universal-actions.js — common action surface for every selectable continuation point.
// Actions remain visible; unsupported deletion is blocked with a graph reason.
function graphDeleteBlocked(kind) {
  alert(
    "Delete is not yet applied here: no graph-safe deletion path has been supplied for a " +
      kind +
      ". The item and its links were left unchanged.",
  );
}
function joinCreateContinuation(op, forkSource) {
  var region = joinInsertRegion(op, forkSource);
  if (!region)
    return { ok: false, reason: "This branch join could not be resolved." };
  var joins = joinInsertLinks(op, region);
  if (joins.length < 2)
    return {
      ok: false,
      reason: "The branch join has no complete convergent links.",
    };
  var old = joins[0],
    former = { to: old.to, to_id: old.to_id, to_re_id: old.to_re_id };
  if (!former.to_re_id)
    return {
      ok: false,
      reason: "The branch join has no continuation endpoint.",
    };
  var continuation = newBranchDummy();
  continuation._branchJoinConnector = true;
  joins.forEach(function (link) {
    branchSetEndpoint(link, "to", continuation);
  });
  op.links.push(
    branchCreateStepLink(
      "ControlLink",
      continuation,
      former.to,
      former.to_id,
      former.to_re_id,
    ),
  );
  var target = branchLanePhase(op, former.to_re_id),
    at = target ? target.index : (op.phases || []).length;
  op.phases.splice(at, 0, continuation);
  normaliseOperationStepEndpoints(op);
  op._graphEdit = true;
  return {
    ok: true,
    continuationId: continuation._reId,
    formerTarget: former.to_re_id,
  };
}
function showBranchAfterJoinDialog(u, o, forkSource) {
  var op =
      currentRecipeData &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations[o],
    region = joinInsertRegion(op, forkSource);
  if (!op || !region) return;
  branchCreateCtx = {
    u: u,
    o: o,
    joinFork: String(forkSource),
    joinBranch: true,
  };
  document.getElementById("branchCreateAnchor").textContent =
    "After this Join; AVEVA continuation position will become the source of the new branch.";
  document.getElementById("branchCreateError").textContent = "";
  document.getElementById("branchCreateCount").value = "2";
  document.querySelector(
    'input[name="branchCreateMode"][value="All"]',
  ).checked = true;
  renderBranchCreateLanes();
  document.getElementById("branchCreateOverlay").style.display = "block";
  document.getElementById("branchCreateDialog").style.display = "block";
}
function universalJoinMenuHtml(u, o, forkSource) {
  return (
    '<div class="act-more node-more" onclick="toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for branch join">⋮</button><div class="dropdown"><div class="dd-label">Node · Join</div>' +
    '<div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    forkSource +
    '\',\'Process\')">Insert Process Phase after this node</div><div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    forkSource +
    '\',\'Transfer\')">Insert Transfer after this node</div><div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    forkSource +
    '\',\'AllocateProcess\')">Insert Allocate Process after this node</div><div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    forkSource +
    '\',\'ReleaseProcess\')">Insert Release Process after this node</div><div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    forkSource +
    '\',\'AllocateTransfer\')">Insert Allocate Transfer after this node</div><div class="dd-item" onclick="startJoinAdd(' +
    u +
    "," +
    o +
    ",'" +
    forkSource +
    "','ReleaseTransfer')\">Insert Release Transfer after this node</div>" +
    '<div class="dd-item" onclick="alert(\'Add Transition at a Join is visible but awaits the same continuation-dialog adapter as branch/loop. No graph was changed.\')">◆ Add Transition after this node</div><div class="dd-item" onclick="alert(\'Add loop at a Join is visible but awaits the same continuation-dialog adapter as branch/loop. No graph was changed.\')">↺ Add loop (yes/no Transition)</div><div class="dd-item" onclick="showBranchAfterJoinDialog(' +
    u +
    "," +
    o +
    ",'" +
    forkSource +
    '\')">⑂ Create branch after this node</div><div class="dd-sep"></div><div class="dd-item danger" onclick="graphDeleteBlocked(\'Join\')">✖ Delete</div></div></div>'
  );
}

/* ==========================================================================
 * Former file: js/branch-collapse.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// ============================================================================
// branch-collapse.js - Stage 4C: remove one complete closed N-way branch
// ============================================================================
// Collapse means remove the full branch region (all lane Phases and DUMMYs)
// and restore its direct Step-to-Step route: fork source -> join target.
// It is intentionally unavailable for nested, partial, transition/loop, or
// otherwise ambiguous regions. All validation uses RecipeElement IDs.

function branchCollapsePhaseId(phase) {
  return (phase && (phase._reId || phase.node_id)) || "";
}

function branchCollapseEndpoint(op, id) {
  if (op && id === op._beginReId) return { _reId: id, label: "Begin" };
  if (op && id === op._endReId) return { _reId: id, label: "End" };
  for (var i = 0; i < ((op && op.phases) || []).length; i++)
    if (branchCollapsePhaseId(op.phases[i]) === id) return op.phases[i];
  return null;
}

function branchCollapseLink(type, fromPhase, toPhase) {
  return {
    type: type,
    from: fromPhase.label || fromPhase._reId,
    from_id: "",
    from_node: fromPhase._reId,
    from_re_id: fromPhase._reId,
    from_type: "Step",
    to: toPhase.label || toPhase._reId,
    to_id: "",
    to_node: toPhase._reId,
    to_re_id: toPhase._reId,
    to_type: "Step",
  };
}

function branchCollapseRegion(op, forkSource) {
  var regions =
    typeof collectReadOnlyBranchRegions === "function"
      ? collectReadOnlyBranchRegions(op)
      : [];
  for (var i = 0; i < regions.length; i++)
    if (regions[i].forkSource === forkSource) return regions[i];
  return null;
}

function branchCollapseEligibility(op, forkSource) {
  var region = branchCollapseRegion(op, forkSource);
  if (!region) return { ok: false, reason: "Closed branch region not found." };
  var source = branchCollapseEndpoint(op, region.forkSource),
    target = branchCollapseEndpoint(op, region.joinTarget);
  if (!source || !target)
    return { ok: false, reason: "The branch boundary could not be resolved." };
  if (!region.lanes || region.lanes.length < 2)
    return { ok: false, reason: "A branch needs at least two lanes." };

  var branchNodes = {},
    expected = [];
  for (var laneIndex = 0; laneIndex < region.lanes.length; laneIndex++) {
    var lane = region.lanes[laneIndex];
    if (!lane.phases || !lane.phases.length)
      return { ok: false, reason: "A branch lane is empty or incomplete." };
    for (var phaseIndex = 0; phaseIndex < lane.phases.length; phaseIndex++) {
      var id = lane.phases[phaseIndex],
        phase = branchCollapseEndpoint(op, id);
      if (!phase)
        return {
          ok: false,
          reason: "A branch lane node could not be resolved.",
        };
      branchNodes[id] = true;
      if (phaseIndex === 0)
        expected.push({
          type: region.forkType,
          from: region.forkSource,
          to: id,
        });
      if (phaseIndex < lane.phases.length - 1)
        expected.push({
          type: "ControlLink",
          from: id,
          to: lane.phases[phaseIndex + 1],
        });
      else
        expected.push({
          type: region.joinType,
          from: id,
          to: region.joinTarget,
        });
    }
  }

  var links = (op && op.links) || [];
  // Any Transition, loop, decision, nested edge or other link touching one
  // lane node invalidates collapse. It must not be silently discarded.
  var touchingLane = links.filter(function (link) {
    return branchNodes[link.from_re_id] || branchNodes[link.to_re_id];
  });
  if (expected.length !== touchingLane.length)
    return {
      ok: false,
      reason: "The branch contains additional or unsupported links.",
    };

  var matched = [];
  for (
    var expectedIndex = 0;
    expectedIndex < expected.length;
    expectedIndex++
  ) {
    var need = expected[expectedIndex];
    var candidates = links.filter(function (link) {
      return (
        link.type === need.type &&
        link.from_type === "Step" &&
        link.to_type === "Step" &&
        link.from_re_id === need.from &&
        link.to_re_id === need.to
      );
    });
    if (candidates.length !== 1)
      return {
        ok: false,
        reason: "The branch graph is incomplete or ambiguous.",
      };
    matched.push(candidates[0]);
  }

  // The fork must send only this region's divergent links, and the join must
  // receive only this region's convergent links. This blocks a shared/nested edge.
  var sourceOutgoing = links.filter(function (link) {
    return link.from_type === "Step" && link.from_re_id === region.forkSource;
  });
  var targetIncoming = links.filter(function (link) {
    return link.to_type === "Step" && link.to_re_id === region.joinTarget;
  });
  var forkEdges = matched.filter(function (link) {
    return (
      link.type === region.forkType && link.from_re_id === region.forkSource
    );
  });
  var joinEdges = matched.filter(function (link) {
    return link.type === region.joinType && link.to_re_id === region.joinTarget;
  });
  if (
    sourceOutgoing.length !== forkEdges.length ||
    targetIncoming.length !== joinEdges.length
  ) {
    return {
      ok: false,
      reason:
        "The branch shares a fork or join boundary with another graph path.",
    };
  }

  return {
    ok: true,
    region: region,
    source: source,
    target: target,
    branchNodes: branchNodes,
    links: matched,
  };
}

function collapseClosedBranch(op, forkSource) {
  var eligibility = branchCollapseEligibility(op, forkSource);
  if (!eligibility.ok) return eligibility;
  var region = eligibility.region,
    removeLinks = eligibility.links,
    branchNodes = eligibility.branchNodes;
  // Commit only after every graph edge has passed the closed-region checks.
  op.links = op.links.filter(function (link) {
    return removeLinks.indexOf(link) < 0;
  });
  op.links.push(
    branchCollapseLink("ControlLink", eligibility.source, eligibility.target),
  );
  op.phases = op.phases.filter(function (phase) {
    return !branchNodes[branchCollapsePhaseId(phase)];
  });
  op._graphEdit = true;
  return {
    ok: true,
    mode: region.mode,
    laneCount: region.lanes.length,
    forkSource: region.forkSource,
    joinTarget: region.joinTarget,
    removedNodeIds: Object.keys(branchNodes),
  };
}

function requestBranchCollapse(u, o, forkSource) {
  var op =
    currentRecipeData &&
    currentRecipeData.unit_procedures[u] &&
    currentRecipeData.unit_procedures[u].operations[o];
  var eligibility = branchCollapseEligibility(op, forkSource);
  if (!eligibility.ok) {
    console.warn("Branch removal not applied:", eligibility.reason);
    return;
  }
  var noun =
    eligibility.region.mode === "All" ? "All / Parallel" : "Single / Serial";
  var message =
    "Remove this " +
    eligibility.laneCount +
    "-lane " +
    noun +
    " branch?\n\nAll branch lane items and empty slots will be removed, and the direct path to " +
    (eligibility.target.label || "the original successor") +
    " will be restored.";
  if (typeof confirm === "function" && !confirm(message)) return;
  var result = collapseClosedBranch(op, forkSource);
  if (!result.ok) {
    console.warn("Branch removal not applied:", result.reason);
    return;
  }
  currentRecipeData._structuralEdit = true;
  renderAll();
}

/* ==========================================================================
 * Former file: js/graph-delete.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// graph-delete.js - Stage 7H guarded canonical graph deletion
// Mutations operate on RecipeElement identities and ProcedureLogic link endpoints.
// Unsupported topology is deliberately refused; no visual-only deletion is allowed.

function graphDeleteNodeId(phase) {
  return (phase && (phase._reId || phase.node_id)) || "";
}
function graphDeleteOp(u, o) {
  return (
    currentRecipeData &&
    currentRecipeData.unit_procedures[u] &&
    currentRecipeData.unit_procedures[u].operations[o]
  );
}
function graphDeleteEndpoint(op, id) {
  if (id === op._beginReId) return { _reId: id, label: "Begin" };
  if (id === op._endReId) return { _reId: id, label: "End" };
  return (
    (op.phases || []).filter(function (p) {
      return graphDeleteNodeId(p) === id;
    })[0] || null
  );
}
function graphDeleteLink(type, from, to) {
  return {
    type: type,
    from: from.label || from._reId,
    from_id: "",
    from_node: from._reId,
    from_re_id: from._reId,
    from_type: "Step",
    to: to.label || to._reId,
    to_id: "",
    to_node: to._reId,
    to_re_id: to._reId,
    to_type: "Step",
  };
}
function graphDeleteLinksAt(op, id) {
  return (op.links || []).filter(function (l) {
    return (
      l.from_type === "Step" &&
      l.to_type === "Step" &&
      (l.from_re_id === id || l.to_re_id === id)
    );
  });
}
function graphDeleteValidate(op) {
  var known = {};
  known[op._beginReId] = true;
  known[op._endReId] = true;
  (op.phases || []).forEach(function (p) {
    var id = graphDeleteNodeId(p);
    if (!id)
      throw new Error("A retained graph node has no RecipeElement identity.");
    known[id] = true;
  });
  (op.links || []).forEach(function (l) {
    // Branches may originate at a Transition (native Simple8: Transition 9
    // diverges to the two lanes). Validate RecipeElement identity only on
    // endpoints declared as Steps; Transition identity is held in from_id/to_id.
    if (l.from_type === "Step" && (!l.from_re_id || !known[l.from_re_id]))
      throw new Error("A graph link has an unresolved Step source.");
    if (l.to_type === "Step" && (!l.to_re_id || !known[l.to_re_id]))
      throw new Error("A graph link has an unresolved Step target.");
    if (l.from_type === "Step") l.from_node = l.from_re_id;
    if (l.to_type === "Step") l.to_node = l.to_re_id;
  });
  return true;
}
/* Removed shadowed legacy declaration: graphDeleteCommit. Retained final declaration below. */
function graphDeleteLinearNode(op, id) {
  var node = graphDeleteEndpoint(op, id);
  if (!node || id === op._beginReId || id === op._endReId)
    return { ok: false, reason: "Start and End cannot be deleted." };
  var touching = graphDeleteLinksAt(op, id),
    incoming = touching.filter(function (l) {
      return l.to_re_id === id;
    }),
    outgoing = touching.filter(function (l) {
      return l.from_re_id === id;
    });
  if (
    touching.some(function (l) {
      return l.type !== "ControlLink";
    }) ||
    incoming.length !== 1 ||
    outgoing.length !== 1
  )
    return {
      ok: false,
      reason:
        "This node is a branch, join, Transition, loop, or other non-linear graph boundary.",
    };
  var before = graphDeleteEndpoint(op, incoming[0].from_re_id),
    after = graphDeleteEndpoint(op, outgoing[0].to_re_id);
  if (!before || !after)
    return {
      ok: false,
      reason: "The node has an unresolved predecessor or successor.",
    };
  op.links = op.links.filter(function (l) {
    return touching.indexOf(l) < 0;
  });
  op.links.push(graphDeleteLink("ControlLink", before, after));
  op.phases = op.phases.filter(function (p) {
    return graphDeleteNodeId(p) !== id;
  });
  graphDeleteCommit(op);
  return { ok: true, mode: "linear" };
}
function graphDeleteLane(op, region, laneIndex) {
  var lane = region.lanes[laneIndex];
  if (!lane)
    return {
      ok: false,
      reason: "The selected branch lane could not be resolved.",
    };
  var remove = {},
    i;
  for (i = 0; i < lane.phases.length; i++) remove[lane.phases[i]] = true;
  // The display detector only yields closed, direct lanes. Still prove no edge
  // from this lane crosses to an unrelated graph node before committing.
  var allowed = {};
  allowed[region.forkSource] = true;
  allowed[region.joinTarget] = true;
  lane.phases.forEach(function (id) {
    allowed[id] = true;
  });
  var touching = (op.links || []).filter(function (l) {
    return remove[l.from_re_id] || remove[l.to_re_id];
  });
  if (
    touching.some(function (l) {
      return !allowed[l.from_re_id] || !allowed[l.to_re_id];
    })
  )
    return {
      ok: false,
      reason:
        "The lane has a nested or shared graph edge and cannot be removed safely.",
    };
  var remaining = region.lanes.filter(function (_, index) {
    return index !== laneIndex;
  });
  if (remaining.length < 1)
    return {
      ok: false,
      reason:
        "A branch must retain one route until the enclosing branch is removed.",
    };
  op.links = op.links.filter(function (l) {
    return !remove[l.from_re_id] && !remove[l.to_re_id];
  });
  op.phases = op.phases.filter(function (p) {
    return !remove[graphDeleteNodeId(p)];
  });
  if (remaining.length === 1) {
    // Native two-to-one resolution: remove the fork/join pair and restore a
    // canonical linear route through the surviving lane.
    var survivor = remaining[0],
      source = graphDeleteEndpoint(op, region.forkSource),
      target = graphDeleteEndpoint(op, region.joinTarget);
    if (!source || !target)
      return {
        ok: false,
        reason: "The surviving branch boundaries could not be resolved.",
      };
    op.links = op.links.filter(function (l) {
      return (
        !(l.type === region.forkType && l.from_re_id === region.forkSource) &&
        !(l.type === region.joinType && l.to_re_id === region.joinTarget)
      );
    });
    op.links.push(
      graphDeleteLink(
        "ControlLink",
        source,
        graphDeleteEndpoint(op, survivor.entry),
      ),
    );
    op.links.push(
      graphDeleteLink(
        "ControlLink",
        graphDeleteEndpoint(op, survivor.exit),
        target,
      ),
    );
  }
  graphDeleteCommit(op);
  return {
    ok: true,
    mode: remaining.length === 1 ? "lane-collapse" : "lane-remove",
  };
}
function graphDeleteDirectEmptyLaneToDummy(op, id) {
  var phase = graphDeleteEndpoint(op, id);
  if (!phase || phase._dummy === true)
    return {
      ok: false,
      reason: "The selected node is not a populated branch-lane Phase.",
    };
  // Do not use graphDeleteLinksAt here: Simple8's first branch is emitted
  // from Transition 9, hence its divergent source is not a Step.
  var at = (op.links || []).filter(function (l) {
      return (
        (l.to_type === "Step" && l.to_re_id === id) ||
        (l.from_type === "Step" && l.from_re_id === id)
      );
    }),
    inFork = at.filter(function (l) {
      return (
        l.to_re_id === id &&
        (l.type === "ParallelDivergent" || l.type === "SerialDivergent")
      );
    }),
    outJoin = at.filter(function (l) {
      return (
        l.from_re_id === id &&
        (l.type === "ParallelConvergent" || l.type === "SerialConvergent")
      );
    });
  // This is the native Simple8 #80 signature. It intentionally does not
  // depend on the renderer recognising the enclosing region.
  if (inFork.length !== 1 || outJoin.length !== 1)
    return {
      ok: false,
      reason: "The selected node is not a direct fork-to-join branch lane.",
    };
  if (
    inFork[0].type.replace("Divergent", "") !==
    outJoin[0].type.replace("Convergent", "")
  )
    return {
      ok: false,
      reason: "The lane fork and join families do not match.",
    };
  var index = op.phases.indexOf(phase);
  if (index < 0)
    return {
      ok: false,
      reason: "The branch Phase is absent from the canonical node list.",
    };
  var replacement = {
    _reId: String(id),
    node_id: String(id),
    label: "",
    phase_type: "Dummy",
    parent_instance: "",
    description: "",
    _label: "",
    params: [],
    _dummy: true,
  };
  op.phases[index] = replacement;
  graphDeleteCommit(op);
  return { ok: true, mode: "empty-lane-dummy" };
}
function graphDeleteSoleLanePhaseToDummy(op, region, laneIndex, id) {
  var lane = region.lanes[laneIndex];
  if (!lane || lane.phases.length !== 1 || lane.phases[0] !== id)
    return {
      ok: false,
      reason: "The selected node is not the sole Phase in this lane.",
    };
  var phase = graphDeleteEndpoint(op, id);
  if (!phase)
    return { ok: false, reason: "The branch Phase could not be resolved." };
  // Native Simple8 → Simple9 rule: retain the RecipeElement and both branch
  // boundaries, changing only Phase into Other OtherValue=DUMMY at this ID.
  // This deliberately leaves a real, selectable empty lane rather than
  // collapsing the branch or manufacturing replacement links.
  var replacement = {
    _reId: String(id),
    node_id: String(id),
    label: "",
    phase_type: "Dummy",
    parent_instance: "",
    description: "",
    _label: "",
    params: [],
    _dummy: true,
  };
  var index = op.phases.indexOf(phase);
  if (index < 0)
    return {
      ok: false,
      reason: "The branch Phase is absent from the canonical node list.",
    };
  op.phases[index] = replacement;
  graphDeleteCommit(op);
  return { ok: true, mode: "empty-lane-dummy" };
}
/* Removed shadowed legacy declaration: graphDeleteSelectedNode. Retained final declaration below. */
function requestGraphDeleteNode(u, o, id, label) {
  var op = graphDeleteOp(u, o),
    result;
  if (!op) return;
  if (
    typeof confirm === "function" &&
    !confirm(
      "Delete " +
        (label || "this graph item") +
        "?\n\nThe editor will only apply the deletion if it can prove a valid AVEVA graph reconnection.",
    )
  )
    return;
  try {
    result = graphDeleteSelectedNode(u, o, String(id));
  } catch (e) {
    alert("Delete was not applied: " + e.message);
    return;
  }
  if (!result.ok) {
    alert("Delete was not applied: " + result.reason);
    return;
  }
  renderAll();
}
function requestGraphDeletePhase(u, o, p) {
  var op = graphDeleteOp(u, o),
    phase = op && op.phases[p],
    id = graphDeleteNodeId(phase);
  if (id) requestGraphDeleteNode(u, o, id, phase.label);
}

// Stage 7H.6 — selected branch lane/subtree deletion.
function graphDeleteRegionSourceLink(op, region, entry) {
  var candidates = (op.links || []).filter(function (l) {
    return (
      l.type === region.forkType && l.to_type === "Step" && l.to_re_id === entry
    );
  });
  return candidates[0] || null;
}
function graphDeleteLaneClosure(op, region, laneIndex) {
  // Delete-this-branch means the complete exclusive lane closure: Step nodes,
  // Transition nodes and loop-back legs. A DUMMY -> Transition -> Phase ->
  // Transition loop must not survive invisibly and reappear after another edit.
  var entry = region.targets[laneIndex],
    stop = {};
  stop[region.joinTarget] = true;
  region.targets.forEach(function (id, i) {
    if (i !== laneIndex) stop[id] = true;
  });
  var nodes = {},
    transitions = {},
    queue = [{ kind: "Step", id: entry }],
    seen = {};
  function add(kind, id) {
    if (!id) return;
    var key = kind + ":" + id;
    if (seen[key]) return;
    queue.push({ kind: kind, id: String(id) });
  }
  while (queue.length) {
    var item = queue.shift(),
      key = item.kind + ":" + item.id;
    if (seen[key]) continue;
    seen[key] = true;
    if (item.kind === "Step") {
      if (stop[item.id]) continue;
      nodes[item.id] = true;
      (op.links || []).forEach(function (l) {
        if (l.from_type !== "Step" || String(l.from_re_id) !== item.id) return;
        if (l.to_type === "Step" && !stop[l.to_re_id]) add("Step", l.to_re_id);
        if (l.to_type === "Transition") add("Transition", l.to_id);
      });
    } else {
      transitions[item.id] = true;
      (op.links || []).forEach(function (l) {
        if (l.from_type !== "Transition" || String(l.from_id) !== item.id)
          return;
        // Follow a loop leg only if it stays within the selected lane; never
        // cross the selected region's convergent boundary into its join target.
        if (l.to_type === "Step" && !stop[l.to_re_id]) add("Step", l.to_re_id);
        if (l.to_type === "Transition") add("Transition", l.to_id);
      });
    }
  }
  return { nodes: nodes, transitions: transitions };
}
function graphDeleteLaneSubtreeIds(op, region, laneIndex) {
  return graphDeleteLaneClosure(op, region, laneIndex).nodes;
}
function graphDeleteBranchLane(u, o, forkSource, laneIndex) {
  var op = graphDeleteOp(u, o);
  if (!op)
    return { ok: false, reason: "The operation is no longer available." };
  var regions =
    typeof collectNestedBranchRegions === "function"
      ? collectNestedBranchRegions(op)
      : [];
  var region = regions.filter(function (r) {
    return String(r.forkSource) === String(forkSource);
  })[0];
  if (!region)
    return {
      ok: false,
      reason: "The selected branch boundary could not be resolved.",
    };
  if (
    region.targets.length < 2 ||
    laneIndex < 0 ||
    laneIndex >= region.targets.length
  )
    return { ok: false, reason: "The selected branch lane is unavailable." };
  var closure = graphDeleteLaneClosure(op, region, laneIndex),
    remove = closure.nodes,
    removeTransitions = closure.transitions,
    remaining = region.targets.filter(function (_, i) {
      return i !== laneIndex;
    });
  // Do not delete a node shared by a sibling lane or the enclosing join.
  if (remove[region.joinTarget])
    return {
      ok: false,
      reason: "The selected lane reaches a shared join boundary.",
    };
  op.links = (op.links || []).filter(function (l) {
    return (
      !(l.from_type === "Step" && remove[l.from_re_id]) &&
      !(l.to_type === "Step" && remove[l.to_re_id]) &&
      !(l.from_type === "Transition" && removeTransitions[l.from_id]) &&
      !(l.to_type === "Transition" && removeTransitions[l.to_id])
    );
  });
  Object.keys(removeTransitions).forEach(function (id) {
    if (op.transitions) delete op.transitions[id];
    if (op.transition_meta) delete op.transition_meta[id];
  });
  op.phases = (op.phases || []).filter(function (p) {
    return !remove[graphDeleteNodeId(p)];
  });
  if (remaining.length === 1) {
    var survivor = remaining[0],
      sourceLink = graphDeleteRegionSourceLink(op, region, survivor),
      source =
        sourceLink && sourceLink.from_type === "Step"
          ? graphDeleteEndpoint(op, sourceLink.from_re_id)
          : null;
    var exit = (region.joinSources || []).filter(function (id) {
        return !remove[id];
      })[0],
      join = graphDeleteEndpoint(op, region.joinTarget),
      survivorPhase = graphDeleteEndpoint(op, survivor);
    if (!sourceLink || !exit || !join || !survivorPhase)
      return {
        ok: false,
        reason:
          "The surviving lane cannot be connected to its branch boundaries.",
      };
    op.links = op.links.filter(function (l) {
      return (
        !(
          l.type === region.forkType &&
          String(l.from_type === "Step" ? l.from_re_id : "@T:" + l.from_id) ===
            String(region.forkSource)
        ) &&
        !(
          l.type === region.joinType &&
          l.to_type === "Step" &&
          l.to_re_id === region.joinTarget
        )
      );
    });
    if (survivorPhase._dummy === true && survivorPhase.phase_type === "Dummy") {
      // Deleting the populated side of a two-lane branch with an empty other
      // side removes the whole region (Simple9 rule), reconnecting its source
      // straight to the former join continuation.
      op.phases = op.phases.filter(function (p) {
        return graphDeleteNodeId(p) !== survivor;
      });
      op.links = op.links.filter(function (l) {
        return (
          !(l.from_type === "Step" && l.from_re_id === survivor) &&
          !(l.to_type === "Step" && l.to_re_id === survivor)
        );
      });
      if (sourceLink.from_type === "Transition") {
        // The first Simple9 branch starts at Transition 9. Its join target
        // is the continuation DUMMY for the following branch, so preserve it.
        op.links.push({
          type: "ControlLink",
          from: sourceLink.from,
          from_id: sourceLink.from_id,
          from_type: "Transition",
          to: join.label || join._reId,
          to_id: "",
          to_re_id: join._reId,
          to_node: join._reId,
          to_type: "Step",
        });
      } else if (
        source &&
        source._dummy === true &&
        source.phase_type === "Dummy"
      ) {
        // The second Simple9 branch starts at the join-continuation DUMMY.
        // Removing this entire final region must remove that continuation too:
        // retarget its enclosing join to this region's downstream endpoint.
        // Preserve the incoming link type (normally ParallelConvergent), so
        // the parent region still closes as native AVEVA ProcedureLogic.
        (op.links || []).forEach(function (link) {
          if (link.to_type === "Step" && link.to_re_id === source._reId) {
            link.to = join.label || join._reId;
            link.to_re_id = join._reId;
            link.to_node = join._reId;
          }
        });
        op.links = op.links.filter(function (link) {
          return !(
            link.from_type === "Step" && link.from_re_id === source._reId
          );
        });
        op.phases = op.phases.filter(function (p) {
          return graphDeleteNodeId(p) !== source._reId;
        });
      } else op.links.push(graphDeleteLink("ControlLink", source, join));
      graphDeleteCommit(op);
      return { ok: true, mode: "branch-region-remove-empty-survivor" };
    }
    if (sourceLink.from_type === "Transition")
      op.links.push({
        type: "ControlLink",
        from: sourceLink.from,
        from_id: sourceLink.from_id,
        from_type: "Transition",
        to: survivorPhase.label || survivor,
        to_id: "",
        to_re_id: survivor,
        to_node: survivor,
        to_type: "Step",
      });
    else if (
      source &&
      source._dummy === true &&
      source.phase_type === "Dummy"
    ) {
      // Collapsing a subsequent fork with a populated survivor (Simple9
      // Branch B delete) promotes that survivor to the preceding main path.
      // #72 is only the former join-continuation connector: retarget the
      // enclosing convergence to Feedwater, then remove #72 completely.
      (op.links || []).forEach(function (link) {
        if (link.to_type === "Step" && link.to_re_id === source._reId) {
          link.to = survivorPhase.label || survivor;
          link.to_re_id = survivor;
          link.to_node = survivor;
        }
      });
      op.links = op.links.filter(function (link) {
        return !(link.from_type === "Step" && link.from_re_id === source._reId);
      });
      op.phases = op.phases.filter(function (p) {
        return graphDeleteNodeId(p) !== source._reId;
      });
    } else op.links.push(graphDeleteLink("ControlLink", source, survivorPhase));
    op.links.push(
      graphDeleteLink("ControlLink", graphDeleteEndpoint(op, exit), join),
    );
  }
  graphDeleteCommit(op);
  return {
    ok: true,
    mode:
      remaining.length === 1 ? "branch-collapse-to-main" : "branch-lane-remove",
  };
}
function requestGraphDeleteBranchLane(u, o, forkSource, laneIndex, label) {
  if (
    typeof confirm === "function" &&
    !confirm(
      "Delete " +
        label +
        " and its nested contents?\n\nRemaining lanes will be retained; a two-lane branch collapses to its surviving main path.",
    )
  )
    return;
  var result;
  try {
    result = graphDeleteBranchLane(u, o, String(forkSource), Number(laneIndex));
  } catch (e) {
    alert("Delete was not applied: " + e.message);
    return;
  }
  if (!result.ok) {
    alert("Delete was not applied: " + result.reason);
    return;
  }
  renderAll();
}
function branchLaneDeleteMenuHtml(u, o, forkSource, laneIndex) {
  var letter =
    typeof branchDisplayLetter === "function"
      ? branchDisplayLetter(laneIndex)
      : String(laneIndex + 1);
  return (
    '<div class="act-more" onclick="toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for Branch ' +
    letter +
    '">⋮</button><div class="dropdown"><div class="dd-label">Branch ' +
    letter +
    '</div><div class="dd-item danger" onclick="requestGraphDeleteBranchLane(' +
    u +
    "," +
    o +
    ",'" +
    forkSource +
    "'," +
    laneIndex +
    ",'Branch " +
    letter +
    "')\">✖ Delete this branch</div></div></div>"
  );
}

// Stage 7H.15 — delete a nested region from its post-join continuation node.
function graphDeleteRegionAtContinuation(op, continuationId) {
  var regions =
    typeof collectNestedBranchRegions === "function"
      ? collectNestedBranchRegions(op)
      : [];
  var region = regions.filter(function (r) {
    return String(r.joinTarget) === String(continuationId);
  })[0];
  if (!region)
    return {
      ok: false,
      reason: "The selected node is not a nested branch continuation.",
    };
  // Find the enclosing region whose lane reaches this nested region's fork.
  var parent = regions.filter(function (r) {
    return r !== region && r.targets.indexOf(region.forkSource) >= 0;
  })[0];
  if (!parent)
    return {
      ok: false,
      reason: "The nested branch has no enclosing lane boundary.",
    };
  var outerExit = (parent.joinSources || []).filter(function (id) {
    return String(id) === String(continuationId);
  })[0];
  if (!outerExit)
    return {
      ok: false,
      reason: "The nested continuation is not an exit of its enclosing branch.",
    };
  var keepSource = graphDeleteEndpoint(op, region.forkSource),
    parentJoin = graphDeleteEndpoint(op, parent.joinTarget);
  if (!keepSource || !parentJoin)
    return {
      ok: false,
      reason: "The enclosing branch endpoints cannot be resolved.",
    };
  // Remove every node belonging to the nested region, including its continuation
  // target. A lane traversal stops at the region join, so add it explicitly.
  var remove = {};
  region.targets.forEach(function (_, index) {
    var ids = graphDeleteLaneSubtreeIds(op, region, index);
    Object.keys(ids).forEach(function (id) {
      remove[id] = true;
    });
  });
  remove[region.joinTarget] = true;
  // Retarget the enclosing convergence *before* generic removal. Otherwise
  // #41 is filtered out with the nested subtree and Branch A loses its join.
  (op.links || []).forEach(function (l) {
    if (
      l.type === parent.joinType &&
      l.from_type === "Step" &&
      String(l.from_re_id) === String(continuationId)
    ) {
      l.from = keepSource.label || keepSource._reId;
      l.from_re_id = keepSource._reId;
      l.from_node = keepSource._reId;
    }
  });
  op.links = (op.links || []).filter(function (l) {
    return (
      !(l.from_type === "Step" && remove[l.from_re_id]) &&
      !(l.to_type === "Step" && remove[l.to_re_id])
    );
  });
  op.phases = (op.phases || []).filter(function (p) {
    return !remove[graphDeleteNodeId(p)];
  });
  // Remove only the nested fork/convergence edges. The enclosing convergence
  // has already been retargeted from #41 to #25, yielding Simple13 topology.
  op.links = op.links.filter(function (l) {
    return (
      !(
        l.type === region.forkType &&
        String(l.from_type === "Step" ? l.from_re_id : "@T:" + l.from_id) ===
          String(region.forkSource)
      ) &&
      !(
        l.type === region.joinType &&
        l.to_type === "Step" &&
        l.to_re_id === region.joinTarget
      )
    );
  });
  graphDeleteCommit(op);
  return { ok: true, mode: "nested-region-continuation-remove" };
}

// After the nested region has already been reduced manually, its former join
// continuation (#41 in simple11/12) is an outer-lane exit: ControlLink in,
// outer ParallelConvergent out. Delete it by retargeting that convergence.
function graphDeleteOuterLaneExit(op, id) {
  var node = graphDeleteEndpoint(op, id);
  if (!node)
    return {
      ok: false,
      reason: "The selected continuation cannot be resolved.",
    };
  var touching = graphDeleteLinksAt(op, id),
    incoming = touching.filter(function (l) {
      return l.to_re_id === id && l.type === "ControlLink";
    }),
    outgoing = touching.filter(function (l) {
      return (
        l.from_re_id === id &&
        (l.type === "ParallelConvergent" || l.type === "SerialConvergent")
      );
    });
  if (incoming.length !== 1 || outgoing.length !== 1 || touching.length !== 2)
    return {
      ok: false,
      reason: "The selected node is not a removable outer-lane continuation.",
    };
  var predecessor = graphDeleteEndpoint(op, incoming[0].from_re_id);
  if (!predecessor)
    return {
      ok: false,
      reason: "The outer-lane predecessor cannot be resolved.",
    };
  outgoing[0].from = predecessor.label || predecessor._reId;
  outgoing[0].from_re_id = predecessor._reId;
  outgoing[0].from_node = predecessor._reId;
  op.links = op.links.filter(function (l) {
    return l !== incoming[0];
  });
  op.phases = op.phases.filter(function (p) {
    return graphDeleteNodeId(p) !== id;
  });
  graphDeleteCommit(op);
  return { ok: true, mode: "outer-lane-continuation-bypass" };
}
// Override dispatch so structural continuations are dealt with before generic
// node/lane matching. This supports direct #41 deletion and the staged path.
/* Removed shadowed legacy declaration: graphDeleteSelectedNode. Retained final declaration below. */

// Remove only Transition records no longer referenced by any retained link.
// This prevents deleted nested loops (Transitions 6/8 in simple11) being
// serialised after their branch nodes are gone.
function graphDeletePruneOrphanTransitions(op) {
  var used = {};
  (op.links || []).forEach(function (l) {
    if (l.from_type === "Transition" && l.from_id)
      used[String(l.from_id)] = true;
    if (l.to_type === "Transition" && l.to_id) used[String(l.to_id)] = true;
  });
  Object.keys(op.transitions || {}).forEach(function (id) {
    if (!used[String(id)]) {
      delete op.transitions[id];
      if (op.transition_meta) delete op.transition_meta[id];
    }
  });
}
// Redefine the commit point after deletion helpers so all removal paths prune
// detached Transition records before export/render.
function graphDeleteCommit(op) {
  graphDeletePruneOrphanTransitions(op);
  graphDeleteValidate(op);
  if (typeof normaliseOperationStepEndpoints === "function")
    normaliseOperationStepEndpoints(op);
  op._graphEdit = true;
  currentRecipeData._structuralEdit = true;
}

// Stage 7H.16 — deleting a Phase after a nested join removes only that Phase.
// Example: Simple11 #41. The nested fork and every nested lane remain intact;
// its convergence is simply retargeted to the outer join target.
function graphDeletePostNestedPhase(op, id) {
  // Native AVEVA Simple12 -> Simple12a rule. A visible Phase immediately after
  // a nested join is deleted as a Phase, but its graph position remains an
  // Other/DUMMY connector. Both the nested and enclosing join Link groups are
  // intentionally untouched so later branch deletion remains valid.
  var node = graphDeleteEndpoint(op, id);
  if (!node || node._dummy === true)
    return {
      ok: false,
      reason: "The selected node is not a populated post-nested Phase.",
    };
  var touching = (op.links || []).filter(function (l) {
    return (
      (l.to_type === "Step" && l.to_re_id === id) ||
      (l.from_type === "Step" && l.from_re_id === id)
    );
  });
  var incoming = touching.filter(function (l) {
    return (
      l.to_re_id === id &&
      (l.type === "ParallelConvergent" || l.type === "SerialConvergent")
    );
  });
  var outgoing = touching.filter(function (l) {
    return (
      l.from_re_id === id &&
      (l.type === "ParallelConvergent" || l.type === "SerialConvergent")
    );
  });
  if (
    !incoming.length ||
    outgoing.length !== 1 ||
    touching.length !== incoming.length + 1
  )
    return {
      ok: false,
      reason: "The selected Phase is not directly after a nested join.",
    };
  var index = op.phases.indexOf(node);
  if (index < 0)
    return {
      ok: false,
      reason: "The selected Phase is absent from the canonical node list.",
    };
  op.phases[index] = {
    _reId: String(id),
    node_id: String(id),
    label: "",
    phase_type: "Dummy",
    parent_instance: "",
    description: "",
    _label: "",
    params: [],
    _dummy: true,
    _postNestedConnector: true,
  };
  graphDeleteCommit(op);
  return { ok: true, mode: "post-nested-phase-to-dummy" };
}
// Final canonical delete dispatch: single-node semantics take precedence over
// any branch that happens to be before/after the selected Phase.
function graphDeleteSelectedNode(u, o, id) {
  var op = graphDeleteOp(u, o);
  if (!op)
    return { ok: false, reason: "The operation is no longer available." };
  var linear = graphDeleteLinearNode(op, id);
  if (linear.ok) return linear;
  var postNested = graphDeletePostNestedPhase(op, id);
  if (postNested.ok) return postNested;
  var outerExit = graphDeleteOuterLaneExit(op, id);
  if (outerExit.ok) return outerExit;
  var directEmptyLane = graphDeleteDirectEmptyLaneToDummy(op, id);
  if (directEmptyLane.ok) return directEmptyLane;
  var regions =
    typeof collectReadOnlyBranchRegions === "function"
      ? collectReadOnlyBranchRegions(op)
      : [];
  for (var r = 0; r < regions.length; r++)
    for (var l = 0; l < regions[r].lanes.length; l++) {
      if (regions[r].lanes[l].phases.indexOf(id) < 0) continue;
      var emptyLane = graphDeleteSoleLanePhaseToDummy(op, regions[r], l, id);
      if (emptyLane.ok) return emptyLane;
      return graphDeleteLane(op, regions[r], l);
    }
  return linear;
}

/* ============================================================================
 * OPERATION SCOPE IMPLEMENTATION
 * ---------------------------------------------------------------------------
 * Former runtime module: graph/operation-graph.js
 * Future shared-action extraction occurs within this file, not in a new
 * operation-specific runtime file.
 * ========================================================================== */

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

/* ============================================================================
 * SHARED NATIVE GRAPH ACTION API
 * ---------------------------------------------------------------------------
 * One XML writer for graph actions. Scope adapters select only the owner graph
 * and business-node type; transitions, loops, forks, joins, DUMMY elements,
 * numeric ID allocation, validation and authoritative commit live here.
 * ========================================================================== */
(function (window) {
  "use strict";

  function localName(node) {
    return (node && (node.localName || node.nodeName)) || "";
  }
  function directChildren(node, name) {
    return Array.prototype.filter.call(
      (node && node.children) || [],
      function (child) {
        return localName(child) === name;
      },
    );
  }
  function textOf(node, name) {
    var found = directChildren(node, name)[0];
    return found ? String(found.textContent || "").trim() : "";
  }
  function setText(node, name, value) {
    var child = directChildren(node, name)[0];
    if (!child) {
      child = node.ownerDocument.createElementNS(node.namespaceURI, name);
      node.appendChild(child);
    }
    child.textContent = String(value);
  }
  function linkEnds(link, side) {
    var tag = side === "from" ? "FromID" : "ToID",
      idTag = side === "from" ? "FromIDValue" : "ToIDValue",
      typeTag = side === "from" ? "FromType" : "ToType";
    return directChildren(link, tag).map(function (item) {
      return { id: textOf(item, idTag), type: textOf(item, typeTag) };
    });
  }
  function sameEnd(left, right) {
    return (
      left &&
      right &&
      left.type === right.type &&
      String(left.id) === String(right.id)
    );
  }
  function replaceEnds(link, side, values) {
    var tag = side === "from" ? "FromID" : "ToID",
      idTag = side === "from" ? "FromIDValue" : "ToIDValue",
      typeTag = side === "from" ? "FromType" : "ToType",
      old = directChildren(link, tag),
      before = old.length ? old[old.length - 1].nextSibling : null,
      doc = link.ownerDocument;
    old.forEach(function (item) {
      link.removeChild(item);
    });
    values.forEach(function (value) {
      var item = doc.createElementNS(link.namespaceURI, tag);
      setText(item, idTag, value.id);
      setText(item, typeTag, value.type);
      setText(item, "IDScope", "Internal");
      link.insertBefore(item, before);
    });
  }
  function numericIds(doc) {
    var high = 0;
    Array.prototype.forEach.call(doc.getElementsByTagName("*"), function (el) {
      if (localName(el) !== "ID") return;
      var value = String(el.textContent || "").trim();
      if (/^\d+$/.test(value)) high = Math.max(high, Number(value));
    });
    return function () {
      high += 1;
      return String(high);
    };
  }
  function ownerFor(recipe, scope, index) {
    var wanted =
      scope === "operation" &&
      recipe.unit_procedures[index] &&
      recipe.unit_procedures[index]._reId;
    if (!wanted) return null;
    return (
      Array.prototype.filter.call(
        recipe._xmlDoc.getElementsByTagName("*"),
        function (el) {
          return (
            localName(el) === "RecipeElement" &&
            textOf(el, "RecipeElementType") === "UnitProcedure" &&
            textOf(el, "ID") === String(wanted)
          );
        },
      )[0] || null
    );
  }
  function procedureLogic(owner) {
    return directChildren(owner, "ProcedureLogic")[0] || null;
  }
  function steps(logic) {
    return directChildren(logic, "Step");
  }
  function links(logic) {
    return directChildren(logic, "Link");
  }
  function stepForElement(logic, id) {
    return (
      steps(logic).filter(function (step) {
        return textOf(step, "RecipeElementID") === String(id);
      })[0] || null
    );
  }
  function control(link) {
    return textOf(link, "LinkType") === "ControlLink";
  }
  function validate(logic) {
    var known = {};
    steps(logic).forEach(function (step) {
      known[textOf(step, "ID")] = true;
    });
    var errors = [];
    links(logic).forEach(function (link) {
      ["from", "to"].forEach(function (side) {
        linkEnds(link, side).forEach(function (end) {
          if (end.type === "Step" && !known[end.id])
            errors.push(
              "Link #" +
                textOf(link, "ID") +
                " references missing Step #" +
                end.id,
            );
        });
      });
    });
    return errors;
  }
  function appendLink(logic, from, to, type, next) {
    var link = logic.ownerDocument.createElementNS(logic.namespaceURI, "Link");
    setText(link, "ID", next());
    replaceEnds(link, "from", from);
    replaceEnds(link, "to", to);
    setText(link, "LinkType", type);
    setText(link, "Depiction", "Line");
    logic.appendChild(link);
    return link;
  }
  function appendDummy(owner, logic, next) {
    var doc = owner.ownerDocument,
      element = doc.createElementNS(owner.namespaceURI, "RecipeElement"),
      id = next(),
      kind = doc.createElementNS(owner.namespaceURI, "RecipeElementType"),
      step = doc.createElementNS(logic.namespaceURI, "Step");
    setText(element, "ID", id);
    kind.setAttribute("OtherValue", "DUMMY");
    kind.textContent = "Other";
    element.appendChild(kind);
    owner.appendChild(element);
    setText(step, "ID", next());
    setText(step, "RecipeElementID", id);
    setText(step, "RecipeElementVersion", "0");
    logic.appendChild(step);
    return { elementId: id, step: { type: "Step", id: textOf(step, "ID") } };
  }
  function commit(recipe, doc) {
    var xml = new XMLSerializer().serializeToString(doc),
      fresh = parseB2MML(xml);
    if (!fresh)
      throw new Error("The proposed XML change could not be reparsed.");
    xmlAuthorityAttach(fresh, doc, xml);
    xmlAuthorityReplaceCurrent(fresh);
    currentRecipeData._structuralEdit = true;
    renderAll();
    return { ok: true };
  }
  function transaction(request, mutate) {
    var recipe = currentRecipeData;
    if (!recipe || !recipe._xmlDoc || !recipe._xmlAuthoritative)
      return { ok: false, reason: "No XML-authoritative recipe is loaded." };
    try {
      var xml = new XMLSerializer().serializeToString(recipe._xmlDoc),
        doc = new DOMParser().parseFromString(xml, "text/xml");
      if (doc.getElementsByTagName("parsererror")[0])
        throw new Error("Authoritative XML cannot be cloned.");
      var shadow = Object.assign({}, recipe, { _xmlDoc: doc }),
        owner = ownerFor(shadow, request.scope, request.ownerIndex),
        logic = owner && procedureLogic(owner);
      if (!logic)
        return { ok: false, reason: "Graph owner ProcedureLogic is missing." };
      var result = mutate({
        recipe: recipe,
        doc: doc,
        owner: owner,
        logic: logic,
        next: numericIds(doc),
      });
      if (result && result.ok === false) return result;
      var issues = validate(logic);
      if (issues.length) return { ok: false, reason: issues.join(" ") };
      return commit(recipe, doc);
    } catch (error) {
      return {
        ok: false,
        reason: (error && error.message) || "Shared graph action failed.",
      };
    }
  }
  function createTransitionAfter(request) {
    return transaction(request, function (ctx) {
      var source = stepForElement(ctx.logic, request.sourceElementId);
      if (!source) return { ok: false, reason: "Source Operation is missing." };
      var src = { type: "Step", id: textOf(source, "ID") },
        out = links(ctx.logic).filter(function (link) {
          return (
            control(link) &&
            linkEnds(link, "from").length === 1 &&
            sameEnd(linkEnds(link, "from")[0], src) &&
            linkEnds(link, "to").length === 1
          );
        });
      if (out.length !== 1)
        return { ok: false, reason: "Source needs one normal outgoing route." };
      var tid = ctx.next(),
        transition = ctx.doc.createElementNS(
          ctx.logic.namespaceURI,
          "Transition",
        );
      setText(transition, "ID", tid);
      setText(
        transition,
        "Condition",
        request.condition || 'Ask( "Condition?" )',
      );
      ctx.logic.appendChild(transition);
      replaceEnds(out[0], "from", [{ type: "Transition", id: tid }]);
      appendLink(
        ctx.logic,
        [src],
        [{ type: "Transition", id: tid }],
        "ControlLink",
        ctx.next,
      );
      return { ok: true, transitionId: tid };
    });
  }
  function createLoopAfter(request) {
    return transaction(request, function (ctx) {
      var source = stepForElement(ctx.logic, request.sourceElementId);
      if (!source) return { ok: false, reason: "Source Operation is missing." };
      var src = { type: "Step", id: textOf(source, "ID") },
        out = links(ctx.logic).filter(function (link) {
          return (
            control(link) &&
            linkEnds(link, "from").length === 1 &&
            sameEnd(linkEnds(link, "from")[0], src) &&
            linkEnds(link, "to").length === 1
          );
        });
      if (out.length !== 1)
        return { ok: false, reason: "Source needs one normal outgoing route." };
      var tid = ctx.next(),
        transition = ctx.doc.createElementNS(
          ctx.logic.namespaceURI,
          "Transition",
        );
      setText(transition, "ID", tid);
      setText(transition, "Condition", request.condition || 'Ask( "Repeat?" )');
      ctx.logic.appendChild(transition);
      replaceEnds(out[0], "from", [{ type: "Transition", id: tid }]);
      appendLink(
        ctx.logic,
        [src],
        [{ type: "Transition", id: tid }],
        "ControlLink",
        ctx.next,
      );
      appendLink(
        ctx.logic,
        [{ type: "Transition", id: tid }],
        [src],
        "Other",
        ctx.next,
      );
      return { ok: true, transitionId: tid };
    });
  }
  function createBranchAfter(request) {
    return transaction(request, function (ctx) {
      var sourceStep = stepForElement(ctx.logic, request.sourceElementId);
      if (!sourceStep)
        return { ok: false, reason: "Source Operation is missing." };
      var src = { type: "Step", id: textOf(sourceStep, "ID") },
        out = links(ctx.logic).filter(function (link) {
          return (
            control(link) &&
            linkEnds(link, "from").length === 1 &&
            sameEnd(linkEnds(link, "from")[0], src) &&
            linkEnds(link, "to").length === 1
          );
        });
      if (out.length !== 1)
        return { ok: false, reason: "Source needs one normal outgoing route." };
      var destination = linkEnds(out[0], "to")[0],
        count = Math.max(2, Number(request.laneCount) || 2),
        lanes = [];
      for (var i = 0; i < count; i++)
        lanes.push(appendDummy(ctx.owner, ctx.logic, ctx.next));
      out[0].parentNode.removeChild(out[0]);
      var divergent =
          request.mode === "Single" ? "SerialDivergent" : "ParallelDivergent",
        convergent =
          request.mode === "Single" ? "SerialConvergent" : "ParallelConvergent";
      appendLink(
        ctx.logic,
        [src],
        lanes.map(function (lane) {
          return lane.step;
        }),
        divergent,
        ctx.next,
      );
      appendLink(
        ctx.logic,
        lanes.map(function (lane) {
          return lane.step;
        }),
        [destination],
        convergent,
        ctx.next,
      );
      return {
        ok: true,
        laneIds: lanes.map(function (lane) {
          return lane.elementId;
        }),
      };
    });
  }
  window.RecipeGraphActions = Object.freeze({
    transaction: transaction,
    createTransitionAfter: createTransitionAfter,
    createLoopAfter: createLoopAfter,
    createBranchAfter: createBranchAfter,
  });
})(window);

/* Operation scope adapters: UI handlers select scope/owner/source only. */
window.requestOperationTransition = function (request) {
  var result = window.RecipeGraphActions.createTransitionAfter({
    scope: "operation",
    ownerIndex: request.unitProcedureIndex,
    sourceElementId: String(request.operationId),
  });
  if (!result.ok) alert("Transition not applied: " + result.reason);
  return result;
};
window.requestOperationLoop = function (request) {
  var result = window.RecipeGraphActions.createLoopAfter({
    scope: "operation",
    ownerIndex: request.unitProcedureIndex,
    sourceElementId: String(request.operationId),
  });
  if (!result.ok) alert("Loop not applied: " + result.reason);
  return result;
};
window.requestOperationBranchAfterNode = function (request) {
  var result = window.RecipeGraphActions.createBranchAfter({
    scope: "operation",
    ownerIndex: request.unitProcedureIndex,
    sourceElementId: String(request.operationId),
    mode: request.mode,
    laneCount: request.laneCount,
  });
  if (!result.ok) alert("Branch not created: " + result.reason);
  return result;
};
