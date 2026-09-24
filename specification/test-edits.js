/* Behaviour tests for all three levels, undo/redo, formula housekeeping and a
   random-edit fuzz run that must never produce an invalid route. */
"use strict";
const { BE, fixture, fixtures, graphSignature, owners, check, summary, pretty, findUid, byName } = require("./harness");
const A = BE.actions, X = BE.xml, ops = BE.ops;

function count(doc, local, ns = X.NS) { return doc.doc.getElementsByTagNameNS(ns, local).length; }

// ---- Unit Procedure and Operation levels ---------------------------------
{
  const doc = new BE.RecipeDoc(fixture("Simple"));
  let t = doc.tree(doc.master);
  A.addUnitProcedure(doc, t, { seq: "top", index: 1 }, "Second", "sFormulation");
  t = doc.tree(doc.master);
  check(pretty(doc, t.seq) === "Single, Second", "add Unit Procedure at end: " + pretty(doc, t.seq));
  const up2 = doc.re(t.seq[1].reId);
  let ut = doc.tree(up2);
  A.addOperation(doc, ut, { seq: "top", index: 0 }, "Op A");
  ut = doc.tree(doc.re(t.seq[1].reId));
  A.addTransition(doc, ut, { seq: "top", index: 1 }, 'Ask("ok?")');
  ut = doc.tree(doc.re(t.seq[1].reId));
  A.addOperation(doc, ut, { seq: "top", index: 2 }, "Op B");
  ut = doc.tree(doc.re(t.seq[1].reId));
  check(pretty(doc, ut.seq) === "Op A, T, Op B", "operations with transition: " + pretty(doc, ut.seq));
  A.wrapInLoop(doc, ut, ut.seq[2].uid, "");
  ut = doc.tree(doc.re(t.seq[1].reId));
  check(pretty(doc, ut.seq) === "Op A, T, LOOP{Op B}", "loop at operation level: " + pretty(doc, ut.seq));
  A.addBranch(doc, ut, { seq: "top", index: 0 }, 3);
  ut = doc.tree(doc.re(t.seq[1].reId));
  A.move(doc, ut, findUid(doc, ut, byName(doc, "Op A")), { seq: ut.seq[0].uid + ":2", index: 0 });
  ut = doc.tree(doc.re(t.seq[1].reId));
  check(pretty(doc, ut.seq) === "||[ |  | Op A], T, LOOP{Op B}", "branch at operation level: " + pretty(doc, ut.seq));
  // phases inside the new operation
  const opB = doc.re(findReByName(doc, ut, "Op B"));
  let pt = doc.tree(opB);
  A.addPhase(doc, pt, { seq: "top", index: 0 }, { phaseType: "Process", name: "mixerOn", parentInstance: "sFormulation", processClass: "sFormulation" }, MODEL_DATA);
  pt = doc.tree(doc.re(findReByName(doc, doc.tree(doc.re(t.seq[1].reId)), "Op B")));
  check(pretty(doc, pt.seq) === "mixerOn", "phase in new operation");
  const formulaBefore = Object.keys(doc.formulaIndex()).length;
  check(formulaBefore === 4, "new mixerOn adds 2 formula parameters (have " + formulaBefore + ")");
  // Save and reload keeps everything
  const again = new BE.RecipeDoc(doc.xml());
  check(pretty(again, again.tree(again.master).seq) === "Single, Second", "reload keeps unit procedures");
  // Delete the whole second unit procedure: its phases' formula records go too.
  t = doc.tree(doc.master);
  A.remove(doc, t, t.seq[1].uid);
  check(Object.keys(doc.formulaIndex()).length === 2, "deleting a UP purges its phases' formula records");
  check(pretty(doc, doc.tree(doc.master).seq) === "Single", "UP deleted");
  // Undo / redo
  doc.undo();
  check(pretty(doc, doc.tree(doc.master).seq) === "Single, Second", "undo restores UP");
  check(Object.keys(doc.formulaIndex()).length === 4, "undo restores formula");
  doc.redo();
  check(pretty(doc, doc.tree(doc.master).seq) === "Single", "redo deletes again");
}
function findReByName(doc, tree, name) {
  let id = null;
  BE.sfc.walkItems(tree.seq, (it) => { if (it.kind === "step" && doc.name(doc.re(it.reId)) === name) id = it.reId; });
  return id;
}

