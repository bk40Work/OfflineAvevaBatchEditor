/**
 * Consolidated runtime module: ui / editor-ui.js
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
 * Former file: js/viewer.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// viewer.js - Recipe rendering (List View)
// Renders header, equipment, recipe hierarchy (UPs > Ops > Phases)

// ===== HEADER =====
function renderHeader() {
  var d = currentRecipeData;
  var h = '<div class="card-grid">';
  if (editMode) {
    h +=
      '<div class="card-item"><label>Recipe ID</label><input class="inline-edit" value="' +
      esc(d.id) +
      '" onchange="currentRecipeData.id=this.value" style="width:100%"></div>';
    h +=
      '<div class="card-item"><label>Description</label><input class="inline-edit" value="' +
      esc(d.description) +
      '" onchange="currentRecipeData.description=this.value" style="width:100%"></div>';
    h +=
      '<div class="card-item"><label>Product ID</label><input class="inline-edit" value="' +
      esc(d.product_id) +
      '" onchange="currentRecipeData.product_id=this.value" style="width:100%"></div>';
    h +=
      '<div class="card-item"><label>Product Name</label><input class="inline-edit" value="' +
      esc(d.product_name) +
      '" onchange="currentRecipeData.product_name=this.value" style="width:100%"></div>';
    h +=
      '<div class="card-item"><label>Batch Size (kg)</label><input class="inline-edit" type="number" value="' +
      esc(d.batch_size_nominal) +
      '" onchange="currentRecipeData.batch_size_nominal=this.value" style="width:100%"></div>';
    h +=
      '<div class="card-item"><label>Approved Prod</label><select class="inline-select" onchange="currentRecipeData.approved_production=this.value"><option value="true"' +
      (d.approved_production === "true" ? " selected" : "") +
      '>true</option><option value="false"' +
      (d.approved_production !== "true" ? " selected" : "") +
      ">false</option></select></div>";
    h +=
      '<div class="card-item"><label>Approved Test</label><select class="inline-select" onchange="currentRecipeData.approved_test=this.value"><option value="true"' +
      (d.approved_test === "true" ? " selected" : "") +
      '>true</option><option value="false"' +
      (d.approved_test !== "true" ? " selected" : "") +
      ">false</option></select></div>";
  } else {
    h +=
      '<div class="card-item"><label>Recipe ID</label><span>' +
      d.id +
      "</span></div>";
    h +=
      '<div class="card-item"><label>Description</label><span>' +
      d.description +
      "</span></div>";
    h +=
      '<div class="card-item"><label>Product</label><span>' +
      d.product_name +
      " (" +
      d.product_id +
      ")</span></div>";
    h +=
      '<div class="card-item"><label>Batch Size</label><span>' +
      d.batch_size_nominal +
      " kg</span></div>";
    h +=
      '<div class="card-item"><label>Approved</label><span>Prod: ' +
      d.approved_production +
      " | Test: " +
      d.approved_test +
      "</span></div>";
  }
  h += "</div>";
  document.getElementById("headerGrid").innerHTML = h;
  // Auto-expand header card in edit mode
  var card = document.getElementById("cardHeader");
  if (editMode) card.classList.remove("collapsed");
}

// ===== EQUIPMENT =====
function renderEquipment() {
  var d = currentRecipeData;
  var h = "";
  // Equipment card auto-expands in edit mode.
  var card = document.getElementById("cardEq");
  if (editMode) card.classList.remove("collapsed");

  function unitOptions(processClass, instance) {
    var units = validUnitsForProcessClass(processClass),
      out =
        '<option value=""' +
        (!instance.unit ? " selected" : "") +
        ">— no fixed unit —</option>";
    // Preserve a loaded unit even when its configured model is unavailable, but
    // do not offer it as a selectable value for a newly edited instance.
    if (instance.unit && units.indexOf(instance.unit) < 0)
      out +=
        '<option value="' +
        esc(instance.unit) +
        '" selected disabled>' +
        esc(instance.unit) +
        " (not in current site model)</option>";
    units.forEach(function (unit) {
      out +=
        '<option value="' +
        esc(unit) +
        '"' +
        (unit === instance.unit ? " selected" : "") +
        ">" +
        esc(unit) +
        "</option>";
    });
    return out;
  }
  function transferInstances(transfer) {
    if (Array.isArray(transfer.instances) && transfer.instances.length)
      return transfer.instances;
    return [
      {
        name: transfer.name || "",
        source: transfer.source || "",
        dest: transfer.dest || "",
      },
    ];
  }

  h +=
    '<div style="margin-bottom:10px"><strong style="font-size:0.8em;color:#009F3C">Process classes</strong>';
  if (editMode)
    h +=
      '<button class="act-btn" onclick="addEqProc()" style="margin-left:6px">+ Process</button>';
  if (!d.equipment_requirements.length)
    h +=
      '<div style="color:#999;padding:7px 0">No process classes selected.</div>';
  for (var i = 0; i < d.equipment_requirements.length; i++) {
    var req = d.equipment_requirements[i],
      processClass = req.id || req.process || "",
      instances = requirementInstances(req);
    h +=
      '<div class="eq-process-card" style="margin:7px 0;padding:7px 8px;border:1px solid #dfe5df;border-radius:4px">';
    h +=
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><strong style="color:#009F3C">' +
      esc(processClass) +
      "</strong>";
    if (editMode)
      h +=
        '<span><button class="act-btn" onclick="addEqInstance(' +
        i +
        ')">+ Instance</button><button class="act-btn danger" onclick="removeEqProc(' +
        i +
        ')" style="margin-left:4px">✖ Process</button></span>';
    h += "</div>";
    if (!instances.length)
      h +=
        '<div style="color:#999;font-size:0.85em;margin-top:6px">No process instances.</div>';
    for (var j = 0; j < instances.length; j++) {
      var instance = instances[j],
        unitText = instance.unit || "No fixed unit",
        mode = instance.mode || "Auto";
      h +=
        '<div class="eq-instance-row" style="margin-top:6px;padding-top:6px;border-top:1px solid #edf0ed">';
      if (editMode) {
        h +=
          '<label style="font-size:0.76em;color:#666">Instance <input class="inline-edit" style="width:130px" value="' +
          esc(instance.name) +
          '" onchange="updEqInstanceName(' +
          i +
          "," +
          j +
          ',this.value)"></label> ';
        h +=
          '<label style="font-size:0.76em;color:#666">Unit <select class="inline-select" onchange="updEqInstanceUnit(' +
          i +
          "," +
          j +
          ',this.value)">' +
          unitOptions(processClass, instance) +
          "</select></label> ";
        h +=
          '<label style="font-size:0.76em;color:#666">Selection <select class="inline-select" onchange="updEqInstanceMode(' +
          i +
          "," +
          j +
          ',this.value)"><option value="Auto"' +
          (mode === "Auto" ? " selected" : "") +
          '>Auto</option><option value="Manual"' +
          (mode === "Manual" ? " selected" : "") +
          ">Manual</option></select></label>";
        if (processInstanceIsReferenced(instance.name)) {
          var alternatives = recipeProcessInstances().filter(
            function (candidate) {
              return (
                candidate.processClass === processClass &&
                candidate.name !== instance.name
              );
            },
          );
          if (alternatives.length) {
            h +=
              '<label style="font-size:0.76em;color:#666">Reassign to <select class="inline-select" onchange="reassignProcessInstance(' +
              i +
              "," +
              j +
              ',this.value);this.value=\'\'"><option value="">— select —</option>';
            alternatives.forEach(function (candidate) {
              h +=
                '<option value="' +
                esc(candidate.name) +
                '">' +
                esc(candidate.name) +
                "</option>";
            });
            h += "</select></label>";
          }
        }
        h +=
          '<button class="act-btn danger" onclick="removeEqInstance(' +
          i +
          "," +
          j +
          ')" style="margin-left:5px">✖</button>';
      } else {
        h +=
          '<span class="eq-chip">' +
          esc(instance.name) +
          '</span><span style="font-size:0.8em;color:#666">' +
          esc(mode) +
          " · " +
          esc(unitText) +
          "</span>";
      }
      h += "</div>";
    }
    h += "</div>";
  }
  h += "</div>";

  h +=
    '<div style="margin-top:11px"><strong style="font-size:0.8em;color:#36398E">Transfer instances</strong>';
  if (!d.equipment_transfers.length)
    h +=
      '<div style="color:#999;padding:7px 0">No transfer instances in the recipe.</div>';
  for (var ti = 0; ti < d.equipment_transfers.length; ti++) {
    var transfer = d.equipment_transfers[ti],
      instancesForTransfer = transferInstances(transfer);
    for (var tj = 0; tj < instancesForTransfer.length; tj++) {
      var transferInstance = instancesForTransfer[tj];
      h +=
        '<div class="eq-chip transfer" style="display:inline-block;margin-top:5px"><strong>' +
        esc(transferInstance.name || transfer.name) +
        "</strong> ";
      h +=
        '<span class="c-grey">(' +
        esc(transferInstance.source) +
        " → " +
        esc(transferInstance.dest) +
        ")</span>";
      h +=
        '<div style="font-size:0.78em;color:#667">class: ' +
        esc(transfer.source) +
        "→" +
        esc(transfer.dest) +
        "</div></div>";
    }
  }
  h += "</div>";
  document.getElementById("eqBody").innerHTML = h;
}

// ===== SINGLE PHASE RENDERER =====
function renderSinglePhase(ph, upProcess, uIdx, oIdx, pIdx) {
  var isX = ph.phase_type === "Transfer";
  var isA =
    (ph.phase_type || "").indexOf("Allocate") >= 0 ||
    (ph.phase_type || "").indexOf("Release") >= 0;
  var cls = "pf-ph";
  if (isA) cls += " alloc";
  else if (isX) cls += " xfer";
  var badge = "";
  if (isX) badge = '<span class="badge b-xfer">XFER</span>';
  else if (isA) {
    var allocBadge =
      ph.phase_type === "AllocateProcess"
        ? "ALLOC PROC"
        : ph.phase_type === "ReleaseProcess"
          ? "RELEASE PROC"
          : ph.phase_type === "AllocateTransfer"
            ? "ALLOC XFER"
            : "RELEASE XFER";
    badge = '<span class="badge b-alloc">' + allocBadge + "</span>";
  } else badge = '<span class="badge b-proc">PROC</span>';
  var h = '<div class="' + cls + '">';
  // Phase name + inline actions
  h +=
    '<div style="display:flex;justify-content:space-between;align-items:flex-start">';
  h += '<div class="pf-ph-name">' + ph.label + badge + "</div>";
  // Edit mode action bar
  h += '<div class="act-bar">';
  h +=
    '<button class="act-btn" onclick="movePh(' +
    uIdx +
    "," +
    oIdx +
    "," +
    pIdx +
    ',-1)" title="Move up">\u25B2</button>';
  h +=
    '<button class="act-btn" onclick="movePh(' +
    uIdx +
    "," +
    oIdx +
    "," +
    pIdx +
    ',1)" title="Move down">\u25BC</button>';
  h +=
    '<button class="act-btn danger" onclick="removePh(' +
    uIdx +
    "," +
    oIdx +
    "," +
    pIdx +
    ')" title="Delete">\u2716</button>';
  h += ddPh(uIdx, oIdx, pIdx);
  h += "</div></div>";
  if (ph.description)
    h +=
      '<div class="pf-ph-desc' +
      (editMode ? " editable" : "") +
      '"' +
      (editMode
        ? ' onclick="editPhDesc(' + uIdx + "," + oIdx + "," + pIdx + ',this)"'
        : "") +
      ">" +
      ph.description +
      "</div>";
  else if (editMode)
    h +=
      '<div class="pf-ph-desc editable" onclick="editPhDesc(' +
      uIdx +
      "," +
      oIdx +
      "," +
      pIdx +
      ',this)" style="color:#ccc">+ description</div>';
  if (ph.parent_instance && (isA || ph.parent_instance !== upProcess))
    h +=
      '<div class="pf-ph-parent">' +
      (isA ? "Target: " : "\u2197 ") +
      esc(ph.parent_instance) +
      "</div>";
  if (ph.params && ph.params.length > 0) {
    h += '<div class="pf-ph-params">';
    for (var i = 0; i < ph.params.length; i++) {
      var p = ph.params[i];
      var v = p.value || "\u2014";
      var isMat = p.param_type === "ProcessInput" || p.material_id;
      if (editMode) {
        h += '<div class="pf-param"><span class="pn">' + p.name + "</span> = ";
        if (isMat) {
          // Material autocomplete + qty input side by side
          var mn = matName(p.material_id) || p.material_id || "";
          h +=
            '<div class="mat-ac" style="display:inline-block;width:120px;vertical-align:middle"><input id="phMatAc_' +
            uIdx +
            "_" +
            oIdx +
            "_" +
            pIdx +
            "_" +
            i +
            '" value="' +
            esc(mn) +
            '" onfocus="openPhMatAc(' +
            uIdx +
            "," +
            oIdx +
            "," +
            pIdx +
            "," +
            i +
            ')" oninput="filterPhMatAc(' +
            uIdx +
            "," +
            oIdx +
            "," +
            pIdx +
            "," +
            i +
            ',this.value)" onblur="setTimeout(function(){closePhMatAc()},200)" autocomplete="off" placeholder="material..." style="width:100%;font-size:0.9em;padding:2px 4px"></div> ';
        }
        h +=
          '<input class="inline-edit" value="' +
          esc(p.value || "") +
          '" onchange="updPVal(' +
          uIdx +
          "," +
          oIdx +
          "," +
          pIdx +
          "," +
          i +
          ',this.value)" style="width:55px" placeholder="qty">';
        h += "</div>";
      } else {
        var ms = "";
        if (p.material_id) {
          var mn2 = matName(p.material_id);
          ms = '<span class="pm">[' + (mn2 || p.material_id) + "]</span> ";
        }
        h +=
          '<div class="pf-param"><span class="pn">' +
          p.name +
          "</span> = " +
          ms +
          '<span class="pv">' +
          v +
          "</span></div>";
      }
    }
    h += "</div>";
  }
  h += "</div>";
  return h;
}

// ===== RECIPE LIST VIEW =====
function renderRecipe() {
  if (!currentRecipeData) {
    document.getElementById("recipeView").innerHTML = "";
    return;
  }
  var d = currentRecipeData;
  var h = "";
  if (d.unit_procedures.length === 0) {
    if (editMode) {
      h +=
        '<div style="padding:24px;text-align:center;background:#fff;border:2px dashed #009F3C;border-radius:8px;margin:16px 0">';
      h +=
        '<p style="color:#36398E;font-size:1em;margin-bottom:12px">Recipe has no unit procedures</p>';
      h +=
        '<button class="act-btn" style="padding:8px 16px;font-size:0.9em" onclick="addFirstUP()">+ Add Unit Procedure</button>';
      h += "</div>";
    } else {
      h +=
        '<div style="padding:16px;text-align:center;color:#999;font-style:italic">No unit procedures defined</div>';
    }
    document.getElementById("recipeView").innerHTML = h;
    return;
  }
  for (var idx = 0; idx < d.unit_procedures.length; idx++) {
    var up = d.unit_procedures[idx];
    if (idx > 0) h += '<div class="seq-arrow">\u25BC</div>';
    var tph = 0;
    for (var oi = 0; oi < up.operations.length; oi++)
      tph += up.operations[oi].phases.length;
    h +=
      '<div class="pf-up open"><div class="pf-up-hdr" onclick="this.parentElement.classList.toggle(\'open\')">';
    h +=
      '<h4><span class="caret">\u25B6</span>' +
      (idx + 1) +
      ". " +
      (editMode
        ? '<span class="editable" onclick="event.stopPropagation();editUPName(' +
          idx +
          ',this)">' +
          esc(up.name) +
          "</span>"
        : esc(up.name)) +
      "</h4>";
    h += '<div style="display:flex;align-items:center;gap:8px">';
    h += '<span class="tag">' + up.process + "</span>";
    h +=
      '<span style="color:#c8c9e8;font-size:0.75em">' +
      up.operations.length +
      " ops / " +
      tph +
      " ph</span>";
    // UP action bar (edit mode)
    h += '<div class="act-bar" onclick="event.stopPropagation()">';
    h +=
      '<button class="act-btn" onclick="moveUP(' +
      idx +
      ',-1)" title="Move up">\u25B2</button>';
    h +=
      '<button class="act-btn" onclick="moveUP(' +
      idx +
      ',1)" title="Move down">\u25BC</button>';
    h += ddUP(idx);
    h += "</div>";
    h += "</div></div>";
    h += '<div class="pf-up-body">';
    for (var oi = 0; oi < up.operations.length; oi++) {
      var op = up.operations[oi];
      h +=
        '<div class="pf-op open"><div class="pf-op-hdr" onclick="this.parentElement.classList.toggle(\'open\')">';
      h +=
        '<div style="display:flex;align-items:center"><span class="caret">\u25B6</span><span class="pf-op-title">' +
        (editMode
          ? '<span class="editable" onclick="event.stopPropagation();editOpName(' +
            idx +
            "," +
            oi +
            ',this)">' +
            esc(op.name) +
            "</span>"
          : esc(op.name));
      var hasP = false,
        hasL = false,
        hasT = false;
      if (op.links) {
        for (var li = 0; li < op.links.length; li++) {
          if (op.links[li].type === "ParallelDivergent") hasP = true;
          if (op.links[li].type === "Other") hasL = true;
        }
      }
      if (op.transitions && Object.keys(op.transitions).length > 0) hasT = true;
      if (hasP) h += ' <span class="badge b-proc">PARALLEL</span>';
      if (hasL) h += ' <span class="badge b-xfer">LOOP</span>';
      if (hasT) h += ' <span class="badge b-alloc">TRANSITIONS</span>';
      h += "</span></div>";
      h += '<div style="display:flex;align-items:center;gap:6px">';
      h +=
        '<span style="color:#999;font-size:0.72em">' +
        op.phases.length +
        " ph</span>";
      // Op action bar
      h += '<div class="act-bar" onclick="event.stopPropagation()">';
      h +=
        '<button class="act-btn" onclick="moveOp(' +
        idx +
        "," +
        oi +
        ',-1)" title="Move up">\u25B2</button>';
      h +=
        '<button class="act-btn" onclick="moveOp(' +
        idx +
        "," +
        oi +
        ',1)" title="Move down">\u25BC</button>';
      h += ddOp(idx, oi);
      h += "</div>";
      h += "</div></div>";
      h += '<div class="pf-op-body">';
      // Empty operation - show placeholder with add buttons
      if (op.phases.length === 0) {
        if (editMode) {
          h +=
            '<div style="padding:12px 16px;text-align:center;color:#999;border:1px dashed #ddd;border-radius:4px;margin:4px 16px">';
          h += '<span style="font-size:0.85em">No phases</span><br>';
          h +=
            '<button class="act-btn" style="margin:6px 4px;padding:4px 10px" onclick="addPhaseToOp(' +
            idx +
            "," +
            oi +
            ",'Process',this)\">+ Phase</button>";
          h +=
            '<button class="act-btn" style="margin:6px 4px;padding:4px 10px" onclick="addPhaseToOp(' +
            idx +
            "," +
            oi +
            ",'Transfer',this)\">+ Transfer</button>";
          h += "</div>";
        } else {
          h +=
            '<div style="padding:8px 16px;color:#999;font-size:0.82em;font-style:italic">Empty operation</div>';
        }
      }
      // Dynamic branch rendering. Uses stable RecipeElement IDs (node_id) when available,
      // because AVEVA recipes may legitimately reuse the same visible phase name.
      var viewerTransAfter = {},
        viewerLoops = [];
      if (op.links) {
        for (var vli = 0; vli < op.links.length; vli++) {
          var vlk = op.links[vli];
          if (vlk.type === "Other" && vlk.from_type === "Transition")
            viewerLoops.push(vlk);
          if (vlk.to_type === "Transition")
            viewerTransAfter[vlk.from] = {
              cond: op.transitions ? op.transitions[vlk.to_id] || "" : "",
              tid: vlk.to_id,
            };
        }
      }
      var viewerRegions =
        typeof collectLaneBranchRegions === "function"
          ? collectLaneBranchRegions(op)
          : [];
      var viewerStarts = {},
        viewerMembers = {};
      for (var vri = 0; vri < viewerRegions.length; vri++) {
        var vr = viewerRegions[vri];
        for (var vti = 0; vti < vr.targets.length; vti++)
          viewerStarts[vr.targets[vti]] = vr;
        for (var vla = 0; vla < vr.lanes.length; vla++)
          for (var vpl = 0; vpl < vr.lanes[vla].phases.length; vpl++)
            viewerMembers[vr.lanes[vla].phases[vpl]] = vr;
      }
      var viewerRendered = [];
      for (var pi = 0; pi < op.phases.length; pi++) {
        var ph = op.phases[pi],
          viewerKey =
            typeof laneNodeKey === "function"
              ? laneNodeKey(ph)
              : ph.node_id || ph.label,
          viewerStart = viewerStarts[viewerKey],
          viewerMember = viewerMembers[viewerKey];
        if (viewerStart) {
          if (viewerRendered.indexOf(viewerStart) < 0) {
            h += '<div class="parallel-box dynamic-branch-box">';
            for (var vbi = 0; vbi < viewerStart.lanes.length; vbi++) {
              var vbranch = viewerStart.lanes[vbi];
              h +=
                '<div class="branch"><div class="branch-label">Branch ' +
                vbranch.label +
                "</div>";
              for (var vpi = 0; vpi < op.phases.length; vpi++) {
                var vphase = op.phases[vpi],
                  vkey =
                    typeof laneNodeKey === "function"
                      ? laneNodeKey(vphase)
                      : vphase.node_id || vphase.label;
                if (vbranch.phases.indexOf(vkey) >= 0)
                  h += renderSinglePhase(vphase, up.process, idx, oi, vpi);
              }
              h += "</div>";
            }
            h += "</div>";
            viewerRendered.push(viewerStart);
          }
          continue;
        }
        if (viewerMember) continue;
        h += renderSinglePhase(ph, up.process, idx, oi, pi);
        if (viewerTransAfter[ph.label]) {
          var vta = viewerTransAfter[ph.label],
            vcond = vta.cond,
            vtid = vta.tid,
            visLoop = viewerLoops.some(function (lb) {
              return lb.from_id === vtid;
            });
          if (editMode) {
            var vinput =
              '<input class="inline-edit" value="' +
              esc(vcond) +
              '" onchange="updTransCond(' +
              idx +
              "," +
              oi +
              ",'" +
              vtid +
              '\',this.value)" onclick="event.stopPropagation()" style="width:250px;margin:2px 0">';
            h +=
              '<div class="flow-ann ' +
              (visLoop ? "loop" : "trans") +
              '">' +
              (visLoop ? "↺ Loop: " : "◆ Transition: ") +
              vinput +
              "</div>";
          } else
            h +=
              '<div class="flow-ann ' +
              (visLoop ? "loop" : "trans") +
              '">◆ ' +
              esc(vcond) +
              (visLoop ? "<br>↺ YES=loop | NO=continue" : "") +
              "</div>";
        }
      }
      h += "</div></div>";
    }
    h += "</div></div>";
  }
  document.getElementById("recipeView").innerHTML = h;
}

// ===== EDIT ACTIONS =====

/* ==========================================================================
 * Former file: js/editor.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// editor.js - Edit mode controls, dropdown menus, structural editing operations
// Handles: ⋮ menus, move/delete/insert for UPs/Ops/Phases, inline param editing

// ===== DROPDOWN MANAGEMENT =====
function closeDropdowns() {
  document.querySelectorAll(".dropdown.show").forEach(function (d) {
    d.classList.remove("show");
    if (d._menuOwner) d._menuOwner.appendChild(d);
  });
  activeDropdown = null;
}
function toggleDD(el, e) {
  e.stopPropagation();
  var dd = el.querySelector(".dropdown");
  if (!dd) return;
  var wasOpen = dd.classList.contains("show");
  closeDropdowns();
  if (!wasOpen) {
    // A fixed child can still be trapped by a transformed/contained ancestor.
    // Portal the open menu to body, then restore it when it closes.
    dd._menuOwner = el;
    document.body.appendChild(dd);
    dd.classList.add("show");
    activeDropdown = dd;
    // Measure the actual menu and position within the usable visual viewport.
    // When near the bottom of the app, open upward rather than behind the
    // browser/OS task bar; long menus remain wholly visible.
    window.requestAnimationFrame(function () {
      if (!dd.classList.contains("show")) return;
      var viewport = window.visualViewport || {
        width: window.innerWidth,
        height: window.innerHeight,
        offsetLeft: 0,
        offsetTop: 0,
      };
      var pad = 8,
        rect = el.getBoundingClientRect(),
        width = dd.offsetWidth || 220,
        height = dd.offsetHeight || 240;
      var topEdge = viewport.offsetTop + pad,
        bottomEdge = viewport.offsetTop + viewport.height - pad;
      var left = Math.max(
        viewport.offsetLeft + pad,
        Math.min(rect.left, viewport.offsetLeft + viewport.width - width - pad),
      );
      var below = bottomEdge - rect.bottom - 4,
        above = rect.top - topEdge - 4;
      var top =
        below >= height || below >= above
          ? Math.min(bottomEdge - height, rect.bottom + 4)
          : Math.max(topEdge, rect.top - height - 4);
      dd.style.left = left + "px";
      dd.style.top = top + "px";
    });
  }
}

function ddUP(u) {
  return (
    '<div class="act-more" onclick="toggleDD(this,event)"><button class="act-more-btn">\u22EE</button><div class="dropdown">' +
    '<div class="dd-label">Unit Procedure</div>' +
    '<div class="dd-item" onclick="addUPBefore(' +
    u +
    ')">Insert UP Before</div>' +
    '<div class="dd-item" onclick="addUPAfter(' +
    u +
    ')">Insert UP After</div>' +
    '<div class="dd-sep"></div>' +
    '<div class="dd-item" onclick="addOp(' +
    u +
    ')">+ Add Operation</div>' +
    '<div class="dd-sep"></div>' +
    '<div class="dd-item danger" onclick="removeUP(' +
    u +
    ')">\u2716 Delete UP</div>' +
    "</div></div>"
  );
}

function ddOp(u, o) {
  return (
    '<div class="act-more" onclick="toggleDD(this,event)"><button class="act-more-btn">\u22EE</button><div class="dropdown">' +
    '<div class="dd-label">Operation</div>' +
    '<div class="dd-item" onclick="addOpBefore(' +
    u +
    "," +
    o +
    ')">Insert Op Before</div>' +
    '<div class="dd-item" onclick="addOpAfter2(' +
    u +
    "," +
    o +
    ')">Insert Op After</div>' +
    '<div class="dd-sep"></div>' +
    '<div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ",'Process',this)\">+ Add Phase</div>" +
    '<div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ",'Transfer',this)\">+ Insert Transfer after this node</div>" +
    '<div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ",'AllocateProcess',this)\">+ Insert Allocate Process after this node</div>" +
    '<div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ",'ReleaseProcess',this)\">+ Insert Release Process after this node</div>" +
    '<div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ",'AllocateTransfer',this)\">+ Insert Allocate Transfer after this node</div>" +
    '<div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ",'ReleaseTransfer',this)\">+ Insert Release Transfer after this node</div>" +
    (BRANCH_DISPLAY_ONLY
      ? ""
      : '<div class="dd-item" onclick="addBranchToOp(' +
        u +
        "," +
        o +
        ')">\u2234 Add Branch</div>') +
    '<div class="dd-item" onclick="addTransToOp(' +
    u +
    "," +
    o +
    ')">\u25C6 Add Transition</div>' +
    '<div class="dd-item" onclick="addLoopToOp(' +
    u +
    "," +
    o +
    ')">\u21BA Add Loop</div>' +
    '<div class="dd-sep"></div>' +
    '<div class="dd-item danger" onclick="removeOp(' +
    u +
    "," +
    o +
    ')">\u2716 Delete Op</div>' +
    "</div></div>"
  );
}

// Common menu for a selectable RecipeElement when its actions use the generic
// node-insertion primitive. The popup is fixed-positioned by toggleDD(), so it
// is not clipped by a nested lane's horizontal scroll container.
function ddNode(u, o, nodeId, label) {
  return (
    '<div class="act-more node-more" onclick="toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for node ' +
    nodeId +
    '" title="Actions for ' +
    (label || "node") +
    '">⋮</button><div class="dropdown">' +
    '<div class="dd-label">' +
    (label || "Node") +
    " · #" +
    nodeId +
    "</div>" +
    '<div class="dd-item" onclick="startNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    nodeId +
    "','Process')\">Insert Process Phase after this node</div>" +
    '<div class="dd-item" onclick="startNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    nodeId +
    "','Transfer')\">Insert Transfer after this node</div>" +
    '<div class="dd-item" onclick="startNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    nodeId +
    "','AllocateProcess')\">Insert Allocate Process after this node</div>" +
    '<div class="dd-item" onclick="startNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    nodeId +
    "','ReleaseProcess')\">Insert Release Process after this node</div>" +
    '<div class="dd-item" onclick="startNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    nodeId +
    "','AllocateTransfer')\">Insert Allocate Transfer after this node</div>" +
    '<div class="dd-item" onclick="startNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    nodeId +
    "','ReleaseTransfer')\">Insert Release Transfer after this node</div>" +
    '<div class="dd-sep"></div>' +
    '<div class="dd-item" onclick="addTransitionAfterNode(' +
    u +
    "," +
    o +
    ",'" +
    nodeId +
    "')\">◆ Insert Transition after this node</div>" +
    '<div class="dd-item" onclick="showLoopAfterNodeDialog(' +
    u +
    "," +
    o +
    ",'" +
    nodeId +
    "')\">↺ Create loop after this node</div>" +
    '<div class="dd-item" onclick="showBranchAfterNodeDialog(' +
    u +
    "," +
    o +
    ",'" +
    nodeId +
    "')\">⑂ Create branch after this node</div>" +
    '<div class="dd-sep"></div><div class="dd-item danger" onclick="requestGraphDeleteNode(' +
    u +
    "," +
    o +
    ",'" +
    nodeId +
    "','this node')\">✖ Delete</div>" +
    "</div></div>"
  );
}

function ddPh(u, o, p) {
  var branchItem = "";
  if (currentRecipeData) {
    var up = currentRecipeData.unit_procedures[u],
      op = up && up.operations[o],
      ph = op && op.phases[p];
    var nodeId = ph && (ph._reId || ph.node_id),
      eligible =
        op &&
        nodeId &&
        typeof branchAfterNodeEligibility === "function" &&
        branchAfterNodeEligibility(op, String(nodeId)).ok;
    if (eligible)
      branchItem =
        '<div class="dd-sep"></div><div class="dd-item" onclick="showBranchAfterNodeDialog(' +
        u +
        "," +
        o +
        ",'" +
        String(nodeId) +
        "')\">⑂ Create branch after this node</div>";
  }
  return (
    '<div class="act-more" onclick="toggleDD(this,event)"><button class="act-more-btn">⋮</button><div class="dropdown">' +
    '<div class="dd-label">Phase</div>' +
    '<div class="dd-item" onclick="addPhaseAfter(' +
    u +
    "," +
    o +
    "," +
    p +
    ",'Process',this)\">Insert Phase After</div>" +
    '<div class="dd-item" onclick="addPhaseAfter(' +
    u +
    "," +
    o +
    "," +
    p +
    ",'Transfer',this)\">Insert Transfer After</div>" +
    '<div class="dd-item" onclick="addPhaseAfter(' +
    u +
    "," +
    o +
    "," +
    p +
    ",'AllocateProcess',this)\">Insert Allocate Process After</div>" +
    '<div class="dd-item" onclick="addPhaseAfter(' +
    u +
    "," +
    o +
    "," +
    p +
    ",'ReleaseProcess',this)\">Insert Release Process After</div>" +
    '<div class="dd-item" onclick="addPhaseAfter(' +
    u +
    "," +
    o +
    "," +
    p +
    ",'AllocateTransfer',this)\">Insert Allocate Transfer After</div>" +
    '<div class="dd-item" onclick="addPhaseAfter(' +
    u +
    "," +
    o +
    "," +
    p +
    ",'ReleaseTransfer',this)\">Insert Release Transfer After</div>" +
    '<div class="dd-sep"></div>' +
    '<div class="dd-item" onclick="addTransitionAfterNode(' +
    u +
    "," +
    o +
    ",'" +
    String(nodeId) +
    "')\">◆ Insert Transition after this node</div>" +
    '<div class="dd-item" onclick="showLoopAfterNodeDialog(' +
    u +
    "," +
    o +
    ",'" +
    String(nodeId) +
    "')\">↺ Create loop after this node</div>" +
    '<div class="dd-item" onclick="showBranchAfterNodeDialog(' +
    u +
    "," +
    o +
    ",'" +
    String(nodeId) +
    "')\">⑂ Create branch after this node</div>" +
    '<div class="dd-sep"></div>' +
    '<div class="dd-item danger" onclick="requestGraphDeletePhase(' +
    u +
    "," +
    o +
    "," +
    p +
    ')">✖ Delete Phase</div>' +
    "</div></div>"
  );
}
function removeTransition(u, o, tid) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  delete op.transitions[tid];
  op.links = op.links.filter(function (l) {
    return l.to_id !== tid && l.from_id !== tid;
  });
  renderAll();
}

// Equipment requirements hold process classes and their named process instances.
// Unit Procedures select a process instance; MODEL lookup is resolved through its class.
function markRecipeCollectionEdit() {
  if (currentRecipeData) currentRecipeData._recipeCollectionEdit = true;
}
function newOperation(name) {
  var beginId = allocateRecipeElementId(),
    endId = allocateRecipeElementId();
  return {
    name: name || "New Op",
    phases: [],
    links: [
      {
        type: "ControlLink",
        from: "Begin",
        from_id: "",
        from_re_id: beginId,
        from_type: "Step",
        to: "End",
        to_id: "",
        to_re_id: endId,
        to_type: "Step",
      },
    ],
    transitions: {},
    _beginReId: beginId,
    _endReId: endId,
  };
}
function newLaneUP() {
  return {
    name: "New UP",
    process: defaultUPProcess(),
    operations: [newOperation("Operation 1")],
  };
}
function addUPBefore(u) {
  if (!recipeProcessInstances().length) {
    alert(
      "Add a process instance in Equipment Requirements before adding a Unit Procedure.",
    );
    return;
  }
  currentRecipeData._structuralEdit = true;
  currentRecipeData.unit_procedures.splice(u, 0, newLaneUP());
  laneSelectedUP = u;
  laneSelectedOp = 0;
  renderAll();
}
function updUPProcess(u, instanceName) {
  if (!processClassForInstance(instanceName)) return;
  var up = currentRecipeData.unit_procedures[u],
    oldInstance = up.process;
  if (oldInstance === instanceName) return;
  var existingPhases = [];
  (up.operations || []).forEach(function (op) {
    (op.phases || []).forEach(function (phase) {
      if (phase.parent_instance === oldInstance) existingPhases.push(phase);
    });
  });
  if (existingPhases.length) {
    alert(
      "This Unit Procedure already contains phases for " +
        oldInstance +
        ". Reassigning it would leave those phase bindings unchanged, so create or select the instance before adding phases.",
    );
    renderAll();
    return;
  }
  up.process = instanceName;
  currentRecipeData._structuralEdit = true;
  renderAll();
}
function updTransCond(u, o, tid, val) {
  currentRecipeData.unit_procedures[u].operations[o].transitions[tid] = val;
  currentRecipeData._structuralEdit = true;
}
function transitionMeta(op, tid) {
  if (!op.transition_meta) op.transition_meta = {};
  if (!op.transition_meta[tid])
    op.transition_meta[tid] = { name: tid, description: "" };
  return op.transition_meta[tid];
}
function allGraphNodeIds(recipe) {
  var used = {};
  ((recipe && recipe.unit_procedures) || []).forEach(function (up) {
    (up.operations || []).forEach(function (op) {
      [op._beginReId, op._endReId]
        .concat(
          (op.phases || []).map(function (p) {
            return p._reId || p.node_id;
          }),
        )
        .concat(Object.keys(op.transitions || {}))
        .forEach(function (id) {
          if (id !== undefined && id !== null && String(id) !== "")
            used[String(id)] = true;
        });
    });
  });
  return used;
}
function nextFreeGraphNodeId(recipe) {
  var used = allGraphNodeIds(recipe),
    n = 1;
  while (used[String(n)]) n++;
  return String(n);
}
function renameTransitionId(u, o, oldId, value) {
  var op = currentRecipeData.unit_procedures[u].operations[o],
    newId = String(value || "").trim(),
    input = typeof event !== "undefined" && event.target ? event.target : null;
  if (!newId || newId === oldId) return;
  if (!/^\d+$/.test(newId) || allGraphNodeIds(currentRecipeData)[newId]) {
    var suggestion = nextFreeGraphNodeId(currentRecipeData);
    alert(
      "Transition Label / node ID must be a unique numeric value. Suggested next free ID: " +
        suggestion,
    );
    if (input) input.value = oldId;
    return;
  }
  op.transitions[newId] = op.transitions[oldId];
  delete op.transitions[oldId];
  if (op.transition_meta) {
    op.transition_meta[newId] = op.transition_meta[oldId] || {
      name: oldId,
      description: "",
    };
    delete op.transition_meta[oldId];
  }
  if (op.transition_meta[newId].name === oldId)
    op.transition_meta[newId].name = newId;
  (op.links || []).forEach(function (link) {
    if (link.from_type === "Transition" && link.from_id === oldId) {
      link.from_id = newId;
      link.from = "TRANS:" + newId;
    }
    if (link.to_type === "Transition" && link.to_id === oldId) {
      link.to_id = newId;
      link.to = "TRANS:" + newId;
    }
  });
  currentRecipeData._structuralEdit = true;
  renderAll();
}
function updTransitionMeta(u, o, tid, key, value) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  transitionMeta(op, tid)[key] = value;
  currentRecipeData._structuralEdit = true;
}
function addTransToOp(u, o) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  if (!op.transitions) op.transitions = {};
  if (!op.links) op.links = [];
  var tid = nextTransitionId(op);
  op.transitions[tid] = 'Ask( "Condition?" )';
  transitionMeta(op, tid);
  var lastPh = op.phases.length ? op.phases[op.phases.length - 1] : null;
  if (lastPh) {
    op.links.push({
      type: "ControlLink",
      from: lastPh.label,
      from_id: "",
      from_type: "Step",
      to: "TRANS:" + tid,
      to_id: tid,
      to_type: "Transition",
    });
  }
  renderAll();
}
function addTransAfterPh(u, o, p) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  if (!op.transitions) op.transitions = {};
  if (!op.links) op.links = [];
  var tid = nextTransitionId(op);
  var ph = op.phases[p];
  op.transitions[tid] = 'Ask( "Condition?" )';
  transitionMeta(op, tid);
  op.links.push({
    type: "ControlLink",
    from: ph.label,
    from_id: "",
    from_type: "Step",
    to: "TRANS:" + tid,
    to_id: tid,
    to_type: "Transition",
  });
  renderAll();
}
function addFirstUP() {
  if (!recipeProcessInstances().length) {
    alert(
      "Add a process instance in Equipment Requirements before adding a Unit Procedure.",
    );
    return;
  }
  currentRecipeData._structuralEdit = true;
  currentRecipeData.unit_procedures.push(newLaneUP());
  laneSelectedUP = currentRecipeData.unit_procedures.length - 1;
  laneSelectedOp = 0;
  renderAll();
}
function addUPAfter(u) {
  if (!recipeProcessInstances().length) {
    alert(
      "Add a process instance in Equipment Requirements before adding a Unit Procedure.",
    );
    return;
  }
  currentRecipeData._structuralEdit = true;
  currentRecipeData.unit_procedures.splice(u + 1, 0, newLaneUP());
  laneSelectedUP = u + 1;
  laneSelectedOp = 0;
  renderAll();
}
function removeUP(u) {
  currentRecipeData._structuralEdit = true;
  if (confirm("Delete this unit procedure?")) {
    currentRecipeData.unit_procedures.splice(u, 1);
    renderAll();
  }
}
function moveUP(u, dir) {
  var arr = currentRecipeData.unit_procedures;
  var ni = u + dir;
  if (ni < 0 || ni >= arr.length) return;
  var tmp = arr[u];
  arr[u] = arr[ni];
  arr[ni] = tmp;
  renderAll();
}
function addOp(u) {
  currentRecipeData._structuralEdit = true;
  currentRecipeData.unit_procedures[u].operations.push(newOperation());
  renderAll();
}
function addOpBefore(u, o) {
  currentRecipeData._structuralEdit = true;
  currentRecipeData.unit_procedures[u].operations.splice(o, 0, newOperation());
  renderAll();
}
function addOpAfter2(u, o) {
  currentRecipeData._structuralEdit = true;
  currentRecipeData.unit_procedures[u].operations.splice(
    o + 1,
    0,
    newOperation(),
  );
  renderAll();
}
function removeOp(u, o) {
  currentRecipeData._structuralEdit = true;
  currentRecipeData.unit_procedures[u].operations.splice(o, 1);
  renderAll();
}
function moveOp(u, o, dir) {
  var arr = currentRecipeData.unit_procedures[u].operations;
  var ni = o + dir;
  if (ni < 0 || ni >= arr.length) return;
  var tmp = arr[o];
  arr[o] = arr[ni];
  arr[ni] = tmp;
  renderAll();
}
function addPhaseToOp(u, o, type, anchorEl) {
  showPhasePicker(u, o, -1, type, "", anchorEl);
}
function addPhaseAfter(u, o, p, type, anchorEl) {
  var op =
      currentRecipeData &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations[o],
    phase = op && op.phases && op.phases[p],
    nodeId = phase && (phase._reId || phase.node_id);
  if (!nodeId || typeof showPhasePicker !== "function") return;
  /* All selected-node insertions, including ordinary cards, use the canonical graph primitive. This supports ControlLink, forks and joins without a separate label/index path. */ showPhasePicker(
    u,
    o,
    -1,
    type,
    String(nodeId),
    anchorEl || null,
  );
}
function removePh(u, o, p) {
  requestGraphDeletePhase(u, o, p);
}
function movePh(u, o, p, dir) {
  var operation =
    currentRecipeData &&
    currentRecipeData.unit_procedures[u] &&
    currentRecipeData.unit_procedures[u].operations[o];
  var phase = operation && operation.phases && operation.phases[p];
  var sourceRecipeElementId = phase && (phase._reId || phase.node_id);
  if (!sourceRecipeElementId || typeof requestPhaseMove !== "function") return;
  requestPhaseMove({
    unitProcedureIndex: u,
    operationIndex: o,
    sourceRecipeElementId: String(sourceRecipeElementId),
    destination: { type: "adjacent", direction: dir },
  });
}
/* Removed shadowed legacy declaration: addBranchToOp. Retained final declaration below. */
/* Removed shadowed legacy declaration: addPhaseToEndOfBranch. Retained final declaration below. */
function addLoopToOp(u, o) {
  currentRecipeData._structuralEdit = true;
  var op = currentRecipeData.unit_procedures[u].operations[o];
  if (!op.transitions) op.transitions = {};
  if (!op.links) op.links = [];
  var tid = nextTransitionId(op);
  op.transitions[tid] = 'AskDoneBy( "Repeat?" )';
  var lastPh = op.phases.length ? op.phases[op.phases.length - 1] : null;
  if (lastPh) {
    op.links.push({
      type: "ControlLink",
      from: lastPh.label,
      from_id: "",
      from_type: "Step",
      to: "TRANS:" + tid,
      to_id: tid,
      to_type: "Transition",
    });
    op.links.push({
      type: "Other",
      from: "TRANS:" + tid,
      from_id: tid,
      from_type: "Transition",
      to: lastPh.label,
      to_id: "",
      to_type: "Step",
    });
  }
  renderAll();
}
function addLoopAfterPh(u, o, p) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  if (!op.transitions) op.transitions = {};
  if (!op.links) op.links = [];
  var tid = nextTransitionId(op);
  var ph = op.phases[p];
  op.transitions[tid] = 'AskDoneBy( "Repeat?" )';
  transitionMeta(op, tid);
  op.links.push({
    type: "ControlLink",
    from: ph.label,
    from_id: "",
    from_type: "Step",
    to: "TRANS:" + tid,
    to_id: tid,
    to_type: "Transition",
  });
  op.links.push({
    type: "Other",
    from: "TRANS:" + tid,
    from_id: tid,
    from_type: "Transition",
    to: ph.label,
    to_id: "",
    to_type: "Step",
  });
  renderAll();
}

