/**
 * Consolidated runtime module: core / runtime.js
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
 * Former file: js/app.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// app.js - Application initialisation, state management, and core functions
// Loads config from model_SC.js and materials_SC.js (via script tags)

// ===== CONFIG BRIDGE =====
// MODEL_DATA and MATERIALS_DATA are loaded from config/*.js script tags
var MODEL = MODEL_DATA;
var MATS_DB = {};
var MAT_LIST = [];

(function initConfig() {
  // Build MATS_DB lookup from MATERIALS_DATA array
  for (var i = 0; i < MATERIALS_DATA.length; i++) {
    var m = MATERIALS_DATA[i];
    MATS_DB[m.id] = {
      name: m.name,
      code: m.code,
      type: m.type || "",
      ai: m.ai || false,
    };
  }
  MAT_LIST = MATERIALS_DATA.map(function (m) {
    return {
      id: m.id,
      name: m.name,
      code: m.code,
      type: m.type || "",
      ai: m.ai || false,
    };
  });
})();

// ===== UTILITY =====
function matName(id) {
  return MATS_DB[id] ? MATS_DB[id].name : "";
}
function matCode(id) {
  return MATS_DB[id] ? MATS_DB[id].code : "";
}
function esc(s) {
  return s
    ? s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
    : "";
}
function truncNum(v) {
  if (!v) return v;
  try {
    var f = parseFloat(v);
    if (isNaN(f)) return v;
    if (f === Math.floor(f)) return String(Math.floor(f));
    return f.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
  } catch (e) {
    return v;
  }
}

// ===== STATE =====
var currentRecipeData = null;
var editMode = false;
var laneSelectedUP = 0,
  laneSelectedOp = 0;
var activeDropdown = null;

// AVEVA RecipeElement IDs are runtime identities. They are allocated above the
// maximum parsed ID and are not derived from display names.
function allocateRecipeElementId() {
  if (!currentRecipeData) return "";
  if (!currentRecipeData._nextId)
    currentRecipeData._nextId = (currentRecipeData._maxId || 0) + 1;
  var id = String(currentRecipeData._nextId++);
  currentRecipeData._maxId = Math.max(
    currentRecipeData._maxId || 0,
    parseInt(id, 10) || 0,
  );
  return id;
}

// ===== FILE HANDLING =====
document.addEventListener("dragover", function (e) {
  e.preventDefault();
});
document.addEventListener("drop", function (e) {
  e.preventDefault();
});
var dz = document.getElementById("dropZone"),
  fi = document.getElementById("fileInput");
dz.addEventListener("dragover", function (e) {
  e.preventDefault();
  e.stopPropagation();
  dz.classList.add("dragover");
});
dz.addEventListener("dragleave", function (e) {
  e.preventDefault();
  dz.classList.remove("dragover");
});
dz.addEventListener("drop", function (e) {
  e.preventDefault();
  e.stopPropagation();
  dz.classList.remove("dragover");
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
dz.addEventListener("click", function () {
  fi.click();
});
fi.addEventListener("change", function (e) {
  if (e.target.files.length) handleFile(e.target.files[0]);
});
function handleFile(f) {
  if (!f) return;
  var r = new FileReader();
  r.onload = function (ev) {
    var parsed = parseB2MML(ev.target.result);
    if (parsed) {
      currentRecipeData = parsed;
      var inherited =
        typeof seedInheritedTransfersForProcessClasses === "function" &&
        seedInheritedTransfersForProcessClasses();
      if (inherited) currentRecipeData._recipeCollectionEdit = true;
      renderAll();
    }
  };
  r.readAsText(f);
}

// ===== VIEW & EDIT TOGGLES =====
function toggleEdit() {
  editMode = !editMode;
  document.body.classList.toggle("edit-mode", editMode);
  var btn = document.getElementById("btnEdit");
  btn.classList.toggle("active", editMode);
  btn.textContent = editMode ? "\u2714 Editing" : "\u270E Edit";
  renderAll();
}

// ===== LANE-ONLY VIEW =====
function expandAll() {}
function collapseAll() {}

// ===== SIDEBAR =====
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("open");
  renderSidebar();
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("open");
}
function renderSidebar() {
  if (!currentRecipeData) {
    document.getElementById("sidebarBody").innerHTML =
      '<p style="color:#999">Load a recipe first</p>';
    return;
  }
  var d = currentRecipeData;
  var h =
    '<h4 style="color:#36398E;margin-bottom:8px">Equipment</h4><div style="margin-bottom:12px">';
  h += '<strong style="font-size:0.8em;color:#009F3C">Processes:</strong><br>';
  for (var i = 0; i < d.equipment_requirements.length; i++) {
    var req = d.equipment_requirements[i];
    var names = (
      typeof requirementInstances === "function"
        ? requirementInstances(req)
        : []
    ).map(function (instance) {
      return instance.name;
    });
    h +=
      '<span class="eq-chip">' +
      req.id +
      (names.length ? " · " + names.join(", ") : "") +
      "</span>";
  }
  h +=
    '<br><strong style="font-size:0.8em;color:#36398E;margin-top:6px;display:inline-block">Transfers:</strong><br>';
  for (var i = 0; i < d.equipment_transfers.length; i++) {
    var et = d.equipment_transfers[i];
    h += '<span class="eq-chip transfer">' + et.name + "</span>";
  }
  h +=
    '</div><h4 style="color:#36398E;margin-bottom:8px;margin-top:16px">Materials (' +
    d.materials.length +
    ")</h4>";
  h += '<table style="width:100%;font-size:0.8em;border-collapse:collapse">';
  for (var i = 0; i < d.materials.length; i++) {
    var m = d.materials[i];
    h +=
      '<tr style="border-bottom:1px solid #eee"><td style="padding:3px">' +
      matName(m.material_id) +
      '</td><td style="padding:3px;color:#009F3C;font-weight:500">' +
      (m.quantity || "0") +
      "</td></tr>";
  }
  h += "</table>";
  document.getElementById("sidebarBody").innerHTML = h;
}

// ===== RENDER ALL =====

// ===== RENDER ALL =====
function renderAll() {
  updateVersionBadge();
  if (!currentRecipeData) return;
  try {
    renderHeader();
    renderEquipment();
    renderMaterials();
    renderLaneView();
  } catch (e) {
    console.error("renderAll error:", e);
    var lane = document.getElementById("lanePhList");
    if (lane)
      lane.innerHTML =
        '<div style="color:red;padding:20px">Render error: ' +
        esc(e.message) +
        "</div>";
  }
}

// ===== NEW RECIPE =====
function showNewRecipeDialog() {
  document.getElementById("newRecipeOverlay").style.display = "block";
  document.getElementById("newRecipeDialog").style.display = "block";
  document.getElementById("nr_id").value = "";
  document.getElementById("nr_desc").value = "";
  document.getElementById("nr_product").value = "";
  document.getElementById("nr_batch").value = "";
  document.getElementById("nr_error").style.display = "none";
  setTimeout(function () {
    document.getElementById("nr_id").focus();
  }, 100);
}

function cancelNewRecipeDialog() {
  document.getElementById("newRecipeOverlay").style.display = "none";
  document.getElementById("newRecipeDialog").style.display = "none";
}

function confirmNewRecipe() {
  var id = document.getElementById("nr_id").value.trim();
  var desc = document.getElementById("nr_desc").value.trim();
  var product = document.getElementById("nr_product").value.trim();
  var batch = parseFloat(document.getElementById("nr_batch").value) || 0;
  var errEl = document.getElementById("nr_error");

  if (!id) {
    errEl.textContent = "Recipe ID is required.";
    errEl.style.display = "block";
    document.getElementById("nr_id").focus();
    return;
  }

  cancelNewRecipeDialog();

  // Build blank recipe data structure matching parseB2MML output
  currentRecipeData = {
    id: id,
    description: desc,
    product_id: product,
    product_name: "",
    batch_size_nominal: batch ? String(batch) : "",
    batch_size_uom: "kg",
    approved_production: false,
    approved_test: false,
    source_xml: null,
    equipment_requirements: [],
    equipment_transfers: [],
    materials: [],
    unit_procedures: [],
  };

  // A blank recipe has no Unit Procedure yet. Reset any selection retained from a prior recipe.
  laneSelectedUP = 0;
  laneSelectedOp = 0;

  // Enter edit mode and render
  editMode = true;
  document.body.classList.add("edit-mode");
  document.getElementById("btnEdit").classList.add("active");
  document.getElementById("btnEdit").textContent = "âœŽ Editing";
  renderAll();
}

// ===== VERSION BADGE & REVISION HISTORY =====
function updateVersionBadge() {
  var badge = document.getElementById("versionBadge");
  var label = document.getElementById("versionLabel");
  if (!badge || !label) return;
  if (!currentRecipeData) {
    badge.style.display = "none";
    return;
  }
  var logs = currentRecipeData.modification_logs || [];
  var ver = logs.length;
  badge.style.display = "block";
  label.textContent = "V" + ver;
}

function showHistory() {
  if (!currentRecipeData) return;
  var logs = currentRecipeData.modification_logs || [];
  document.getElementById("hist_recipe_id").textContent =
    currentRecipeData.id || "";
  var body = document.getElementById("histBody");
  if (!logs.length) {
    body.innerHTML =
      '<div style="padding:24px;text-align:center;color:#999;font-style:italic">No revision history recorded</div>';
  } else {
    var h =
      '<table style="width:100%;border-collapse:collapse;font-size:0.85em">';
    h += '<thead><tr style="background:#36398E;color:#fff">';
    h +=
      '<th style="padding:8px 12px;text-align:left;font-weight:500;width:40px">#</th>';
    h +=
      '<th style="padding:8px 12px;text-align:left;font-weight:500;width:140px">Date</th>';
    h +=
      '<th style="padding:8px 12px;text-align:left;font-weight:500;width:80px">Author</th>';
    h +=
      '<th style="padding:8px 12px;text-align:left;font-weight:500">Comment</th>';
    h += "</tr></thead><tbody>";
    // Show newest first
    for (var i = logs.length - 1; i >= 0; i--) {
      var log = logs[i];
      var ver = i + 1;
      var isLatest = i === logs.length - 1;
      var rowBg = isLatest
        ? "background:#e8f5e9"
        : "background:" + (i % 2 === 0 ? "#fff" : "#f8f9fa");
      var dateStr = log.date ? log.date.replace("T", " ").substring(0, 16) : "";
      h += '<tr style="' + rowBg + ';border-bottom:1px solid #eee">';
      h +=
        '<td style="padding:8px 12px;font-weight:700;color:#36398E">V' +
        ver +
        (isLatest
          ? ' <span style="font-size:0.7em;background:#009F3C;color:#fff;padding:1px 5px;border-radius:3px;font-weight:500">CURRENT</span>'
          : "") +
        "</td>";
      h +=
        '<td style="padding:8px 12px;color:#666;font-size:0.9em">' +
        esc(dateStr) +
        "</td>";
      h +=
        '<td style="padding:8px 12px;font-weight:500">' +
        esc(log.author || "") +
        "</td>";
      h +=
        '<td style="padding:8px 12px;color:#444">' +
        esc(log.description || "(no comment)") +
        "</td>";
      h += "</tr>";
    }
    h += "</tbody></table>";
    body.innerHTML = h;
  }
  document.getElementById("histOverlay").style.display = "block";
  var dlg = document.getElementById("histDialog");
  dlg.style.display = "flex";
}

function closeHistory() {
  document.getElementById("histOverlay").style.display = "none";
  document.getElementById("histDialog").style.display = "none";
}

// ===== INIT =====
window.addEventListener("DOMContentLoaded", function () {
  // No demo loaded by default - user must open a file
  // If you want a demo: uncomment next line and add a DEMO var
  // currentRecipeData = DEMO; renderAll();
});

/* ==========================================================================
 * Former file: js/parser.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// parser.js - B2MML XML Parser
// Parses AVEVA Batch MasterRecipe format into internal data model

function parseB2MML(xmlText) {
  try {
    var parser = new DOMParser();
    var doc = parser.parseFromString(xmlText, "text/xml");
    var ns = "http://www.wbf.org/xml/B2MML-V0401";
    var ext = "http://www.wbf.org/xml/B2MML-V0401-AllExtensions";
    function gb(el, tag) {
      var f = el.getElementsByTagNameNS(ns, tag)[0];
      return f && f.textContent ? f.textContent.trim() : "";
    }
    function ge(el, tag) {
      var f = el.getElementsByTagNameNS(ext, tag)[0];
      return f && f.textContent ? f.textContent.trim() : "";
    }
    var recipe = doc.getElementsByTagNameNS(ns, "MasterRecipe")[0];
    if (!recipe) {
      alert("No MasterRecipe found");
      return null;
    }
    var header = recipe.getElementsByTagNameNS(ns, "Header")[0];
    var bsEl = header
      ? header.getElementsByTagNameNS(ns, "BatchSize")[0]
      : null;
    var modLogs = [];
    if (header) {
      var mlEls = header.getElementsByTagNameNS(ns, "ModificationLog");
      for (var mli = 0; mli < mlEls.length; mli++) {
        var ml = mlEls[mli];
        modLogs.push({
          date: gb(ml, "ModifiedDate"),
          description: gb(ml, "Description"),
          author: gb(ml, "Author"),
        });
      }
    }
    var d = {
      id: gb(recipe, "ID"),
      description: gb(recipe, "Description"),
      product_id: header ? gb(header, "ProductID") : "",
      product_name: header ? gb(header, "ProductName") : "",
      batch_size_nominal: bsEl ? gb(bsEl, "Nominal") : "",
      batch_size_min: bsEl ? gb(bsEl, "Min") : "",
      batch_size_max: bsEl ? gb(bsEl, "Max") : "",
      approved_production: header ? ge(header, "ApprovedForProduction") : "",
      approved_test: header ? ge(header, "ApprovedForTest") : "",
      modification_logs: modLogs,
      equipment_requirements: [],
      equipment_transfers: [],
      materials: [],
      unit_procedures: [],
    };
    var children = recipe.childNodes;
    for (var ci = 0; ci < children.length; ci++) {
      var ch = children[ci];
      if (!ch.localName) continue;
      if (ch.localName === "EquipmentRequirement" && ch.namespaceURI === ns) {
        var piEls = ch.getElementsByTagNameNS(ext, "ProcessInstance"),
          instances = [];
        for (var pii = 0; pii < piEls.length; pii++)
          instances.push({
            name: ge(piEls[pii], "Name"),
            unit: ge(piEls[pii], "Unit"),
            mode: ge(piEls[pii], "UnitSelectionMode") || "Auto",
          });
        d.equipment_requirements.push({
          id: gb(ch, "ID"),
          instances: instances,
        });
      }
      if (ch.localName === "EquipmentTransfer" && ch.namespaceURI === ext) {
        var tiEls = ch.getElementsByTagNameNS(ext, "TransferInstance"),
          transferInstances = [];
        for (var tii0 = 0; tii0 < tiEls.length; tii0++)
          transferInstances.push({
            name: ge(tiEls[tii0], "Name"),
            source: ge(tiEls[tii0], "Source"),
            dest: ge(tiEls[tii0], "Destination"),
          });
        d.equipment_transfers.push({
          name: ge(ch, "Name"),
          source: ge(ch, "Source"),
          dest: ge(ch, "Destination"),
          instances: transferInstances,
        });
      }
    }
    var formula = recipe.getElementsByTagNameNS(ns, "Formula")[0];
    var formulaLookup = {};
    if (formula) {
      var params = formula.getElementsByTagNameNS(ns, "Parameter");
      for (var i = 0; i < params.length; i++) {
        var p = params[i];
        var pType = gb(p, "ParameterType");
        var pId = gb(p, "ID");
        var valEl = p.getElementsByTagNameNS(ns, "Value")[0];
        var valStr = valEl ? gb(valEl, "ValueString") : "";
        var dataInterp = valEl ? gb(valEl, "DataInterpretation") : "";
        if (pType === "ProcessInput") {
          var matId = ge(p, "MaterialID");
          d.materials.push({
            formula_id: pId,
            material_id: matId,
            quantity: valStr,
            high_dev: ge(p, "HighDeviation"),
            low_dev: ge(p, "LowDeviation"),
            data_interp: dataInterp,
          });
          formulaLookup[pId] = {
            value: valStr,
            material_id: matId,
            type: "material",
          };
        } else if (pType === "ProcessParameter") {
          formulaLookup[pId] = {
            value: valStr,
            material_id: "",
            type: "process",
          };
        }
      }
    }
    var topREs = recipe.childNodes;
    for (var ti = 0; ti < topREs.length; ti++) {
      var tre = topREs[ti];
      if (
        !tre.localName ||
        tre.localName !== "RecipeElement" ||
        tre.namespaceURI !== ns
      )
        continue;
      if (gb(tre, "RecipeElementType") !== "UnitProcedure") continue;
      var upInfo = tre.getElementsByTagNameNS(
        ext,
        "UnitProcedureInformation",
      )[0];
      var upData = {
        name: upInfo ? ge(upInfo, "Name") : "",
        process: upInfo ? ge(upInfo, "ProcessInstance") : "",
        operations: [],
        _reId: gb(tre, "ID"),
        _operationTransitions: {},
      };
      var upl = tre.getElementsByTagNameNS(ns, "ProcedureLogic")[0],
        umap = {};
      if (upl) {
        var ust = upl.getElementsByTagNameNS(ns, "Step");
        for (var ui = 0; ui < ust.length; ui++)
          umap[gb(ust[ui], "ID")] = gb(ust[ui], "RecipeElementID");
        var ulk = upl.getElementsByTagNameNS(ns, "Link");
        for (var uj = 0; uj < ulk.length; uj++) {
          var q = ulk[uj],
            ff = q.getElementsByTagNameNS(ns, "FromID")[0],
            tt = q.getElementsByTagNameNS(ns, "ToID")[0];
          if (
            ff &&
            tt &&
            gb(ff, "FromType") === "Step" &&
            gb(tt, "ToType") === "Transition"
          ) {
            var tid = gb(tt, "ToIDValue"),
              trEls = upl.getElementsByTagNameNS(ns, "Transition"),
              condition = "";
            for (var ut = 0; ut < trEls.length; ut++)
              if (gb(trEls[ut], "ID") === tid) {
                condition = gb(trEls[ut], "Condition");
                break;
              }
            var loopTo = "";
            for (var ul = 0; ul < ulk.length; ul++) {
              var ol = ulk[ul],
                of = ol.getElementsByTagNameNS(ns, "FromID")[0],
                ot = ol.getElementsByTagNameNS(ns, "ToID")[0];
              if (
                of &&
                ot &&
                gb(ol, "LinkType") === "Other" &&
                gb(of, "FromType") === "Transition" &&
                gb(of, "FromIDValue") === tid &&
                gb(ot, "ToType") === "Step"
              )
                loopTo = umap[gb(ot, "ToIDValue")] || "";
            }
            upData._operationTransitions[umap[gb(ff, "FromIDValue")]] = {
              id: tid,
              condition: condition,
              loopTo: loopTo,
            };
          }
        }
      }
      /* Operation-scope graph projection: Transition -> divergent DUMMY lanes -> convergent successor. */
      upData._operationBranches = [];
      if (upl) {
        var us = {},
          ure = {};
        Array.prototype.forEach.call(
          upl.getElementsByTagNameNS(ns, "Step"),
          function (st) {
            us[gb(st, "ID")] = gb(st, "RecipeElementID");
          },
        );
        Array.prototype.forEach.call(
          upl.getElementsByTagNameNS(ns, "Link"),
          function (lk) {
            var f = lk.getElementsByTagNameNS(ns, "FromID"),
              t = lk.getElementsByTagNameNS(ns, "ToID"),
              typ = gb(lk, "LinkType");
            if (
              (typ === "ParallelDivergent" || typ === "SerialDivergent") &&
              f[0] &&
              gb(f[0], "FromType") === "Transition"
            ) {
              var lanes = [];
              for (var z = 0; z < t.length; z++)
                if (gb(t[z], "ToType") === "Step")
                  lanes.push(us[gb(t[z], "ToIDValue")]);
              ure[gb(f[0], "FromIDValue")] = {
                id: gb(f[0], "FromIDValue"),
                mode: typ === "ParallelDivergent" ? "All" : "Single",
                lanes: lanes,
              };
            }
          },
        );
        Object.keys(ure).forEach(function (k) {
          var b = ure[k],
            join = "",
            to = "";
          Array.prototype.forEach.call(
            upl.getElementsByTagNameNS(ns, "Link"),
            function (lk) {
              var fs = lk.getElementsByTagNameNS(ns, "FromID"),
                ts = lk.getElementsByTagNameNS(ns, "ToID"),
                typ = gb(lk, "LinkType");
              if (
                (typ === "ParallelConvergent" || typ === "SerialConvergent") &&
                fs.length === b.lanes.length
              ) {
                var match = 0;
                for (var q = 0; q < fs.length; q++)
                  if (b.lanes.indexOf(us[gb(fs[q], "FromIDValue")]) >= 0)
                    match++;
                if (match === b.lanes.length && ts[0]) {
                  join = typ;
                  to = us[gb(ts[0], "ToIDValue")] || "";
                }
              }
            },
          );
          b.join = join;
          b.successor = to;
          upData._operationBranches.push(b);
        });
      }
      var opEls = tre.childNodes;
      for (var oi = 0; oi < opEls.length; oi++) {
        var opEl = opEls[oi];
        if (
          !opEl.localName ||
          opEl.localName !== "RecipeElement" ||
          opEl.namespaceURI !== ns
        )
          continue;
        if (gb(opEl, "RecipeElementType") !== "Operation") continue;
        var opInfo = opEl.getElementsByTagNameNS(
          ext,
          "OperationInformation",
        )[0];
        var opData = {
          name: opInfo ? ge(opInfo, "Name") : "",
          phases: [],
          links: [],
          transitions: {},
          transition_meta: {},
          _reId: gb(opEl, "ID"),
        };
        var pl = opEl.getElementsByTagNameNS(ns, "ProcedureLogic")[0];
        var stepMap = {},
          phaseLabelMap = {};
        if (pl) {
          var steps = pl.getElementsByTagNameNS(ns, "Step");
          for (var si = 0; si < steps.length; si++)
            stepMap[gb(steps[si], "ID")] = gb(steps[si], "RecipeElementID");
          var trans = pl.getElementsByTagNameNS(ns, "Transition");
          for (var si2 = 0; si2 < trans.length; si2++) {
            var trId = gb(trans[si2], "ID"),
              trName = ge(trans[si2], "Name") || trId;
            opData.transitions[trId] = gb(trans[si2], "Condition");
            opData.transition_meta[trId] = {
              name: trName,
              description: gb(trans[si2], "Description") || "",
            };
          }
        }
        var phEls = opEl.childNodes;
        for (var pi2 = 0; pi2 < phEls.length; pi2++) {
          var phEl = phEls[pi2];
          if (
            !phEl.localName ||
            phEl.localName !== "RecipeElement" ||
            phEl.namespaceURI !== ns
          )
            continue;
          var phId = gb(phEl, "ID");
          var phTypeEl = phEl.getElementsByTagNameNS(
              ns,
              "RecipeElementType",
            )[0],
            phType = phTypeEl ? phTypeEl.textContent.trim() : "",
            isDummy =
              phType === "Other" &&
              phTypeEl.getAttribute("OtherValue") === "DUMMY";
          if (phType === "Begin" || phType === "End") {
            phaseLabelMap[phId] = phType;
            if (phType === "Begin") opData._beginReId = phId;
            else opData._endReId = phId;
            continue;
          }
          if (phType === "Phase") {
            var phInfo = phEl.getElementsByTagNameNS(
              ext,
              "PhaseInformation",
            )[0];
            phaseLabelMap[phId] = phInfo ? ge(phInfo, "Name") : phId;
          } else if (isDummy) phaseLabelMap[phId] = "Empty lane";
        }
        if (pl) {
          var lnks = pl.getElementsByTagNameNS(ns, "Link");
          for (var li = 0; li < lnks.length; li++) {
            var lk = lnks[li];
            var lType = gb(lk, "LinkType");
            var fromEls = lk.getElementsByTagNameNS(ns, "FromID");
            var toEls = lk.getElementsByTagNameNS(ns, "ToID");
            // Build source/dest arrays - ParallelDivergent has multiple ToID, Convergent multiple FromID
            var froms = [];
            for (var fi = 0; fi < fromEls.length; fi++) {
              froms.push({
                val: gb(fromEls[fi], "FromIDValue"),
                type: gb(fromEls[fi], "FromType"),
              });
            }
            var tos = [];
            for (var tii = 0; tii < toEls.length; tii++) {
              tos.push({
                val: gb(toEls[tii], "ToIDValue"),
                type: gb(toEls[tii], "ToType"),
              });
            }
            if (!froms.length) froms = [{ val: "", type: "" }];
            if (!tos.length) tos = [{ val: "", type: "" }];
            // Pair: divergent = one from, many to; convergent = many from, one to; else first/first
            var pairs = [];
            if (lType === "ParallelDivergent" || lType === "SerialDivergent") {
              for (var ti2 = 0; ti2 < tos.length; ti2++)
                pairs.push([froms[0], tos[ti2]]);
            } else if (
              lType === "ParallelConvergent" ||
              lType === "SerialConvergent"
            ) {
              for (var fi2 = 0; fi2 < froms.length; fi2++)
                pairs.push([froms[fi2], tos[0]]);
            } else {
              pairs.push([froms[0], tos[0]]);
            }
            for (var pi4 = 0; pi4 < pairs.length; pi4++) {
              var fv = pairs[pi4][0].val,
                ft = pairs[pi4][0].type,
                tv = pairs[pi4][1].val,
                tt = pairs[pi4][1].type;
              var fromLabel = "",
                toLabel = "",
                fromNode = "",
                toNode = "";
              if (ft === "Step") {
                var reId = stepMap[fv] || "";
                fromNode = reId;
                fromLabel = phaseLabelMap[reId] || "s" + fv;
              } else if (ft === "Transition") fromLabel = "TRANS:" + fv;
              if (tt === "Step") {
                var reId2 = stepMap[tv] || "";
                toNode = reId2;
                toLabel = phaseLabelMap[reId2] || "s" + tv;
              } else if (tt === "Transition") toLabel = "TRANS:" + tv;
              // Keep display labels for baseline/edit-mode behaviour, and retain the AVEVA
              // RecipeElement IDs for view-mode graph routing. Labels are not unique.
              opData.links.push({
                _linkId: gb(lk, "ID"),
                type: lType,
                from: fromLabel,
                from_id: fv,
                from_node: fromNode,
                from_re_id: ft === "Step" ? fromNode : "",
                from_type: ft,
                to: toLabel,
                to_id: tv,
                to_node: toNode,
                to_re_id: tt === "Step" ? toNode : "",
                to_type: tt,
              });
            }
          }
        }
        for (var pi3 = 0; pi3 < phEls.length; pi3++) {
          var phEl2 = phEls[pi3];
          if (
            !phEl2.localName ||
            phEl2.localName !== "RecipeElement" ||
            phEl2.namespaceURI !== ns
          )
            continue;
          var phTypeEl2 = phEl2.getElementsByTagNameNS(
              ns,
              "RecipeElementType",
            )[0],
            phType2 = phTypeEl2 ? phTypeEl2.textContent.trim() : "",
            isDummy2 =
              phType2 === "Other" &&
              phTypeEl2.getAttribute("OtherValue") === "DUMMY";
          if (phType2 !== "Phase" && !isDummy2) continue;
          if (isDummy2) {
            var dummyId = gb(phEl2, "ID");
            opData.phases.push({
              label: "",
              node_id: dummyId,
              _reId: dummyId,
              phase_type: "Dummy",
              parent_instance: "",
              description: "",
              _label: "",
              params: [],
              _dummy: true,
            });
            continue;
          }
          var phInfo2 = phEl2.getElementsByTagNameNS(
            ext,
            "PhaseInformation",
          )[0];
          if (!phInfo2) continue;
          var phData = {
            label: ge(phInfo2, "Name"),
            node_id: gb(phEl2, "ID"),
            _reId: gb(phEl2, "ID"),
            phase_type: ge(phInfo2, "PhaseType"),
            parent_instance: ge(phInfo2, "ParentInstance"),
            description: gb(phEl2, "Description"),
            _label: ge(phInfo2, "Label"),
            params: [],
          };
          var phParams = phEl2.getElementsByTagNameNS(ns, "Parameter");
          for (var ppi = 0; ppi < phParams.length; ppi++) {
            var pp = phParams[ppi];
            var ppId = gb(pp, "ID");
            var ppType = gb(pp, "ParameterType");
            var ppRef = ge(pp, "FormulaParameterID");
            var ppValEl = pp.getElementsByTagNameNS(ns, "Value")[0];
            var ppDirect = ppValEl ? gb(ppValEl, "ValueString") : "";
            var resolved = "",
              matId2 = "";
            if (ppType === "ProcessInput") {
              if (ppRef && formulaLookup[ppRef]) {
                matId2 = formulaLookup[ppRef].material_id || "";
                resolved = ppDirect && ppDirect.length < 20 ? ppDirect : "";
              } else if (ppDirect && ppDirect.length < 20) {
                resolved = ppDirect;
              }
            } else if (ppType === "ProcessParameter") {
              if (ppRef && formulaLookup[ppRef])
                resolved = formulaLookup[ppRef].value;
              else if (ppDirect && ppDirect.length < 20) resolved = ppDirect;
            }
            phData.params.push({
              name: ppId,
              value: resolved,
              param_type: ppType,
              material_id: matId2,
              _fid: ppRef || "",
            });
          }
          opData.phases.push(phData);
        }
        (opData.phases || []).forEach(function (phase) {
          if (!phase._dummy) return;
          var id = phase._reId,
            links = opData.links || [];
          var fork = links.some(function (l) {
              return (
                (l.type === "ParallelDivergent" ||
                  l.type === "SerialDivergent") &&
                l.from_type === "Step" &&
                l.from_re_id === id
              );
            }),
            entered = links.some(function (l) {
              return (
                l.type === "ControlLink" &&
                l.to_type === "Step" &&
                l.to_re_id === id
              );
            }),
            joined = links.some(function (l) {
              return (
                (l.type === "ParallelConvergent" ||
                  l.type === "SerialConvergent") &&
                l.to_type === "Step" &&
                l.to_re_id === id
              );
            }),
            continues = links.some(function (l) {
              return (
                l.type === "ControlLink" &&
                l.from_type === "Step" &&
                l.from_re_id === id
              );
            });
          if (fork && entered) phase._branchEntryConnector = true;
          if (joined && continues) phase._branchJoinConnector = true;
        });
        upData.operations.push(opData);
      }
      d.unit_procedures.push(upData);
    }
    var maxId = 0;
    var idEls = recipe.getElementsByTagNameNS(ns, "ID");
    for (var idi = 0; idi < idEls.length; idi++) {
      var idNum = parseInt((idEls[idi].textContent || "").trim(), 10);
      if (!isNaN(idNum) && idNum > maxId) maxId = idNum;
    }
    d._maxId = maxId;
    // Retain raw ParentInstance references not represented in the simplified editor
    // model. They are used only to prevent unsafe instance rename/deletion.
    d._raw_instance_references = [];
    var rawParentInstances = doc.getElementsByTagNameNS(ext, "ParentInstance");
    for (var rpi = 0; rpi < rawParentInstances.length; rpi++) {
      var rpiName = (rawParentInstances[rpi].textContent || "").trim();
      if (rpiName && d._raw_instance_references.indexOf(rpiName) < 0)
        d._raw_instance_references.push(rpiName);
    }
    return typeof xmlAuthorityAttach === "function"
      ? xmlAuthorityAttach(d, doc, xmlText)
      : ((d._rawXML = xmlText), d);
  } catch (e) {
    alert("Error parsing: " + e.message);
    return null;
  }
}

