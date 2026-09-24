/**
 * actions.js — user-level recipe actions.
 *
 * Each action is one undoable transaction: RecipeDoc.edit() -> mutate a route
 * tree with BE.ops -> RecipeDoc.commit() (rewrite + verify). The same actions
 * serve all three lanes; `tree` is the route of the Master recipe (Unit
 * Procedures), a Unit Procedure (Operations) or an Operation (Phases).
 */
(function (global) {
  "use strict";
  var BE = (global.BatchEditor = global.BatchEditor || {});
  var ops = BE.ops, X = BE.xml;

  var STEP_TYPE = { master: "UnitProcedure", unitProcedure: "Operation", operation: "Phase" };

  /** Parameter list for a new phase, from the site model. */
  function phaseParams(model, phaseType, processClass, parentInstance, phaseName) {
    var list = [];
    if (phaseType === "Process") {
      var pc = model.processes && model.processes[processClass];
      list = (pc && pc.phases && pc.phases[phaseName]) || [];
    } else if (phaseType === "Transfer") {
      var tp = model.transfer_phases && model.transfer_phases[parentInstance];
      list = (tp && tp[phaseName]) || [];
    }
    return list.map(function (p) {
      // The model marks process-phase materials as "Material". Transfer phases are
      // all typed "Transfer"; AVEVA exports their quantity* parameters as material inputs.
      var material = p.type === "Material" || (phaseType === "Transfer" && /^quantity/i.test(p.name));
      return { name: p.name, type: material ? "Material" : p.type === "Transfer" ? "Transfer" : "Process" };
    });
  }

  function uniqueName(doc, tree, base) {
    var used = {};
    BE.sfc.walkItems(tree.seq, function (it) {
      if (it.kind === "step") {
        var re = doc.re(it.reId);
        if (re) used[doc.name(re)] = true;
      }
    });
    if (!used[base]) return base;
    for (var i = 2; ; i++) if (!used[base + " " + i]) return base + " " + i;
  }

  function run(doc, label, tree, fn) {
    return doc.edit(label, function () {
      var out = fn();
      doc.commit(tree);
      return out;
    });
  }

  function addStepRE(tree, re) {
    tree.pendingREs = tree.pendingREs || {};
    var reId = X.text(re, "ID");
    tree.pendingREs[reId] = re;
    var item = ops.newStep(reId, null);
    return item;
  }

  var A = {
    STEP_TYPE: STEP_TYPE,
    phaseParams: phaseParams,
    uniqueName: uniqueName,

    /** spec = { phaseType, name, parentInstance, processClass } */
    addPhase: function (doc, tree, pos, spec, model) {
      return run(doc, "Add phase " + spec.name, tree, function () {
        var re = doc.createPhase({
          phaseType: spec.phaseType,
          name: spec.name,
          parentInstance: spec.parentInstance,
          params: phaseParams(model || {}, spec.phaseType, spec.processClass, spec.parentInstance, spec.name),
        });
        var item = addStepRE(tree, re);
        item.stepId = doc.alloc();
        ops.insert(tree, pos, item);
        return X.text(re, "ID");
      });
    },

    addOperation: function (doc, tree, pos, name) {
      return run(doc, "Add operation " + name, tree, function () {
        var re = doc.createContainer("Operation", name);
        var item = addStepRE(tree, re);
        item.stepId = doc.alloc();
        ops.insert(tree, pos, item);
        return X.text(re, "ID");
      });
    },

    addUnitProcedure: function (doc, tree, pos, name, processInstance) {
      return run(doc, "Add unit procedure " + name, tree, function () {
        var re = doc.createContainer("UnitProcedure", name, processInstance);
        var item = addStepRE(tree, re);
        item.stepId = doc.alloc();
        ops.insert(tree, pos, item);
        return X.text(re, "ID");
      });
    },

    addTransition: function (doc, tree, pos, condition) {
      return run(doc, "Add transition", tree, function () {
        var el = doc.createTransition(condition);
        ops.insert(tree, pos, ops.newTransition(el, X.text(el, "ID")));
        return X.text(el, "ID");
      });
    },

    addLoop: function (doc, tree, pos, condition) {
      return run(doc, "Add loop", tree, function () {
        var el = doc.createTransition(condition);
        var loop = ops.newLoop(ops.newTransition(el, X.text(el, "ID")));
        ops.insert(tree, pos, loop);
        return X.text(el, "ID");
      });
    },

    wrapInLoop: function (doc, tree, uid, condition) {
      return run(doc, "Loop back", tree, function () {
        var el = doc.createTransition(condition);
        ops.wrapInLoop(tree, uid, ops.newTransition(el, X.text(el, "ID")));
        return X.text(el, "ID");
      });
    },

    addBranch: function (doc, tree, pos, laneCount) {
      return run(doc, "Add branch", tree, function () {
        ops.insert(tree, pos, ops.newParallel(laneCount));
      });
    },

    addLane: function (doc, tree, parallelUid) {
      return run(doc, "Add branch lane", tree, function () {
        return ops.addLane(tree, parallelUid);
      });
    },

    removeLane: function (doc, tree, parallelUid, laneIndex) {
      return run(doc, "Delete branch lane", tree, function () {
        ops.removeLane(tree, parallelUid, laneIndex);
      });
    },

    move: function (doc, tree, uid, pos) {
      var changed = false;
      run(doc, "Move", tree, function () {
        changed = ops.move(tree, uid, pos);
      });
      return changed;
    },

    /**
     * Move an item into another container of the same level (e.g. a phase to a
     * different Operation). The RecipeElements travel with it; nothing is recreated.
     */
    transfer: function (doc, srcOwner, key, dstTree, pos) {
      // dstTree is the destination route as rendered (pos refers to its items).
      if (srcOwner === dstTree.owner) throw new ops.EditError("Source and destination are the same; use move.");
      return doc.edit("Move to another container", function () {
        var src = doc.tree(srcOwner);
        var item = BE.sfc.findByKey(src, key);
        if (!item) throw new ops.EditError("The item to move no longer exists.");
        ops.resolveSeq(dstTree, pos.seq); // validate the destination before changing anything
        var at = ops.detach(src, item.uid);
        var carried = {};
        ops.stepsIn(at.item).forEach(function (reId) {
          carried[reId] = doc.re(reId);
        });
        doc.commit(src, carried);
        dstTree.pendingREs = carried;
        ops.insert(dstTree, pos, at.item);
        doc.commit(dstTree);
      });
    },

    remove: function (doc, tree, uid) {
      return run(doc, "Delete", tree, function () {
        return ops.remove(tree, uid);
      });
    },

    removeLoop: function (doc, tree, loopUid) {
      return run(doc, "Remove loop", tree, function () {
        ops.unwrapLoop(tree, loopUid);
      });
    },

    /** Simple property changes (no route change) are still undoable transactions. */
    setProperty: function (doc, label, fn) {
      return doc.edit(label, fn);
    },
  };

  BE.actions = A;
})(typeof window !== "undefined" ? window : globalThis);