// === Equipment process class and instance edit functions ===
function availableProcessClasses() {
  var existing = recipeProcessClasses();
  return Object.keys(MODEL.processes || {})
    .sort()
    .filter(function (processClass) {
      return existing.indexOf(processClass) < 0;
    });
}
function addEqProc() {
  var available = availableProcessClasses();
  if (!available.length) {
    alert("All process classes in the loaded site model are already present.");
    return;
  }
  showProcessClassPicker(available);
}
function addSelectedEqProc(processClass) {
  if (
    typeof processClassPickerOpen !== "undefined" &&
    (!processClassPickerOpen ||
      processClassPickerChoices.indexOf(processClass) < 0)
  )
    return;
  if (availableProcessClasses().indexOf(processClass) < 0) return;
  currentRecipeData.equipment_requirements.push({
    id: processClass,
    instances: [
      { name: nextProcessInstanceName(processClass), unit: "", mode: "Auto" },
    ],
  });
  // Restore Stage 4C transfer inheritance while retaining Stage 5 endpoint validity.
  if (typeof seedInheritedTransfersForProcessClasses === "function")
    seedInheritedTransfersForProcessClasses();
  markRecipeCollectionEdit();
  closeProcessClassPicker();
  renderAll();
}
function removeEqProc(i) {
  var removed = currentRecipeData.equipment_requirements[i];
  if (!removed) return;
  var processClass = removed.id || removed.process || "";
  if (processClassIsReferenced(processClass)) {
    alert(
      "Cannot delete " +
        processClass +
        " because one of its instances or a global transfer still references it. Reassign or remove those references first.",
    );
    return;
  }
  currentRecipeData.equipment_requirements.splice(i, 1);
  markRecipeCollectionEdit();
  renderAll();
}
function addEqInstance(i) {
  var req = currentRecipeData.equipment_requirements[i];
  if (!req) return;
  if (!Array.isArray(req.instances)) req.instances = requirementInstances(req);
  var processClass = req.id || req.process || "";
  req.instances.push({
    name: nextProcessInstanceName(processClass),
    unit: "",
    mode: "Auto",
  });
  markRecipeCollectionEdit();
  renderAll();
}
function updEqInstanceName(i, j, value) {
  var req = currentRecipeData.equipment_requirements[i],
    instance = req && requirementInstances(req)[j],
    name = (value || "").trim();
  if (!instance) return;
  if (!name) {
    alert("A process-instance name is required.");
    renderAll();
    return;
  }
  if (name === instance.name) return;
  if (
    recipeProcessInstances().some(function (item) {
      return item.name === name;
    })
  ) {
    alert("Process-instance names must be unique across the recipe.");
    renderAll();
    return;
  }
  if (processInstanceIsReferenced(instance.name)) {
    alert(
      "Cannot rename " +
        instance.name +
        " because it is referenced by a Unit Procedure, phase, parameter, or transfer instance.",
    );
    renderAll();
    return;
  }
  instance.name = name;
  markRecipeCollectionEdit();
  renderAll();
}
function updEqInstanceUnit(i, j, unit) {
  var req = currentRecipeData.equipment_requirements[i],
    instance = req && requirementInstances(req)[j],
    processClass = req && (req.id || req.process || "");
  if (!instance) return;
  if (!isValidUnitForProcessClass(processClass, unit)) {
    alert(
      "Unit " + unit + " is not valid for process class " + processClass + ".",
    );
    renderAll();
    return;
  }
  instance.unit = unit || "";
  markRecipeCollectionEdit();
  renderAll();
}
function updEqInstanceMode(i, j, mode) {
  var instance =
    currentRecipeData.equipment_requirements[i] &&
    requirementInstances(currentRecipeData.equipment_requirements[i])[j];
  if (!instance) return;
  if (["Auto", "Manual"].indexOf(mode) < 0) {
    alert(
      "Only Auto and Manual selection modes are supported by the reference XML.",
    );
    renderAll();
    return;
  }
  instance.mode = mode;
  markRecipeCollectionEdit();
  renderAll();
}
function removeEqInstance(i, j) {
  var req = currentRecipeData.equipment_requirements[i],
    instance = req && requirementInstances(req)[j];
  if (!req || !instance) return;
  if (req.instances.length <= 1) {
    alert(
      "A process class must retain at least one process instance. Delete the process class instead if it is no longer required.",
    );
    return;
  }
  if (processInstanceIsReferenced(instance.name)) {
    alert(
      "Cannot delete " +
        instance.name +
        " because it is referenced by a Unit Procedure, phase, parameter, or transfer instance.",
    );
    return;
  }
  req.instances.splice(j, 1);
  markRecipeCollectionEdit();
  renderAll();
}

