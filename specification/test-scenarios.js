/* Native evidence tests: perform the same edit AVEVA's editor performed, using the
   editor's own actions, and require the resulting ProcedureLogic to be identical
   (ID-free, DUMMYs included) to AVEVA's exported "after" file. */
"use strict";
const { BE, fixture, graphSignature, check, summary, pretty, findUid, byName } = require("./harness");
const A = BE.actions, X = BE.xml;

function opOwner(doc, opName, n = 0) {
  const all = doc.doc.getElementsByTagNameNS(X.NS, "RecipeElement");
  const hits = [];
  for (let i = 0; i < all.length; i++) if (X.reType(all[i]) === "Operation" && doc.name(all[i]) === opName) hits.push(all[i]);
  return hits[n];
}
function scenario(title, before, after, opName, edit, n = 0) {
  const doc = new BE.RecipeDoc(fixture(before));
  const owner = opOwner(doc, opName, n);
  let tree = doc.tree(owner);
  try {
    edit(doc, tree);
  } catch (e) {
    check(false, `${title}: ${e.message}`);
    return;
  }
  const got = graphSignature(opOwner(doc, opName, n));
  const ref = new BE.RecipeDoc(fixture(after));
  const want = graphSignature(opOwner(ref, opName, n));
  const ok = got === want;
  check(ok, `${title}\n    got : ${pretty(doc, doc.tree(opOwner(doc, opName, n)).seq)}\n    want: ${pretty(ref, ref.tree(opOwner(ref, opName, n)).seq)}${process.env.VERBOSE ? "\n" + got + "\n----\n" + want : ""}`);
  if (ok) console.log("  ok  " + title);
  // Every scenario must also survive save -> reload unchanged.
  const reloaded = new BE.RecipeDoc(doc.xml());
  check(graphSignature(opOwner(reloaded, opName, n)) === got, `${title}: save/reload changed the graph`);
}
// helpers --------------------------------------------------------------
const top = (i) => ({ seq: "top", index: i });
const lane = (tree, parUid, k, i) => ({ seq: parUid + ":" + k, index: i });
const nthParallel = (tree, n) => { let c = -1, hit = null; BE.sfc.walkItems(tree.seq, (it) => { if (it.kind === "parallel" && ++c === n) hit = it; }); return hit; };
const topIndex = (tree, uid) => tree.seq.findIndex((it) => it.uid === uid);
const loopOf = (tree) => tree.seq.find((it) => it.kind === "loop");
const transitionAt = (tree) => tree.seq.find((it) => it.kind === "transition");

console.log("Movement (Move_* chain)");
scenario("Move_ -> Move_1: mixerOn before setTempLimit", "Move_", "Move_1", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "mixerOn")), top(0)));
scenario("Move_1 -> Move_2: setTempLimit after mixerOff", "Move_1", "Move_2", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "setTempLimit")), top(3)));
scenario("Move2a: feedCipWater out of loop, before first fork", "Move_2", "Move_2a", "UP", (d, t) => {
  const p = nthParallel(t, 0);
  A.move(d, t, findUid(d, t, byName(d, "feedCipWater")), top(topIndex(t, p.uid)));
});
scenario("Move2b: circulatePump from Branch A end to before first fork", "Move_2", "Move_2b_correct", "UP", (d, t) => {
  const p = nthParallel(t, 0);
  A.move(d, t, findUid(d, t, byName(d, "circulatePump")), top(topIndex(t, p.uid)));
});
scenario("Move2c: circulatePump from Branch A to after first join", "Move_2", "Move_2c", "UP", (d, t) => {
  const p = nthParallel(t, 0);
  A.move(d, t, findUid(d, t, byName(d, "circulatePump")), top(topIndex(t, p.uid) + 1));
});
scenario("Move2d (spec intent): post-join circulatePump back to end of Branch A == Move_2", "Move_2c", "Move_2", "UP", (d, t) => {
  const p = nthParallel(t, 0);
  A.move(d, t, findUid(d, t, byName(d, "circulatePump")), lane(t, p.uid, 0, 1));
});
scenario("Move_2 -> Move_3: setTempLimit after Transition", "Move_2", "Move_3", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "setTempLimit")), top(4)));
scenario("Move_3 -> Move_4: mixerOff before mixerOn", "Move_3", "Move_4", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "mixerOff")), top(0)));
scenario("Move_4 -> Move_5: setTempLimit into loop body", "Move_4", "Move_5", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "setTempLimit")), { seq: loopOf(t).uid + ":body", index: 0 }));
scenario("Move_5 -> Move_6: feedCipWater from loop into Branch A start", "Move_5", "Move_6", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "feedCipWater")), lane(t, nthParallel(t, 0).uid, 0, 0)));
scenario("Move_6 -> Move_7: coolingOn from Branch A to before fork", "Move_6", "Move_7", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "coolingOn")), top(topIndex(t, nthParallel(t, 0).uid))));
scenario("Move_7 -> Move_8: circulatePump after join", "Move_7", "Move_8", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "circulatePump")), top(topIndex(t, nthParallel(t, 0).uid) + 1)));
scenario("Move_8 -> Move_9: reorder inside Branch B", "Move_8", "Move_9", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "circulateMaxShea")), lane(t, nthParallel(t, 0).uid, 1, 0)));
scenario("Move_9 -> Move_10: post-join circulatePump into Branch A end", "Move_9", "Move_10", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "circulatePump")), lane(t, nthParallel(t, 0).uid, 0, 1)));
scenario("Move_10 -> Move_10a: Branch A to Branch B middle", "Move_10", "Move_10a", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "feedCipWater")), lane(t, nthParallel(t, 0).uid, 1, 1)));
scenario("Move_10a -> Move_10b: last item leaves Branch A (empty lane)", "Move_10a", "Move_10b", "UP", (d, t) =>
  A.move(d, t, findUid(d, t, byName(d, "circulatePump")), lane(t, nthParallel(t, 0).uid, 1, 1)));
