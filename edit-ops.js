/**
 * edit-ops.js — structural edits on a route tree.
 *
 * Every user action (add, move, delete at any level) is expressed here as a
 * plain list operation on the tree produced by sfc.parse(). There is no
 * scenario-specific XML surgery: sfc.write() regenerates the ProcedureLogic,
 * including every DUMMY, from the edited tree.
 *
 * Positions
 *   A position is { seq: SeqKey, index: n } — "insert before item n".
 *   SeqKey is "top", "<parallelUid>:<laneIndex>" or "<loopUid>:body".
 */
(function (global) {
  "use strict";
  var BE = (global.BatchEditor = global.BatchEditor || {});
  var sfc = BE.sfc;

  function EditError(message) {
    this.name = "EditError";
    this.message = message;
  }
  EditError.prototype = Object.create(Error.prototype);

  /** Find an item by uid: { item, seq, index, seqKey, container }. */
  function locate(tree, uid) {
    var hit = null;
    function visit(seq, key) {
      seq.forEach(function (it, i) {
        if (hit) return;
        if (it.uid === uid) hit = { item: it, seq: seq, index: i, seqKey: key };
        if (it.kind === "parallel")
          it.lanes.forEach(function (lane, k) {
            visit(lane, it.uid + ":" + k);
          });
        if (it.kind === "loop") {
          if (it.trans.uid === uid && !hit) hit = { item: it.trans, seq: null, loop: it, seqKey: key };
          visit(it.body, it.uid + ":body");
        }
      });
    }
    visit(tree.seq, "top");
    if (!hit) throw new EditError("The selected item no longer exists (the view may be stale).");
    return hit;
  }

  function resolveSeq(tree, key) {
    if (key === "top") return tree.seq;
    var parts = key.split(":");
    var c = locate(tree, parts[0]).item;
    if (parts[1] === "body") {
      if (c.kind !== "loop") throw new EditError("Not a loop: " + key);
      return c.body;
    }
    if (c.kind !== "parallel") throw new EditError("Not a branch: " + key);
    var lane = c.lanes[parseInt(parts[1], 10)];
    if (!lane) throw new EditError("No such branch lane: " + key);
    return lane;
  }

  /** True when `seqKey` is inside `item` (moving a block into itself). */
  function isInside(tree, item, seqKey) {
    if (seqKey === "top") return false;
    var owners = [];
    (function collect(it) {
      if (it.kind === "parallel")
        it.lanes.forEach(function (l) {
          l.forEach(function (c) {
            owners.push(c.uid);
            collect(c);
          });
        });
      if (it.kind === "loop")
        it.body.forEach(function (c) {
          owners.push(c.uid);
          collect(c);
        });
    })(item);
    owners.push(item.uid);
    return owners.indexOf(seqKey.split(":")[0]) >= 0;
  }

  // ---------------------------------------------------------------- creation
  function newStep(reId, stepId) {
    return { kind: "step", uid: sfc.uid(), reId: reId, stepId: stepId };
  }
  function newTransition(el, id) {
    return { kind: "transition", uid: sfc.uid(), id: id, el: el };
  }
  function newParallel(laneCount) {
    var lanes = [];
    for (var i = 0; i < Math.max(2, laneCount || 2); i++) lanes.push([]);
    return { kind: "parallel", uid: sfc.uid(), mode: "Parallel", lanes: lanes, laneDummies: [] };
  }
  function newLoop(transition) {
    return { kind: "loop", uid: sfc.uid(), marker: null, body: [], trans: transition };
  }

  // ---------------------------------------------------------------- operations
  function insert(tree, pos, item) {
    var seq = resolveSeq(tree, pos.seq);
    var i = Math.max(0, Math.min(pos.index, seq.length));
    seq.splice(i, 0, item);
    return item;
  }

  function detach(tree, uid) {
    var at = locate(tree, uid);
    if (!at.seq) throw new EditError("A loop-back transition belongs to its loop; move or remove the loop instead.");
    at.seq.splice(at.index, 1);
    return at;
  }

  function move(tree, uid, pos) {
    var at = locate(tree, uid);
    if (!at.seq) throw new EditError("A loop-back transition belongs to its loop; move the loop instead.");
    if (isInside(tree, at.item, pos.seq)) throw new EditError("A block cannot be moved inside itself.");
    var target = resolveSeq(tree, pos.seq);
    var index = pos.index;
    if (target === at.seq && index > at.index) index -= 1;
    if (target === at.seq && index === at.index) return false; // no change
    at.seq.splice(at.index, 1);
    target.splice(Math.max(0, Math.min(index, target.length)), 0, at.item);
    return true;
  }

  /** Delete any item. A loop's own transition removes the loop but keeps its body. */
  function remove(tree, uid) {
    var at = locate(tree, uid);
    if (!at.seq) return unwrapLoop(tree, at.loop.uid);
    at.seq.splice(at.index, 1);
    return at.item;
  }

  /** Remove a loop-back: the body items stay in place on the route. */
  function unwrapLoop(tree, uid) {
    var at = locate(tree, uid);
    if (at.item.kind !== "loop") throw new EditError("Not a loop.");
    Array.prototype.splice.apply(at.seq, [at.index, 1].concat(at.item.body));
    return at.item;
  }

  /** Wrap an existing item in a new loop (loop back to just before it). */
  function wrapInLoop(tree, uid, transition) {
    var at = locate(tree, uid);
    if (!at.seq) throw new EditError("Cannot wrap a loop-back transition.");
    var loop = newLoop(transition);
    loop.body.push(at.item);
    at.seq.splice(at.index, 1, loop);
    return loop;
  }

  function addLane(tree, parallelUid) {
    var p = locate(tree, parallelUid).item;
    if (p.kind !== "parallel") throw new EditError("Not a branch.");
    p.lanes.push([]);
    return p.lanes.length - 1;
  }

  /**
   * Delete one branch lane and everything in it. With two lanes the branch is
   * dissolved and the surviving lane's items take its place on the route.
   */
  function removeLane(tree, parallelUid, laneIndex) {
    var at = locate(tree, parallelUid);
    var p = at.item;
    if (p.kind !== "parallel") throw new EditError("Not a branch.");
    if (!p.lanes[laneIndex]) throw new EditError("No such lane.");
    var removed = p.lanes.splice(laneIndex, 1)[0];
    if (p.laneDummies) p.laneDummies.splice(laneIndex, 1);
    if (p.lanes.length === 1) Array.prototype.splice.apply(at.seq, [at.index, 1].concat(p.lanes[0]));
    return removed;
  }

  /** Every step reId in a subtree (for reporting what a delete removes). */
  function stepsIn(item) {
    var out = [];
    (function rec(it) {
      if (it.kind === "step") out.push(it.reId);
      if (it.kind === "parallel") it.lanes.forEach(function (l) { l.forEach(rec); });
      if (it.kind === "loop") it.body.forEach(rec);
    })(item);
    return out;
  }

  BE.ops = {
    EditError: EditError,
    locate: locate,
    resolveSeq: resolveSeq,
    newStep: newStep,
    newTransition: newTransition,
    newParallel: newParallel,
    newLoop: newLoop,
    insert: insert,
    detach: detach,
    move: move,
    remove: remove,
    unwrapLoop: unwrapLoop,
    wrapInLoop: wrapInLoop,
    addLane: addLane,
    removeLane: removeLane,
    stepsIn: stepsIn,
  };
})(typeof window !== "undefined" ? window : globalThis);