// Reassign a used process instance only to another instance in the same class.
// This updates all structured recipe references; linked Formula ParentInstance
// entries are patched during structural save using their preserved _fid values.
function reassignProcessInstance(i, j, newName) {
  var req = currentRecipeData.equipment_requirements[i],
    instance = req && requirementInstances(req)[j],
    oldName = instance && instance.name;
  if (!instance || !newName || newName === oldName) return;
  var replacement = processInstanceByName(newName);
  if (
    !replacement ||
    replacement.processClass !== (req.id || req.process || "")
  ) {
    alert("Choose a replacement instance from the same process class.");
    renderAll();
    return;
  }
  var summary = { ups: 0, phases: 0, transfers: 0 };
  (currentRecipeData.unit_procedures || []).forEach(function (up) {
    if (up.process === oldName) {
      up.process = newName;
      summary.ups++;
    }
    (up.operations || []).forEach(function (op) {
      (op.phases || []).forEach(function (phase) {
        if (phase.parent_instance === oldName) {
          phase.parent_instance = newName;
          summary.phases++;
        }
      });
    });
  });
  (currentRecipeData.equipment_transfers || []).forEach(function (transfer) {
    (transfer.instances || []).forEach(function (transferInstance) {
      if (transferInstance.source === oldName) {
        transferInstance.source = newName;
        summary.transfers++;
      }
      if (transferInstance.dest === oldName) {
        transferInstance.dest = newName;
        summary.transfers++;
      }
    });
  });
  if (
    !confirm(
      "Reassign " +
        oldName +
        " to " +
        newName +
        "? This updates " +
        summary.ups +
        " Unit Procedure(s), " +
        summary.phases +
        " phase binding(s), and " +
        summary.transfers +
        " transfer endpoint(s).",
    )
  ) {
    renderAll();
    return;
  }
  // Formula records can include bindings outside the simplified phase parameter map.
  // Preserve the confirmed rename mapping so structural save updates all of them.
  if (!currentRecipeData._instance_reassignments)
    currentRecipeData._instance_reassignments = {};
  currentRecipeData._instance_reassignments[oldName] = newName;
  currentRecipeData._raw_instance_references = (
    currentRecipeData._raw_instance_references || []
  ).filter(function (name) {
    return name !== oldName;
  });
  markRecipeCollectionEdit();
  currentRecipeData._structuralEdit = true;
  renderAll();
}

// Transfer instance endpoints select only instances belonging to the transfer's class route.
function instancesForTransferEndpoint(transfer, side) {
  var processClass = side === "source" ? transfer.source : transfer.dest;
  return recipeProcessInstances().filter(function (instance) {
    return instance.processClass === processClass;
  });
}
function transferEndpointIsReferenced(instanceName) {
  return (currentRecipeData.unit_procedures || []).some(function (up) {
    return (up.operations || []).some(function (op) {
      return (op.phases || []).some(function (phase) {
        return (
          phase.parent_instance === instanceName &&
          (phase.phase_type === "Transfer" ||
            phase.phase_type === "AllocateTransfer" ||
            phase.phase_type === "ReleaseTransfer")
        );
      });
    });
  });
}
function updTransferInstanceEndpoint(
  transferIndex,
  instanceIndex,
  side,
  value,
) {
  var transfer = currentRecipeData.equipment_transfers[transferIndex],
    instance =
      transfer && transfer.instances && transfer.instances[instanceIndex];
  if (!transfer || !instance) return;
  var valid = instancesForTransferEndpoint(transfer, side).some(
    function (candidate) {
      return candidate.name === value;
    },
  );
  if (!valid) {
    alert(
      "That " +
        side +
        " instance is not valid for transfer class " +
        transfer.name +
        ".",
    );
    renderAll();
    return;
  }
  if (instance[side] === value) return;
  if (transferEndpointIsReferenced(instance.name)) {
    alert(
      "Cannot change the selected route for " +
        instance.name +
        " because a Transfer, Allocate Transfer, or Release Transfer phase references it. Reassign those phases first.",
    );
    renderAll();
    return;
  }
  instance[side] = value;
  markRecipeCollectionEdit();
  renderAll();
}

// ===== INLINE PARAMETER & DESCRIPTION EDITING =====
function updPVal(u, o, p, pi, val) {
  currentRecipeData.unit_procedures[u].operations[o].phases[p].params[
    pi
  ].value = val;
}

// Phase-level material autocomplete
var phMatAcListEl = null;
var phMatAcCtx = null; // {u,o,p,pi}

function openPhMatAc(u, o, p, pi) {
  phMatAcCtx = { u: u, o: o, p: p, pi: pi };
  var inp = document.getElementById(
    "phMatAc_" + u + "_" + o + "_" + p + "_" + pi,
  );
  filterPhMatAc(u, o, p, pi, inp.value);
}

function closePhMatAc() {
  if (phMatAcListEl) {
    phMatAcListEl.remove();
    phMatAcListEl = null;
  }
  phMatAcCtx = null;
}

function filterPhMatAc(u, o, p, pi, query) {
  if (phMatAcListEl) {
    phMatAcListEl.remove();
    phMatAcListEl = null;
  }
  var q = query.toLowerCase().trim();
  var results = [];
  if (q.length === 0) {
    // Show materials already in the recipe BOM first, then others
    var bomIds = currentRecipeData.materials.map(function (m) {
      return m.material_id;
    });
    for (var i = 0; i < MAT_LIST.length; i++) {
      if (bomIds.indexOf(MAT_LIST[i].id) >= 0) results.push(MAT_LIST[i]);
      if (results.length >= 20) break;
    }
  } else {
    for (var i = 0; i < MAT_LIST.length; i++) {
      var m = MAT_LIST[i];
      if (
        m.id.toLowerCase().indexOf(q) >= 0 ||
        m.name.toLowerCase().indexOf(q) >= 0 ||
        m.code.toLowerCase().indexOf(q) >= 0
      ) {
        results.push(m);
        if (results.length >= 20) break;
      }
    }
  }

  var list = document.createElement("div");
  list.className = "mat-ac-list show";
  list.innerHTML =
    '<div class="mat-ac-hdr"><span>ID</span><span>Name</span><span>Code</span></div>';
  if (!results.length) {
    list.innerHTML += '<div class="mat-ac-empty">No matches</div>';
  } else {
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      list.innerHTML +=
        '<div class="mat-ac-item" onmousedown="pickPhMat(' +
        u +
        "," +
        o +
        "," +
        p +
        "," +
        pi +
        ",'" +
        esc(r.id) +
        '\')"><span class="ac-id">' +
        highlightMatch(r.id, q) +
        '</span><span class="ac-name">' +
        highlightMatch(r.name, q) +
        '</span><span class="ac-code">' +
        highlightMatch(r.code, q) +
        "</span></div>";
    }
  }

  var inp = document.getElementById(
    "phMatAc_" + u + "_" + o + "_" + p + "_" + pi,
  );
  var rect = inp.getBoundingClientRect();
  list.style.top = rect.bottom + 2 + "px";
  list.style.left = rect.left + "px";
  list.style.minWidth = "320px";
  document.body.appendChild(list);
  phMatAcListEl = list;
}

