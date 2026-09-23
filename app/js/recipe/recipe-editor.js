/**
 * Consolidated runtime module: recipe / recipe-editor.js
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
 * Former file: js/equipment-instances.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// equipment-instances.js - Recipe process class and process instance helpers
// A requirement is {id: processClass, instances: [{name, unit, mode}]}.
// Unit Procedures and process phases store an instance name, never a class ID.

function equipmentRequirements() {
  return currentRecipeData && currentRecipeData.equipment_requirements
    ? currentRecipeData.equipment_requirements
    : [];
}

function requirementInstances(req) {
  if (!req) return [];
  if (Array.isArray(req.instances)) return req.instances;
  // Compatibility for in-memory data created by pre-Stage-5 builds.
  if (req.process || req.id)
    return [
      {
        name: req.process || req.id,
        unit: req.unit || "",
        mode: req.mode || "Auto",
      },
    ];
  return [];
}

function recipeProcessClasses() {
  return equipmentRequirements()
    .map(function (req) {
      return req.id || req.process || "";
    })
    .filter(function (value, index, values) {
      return value && values.indexOf(value) === index;
    });
}

function recipeProcessInstances() {
  var out = [];
  equipmentRequirements().forEach(function (req) {
    requirementInstances(req).forEach(function (instance) {
      if (instance && instance.name)
        out.push({
          name: instance.name,
          processClass: req.id || req.process || "",
          unit: instance.unit || "",
          mode: instance.mode || "Auto",
        });
    });
  });
  return out;
}

function processClassForInstance(instanceName) {
  var found = recipeProcessInstances().filter(function (instance) {
    return instance.name === instanceName;
  })[0];
  return found ? found.processClass : "";
}

function processInstanceByName(instanceName) {
  var found = recipeProcessInstances().filter(function (instance) {
    return instance.name === instanceName;
  })[0];
  return found || null;
}

function validUnitsForProcessClass(processClass) {
  var processModel =
    typeof MODEL !== "undefined" && MODEL.processes
      ? MODEL.processes[processClass]
      : null;
  return processModel && Array.isArray(processModel.units)
    ? processModel.units.slice()
    : [];
}

function isValidUnitForProcessClass(processClass, unit) {
  return !unit || validUnitsForProcessClass(processClass).indexOf(unit) >= 0;
}

function nextProcessInstanceName(processClass) {
  var used = recipeProcessInstances().map(function (instance) {
    return instance.name;
  });
  if (used.indexOf(processClass) < 0) return processClass;
  var suffix = 2;
  while (used.indexOf(processClass + suffix) >= 0) suffix++;
  return processClass + suffix;
}

function defaultUPProcess() {
  var instances = recipeProcessInstances();
  return instances.length ? instances[0].name : "";
}

function currentInstanceReferenceNames() {
  var refs = [];
  if (!currentRecipeData) return refs;
  (currentRecipeData.unit_procedures || []).forEach(function (up) {
    if (up.process) refs.push(up.process);
    (up.operations || []).forEach(function (op) {
      (op.phases || []).forEach(function (phase) {
        if (phase.parent_instance) refs.push(phase.parent_instance);
      });
    });
  });
  (currentRecipeData.equipment_transfers || []).forEach(function (transfer) {
    (transfer.instances || []).forEach(function (instance) {
      if (instance.source) refs.push(instance.source);
      if (instance.dest) refs.push(instance.dest);
    });
  });
  return refs;
}

function processInstanceIsReferenced(instanceName) {
  if (currentInstanceReferenceNames().indexOf(instanceName) >= 0) return true;
  // The parser retains raw formula ParentInstance references so an unmodelled
  // reference cannot be orphaned by deletion or rename.
  return !!(
    currentRecipeData &&
    currentRecipeData._raw_instance_references &&
    currentRecipeData._raw_instance_references.indexOf(instanceName) >= 0
  );
}

function processClassIsReferenced(processClass) {
  var instances = recipeProcessInstances().filter(function (instance) {
    return instance.processClass === processClass;
  });
  if (
    instances.some(function (instance) {
      return processInstanceIsReferenced(instance.name);
    })
  )
    return true;
  return (
    (currentRecipeData && currentRecipeData.equipment_transfers) ||
    []
  ).some(function (transfer) {
    return transfer.source === processClass || transfer.dest === processClass;
  });
}

// Seed global transfer classes from MODEL when process classes are added.
// A transfer instance is seeded only when both endpoint classes have a valid
// recipe instance. Existing transfers/instances are never removed or changed.
function seedInheritedTransfersForProcessClasses() {
  if (
    !currentRecipeData ||
    typeof MODEL === "undefined" ||
    !Array.isArray(MODEL.transfers)
  )
    return false;
  var changed = false;
  if (!Array.isArray(currentRecipeData.equipment_transfers))
    currentRecipeData.equipment_transfers = [];
  var classes = recipeProcessClasses();
  MODEL.transfers.forEach(function (modelTransfer) {
    if (
      !modelTransfer ||
      !modelTransfer.name ||
      !modelTransfer.source ||
      !modelTransfer.dest
    )
      return;
    // Transfer inheritance is class-based. Selecting either endpoint class
    // immediately creates the configured global transfer and its fixed route.
    if (
      classes.indexOf(modelTransfer.source) < 0 &&
      classes.indexOf(modelTransfer.dest) < 0
    )
      return;
    var transfer = currentRecipeData.equipment_transfers.filter(
      function (item) {
        return (
          item.name === modelTransfer.name &&
          item.source === modelTransfer.source &&
          item.dest === modelTransfer.dest
        );
      },
    )[0];
    if (!transfer) {
      transfer = {
        name: modelTransfer.name,
        source: modelTransfer.source,
        dest: modelTransfer.dest,
        instances: [],
      };
      currentRecipeData.equipment_transfers.push(transfer);
      changed = true;
    }
    if (!Array.isArray(transfer.instances)) transfer.instances = [];
    // The configured process-class route is the TransferInstance route; it is
    // intentionally seeded even if the counterpart class is not yet present.
    var exists = transfer.instances.some(function (instance) {
      return (
        instance.source === modelTransfer.source &&
        instance.dest === modelTransfer.dest
      );
    });
    if (!exists) {
      transfer.instances.push({
        name: modelTransfer.name,
        source: modelTransfer.source,
        dest: modelTransfer.dest,
      });
      changed = true;
    }
  });
  return changed;
}

/* ==========================================================================
 * Former file: js/materials.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// materials.js - Bill of Materials rendering, usage tracking, autocomplete

// ===== MATERIAL HELPERS =====
function matName(id) {
  return MATS_DB[id] ? MATS_DB[id].name : "";
}
function matCode(id) {
  return MATS_DB[id] ? MATS_DB[id].code : "";
}

// ===== BOM RENDERING =====
function renderMaterials() {
  var d = currentRecipeData;
  var matUsage = buildMaterialUsage(d);
  var card = document.getElementById("cardMat");
  if (editMode) card.classList.remove("collapsed");

  var h = "";
  if (editMode) {
    h +=
      '<table class="dt"><thead><tr><th>#</th><th>Material (type ID, name or code)</th><th>ID</th><th>Code</th><th>Qty/%</th><th>+/-</th><th>Type</th><th></th></tr></thead><tbody>';
    for (var i = 0; i < d.materials.length; i++) {
      var m = d.materials[i];
      var nm = matName(m.material_id);
      var cd = matCode(m.material_id);
      h += "<tr>";
      h += "<td>" + (i + 1) + "</td>";
      h +=
        '<td><div class="mat-ac"><input id="matAc' +
        i +
        '" value="' +
        esc(nm || m.material_id) +
        '" onfocus="openMatAc(' +
        i +
        ')" oninput="filterMatAc(' +
        i +
        ',this.value)" onblur="setTimeout(function(){closeMatAc(' +
        i +
        ')},200)" autocomplete="off" placeholder="Search..."></div></td>';
      h +=
        '<td style="font-size:0.8em;color:#666">' +
        esc(m.material_id) +
        "</td>";
      h += '<td style="font-size:0.8em;color:#36398E">' + esc(cd) + "</td>";
      h +=
        '<td><input class="inline-edit" value="' +
        (m.quantity || "") +
        '" onchange="updMatQty(' +
        i +
        ',this.value)" style="width:65px"></td>';
      h +=
        '<td><input class="inline-edit" value="' +
        (m.high_dev || "1") +
        '" onchange="updMatDev(' +
        i +
        ',this.value)" style="width:40px"></td>';
      h +=
        '<td><select onchange="updMatInterp(' +
        i +
        ',this.value)" style="font-size:0.8em"><option value="Equation"' +
        (m.data_interp !== "Constant" ? " selected" : "") +
        '>%</option><option value="Constant"' +
        (m.data_interp === "Constant" ? " selected" : "") +
        ">kg</option></select></td>";
      h +=
        '<td><button class="act-btn danger" onclick="removeMaterial(' +
        i +
        ')">\u2716</button></td></tr>';
    }
    h += "</tbody></table>";
    h +=
      '<button class="act-btn" onclick="addMaterial()" style="margin-top:6px">+ Add Material</button>';
  } else {
    h +=
      '<table class="dt"><thead><tr><th>#</th><th>Material</th><th>Code</th><th>%/batch</th><th>kg (BOM)</th><th>kg (Used)</th><th>Status</th></tr></thead><tbody>';
    var bomTotalPct = 0,
      bomTotalKg = 0,
      usedTotalKg = 0,
      errorCount = 0;
    for (var i = 0; i < d.materials.length; i++) {
      var m = d.materials[i];
      var nm = matName(m.material_id);
      var cd = matCode(m.material_id);
      var bomVal = m.quantity ? parseFloat(m.quantity) : 0;
      var isActual = m.data_interp === "Constant";
      var pct = isActual ? "(actual)" : bomVal.toFixed(4) + "%";
      var bomKg = isActual
        ? bomVal
        : (bomVal / 100) * parseFloat(d.batch_size_nominal || 1);
      var allocs = matUsage[m.material_id] || [];
      var allocTotal = 0;
      for (var ai = 0; ai < allocs.length; ai++) allocTotal += allocs[ai].value;
      var allocKg = isActual
        ? allocTotal
        : (allocTotal / 100) * parseFloat(d.batch_size_nominal || 1);
      var isOver = allocTotal > bomVal * 1.001;
      var isUnder = allocTotal < bomVal * 0.999 && allocs.length > 0;
      var hasError = isOver || isUnder;
      if (hasError) errorCount++;
      var stCls = hasError ? "mat-over" : "mat-total";
      var stTxt = isOver ? "\u26A0 Over" : isUnder ? "\u26A0 Under" : "OK";
      if (!isActual) {
        bomTotalPct += bomVal;
        bomTotalKg += bomKg;
      } else {
        bomTotalKg += bomKg;
      }
      usedTotalKg += allocKg;
      h +=
        '<tr class="' +
        (hasError ? "expandable over-allocated" : "expandable") +
        '" onclick="toggleMatDetail(\'md' +
        i +
        "')\">";
      h +=
        "<td>" +
        m.formula_id +
        '</td><td><span class="expand-icon">\u25B6</span><strong>' +
        (nm || m.material_id) +
        '</strong></td><td class="c-grey">' +
        cd +
        "</td>";
      h +=
        "<td>" +
        pct +
        "</td><td>" +
        bomKg.toFixed(2) +
        '</td><td class="' +
        stCls +
        '">' +
        allocKg.toFixed(2) +
        '</td><td class="' +
        stCls +
        '">' +
        stTxt +
        " (" +
        allocs.length +
        ")</td></tr>";
      h += '<tr class="mat-detail hidden" id="md' + i + '"><td colspan="7">';
      if (allocs.length) {
        h +=
          '<table style="width:100%;font-size:0.85em"><tr style="background:#f0f7f2"><th>UP</th><th>Op</th><th>Phase</th><th>Param</th><th>Value</th><th>kg</th></tr>';
        for (var ai = 0; ai < allocs.length; ai++) {
          var a = allocs[ai];
          var akg = isActual
            ? a.value.toFixed(2)
            : ((a.value / 100) * parseFloat(d.batch_size_nominal || 1)).toFixed(
                2,
              );
          h +=
            "<tr><td>" +
            a.up +
            "</td><td>" +
            a.op +
            "</td><td>" +
            a.phase +
            "</td><td>" +
            a.param +
            "</td><td>" +
            a.value +
            "</td><td>" +
            akg +
            "</td></tr>";
        }
        h +=
          '<tr style="font-weight:600;background:#e8f5e9"><td colspan="4">TOTAL</td><td>' +
          allocTotal.toFixed(4) +
          "</td><td>" +
          allocKg.toFixed(2) +
          "</td></tr></table>";
      } else h += '<em class="c-grey">No allocations</em>';
      h += "</td></tr>";
    }
    // Totals row
    h +=
      '<tr style="font-weight:700;background:#e8f5e9;border-top:2px solid #009F3C"><td colspan="3">TOTAL (' +
      d.materials.length +
      " materials)</td><td>" +
      bomTotalPct.toFixed(4) +
      "%</td><td>" +
      bomTotalKg.toFixed(2) +
      "</td><td" +
      (errorCount > 0 ? ' class="mat-over"' : ' class="mat-total"') +
      ">" +
      usedTotalKg.toFixed(2) +
      "</td><td" +
      (errorCount > 0 ? ' class="mat-over"' : ' class="mat-total"') +
      ">" +
      (errorCount > 0
        ? "\u26A0 " + errorCount + " error(s)"
        : "\u2714 All OK") +
      "</td></tr>";
    h += "</tbody></table>";
  }
  document.getElementById("matBody").innerHTML = h;
}

function toggleMatDetail(id) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle("hidden");
}
function buildMaterialUsage(d) {
  var usage = {};
  for (var u = 0; u < d.unit_procedures.length; u++) {
    var up = d.unit_procedures[u];
    for (var o = 0; o < up.operations.length; o++) {
      var op = up.operations[o];
      for (var p = 0; p < op.phases.length; p++) {
        var ph = op.phases[p];
        if (!ph.params) continue;
        for (var pi = 0; pi < ph.params.length; pi++) {
          var pm = ph.params[pi];
          if (pm.material_id) {
            if (!usage[pm.material_id]) usage[pm.material_id] = [];
            usage[pm.material_id].push({
              up: up.name,
              op: op.name,
              phase: ph.label,
              parent: ph.parent_instance,
              param: pm.name,
              value: parseFloat(pm.value) || 0,
            });
          }
        }
      }
    }
  }
  return usage;
}

// ===== RENDER RECIPE (List View) =====
// ===== DROPDOWN MENUS =====
var activeDropdown = null;
document.addEventListener("click", function (e) {
  if (!e.target.closest(".act-more")) {
    closeDropdowns();
  }
});

// ===== MATERIAL EDIT FUNCTIONS =====
// === Material edit functions ===
function addMaterial() {
  currentRecipeData.materials.push({
    formula_id: String(currentRecipeData.materials.length + 1),
    material_id: "",
    quantity: "",
    high_dev: "1",
    low_dev: "1",
    data_interp: "Equation",
  });
  renderAll();
}
function removeMaterial(i) {
  currentRecipeData.materials.splice(i, 1);
  renderAll();
}
function updMatId(i, v) {
  currentRecipeData.materials[i].material_id = v;
}
function updMatQty(i, v) {
  currentRecipeData.materials[i].quantity = v;
}
function updMatDev(i, v) {
  currentRecipeData.materials[i].high_dev = v;
  currentRecipeData.materials[i].low_dev = v;
}
function updMatInterp(i, v) {
  currentRecipeData.materials[i].data_interp = v;
}
// === Material Autocomplete ===
var matAcListEl = null;
var matAcIdx = -1; // which material row is active

function openMatAc(idx) {
  matAcIdx = idx;
  var inp = document.getElementById("matAc" + idx);
  filterMatAc(idx, inp.value);
}

function closeMatAc(idx) {
  if (matAcListEl) {
    matAcListEl.remove();
    matAcListEl = null;
  }
  matAcIdx = -1;
}

function filterMatAc(idx, query) {
  // Remove existing list
  if (matAcListEl) {
    matAcListEl.remove();
    matAcListEl = null;
  }

  var q = query.toLowerCase().trim();
  var results = [];

  if (q.length === 0) {
    // Show all (limited to 50)
    results = MAT_LIST.slice(0, 50);
  } else {
    // Filter across id, name, code
    for (var i = 0; i < MAT_LIST.length; i++) {
      var m = MAT_LIST[i];
      var idMatch = m.id.toLowerCase().indexOf(q) >= 0;
      var nameMatch = m.name.toLowerCase().indexOf(q) >= 0;
      var codeMatch = m.code.toLowerCase().indexOf(q) >= 0;
      if (idMatch || nameMatch || codeMatch) {
        results.push({
          id: m.id,
          name: m.name,
          code: m.code,
          matchField: idMatch ? "id" : nameMatch ? "name" : "code",
        });
        if (results.length >= 30) break;
      }
    }
  }

  // Create dropdown
  var list = document.createElement("div");
  list.className = "mat-ac-list show";

  // Header
  list.innerHTML =
    '<div class="mat-ac-hdr"><span>ID</span><span>Name</span><span>Code</span></div>';

  if (results.length === 0) {
    list.innerHTML += '<div class="mat-ac-empty">No matches</div>';
  } else {
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var idStr = highlightMatch(r.id, q);
      var nameStr = highlightMatch(r.name, q);
      var codeStr = highlightMatch(r.code, q);
      list.innerHTML +=
        '<div class="mat-ac-item" onmousedown="pickMat(' +
        idx +
        ",'" +
        esc(r.id) +
        '\')"><span class="ac-id">' +
        idStr +
        '</span><span class="ac-name">' +
        nameStr +
        '</span><span class="ac-code">' +
        codeStr +
        "</span></div>";
    }
  }

  // Position relative to input
  var inp = document.getElementById("matAc" + idx);
  var rect = inp.getBoundingClientRect();
  list.style.top = rect.bottom + 2 + "px";
  list.style.left = rect.left + "px";
  list.style.minWidth = Math.max(350, rect.width) + "px";

  document.body.appendChild(list);
  matAcListEl = list;
}

function highlightMatch(text, query) {
  if (!query || !text) return esc(text || "");
  var lower = text.toLowerCase();
  var idx = lower.indexOf(query);
  if (idx < 0) return esc(text);
  return (
    esc(text.substring(0, idx)) +
    '<span class="ac-match">' +
    esc(text.substring(idx, idx + query.length)) +
    "</span>" +
    esc(text.substring(idx + query.length))
  );
}

function pickMat(idx, matId) {
  currentRecipeData.materials[idx].material_id = matId;
  closeMatAc(idx);
  renderMaterials(); // re-render to show updated ID/code columns
} // exporter.js - XML Save

// Inline editing

/* ==========================================================================
 * Former file: js/exporter.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

var _pendingModLog = null;

function saveXML() {
  if (!currentRecipeData) {
    alert("No recipe loaded");
    return;
  }
  showSaveDialog();
}

function showSaveDialog() {
  var d = currentRecipeData;
  var logs = d.modification_logs || [];
  document.getElementById("sv_version").textContent = "V" + (logs.length + 1);
  document.getElementById("sv_author").value =
    localStorage.getItem("recipe_author") || "";
  document.getElementById("sv_comment").value = "";
  document.getElementById("sv_error").style.display = "none";
  var histEl = document.getElementById("sv_last");
  if (logs.length) {
    var last = logs[logs.length - 1];
    histEl.textContent =
      "Last: V" +
      logs.length +
      " \u2013 " +
      last.author +
      " (" +
      last.date.split("T")[0] +
      "): " +
      (last.description || "(no comment)");
    histEl.style.display = "block";
  } else {
    histEl.style.display = "none";
  }
  var noticeEl = document.getElementById("sv_structural_notice");
  if (noticeEl) {
    noticeEl.style.display = d._structuralEdit && d._rawXML ? "block" : "none";
    if (d._structuralEdit && d._rawXML)
      noticeEl.textContent =
        "\u26a0 Structural changes detected. Existing IDs preserved; new items get next available IDs.";
  }
  document.getElementById("svOverlay").style.display = "block";
  document.getElementById("svDialog").style.display = "block";
  setTimeout(function () {
    document.getElementById("sv_author").select();
  }, 100);
}

function cancelSaveDialog() {
  document.getElementById("svOverlay").style.display = "none";
  document.getElementById("svDialog").style.display = "none";
}

function confirmSaveXML() {
  var author = document.getElementById("sv_author").value.trim();
  var comment = document.getElementById("sv_comment").value.trim();
  var errEl = document.getElementById("sv_error");
  if (!author) {
    errEl.textContent = "Author name is required.";
    errEl.style.display = "block";
    document.getElementById("sv_author").focus();
    return;
  }
  if (!comment) {
    errEl.textContent = "A comment is required before saving.";
    errEl.style.display = "block";
    document.getElementById("sv_comment").focus();
    return;
  }
  localStorage.setItem("recipe_author", author);
  cancelSaveDialog();

  var d = currentRecipeData;
  if (!d.modification_logs) d.modification_logs = [];
  var now = new Date();
  var iso =
    now.getFullYear() +
    "-" +
    pad2(now.getMonth() + 1) +
    "-" +
    pad2(now.getDate()) +
    "T" +
    pad2(now.getHours()) +
    ":" +
    pad2(now.getMinutes()) +
    ":" +
    pad2(now.getSeconds());
  d.modification_logs.push({ date: iso, description: comment, author: author });

  var x;
  try {
    if (d._rawXML && (d._structuralEdit || d._recipeCollectionEdit))
      x = saveFromRawXMLStructural(d);
    else if (d._rawXML) x = saveFromRawXML(d);
    else x = buildNewXML(d);
  } catch (e) {
    alert("Save error: " + e.message + "\n\nCheck browser console.");
    console.error("Save error:", e);
    return;
  }
  if (!x) {
    alert("Save produced no output.");
    return;
  }
  var blob = new Blob([x], { type: "text/xml" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (d.id || "recipe") + ".xml";
  a.click();
  updateVersionBadge();
}

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

// ============================================================
// VALUE-ONLY SAVE
// Finds each phase RecipeElement by _reId and patches ValueStrings.
// Touches nothing else - no Formula, no IDs, no structure.
// ============================================================
function saveFromRawXML(d) {
  var xp = new DOMParser();
  var doc = xp.parseFromString(d._rawXML, "text/xml");
  var ns = "http://www.wbf.org/xml/B2MML-V0401";
  var ext = "http://www.wbf.org/xml/B2MML-V0401-AllExtensions";
  var recipe = doc.getElementsByTagNameNS(ns, "MasterRecipe")[0];

  patchHeader(recipe, d, ns, ext);

  // Build map: RecipeElement ID -> DOM element
  var reMap = buildREMap(recipe, ns);

  // Patch each phase param ValueString using _reId to locate the node
  d.unit_procedures.forEach(function (up) {
    up.operations.forEach(function (op) {
      op.phases.forEach(function (ph) {
        if (!ph._reId || !ph.params) return;
        var reEl = reMap[ph._reId];
        if (!reEl) return;
        var phParams = reEl.getElementsByTagNameNS(ns, "Parameter");
        ph.params.forEach(function (p) {
          if (p._isSentinel) return; // runtime placeholder - leave as-is
          for (var i = 0; i < phParams.length; i++) {
            var pid = phParams[i].getElementsByTagNameNS(ns, "ID")[0];
            if (pid && pid.textContent === p.name) {
              var vs = phParams[i].getElementsByTagNameNS(ns, "ValueString")[0];
              if (vs) vs.textContent = p.value || "";
              break;
            }
          }
        });
      });
    });
  });

  prepareModLog(d, ext);
  // Final structural safety net: confirmed reassignment must leave no stale
  // instance binding in any retained AVEVA extension record.
  var allReassignments = d._instance_reassignments || {};
  ["ParentInstance", "ProcessInstance", "Source", "Destination"].forEach(
    function (tag) {
      var elements = doc.getElementsByTagNameNS(ext, tag);
      for (var ri = 0; ri < elements.length; ri++) {
        var oldValue = (elements[ri].textContent || "").trim();
        if (allReassignments[oldValue])
          elements[ri].textContent = allReassignments[oldValue];
      }
    },
  );
  var output = serializeAndFix(doc, d._rawXML);
  return injectPendingModLog(output);
}

// ============================================================
// STRUCTURAL SAVE
// Preserves all existing IDs. New IDs start at d._maxId+1.
// Rebuilds UP-level and top-level ProcedureLogic using existing
// Step and Link IDs where the connection is unchanged.
// ============================================================
function saveFromRawXMLStructural(d) {
  var xp = new DOMParser();
  var doc = xp.parseFromString(d._rawXML, "text/xml");
  var ns = "http://www.wbf.org/xml/B2MML-V0401";
  var ext = "http://www.wbf.org/xml/B2MML-V0401-AllExtensions";
  var recipe = doc.getElementsByTagNameNS(ns, "MasterRecipe")[0];

  // ID allocator - starts above all existing IDs
  var nextId = (d._maxId || 576) + 1;
  function nid() {
    return String(nextId++);
  }

  patchHeader(recipe, d, ns, ext);
  syncRecipeCollections(recipe, d, ns, ext);

  // Build RE map from original DOM
  var reMap = buildREMap(recipe, ns);

  // Patch Formula: add entries for new phase params without _fid
  var formula = recipe.getElementsByTagNameNS(ns, "Formula")[0];
  var usedFids = {};
  if (formula) {
    var fps = formula.getElementsByTagNameNS(ns, "Parameter");
    for (var i = 0; i < fps.length; i++) {
      var fpIdEl = fps[i].getElementsByTagNameNS(ns, "ID")[0];
      if (fpIdEl) {
        var n = parseInt(fpIdEl.textContent, 10);
        if (!isNaN(n)) usedFids[n] = true;
      }
    }
  }
  function nextFid() {
    var k = 1;
    while (usedFids[k]) k++;
    usedFids[k] = true;
    return String(k);
  }
  // Existing formula parameter records retain their own ParentInstance. Keep them
  // aligned with the phase binding whenever a used process instance is reassigned.
  if (formula) {
    var reassignments = d._instance_reassignments || {};
    var allFormulaParents = formula.getElementsByTagNameNS(
      ext,
      "ParentInstance",
    );
    for (var api = 0; api < allFormulaParents.length; api++) {
      var oldFormulaParent = (allFormulaParents[api].textContent || "").trim();
      if (reassignments[oldFormulaParent])
        allFormulaParents[api].textContent = reassignments[oldFormulaParent];
    }
    var formulaById = {};
    for (var fpi = 0; fpi < fps.length; fpi++) {
      var formulaIdEl = fps[fpi].getElementsByTagNameNS(ns, "ID")[0];
      if (formulaIdEl) formulaById[formulaIdEl.textContent] = fps[fpi];
    }
    d.unit_procedures.forEach(function (up) {
      up.operations.forEach(function (op) {
        op.phases.forEach(function (ph) {
          (ph.params || []).forEach(function (param) {
            if (!param._fid || !formulaById[param._fid]) return;
            var parentEls = formulaById[param._fid].getElementsByTagNameNS(
              ext,
              "ParentInstance",
            );
            for (var pei = 0; pei < parentEls.length; pei++)
              parentEls[pei].textContent = ph.parent_instance || "";
          });
        });
      });
    });
  }
  d.unit_procedures.forEach(function (up) {
    up.operations.forEach(function (op) {
      op.phases.forEach(function (ph) {
        if (!ph.params) return;
        ph.params.forEach(function (p) {
          if (!p._fid && formula) {
            p._fid = nextFid();
            formula.appendChild(buildFormulaParam(doc, ns, ext, p._fid, p, ph));
          }
        });
      });
    });
  });

  // Patch values in existing phase RecipeElements
  d.unit_procedures.forEach(function (up) {
    up.operations.forEach(function (op) {
      op.phases.forEach(function (ph) {
        if (!ph._reId || !ph.params) return;
        var reEl = reMap[ph._reId];
        if (!reEl) return;
        var phParams = reEl.getElementsByTagNameNS(ns, "Parameter");
        ph.params.forEach(function (p) {
          if (p._isSentinel) return;
          for (var i = 0; i < phParams.length; i++) {
            var pid = phParams[i].getElementsByTagNameNS(ns, "ID")[0];
            if (pid && pid.textContent === p.name) {
              var vs = phParams[i].getElementsByTagNameNS(ns, "ValueString")[0];
              if (vs) vs.textContent = p.value || "";
              break;
            }
          }
        });
      });
    });
  });

  // Ensure new UPs/Ops/Phases have _reId assigned
  d.unit_procedures.forEach(function (up) {
    if (!up._reId) up._reId = nid();
    if (!up._stepId) up._stepId = nid();
    if (!up._beginReId) up._beginReId = nid();
    if (!up._beginStepId) up._beginStepId = nid();
    if (!up._endReId) up._endReId = nid();
    if (!up._endStepId) up._endStepId = nid();
    up.operations.forEach(function (op) {
      if (!op._reId) op._reId = nid();
      if (!op._stepId) op._stepId = nid();
      op.phases.forEach(function (ph) {
        if (!ph._reId) ph._reId = nid();
      });
    });
  });

  // ---- Remove existing top-level RecipeElements and ProcedureLogic ----
  var toRemove = [];
  for (var ci = 0; ci < recipe.childNodes.length; ci++) {
    var ch = recipe.childNodes[ci];
    if (ch.nodeType !== 1) continue;
    if (
      (ch.localName === "RecipeElement" || ch.localName === "ProcedureLogic") &&
      ch.namespaceURI === ns
    )
      toRemove.push(ch);
  }
  toRemove.forEach(function (el) {
    recipe.removeChild(el);
  });

  // Find insertion point: before EquipmentTransfer/RecipeState/RecipeType/ext:Name
  var insertBefore = null;
  for (var ci = 0; ci < recipe.childNodes.length; ci++) {
    var ch = recipe.childNodes[ci];
    if (ch.nodeType !== 1) continue;
    var ln = ch.localName;
    if (
      ln === "EquipmentTransfer" ||
      ln === "RecipeState" ||
      ln === "RecipeType" ||
      (ln === "Name" && ch.namespaceURI === ext)
    ) {
      insertBefore = ch;
      break;
    }
  }
  function ins(node) {
    if (insertBefore) recipe.insertBefore(node, insertBefore);
    else recipe.appendChild(node);
  }

  // ---- Build top-level ProcedureLogic ----
  // Items: [procBegin, up0, up1, ..., procEnd]
  var procBeginReId = d._procBeginReId || nid();
  var procEndReId = d._procEndReId || nid();
  var procBeginStepId = d._procBeginStepId || nid();
  var procEndStepId = d._procEndStepId || nid();

  var topStepIds = [procBeginStepId];
  var topReIds = [procBeginReId];
  d.unit_procedures.forEach(function (up) {
    topStepIds.push(up._stepId);
    topReIds.push(up._reId);
  });
  topStepIds.push(procEndStepId);
  topReIds.push(procEndReId);

  // Build PL preserving existing link IDs where connection is unchanged
  ins(
    buildPLWithIds(
      doc,
      ns,
      topStepIds,
      topReIds,
      d._topPLStepToLinkId || {},
      nid,
    ),
  );

  // ---- Insert procedure-level RecipeElements ----
  ins(mkRE(doc, ns, procBeginReId, "Begin"));

  d.unit_procedures.forEach(function (up) {
    ins(buildUPElement(doc, ns, ext, nid, up, reMap, d));
  });

  ins(mkRE(doc, ns, procEndReId, "End"));

  // Update ext:Name
  var allExtNames = recipe.getElementsByTagNameNS(ext, "Name");
  for (var i = 0; i < allExtNames.length; i++) {
    if (allExtNames[i].parentNode === recipe) {
      allExtNames[i].textContent = d.id.replace("GM_", "");
      break;
    }
  }

  prepareModLog(d, ext);
  // Final structural safety net: confirmed reassignment must leave no stale
  // instance binding in any retained AVEVA extension record.
  var allReassignments = d._instance_reassignments || {};
  ["ParentInstance", "ProcessInstance", "Source", "Destination"].forEach(
    function (tag) {
      var elements = doc.getElementsByTagNameNS(ext, tag);
      for (var ri = 0; ri < elements.length; ri++) {
        var oldValue = (elements[ri].textContent || "").trim();
        if (allReassignments[oldValue])
          elements[ri].textContent = allReassignments[oldValue];
      }
    },
  );
  var output = serializeAndFix(doc, d._rawXML);
  output = injectPendingModLog(output);
  return output;
}

// ============================================================
// Build a UnitProcedure RecipeElement
// ============================================================
function buildUPElement(doc, ns, ext, nid, up, reMap, d) {
  var re = doc.createElementNS(ns, "RecipeElement");
  mkEl(doc, ns, re, "ID", up._reId);
  mkEl(doc, ns, re, "RecipeElementType", "UnitProcedure");

  // Build UP-level ProcedureLogic
  // Items: [upBegin, op0, op1, ..., upEnd]
  var beginStepId = up._beginStepId;
  var endStepId = up._endStepId;
  var stepIds = [beginStepId];
  var reIds = [up._beginReId];
  up.operations.forEach(function (op) {
    stepIds.push(op._stepId);
    reIds.push(op._reId);
  });
  stepIds.push(endStepId);
  reIds.push(up._endReId);

  re.appendChild(
    buildPLWithIds(doc, ns, stepIds, reIds, up._upPLStepToLinkId || {}, nid),
  );

  // Begin
  re.appendChild(mkRE(doc, ns, up._beginReId, "Begin"));

  // Operations - reuse existing node if available, otherwise build new
  up.operations.forEach(function (op) {
    var existingOpRE = reMap[op._reId];
    if (existingOpRE) {
      // Reuse the existing operation node (clone it to avoid modifying original)
      // but rebuild its ProcedureLogic to account for added/removed phases
      var opClone = buildOpElement(doc, ns, ext, nid, op, reMap, existingOpRE);
      re.appendChild(opClone);
    } else {
      re.appendChild(buildOpElement(doc, ns, ext, nid, op, reMap, null));
    }
  });

  // End
  re.appendChild(mkRE(doc, ns, up._endReId, "End"));

  // UnitProcedureInformation
  var upInfo = doc.createElementNS(ext, "UnitProcedureInformation");
  var nm = doc.createElementNS(ext, "Name");
  nm.textContent = up.name || "";
  upInfo.appendChild(nm);
  var pi = doc.createElementNS(ext, "ProcessInstance");
  pi.textContent = up.process || "";
  upInfo.appendChild(pi);
  re.appendChild(upInfo);
  return re;
}

// ============================================================
// Build an Operation RecipeElement
// ============================================================
function buildOpElement(doc, ns, ext, nid, op, reMap, existingOpNode) {
  // ---- CASE 1: Operation unchanged (same phases, all exist) ----
  // Clone the entire existing node to preserve DUMMY/Other elements,
  // original ProcedureLogic IDs, transitions, loop-backs, and all children exactly.
  var phaseCount = op.phases.length;
  var existingPhaseCount = 0;
  var allPhasesExist = true;
  if (existingOpNode) {
    var eph = existingOpNode.getElementsByTagNameNS(ns, "RecipeElement");
    for (var ei = 0; ei < eph.length; ei++) {
      var et = eph[ei].getElementsByTagNameNS(ns, "RecipeElementType")[0];
      if (
        et &&
        (et.textContent === "Phase" ||
          (et.textContent === "Other" &&
            et.getAttribute("OtherValue") === "DUMMY"))
      )
        existingPhaseCount++;
    }
    op.phases.forEach(function (ph) {
      if (!ph._reId || !reMap[ph._reId]) allPhasesExist = false;
    });
  }

  if (
    existingOpNode &&
    !op._graphEdit &&
    allPhasesExist &&
    phaseCount === existingPhaseCount
  ) {
    // Clone the whole operation node - preserves DUMMYs, PL, Begin/End, everything
    var clonedOp = existingOpNode.cloneNode(true);
    // Patch ValueStrings for any changed phase param values
    op.phases.forEach(function (ph) {
      if (!ph.params) return;
      var phEls = clonedOp.getElementsByTagNameNS(ns, "RecipeElement");
      for (var i = 0; i < phEls.length; i++) {
        var phId = phEls[i].getElementsByTagNameNS(ns, "ID")[0];
        if (!phId || phId.textContent !== ph._reId) continue;
        var cParams = phEls[i].getElementsByTagNameNS(ns, "Parameter");
        ph.params.forEach(function (p) {
          if (p._isSentinel) return;
          for (var j = 0; j < cParams.length; j++) {
            var pid = cParams[j].getElementsByTagNameNS(ns, "ID")[0];
            if (pid && pid.textContent === p.name) {
              var vs = cParams[j].getElementsByTagNameNS(ns, "ValueString")[0];
              if (vs) vs.textContent = p.value || "";
              break;
            }
          }
        });
        break;
      }
    });
    return clonedOp;
  }

  // ---- CASE 2: Operation has structural changes (added/removed phases) ----
  // Rebuild the operation, re-inserting Other/DUMMY elements in their correct positions.
  var re = doc.createElementNS(ns, "RecipeElement");
  mkEl(doc, ns, re, "ID", op._reId);
  mkEl(doc, ns, re, "RecipeElementType", "Operation");

  // Recover begin/end IDs and step IDs from existing node
  var beginReId = op._beginReId || null,
    endReId = op._endReId || null,
    beginStepId = op._beginStepId || null,
    endStepId = op._endStepId || null;
  var existingStepMap = {},
    existingLinkMap = {};
  if (existingOpNode) {
    var ech = existingOpNode.childNodes;
    for (var ci = 0; ci < ech.length; ci++) {
      var ec = ech[ci];
      if (
        ec.nodeType !== 1 ||
        ec.localName !== "RecipeElement" ||
        ec.namespaceURI !== ns
      )
        continue;
      var ect = ec.getElementsByTagNameNS(ns, "RecipeElementType")[0];
      var ecid = ec.getElementsByTagNameNS(ns, "ID")[0];
      if (!ect || !ecid) continue;
      if (ect.textContent === "Begin") {
        beginReId = ecid.textContent;
      }
      if (ect.textContent === "End") {
        endReId = ecid.textContent;
      }
    }
    var exPL = existingOpNode.getElementsByTagNameNS(ns, "ProcedureLogic")[0];
    if (exPL) {
      var exS = exPL.getElementsByTagNameNS(ns, "Step");
      for (var si = 0; si < exS.length; si++) {
        var s_id = exS[si].getElementsByTagNameNS(ns, "ID")[0];
        var r_id = exS[si].getElementsByTagNameNS(ns, "RecipeElementID")[0];
        if (s_id && r_id) {
          existingStepMap[r_id.textContent] = s_id.textContent;
          if (r_id.textContent === beginReId) beginStepId = s_id.textContent;
          if (r_id.textContent === endReId) endStepId = s_id.textContent;
        }
      }
      var exL = exPL.getElementsByTagNameNS(ns, "Link");
      for (var li = 0; li < exL.length; li++) {
        var l_id = exL[li].getElementsByTagNameNS(ns, "ID")[0];
        var fv_el = exL[li].getElementsByTagNameNS(ns, "FromIDValue")[0];
        if (l_id && fv_el)
          existingLinkMap[fv_el.textContent] = l_id.textContent;
      }
    }
  }
  if (!beginReId) beginReId = nid();
  if (!endReId) endReId = nid();
  if (!beginStepId) beginStepId = nid();
  if (!endStepId) endStepId = nid();

  // Build ProcedureLogic with existing step/link IDs where possible
  var opStepIds = [beginStepId];
  var opReIds = [beginReId];
  op.phases.forEach(function (ph) {
    if (!ph._reId) ph._reId = nid();
    opStepIds.push(existingStepMap[ph._reId] || nid());
    opReIds.push(ph._reId);
  });
  opStepIds.push(endStepId);
  opReIds.push(endReId);
  if (typeof normaliseOperationStepEndpoints === "function")
    normaliseOperationStepEndpoints(op);
  // Hydrate both endpoint identity fields for all new-operation Step links.
  // This includes the post-join exit DUMMY → End continuation.
  (op.links || []).forEach(function (link) {
    ["from", "to"].forEach(function (side) {
      if (link[side + "_type"] !== "Step") return;
      var id = link[side + "_re_id"] || link[side + "_node"] || "";
      if (!id) {
        if (link[side] === "Begin") id = beginReId;
        else if (link[side] === "End") id = endReId;
      }
      if (id) {
        link[side + "_re_id"] = String(id);
        link[side + "_node"] = String(id);
      }
    });
  });
  var runtimeLinks = (op.links || []).slice();
  runtimeLinks._phaseLabels = op.phases.map(function (ph, idx) {
    return { label: ph.label, stepId: opStepIds[idx + 1] };
  });
  runtimeLinks._transitions = op.transitions || {};
  runtimeLinks._transitionMeta = op.transition_meta || {};
  re.appendChild(
    buildProcedureLogicWithLinks(
      doc,
      ns,
      opStepIds,
      opReIds,
      runtimeLinks,
      existingLinkMap,
      nid,
    ),
  );

  re.appendChild(mkRE(doc, ns, beginReId, "Begin"));

  // Build lookup: _afterPhaseReId -> list of Other/_DUMMY reIds to insert after that phase
  var otherAfter = {};
  (op._otherElements || []).forEach(function (oe) {
    var key = oe._afterPhaseReId || "";
    if (!otherAfter[key]) otherAfter[key] = [];
    otherAfter[key].push(oe._reId);
  });

  // Insert any Other elements that come BEFORE the first phase (afterPhaseReId='')
  (otherAfter[""] || []).forEach(function (oeId) {
    var existingOE = reMap[oeId];
    if (existingOE) re.appendChild(existingOE.cloneNode(true));
    else {
      // Reconstruct minimal DUMMY node
      var dummy = doc.createElementNS(ns, "RecipeElement");
      mkEl(doc, ns, dummy, "ID", oeId);
      var rtEl = doc.createElementNS(ns, "RecipeElementType");
      rtEl.textContent = "Other";
      rtEl.setAttribute("OtherValue", "DUMMY");
      dummy.appendChild(rtEl);
      re.appendChild(dummy);
    }
  });

  // Phases + Other elements interleaved
  // Phases and AVEVA DUMMY lane slots, plus preserved Other elements.
  op.phases.forEach(function (ph) {
    var existingPhRE = reMap[ph._reId];
    if (ph._dummy) {
      // A native DUMMY loaded as DUMMY can be cloned. A deleted Phase keeps
      // its RecipeElement ID but its raw node is still RecipeElementType
      // Phase, so cloning it would resurrect the deleted Phase on reload.
      var existingType =
        existingPhRE &&
        existingPhRE.getElementsByTagNameNS(ns, "RecipeElementType")[0];
      var isNativeDummy =
        existingType &&
        existingType.textContent === "Other" &&
        existingType.getAttribute("OtherValue") === "DUMMY";
      re.appendChild(
        isNativeDummy
          ? existingPhRE.cloneNode(true)
          : buildNewDummyRE(doc, ns, ph),
      );
    } else if (existingPhRE && !ph._replaceDummy) {
      var cloned = existingPhRE.cloneNode(true);
      if (ph.params) {
        var cParams = cloned.getElementsByTagNameNS(ns, "Parameter");
        ph.params.forEach(function (p) {
          if (p._isSentinel) return;
          for (var i = 0; i < cParams.length; i++) {
            var pid = cParams[i].getElementsByTagNameNS(ns, "ID")[0];
            if (pid && pid.textContent === p.name) {
              var vs = cParams[i].getElementsByTagNameNS(ns, "ValueString")[0];
              if (vs) vs.textContent = p.value || "";
              break;
            }
          }
        });
      }
      re.appendChild(cloned);
    } else {
      // _replaceDummy deliberately emits a Phase at the DUMMY's established
      // RecipeElement ID, keeping its existing ProcedureLogic Step identity.
      re.appendChild(buildNewPhaseRE(doc, ns, ext, ph));
    }
    (otherAfter[ph._reId] || []).forEach(function (oeId) {
      var existingOE = reMap[oeId];
      if (existingOE) {
        re.appendChild(existingOE.cloneNode(true));
      } else {
        var dummy = doc.createElementNS(ns, "RecipeElement");
        mkEl(doc, ns, dummy, "ID", oeId);
        var rtEl = doc.createElementNS(ns, "RecipeElementType");
        rtEl.textContent = "Other";
        rtEl.setAttribute("OtherValue", "DUMMY");
        dummy.appendChild(rtEl);
        re.appendChild(dummy);
      }
    });
  });

  re.appendChild(mkRE(doc, ns, endReId, "End"));

  var opInfo = doc.createElementNS(ext, "OperationInformation");
  var nm = doc.createElementNS(ext, "Name");
  nm.textContent = op.name || "";
  opInfo.appendChild(nm);
  re.appendChild(opInfo);
  return re;
}

// Build AVEVA ProcedureLogic from the flattened runtime link model.  Parallel
// edges are regrouped so a divergent Link has multiple <ToID> elements and a
// convergent Link has multiple <FromID> elements.
function buildProcedureLogicWithLinks(
  doc,
  ns,
  stepIds,
  reIds,
  links,
  existingLinkMap,
  nid,
) {
  var pl = doc.createElementNS(ns, "ProcedureLogic");
  var stepByRecipeElement = {},
    stepByLabel = {};
  for (var i = 0; i < reIds.length; i++)
    stepByRecipeElement[String(reIds[i])] = stepIds[i];
  stepByLabel.Begin = stepIds[0];
  stepByLabel.End = stepIds[stepIds.length - 1];
  // Labels are resolved by the matching phase array position through its RE ID.
  // The caller provides links with existing raw IDs where those are available.
  function endpointId(link, side) {
    var raw = side === "from" ? link.from_id : link.to_id;
    // Runtime branch links retain the stable RecipeElement identity in both
    // *_re_id and *_node. Never discard the latter and silently export blank
    // AVEVA Step IDs when a later editor action has not populated *_re_id.
    var reId =
      (side === "from" ? link.from_re_id : link.to_re_id) ||
      (side === "from" ? link.from_node : link.to_node);
    var label = side === "from" ? link.from : link.to;
    var typ = side === "from" ? link.from_type : link.to_type;
    if (typ === "Transition")
      return raw || (label || "").replace(/^TRANS:/, "");
    if (reId && stepByRecipeElement[String(reId)])
      return stepByRecipeElement[String(reId)];
    if (raw) return raw;
    return stepByLabel[label] || "";
  }
  function endpointType(link, side) {
    return (side === "from" ? link.from_type : link.to_type) || "Step";
  }
  // Populate phase label map from the caller's parallel phase ordering.
  // _phaseLabels is attached only for this serialisation and is not persisted.
  (links._phaseLabels || []).forEach(function (x) {
    stepByLabel[x.label] = x.stepId;
  });
  var linkDebugContext = "";
  function appendEndpoint(parent, tag, value, type) {
    // An empty Step reference produces structurally invalid branch XML. Stop
    // export rather than producing a file that flattens or corrupts a branch.
    if (type === "Step" && !value)
      throw new Error(
        "Cannot export ProcedureLogic: " +
          (linkDebugContext || tag) +
          " has no resolvable Step ID. Save was blocked to protect the branch graph.",
      );
    var node = doc.createElementNS(ns, tag);
    mkEl(doc, ns, node, tag + "Value", value);
    mkEl(doc, ns, node, tag === "FromID" ? "FromType" : "ToType", type);
    mkEl(doc, ns, node, "IDScope", "Internal");
    parent.appendChild(node);
  }
  function appendLink(group, type) {
    var first = group[0],
      lk = doc.createElementNS(ns, "Link");
    linkDebugContext =
      type +
      " " +
      (first.from_type || "Step") +
      "[" +
      (first.from_re_id ||
        first.from_node ||
        first.from_id ||
        first.from ||
        "?") +
      "] → " +
      (first.to_type || "Step") +
      "[" +
      (first.to_re_id || first.to_node || first.to_id || first.to || "?") +
      "]";
    // Keep distinct AVEVA Link records distinct even if a deletion retargets
    // two convergences to the same Step. _linkId is parsed from raw XML.
    mkEl(
      doc,
      ns,
      lk,
      "ID",
      first._linkId || existingLinkMap[endpointId(first, "from")] || nid(),
    );
    if (type === "ParallelConvergent" || type === "SerialConvergent") {
      group.forEach(function (edge) {
        appendEndpoint(
          lk,
          "FromID",
          endpointId(edge, "from"),
          endpointType(edge, "from"),
        );
      });
      appendEndpoint(
        lk,
        "ToID",
        endpointId(first, "to"),
        endpointType(first, "to"),
      );
    } else {
      appendEndpoint(
        lk,
        "FromID",
        endpointId(first, "from"),
        endpointType(first, "from"),
      );
      if (type === "ParallelDivergent" || type === "SerialDivergent")
        group.forEach(function (edge) {
          appendEndpoint(
            lk,
            "ToID",
            endpointId(edge, "to"),
            endpointType(edge, "to"),
          );
        });
      else
        appendEndpoint(
          lk,
          "ToID",
          endpointId(first, "to"),
          endpointType(first, "to"),
        );
    }
    mkEl(doc, ns, lk, "LinkType", type);
    mkEl(doc, ns, lk, "Depiction", "Line");
    pl.appendChild(lk);
  }
  var handled = [];
  links.forEach(function (link) {
    if (handled.indexOf(link) >= 0) return;
    var group = [link];
    handled.push(link);
    if (link.type === "ParallelDivergent" || link.type === "SerialDivergent")
      links.forEach(function (other) {
        if (
          handled.indexOf(other) < 0 &&
          other.type === link.type &&
          other.from_re_id === link.from_re_id &&
          (!link._linkId || other._linkId === link._linkId)
        ) {
          group.push(other);
          handled.push(other);
        }
      });
    if (link.type === "ParallelConvergent" || link.type === "SerialConvergent")
      links.forEach(function (other) {
        if (
          handled.indexOf(other) < 0 &&
          other.type === link.type &&
          other.to_re_id === link.to_re_id &&
          (!link._linkId || other._linkId === link._linkId)
        ) {
          group.push(other);
          handled.push(other);
        }
      });
    appendLink(group, link.type || "ControlLink");
  });
  for (var s = 0; s < stepIds.length; s++) {
    var step = doc.createElementNS(ns, "Step");
    mkEl(doc, ns, step, "ID", stepIds[s]);
    mkEl(doc, ns, step, "RecipeElementID", reIds[s]);
    mkEl(doc, ns, step, "RecipeElementVersion", "0");
    pl.appendChild(step);
  }
  // Transition IDs are graph identities (not display labels). Existing and newly
  // inserted transitions are emitted after Steps, matching AVEVA ProcedureLogic.
  var transitions = links._transitions || {},
    transitionMeta = links._transitionMeta || {};
  Object.keys(transitions).forEach(function (tid) {
    var meta = transitionMeta[tid] || {},
      tr = doc.createElementNS(ns, "Transition");
    mkEl(doc, ns, tr, "ID", tid);
    mkEl(doc, ns, tr, "Condition", transitions[tid] || "");
    mkEl(doc, ns, tr, "Description", meta.description || "");
    var name = doc.createElementNS(
      "http://www.wbf.org/xml/B2MML-V0401-AllExtensions",
      "Name",
    );
    name.textContent = meta.name || tid;
    tr.appendChild(name);
    pl.appendChild(tr);
  });
  return pl;
}

function buildPLWithIds(doc, ns, stepIds, reIds, stepToLinkId, nid) {
  var pl = doc.createElementNS(ns, "ProcedureLogic");
  // Links: chain stepIds[0] -> stepIds[1] -> ... -> stepIds[n]
  for (var i = 0; i < stepIds.length - 1; i++) {
    var fromSid = stepIds[i];
    var toSid = stepIds[i + 1];
    // Reuse existing link ID if this exact from->to connection existed
    var linkId = stepToLinkId[fromSid] || nid();
    var lk = doc.createElementNS(ns, "Link");
    mkEl(doc, ns, lk, "ID", linkId);
    var fromID = doc.createElementNS(ns, "FromID");
    mkEl(doc, ns, fromID, "FromIDValue", fromSid);
    mkEl(doc, ns, fromID, "FromType", "Step");
    mkEl(doc, ns, fromID, "IDScope", "Internal");
    lk.appendChild(fromID);
    var toID = doc.createElementNS(ns, "ToID");
    mkEl(doc, ns, toID, "ToIDValue", toSid);
    mkEl(doc, ns, toID, "ToType", "Step");
    mkEl(doc, ns, toID, "IDScope", "Internal");
    lk.appendChild(toID);
    mkEl(doc, ns, lk, "LinkType", "ControlLink");
    mkEl(doc, ns, lk, "Depiction", "Line");
    pl.appendChild(lk);
  }
  // Steps
  for (var i = 0; i < stepIds.length; i++) {
    var step = doc.createElementNS(ns, "Step");
    mkEl(doc, ns, step, "ID", stepIds[i]);
    mkEl(doc, ns, step, "RecipeElementID", reIds[i]);
    mkEl(doc, ns, step, "RecipeElementVersion", "0");
    pl.appendChild(step);
  }
  return pl;
}

// ============================================================
// Build a new Phase RecipeElement (for added phases)
// ============================================================
function buildNewPhaseRE(doc, ns, ext, ph) {
  var re = doc.createElementNS(ns, "RecipeElement");
  mkEl(doc, ns, re, "ID", ph._reId);
  mkEl(doc, ns, re, "Description", ph.description || "");
  mkEl(doc, ns, re, "RecipeElementType", "Phase");
  if (ph.params) {
    ph.params.forEach(function (p) {
      var paramEl = doc.createElementNS(ns, "Parameter");
      mkEl(doc, ns, paramEl, "ID", p.name || "");
      var isMat = p.param_type === "ProcessInput" || !!p.material_id;
      mkEl(
        doc,
        ns,
        paramEl,
        "ParameterType",
        isMat ? "ProcessInput" : "ProcessParameter",
      );
      var valEl = doc.createElementNS(ns, "Value");
      mkEl(doc, ns, valEl, "ValueString", p.value || "0.0");
      mkEl(doc, ns, valEl, "DataInterpretation", "Constant");
      mkEl(doc, ns, valEl, "DataType", "double");
      mkEl(doc, ns, valEl, "UnitOfMeasure", "");
      paramEl.appendChild(valEl);
      if (p._fid) {
        var fidEl = doc.createElementNS(ext, "FormulaParameterID");
        fidEl.textContent = p._fid;
        paramEl.appendChild(fidEl);
      }
      re.appendChild(paramEl);
    });
  }
  var phi = doc.createElementNS(ext, "PhaseInformation");
  mkElE(doc, ext, phi, "Label", ph._label || "");
  mkElE(doc, ext, phi, "PhaseType", ph.phase_type || "Process");
  mkElE(doc, ext, phi, "Name", ph.label || "");
  mkElE(doc, ext, phi, "ParentInstance", ph.parent_instance || "");
  mkElE(doc, ext, phi, "OperatorAcknowledgmentModes", "0");
  mkElE(doc, ext, phi, "OperatorCommentRequired", "false");
  mkElE(doc, ext, phi, "Report", "");
  mkElE(doc, ext, phi, "AppendDescription", "false");
  mkElE(doc, ext, phi, "ContinueMode", "false");
  mkElE(doc, ext, phi, "DocumentViewType", "None");
  mkElE(doc, ext, phi, "DocumentViewPath", "");
  mkElE(doc, ext, phi, "DocumentViewDescription", "");
  re.appendChild(phi);
  return re;
}

// ============================================================
// Build an AVEVA blank branch lane placeholder.
// ============================================================
function buildNewDummyRE(doc, ns, ph) {
  var re = doc.createElementNS(ns, "RecipeElement");
  mkEl(doc, ns, re, "ID", ph._reId);
  var type = mkEl(doc, ns, re, "RecipeElementType", "Other");
  type.setAttribute("OtherValue", "DUMMY");
  return re;
}

// ============================================================
// Build a new Formula/Parameter element
// ============================================================
function buildFormulaParam(doc, ns, ext, fid, param, phase) {
  var p = doc.createElementNS(ns, "Parameter");
  mkEl(doc, ns, p, "ID", fid);
  var isMat = param.param_type === "ProcessInput" || !!param.material_id;
  mkEl(
    doc,
    ns,
    p,
    "ParameterType",
    isMat ? "ProcessInput" : "ProcessParameter",
  );
  var valEl = doc.createElementNS(ns, "Value");
  mkEl(doc, ns, valEl, "ValueString", param.value || "0.0");
  mkEl(doc, ns, valEl, "DataInterpretation", "Constant");
  mkEl(doc, ns, valEl, "DataType", "double");
  mkEl(doc, ns, valEl, "UnitOfMeasure", "");
  p.appendChild(valEl);
  if (isMat) {
    mkElE(doc, ext, p, "MaterialID", param.material_id || param.value || "0");
    mkElE(doc, ext, p, "Total", "true");
    mkElE(doc, ext, p, "ToleranceType", "General");
    mkElE(doc, ext, p, "HighDeviation", "1");
    mkElE(doc, ext, p, "LowDeviation", "1");
  } else {
    mkElE(doc, ext, p, "Name", param.name || "");
    mkElE(doc, ext, p, "ToleranceType", "General");
    mkElE(doc, ext, p, "HighDeviation", "0");
    mkElE(doc, ext, p, "LowDeviation", "0");
    mkElE(doc, ext, p, "ProcessVariableType", "Process");
    if (phase) {
      mkElE(doc, ext, p, "Label", phase._label || "");
      mkElE(doc, ext, p, "ParentInstance", phase.parent_instance || "");
      mkElE(doc, ext, p, "Phase", phase.label || "");
      mkElE(doc, ext, p, "PhaseParameter", param.name || "");
    }
  }
  return p;
}

// ============================================================
// Helpers
// ============================================================
function mkRE(doc, ns, id, type) {
  var re = doc.createElementNS(ns, "RecipeElement");
  mkEl(doc, ns, re, "ID", id);
  mkEl(doc, ns, re, "RecipeElementType", type);
  return re;
}
function mkEl(doc, ns, parent, tag, text) {
  var el = doc.createElementNS(ns, tag);
  if (text !== undefined) el.textContent = text;
  parent.appendChild(el);
  return el;
}
function mkElE(doc, ext, parent, tag, text) {
  var el = doc.createElementNS(ext, tag);
  if (text !== undefined) el.textContent = text;
  parent.appendChild(el);
  return el;
}
function buildREMap(recipe, ns) {
  var map = {};
  var all = recipe.getElementsByTagNameNS(ns, "RecipeElement");
  for (var i = 0; i < all.length; i++) {
    var idEl = all[i].getElementsByTagNameNS(ns, "ID")[0];
    if (idEl) map[idEl.textContent] = all[i];
  }
  return map;
}
// Rebuild editable recipe-level process and derived-transfer collections without touching other raw XML.
function syncRecipeCollections(recipe, d, ns, ext) {
  function docElement(doc, namespace, name) {
    return doc.createElementNS(namespace, name);
  }
  function directChildren(localName, namespace) {
    var out = [];
    for (var i = 0; i < recipe.childNodes.length; i++) {
      var n = recipe.childNodes[i];
      if (
        n.nodeType === 1 &&
        n.localName === localName &&
        n.namespaceURI === namespace
      )
        out.push(n);
    }
    return out;
  }
  function insertionAnchor(nodes) {
    return nodes.length ? nodes[nodes.length - 1].nextSibling : null;
  }
  function insertAt(anchor, node) {
    if (anchor && anchor.parentNode === recipe)
      recipe.insertBefore(node, anchor);
    else recipe.appendChild(node);
  }
  var reqs = directChildren("EquipmentRequirement", ns),
    reqAnchor = insertionAnchor(reqs);
  reqs.forEach(function (n) {
    recipe.removeChild(n);
  });
  (d.equipment_requirements || []).forEach(function (req) {
    var el = docElement(recipe.ownerDocument, ns, "EquipmentRequirement");
    mkEl(recipe.ownerDocument, ns, el, "ID", req.id || req.process || "");
    var instances = Array.isArray(req.instances)
      ? req.instances
      : [
          {
            name: req.process || req.id || "",
            unit: req.unit || "",
            mode: req.mode || "Auto",
          },
        ];
    instances.forEach(function (instance) {
      var pi = docElement(recipe.ownerDocument, ext, "ProcessInstance");
      mkElE(recipe.ownerDocument, ext, pi, "Name", instance.name || "");
      mkElE(recipe.ownerDocument, ext, pi, "Unit", instance.unit || "");
      mkElE(
        recipe.ownerDocument,
        ext,
        pi,
        "UnitSelectionMode",
        instance.mode || "Auto",
      );
      el.appendChild(pi);
    });
    insertAt(reqAnchor, el);
  });
  var xfers = directChildren("EquipmentTransfer", ext),
    xferAnchor = insertionAnchor(xfers);
  xfers.forEach(function (n) {
    recipe.removeChild(n);
  });
  (d.equipment_transfers || []).forEach(function (x) {
    var el = docElement(recipe.ownerDocument, ext, "EquipmentTransfer");
    mkElE(recipe.ownerDocument, ext, el, "Name", x.name || "");
    mkElE(recipe.ownerDocument, ext, el, "Source", x.source || "");
    mkElE(recipe.ownerDocument, ext, el, "Destination", x.dest || "");
    var instances = Array.isArray(x.instances)
      ? x.instances
      : [{ name: x.name || "", source: x.source || "", dest: x.dest || "" }];
    instances.forEach(function (instance) {
      var ti = docElement(recipe.ownerDocument, ext, "TransferInstance");
      mkElE(
        recipe.ownerDocument,
        ext,
        ti,
        "Name",
        instance.name || x.name || "",
      );
      mkElE(recipe.ownerDocument, ext, ti, "Source", instance.source || "");
      mkElE(recipe.ownerDocument, ext, ti, "Destination", instance.dest || "");
      el.appendChild(ti);
    });
    insertAt(xferAnchor, el);
  });
}

function patchHeader(recipe, d, ns, ext) {
  var idEl = recipe.getElementsByTagNameNS(ns, "ID")[0];
  if (idEl) idEl.textContent = d.id;
  var descEl = recipe.getElementsByTagNameNS(ns, "Description")[0];
  if (descEl) descEl.textContent = d.description;
  var header = recipe.getElementsByTagNameNS(ns, "Header")[0];
  if (header) {
    var pid = header.getElementsByTagNameNS(ns, "ProductID")[0];
    if (pid) pid.textContent = d.product_id || "";
    var pn = header.getElementsByTagNameNS(ns, "ProductName")[0];
    if (pn) pn.textContent = d.product_name || "";
    var nom = header.getElementsByTagNameNS(ns, "Nominal")[0];
    if (nom) nom.textContent = d.batch_size_nominal || "";
    var min = header.getElementsByTagNameNS(ns, "Min")[0];
    if (min) min.textContent = d.batch_size_min || "0";
    var max = header.getElementsByTagNameNS(ns, "Max")[0];
    if (max) max.textContent = d.batch_size_max || "0";
    var ap = header.getElementsByTagNameNS(ext, "ApprovedForProduction")[0];
    if (ap) ap.textContent = d.approved_production || "false";
    var at = header.getElementsByTagNameNS(ext, "ApprovedForTest")[0];
    if (at) at.textContent = d.approved_test || "false";
  }
}
function prepareModLog(d, ext) {
  if (d.modification_logs && d.modification_logs.length) {
    var nl = d.modification_logs[d.modification_logs.length - 1];
    _pendingModLog =
      "\n      <ModificationLog>" +
      "\n        <ModifiedDate>" +
      nl.date +
      "</ModifiedDate>" +
      "\n        <Description>" +
      escXml(nl.description) +
      "</Description>" +
      "\n        <Author>" +
      escXml(nl.author) +
      "</Author>" +
      '\n        <VersionState xmlns="' +
      ext +
      '">Production</VersionState>' +
      '\n        <VersionType xmlns="' +
      ext +
      '">Production</VersionType>' +
      "\n      </ModificationLog>";
  }
}
function injectPendingModLog(output) {
  if (!_pendingModLog) return output;
  var pats = [
    "<ApprovalHistory",
    "<ProductID",
    "<ProductName",
    "<BatchSize",
    "<ApprovedFor",
  ];
  var pos = -1;
  for (var i = 0; i < pats.length; i++) {
    var p = output.indexOf(pats[i]);
    if (p > 0) {
      pos = p;
      break;
    }
  }
  if (pos > 0)
    output =
      output.slice(0, pos) + _pendingModLog + "\n      " + output.slice(pos);
  else {
    var lm = output.lastIndexOf("</ModificationLog>");
    if (lm > 0)
      output =
        output.slice(0, lm + 18) + _pendingModLog + output.slice(lm + 18);
  }
  _pendingModLog = null;
  return output;
}
function escXml(s) {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ============================================================
// Serialize DOM, pretty-print to 2-space indent, and restore
// " />" formatting for known AVEVA empty elements.
// Applied to ALL saves so output is always consistently formatted.
// ============================================================
function serializeAndFix(doc, rawXML) {
  var ser = new XMLSerializer();
  var output = ser.serializeToString(doc);
  if (output.indexOf("<?xml") < 0)
    output = '<?xml version="1.0" encoding="utf-8"?>\n' + output;

  // Step 1: Fix self-closing tag formatting before pretty-printing
  // Tags that use " />" style in AVEVA XML
  var spaceTags = [
    "Description",
    "DocumentViewDescription",
    "DocumentViewPath",
    "IndividualApproval",
    "Report",
    "Unit",
    "UnitOfMeasure",
  ];
  if (rawXML) {
    var spaceTagRe = /<(\w+) \/>/g;
    var stm;
    while ((stm = spaceTagRe.exec(rawXML)) !== null) {
      if (spaceTags.indexOf(stm[1]) < 0) spaceTags.push(stm[1]);
    }
  }
  for (var i = 0; i < spaceTags.length; i++) {
    var tag = spaceTags[i];
    output = output.split("<" + tag + "/>").join("<" + tag + " />");
    output = output
      .split("<" + tag + "></" + tag + ">")
      .join("<" + tag + " />");
  }

  // Step 2: Pretty-print to 2-space indent (fixes compacted structural sections)
  output = indentXML(output);

  return output;
}

// ============================================================
// XML pretty-printer: 2-space indent matching AVEVA format.
// Collapses all existing inter-element whitespace first,
// then re-indents cleanly. Inline text stays on same line as tag.
// ============================================================
function indentXML(xmlStr) {
  // Collapse existing whitespace between tags
  var s = xmlStr.replace(/>\s+</g, "><");

  var pad = "  "; // 2-space per level
  var level = 0;
  var out = [];

  // Tokenise into tags and text
  var tokenRe = /(<(?:[^>"']+|"[^"]*"|'[^']*')+>|[^<]+)/g;
  var m;
  while ((m = tokenRe.exec(s)) !== null) {
    var tok = m[0];
    if (!tok.trim()) continue;

    // XML declaration / processing instruction
    if (tok.charAt(0) === "<" && tok.charAt(1) === "?") {
      out.push(tok + "\n");
      continue;
    }

    // Text content - append inline to previous opening tag
    if (tok.charAt(0) !== "<") {
      if (
        out.length &&
        out[out.length - 1].charAt(out[out.length - 1].length - 1) !== "\n"
      ) {
        out[out.length - 1] += tok;
      } else {
        out.push(tok);
      }
      continue;
    }

    var isClose = tok.charAt(1) === "/";
    var isSelfClose = tok.charAt(tok.length - 2) === "/";

    if (isClose) {
      level = Math.max(0, level - 1);
      var prev = out.length ? out[out.length - 1] : "";
      // If previous line ended with text (inline content), close on same line
      if (prev && prev.charAt(prev.length - 1) !== "\n") {
        out[out.length - 1] += tok + "\n";
      } else {
        out.push(pad.repeat(level) + tok + "\n");
      }
    } else if (isSelfClose) {
      out.push(pad.repeat(level) + tok + "\n");
    } else {
      // Opening tag - peek at next token to decide whether to newline
      var save = tokenRe.lastIndex;
      var peek = tokenRe.exec(s);
      tokenRe.lastIndex = peek ? peek.index : save;

      out.push(pad.repeat(level) + tok);
      level++;

      // If next token is text (not a tag), keep opening tag and text on same line
      if (peek && peek[0].charAt(0) !== "<" && peek[0].trim()) {
        // text follows - no newline after opening tag
      } else {
        out[out.length - 1] += "\n";
      }
    }
  }
  return out.join("");
}

// ============================================================
// BUILD NEW XML (brand-new recipe, no rawXML)
// ============================================================
function buildNewXML(d) {
  var ns = "http://www.wbf.org/xml/B2MML-V0401";
  var ext = "http://www.wbf.org/xml/B2MML-V0401-AllExtensions";
  var doc = document.implementation.createDocument(
    ns,
    "BatchInformation",
    null,
  );
  var root = doc.documentElement;
  root.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
  root.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
  var recipe = doc.createElementNS(ns, "MasterRecipe");
  root.appendChild(recipe);
  mkEl(doc, ns, recipe, "ID", d.id || "");
  mkEl(doc, ns, recipe, "Description", d.description || "");
  var header = doc.createElementNS(ns, "Header");
  mkEl(doc, ns, header, "ProductID", d.product_id || "");
  mkEl(doc, ns, header, "ProductName", d.product_name || "");
  var bs = doc.createElementNS(ns, "BatchSize");
  mkEl(doc, ns, bs, "Nominal", d.batch_size_nominal || "0");
  mkEl(doc, ns, bs, "Min", d.batch_size_min || "0");
  mkEl(doc, ns, bs, "Max", d.batch_size_max || "0");
  header.appendChild(bs);
  mkElE(
    doc,
    ext,
    header,
    "ApprovedForProduction",
    d.approved_production || "false",
  );
  mkElE(doc, ext, header, "ApprovedForTest", d.approved_test || "false");
  recipe.appendChild(header);
  (d.equipment_requirements || []).forEach(function (eq) {
    var eqEl = doc.createElementNS(ns, "EquipmentRequirement");
    mkEl(doc, ns, eqEl, "ID", eq.id || eq.process || "");
    var instances = Array.isArray(eq.instances)
      ? eq.instances
      : [
          {
            name: eq.process || eq.id || "",
            unit: eq.unit || "",
            mode: eq.mode || "Auto",
          },
        ];
    instances.forEach(function (instance) {
      var pi = doc.createElementNS(ext, "ProcessInstance");
      mkElE(doc, ext, pi, "Name", instance.name || "");
      mkElE(doc, ext, pi, "Unit", instance.unit || "");
      mkElE(doc, ext, pi, "UnitSelectionMode", instance.mode || "Auto");
      eqEl.appendChild(pi);
    });
    recipe.appendChild(eqEl);
  });
  (d.equipment_transfers || []).forEach(function (x) {
    var transferEl = doc.createElementNS(ext, "EquipmentTransfer");
    mkElE(doc, ext, transferEl, "Name", x.name || "");
    mkElE(doc, ext, transferEl, "Source", x.source || "");
    mkElE(doc, ext, transferEl, "Destination", x.dest || "");
    var instances = Array.isArray(x.instances)
      ? x.instances
      : [{ name: x.name || "", source: x.source || "", dest: x.dest || "" }];
    instances.forEach(function (instance) {
      var ti = doc.createElementNS(ext, "TransferInstance");
      mkElE(doc, ext, ti, "Name", instance.name || x.name || "");
      mkElE(doc, ext, ti, "Source", instance.source || "");
      mkElE(doc, ext, ti, "Destination", instance.dest || "");
      transferEl.appendChild(ti);
    });
    recipe.appendChild(transferEl);
  });
  recipe.appendChild(doc.createElementNS(ns, "Formula"));
  var nextId2 = 1;
  function nid2() {
    return String(nextId2++);
  }
  if (d.unit_procedures && d.unit_procedures.length) {
    var bId = nid2(),
      eId = nid2();
    var upReIds = d.unit_procedures.map(function () {
      return nid2();
    });
    d.unit_procedures.forEach(function (up, i) {
      up._reId = upReIds[i];
      up._stepId = nid2();
      up._beginReId = nid2();
      up._beginStepId = nid2();
      up._endReId = nid2();
      up._endStepId = nid2();
      up.operations.forEach(function (op) {
        op._reId = nid2();
        op._stepId = nid2();
        op.phases.forEach(function (ph) {
          ph._reId = nid2();
        });
      });
    });
    var topStepIds = [nid2()]
      .concat(
        d.unit_procedures.map(function (up) {
          return up._stepId;
        }),
      )
      .concat([nid2()]);
    var topReIds = [bId].concat(upReIds).concat([eId]);
    recipe.appendChild(buildPLWithIds(doc, ns, topStepIds, topReIds, {}, nid2));
    recipe.appendChild(mkRE(doc, ns, bId, "Begin"));
    d.unit_procedures.forEach(function (up) {
      recipe.appendChild(buildUPElement(doc, ns, ext, nid2, up, {}, d));
    });
    recipe.appendChild(mkRE(doc, ns, eId, "End"));
  }
  mkElE(doc, ext, recipe, "Name", (d.id || "").replace("GM_", ""));
  var ser = new XMLSerializer();
  var output = ser.serializeToString(doc);
  if (output.indexOf("<?xml") < 0)
    output = '<?xml version="1.0" encoding="utf-8"?>\n' + output;
  return serializeAndFix(doc, null);
}

// ============================================================
// PHASE PICKER context (state only)
// ============================================================
var pickerCtx = null;

/* ==========================================================================
 * Former file: js/print.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// print.js - Lane-only print view

function printLaneView() {
  if (!currentRecipeData) return;
  // Generate a printable lane document showing all UPs->Ops->Phases
  var d = currentRecipeData;
  var w = window.open("", "_blank");
  var h =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' +
    esc(d.id) +
    " - Lane View</title>";
  h += "<style>";
  h +=
    'body{font-family:"Segoe UI",sans-serif;font-size:11px;color:#333;margin:20px}';
  h += "h1{color:#36398E;font-size:1.3em;margin-bottom:4px}";
  h += ".sub{color:#666;font-size:0.9em;margin-bottom:16px}";
  h +=
    ".up-section{margin-bottom:16px;border:1px solid #ddd;border-radius:4px;page-break-inside:avoid}";
  h +=
    ".up-hdr{background:#36398E;color:#fff;padding:8px 12px;font-weight:600;font-size:0.95em;-webkit-print-color-adjust:exact;print-color-adjust:exact}";
  h += ".up-body{padding:10px}";
  h +=
    ".op-section{margin-left:12px;margin-bottom:8px;border-left:3px solid #009F3C;padding-left:10px}";
  h +=
    ".op-hdr{color:#2E7D32;font-weight:600;font-size:0.9em;margin-bottom:4px;background:#f1f8e9;padding:4px 8px;border-radius:3px;-webkit-print-color-adjust:exact;print-color-adjust:exact}";
  h +=
    ".ph{margin:3px 0;padding:4px 8px;border-left:3px solid #009F3C;background:#f8f9fa;border-radius:0 3px 3px 0;page-break-inside:avoid}";
  h += ".ph.xfer{border-left-color:#36398E;background:#f5f5fc}";
  h += ".ph.alloc{border-left-color:#999;background:#fafafa;opacity:0.7}";
  h += ".ph-name{font-weight:500;font-size:0.9em}";
  h += ".ph-desc{color:#666;font-size:0.85em;font-style:italic}";
  h += ".ph-parent{color:#36398E;font-size:0.8em}";
  h += ".ph-params{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}";
  h +=
    ".ph-param{background:#fff;padding:2px 6px;border:1px solid #eee;border-radius:3px;font-size:0.82em}";
  h +=
    ".pn{color:#666}.pv{color:#009F3C;font-weight:600}.pm{color:#36398E;font-weight:500}";
  h +=
    ".badge{display:inline-block;padding:1px 4px;border-radius:2px;font-size:0.7em;margin-left:4px;font-weight:500}";
  h +=
    ".b-proc{background:#e8f5e9;color:#009F3C}.b-xfer{background:#e8eaf6;color:#36398E}.b-alloc{background:#f5f5f5;color:#777}";
  h +=
    ".trans{margin:3px 0 3px 12px;padding:3px 8px;border-radius:3px;font-size:0.8em;font-weight:500}";
  h +=
    ".trans.loop{background:#fce4ec;color:#c62828;border:1px dashed #ef535080}";
  h +=
    ".trans.cond{background:#fff8e1;color:#f57c00;border:1px dashed #ffb30080}";
  h += ".arrow{color:#ccc;text-align:center;font-size:0.8em;padding:1px 0}";
  h +=
    ".parallel{display:flex;gap:6px;margin:4px 0;border:1px dashed #009F3C80;border-radius:4px;padding:6px;background:#f0f7f2}";
  h +=
    ".branch{flex:1}.branch-label{color:#009F3C;font-size:0.72em;font-weight:600;text-transform:uppercase;margin-bottom:3px}";
  h += "@media print{body{margin:10px}.up-section{page-break-inside:avoid}}";
  h += "</style></head><body>";
  h += "<h1>" + esc(d.id) + " - " + esc(d.description) + "</h1>";
  h +=
    '<div class="sub">Product: ' +
    esc(d.product_name) +
    " (" +
    esc(d.product_id) +
    ") | Batch: " +
    d.batch_size_nominal +
    " kg | Printed: " +
    new Date().toLocaleDateString() +
    "</div>";

  for (var u = 0; u < d.unit_procedures.length; u++) {
    var up = d.unit_procedures[u];
    h +=
      '<div class="up-section"><div class="up-hdr">' +
      (u + 1) +
      ". " +
      esc(up.name) +
      " [" +
      up.process +
      ']</div><div class="up-body">';
    for (var o = 0; o < up.operations.length; o++) {
      var op = up.operations[o];
      if (o > 0) h += '<div class="arrow">\u25BC</div>';
      h +=
        '<div class="op-section"><div class="op-hdr">' +
        esc(op.name) +
        " (" +
        op.phases.length +
        " phases)</div>";
      for (var p = 0; p < op.phases.length; p++) {
        var ph = op.phases[p];
        var isX = ph.phase_type === "Transfer";
        var isA =
          (ph.phase_type || "").indexOf("Allocate") >= 0 ||
          (ph.phase_type || "").indexOf("Release") >= 0;
        var cls = "ph";
        if (isA) cls += " alloc";
        else if (isX) cls += " xfer";
        var badge = isX
          ? '<span class="badge b-xfer">XFER</span>'
          : isA
            ? '<span class="badge b-alloc">' +
              ph.phase_type.replace("Process", "").replace("Transfer", "") +
              "</span>"
            : '<span class="badge b-proc">PROC</span>';
        h +=
          '<div class="' +
          cls +
          '"><div class="ph-name">' +
          esc(ph.label) +
          badge +
          "</div>";
        if (ph.description)
          h += '<div class="ph-desc">' + esc(ph.description) + "</div>";
        if (ph.parent_instance && ph.parent_instance !== up.process)
          h +=
            '<div class="ph-parent">\u2197 ' +
            esc(ph.parent_instance) +
            "</div>";
        if (ph.params && ph.params.length) {
          h += '<div class="ph-params">';
          for (var pi = 0; pi < ph.params.length; pi++) {
            var pm = ph.params[pi];
            var ms = pm.material_id
              ? '<span class="pm">[' + matName(pm.material_id) + "]</span> "
              : "";
            h +=
              '<div class="ph-param"><span class="pn">' +
              pm.name +
              "</span> = " +
              ms +
              '<span class="pv">' +
              (pm.value || "\u2014") +
              "</span></div>";
          }
          h += "</div>";
        }
        h += "</div>";
      }
      h += "</div>";
    }
    h += "</div></div>";
  }
  h += "</div></body></html>";
  w.document.write(h);
  w.document.close();
  setTimeout(function () {
    w.print();
  }, 500);
}

// ===== INIT =====
window.addEventListener("DOMContentLoaded", function () {
  currentRecipeData = DEMO;
  renderAll();
});
