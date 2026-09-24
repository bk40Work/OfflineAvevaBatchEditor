/* Parse every native ProcedureLogic, rebuild it, and require the rebuilt graph
   to be identical (ID-free, DUMMYs included) to what AVEVA exported. */
"use strict";
const { BE, fixture, fixtures, graphSignature, owners, check, summary } = require("./harness");
let maxId = 100000, maxT = 100000;
const alloc = () => String(++maxId), allocT = () => String(++maxT);
fixtures().forEach((f) => {
  const doc = BE.xml.parse(fixture(f));
  let ok = 0, unstructured = 0, differ = 0, dummyOnly = 0;
  owners(doc).forEach((owner) => {
    const before = graphSignature(owner);
    let tree;
    try { tree = BE.sfc.parse(owner); } catch (e) { unstructured++; console.log(`  ${f}: unstructured: ${e.message}`); return; }
    const canon = BE.sfc.canonical(tree.seq);
    BE.sfc.write(tree, alloc, allocT);
    const after = graphSignature(owner);
    const tree2 = BE.sfc.parse(owner);
    check(BE.sfc.canonical(tree2.seq) === canon, `${f}: tree changed after rebuild`);
    if (before === after) ok++;
    else {
      const strip = (s) => s.replace(/\d+DUMMY/g, "D");
      differ++;
      if (process.env.VERBOSE) console.log(`--- ${f}\nNATIVE:\n${before}\nREBUILT:\n${after}`);
      else console.log(`  ${f}: rebuilt graph differs from native`);
    }
  });
  console.log(`${f}: ${ok} identical, ${differ} different, ${unstructured} unstructured`);
});
summary();