function pickPhMat(u, o, p, pi, matId) {
  currentRecipeData.unit_procedures[u].operations[o].phases[p].params[
    pi
  ].material_id = matId;
  currentRecipeData.unit_procedures[u].operations[o].phases[p].params[
    pi
  ].param_type = "ProcessInput";
  closePhMatAc();
  renderAll();
}

function editParamVal(u, o, p, pi, el) {
  var cur =
    currentRecipeData.unit_procedures[u].operations[o].phases[p].params[pi]
      .value || "";
  var inp = document.createElement("input");
  inp.className = "inline-edit";
  inp.value = cur;
  inp.style.width = "60px";
  el.textContent = "";
  el.appendChild(inp);
  inp.focus();
  inp.select();
  inp.onblur = function () {
    currentRecipeData.unit_procedures[u].operations[o].phases[p].params[
      pi
    ].value = inp.value;
    renderAll();
  };
  inp.onkeydown = function (e) {
    if (e.key === "Enter") inp.blur();
    if (e.key === "Escape") {
      inp.value = cur;
      inp.blur();
    }
  };
}
function editPhDesc(u, o, p, el) {
  var cur =
    currentRecipeData.unit_procedures[u].operations[o].phases[p].description ||
    "";
  var inp = document.createElement("input");
  inp.className = "inline-edit";
  inp.value = cur;
  inp.style.width = "100%";
  el.textContent = "";
  el.appendChild(inp);
  inp.focus();
  inp.onblur = function () {
    currentRecipeData.unit_procedures[u].operations[o].phases[p].description =
      inp.value;
    renderAll();
  };
  inp.onkeydown = function (e) {
    if (e.key === "Enter") inp.blur();
    if (e.key === "Escape") {
      inp.value = cur;
      inp.blur();
    }
  };
}

// ===== UP / OPERATION RENAME =====
function editUPName(u, el) {
  var cur = currentRecipeData.unit_procedures[u].name || "";
  var inp = document.createElement("input");
  inp.className = "inline-edit";
  inp.value = cur;
  inp.style.width = "180px";
  inp.style.color = "#fff";
  inp.style.background = "#2d3078";
  inp.style.border = "1px solid #009F3C";
  el.textContent = "";
  el.appendChild(inp);
  inp.focus();
  inp.select();
  inp.onblur = function () {
    var val = inp.value.trim();
    if (val && val !== cur) {
      currentRecipeData.unit_procedures[u].name = val;
      currentRecipeData._structuralEdit = true;
    }
    renderAll();
  };
  inp.onkeydown = function (e) {
    if (e.key === "Enter") inp.blur();
    if (e.key === "Escape") {
      inp.value = cur;
      inp.blur();
    }
  };
}

function editOpName(u, o, el) {
  var cur = currentRecipeData.unit_procedures[u].operations[o].name || "";
  var inp = document.createElement("input");
  inp.className = "inline-edit";
  inp.value = cur;
  inp.style.width = "160px";
  el.textContent = "";
  el.appendChild(inp);
  inp.focus();
  inp.select();
  inp.onblur = function () {
    var val = inp.value.trim();
    if (val && val !== cur) {
      currentRecipeData.unit_procedures[u].operations[o].name = val;
      currentRecipeData._structuralEdit = true;
    }
    renderAll();
  };
  inp.onkeydown = function (e) {
    if (e.key === "Enter") inp.blur();
    if (e.key === "Escape") {
      inp.value = cur;
      inp.blur();
    }
  };
}

/**
 * CREATE BRANCH - Insert a new parallel branch AFTER the last phase.
 * Creates proper ParallelDivergent link structure with array ToID.
 */
function addBranchToOp(u, o) {
  currentRecipeData._structuralEdit = true;
  var up = currentRecipeData.unit_procedures[u];
  var op = up.operations[o];

  if (!op.Links) op.Links = [];

  // Find the last phase in the operation
  var lastPhase = op.phases.length > 0 ? op.phases[op.phases.length - 1] : null;

  if (!lastPhase) {
    alert("Cannot create branch in empty operation. Add a phase first.");
    return;
  }

  var timestamp = Date.now();
  var branchAId = "branchA_" + timestamp;
  var branchBId = "branchB_" + timestamp;

  // Create branch entry phases
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

  // Find and remove the link FROM the last phase
  var linkIdx = -1;
  var oldTarget = null;
  for (var i = 0; i < op.Links.length; i++) {
    if (
      op.Links[i].LinkType === "ControlLink" &&
      op.Links[i].FromID &&
      op.Links[i].FromID.FromIDValue === lastPhase.label
    ) {
      linkIdx = i;
      oldTarget = op.Links[i].ToID.ToIDValue;
      break;
    }
  }

  // Remove the old link
  if (linkIdx >= 0) {
    op.Links.splice(linkIdx, 1);
  }

  // Add the new branch phases
  op.phases.push(newPhaseA);
  op.phases.push(newPhaseB);

  // Create ParallelDivergent link from last phase to both branches
  op.Links.push({
    ID: "link_dv_" + timestamp,
    LinkType: "ParallelDivergent",
    FromID: {
      FromIDValue: lastPhase.label,
      FromType: "Step",
      IDScope: "Internal",
    },
    ToID: [
      { ToIDValue: branchAId, ToType: "Step", IDScope: "Internal" },
      { ToIDValue: branchBId, ToType: "Step", IDScope: "Internal" },
    ],
  });

  // If there was an old target, reconnect both branches to it
  if (oldTarget) {
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
  }

  renderAll();
  alert(
    "Branch created successfully! You can now add phases to each branch lane.",
  );
}

/**
 * ADD PHASE TO BRANCH - Add a new phase to a specific branch lane
 * Call this when clicking "+" on a branch lane (not on linear phases)
 */
function addPhaseToBranchLane(u, o, branchId) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  var structure = computeBranchStructure(op);

  if (!structure.hasFork) {
    alert("No branch exists. Create a branch first.");
    return;
  }

  var lastPhase = getLastPhaseInBranch(op, branchId);
  if (!lastPhase) {
    // Branch is empty, use the entry point
    lastPhase = structure.branches[branchId].entry;
  }

  var timestamp = Date.now();
  var newPhase = {
    label: "Phase_" + timestamp,
    phase_type: "Process",
    _reId: "phase_" + timestamp,
    params: [],
  };

  insertPhaseIntoBranch(op, branchId, newPhase);
  renderAll();
}

/**
 * CLOSE BRANCH - Seal the parallel branches at a convergence point
 * Call this when selecting a phase to converge to
 */
function closeBranchAtPhase(u, o, convergenceLabel) {
  currentRecipeData._structuralEdit = true;
  var op = currentRecipeData.unit_procedures[u].operations[o];

  var structure = computeBranchStructure(op);
  if (!structure.hasFork) {
    alert("No open branch to close");
    return;
  }

  if (structure.hasConvergence) {
    alert("Branch already closed");
    return;
  }

  closeBranchBefore(op, convergenceLabel);
  renderAll();
  alert("Branch closed at: " + convergenceLabel);
}

/**
 * Add phase to the end of a specific branch
 */
function addPhaseToEndOfBranch(u, o, branch, type) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  var structure = computeBranchStructure(op);

  if (!structure.hasFork) {
    console.error("No branch exists");
    return;
  }

  var lastPhase = getLastPhaseInBranch(op, branch);
  if (!lastPhase) {
    console.error("No phases found in branch", branch);
    return;
  }

  // Find the link from lastPhase
  var linkIdx = -1;
  for (var i = 0; i < op.Links.length; i++) {
    if (
      op.Links[i].LinkType === "ControlLink" &&
      op.Links[i].FromID &&
      op.Links[i].FromID.FromIDValue === lastPhase
    ) {
      linkIdx = i;
      break;
    }
  }

  if (linkIdx < 0) {
    // Might be pointing to convergence
    console.error("Cannot find link from phase:", lastPhase);
    return;
  }

  // Create new phase
  var timestamp = Date.now();
  var newPhase = {
    label: "Phase_" + timestamp,
    phase_type: type,
    _reId: "phase_" + timestamp,
    params: [],
  };

  op.phases.push(newPhase);

  // Update the link
  var oldLink = op.Links[linkIdx];
  var oldTarget = oldLink.ToID.ToIDValue;
  oldLink.ToID.ToIDValue = newPhase._reId;

  // Add new link from new phase to old target
  op.Links.push({
    ID: "link_cl_" + timestamp,
    LinkType: "ControlLink",
    FromID: {
      FromIDValue: newPhase._reId,
      FromType: "Step",
      IDScope: "Internal",
    },
    ToID: { ToIDValue: oldTarget, ToType: "Step", IDScope: "Internal" },
  });

  renderAll();
}

/**
 * CLOSE BRANCH - Create convergence at a specific phase.
 */
function closeBranchBefore(u, o, convergencePhaseLabel) {
  currentRecipeData._structuralEdit = true;
  var op = currentRecipeData.unit_procedures[u].operations[o];

  var structure = computeBranchStructure(op);
  if (!structure.hasFork) {
    alert("No open branch to close");
    return;
  }

  if (structure.hasConvergence) {
    alert("Branch already closed");
    return;
  }

  // Find all sources pointing to convergencePhaseLabel
  var sources = [];
  for (var i = op.Links.length - 1; i >= 0; i--) {
    var l = op.Links[i];
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
  }

  if (sources.length < 2) {
    alert("Need at least 2 sources for convergence, found: " + sources.length);
    return;
  }

  // Create ParallelConvergent link with array FromID
  op.Links.push({
    ID: "link_cv_" + Date.now(),
    LinkType: "ParallelConvergent",
    FromID: sources,
    ToID: {
      ToIDValue: convergencePhaseLabel,
      ToType: "Step",
      IDScope: "Internal",
    },
  });

  renderAll();
}

// ===== LANE VIEW =====

// Stage 6S — Transition after any node. The selected node becomes the
// Transition's source and its original outgoing Step links become Transition outputs.
function transitionNodePhase(op, nodeId) {
  for (var i = 0; i < ((op && op.phases) || []).length; i++) {
    var phase = op.phases[i];
    if ((phase._reId || phase.node_id) === nodeId)
      return { phase: phase, index: i };
  }
  return null;
}
function transitionAfterNodeEligibility(op, nodeId) {
  if (!op || !transitionNodePhase(op, nodeId))
    return { ok: false, reason: "Select a valid RecipeElement node." };
  var outgoing =
    typeof nodeOutgoingStepLinks === "function"
      ? nodeOutgoingStepLinks(op, nodeId)
      : (op.links || []).filter(function (link) {
          return (
            link.from_type === "Step" &&
            link.from_re_id === nodeId &&
            link.to_type === "Step" &&
            link.to_re_id
          );
        });
  if (!outgoing.length)
    return {
      ok: false,
      reason: "The selected node has no outgoing Step link.",
    };
  return { ok: true, outgoing: outgoing };
}
function nextTransitionId(op) {
  return nextFreeGraphNodeId(currentRecipeData);
}
function setTransitionEndpoint(link, side, tid) {
  if (side === "from") {
    link.from = "TRANS:" + tid;
    link.from_id = tid;
    link.from_node = "";
    link.from_re_id = "";
    link.from_type = "Transition";
  } else {
    link.to = "TRANS:" + tid;
    link.to_id = tid;
    link.to_node = "";
    link.to_re_id = "";
    link.to_type = "Transition";
  }
}
function addTransitionAfterNode(u, o, nodeId) {
  var op =
      currentRecipeData &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations[o],
    e = transitionAfterNodeEligibility(op, nodeId);
  if (!e.ok) {
    console.warn("Transition creation not offered:", e.reason);
    return e;
  }
  if (!op.transitions) op.transitions = {};
  var tid = nextTransitionId(op),
    selected = transitionNodePhase(op, nodeId);
  op.transitions[tid] = 'Ask( "Condition?" )';
  transitionMeta(op, tid);
  // Move each original Step route behind the transition, retaining type/destination.
  e.outgoing.forEach(function (link) {
    setTransitionEndpoint(link, "from", tid);
  });
  op.links.push({
    type: "ControlLink",
    from: selected.phase.label || nodeId,
    from_id: "",
    from_node: nodeId,
    from_re_id: nodeId,
    from_type: "Step",
    to: "TRANS:" + tid,
    to_id: tid,
    to_node: "",
    to_re_id: "",
    to_type: "Transition",
  });
  op._graphEdit = true;
  currentRecipeData._structuralEdit = true;
  renderAll();
  return {
    ok: true,
    action: "transition-after-node",
    nodeId: nodeId,
    transitionId: tid,
    outgoingCount: e.outgoing.length,
  };
}

// Stage 6U — AVEVA loop: selected Step -> Transition, Transition --Other--> explicit loop target,
// and Transition --ControlLink--> the selected node's original exit route(s).
var loopAfterNodeCtx = null;
function loopNodeDisplay(phase) {
  return (
    (phase.label || "") +
    " · Label: " +
    (phase._label || "—") +
    " · #" +
    (phase._reId || phase.node_id || "")
  );
}
function loopTargetOptions(op) {
  return (op.phases || [])
    .map(function (phase) {
      var id = phase._reId || phase.node_id;
      return (
        '<option value="' +
        esc(id) +
        '">' +
        esc(loopNodeDisplay(phase)) +
        "</option>"
      );
    })
    .join("");
}
function showLoopDialog(ctx, anchorText) {
  var op =
    currentRecipeData &&
    currentRecipeData.unit_procedures[ctx.u] &&
    currentRecipeData.unit_procedures[ctx.u].operations[ctx.o];
  if (!op) return;
  loopAfterNodeCtx = ctx;
  document.getElementById("loopCreateAnchor").textContent =
    anchorText +
    ". The normal route remains the exit; choose where the Other loop leg returns.";
  var targets = document.getElementById("loopTarget");
  targets.innerHTML = loopTargetOptions(op);
  targets.value = ctx.defaultTarget || "";
  document.getElementById("loopCondition").value = 'AskDoneBy( "Repeat?" )';
  document.getElementById("loopCreateError").textContent = "";
  document.getElementById("loopCreateOverlay").style.display = "block";
  document.getElementById("loopCreateDialog").style.display = "block";
}
function showLoopAfterNodeDialog(u, o, nodeId) {
  var op =
      currentRecipeData &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations[o],
    e = transitionAfterNodeEligibility(op, nodeId),
    selected = transitionNodePhase(op, nodeId);
  if (!e.ok || !selected) return;
  showLoopDialog(
    { u: u, o: o, nodeId: nodeId, defaultTarget: nodeId },
    "After " + loopNodeDisplay(selected.phase),
  );
}
function showLoopAfterTransitionDialog(u, o, tid) {
  var op =
      currentRecipeData &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations[o],
    exits = transitionExitLinks(op, tid),
    source = transitionSourceNode(op, tid);
  if (!op || !exits.length) return;
  showLoopDialog(
    { u: u, o: o, transitionId: tid, defaultTarget: source },
    "Configure yes/no loop-back on Transition #" + tid,
  );
}
function cancelLoopAfterNodeDialog() {
  var a = document.getElementById("loopCreateOverlay"),
    b = document.getElementById("loopCreateDialog");
  if (a) a.style.display = "none";
  if (b) b.style.display = "none";
  loopAfterNodeCtx = null;
}
function confirmLoopAfterNode() {
  if (!loopAfterNodeCtx) return;
  var c = loopAfterNodeCtx,
    targetId = document.getElementById("loopTarget").value,
    condition = document.getElementById("loopCondition").value;
  var result = c.transitionId
    ? addLoopAfterTransition(c.u, c.o, c.transitionId, targetId, condition)
    : addLoopAfterNode(c.u, c.o, c.nodeId, targetId, condition);
  if (!result.ok) {
    document.getElementById("loopCreateError").textContent =
      result.reason || "Loop was not created.";
    return;
  }
  cancelLoopAfterNodeDialog();
}
function addLoopAfterNode(u, o, nodeId, targetId, condition) {
  var op =
      currentRecipeData &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations[o],
    e = transitionAfterNodeEligibility(op, nodeId),
    selected = transitionNodePhase(op, nodeId),
    target = transitionNodePhase(op, targetId);
  if (!e.ok || !selected)
    return e.ok ? { ok: false, reason: "Select a valid loop source." } : e;
  if (!target)
    return {
      ok: false,
      reason: "Choose a loop-back target in this operation.",
    };
  if (!op.transitions) op.transitions = {};
  var tid = nextTransitionId(op);
  op.transitions[tid] = condition || 'AskDoneBy( "Repeat?" )';
  transitionMeta(op, tid);
  // Preserve every pre-existing exit exactly, then add AVEVA's separate Other loop leg.
  e.outgoing.forEach(function (link) {
    setTransitionEndpoint(link, "from", tid);
  });
  op.links.push({
    type: "ControlLink",
    from: selected.phase.label || nodeId,
    from_id: "",
    from_node: nodeId,
    from_re_id: nodeId,
    from_type: "Step",
    to: "TRANS:" + tid,
    to_id: tid,
    to_node: "",
    to_re_id: "",
    to_type: "Transition",
  });
  op.links.push({
    type: "Other",
    from: "TRANS:" + tid,
    from_id: tid,
    from_node: "",
    from_re_id: "",
    from_type: "Transition",
    to: target.phase.label || targetId,
    to_id: "",
    to_node: targetId,
    to_re_id: targetId,
    to_type: "Step",
  });
  op._graphEdit = true;
  currentRecipeData._structuralEdit = true;
  renderAll();
  return {
    ok: true,
    action: "loop-after-node",
    nodeId: nodeId,
    targetId: targetId,
    transitionId: tid,
    outgoingCount: e.outgoing.length,
  };
}
function addLoopAfterTransition(u, o, tid, targetId, condition) {
  var op =
      currentRecipeData &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations[o],
    target = transitionNodePhase(op, targetId),
    exits = transitionExitLinks(op, tid);
  if (!op || !target)
    return {
      ok: false,
      reason: "Choose a loop-back target in this operation.",
    };
  if (!exits.length)
    return { ok: false, reason: "The Transition has no normal Step exit." };
  // Existing Transition remains the decision/ask; add one Other leg only. Its ControlLink exit(s) are untouched.
  if (
    (op.links || []).some(function (link) {
      return (
        link.type === "Other" &&
        link.from_type === "Transition" &&
        link.from_id === tid
      );
    })
  )
    return {
      ok: false,
      reason: "This Transition already has a loop-back leg.",
    };
  op.links.push({
    type: "Other",
    from: "TRANS:" + tid,
    from_id: tid,
    from_node: "",
    from_re_id: "",
    from_type: "Transition",
    to: target.phase.label || targetId,
    to_id: "",
    to_node: targetId,
    to_re_id: targetId,
    to_type: "Step",
  });
  op._graphEdit = true;
  currentRecipeData._structuralEdit = true;
  renderAll();
  return {
    ok: true,
    action: "loop-after-transition",
    transitionId: tid,
    targetId: targetId,
  };
}
function updPhaseMeta(u, o, p, key, value) {
  var phase = currentRecipeData.unit_procedures[u].operations[o].phases[p];
  if (!phase) return;
  phase[key] = value;
  currentRecipeData._structuralEdit = true;
}

