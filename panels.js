/**
 * panels.js — HTML for the recipe detail cards and the properties drawer.
 *
 * Pure views. Editable controls carry data-bind="<target>" and buttons carry
 * data-cmd; app.js handles both through one delegated listener, so every
 * change becomes one undoable RecipeDoc.edit().
 */
(function (global) {
  "use strict";
  var BE = (global.BatchEditor = global.BatchEditor || {});
  var esc = function (s) {
    return BE.render.esc(s);
  };

  function field(label, bind, value, edit, opts) {
    opts = opts || {};
    var input;
    if (!edit || opts.readOnly) input = '<div class="ro">' + (esc(value) || '<span class="muted">—</span>') + "</div>";
    else if (opts.options)
      input = '<select data-bind="' + esc(bind) + '">' + opts.options.map(function (o) {
        var v = typeof o === "string" ? o : o.value, l = typeof o === "string" ? o : o.label;
        return '<option value="' + esc(v) + '"' + (v === value ? " selected" : "") + ">" + esc(l) + "</option>";
      }).join("") + "</select>";
    else if (opts.textarea) input = '<textarea rows="3" data-bind="' + esc(bind) + '">' + esc(value) + "</textarea>";
    else input = '<input data-bind="' + esc(bind) + '" value="' + esc(value) + '"' + (opts.type ? ' type="' + opts.type + '"' : "") + ">";
    return '<div class="field"><label>' + esc(label) + "</label>" + input + "</div>";
  }

  function materialLabel(id) {
    var m = BE.materialsById && BE.materialsById[id];
    return m ? m.name + " (" + m.code + ")" : "";
  }

  // ---------------------------------------------------------------- header
  function header(doc, edit) {
    var h = doc.header();
    return (
      '<div class="form-grid">' +
      field("Recipe ID", "header:id", h.id, edit) +
      field("Description", "header:description", h.description, edit) +
      field("Product ID", "header:productId", h.productId, edit) +
      field("Product name", "header:productName", h.productName, edit) +
      field("Batch size nominal", "header:batchNominal", h.batchNominal, edit, { type: "number" }) +
      field("Batch size min", "header:batchMin", h.batchMin, edit, { type: "number" }) +
      field("Batch size max", "header:batchMax", h.batchMax, edit, { type: "number" }) +
      field("Approved for production", "header:approvedProduction", h.approvedProduction || "false", edit, { options: ["false", "true"] }) +
      field("Approved for test", "header:approvedTest", h.approvedTest || "false", edit, { options: ["false", "true"] }) +
      "</div>"
    );
  }

  // ---------------------------------------------------------------- equipment
  function equipment(doc, edit, model) {
    var reqs = doc.requirements();
    var refs = doc.instanceReferences();
    var h = "";
    if (edit) {
      var have = reqs.map(function (r) { return r.processClass; });
      var avail = Object.keys(model.processes || {}).filter(function (c) { return have.indexOf(c) < 0; }).sort();
      h += '<div class="row" style="margin-bottom:8px"><select id="addClassSel" class="inp" style="width:auto">' +
        avail.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") +
        '</select><button class="btn" type="button" data-cmd="addClass">+ Add process class</button></div>';
    }
    if (!reqs.length) h += '<p class="muted">No process classes. Unit procedures need a process instance.</p>';
    reqs.forEach(function (r) {
      var units = (model.processes && model.processes[r.processClass] && model.processes[r.processClass].units) || [];
      h += '<div class="eq-class"><h4><span>' + esc(r.processClass) + "</span>" +
        (edit ? '<button class="btn small danger" type="button" data-cmd="removeClass" data-arg="' + esc(r.processClass) + '">Remove</button>' : "") + "</h4>";
      r.instances.forEach(function (i) {
        h += '<div class="row"><span class="muted">Instance</span> <b>' + esc(i.name) + "</b>" + (refs[i.name] ? ' <span class="chip">in use</span>' : "");
        if (edit) {
          h += '<span class="muted">Unit</span><select class="inp" style="width:auto" data-bind="inst:' + esc(r.processClass) + ":" + esc(i.name) + ':unit"><option value="">— no fixed unit —</option>' +
            units.map(function (u) { return "<option" + (u === i.unit ? " selected" : "") + ">" + esc(u) + "</option>"; }).join("") + "</select>" +
            '<span class="muted">Selection</span><select class="inp" style="width:auto" data-bind="inst:' + esc(r.processClass) + ":" + esc(i.name) + ':mode">' +
            ["Auto", "Manual"].map(function (m) { return "<option" + (m === i.mode ? " selected" : "") + ">" + m + "</option>"; }).join("") + "</select>";
        } else h += ' <span class="muted">· unit ' + esc(i.unit || "any") + " · " + esc(i.mode) + "</span>";
        h += "</div>";
      });
      h += "</div>";
    });
    var xfers = doc.transfers();
    if (xfers.length)
      h += '<div style="margin-top:6px"><span class="muted">Transfers:</span> ' + xfers.map(function (t) {
        return '<span class="chip x" title="' + esc(t.source + " → " + t.dest) + '">' + esc(t.name) + "</span>";
      }).join("") + "</div>";
    return h;
  }

  // ---------------------------------------------------------------- bill of materials
  function bom(doc, edit) {
    var mats = doc.materials();
    var batch = parseFloat(doc.header().batchNominal) || 0;
    var h = '<table class="dt"><thead><tr><th>#</th><th>Material</th><th>ID</th><th>Type</th><th>Quantity</th><th>Basis</th><th>± %</th><th>Used by</th>' + (edit ? "<th></th>" : "<th>kg</th>") + "</tr></thead><tbody>";
    var totalPct = 0;
    mats.forEach(function (m) {
      var used = doc.materialUsage(m.id).length;
      var pct = m.interp !== "Constant";
      var qty = parseFloat(m.value) || 0;
      if (pct && m.type === "ProcessInput") totalPct += qty;
      h += "<tr><td>" + esc(m.id) + "</td>";
      if (edit) {
        h += '<td><input class="inp" list="materialList" data-bind="mat:' + esc(m.id) + ':materialId" value="' + esc(m.materialId) + '" placeholder="Search ID, name or code"><div class="muted" style="font-size:0.8em">' + esc(materialLabel(m.materialId)) + "</div></td>";
        h += "<td>" + esc(m.materialId) + "</td><td>" + esc(m.type === "ProcessOutput" ? "Output" : "Input") + "</td>";
        h += '<td><input class="inp" style="width:90px" data-bind="mat:' + esc(m.id) + ':value" value="' + esc(m.value) + '"></td>';
        h += '<td><select class="inp" style="width:auto" data-bind="mat:' + esc(m.id) + ':interp"><option value="Equation"' + (pct ? " selected" : "") + '>% of batch</option><option value="Constant"' + (!pct ? " selected" : "") + ">kg</option></select></td>";
        h += '<td><input class="inp" style="width:55px" data-bind="mat:' + esc(m.id) + ':deviation" value="' + esc(m.high) + '"></td>';
        h += "<td>" + used + '</td><td><button class="btn small danger" type="button" data-cmd="removeMaterial" data-arg="' + esc(m.id) + '"' + (used ? " disabled title=\"Assigned to a phase\"" : "") + ">✕</button></td>";
      } else {
        h += "<td><b>" + esc(materialLabel(m.materialId) || m.materialId) + "</b></td><td>" + esc(m.materialId) + "</td><td>" + (m.type === "ProcessOutput" ? "Output" : "Input") + "</td>";
        h += "<td>" + esc(m.value) + "</td><td>" + (pct ? "% of batch" : "kg") + "</td><td>" + esc(m.high) + "</td><td>" + used + "</td>";
        h += "<td>" + (pct ? (qty / 100 * batch).toFixed(2) : qty.toFixed(2)) + "</td>";
      }
      h += "</tr>";
    });
    if (!mats.length) h += '<tr><td colspan="9" class="muted">No materials</td></tr>';
    else h += '<tr class="total"><td colspan="4">Total inputs (% of batch)</td><td colspan="5">' + totalPct.toFixed(4) + " %" + (Math.abs(totalPct - 100) > 0.001 && totalPct > 0 ? ' <span class="warn">(not 100 %)</span>' : "") + "</td></tr>";
    h += "</tbody></table>";
    if (edit) h += '<div style="margin-top:8px"><button class="btn" type="button" data-cmd="addMaterial">+ Add material</button></div>';
    return h;
  }

  function shown(v) {
    return BE.render.isUnset(v) ? "unset" : v;
  }

  // ---------------------------------------------------------------- properties
  function phaseProps(doc, re, edit) {
    var reId = BE.xml.text(re, "ID");
    var pi = doc.phaseInfo(re);
    var params = doc.phaseParams(re);
    var mats = doc.materials().filter(function (m) { return m.type === "ProcessInput"; });
    var h = '<div class="form-grid">' +
      field("Phase", "", pi.name, false) +
      field("Type", "", pi.phaseType, false) +
      field("Instance", "", pi.parentInstance, false) +
      field("Label", "", pi.label, false) +
      field("Element ID", "", "#" + reId, false) +
      "</div>" +
      field("Description", "desc:" + reId, pi.description, edit, { textarea: true });
    if (params.length) {
      h += '<table class="dt params-table"><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>';
      params.forEach(function (p) {
        h += "<tr><td>" + esc(p.name) + '<div class="muted" style="font-weight:400;font-size:0.8em">' + esc(p.type === "ProcessInput" ? "material input" : "parameter") + (p.uom ? " · " + esc(p.uom) : "") + "</div></td><td>";
        if (p.type === "ProcessInput") {
          if (edit) {
            h += '<select data-bind="parammat:' + reId + ":" + esc(p.name) + '"><option value="0">— no material —</option>' + mats.map(function (m) {
              return '<option value="' + esc(m.id) + '"' + (m.id === p.fid ? " selected" : "") + ">#" + esc(m.id) + " " + esc(materialLabel(m.materialId) || m.materialId) + "</option>";
            }).join("") + "</select>";
            h += '<input style="margin-top:3px" data-bind="param:' + reId + ":" + esc(p.name) + '" value="' + esc(BE.render.isUnset(p.value) ? "" : p.value) + '" placeholder="quantity (unset)">';
          } else h += esc((p.materialId ? materialLabel(p.materialId) || p.materialId : "no material") + " · " + shown(p.value));
        } else if (edit) h += '<input data-bind="param:' + reId + ":" + esc(p.name) + '" value="' + esc(BE.render.isUnset(p.value) ? "" : p.value) + '" placeholder="unset">';
        else h += esc(shown(p.value));
        h += "</td></tr>";
      });
      h += "</tbody></table>";
    } else h += '<p class="muted">This phase has no parameters.</p>';
    return h;
  }

  function containerProps(doc, re, edit, model) {
    var reId = BE.xml.text(re, "ID");
    var type = BE.xml.reType(re);
    var h = field("Name", "name:" + reId, doc.name(re), edit) + field("Element ID", "", "#" + reId, false);
    if (type === "UnitProcedure") {
      var insts = doc.processInstances().map(function (i) { return { value: i.name, label: i.name + " (" + i.processClass + ")" }; });
      var cur = doc.upProcessInstance(re);
      if (cur && !insts.some(function (i) { return i.value === cur; })) insts.unshift({ value: cur, label: cur + " (not in equipment requirements)" });
      h += field("Process instance", "upinst:" + reId, cur, edit, { options: insts });
      h += '<p class="muted">Phases added below this unit procedure use the phases of its process class.</p>';
    }
    return h;
  }

  function transitionProps(doc, el, edit, isLoop) {
    var t = doc.transitionInfo(el);
    return (
      (isLoop ? '<p class="muted">This transition closes a loop. AVEVA returns to the loop point through its <i>Other</i> link; its normal route continues forward.</p>' : "") +
      field("Transition ID", "", t.id, false) +
      field("Condition", "trans:" + t.id + ":condition", t.condition, edit, { textarea: true }) +
      field("Description", "trans:" + t.id + ":description", t.description, edit)
    );
  }

  BE.panels = {
    header: header,
    equipment: equipment,
    bom: bom,
    phaseProps: phaseProps,
    containerProps: containerProps,
    transitionProps: transitionProps,
    materialLabel: materialLabel,
  };
})(typeof window !== "undefined" ? window : globalThis);