// ---- Guard rails: a failed edit changes nothing -------------------------
{
  const doc = new BE.RecipeDoc(fixture("Move_2"));
  const opEl = () => { const all = doc.doc.getElementsByTagNameNS(X.NS, "RecipeElement"); for (let i = 0; i < all.length; i++) if (X.reType(all[i]) === "Operation") return all[i]; };
  const before = doc.xml();
  let t = doc.tree(opEl());
  const par = t.seq.find((i) => i.kind === "parallel");
  let threw = false;
  try { A.move(doc, t, par.uid, { seq: par.uid + ":0", index: 0 }); } catch (e) { threw = /inside itself/.test(e.message); }
  check(threw, "moving a branch into itself is refused");
  check(doc.xml() === before, "refused edit leaves XML untouched");
  check(!doc.canUndo(), "refused edit is not on the undo stack");
  // Remove a loop keeps its body
  t = doc.tree(opEl());
  const loop = t.seq.find((i) => i.kind === "loop");
  A.removeLoop(doc, t, loop.uid);
  t = doc.tree(opEl());
  check(!t.seq.some((i) => i.kind === "loop") && pretty(doc, t.seq).indexOf("T, feedCipWater") >= 0, "remove loop keeps feedCipWater: " + pretty(doc, t.seq));
  // Deleting a loop's own transition = remove loop
  doc.undo();
  t = doc.tree(opEl());
  const lp = t.seq.find((i) => i.kind === "loop");
  A.remove(doc, t, lp.trans.uid);
  check(!doc.tree(opEl()).seq.some((i) => i.kind === "loop"), "deleting the loop-back transition removes the loop");
  // Three-lane branch: removing one lane keeps a 2-lane branch
  doc.undo();
  t = doc.tree(opEl());
  const p0 = t.seq.find((i) => i.kind === "parallel");
  A.addLane(doc, t, p0.uid);
  t = doc.tree(opEl());
  check(t.seq.find((i) => i.kind === "parallel").lanes.length === 3, "add lane");
  A.removeLane(doc, t, t.seq.find((i) => i.kind === "parallel").uid, 0);
  t = doc.tree(opEl());
  check(pretty(doc, t.seq).indexOf("||[coolingOff, circulateMaxShea | ]") >= 0, "3->2 lanes: " + pretty(doc, t.seq));
}

// ---- Transition adjacency rules produce valid AVEVA shapes ----------------
{
  const doc = new BE.RecipeDoc(fixture("Simple"));
  const op = () => { const all = doc.doc.getElementsByTagNameNS(X.NS, "RecipeElement"); for (let i = 0; i < all.length; i++) if (X.reType(all[i]) === "Operation") return all[i]; };
  let t = doc.tree(op());
  A.addTransition(doc, t, { seq: "top", index: 1 }, "");
  t = doc.tree(op());
  A.addTransition(doc, t, { seq: "top", index: 2 }, "");
  t = doc.tree(op());
  A.addBranch(doc, t, { seq: "top", index: 1 }, 2);
  t = doc.tree(op());
  check(pretty(doc, t.seq) === "mixerOn, ||[ | ], T, T", "join -> T -> T: " + pretty(doc, t.seq));
  const sig = graphSignature(op());
  check(/ParallelConvergent:[^\n]*>\d+DUMMY/.test(sig), "join feeding a transition goes through a DUMMY");
  check(/ControlLink:\d+T>\d+DUMMY/.test(sig), "transition -> transition goes through a DUMMY");
}