// Stage 6V — Transitions are first-class ProcedureLogic nodes in the editor.
function transitionInputs(op, tid) {
  return ((op && op.links) || []).filter(function (l) {
    return l.to_type === "Transition" && l.to_id === tid;
  });
}
function transitionExitLinks(op, tid) {
  return ((op && op.links) || []).filter(function (l) {
    return (
      l.from_type === "Transition" &&
      l.from_id === tid &&
      l.type !== "Other" &&
      l.to_type === "Step" &&
      l.to_re_id
    );
  });
}
function transitionSourceNode(op, tid) {
  var a = transitionInputs(op, tid).filter(function (l) {
    return l.from_type === "Step" && l.from_re_id;
  });
  return a.length === 1 ? a[0].from_re_id : "";
}
function startTransitionNodeAdd(u, o, tid, type) {
  if (typeof showPhasePicker === "function")
    showPhasePicker(u, o, -1, type, "transition:" + tid);
}
function addTransitionAfterTransition(u, o, tid) {
  var op =
      currentRecipeData &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations[o],
    exits = transitionExitLinks(op, tid);
  if (!op || !exits.length) {
    console.warn("Transition insertion unavailable: no normal forward route.");
    return {
      ok: false,
      reason: "This Transition has no normal forward route.",
    };
  }
  if (!op.transitions) op.transitions = {};
  var next = nextTransitionId(op);
  op.transitions[next] = 'Ask( "Condition?" )';
  transitionMeta(op, next);
  exits.forEach(function (link) {
    setTransitionEndpoint(link, "from", next);
  });
  op.links.push({
    type: "ControlLink",
    from: "TRANS:" + tid,
    from_id: tid,
    from_node: "",
    from_re_id: "",
    from_type: "Transition",
    to: "TRANS:" + next,
    to_id: next,
    to_node: "",
    to_re_id: "",
    to_type: "Transition",
  });
  op._graphEdit = true;
  currentRecipeData._structuralEdit = true;
  renderAll();
  return { ok: true, transitionId: next };
}
function ddTransitionNode(u, o, tid) {
  return (
    '<div class="act-more node-more" onclick="toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for transition ' +
    esc(tid) +
    '">⋮</button><div class="dropdown"><div class="dd-label">Transition · #' +
    esc(tid) +
    '</div><div class="dd-item" onclick="startTransitionNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    esc(tid) +
    '\',\'Process\')">Insert Process Phase after this Transition</div><div class="dd-item" onclick="startTransitionNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    esc(tid) +
    '\',\'Transfer\')">Insert Transfer after this Transition</div><div class="dd-item" onclick="startTransitionNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    esc(tid) +
    '\',\'AllocateProcess\')">Insert Allocate Process after this Transition</div><div class="dd-item" onclick="startTransitionNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    esc(tid) +
    '\',\'ReleaseProcess\')">Insert Release Process after this Transition</div><div class="dd-item" onclick="startTransitionNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    esc(tid) +
    '\',\'AllocateTransfer\')">Insert Allocate Transfer after this Transition</div><div class="dd-item" onclick="startTransitionNodeAdd(' +
    u +
    "," +
    o +
    ",'" +
    esc(tid) +
    '\',\'ReleaseTransfer\')">Insert Release Transfer after this Transition</div><div class="dd-sep"></div><div class="dd-item" onclick="addTransitionAfterTransition(' +
    u +
    "," +
    o +
    ",'" +
    esc(tid) +
    '\')">◆ Insert Transition after this Transition</div><div class="dd-item" onclick="showLoopAfterTransitionDialog(' +
    u +
    "," +
    o +
    ",'" +
    esc(tid) +
    '\')">↺ Create loop after this Transition</div><div class="dd-item" onclick="showBranchAfterTransitionDialog(' +
    u +
    "," +
    o +
    ",'" +
    esc(tid) +
    "')\">⑂ Create branch after this Transition</div></div></div>"
  );
}
function insertItemAfterTransition(op, tid, newPhase) {
  var exits = transitionExitLinks(op, tid);
  if (!exits.length)
    return {
      ok: false,
      reason: "This Transition has no onward Step exit to insert into.",
    };
  exits.forEach(function (link) {
    branchSetEndpoint(link, "from", newPhase);
  });
  op.links.push({
    type: "ControlLink",
    from: "TRANS:" + tid,
    from_id: tid,
    from_node: "",
    from_reId: "",
    from_re_id: "",
    from_type: "Transition",
    to: newPhase.label || newPhase._reId,
    to_id: "",
    to_node: newPhase._reId,
    to_re_id: newPhase._reId,
    to_type: "Step",
  });
  var source = transitionSourceNode(op, tid),
    at = -1;
  for (var i = 0; i < (op.phases || []).length; i++)
    if ((op.phases[i]._reId || op.phases[i].node_id) === source) {
      at = i;
      break;
    }
  op.phases.splice(at < 0 ? op.phases.length : at + 1, 0, newPhase);
  op._graphEdit = true;
  return {
    ok: true,
    action: "insert-after-transition",
    transitionId: tid,
    phaseId: newPhase._reId,
    outgoingCount: exits.length,
  };
}
function transitionNodeHtml(op, u, o, tid) {
  var condition = (op.transitions && op.transitions[tid]) || "",
    meta = transitionMeta(op, tid),
    loops = (op.links || []).filter(function (l) {
      return (
        l.type === "Other" && l.from_type === "Transition" && l.from_id === tid
      );
    });
  var transitionMetaId = "transition_" + u + "_" + o + "_" + tid;
  var controls = editMode
    ? '<div class="act-bar v1210a-actions"><button class="act-btn" title="Show or hide Transition details" onclick="v1210aToggle(\'' +
      transitionMetaId +
      "',event)\">?</button>" +
      ddTransitionNode(u, o, tid) +
      "</div>"
    : "";
  var h =
    (editMode && typeof movementTransitionDropHtml === "function"
      ? movementTransitionDropHtml(u, o, tid)
      : "") +
    '<div class="lane-ph lane-transition-node" data-transition-id="' +
    esc(tid) +
    '"><div class="v1210a-card-head"><div class="lph-name v1210a-title">◆ ' +
    esc(meta.name || "Transition") +
    ' <span class="node-id-badge" title="AVEVA Transition ID">#' +
    esc(tid) +
    "</span></div>" +
    controls +
    "</div>";
  h += '<div id="' + transitionMetaId + '" class="v1210a-transition-meta">';
  h +=
    '<div class="lph-parent">Label / node ID ' +
    (editMode
      ? '<input class="inline-edit" value="' +
        esc(tid) +
        '" onchange="renameTransitionId(' +
        u +
        "," +
        o +
        ",'" +
        esc(tid) +
        "',this.value)\">"
      : esc(tid)) +
    " · Name " +
    (editMode
      ? '<input class="inline-edit" value="' +
        esc(meta.name || "") +
        '" onchange="updTransitionMeta(' +
        u +
        "," +
        o +
        ",'" +
        esc(tid) +
        "','name',this.value)\">"
      : esc(meta.name || "")) +
    "</div>";
  h +=
    '<div class="lph-parent">Condition ' +
    (editMode
      ? '<input class="inline-edit" value="' +
        esc(condition) +
        '" onchange="updTransCond(' +
        u +
        "," +
        o +
        ",'" +
        esc(tid) +
        "',this.value)\">"
      : esc(condition)) +
    "</div>";
  h +=
    '<div class="lph-desc">Description ' +
    (editMode
      ? '<input class="inline-edit" value="' +
        esc(meta.description || "") +
        '" onchange="updTransitionMeta(' +
        u +
        "," +
        o +
        ",'" +
        esc(tid) +
        "','description',this.value)\">"
      : esc(meta.description || "—")) +
    "</div></div>";
  loops.forEach(function (loop) {
    var target = lanePhaseById(op, loop.to_re_id);
    h +=
      '<div class="lph-desc">↺ Loop to ' +
      esc(target ? loopNodeDisplay(target.phase) : "#" + loop.to_re_id) +
      "</div>";
  });
  return h + "</div>";
}
// Render the complete normal Transition chain after a Step. A newly inserted
// Transition may follow another Transition (Step → T4 → T1 → Step); only the
// Other loop-back is excluded from this forward traversal.
function transitionNodesAfterStep(op, nodeId, u, o) {
  var links = (op && op.links) || [],
    first = links.filter(function (l) {
      return (
        l.from_type === "Step" &&
        l.from_re_id === nodeId &&
        l.to_type === "Transition" &&
        l.to_id &&
        l.type !== "Other"
      );
    })[0],
    seen = {},
    h = "",
    tid = first && first.to_id;
  while (tid && !seen[tid]) {
    seen[tid] = true;
    h += transitionNodeHtml(op, u, o, tid);
    var next = links.filter(function (l) {
      return (
        l.from_type === "Transition" &&
        l.from_id === tid &&
        l.to_type === "Transition" &&
        l.to_id &&
        l.type !== "Other"
      );
    })[0];
    tid = next && next.to_id;
  }
  return h;
}

/* Controlled Move2b Transition-to-Fork drop boundary. */
function transitionForkDropHtml(u, o, tid) {
  return typeof movementTransitionForkDropHtml === "function"
    ? movementTransitionForkDropHtml(u, o, tid)
    : "";
}
var movementTransitionNodeHtml = transitionNodeHtml;
transitionNodeHtml = function (op, u, o, tid) {
  var html = movementTransitionNodeHtml(op, u, o, tid);
  var normalExits = ((op && op.links) || []).filter(function (link) {
    return (
      link.from_type === "Transition" &&
      String(link.from_id) === String(tid) &&
      link.type !== "Other"
    );
  });
  var directlyOwnsFork =
    normalExits.length > 0 &&
    normalExits.every(function (link) {
      return (
        link.type === "ParallelDivergent" || link.type === "SerialDivergent"
      );
    });
  return (
    html +
    (editMode && directlyOwnsFork ? transitionForkDropHtml(u, o, tid) : "")
  );
};

/* ==========================================================================
 * Former file: js/picker.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// picker.js - Phase/Transfer picker panel
// Shows available phases from MODEL when adding to a recipe

var pickerCtx = null; // {u, o, afterIdx, type}

/* Operation scope uses the same picker panel and explicit anchor contract as Phase scope.
   There is no model catalogue of Operation templates, so this picker deliberately
   collects the native OperationInformation/Name required for a new RecipeElement. */
function showOperationPicker(u, transitionId, anchorEl) {
  pickerCtx = {
    scope: "operation",
    u: u,
    transitionId: String(transitionId),
    anchorEl: anchorEl || null,
  };
  var picker = document.getElementById("phasePicker"),
    body = document.getElementById("pickerBody"),
    title = document.getElementById("pickerTitle");
  title.textContent =
    "Insert Operation after Transition #" + String(transitionId);
  body.innerHTML =
    '<div style="padding:12px"><label class="pk-name" for="operationPickerName">Operation name</label><input id="operationPickerName" class="inline-edit" style="width:100%;margin:8px 0" value="New Operation" autofocus><button class="act-btn" type="button" onclick="pickOperation()">Insert Operation</button></div>';
  picker.classList.add("show");
  picker.style.transform = "";
  var trigEl = pickerCtx.anchorEl;
  window.requestAnimationFrame(function () {
    var viewport = window.visualViewport || {
        width: window.innerWidth,
        height: window.innerHeight,
        offsetLeft: 0,
        offsetTop: 0,
      },
      pad = 10,
      width = Math.max(280, picker.offsetWidth || 290),
      height = Math.min(picker.scrollHeight || 180, 220),
      rect =
        trigEl && trigEl.getBoundingClientRect
          ? trigEl.getBoundingClientRect()
          : null,
      left = rect
        ? rect.left
        : viewport.offsetLeft + (viewport.width - width) / 2;
    left = Math.max(
      viewport.offsetLeft + pad,
      Math.min(left, viewport.offsetLeft + viewport.width - width - pad),
    );
    var top = rect
      ? Math.min(
          viewport.offsetTop + viewport.height - height - pad,
          rect.bottom + 6,
        )
      : viewport.offsetTop + pad;
    picker.style.maxHeight = height + "px";
    picker.style.top = top + "px";
    picker.style.left = left + "px";
    var input = document.getElementById("operationPickerName");
    if (input) input.focus();
  });
}
function pickOperation() {
  if (!pickerCtx || pickerCtx.scope !== "operation") return;
  var input = document.getElementById("operationPickerName"),
    name = ((input && input.value) || "").trim();
  if (!name) {
    if (input) input.focus();
    return;
  }
  var result =
    window.requestOperationInsertAfterTransition &&
    window.requestOperationInsertAfterTransition({
      unitProcedureIndex: pickerCtx.u,
      transitionId: pickerCtx.transitionId,
      name: name,
    });
  if (result && result.ok) closePicker();
}

function showOperationLoopPicker(u, transitionId, anchorEl) {
  var up = currentRecipeData && currentRecipeData.unit_procedures[u],
    ops = (up && up.operations) || [];
  pickerCtx = {
    scope: "operation-loop",
    u: u,
    transitionId: String(transitionId),
    anchorEl: anchorEl || null,
  };
  var picker = document.getElementById("phasePicker"),
    body = document.getElementById("pickerBody"),
    title = document.getElementById("pickerTitle");
  title.textContent = "Create loop after Transition #" + transitionId;
  var options = ops
    .map(function (op) {
      return (
        '<option value="' +
        esc(op._reId) +
        '">' +
        esc(op.name || "Operation") +
        " · #" +
        esc(op._reId) +
        "</option>"
      );
    })
    .join("");
  body.innerHTML =
    '<div style="padding:12px"><label class="pk-name">Loop-back target</label><select id="operationLoopTarget" style="width:100%;margin:8px 0;padding:6px">' +
    options +
    '</select><button class="act-btn" type="button" onclick="pickOperationLoop()">Create loop</button></div>';
  picker.classList.add("show");
  picker.style.transform = "";
  var r =
    anchorEl && anchorEl.getBoundingClientRect
      ? anchorEl.getBoundingClientRect()
      : null;
  picker.style.left = (r ? r.left : 20) + "px";
  picker.style.top = (r ? r.bottom + 6 : 20) + "px";
}
function pickOperationLoop() {
  if (!pickerCtx || pickerCtx.scope !== "operation-loop") return;
  var target = document.getElementById("operationLoopTarget").value,
    result =
      window.requestOperationLoopAfterTransition &&
      window.requestOperationLoopAfterTransition({
        unitProcedureIndex: pickerCtx.u,
        transitionId: pickerCtx.transitionId,
        targetOperationId: target,
      });
  if (result && result.ok) closePicker();
}

function showOperationBranchPicker(u, tid, anchorEl) {
  pickerCtx = {
    scope: "operation-branch",
    u: u,
    transitionId: String(tid),
    anchorEl: anchorEl,
  };
  var p = document.getElementById("phasePicker"),
    b = document.getElementById("pickerBody"),
    t = document.getElementById("pickerTitle");
  t.textContent = "Create branch after Transition #" + tid;
  b.innerHTML =
    '<div style="padding:12px"><label>Execution mode</label><select id="operationBranchMode" style="width:100%;margin:7px 0"><option value="All">Parallel · All</option><option value="Single">Serial · Single</option></select><label>Number of lanes</label><input id="operationBranchCount" type="number" min="2" value="2" style="width:100%;margin:7px 0"><button class="act-btn" onclick="pickOperationBranch()">Create branch</button></div>';
  p.classList.add("show");
  var r = anchorEl.getBoundingClientRect();
  p.style.left = r.left + "px";
  p.style.top = r.bottom + 6 + "px";
}
function pickOperationBranch() {
  if (!pickerCtx || pickerCtx.scope !== "operation-branch") return;
  var mode = document.getElementById("operationBranchMode").value,
    count = document.getElementById("operationBranchCount").value,
    x =
      window.requestOperationBranchAfterTransition &&
      window.requestOperationBranchAfterTransition({
        unitProcedureIndex: pickerCtx.u,
        transitionId: pickerCtx.transitionId,
        mode: mode,
        laneCount: count,
      });
  if (x && x.ok) closePicker();
}
function showOperationLanePicker(u, tid, dummyId, anchorEl) {
  pickerCtx = {
    scope: "operation-lane",
    u: u,
    transitionId: String(tid),
    dummyId: String(dummyId),
    anchorEl: anchorEl,
  };
  var p = document.getElementById("phasePicker"),
    b = document.getElementById("pickerBody"),
    t = document.getElementById("pickerTitle");
  t.textContent = "Insert Operation in branch lane";
  b.innerHTML =
    '<div style="padding:12px"><label>Operation name</label><input id="operationLaneName" class="inline-edit" style="width:100%;margin:8px 0" value="New Operation"><button class="act-btn" onclick="pickOperationLane()">Insert Operation</button></div>';
  p.classList.add("show");
  var r = anchorEl.getBoundingClientRect();
  p.style.left = r.left + "px";
  p.style.top = r.bottom + 6 + "px";
}
function pickOperationLane() {
  if (!pickerCtx || pickerCtx.scope !== "operation-lane") return;
  var x =
    window.requestOperationLaneInsert &&
    window.requestOperationLaneInsert({
      unitProcedureIndex: pickerCtx.u,
      dummyId: pickerCtx.dummyId,
      name: document.getElementById("operationLaneName").value,
    });
  if (x && x.ok) closePicker();
}