/* ==========================================================================
 * Former file: js/xml-authority.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// ============================================================================
// xml-authority.js — Version 10 XML-authoritative migration bridge
// ============================================================================
// The B2MML DOM is the persisted, authoritative recipe. The pre-existing UI
// model is now a disposable renderer projection: after a structural action we
// materialise the graph to the DOM and immediately reparse that DOM before the
// next render/action. No action may continue using the pre-commit projection.
//
// This bridge deliberately preserves the proven renderer while migration of
// individual edit primitives to direct DOM endpoint mutation proceeds.

function xmlAuthorityAttach(recipe, doc, sourceText) {
  if (!recipe || !doc) return recipe;
  recipe._xmlDoc = doc;
  recipe._xmlSource = sourceText || new XMLSerializer().serializeToString(doc);
  recipe._rawXML = recipe._xmlSource;
  recipe._xmlAuthoritative = true;
  return recipe;
}
function xmlAuthoritySource(recipe) {
  if (recipe && recipe._xmlDoc)
    return new XMLSerializer().serializeToString(recipe._xmlDoc);
  return (recipe && recipe._rawXML) || "";
}
function xmlAuthorityReindex(recipe) {
  // Reparse from the authoritative XML DOM. This deliberately destroys all
  // stale renderer arrays/branch caches, replacing them with a fresh view.
  var source = xmlAuthoritySource(recipe),
    fresh = parseB2MML(source);
  if (!fresh)
    throw new Error("The XML-authoritative graph could not be re-indexed.");
  return fresh;
}
function xmlAuthorityCommitStructural(recipe) {
  if (!recipe) throw new Error("No recipe graph is loaded.");
  // Existing structural exporter is used only as the controlled DOM
  // materialiser during V10. Its output immediately becomes the authoritative
  // DOM; subsequent render/action paths consume only the reparsed projection.
  var xml = saveFromRawXMLStructural(recipe),
    parser = new DOMParser(),
    doc = parser.parseFromString(xml.replace(/^\uFEFF/, ""), "text/xml");
  var err = doc.getElementsByTagName("parsererror")[0];
  if (err) throw new Error("The structural edit did not produce valid XML.");
  return xmlAuthorityReindex(xmlAuthorityAttach(recipe, doc, xml));
}
function xmlAuthorityReplaceCurrent(fresh) {
  currentRecipeData = fresh;
  // Keep current lane selection valid; no branch/display cache survives.
  if (typeof laneSelectedUP !== "undefined")
    laneSelectedUP = Math.max(
      0,
      Math.min(laneSelectedUP, (fresh.unit_procedures || []).length - 1),
    );
  var up = fresh.unit_procedures && fresh.unit_procedures[laneSelectedUP];
  if (typeof laneSelectedOp !== "undefined")
    laneSelectedOp = Math.max(
      0,
      Math.min(
        laneSelectedOp,
        up && up.operations ? up.operations.length - 1 : 0,
      ),
    );
  return fresh;
}

/* ==========================================================================
 * Former file: js/graph-scope.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

/* graph-scope.js — shared XML graph-scope foundation.
 *
 * This module is deliberately behaviour-neutral in Step 1. It centralises the
 * XML transaction and endpoint primitives used by graph actions, and registers
 * the three hierarchy scopes. Existing Phase and Operation services remain on
 * their proven entry points until their actions are migrated one by one.
 */