// ---- Fuzz: random edits on every fixture must always commit and reload ----
{
  let seed = parseInt(process.env.SEED || "12345", 10);
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  let edits = 0, refusals = 0;
  const files = fixtures().filter((f) => !/wip_P \(2\)/.test(f));
  files.forEach((f) => {
    const doc = new BE.RecipeDoc(fixture(f));
    for (let n = 0; n < (parseInt(process.env.FUZZ_N, 10) || 25); n++) {
      const all = owners(doc.doc); // re-read: a refused edit restores the document
      const owner = all[rnd(all.length)];
      let t;
      try { t = doc.tree(owner); } catch (e) { continue; }
      const items = [], seqs = ["top"];
      BE.sfc.walkItems(t.seq, (it) => {
        items.push(it);
        if (it.kind === "parallel") it.lanes.forEach((_, k) => seqs.push(it.uid + ":" + k));
        if (it.kind === "loop") { seqs.push(it.uid + ":body"); items.push(it.trans); }
      });
      const seqKey = seqs[rnd(seqs.length)];
      const pos = { seq: seqKey, index: rnd(ops.resolveSeq(t, seqKey).length + 1) };
      const pick = items.length ? items[rnd(items.length)] : null;
      try {
        switch (rnd(7)) {
          case 0: if (pick) A.move(doc, t, pick.uid, pos); break;
          case 1: if (pick) A.remove(doc, t, pick.uid); break;
          case 2: A.addTransition(doc, t, pos, ""); break;
          case 3: A.addBranch(doc, t, pos, 2 + rnd(5), rnd(2) ? "Parallel" : "Serial"); break;
          case 4: A.addLoop(doc, t, pos, ""); break;
          case 5: { const p = items.find((i) => i.kind === "parallel"); if (p) A.removeLane(doc, t, p.uid, rnd(p.lanes.length)); break; }
          case 6: if (pick && pick.kind !== "transition") A.wrapInLoop(doc, t, pick.uid, ""); break;
        }
        edits++;
      } catch (e) {
        if (!(e instanceof ops.EditError)) { check(false, `${f}: unexpected ${e.message}`); break; }
        refusals++;
      }
    }
    // After all edits: save, reload, every route parses and every link endpoint exists.
    const re = new BE.RecipeDoc(doc.xml());
    owners(re.doc).forEach((o) => {
      try { BE.sfc.parse(o); check(true); } catch (e) { check(false, `${f}: route broken after fuzz: ${e.message}`); }
    });
  });
  console.log(`fuzz: ${edits} edits applied, ${refusals} correctly refused`);
}
// ---- Cross-container move keeps the phase's element and formula ------------
{
  const doc = new BE.RecipeDoc(fixture("Simple8"));
  const ops_ = () => { const r = []; const all = doc.doc.getElementsByTagNameNS(X.NS, "RecipeElement"); for (let i = 0; i < all.length; i++) if (X.reType(all[i]) === "Operation") r.push(all[i]); return r; };
  const [op1, op2] = ops_();
  const t1 = doc.tree(op1);
  const coolingKey = "S:" + findReByName(doc, t1, "coolingOn");
  const fBefore = Object.keys(doc.formulaIndex()).length;
  A.transfer(doc, op1, coolingKey, doc.tree(op2), { seq: "top", index: 0 });
  const [a, b] = ops_();
  check(pretty(doc, doc.tree(b).seq).startsWith("coolingOn, T"), "phase moved to other operation: " + pretty(doc, doc.tree(b).seq));
  check(pretty(doc, doc.tree(a).seq).indexOf("coolingOn") < 0, "phase removed from source operation");
  check(Object.keys(doc.formulaIndex()).length === fBefore, "formula records kept on cross-container move");
  check(doc.re(coolingKey.slice(2)) !== null, "same RecipeElement ID kept");
  const re = new BE.RecipeDoc(doc.xml());
  owners(re.doc).forEach((o) => BE.sfc.parse(o));
  check(true, "reload after transfer");
}
// ---- Changing a UP's process instance re-binds its process phases ---------
{
  const doc = new BE.RecipeDoc(fixture("Simple"));
  const up = doc.re(doc.tree(doc.master).seq[0].reId);
  doc.edit("add instance", () => {
    const req = doc.requirements()[0];
    const pi = X.append(req.el, "ProcessInstance", undefined, X.EXT);
    X.append(pi, "Name", "sFormulation2", X.EXT); X.append(pi, "Unit", "", X.EXT); X.append(pi, "UnitSelectionMode", "Auto", X.EXT);
  });
  const n = doc.edit("rebind", () => doc.setUpProcessInstance(up, "sFormulation2"));
  check(n === 1, "one phase re-bound");
  const parents = Array.from(doc.doc.getElementsByTagNameNS(X.EXT, "ParentInstance")).map((e) => e.textContent);
  check(parents.every((p) => p === "sFormulation2"), "phase and formula ParentInstance follow the unit procedure: " + parents.join(","));
}
// ---- Branch modes: execute all (Parallel) / execute one (Serial), any lane count
{
  const doc = new BE.RecipeDoc(fixture("Simple"));
  const op = () => { const all = doc.doc.getElementsByTagNameNS(X.NS, "RecipeElement"); for (let i = 0; i < all.length; i++) if (X.reType(all[i]) === "Operation") return all[i]; };
  let t = doc.tree(op());
  A.addBranch(doc, t, { seq: "top", index: 1 }, 7, "Serial");
  t = doc.tree(op());
  const p = t.seq[1];
  check(p.kind === "parallel" && p.mode === "Serial" && p.lanes.length === 7, "7-lane execute-one branch");
  const sig = graphSignature(op());
  check(/SerialDivergent:[^\n]*(\+\d+DUMMY){6}/.test(sig) && /SerialConvergent:/.test(sig) && !/Parallel/.test(sig), "written as SerialDivergent / SerialConvergent with 7 lanes");
  // phases in a serial lane, nested parallel inside a serial lane
  A.addPhase(doc, t, { seq: p.uid + ":3", index: 0 }, { phaseType: "Process", name: "mixerOff", parentInstance: "sFormulation", processClass: "sFormulation" }, MODEL_DATA);
  t = doc.tree(op());
  A.addBranch(doc, t, { seq: t.seq[1].uid + ":0", index: 0 }, 2, "Parallel");
  t = doc.tree(op());
  check(pretty(doc, t.seq) === "mixerOn, ||[||[ | ] |  |  | mixerOff |  |  | ]", "nested parallel in serial: " + pretty(doc, t.seq));
  // switch mode and back; save/reload keeps it
  A.setBranchMode(doc, t, t.seq[1].uid, "Parallel");
  check(doc.tree(op()).seq[1].mode === "Parallel", "change to execute all");
  t = doc.tree(op());
  A.setBranchMode(doc, t, t.seq[1].uid, "Serial");
  const re = new BE.RecipeDoc(doc.xml());
  const all = re.doc.getElementsByTagNameNS(X.NS, "RecipeElement"); let o2; for (let i = 0; i < all.length; i++) if (X.reType(all[i]) === "Operation") o2 = all[i];
  const rt = re.tree(o2);
  check(rt.seq[1].mode === "Serial" && rt.seq[1].lanes.length === 7 && rt.seq[1].lanes[0][0].mode === "Parallel", "save/reload keeps modes and lane count");
  // lane deletion on serial behaves like parallel
  t = doc.tree(op());
  for (let k = 0; k < 5; k++) { A.removeLane(doc, t, t.seq[1].uid, 6 - k); t = doc.tree(op()); }
  check(t.seq[1].lanes.length === 2 && t.seq[1].mode === "Serial", "remove lanes down to 2");
  // limits
  let threw = 0;
  try { A.addBranch(doc, t, { seq: "top", index: 0 }, 1, "Serial"); } catch (e) { threw++; }
  try { A.addBranch(doc, t, { seq: "top", index: 0 }, 3, "Bogus"); } catch (e) { threw++; }
  check(threw === 2, "invalid lane count / mode refused");
}
// ---- Bill of materials: where each material is used
{
  const doc = new BE.RecipeDoc(fixture("GM_A17392"));
  const mats = doc.materials().filter((m) => m.type === "ProcessInput");
  const used = mats.map((m) => ({ m, a: doc.materialAllocations(m.id) })).filter((x) => x.a.length);
  check(used.length > 10, "production recipe: materials with allocations (" + used.length + ")");
  const a = used[0].a[0];
  check(a.upName && a.opName && a.phaseName && a.param, "allocation names unit procedure / operation / phase / parameter: " + [a.upName, a.opName, a.phaseName, a.param].join(" / "));
  // changing an allocation quantity changes the phase parameter
  doc.edit("alloc", () => doc.setPhaseParam(doc.re(a.phaseId), a.param, "3.21"));
  check(doc.materialAllocations(used[0].m.id)[0].value === "3.21", "allocation quantity edited on the phase");
  // moving a phase to another operation keeps its material allocation
  const before = doc.materialAllocations(used[0].m.id).length;
  const ops_ = []; const all = doc.doc.getElementsByTagNameNS(X.NS, "RecipeElement");
  for (let i = 0; i < all.length; i++) if (X.reType(all[i]) === "Operation") ops_.push(all[i]);
  const src = doc.re(a.phaseId).parentNode, dst = ops_.find((o) => o !== src);
  A.transfer(doc, src, "S:" + a.phaseId, doc.tree(dst), { seq: "top", index: 0 });
  const after = doc.materialAllocations(used[0].m.id);
  check(after.length === before && after.some((x) => x.opName === doc.name(dst)), "allocation follows the phase to its new operation");
}
summary();