function showOperationBranchAfterNodePicker(u, o, anchorEl) {
  var op =
    currentRecipeData &&
    currentRecipeData.unit_procedures[u] &&
    currentRecipeData.unit_procedures[u].operations[o];
  if (!op) return;
  pickerCtx = {
    scope: "operation-branch-node",
    u: u,
    operationId: String(op._reId),
    anchorEl: anchorEl,
  };
  var p = document.getElementById("phasePicker"),
    b = document.getElementById("pickerBody"),
    t = document.getElementById("pickerTitle");
  t.textContent = "Create branch after Operation";
  b.innerHTML =
    '<div style="padding:12px"><label>Execution mode</label><select id="operationBranchMode" style="width:100%;margin:7px 0"><option value="All">Parallel · All</option><option value="Single">Serial · Single</option></select><label>Number of lanes</label><input id="operationBranchCount" type="number" min="2" value="2" style="width:100%;margin:7px 0"><button class="act-btn" onclick="pickOperationBranchNode()">Create branch</button></div>';
  p.classList.add("show");
  var r = anchorEl.getBoundingClientRect();
  p.style.left = r.left + "px";
  p.style.top = r.bottom + 6 + "px";
}
function pickOperationBranchNode() {
  if (!pickerCtx || pickerCtx.scope !== "operation-branch-node") return;
  var x =
    window.requestOperationBranchAfterNode &&
    window.requestOperationBranchAfterNode({
      unitProcedureIndex: pickerCtx.u,
      operationId: pickerCtx.operationId,
      mode: document.getElementById("operationBranchMode").value,
      laneCount: document.getElementById("operationBranchCount").value,
    });
  if (x && x.ok) closePicker();
}
function showPhasePicker(u, o, afterIdx, type, branchTargetId, anchorEl) {
  /* Each menu/card caller supplies its actual control. Do not rely on window.event:
     it is not stable after dropdown handling and caused the picker to fall back to top-left. */
  pickerCtx = {
    u: u,
    o: o,
    afterIdx: afterIdx,
    type: type,
    branchTargetId: branchTargetId || "",
    anchorEl: anchorEl || null,
  };
  var processInstance = currentRecipeData.unit_procedures[u].process;
  var proc = processClassForInstance(processInstance) || processInstance;
  var picker = document.getElementById("phasePicker");
  var body = document.getElementById("pickerBody");
  var title = document.getElementById("pickerTitle");
  var h = "";

  if (type === "Process") {
    title.textContent =
      (pickerCtx.branchTargetId
        ? "Insert Process Phase after selected position"
        : "Insert Process Phase") +
      " (" +
      processInstance +
      " · " +
      proc +
      ")";
    // Show all phases available in this process class
    var phases = MODEL.processes[proc] ? MODEL.processes[proc].phases : {};
    var phaseNames = Object.keys(phases).sort();
    if (!phaseNames.length) {
      h =
        '<div style="padding:12px;color:#999;text-align:center">No phases defined for ' +
        proc +
        "</div>";
    } else {
      for (var i = 0; i < phaseNames.length; i++) {
        var pn = phaseNames[i];
        var params = phases[pn];
        var paramStr = params
          .map(function (p) {
            return p.name;
          })
          .join(", ");
        h +=
          '<div class="phase-picker-item proc" onclick="pickPhase(\'' +
          esc(pn) +
          "','" +
          esc(processInstance) +
          "','Process')\">";
        h += '<div class="pk-name">' + esc(pn) + "</div>";
        if (paramStr) h += '<div class="pk-params">' + esc(paramStr) + "</div>";
        h += "</div>";
      }
    }
  } else if (type === "AllocateProcess" || type === "ReleaseProcess") {
    var actionName =
      type === "AllocateProcess" ? "Allocate Process" : "Release Process";
    title.textContent = actionName;
    var instances = recipeProcessInstances();
    if (!instances.length)
      h =
        '<div style="padding:12px;color:#999;text-align:center">No process instances defined in recipe</div>';
    else
      instances.forEach(function (instance) {
        h +=
          '<div class="phase-picker-item proc" onclick="pickPhase(\'' +
          esc(actionName) +
          "','" +
          esc(instance.name) +
          "','" +
          type +
          '\')"><div class="pk-name">' +
          esc(instance.name) +
          '</div><div class="pk-params">' +
          esc(instance.processClass) +
          (instance.unit ? " · " + esc(instance.unit) : " · no fixed unit") +
          " · " +
          esc(instance.mode || "Auto") +
          "</div></div>";
      });
  } else if (type === "AllocateTransfer" || type === "ReleaseTransfer") {
    var transferAction =
      type === "AllocateTransfer" ? "Allocate Transfer" : "Release Transfer";
    title.textContent = transferAction;
    var transferChoices = [];
    (currentRecipeData.equipment_transfers || []).forEach(function (transfer) {
      var list =
        Array.isArray(transfer.instances) && transfer.instances.length
          ? transfer.instances
          : [
              {
                name: transfer.name,
                source: transfer.source,
                dest: transfer.dest,
              },
            ];
      list.forEach(function (instance) {
        transferChoices.push({
          name: instance.name || transfer.name,
          source: instance.source || "",
          dest: instance.dest || "",
          className: transfer.name || "",
        });
      });
    });
    if (!transferChoices.length)
      h =
        '<div style="padding:12px;color:#999;text-align:center">No transfer instances defined in recipe</div>';
    else
      transferChoices.forEach(function (instance) {
        h +=
          '<div class="phase-picker-item xfer" onclick="pickPhase(\'' +
          esc(transferAction) +
          "','" +
          esc(instance.name) +
          "','" +
          type +
          '\')"><div class="pk-name">' +
          esc(instance.name) +
          '</div><div class="pk-params">' +
          esc(instance.source) +
          " → " +
          esc(instance.dest) +
          "</div></div>";
      });
  } else if (type === "Transfer") {
    title.textContent = pickerCtx.branchTargetId
      ? "Insert Transfer after selected position"
      : "Insert Transfer";
    // Show available transfers for this process
    var availXfers = currentRecipeData.equipment_transfers;
    if (!availXfers.length) {
      h =
        '<div style="padding:12px;color:#999;text-align:center">No transfers defined in recipe</div>';
    } else {
      for (var xi = 0; xi < availXfers.length; xi++) {
        var xfer = availXfers[xi];
        var xferPhases = MODEL.transfer_phases[xfer.name]
          ? Object.keys(MODEL.transfer_phases[xfer.name]).sort()
          : [];
        h +=
          '<div class="phase-picker-sub">' +
          esc(xfer.name) +
          " (" +
          esc(xfer.source) +
          "\u2192" +
          esc(xfer.dest) +
          ")</div>";
        if (xferPhases.length) {
          for (var pi = 0; pi < xferPhases.length; pi++) {
            var pn2 = xferPhases[pi];
            var params2 = MODEL.transfer_phases[xfer.name][pn2];
            var paramStr2 = params2
              .map(function (p) {
                return p.name;
              })
              .join(", ");
            h +=
              '<div class="phase-picker-item xfer" onclick="pickPhase(\'' +
              esc(pn2) +
              "','" +
              esc(xfer.name) +
              "','Transfer')\">";
            h += '<div class="pk-name">' + esc(pn2) + "</div>";
            if (paramStr2)
              h += '<div class="pk-params">' + esc(paramStr2) + "</div>";
            h += "</div>";
          }
        } else {
          h +=
            "<div class=\"phase-picker-item xfer\" onclick=\"pickPhase('transfer','" +
            esc(xfer.name) +
            "','Transfer')\">";
          h +=
            '<div class="pk-name">transfer</div><div class="pk-params">(default)</div></div>';
        }
      }
    }
  }

  body.innerHTML = h;
  picker.classList.add("show");

  // Resource allocation is a deliberate selection: centre it clear of phase navigation controls.
  if (
    type === "AllocateProcess" ||
    type === "ReleaseProcess" ||
    type === "AllocateTransfer" ||
    type === "ReleaseTransfer"
  ) {
    picker.style.top = "50%";
    picker.style.left = "50%";
    picker.style.transform = "translate(-50%,-50%)";
    return;
  }
  picker.style.transform = "";

  // Measure after the picker is visible. Use visualViewport where available:
  // it represents the usable area above browser/OS task bars and soft keyboards.
  var trigEl =
    pickerCtx && pickerCtx.anchorEl
      ? pickerCtx.anchorEl
      : window.event
        ? window.event.target
        : null;
  window.requestAnimationFrame(function () {
    var viewport = window.visualViewport || {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetLeft: 0,
      offsetTop: 0,
    };
    var pad = 10,
      usableTop = viewport.offsetTop + pad,
      usableBottom = viewport.offsetTop + viewport.height - pad;
    var width = Math.max(280, picker.offsetWidth || 290),
      naturalHeight = Math.min(picker.scrollHeight || 400, 400);
    var rect =
      trigEl && trigEl.getBoundingClientRect
        ? trigEl.getBoundingClientRect()
        : null;
    var left = rect
      ? rect.left
      : viewport.offsetLeft + (viewport.width - width) / 2;
    left = Math.max(
      viewport.offsetLeft + pad,
      Math.min(left, viewport.offsetLeft + viewport.width - width - pad),
    );
    var below = rect
      ? usableBottom - rect.bottom - 6
      : Math.floor(viewport.height * 0.7);
    var above = rect
      ? rect.top - usableTop - 6
      : Math.floor(viewport.height * 0.2);
    var openUp = rect && below < naturalHeight && above > below;
    var available = Math.max(150, openUp ? above : below);
    var height = Math.min(naturalHeight, available);
    picker.style.maxHeight = height + "px";
    var bodyEl = document.getElementById("pickerBody");
    if (bodyEl) bodyEl.style.maxHeight = Math.max(100, height - 42) + "px";
    var top;
    if (rect)
      top = openUp
        ? Math.max(usableTop, rect.top - height - 6)
        : Math.min(usableBottom - height, rect.bottom + 6);
    else top = usableTop + Math.max(0, (viewport.height - height) / 2);
    picker.style.top = top + "px";
    picker.style.left = left + "px";
  });
}

function pickPhase(phaseName, parentInstance, phaseType) {
  if (!pickerCtx) return;
  if (currentRecipeData) currentRecipeData._structuralEdit = true;
  var u = pickerCtx.u,
    o = pickerCtx.o,
    afterIdx = pickerCtx.afterIdx;
  var processInstance = currentRecipeData.unit_procedures[u].process;
  var proc = processClassForInstance(processInstance) || processInstance;

  // Build the phase with correct params from the selected instance's process class.
  var params = [];
  if (phaseType === "Transfer") {
    var tpPhases = MODEL.transfer_phases[parentInstance];
    if (tpPhases && tpPhases[phaseName]) {
      params = tpPhases[phaseName].map(function (p) {
        return {
          name: p.name,
          value: "",
          param_type:
            p.type === "Material" ? "ProcessInput" : "ProcessParameter",
          material_id: "",
        };
      });
    }
  } else {
    var procPhases = MODEL.processes[proc] ? MODEL.processes[proc].phases : {};
    if (procPhases[phaseName]) {
      params = procPhases[phaseName].map(function (p) {
        return {
          name: p.name,
          value: "",
          param_type:
            p.type === "Material" ? "ProcessInput" : "ProcessParameter",
          material_id: "",
        };
      });
    }
  }

  var ph = {
    label: phaseName,
    phase_type: phaseType,
    parent_instance: parentInstance,
    description: "",
    params: params,
    _label: "",
    _reId: allocateRecipeElementId(),
  };

  var op = currentRecipeData.unit_procedures[u].operations[o],
    inserted = false;
  if (pickerCtx.branchTargetId) {
    var isTransitionTarget =
        pickerCtx.branchTargetId.indexOf("transition:") === 0,
      isJoinTarget = pickerCtx.branchTargetId.indexOf("join:") === 0;
    var nodeResult =
      isJoinTarget && typeof insertItemAfterJoin === "function"
        ? insertItemAfterJoin(op, pickerCtx.branchTargetId.substring(5), ph)
        : isTransitionTarget && typeof insertItemAfterTransition === "function"
          ? insertItemAfterTransition(
              op,
              pickerCtx.branchTargetId.substring(11),
              ph,
            )
          : typeof insertItemAfterNode === "function"
            ? insertItemAfterNode(op, pickerCtx.branchTargetId, ph)
            : { ok: false, reason: "Node insertion is unavailable." };
    if (!nodeResult.ok) {
      alert(
        "Could not add after the selected " +
          (isJoinTarget ? "join" : "node") +
          ": " +
          (nodeResult.reason || "unknown graph error"),
      );
      return;
    }
    inserted = true;
  } else
    inserted =
      afterIdx >= 0
        ? insertPhaseAfter(op, op.phases[afterIdx]._reId, ph)
        : appendPhaseToOperation(op, ph);
  if (!inserted) {
    alert(
      "Could not add the phase because its control-link insertion point could not be found.",
    );
    return;
  }

  /* A newly-created Operation has no pre-existing Phase XML node. Commit its first
     insertion immediately through the structural serializer, then reattach and redraw
     from that authoritative XML. Existing non-empty Phase paths retain their proven flow. */
  if (
    op.phases.length === 1 &&
    typeof saveFromRawXMLStructural === "function" &&
    currentRecipeData &&
    currentRecipeData._xmlDoc
  ) {
    try {
      var committedXml = saveFromRawXMLStructural(currentRecipeData),
        fresh = parseB2MML(committedXml);
      if (!fresh)
        throw new Error("The inserted first item could not be reparsed.");
      var committedDoc = new DOMParser().parseFromString(
        committedXml,
        "text/xml",
      );
      if (committedDoc.getElementsByTagName("parsererror")[0])
        throw new Error("The inserted first item produced invalid XML.");
      xmlAuthorityAttach(fresh, committedDoc, committedXml);
      xmlAuthorityReplaceCurrent(fresh);
    } catch (commitError) {
      alert(
        "Could not commit the first item: " +
          ((commitError && commitError.message) || "unknown XML error"),
      );
      return;
    }
  }
  closePicker();
  renderAll();
}

function closePicker() {
  document.getElementById("phasePicker").classList.remove("show");
  pickerCtx = null;
}

// Close picker on outside click (with guard to prevent same-tick close)
document.addEventListener("click", function (e) {
  if (!pickerCtx) return;
  if (
    !e.target.closest(".phase-picker") &&
    !e.target.closest(".dd-item") &&
    !e.target.closest(".dropdown") &&
    !e.target.closest(".act-btn")
  ) {
    closePicker();
  }
});

/* ==========================================================================
 * Former file: js/process-class-picker.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// process-class-picker.js - Explicit process-class selection for Equipment Requirements.
var processClassPickerOpen = false;
var processClassPickerChoices = [];
function showProcessClassPicker(classes) {
  var picker = document.getElementById("processClassPicker"),
    body = document.getElementById("processClassPickerBody");
  if (!picker || !body) return;
  var list = Array.isArray(classes) ? classes : availableProcessClasses();
  processClassPickerChoices = list.slice();
  var h =
    '<div style="padding:7px 8px;color:#666;font-size:0.84em">Select a process class to add. No class is added until you select it.</div>';
  list.forEach(function (processClass) {
    h +=
      '<div class="phase-picker-item proc" onclick="addSelectedEqProc(\'' +
      esc(processClass) +
      '\')"><div class="pk-name">' +
      esc(processClass) +
      "</div></div>";
  });
  body.innerHTML = h;
  // Unlike the phase picker, this picker has no triggering row to anchor to.
  // Centre it explicitly so a fixed-position element cannot open below the viewport.
  picker.style.top = "50%";
  picker.style.left = "50%";
  picker.style.transform = "translate(-50%,-50%)";
  picker.classList.add("show");
  processClassPickerOpen = true;
}
function closeProcessClassPicker() {
  var picker = document.getElementById("processClassPicker");
  if (picker) picker.classList.remove("show");
  processClassPickerOpen = false;
  processClassPickerChoices = [];
}
document.addEventListener("click", function (event) {
  if (!processClassPickerOpen) return;
  if (
    !event.target.closest(".phase-picker") &&
    !event.target.closest(".act-btn")
  )
    closeProcessClassPicker();
});

/* ==========================================================================
 * Former file: js/lane-zoom.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

// lane-zoom.js - independent visual zoom for the three lane-view columns.
// View-only state: it is never written to the recipe model or exported XML.
var laneZoomLevels = { up: 100, op: 100, ph: 100 };
function laneZoomKey(key) {
  return key === "up" || key === "op" || key === "ph" ? key : null;
}
function laneZoomBodyId(key) {
  return { up: "laneUPList", op: "laneOpList", ph: "lanePhList" }[key];
}
function laneZoomApply(key) {
  key = laneZoomKey(key);
  if (!key) return;
  var body = document.getElementById(laneZoomBodyId(key)),
    value = laneZoomLevels[key];
  if (body) {
    body.style.zoom = value / 100;
    body.setAttribute("data-zoom", value);
  }
  var label = document.getElementById("laneZoomLabel_" + key);
  if (label) label.textContent = value + "%";
  var out = document.getElementById("laneZoomOut_" + key),
    inn = document.getElementById("laneZoomIn_" + key);
  if (out) out.disabled = value <= 60;
  if (inn) inn.disabled = value >= 160;
}
function laneZoomChange(key, delta) {
  key = laneZoomKey(key);
  if (!key) return;
  laneZoomLevels[key] = Math.max(
    60,
    Math.min(160, laneZoomLevels[key] + delta),
  );
  laneZoomApply(key);
}
function laneZoomReset(key) {
  key = laneZoomKey(key);
  if (!key) return;
  laneZoomLevels[key] = 100;
  laneZoomApply(key);
}
function laneZoomControls(key, label) {
  return (
    '<span class="lane-zoom" aria-label="Zoom ' +
    label +
    ' lane"><button id="laneZoomOut_' +
    key +
    '" type="button" title="Zoom out ' +
    label +
    ' lane" aria-label="Zoom out ' +
    label +
    ' lane" onclick="event.stopPropagation();laneZoomChange(\'' +
    key +
    '\',-10)">−</button><button id="laneZoomLabel_' +
    key +
    '" type="button" title="Reset ' +
    label +
    ' lane zoom" aria-label="Reset ' +
    label +
    ' lane zoom" onclick="event.stopPropagation();laneZoomReset(\'' +
    key +
    '\')">100%</button><button id="laneZoomIn_' +
    key +
    '" type="button" title="Zoom in ' +
    label +
    ' lane" aria-label="Zoom in ' +
    label +
    ' lane" onclick="event.stopPropagation();laneZoomChange(\'' +
    key +
    "',10)\">+</button></span>"
  );
}
function applyAllLaneZoom() {
  laneZoomApply("up");
  laneZoomApply("op");
  laneZoomApply("ph");
}

/* ==========================================================================
 * Former file: js/lane.js
 * Responsibility retained here: see the file header in this section.
 * ========================================================================== */

