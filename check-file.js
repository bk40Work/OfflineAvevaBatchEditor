/* Validate a saved recipe: every ProcedureLogic parses as a structured route
   and every link endpoint exists.  Usage: node tests/check-file.js file.xml */
"use strict";
const fs = require("fs");
const { BE, owners } = require("./harness");
const file = process.argv[2];
const doc = new BE.RecipeDoc(fs.readFileSync(file, "utf8"));
let n = 0;
for (const o of owners(doc.doc)) {
  BE.sfc.parse(o);
  n++;
}
console.log(`${n} routes valid`);