scenario("Move_10b -> Move_11: mixerOff after nested join", "Move_10b", "Move_11", "UP", (d, t) => {
  const p = nthParallel(t, 1);
  A.move(d, t, findUid(d, t, byName(d, "mixerOff", 1)), lane(t, p.uid, 1, 2));
});
scenario("Move_11 -> Move_12: coolingOff out of nested lane to before nested fork", "Move_11", "Move_12", "UP", (d, t) => {
  const p = nthParallel(t, 1);
  A.move(d, t, findUid(d, t, byName(d, "coolingOff", 1)), lane(t, p.uid, 1, 0));
});
scenario("Move_12 -> Move_13: coolingOff into nested Branch B", "Move_12", "Move_13", "UP", (d, t) => {
  const inner = nthParallel(t, 2);
  A.move(d, t, findUid(d, t, byName(d, "coolingOff", 1)), lane(t, inner.uid, 1, 0));
});

console.log("Creation (Simple* chain)");
scenario("Simple -> Simple2: branch after mixerOn", "Simple", "Simple2", "1", (d, t) => A.addBranch(d, t, top(1), 2));
scenario("Simple3 -> Simple4: nested branch in lane A", "Simple3", "Simple4", "1", (d, t) =>
  A.addBranch(d, t, lane(t, nthParallel(t, 0).uid, 0, 1), 2));
scenario("Simple4 -> Simple5: phase after nested join", "Simple4", "Simple5", "1", (d, t) =>
  A.addPhase(d, t, lane(t, nthParallel(t, 0).uid, 0, 2), { phaseType: "Process", name: "feedPWater", parentInstance: "sFormulation", processClass: "sFormulation" }, MODEL_DATA));
scenario("Simple5 -> Simple6: phase into empty nested lane", "Simple5", "Simple6", "1", (d, t) =>
  A.addPhase(d, t, lane(t, nthParallel(t, 1).uid, 0, 0), { phaseType: "Process", name: "mixerOn", parentInstance: "sFormulation", processClass: "sFormulation" }, MODEL_DATA));
scenario("Simple6 -> Simple7: loop {T, coolingOn} in empty nested lane", "Simple6", "Simple7", "1", (d, t) => {
  const inner = nthParallel(t, 1);
  A.addLoop(d, t, lane(t, inner.uid, 1, 0), "");
  t = d.tree(t.owner);
  const lp = (() => { let h; BE.sfc.walkItems(t.seq, (it) => { if (it.kind === "loop") h = it; }); return h; })();
  A.addTransition(d, t, { seq: lp.uid + ":body", index: 0 }, "");
  t = d.tree(t.owner);
  let lp2; BE.sfc.walkItems(t.seq, (it) => { if (it.kind === "loop") lp2 = it; });
  A.addPhase(d, t, { seq: lp2.uid + ":body", index: 1 }, { phaseType: "Process", name: "coolingOn", parentInstance: "sFormulation", processClass: "sFormulation" }, MODEL_DATA);
});

console.log("Deletion (Simple* chain)");
scenario("Simple8 -> Simple9: delete sole lane phase (lane becomes DUMMY)", "Simple8", "Simple9", "new", (d, t) =>
  A.remove(d, t, findUid(d, t, byName(d, "feedCipWater"))));
scenario("Simple9 -> Simple10: delete branch whose survivor lane is empty", "Simple9", "Simple10", "new", (d, t) =>
  A.removeLane(d, t, nthParallel(t, 1).uid, 0));
scenario("Simple10 -> Simple11: delete lane A, survivor promoted, then Transition", "Simple10", "Simple11", "new", (d, t) => {
  A.removeLane(d, t, nthParallel(t, 0).uid, 0);
  t = d.tree(t.owner);
  A.remove(d, t, transitionAt(t).uid);
});
scenario("Simple10 -> Simple11b: delete lane B, survivor promoted, then Transition", "Simple10", "Simple11b", "new", (d, t) => {
  A.removeLane(d, t, nthParallel(t, 0).uid, 1);
  t = d.tree(t.owner);
  A.remove(d, t, transitionAt(t).uid);
});
scenario("Simple12 -> Simple12a: delete phase after nested join (DUMMY connector)", "Simple12", "Simple12a", "1", (d, t) =>
  A.remove(d, t, findUid(d, t, byName(d, "feedPWater"))));
scenario("Simple12a -> Simple12b: delete nested lane B (loop) — survivor promoted", "Simple12a", "Simple12b", "1", (d, t) =>
  A.removeLane(d, t, nthParallel(t, 1).uid, 1));
scenario("Simple12a -> Simple12c: delete nested lane A — loop survivor promoted", "Simple12a", "Simple12c", "1", (d, t) =>
  A.removeLane(d, t, nthParallel(t, 1).uid, 0));
scenario("Simple12a -> Simple12d: delete initial phase (fork from Begin)", "Simple12a", "Simple12d", "1", (d, t) =>
  A.remove(d, t, findUid(d, t, byName(d, "mixerOn", 0))));
scenario("Simple12d -> Simple12e: delete outer lane B — lane A promoted", "Simple12d", "Simple12e", "1", (d, t) =>
  A.removeLane(d, t, nthParallel(t, 0).uid, 1));

summary();