function v1210aToggle(id, e) {
  if (e) e.stopPropagation();
  var x = document.getElementById(id);
  if (x) x.classList.toggle("is-open");
}
// ============================================================================
// lane.js - Lane View (3-column: Unit Procedures | Operations | Phases)
// CORRECTED: Matches your working list view structure (lowercase properties)
// ============================================================================

function laneBoundary(kind, title) {
  return (
    '<div class="lane-boundary lane-boundary-' +
    kind +
    '"><span class="lane-boundary-mark">' +
    (kind === "start" ? "\u25B6" : "\u25A0") +
    "</span><span>" +
    esc(kind === "start" ? "Start: " + title : "End") +
    "</span></div>"
  );
}

function renderLaneView() {
  if (!currentRecipeData) return;
  var d = currentRecipeData;
  var u = laneSelectedUP;
  var h = "";
  if (editMode) {
    h +=
      '<div style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right"><button class="act-btn" onclick="addFirstUP()">+ Add Unit Procedure</button></div>';
  }
  h += laneBoundary("start", d.id || "Recipe");
  if (!d.unit_procedures.length) {
    h +=
      '<div style="color:#999;padding:12px;text-align:center">No unit procedures</div>';
  }
  for (var i = 0; i < d.unit_procedures.length; i++) {
    var up = d.unit_procedures[i];
    var tph = 0;
    for (var oi = 0; oi < up.operations.length; oi++)
      tph += up.operations[oi].phases.length;
    h += '<div class="lane-arrow">\u25BC</div>';
    h +=
      '<div class="lane-item' +
      (i === u ? " selected" : "") +
      '" onclick="selectLaneUP(' +
      i +
      ')">';
    h +=
      '<div style="display:flex;justify-content:space-between;align-items:center">';
    h +=
      '<div><span class="li-num">' +
      (i + 1) +
      '.</span><span class="li-name' +
      (editMode ? " editable" : "") +
      '"' +
      (editMode
        ? ' onclick="event.stopPropagation();editUPName(' + i + ',this)"'
        : "") +
      ">" +
      esc(up.name) +
      "</span>";
    if (editMode) {
      var requirements = equipmentRequirements();
      h +=
        '<select class="li-tag" onclick="event.stopPropagation()" onchange="updUPProcess(' +
        i +
        ',this.value)">';
      requirements.forEach(function (req) {
        var processClass = req.id || req.process || "";
        h += '<optgroup label="' + esc(processClass) + '">';
        requirementInstances(req).forEach(function (instance) {
          h +=
            '<option value="' +
            esc(instance.name) +
            '"' +
            (instance.name === up.process ? " selected" : "") +
            ">" +
            esc(instance.name) +
            "</option>";
        });
        h += "</optgroup>";
      });
      h += "</select>";
    } else h += '<span class="li-tag">' + esc(up.process) + "</span>";
    h += "</div>";
    h += '<div style="display:flex;align-items:center;gap:2px">';
    h +=
      '<span class="li-meta">' +
      up.operations.length +
      "op/" +
      tph +
      "ph</span>";
    if (editMode) {
      h +=
        '<div class="act-bar" style="display:inline-flex" onclick="event.stopPropagation()"><button class="act-btn" onclick="event.stopPropagation();moveUP(' +
        i +
        ',-1)">\u25B2</button><button class="act-btn" onclick="event.stopPropagation();moveUP(' +
        i +
        ',1)">\u25BC</button><button class="act-btn danger" onclick="removeUP(' +
        i +
        ')">\u2716</button><button class="act-btn" onclick="addOp(' +
        i +
        ')">+ Op</button></div>';
    }
    h += "</div></div></div>";
  }
  h += '<div class="lane-arrow">\u25BC</div>' + laneBoundary("end", "");
  document.getElementById("laneUPList").innerHTML = h;
  renderLaneOps();
}

// Select a Unit Procedure in lane view and reset the operation selection.
function selectLaneUP(i) {
  laneSelectedUP = i;
  laneSelectedOp = 0;
  renderLaneView();
}

function renderLaneOps() {
  if (
    !currentRecipeData ||
    !currentRecipeData.unit_procedures ||
    laneSelectedUP < 0 ||
    laneSelectedUP >= currentRecipeData.unit_procedures.length
  ) {
    document.getElementById("laneOpList").innerHTML = "";
    document.getElementById("lanePhList").innerHTML = "";
    return;
  }
  var up = currentRecipeData.unit_procedures[laneSelectedUP],
    u = laneSelectedUP,
    h = laneBoundary("start", up.name || "Unit Procedure");
  if (!up.operations.length)
    h +=
      '<div style="color:#999;padding:12px;text-align:center">No operations</div>';
  for (var o = 0; o < up.operations.length; o++) {
    var op = up.operations[o],
      id = op._reId || "op-" + o,
      selected = o === laneSelectedOp;
    h +=
      typeof operationDropHtml === "function" ? operationDropHtml(u, id) : "";
    h +=
      typeof operationTransitionDropHtml === "function"
        ? operationTransitionDropHtml(u, id)
        : "";
    h +=
      '<div class="lane-item graph-move-card' +
      (selected ? " selected" : "") +
      '" onclick="selectLaneOp(' +
      o +
      ')">';
    var metaId = "operationMeta_" + u + "_" + o;
    h +=
      '<div class="v1210a-card-head"><div class="lph-name v1210a-title">' +
      (editMode
        ? '<span class="graph-drag-handle operation-drag-handle" draggable="false" data-operation-u="' +
          u +
          '" data-operation-id="' +
          esc(id) +
          '" title="Hold and drag Operation to a highlighted boundary">⠿</span>'
        : "") +
      '<span class="li-num">' +
      (o + 1) +
      '.</span><span class="li-name">' +
      esc(op.name || "Operation") +
      '</span><span class="node-id-badge" title="AVEVA Operation RecipeElement ID">#' +
      esc(id) +
      "</span></div>";
    h +=
      '<div class="act-bar v1210a-actions"><span class="li-meta">' +
      op.phases.length +
      "ph</span>" +
      (editMode
        ? '<button class="act-btn" title="Show or hide Operation details" onclick="event.stopPropagation();v1210aToggle(\'' +
          metaId +
          "',event)\">?</button>" +
          operationActionMenuHtml(u, o)
        : "") +
      "</div></div>";
    if (editMode)
      h +=
        '<div id="' +
        metaId +
        '" class="v1210a-meta">Name <input class="inline-edit" value="' +
        esc(op.name || "") +
        '" onchange="updOperationCardName(' +
        u +
        "," +
        o +
        ',this.value)"> · Label / node ID <input class="inline-edit" value="' +
        esc(id) +
        '" readonly title="AVEVA Operation identity; this recipe format has no separate Operation Label field"></div>';
    h += "</div>";
    var ot = up._operationTransitions && up._operationTransitions[id];
    if (ot) {
      var tm = "operationTransition_" + u + "_" + ot.id;
      h +=
        '<div class="lane-ph lane-transition-node operation-transition-node"><div class="v1210a-card-head"><div class="lph-name v1210a-title">' +
        (editMode && !ot.loopTo
          ? '<span class="operation-transition-drag-handle" data-operation-u="' +
            u +
            '" data-transition-id="' +
            esc(ot.id) +
            '" title="Hold and drag Transition to an Operation boundary">⠿</span>'
          : "") +
        '◆ Operation Transition <span class="node-id-badge">#' +
        esc(ot.id) +
        "</span></div>" +
        (editMode
          ? '<div class="act-bar v1210a-actions"><button class="act-btn" title="Show or hide Operation Transition details" onclick="v1210aToggle(\'' +
            tm +
            "',event)\">?</button>" +
            operationTransitionMenuHtml(u, ot.id) +
            "</div>"
          : "") +
        '</div><div class="lph-desc">' +
        esc(ot.condition || "") +
        (ot.loopTo ? " · ↺ loop to #" + esc(ot.loopTo) : "") +
        "</div>" +
        (editMode
          ? '<div id="' +
            tm +
            '" class="v1210a-transition-meta"><div class="lph-parent">Native Transition ID <input class="inline-edit" value="' +
            esc(ot.id) +
            '" readonly></div><div class="lph-parent">Condition <input class="inline-edit" value="' +
            esc(ot.condition || "") +
            '" onchange="operationTransitionCondition(' +
            u +
            ",'" +
            esc(ot.id) +
            "',this.value)\"></div></div>"
          : "") +
        "</div>";
      var br = (up._operationBranches || []).filter(function (x) {
        return String(x.id) === String(ot.id);
      })[0];
      if (br) h += operationBranchHtml(u, br);
    }
    h += '<div class="lane-arrow">▼</div>';
  }
  h +=
    typeof operationDropHtml === "function"
      ? operationDropHtml(u, "__end__")
      : "";
  h +=
    typeof operationTransitionDropHtml === "function"
      ? operationTransitionDropHtml(u, "__end__")
      : "";
  h += laneBoundary("end", "");
  document.getElementById("laneOpList").innerHTML = h;
  renderLanePhases();
}
function opReadOnlyLabel(op) {
  return (
    typeof isReadOnlyBranchOperation === "function" &&
    isReadOnlyBranchOperation(op)
  );
}

function updOperationCardName(u, o, value) {
  var op =
    currentRecipeData &&
    currentRecipeData.unit_procedures[u] &&
    currentRecipeData.unit_procedures[u].operations[o];
  if (!op || !window.requestOperationRename) return;
  requestOperationRename({
    unitProcedureIndex: u,
    operationId: String(op._reId),
    name: value,
  });
}
function operationActionMenuHtml(u, o) {
  return (
    '<div class="act-more node-more" onclick="event.stopPropagation();toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for Operation ' +
    (o + 1) +
    '">⋮</button><div class="dropdown"><div class="dd-label">Operation · graph node</div><div class="dd-item" onclick="operationInsertAfter(' +
    u +
    "," +
    o +
    ')">Insert Operation after this node</div><div class="dd-sep"></div><div class="dd-item" onclick="operationInsertTransition(' +
    u +
    "," +
    o +
    ')">◆ Insert Transition after this Operation</div><div class="dd-item" onclick="operationCreateLoop(' +
    u +
    "," +
    o +
    ')">↺ Create loop after this Operation</div><div class="dd-item" onclick="showOperationBranchAfterNodePicker(' +
    u +
    "," +
    o +
    ',this)">⑂ Create branch after this Operation</div><div class="dd-sep"></div><div class="dd-item danger" onclick="operationDelete(' +
    u +
    "," +
    o +
    ')">Delete Operation</div></div></div>'
  );
}
function operationAddBefore(u, o) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  if (op && window.requestOperationAdd)
    requestOperationAdd({
      unitProcedureIndex: u,
      anchorOperationId: String(op._reId),
    });
}
function operationInsertAfter(u, o) {
  var ops = currentRecipeData.unit_procedures[u].operations,
    after = ops[o + 1],
    anchor = after ? String(after._reId) : "__end__";
  if (window.requestOperationAdd)
    requestOperationAdd({ unitProcedureIndex: u, anchorOperationId: anchor });
}
function operationCreateLoop(u, o) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  if (op && window.requestOperationLoop)
    requestOperationLoop({
      unitProcedureIndex: u,
      operationId: String(op._reId),
    });
}
function operationDelete(u, o) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  if (!op || !window.requestOperationDelete) return;
  if (confirm("Delete Operation " + (op.name || "") + "?"))
    requestOperationDelete({
      unitProcedureIndex: u,
      operationId: String(op._reId),
    });
}
function operationInsertTransition(u, o) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  if (op && window.requestOperationTransition)
    requestOperationTransition({
      unitProcedureIndex: u,
      operationId: String(op._reId),
    });
}
function operationBranchHtml(u, b) {
  var h =
    '<section class="lane-branch lane-branch-operation"><div class="lane-branch-fork"><span class="lane-branch-symbol">' +
    (b.mode === "All" ? "⇱" : "◇") +
    "</span><span><strong>Fork</strong> · " +
    (b.mode === "All"
      ? "Parallel branches · All"
      : "Serial branches · Single") +
    '</span></div><div class="lane-branch-lanes">';
  for (var i = 0; i < b.lanes.length; i++) {
    var id = b.lanes[i];
    h +=
      '<div class="lane-branch-lane"><div class="lane-branch-label">Branch ' +
      String.fromCharCode(65 + i) +
      '</div><div class="lane-dummy"><div class="lane-dummy-title"><span class="lane-dummy-symbol">＋</span><span>Empty operation lane</span><span class="node-id-badge">#' +
      esc(id) +
      '</span></div><div class="lane-dummy-help">Insert the first Operation in this branch lane.</div>' +
      (editMode
        ? '<div class="act-bar lane-dummy-actions"><button class="act-btn" onclick="showOperationLanePicker(' +
          u +
          ",'" +
          esc(b.id) +
          "','" +
          esc(id) +
          "',this)\">⋮</button></div>"
        : "") +
      "</div></div>";
  }
  return (
    h +
    '</div><div class="lane-branch-join"><span class="lane-branch-symbol">⇲</span><span><strong>Join</strong> · ' +
    esc(b.join || "convergent") +
    "</span></div></section>"
  );
}
function operationTransitionMenuHtml(u, tid) {
  return (
    '<div class="act-more node-more" onclick="event.stopPropagation();toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for Operation Transition ' +
    esc(tid) +
    '">⋮</button><div class="dropdown"><div class="dd-label">Transition · #' +
    esc(tid) +
    '</div><div class="dd-item" onclick="showOperationPicker(' +
    u +
    ",'" +
    esc(tid) +
    '\',this)">Insert Operation after this Transition</div><div class="dd-item" onclick="operationTransitionInsertTransition(' +
    u +
    ",'" +
    esc(tid) +
    '\')">◆ Insert Transition after this Transition</div><div class="dd-item" onclick="showOperationLoopPicker(' +
    u +
    ",'" +
    esc(tid) +
    '\',this)">↺ Create loop after this Transition</div><div class="dd-item danger" onclick="operationTransitionDelete(' +
    u +
    ",'" +
    esc(tid) +
    '\')">Delete Transition</div><div class="dd-sep"></div><div class="dd-item" onclick="showOperationBranchPicker(' +
    u +
    ",'" +
    esc(tid) +
    "',this)\">⑂ Create branch after this Transition</div></div></div>"
  );
}
function operationTransitionDelete(u, tid) {
  if (window.requestOperationTransitionDelete)
    window.requestOperationTransitionDelete({
      unitProcedureIndex: u,
      transitionId: String(tid),
    });
}
function operationTransitionInsertTransition(u, tid) {
  if (window.requestOperationTransitionAfterTransition)
    window.requestOperationTransitionAfterTransition({
      unitProcedureIndex: u,
      transitionId: String(tid),
    });
}
function operationTransitionCondition(u, tid, value) {
  if (window.requestOperationTransitionCondition)
    window.requestOperationTransitionCondition({
      unitProcedureIndex: u,
      transitionId: String(tid),
      condition: value,
    });
}
function emptyOperationMenuHtml(u, o) {
  return (
    '<div class="act-more node-more" onclick="toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for empty Operation" title="Add first item">⋮</button><div class="dropdown"><div class="dd-label">Empty operation</div><div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ',\'Process\',this)">Insert Process Phase</div><div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ',\'Transfer\',this)">Insert Transfer</div><div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ',\'AllocateProcess\',this)">Insert Allocate Process</div><div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ',\'ReleaseProcess\',this)">Insert Release Process</div><div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ',\'AllocateTransfer\',this)">Insert Allocate Transfer</div><div class="dd-item" onclick="addPhaseToOp(' +
    u +
    "," +
    o +
    ",'ReleaseTransfer',this)\">Insert Release Transfer</div></div></div>"
  );
}

function selectLaneOp(o) {
  laneSelectedOp = o;
  renderLaneOps();
}