(function (window) {
  "use strict";
  var scopes = {};
  function localName(node) {
    return (node && (node.localName || node.nodeName)) || "";
  }
  function children(node, name) {
    return Array.prototype.filter.call(
      (node && node.children) || [],
      function (n) {
        return localName(n) === name;
      },
    );
  }
  function child(node, name) {
    return children(node, name)[0] || null;
  }
  function text(node, name) {
    var item = child(node, name);
    return item ? (item.textContent || "").trim() : "";
  }
  function endpoints(link, side) {
    var tag = side === "from" ? "FromID" : "ToID",
      value = side === "from" ? "FromIDValue" : "ToIDValue",
      type = side === "from" ? "FromType" : "ToType";
    return children(link, tag).map(function (node) {
      return { id: text(node, value), type: text(node, type) };
    });
  }
  function cloneAuthoritative(recipe) {
    var xml = new XMLSerializer().serializeToString(recipe._xmlDoc),
      doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror")[0])
      throw new Error("The authoritative XML cannot be cloned.");
    return doc;
  }
  function allSteps(owner) {
    return children(owner, "Step");
  }
  function validateStepEndpoints(owner) {
    var known = {};
    allSteps(owner).forEach(function (step) {
      known[text(step, "ID")] = true;
    });
    var errors = [];
    children(owner, "Link").forEach(function (link) {
      ["from", "to"].forEach(function (side) {
        endpoints(link, side).forEach(function (endpoint) {
          if (endpoint.type === "Step" && !known[endpoint.id])
            errors.push(
              "Link #" +
                text(link, "ID") +
                " references missing Step #" +
                endpoint.id,
            );
        });
      });
    });
    return errors;
  }
  function commit(recipe, document) {
    var xml = new XMLSerializer().serializeToString(document),
      fresh = parseB2MML(xml);
    if (!fresh)
      throw new Error("The proposed XML change could not be reparsed.");
    xmlAuthorityAttach(fresh, document, xml);
    xmlAuthorityReplaceCurrent(fresh);
    return fresh;
  }
  /* The common transaction runner is scope-neutral: callers locate their own owner,
     mutate the cloned DOM, perform scope-specific validation, then commit once. */
  function transact(recipe, mutate) {
    var document = cloneAuthoritative(recipe);
    var outcome = mutate(document);
    if (outcome && outcome.ok === false) return outcome;
    commit(recipe, document);
    return outcome || { ok: true };
  }
  function register(name, definition) {
    scopes[name] = Object.freeze(definition);
  }
  register("phase", {
    nodeType: "Phase",
    ownerType: "Operation",
    parentScope: "operation",
  });
  register("operation", {
    nodeType: "Operation",
    ownerType: "UnitProcedure",
    parentScope: "unit-procedure",
  });
  register("unit-procedure", {
    nodeType: "UnitProcedure",
    ownerType: "MasterRecipe",
    parentScope: "recipe",
  });
  window.RecipeGraphScope = Object.freeze({
    get: function (name) {
      return scopes[name] || null;
    },
    names: function () {
      return Object.keys(scopes);
    },
    xml: Object.freeze({
      localName: localName,
      children: children,
      child: child,
      text: text,
      endpoints: endpoints,
      cloneAuthoritative: cloneAuthoritative,
      validateStepEndpoints: validateStepEndpoints,
      commit: commit,
      transact: transact,
    }),
  });
})(window);
