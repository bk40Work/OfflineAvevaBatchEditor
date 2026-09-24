/* Test harness: loads the browser core modules into Node using @xmldom/xmldom. */
"use strict";
const path = require("path");
const fs = require("fs");
const xmldom = require("@xmldom/xmldom");
globalThis.DOMParser = xmldom.DOMParser;
globalThis.XMLSerializer = xmldom.XMLSerializer;
const CORE = path.join(__dirname, "..", "app", "js", "core");
const CONFIG = path.join(__dirname, "..", "app", "config");
function load(file) {
  // Core files are classic browser scripts that register on globalThis.BatchEditor.
  new Function(fs.readFileSync(file, "utf8"))();
}
const modelSrc = fs.readFileSync(path.join(CONFIG, "model_SC.js"), "utf8");
globalThis.MODEL_DATA = new Function(modelSrc + "; return MODEL_DATA;")();
const matSrc = fs.readFileSync(path.join(CONFIG, "materials_SC.js"), "utf8");
globalThis.MATERIALS_DATA = new Function(matSrc + "; return MATERIALS_DATA;")();
["xml.js", "sfc.js", "recipe-doc.js", "edit-ops.js", "actions.js"].forEach((f) => {
  const p = path.join(CORE, f);
  if (fs.existsSync(p)) load(p);
});
const BE = globalThis.BatchEditor;
const FIX = path.join(__dirname, "..", "ExampleConfigs");
function fixture(name) {
  return fs.readFileSync(path.join(FIX, name.endsWith(".xml") ? name : name + ".xml"), "utf8");
}
function fixtures() {
  return fs.readdirSync(FIX).filter((f) => f.endsWith(".xml")).sort();
}

/**
 * ID-free signature of a native ProcedureLogic graph, including DUMMYs.
 * Depth-first from Begin; nodes named by type (and Phase/Operation/UP name).
 */
function graphSignature(owner) {
  const X = BE.xml;
  const g = BE.sfc.readGraph(owner);
  if (!g.pl) return "(no logic)";
  const name = (k) => {
    const n = g.nodes[k];
    if (n.isT) return "T";
    const re = g.reById[n.reId];
    let nm = "";
    ["PhaseInformation", "OperationInformation", "UnitProcedureInformation"].forEach((t) => {
      const i = re && X.kid(re, t, X.EXT);
      if (i) nm = X.text(i, "Name", X.EXT);
    });
    return n.type + (nm ? "(" + nm + ")" : "");
  };
  const begin = Object.keys(g.nodes).find((k) => g.nodes[k].type === "Begin");
  const idx = {};
  let counter = 0;
  const lines = [];
  const stack = [begin];
  while (stack.length) {
    const k = stack.shift();
    if (idx[k] !== undefined) continue;
    idx[k] = counter++;
    (g.out[k] || []).forEach((l) => l.to.forEach((t) => stack.push(t)));
  }
  // Also include any unreachable nodes deterministically
  Object.keys(g.nodes).forEach((k) => { if (idx[k] === undefined) idx[k] = counter++; });
  g.links
    .map((l) => l.type + ":" + l.from.map((k) => idx[k] + name(k)).join("+") + ">" + l.to.map((k) => idx[k] + name(k)).join("+"))
    .sort()
    .forEach((s) => lines.push(s));
  return lines.join("\n");
}
function owners(doc) {
  const X = BE.xml;
  const out = [];
  const mr = doc.getElementsByTagNameNS(X.NS, "MasterRecipe")[0];
  (function rec(o) {
    if (X.kid(o, "ProcedureLogic", X.NS)) out.push(o);
    X.kids(o, "RecipeElement", X.NS).forEach(rec);
  })(mr);
  return out;
}
let failures = 0, passes = 0;
function check(cond, msg) {
  if (cond) passes++;
  else { failures++; console.log("  FAIL: " + msg); }
}
function summary() {
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exitCode = failures ? 1 : 0;
}
module.exports = { BE, fixture, fixtures, graphSignature, owners, check, summary };
/** Readable tree using element names, e.g. mixerOn, T[cond], ||[a | b], LOOP{...} */
function pretty(doc, seq) {
  const X = BE.xml;
  return seq.map((it) => {
    if (it.kind === "step") { const re = doc.re ? doc.re(it.reId) : null; return re ? doc.name(re) : "S" + it.reId; }
    if (it.kind === "transition") return "T";
    if (it.kind === "loop") return "LOOP{" + pretty(doc, it.body) + "}";
    if (it.kind === "parallel") return "||[" + it.lanes.map((l) => pretty(doc, l)).join(" | ") + "]";
  }).join(", ");
}
/** Owner RecipeElement by path of names: [] = master, ["UP"] = unit procedure, ["UP","Op"] = operation */
function ownerByPath(doc, names) {
  const X = BE.xml;
  let o = doc.master;
  for (const n of names) {
    o = X.kids(o, "RecipeElement", X.NS).find((r) => doc.info(r) && doc.name(r) === n);
    if (!o) throw new Error("No element " + n);
  }
  return o;
}
function findUid(doc, tree, pred) {
  let hit = null;
  BE.sfc.walkItems(tree.seq, (it) => { if (!hit && pred(it)) hit = it.uid; });
  return hit;
}
function byName(doc, name, nth = 0) {
  return (it) => it.kind === "step" && doc.name(doc.re(it.reId)) === name && nth-- === 0;
}
Object.assign(module.exports, { pretty, ownerByPath, findUid, byName });