function buildLanePhaseHtml(
  ph,
  up,
  u,
  o,
  pi,
  transAfter,
  loopBacks,
  readOnly,
  moveState,
  suppressTransitions,
) {
  if (ph && ph._dummy)
    return buildLaneDummyHtml(ph, up, u, o, pi, suppressTransitions);
  var graphId = laneNodeKey(ph);
  var h =
    typeof movementPhaseDropHtml === "function"
      ? movementPhaseDropHtml(u, o, graphId)
      : "";
  var isX = ph.phase_type === "Transfer";
  var isA =
    (ph.phase_type || "").indexOf("Allocate") >= 0 ||
    (ph.phase_type || "").indexOf("Release") >= 0;
  var cls = "lane-ph";
  if (isA) cls += " alloc";
  else if (isX) cls += " xfer";
  h +=
    '<div class="' +
    cls +
    ' graph-move-card" data-node-id="' +
    esc(graphId) +
    '">';
  h += '<div class="v1210a-card-head">';
  if (editMode)
    h +=
      '<span class="graph-drag-handle movement-phase-drag-handle" draggable="false" data-phase-u="' +
      u +
      '" data-phase-o="' +
      o +
      '" data-phase-id="' +
      esc(graphId) +
      '" title="Hold and drag Phase to a highlighted graph boundary">⠿</span>';
  h +=
    '<div class="lph-name v1210a-title">' +
    esc(ph.label || "(unnamed)") +
    (isX
      ? '<span class="lph-badge" style="background:#e8eaf6;color:#36398E">XFER</span>'
      : isA
        ? '<span class="lph-badge" style="background:#f5f5f5;color:#777">' +
          (ph.phase_type.indexOf("Release") === 0 ? "RELEASE" : "ALLOC") +
          "</span>"
        : '<span class="lph-badge" style="background:#e8f5e9;color:#009F3C">PROC</span>') +
    '<span class="node-id-badge" title="AVEVA RecipeElement ID">#' +
    esc(laneNodeKey(ph)) +
    "</span></div>";
  if (editMode) {
    var metaId = "v1210aPhase_" + u + "_" + o + "_" + pi;
    h +=
      '<div class="act-bar v1210a-actions"><button class="act-btn" title="Show or hide Name and Label" onclick="v1210aToggle(\'' +
      metaId +
      "',event)\">?</button>" +
      (moveState && moveState.up
        ? '<button class="act-btn" title="Move earlier" onclick="movePh(' +
          u +
          "," +
          o +
          "," +
          pi +
          ',-1)">▲</button>'
        : "") +
      (moveState && moveState.down
        ? '<button class="act-btn" title="Move later" onclick="movePh(' +
          u +
          "," +
          o +
          "," +
          pi +
          ',1)">▼</button>'
        : "") +
      (!readOnly
        ? typeof ddPh === "function"
          ? ddPh(u, o, pi)
          : ""
        : typeof ddNode === "function"
          ? ddNode(u, o, laneNodeKey(ph), "Node")
          : "") +
      "</div>";
  }
  h += "</div>";
  if (editMode)
    h +=
      '<div id="' +
      metaId +
      '" class="lph-parent v1210a-meta">Name <input class="inline-edit" value="' +
      esc(ph.label || "") +
      '" onchange="updPhaseMeta(' +
      u +
      "," +
      o +
      "," +
      pi +
      ',\'label\',this.value)"> · Label <input class="inline-edit" value="' +
      esc(ph._label || "") +
      '" onchange="updPhaseMeta(' +
      u +
      "," +
      o +
      "," +
      pi +
      ",'_label',this.value)\"></div>";
  if (ph.description) {
    if (editMode && !readOnly)
      h +=
        '<div class="lph-desc editable" onclick="editPhDesc(' +
        u +
        "," +
        o +
        "," +
        pi +
        ',this)">' +
        ph.description +
        "</div>";
    else h += '<div class="lph-desc">' + ph.description + "</div>";
  } else if (editMode && !readOnly) {
    h +=
      '<div class="lph-desc editable" onclick="editPhDesc(' +
      u +
      "," +
      o +
      "," +
      pi +
      ',this)" style="color:#ccc">+ description</div>';
  }
  if (ph.parent_instance && (isA || ph.parent_instance !== up.process))
    h +=
      '<div class="lph-parent">' +
      (isA ? "Target: " : "↗ ") +
      esc(ph.parent_instance) +
      "</div>";
  if (ph.params && ph.params.length) {
    h += '<div class="lph-params">';
    for (var i = 0; i < ph.params.length; i++) {
      var p = ph.params[i] || {};
      var isMat = p.param_type === "ProcessInput" || p.material_id;
      var materialLabel = p.material_id
        ? matName(p.material_id) || p.material_id
        : "";
      var meta = [];
      if (p.param_type) meta.push(p.param_type);
      if (p.unit) meta.push(p.unit);
      if (p.description) meta.push(p.description);
      h += '<div class="lph-param' + (isMat ? " is-material" : "") + '">';
      h +=
        '<div class="lph-param-head"><span class="pn">' +
        esc(p.name || "Unnamed parameter") +
        "</span>" +
        (meta.length
          ? '<span class="lph-param-meta">' + esc(meta.join(" · ")) + "</span>"
          : "") +
        "</div>";
      if (isMat) {
        if (editMode && !readOnly) {
          h +=
            '<label class="lph-field-label">Material</label><div class="mat-ac"><input id="phMatAc_' +
            u +
            "_" +
            o +
            "_" +
            pi +
            "_" +
            i +
            '" value="' +
            esc(materialLabel) +
            '" onfocus="openPhMatAc(' +
            u +
            "," +
            o +
            "," +
            pi +
            "," +
            i +
            ')" oninput="filterPhMatAc(' +
            u +
            "," +
            o +
            "," +
            pi +
            "," +
            i +
            ',this.value)" onblur="setTimeout(function(){closePhMatAc()},200)" autocomplete="off" placeholder="material..."></div>';
        } else
          h +=
            '<div class="lph-material">[' +
            esc(materialLabel || "—") +
            "]</div>";
      }
      if (editMode && !readOnly)
        h +=
          '<label class="lph-field-label">Value</label><input class="inline-edit lph-value-input" value="' +
          esc(p.value == null ? "" : String(p.value)) +
          '" onchange="updPVal(' +
          u +
          "," +
          o +
          "," +
          pi +
          "," +
          i +
          ',this.value)" placeholder="value">';
      else
        h +=
          '<div class="lph-value">' +
          esc(p.value == null || p.value === "" ? "—" : String(p.value)) +
          "</div>";
      h += "</div>";
    }
    h += "</div>";
  }
  h += "</div>";
  // Transition is rendered as its own selectable card, not as metadata inside this node.
  if (!suppressTransitions)
    h +=
      typeof transitionNodesAfterStep === "function"
        ? transitionNodesAfterStep(
            currentRecipeData.unit_procedures[u].operations[o],
            laneNodeKey(ph),
            u,
            o,
          )
        : "";
  return h;
}

function buildLaneDummyHtml(ph, up, u, o, pi, suppressTransitions) {
  var id = laneNodeKey(ph),
    isEntry = !!ph._branchEntryConnector,
    isExit = !!ph._branchJoinConnector,
    currentOp = (currentRecipeData &&
      currentRecipeData.unit_procedures &&
      currentRecipeData.unit_procedures[u] &&
      currentRecipeData.unit_procedures[u].operations &&
      currentRecipeData.unit_procedures[u].operations[o]) || { links: [] },
    links = currentOp.links || [],
    isLoopReturn = links.some(function (link) {
      return (
        link.type === "Other" &&
        link.from_type === "Transition" &&
        link.to_type === "Step" &&
        link.to_re_id === id
      );
    }),
    returnTransition =
      (
        links.filter(function (link) {
          return (
            link.type === "Other" &&
            link.from_type === "Transition" &&
            link.to_type === "Step" &&
            link.to_re_id === id
          );
        })[0] || {}
      ).from_id || "",
    isTransitionEntry = links.some(function (link) {
      return (
        link.type === "ControlLink" &&
        link.from_type === "Step" &&
        link.from_re_id === id &&
        link.to_type === "Transition"
      );
    }),
    title = isLoopReturn
      ? "Loop return point"
      : isEntry || isTransitionEntry
        ? "Branch entry"
        : isExit
          ? "Post-join continuation"
          : "Empty branch lane",
    help = isLoopReturn
      ? "Fixed return anchor for Transition #" +
        returnTransition +
        ". This point is not draggable or directly editable."
      : isTransitionEntry
        ? "Retained Branch entry position. The following Transition may loop back here."
        : isEntry
          ? "Selectable branch-entry node. Add or nest items here."
          : isExit
            ? "Selectable post-join node. Add the next item here."
            : "Add the first Process Phase or Transfer here.",
    symbol = isLoopReturn
      ? "↺"
      : isEntry || isTransitionEntry
        ? "⇣"
        : isExit
          ? "⇢"
          : "＋",
    h =
      '<div class="lane-dummy' +
      (isLoopReturn ? " lane-loop-return" : "") +
      '" data-node-id="' +
      esc(id) +
      '">';
  h +=
    '<div class="lane-dummy-title"><span class="lane-dummy-symbol">' +
    symbol +
    "</span><span>" +
    title +
    '</span><span class="node-id-badge" title="AVEVA RecipeElement ID">#' +
    esc(id) +
    "</span></div>";
  h += '<div class="lane-dummy-help">' + help + "</div>";
  // An Other Link targeting this DUMMY is AVEVA's native loop-return signature.
  // It is a real XML node but is a fixed anchor, never an editable empty lane.
  if (!isLoopReturn && editMode && typeof ddNode === "function")
    h +=
      '<div class="act-bar lane-dummy-actions">' +
      ddNode(u, o, id, title) +
      "</div>";
  else if (
    !isLoopReturn &&
    editMode &&
    typeof branchLaneMenuHtml === "function"
  ) {
    var fallbackMenu = branchLaneMenuHtml(u, o, id);
    if (fallbackMenu)
      h += '<div class="act-bar lane-dummy-actions">' + fallbackMenu + "</div>";
  }
  h += "</div>";
  return (
    h +
    (!suppressTransitions && typeof transitionNodesAfterStep === "function"
      ? transitionNodesAfterStep(
          currentRecipeData.unit_procedures[u].operations[o],
          id,
          u,
          o,
        )
      : "")
  );
}

// Preserve an AVEVA Transition that is directly after Begin when a formerly
// branched operation has become linear after deletion.
function laneInitialTransitionHtml(op, u, o) {
  var link = ((op && op.links) || []).filter(function (l) {
    return (
      l.type === "ControlLink" &&
      l.from_type === "Step" &&
      l.from_re_id === op._beginReId &&
      l.to_type === "Transition" &&
      l.to_id
    );
  })[0];
  return link && typeof transitionNodeHtml === "function"
    ? transitionNodeHtml(op, u, o, link.to_id)
    : "";
}
function laneNodeKey(ph) {
  return ph._reId || ph.node_id || ph.label;
}

function lanePhaseById(op, id) {
  for (var i = 0; i < op.phases.length; i++)
    if (laneNodeKey(op.phases[i]) === id)
      return { phase: op.phases[i], index: i };
  return null;
}

function laneBranchEndpointName(op, id) {
  var found = lanePhaseById(op, id);
  if (found) return found.phase.label;
  if (op && id === op._beginReId) return "Begin";
  if (op && id === op._endReId) return "End";
  return id || "the branch endpoint";
}

function renderReadOnlyBranchRegion(
  region,
  op,
  up,
  u,
  o,
  transAfter,
  loopBacks,
) {
  var isAll = region.mode === "All";
  var h =
    '<section class="lane-branch lane-branch-readonly lane-branch-' +
    (isAll ? "all" : "single") +
    '" aria-label="Closed ' +
    (isAll ? "parallel" : "serial") +
    ' branch">';
  h +=
    '<div class="lane-branch-fork"><span class="lane-branch-symbol">' +
    (isAll ? "⇱" : "◇") +
    "</span><span><strong>Fork</strong> · " +
    (isAll
      ? "Parallel branches · <strong>All</strong>"
      : "Serial branches · <strong>Single</strong>") +
    "</span>";
  h +=
    '<span class="lane-branch-mode">' +
    (isAll ? "Execute all" : "Execute one") +
    "</span>";
  if (
    editMode &&
    typeof branchCollapseEligibility === "function" &&
    branchCollapseEligibility(op, region.forkSource).ok
  )
    h +=
      '<button class="lane-branch-remove" title="Remove this complete branch" onclick="event.stopPropagation();requestBranchCollapse(' +
      u +
      "," +
      o +
      ",'" +
      region.forkSource +
      "')\">Remove branch</button>";
  h += "</div>";
  // Serial / Single has the same side-by-side lane layout as Parallel / All.
  // Its AVEVA execution semantics remain Serial in the ProcedureLogic links.
  h += '<div class="lane-branch-lanes">';
  for (var laneIndex = 0; laneIndex < region.lanes.length; laneIndex++) {
    var branch = region.lanes[laneIndex];
    var laneMenu =
      editMode && typeof branchLaneDeleteMenuHtml === "function"
        ? '<span class="act-bar">' +
          branchLaneDeleteMenuHtml(u, o, region.forkSource, laneIndex) +
          "</span>"
        : "";
    h +=
      '<div class="lane-branch-lane"><div class="lane-branch-label">Branch ' +
      branch.label +
      laneMenu +
      "</div>";
    for (var phaseIndex = 0; phaseIndex < branch.phases.length; phaseIndex++) {
      var found = lanePhaseById(op, branch.phases[phaseIndex]);
      if (found)
        h += buildLanePhaseHtml(
          found.phase,
          up,
          u,
          o,
          found.index,
          transAfter,
          loopBacks,
          true,
          typeof movementArrowCapabilities === "function"
            ? movementArrowCapabilities(op, laneNodeKey(found.phase))
            : { up: false, down: false },
        );
    }
    if (editMode && typeof movementLaneJoinDropHtml === "function")
      h += movementLaneJoinDropHtml(u, o, region.forkSource, laneIndex);
    h += "</div>";
  }
  var successor = laneBranchEndpointName(op, region.joinTarget);
  h +=
    '</div><div class="lane-branch-join"><span class="lane-branch-symbol">⇲</span><span><strong>Join</strong> · ' +
    (isAll ? "Parallel" : "Serial") +
    " convergent</span>";
  h +=
    '<span class="lane-branch-continues">' +
    (isAll ? "All branches continue" : "Selected option continues") +
    (successor === "End"
      ? " to <strong>End</strong>"
      : " to <strong>" + esc(successor) + "</strong>") +
    "</span>";
  if (editMode && typeof universalJoinMenuHtml === "function")
    h +=
      '<span class="act-bar">' +
      universalJoinMenuHtml(u, o, region.forkSource) +
      "</span>";
  h += "</div></section>";
  return h;
}

function renderLanePhases() {
  if (
    !currentRecipeData ||
    !currentRecipeData.unit_procedures ||
    laneSelectedUP < 0 ||
    laneSelectedUP >= currentRecipeData.unit_procedures.length
  ) {
    document.getElementById("lanePhList").innerHTML = "";
    return;
  }
  var u = laneSelectedUP,
    o = laneSelectedOp,
    up = currentRecipeData.unit_procedures[u];
  if (!up || !up.operations || o < 0 || o >= up.operations.length) {
    document.getElementById("lanePhList").innerHTML = "";
    return;
  }
  var op = up.operations[o];
  var h = laneBoundary("start", op.name || "Operation"),
    transAfter = {},
    loopBacks = [];
  if (op.links) {
    for (var li = 0; li < op.links.length; li++) {
      var lk = op.links[li];
      if (lk.type === "Other" && lk.from_type === "Transition")
        loopBacks.push(lk);
      if (lk.to_type === "Transition")
        transAfter[lk.from] = {
          cond: op.transitions ? op.transitions[lk.to_id] || "" : "",
          tid: lk.to_id,
        };
    }
  }

  var nestedHtml =
    typeof renderNestedOperationPhases === "function"
      ? renderNestedOperationPhases(op, up, u, o, transAfter, loopBacks)
      : "";
  if (nestedHtml) {
    h +=
      nestedHtml +
      (editMode && op._endReId && typeof movementNodeDropHtml === "function"
        ? movementNodeDropHtml(
            u,
            o,
            op._endReId,
            "after final item · before End",
          )
        : "") +
      '<div class="lane-arrow">▼</div>' +
      laneBoundary("end", "");
    document.getElementById("lanePhList").innerHTML = h;
    return;
  }

  // Once the final branch region has collapsed, the native graph can be
  // Begin → Transition 9 → surviving Step. The legacy linear pass starts at
  // phases, so explicitly retain that entry Transition before the first card.
  if (typeof laneInitialTransitionHtml === "function")
    h += laneInitialTransitionHtml(op, u, o);
  var regions = collectReadOnlyBranchRegions(op),
    regionAfterFork = {},
    regionBeforePhase = {},
    branchMembers = {};
  for (var r = 0; r < regions.length; r++) {
    var region = regions[r],
      forkIsPhase = !!lanePhaseById(op, region.forkSource);
    if (forkIsPhase) {
      if (!regionAfterFork[region.forkSource])
        regionAfterFork[region.forkSource] = [];
      regionAfterFork[region.forkSource].push(region);
    } else {
      // A Begin fork has no phase card to follow. Insert before the first
      // member encountered in document order, so it appears after Start.
      var firstMember = "";
      for (
        var orderIndex = 0;
        orderIndex < op.phases.length && !firstMember;
        orderIndex++
      ) {
        var candidateId = laneNodeKey(op.phases[orderIndex]);
        for (var laneIndex = 0; laneIndex < region.lanes.length; laneIndex++)
          if (region.lanes[laneIndex].phases.indexOf(candidateId) >= 0) {
            firstMember = candidateId;
            break;
          }
      }
      if (firstMember) {
        if (!regionBeforePhase[firstMember])
          regionBeforePhase[firstMember] = [];
        regionBeforePhase[firstMember].push(region);
      }
    }
    for (var lane = 0; lane < region.lanes.length; lane++)
      for (var p = 0; p < region.lanes[lane].phases.length; p++)
        branchMembers[region.lanes[lane].phases[p]] = true;
  }
  for (var pi = 0; pi < op.phases.length; pi++) {
    var ph = op.phases[pi],
      nodeKey = laneNodeKey(ph);
    if (regionBeforePhase[nodeKey])
      for (
        var beforeIndex = 0;
        beforeIndex < regionBeforePhase[nodeKey].length;
        beforeIndex++
      )
        h += renderReadOnlyBranchRegion(
          regionBeforePhase[nodeKey][beforeIndex],
          op,
          up,
          u,
          o,
          transAfter,
          loopBacks,
        );
    if (branchMembers[nodeKey]) continue;
    h += buildLanePhaseHtml(
      ph,
      up,
      u,
      o,
      pi,
      transAfter,
      loopBacks,
      false,
      typeof movementArrowCapabilities === "function"
        ? movementArrowCapabilities(op, nodeKey)
        : { up: false, down: false },
    );
    if (regionAfterFork[nodeKey])
      for (
        var regionIndex = 0;
        regionIndex < regionAfterFork[nodeKey].length;
        regionIndex++
      )
        h += renderReadOnlyBranchRegion(
          regionAfterFork[nodeKey][regionIndex],
          op,
          up,
          u,
          o,
          transAfter,
          loopBacks,
        );
  }
  if (!op.phases.length) {
    h +=
      '<div class="lane-dummy empty-operation-dummy"><div class="lane-dummy-title"><span class="lane-dummy-symbol">＋</span><span>Empty operation</span><span class="node-id-badge" title="AVEVA Operation Start RecipeElement ID">#' +
      esc(op._beginReId || "") +
      '</span></div><div class="lane-dummy-help">Add the first Process Phase, Transfer, or allocation/release item here.</div>' +
      (editMode
        ? '<div class="act-bar lane-dummy-actions">' +
          emptyOperationMenuHtml(u, o) +
          "</div>"
        : "") +
      "</div>";
  }
  if (editMode && op._endReId && typeof movementNodeDropHtml === "function")
    h += movementNodeDropHtml(
      u,
      o,
      op._endReId,
      "after final item · before End",
    );
  h += '<div class="lane-arrow">▼</div>' + laneBoundary("end", "");
  document.getElementById("lanePhList").innerHTML = h;
}
