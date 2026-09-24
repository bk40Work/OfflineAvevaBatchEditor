/**
 * recipe-doc.js — the recipe document.
 *
 * The B2MML DOM is the single source of truth. Nothing else holds recipe data:
 * views read from the DOM (via sfc.parse for routes) and every change goes
 * through RecipeDoc.edit(), which snapshots the XML for undo and rolls back on
 * any error, so a failed edit can never leave a half-changed recipe.
 */
(function (global) {
  "use strict";
  var BE = (global.BatchEditor = global.BatchEditor || {});
  var X = BE.xml, NS = X.NS, EXT = X.EXT, sfc = BE.sfc;

  var INFO_TAG = {
    UnitProcedure: "UnitProcedureInformation",
    Operation: "OperationInformation",
    Phase: "PhaseInformation",
  };
  var MAX_UNDO = 60;

  function RecipeDoc(xmlText) {
    this.undoStack = [];
    this.redoStack = [];
    this.dirty = false;
    this.load(xmlText);
  }

  RecipeDoc.prototype.load = function (xmlText) {
    var doc = X.parse(xmlText);
    var mr = doc.getElementsByTagNameNS(NS, "MasterRecipe")[0];
    if (!mr) throw new Error("No MasterRecipe found — is this an AVEVA Batch B2MML recipe export?");
    this.doc = doc;
    this.master = mr;
    this._reindex();
  };

  RecipeDoc.prototype._reindex = function () {
    var max = 0;
    var ids = this.doc.getElementsByTagNameNS(NS, "ID");
    for (var i = 0; i < ids.length; i++) {
      var n = parseInt((ids[i].textContent || "").trim(), 10);
      if (!isNaN(n) && String(n) === (ids[i].textContent || "").trim() && n > max) max = n;
    }
    this.maxId = max;
    this._reIndex = null;
  };

  /** New globally unique numeric ID (used for elements, steps, links, transitions, formula). */
  RecipeDoc.prototype.alloc = function () {
    this.maxId += 1;
    return String(this.maxId);
  };

  RecipeDoc.prototype.xml = function () {
    return X.serialize(this.doc);
  };

  RecipeDoc.prototype.re = function (reId) {
    if (!this._reIndex) {
      var map = {};
      var all = this.doc.getElementsByTagNameNS(NS, "RecipeElement");
      for (var i = 0; i < all.length; i++) map[X.text(all[i], "ID")] = all[i];
      this._reIndex = map;
    }
    return this._reIndex[reId] || null;
  };

  // ------------------------------------------------------------ transactions
  /**
   * Run a change. fn() mutates the DOM (usually via commit()). On any exception
   * the document is restored from the snapshot and the error is re-thrown.
   */
  RecipeDoc.prototype.edit = function (label, fn) {
    var snapshot = this.xml();
    var result;
    try {
      result = fn();
      this._reindex();
    } catch (e) {
      this.load(snapshot);
      throw e;
    }
    this.undoStack.push({ label: label, xml: snapshot });
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.redoStack = [];
    this.dirty = true;
    return result;
  };
  RecipeDoc.prototype.canUndo = function () {
    return this.undoStack.length > 0;
  };
  RecipeDoc.prototype.canRedo = function () {
    return this.redoStack.length > 0;
  };
  RecipeDoc.prototype.undo = function () {
    var s = this.undoStack.pop();
    if (!s) return null;
    this.redoStack.push({ label: s.label, xml: this.xml() });
    this.load(s.xml);
    this.dirty = true;
    return s.label;
  };
  RecipeDoc.prototype.redo = function () {
    var s = this.redoStack.pop();
    if (!s) return null;
    this.undoStack.push({ label: s.label, xml: this.xml() });
    this.load(s.xml);
    this.dirty = true;
    return s.label;
  };

  /** Parse the route of an owner (MasterRecipe, UnitProcedure or Operation element). */
  RecipeDoc.prototype.tree = function (owner) {
    var t = sfc.parse(owner);
    if (!t.begin) this._seedLogic(owner, t);
    return t;
  };

  /** Give an owner without ProcedureLogic a Begin -> End route (in the tree only). */
  RecipeDoc.prototype._seedLogic = function (owner, tree) {
    var begin = this._structuralRE(owner, "Begin");
    var end = this._structuralRE(owner, "End");
    tree.begin = { reId: begin, stepId: this.alloc() };
    tree.end = { reId: end, stepId: this.alloc() };
  };
  RecipeDoc.prototype._structuralRE = function (owner, type) {
    var re = X.create(this.doc, "RecipeElement");
    var id = this.alloc();
    X.append(re, "ID", id);
    X.append(re, "RecipeElementType", type);
    var anchor = X.kid(owner, "ProcedureLogic", NS) || X.kids(owner, "RecipeElementType", NS)[0];
    X.insertAfter(owner, re, anchor);
    return id;
  };

  /**
   * Write an edited tree back to the DOM and prove it: the reparsed route must
   * be identical to the edited tree. Must be called inside edit().
   */
  RecipeDoc.prototype.commit = function (tree, keepREs) {
    var self = this;
    var alloc = function () {
      return self.alloc();
    };
    var removed = sfc.write(tree, alloc, alloc);
    var expected = sfc.canonical(tree.seq);
    var check = sfc.parse(tree.owner);
    var actual = sfc.canonical(check.seq);
    if (expected !== actual)
      throw new Error("Internal check failed: the rewritten route does not match the edit.\nExpected " + expected + "\nGot " + actual);
    removed.forEach(function (r) {
      if (!(keepREs && keepREs[r.reId])) self._purgeFormula(r.el);
    });
    this._reIndex = null;
    return removed;
  };

  /** Remove Formula process-parameter records owned only by phases inside `el`. */
  RecipeDoc.prototype._purgeFormula = function (el) {
    var formula = X.kid(this.master, "Formula", NS);
    if (!formula) return;
    var fids = {};
    var params = el.getElementsByTagNameNS(NS, "Parameter");
    for (var i = 0; i < params.length; i++) {
      var f = X.text(params[i], "FormulaParameterID", EXT);
      if (f) fids[f] = true;
    }
    // Keep any record still referenced from the live recipe.
    var live = this.master.getElementsByTagNameNS(EXT, "FormulaParameterID");
    for (var j = 0; j < live.length; j++) delete fids[(live[j].textContent || "").trim()];
    X.kids(formula, "Parameter", NS).forEach(function (p) {
      if (fids[X.text(p, "ID")] && X.text(p, "ParameterType") === "ProcessParameter") formula.removeChild(p);
    });
  };

  // ------------------------------------------------------------ element info
  RecipeDoc.prototype.info = function (re) {
    var type = X.reType(re);
    var tag = INFO_TAG[type];
    return tag ? X.kid(re, tag, EXT) : null;
  };
  RecipeDoc.prototype.name = function (re) {
    var i = this.info(re);
    return i ? X.text(i, "Name", EXT) : X.reType(re);
  };
  RecipeDoc.prototype.setName = function (re, name) {
    var i = this.info(re);
    if (!i) throw new Error("This element has no name.");
    X.setText(i, "Name", name, EXT);
  };
  RecipeDoc.prototype.phaseInfo = function (re) {
    var i = X.kid(re, "PhaseInformation", EXT);
    return {
      label: i ? X.text(i, "Label", EXT) : "",
      phaseType: i ? X.text(i, "PhaseType", EXT) : "",
      name: i ? X.text(i, "Name", EXT) : "",
      parentInstance: i ? X.text(i, "ParentInstance", EXT) : "",
      description: X.text(re, "Description", NS),
    };
  };
  RecipeDoc.prototype.upProcessInstance = function (upRE) {
    var i = X.kid(upRE, "UnitProcedureInformation", EXT);
    return i ? X.text(i, "ProcessInstance", EXT) : "";
  };
  /**
   * Change a Unit Procedure's process instance. Process-bound phases inside it
   * (Process, Allocate/Release Process) that used the old instance follow, and
   * so do their Formula records. Returns the number of phases re-bound.
   */
  RecipeDoc.prototype.setUpProcessInstance = function (upRE, instance) {
    var i = X.kid(upRE, "UnitProcedureInformation", EXT);
    var old = X.text(i, "ProcessInstance", EXT);
    X.setText(i, "ProcessInstance", instance, EXT);
    if (!old || old === instance) return 0;
    var formula = this.formulaIndex(), n = 0;
    var infos = upRE.getElementsByTagNameNS(EXT, "PhaseInformation");
    for (var k = 0; k < infos.length; k++) {
      var info = infos[k];
      if (!/^(Process|AllocateProcess|ReleaseProcess)$/.test(X.text(info, "PhaseType", EXT))) continue;
      if (X.text(info, "ParentInstance", EXT) !== old) continue;
      X.setText(info, "ParentInstance", instance, EXT);
      n++;
      X.kids(info.parentNode, "Parameter", NS).forEach(function (p) {
        var f = formula[X.text(p, "FormulaParameterID", EXT)];
        if (f && f.type === "ProcessParameter" && X.text(f.el, "ParentInstance", EXT) === old) X.setText(f.el, "ParentInstance", instance, EXT);
      });
    }
    return n;
  };

  /** Phase parameters, resolved against the Formula. */
  RecipeDoc.prototype.phaseParams = function (re) {
    var formula = this.formulaIndex();
    return X.kids(re, "Parameter", NS).map(function (p) {
      var v = X.kid(p, "Value", NS);
      var fid = X.text(p, "FormulaParameterID", EXT);
      var type = X.text(p, "ParameterType");
      var f = formula[fid] || null;
      var own = v ? X.text(v, "ValueString") : "";
      return {
        el: p,
        name: X.text(p, "ID"),
        type: type,
        fid: fid,
        formula: f,
        // ProcessParameter values live in the Formula; ProcessInput quantities on the phase.
        value: type === "ProcessParameter" && f ? f.value : own,
        uom: f ? f.uom : v ? X.text(v, "UnitOfMeasure") : "",
        materialId: type === "ProcessInput" && f ? f.materialId : "",
      };
    });
  };
  RecipeDoc.prototype.setPhaseParam = function (re, name, value) {
    var p = this.phaseParams(re).filter(function (x) {
      return x.name === name;
    })[0];
    if (!p) throw new Error("Unknown parameter " + name);
    if (p.type === "ProcessParameter" && p.formula) X.setText(X.kid(p.formula.el, "Value", NS), "ValueString", value);
    else X.setText(X.kid(p.el, "Value", NS), "ValueString", value);
  };
  RecipeDoc.prototype.setPhaseParamMaterial = function (re, name, formulaId) {
    var p = this.phaseParams(re).filter(function (x) {
      return x.name === name;
    })[0];
    if (!p) throw new Error("Unknown parameter " + name);
    X.setText(p.el, "FormulaParameterID", formulaId || "0", EXT);
  };

  RecipeDoc.prototype.formulaIndex = function () {
    var out = {};
    var formula = X.kid(this.master, "Formula", NS);
    X.kids(formula, "Parameter", NS).forEach(function (p) {
      var v = X.kid(p, "Value", NS);
      out[X.text(p, "ID")] = {
        el: p,
        id: X.text(p, "ID"),
        type: X.text(p, "ParameterType"),
        value: v ? X.text(v, "ValueString") : "",
        interp: v ? X.text(v, "DataInterpretation") : "",
        uom: v ? X.text(v, "UnitOfMeasure") : "",
        materialId: X.text(p, "MaterialID", EXT),
        high: X.text(p, "HighDeviation", EXT),
        low: X.text(p, "LowDeviation", EXT),
      };
    });
    return out;
  };

  RecipeDoc.prototype.transitionInfo = function (el) {
    return {
      id: X.text(el, "ID"),
      condition: X.text(el, "Condition"),
      description: X.text(el, "Description"),
      name: X.text(el, "Name", EXT),
    };
  };
  RecipeDoc.prototype.setTransition = function (el, fields) {
    if (fields.condition !== undefined) X.setText(el, "Condition", fields.condition, NS);
    if (fields.description !== undefined) X.setText(el, "Description", fields.description, NS);
  };

  // ------------------------------------------------------------ factories
  RecipeDoc.prototype.nextPhaseLabel = function () {
    var max = 0;
    var labels = this.doc.getElementsByTagNameNS(EXT, "PhaseInformation");
    for (var i = 0; i < labels.length; i++) {
      var n = parseInt(X.text(labels[i], "Label", EXT), 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return String(max + 1);
  };

  RecipeDoc.prototype._formula = function () {
    var f = X.kid(this.master, "Formula", NS);
    if (f) return f;
    f = X.create(this.doc, "Formula");
    var reqs = X.kids(this.master, "EquipmentRequirement", NS);
    var anchor = reqs.length ? reqs[reqs.length - 1] : X.kid(this.master, "Header", NS);
    X.insertAfter(this.master, f, anchor);
    return f;
  };

  /**
   * Create a (detached) Phase RecipeElement.
   * spec = { phaseType, name, parentInstance, params:[{name,type:"Process"|"Material"|"Transfer"}] }
   * Formula records are added for every non-material parameter.
   */
  RecipeDoc.prototype.createPhase = function (spec) {
    var doc = this.doc, self = this;
    var re = X.create(doc, "RecipeElement");
    var id = this.alloc();
    var label = this.nextPhaseLabel();
    X.append(re, "ID", id);
    X.append(re, "Description", "");
    X.append(re, "RecipeElementType", "Phase");
    var isTransfer = spec.phaseType === "Transfer";
    (spec.params || []).forEach(function (p) {
      var material = p.type === "Material";
      var el = X.append(re, "Parameter");
      X.append(el, "ID", p.name);
      X.append(el, "ParameterType", material ? "ProcessInput" : "ProcessParameter");
      var v = X.append(el, "Value");
      X.append(v, "ValueString", "0");
      X.append(v, "DataInterpretation", "Constant");
      X.append(v, "DataType", "double");
      X.append(v, "UnitOfMeasure", "");
      var fid = "0";
      if (!material) {
        fid = self.alloc();
        var f = X.append(self._formula(), "Parameter");
        X.append(f, "ID", fid);
        X.append(f, "ParameterType", "ProcessParameter");
        var fv = X.append(f, "Value");
        X.append(fv, "ValueString", "0");
        X.append(fv, "DataInterpretation", "Constant");
        X.append(fv, "DataType", "double");
        X.append(fv, "UnitOfMeasure", "");
        X.append(f, "Name", p.name, EXT);
        X.append(f, "ToleranceType", "General", EXT);
        X.append(f, "HighDeviation", "0", EXT);
        X.append(f, "LowDeviation", "0", EXT);
        X.append(f, "ProcessVariableType", isTransfer ? "Transfer" : "Process", EXT);
        X.append(f, "Label", label, EXT);
        X.append(f, "ParentInstance", spec.parentInstance, EXT);
        X.append(f, "Phase", spec.name, EXT);
        X.append(f, "PhaseParameter", p.name, EXT);
      }
      X.append(el, "FormulaParameterID", fid, EXT);
    });
    var info = X.append(re, "PhaseInformation", undefined, EXT);
    [
      ["Label", label],
      ["PhaseType", spec.phaseType],
      ["Name", spec.name],
      ["ParentInstance", spec.parentInstance],
      ["OperatorAcknowledgmentModes", "0"],
      ["OperatorCommentRequired", "false"],
      ["Report", ""],
      ["AppendDescription", "false"],
      ["ContinueMode", "false"],
      ["DocumentViewType", "None"],
      ["DocumentViewPath", ""],
      ["DocumentViewDescription", ""],
    ].forEach(function (kv) {
      X.append(info, kv[0], kv[1], EXT);
    });
    return re;
  };

  /** Create a (detached) Operation or UnitProcedure with an empty Begin -> End route. */
  RecipeDoc.prototype.createContainer = function (type, name, processInstance) {
    var doc = this.doc;
    var re = X.create(doc, "RecipeElement");
    X.append(re, "ID", this.alloc());
    X.append(re, "RecipeElementType", type);
    var tree = { owner: re, seq: [], begin: null, end: null };
    var b = X.append(re, "RecipeElement");
    var bId = this.alloc();
    X.append(b, "ID", bId);
    X.append(b, "RecipeElementType", "Begin");
    var e = X.append(re, "RecipeElement");
    var eId = this.alloc();
    X.append(e, "ID", eId);
    X.append(e, "RecipeElementType", "End");
    tree.begin = { reId: bId, stepId: this.alloc() };
    tree.end = { reId: eId, stepId: this.alloc() };
    var self = this;
    sfc.write(tree, function () {
      return self.alloc();
    }, function () {
      return self.alloc();
    });
    var info = X.append(re, INFO_TAG[type], undefined, EXT);
    X.append(info, "Name", name, EXT);
    if (type === "UnitProcedure") X.append(info, "ProcessInstance", processInstance || "", EXT);
    return re;
  };

  RecipeDoc.prototype.createTransition = function (condition) {
    var el = X.create(this.doc, "Transition");
    var id = this.alloc();
    X.append(el, "ID", id);
    X.append(el, "Condition", condition || "");
    X.append(el, "Description", "");
    X.append(el, "Name", id, EXT);
    return el;
  };

  // ------------------------------------------------------------ header
  var HEADER_FIELDS = {
    id: [null, "ID"],
    description: [null, "Description"],
    productId: ["Header", "ProductID"],
    productName: ["Header", "ProductName"],
    batchNominal: ["BatchSize", "Nominal"],
    batchMin: ["BatchSize", "Min"],
    batchMax: ["BatchSize", "Max"],
  };
  RecipeDoc.prototype._headerParent = function (where) {
    if (!where) return this.master;
    var h = X.kid(this.master, "Header", NS);
    if (where === "Header") return h;
    return h ? X.kid(h, "BatchSize", NS) : null;
  };
  RecipeDoc.prototype.header = function () {
    var out = {};
    for (var k in HEADER_FIELDS) {
      var p = this._headerParent(HEADER_FIELDS[k][0]);
      out[k] = p ? X.text(p, HEADER_FIELDS[k][1], NS) : "";
    }
    var h = X.kid(this.master, "Header", NS);
    out.approvedProduction = h ? X.text(h, "ApprovedForProduction", EXT) : "";
    out.approvedTest = h ? X.text(h, "ApprovedForTest", EXT) : "";
    out.name = X.text(this.master, "Name", EXT);
    return out;
  };
  RecipeDoc.prototype.setHeader = function (key, value) {
    if (key === "approvedProduction" || key === "approvedTest") {
      var h = X.kid(this.master, "Header", NS);
      X.setText(h, key === "approvedProduction" ? "ApprovedForProduction" : "ApprovedForTest", value, EXT);
      return;
    }
    var f = HEADER_FIELDS[key];
    if (!f) throw new Error("Unknown header field " + key);
    var p = this._headerParent(f[0]);
    if (!p) throw new Error("Recipe has no " + f[0] + " section.");
    X.setText(p, f[1], value, NS);
  };
  RecipeDoc.prototype.modificationLogs = function () {
    var h = X.kid(this.master, "Header", NS);
    return X.kids(h, "ModificationLog", NS).map(function (m) {
      return { date: X.text(m, "ModifiedDate"), description: X.text(m, "Description"), author: X.text(m, "Author") };
    });
  };
  /** Append a ModificationLog entry (AVEVA keeps them in Header before ApprovalHistory). */
  RecipeDoc.prototype.addModificationLog = function (author, comment, isoDate) {
    var h = X.kid(this.master, "Header", NS);
    var logs = X.kids(h, "ModificationLog", NS);
    var m = X.create(this.doc, "ModificationLog");
    X.append(m, "ModifiedDate", isoDate);
    X.append(m, "Description", comment);
    X.append(m, "Author", author);
    X.append(m, "VersionState", "Production", EXT);
    X.append(m, "VersionType", "Production", EXT);
    var anchor = logs.length ? logs[logs.length - 1] : null;
    if (anchor) X.insertAfter(h, m, anchor);
    else h.insertBefore(m, h.firstChild);
  };

  // ------------------------------------------------------------ equipment
  RecipeDoc.prototype.requirements = function () {
    return X.kids(this.master, "EquipmentRequirement", NS).map(function (r) {
      return {
        el: r,
        processClass: X.text(r, "ID"),
        instances: X.kids(r, "ProcessInstance", EXT).map(function (pi) {
          return { el: pi, name: X.text(pi, "Name", EXT), unit: X.text(pi, "Unit", EXT), mode: X.text(pi, "UnitSelectionMode", EXT) || "Auto" };
        }),
      };
    });
  };
  RecipeDoc.prototype.processInstances = function () {
    var out = [];
    this.requirements().forEach(function (r) {
      r.instances.forEach(function (i) {
        out.push({ name: i.name, processClass: r.processClass, unit: i.unit, mode: i.mode, el: i.el });
      });
    });
    return out;
  };
  RecipeDoc.prototype.processClassOf = function (instanceName) {
    var hit = this.processInstances().filter(function (i) {
      return i.name === instanceName;
    })[0];
    return hit ? hit.processClass : instanceName;
  };
  RecipeDoc.prototype.transfers = function () {
    return X.kids(this.master, "EquipmentTransfer", EXT).map(function (t) {
      return {
        el: t,
        name: X.text(t, "Name", EXT),
        source: X.text(t, "Source", EXT),
        dest: X.text(t, "Destination", EXT),
        instances: X.kids(t, "TransferInstance", EXT).map(function (i) {
          return { name: X.text(i, "Name", EXT), source: X.text(i, "Source", EXT), dest: X.text(i, "Destination", EXT) };
        }),
      };
    });
  };
  /** Names used anywhere as ParentInstance / ProcessInstance / Source / Destination. */
  RecipeDoc.prototype.instanceReferences = function () {
    var refs = {};
    ["ParentInstance", "ProcessInstance", "Source", "Destination"].forEach(function (tag) {
      var els = this.doc.getElementsByTagNameNS(EXT, tag);
      for (var i = 0; i < els.length; i++) {
        if (els[i].parentNode && els[i].parentNode.localName === "EquipmentRequirement") continue;
        var v = (els[i].textContent || "").trim();
        if (v && tag === "ProcessInstance" && !X.kid(els[i], "Name", EXT)) refs[v] = true;
        else if (v && tag !== "ProcessInstance") refs[v] = true;
      }
    }, this);
    return refs;
  };
  RecipeDoc.prototype.addProcessClass = function (processClass, model) {
    if (this.requirements().some(function (r) { return r.processClass === processClass; }))
      throw new Error(processClass + " is already in the recipe.");
    var r = X.create(this.doc, "EquipmentRequirement");
    X.append(r, "ID", processClass);
    var pi = X.append(r, "ProcessInstance", undefined, EXT);
    X.append(pi, "Name", processClass, EXT);
    X.append(pi, "Unit", "", EXT);
    X.append(pi, "UnitSelectionMode", "Auto", EXT);
    var reqs = X.kids(this.master, "EquipmentRequirement", NS);
    var anchor = reqs.length ? reqs[reqs.length - 1] : X.kid(this.master, "Header", NS);
    X.insertAfter(this.master, r, anchor);
    if (model) this.seedTransfers(model);
  };
  RecipeDoc.prototype.removeProcessClass = function (processClass) {
    var req = this.requirements().filter(function (r) { return r.processClass === processClass; })[0];
    if (!req) return;
    var refs = this.instanceReferences();
    req.instances.forEach(function (i) {
      if (refs[i.name]) throw new Error("Process instance " + i.name + " is still used in the recipe.");
    });
    X.remove(req.el);
  };
  RecipeDoc.prototype.setInstanceField = function (processClass, instanceName, field, value) {
    var req = this.requirements().filter(function (r) { return r.processClass === processClass; })[0];
    var inst = req && req.instances.filter(function (i) { return i.name === instanceName; })[0];
    if (!inst) throw new Error("Unknown process instance " + instanceName);
    X.setText(inst.el, field === "mode" ? "UnitSelectionMode" : "Unit", value, EXT);
  };
  /** Add configured transfers touching any recipe process class (never removes). */
  RecipeDoc.prototype.seedTransfers = function (model) {
    var self = this;
    var classes = this.requirements().map(function (r) { return r.processClass; });
    var existing = this.transfers();
    (model.transfers || []).forEach(function (mt) {
      if (classes.indexOf(mt.source) < 0 && classes.indexOf(mt.dest) < 0) return;
      if (existing.some(function (t) { return t.name === mt.name; })) return;
      var t = X.create(self.doc, "EquipmentTransfer", undefined, EXT);
      X.append(t, "Name", mt.name, EXT);
      X.append(t, "Source", mt.source, EXT);
      X.append(t, "Destination", mt.dest, EXT);
      var ti = X.append(t, "TransferInstance", undefined, EXT);
      X.append(ti, "Name", mt.name, EXT);
      X.append(ti, "Source", mt.source, EXT);
      X.append(ti, "Destination", mt.dest, EXT);
      var all = X.kids(self.master, "EquipmentTransfer", EXT);
      var anchor = all.length ? all[all.length - 1] : X.kid(self.master, "Name", EXT);
      if (anchor) X.insertAfter(self.master, t, anchor);
      else self.master.appendChild(t);
    });
  };

  // ------------------------------------------------------------ bill of materials
  RecipeDoc.prototype.materials = function () {
    var idx = this.formulaIndex();
    return Object.keys(idx)
      .map(function (k) { return idx[k]; })
      .filter(function (f) { return f.type === "ProcessInput" || f.type === "ProcessOutput"; });
  };
  RecipeDoc.prototype.addMaterial = function (materialId) {
    var f = X.append(this._formula(), "Parameter");
    var id = this.alloc();
    X.append(f, "ID", id);
    X.append(f, "ParameterType", "ProcessInput");
    var v = X.append(f, "Value");
    X.append(v, "ValueString", "0");
    X.append(v, "DataInterpretation", "Equation");
    X.append(v, "DataType", "double");
    X.append(v, "UnitOfMeasure", "kg");
    X.append(f, "MaterialID", materialId || "", EXT);
    X.append(f, "Total", "true", EXT);
    X.append(f, "ToleranceType", "General", EXT);
    X.append(f, "HighDeviation", "1", EXT);
    X.append(f, "LowDeviation", "1", EXT);
    return id;
  };
  RecipeDoc.prototype.materialUsage = function (formulaId) {
    var out = [];
    var refs = this.master.getElementsByTagNameNS(EXT, "FormulaParameterID");
    for (var i = 0; i < refs.length; i++)
      if ((refs[i].textContent || "").trim() === formulaId) out.push(refs[i].parentNode);
    return out;
  };
  /**
   * Where a BOM material is used: every phase material input whose
   * FormulaParameterID points at this Formula record, in recipe order.
   */
  RecipeDoc.prototype.materialAllocations = function (formulaId) {
    var self = this;
    return this.materialUsage(formulaId)
      .filter(function (p) {
        return p.localName === "Parameter" && p.parentNode && X.reType(p.parentNode) === "Phase";
      })
      .map(function (p) {
        var phase = p.parentNode, op = phase.parentNode, up = op && op.parentNode;
        var v = X.kid(p, "Value", NS);
        var info = self.phaseInfo(phase);
        return {
          param: X.text(p, "ID"),
          value: v ? X.text(v, "ValueString") : "",
          phaseId: X.text(phase, "ID"),
          phaseName: info.name,
          label: info.label,
          instance: info.parentInstance,
          opId: op && X.reType(op) === "Operation" ? X.text(op, "ID") : "",
          opName: op && X.reType(op) === "Operation" ? self.name(op) : "",
          upId: up && X.reType(up) === "UnitProcedure" ? X.text(up, "ID") : "",
          upName: up && X.reType(up) === "UnitProcedure" ? self.name(up) : "",
        };
      });
  };

  RecipeDoc.prototype.removeMaterial = function (formulaId) {
    if (this.materialUsage(formulaId).length) throw new Error("This material is still assigned to a phase parameter.");
    var f = this.formulaIndex()[formulaId];
    if (f) X.remove(f.el);
  };
  RecipeDoc.prototype.setMaterial = function (formulaId, field, value) {
    var f = this.formulaIndex()[formulaId];
    if (!f) throw new Error("Unknown material row " + formulaId);
    var v = X.kid(f.el, "Value", NS);
    if (field === "materialId") X.setText(f.el, "MaterialID", value, EXT);
    else if (field === "value") X.setText(v, "ValueString", value, NS);
    else if (field === "interp") X.setText(v, "DataInterpretation", value, NS);
    else if (field === "deviation") {
      X.setText(f.el, "HighDeviation", value, EXT);
      X.setText(f.el, "LowDeviation", value, EXT);
    } else throw new Error("Unknown material field " + field);
  };

  // ------------------------------------------------------------ new recipe
  RecipeDoc.blankXml = function (h) {
    function e(s) {
      return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    var x = EXT;
    return (
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<BatchInformation xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="' + NS + '">' +
      "<MasterRecipe><ID>" + e(h.id) + "</ID><Description>" + e(h.description) + "</Description>" +
      "<Header><ApprovalHistory><IndividualApproval /><IndividualApproval /><IndividualApproval /><IndividualApproval /><IndividualApproval /></ApprovalHistory>" +
      "<ProductID>" + e(h.productId) + "</ProductID><ProductName>" + e(h.productName) + "</ProductName>" +
      "<BatchSize><Nominal>" + e(h.batchNominal || "0") + "</Nominal><Min>0</Min><Max>0</Max></BatchSize>" +
      '<ApprovedForProduction xmlns="' + x + '">false</ApprovedForProduction><ApprovedForTest xmlns="' + x + '">false</ApprovedForTest></Header>' +
      "<Formula />" +
      "<ProcedureLogic><Link><ID>5</ID><FromID><FromIDValue>2</FromIDValue><FromType>Step</FromType><IDScope>Internal</IDScope></FromID>" +
      "<ToID><ToIDValue>4</ToIDValue><ToType>Step</ToType><IDScope>Internal</IDScope></ToID><LinkType>ControlLink</LinkType><Depiction>Line</Depiction></Link>" +
      "<Step><ID>2</ID><RecipeElementID>1</RecipeElementID><RecipeElementVersion>0</RecipeElementVersion></Step>" +
      "<Step><ID>4</ID><RecipeElementID>3</RecipeElementID><RecipeElementVersion>0</RecipeElementVersion></Step></ProcedureLogic>" +
      "<RecipeElement><ID>1</ID><RecipeElementType>Begin</RecipeElementType></RecipeElement>" +
      "<RecipeElement><ID>3</ID><RecipeElementType>End</RecipeElementType></RecipeElement>" +
      '<Name xmlns="' + x + '">' + e(h.id) + "</Name>" +
      '<RecipeState xmlns="' + x + '"><Name>Production</Name><Description /><DefaultState>true</DefaultState><Schedule>true</Schedule><ReadOnly>false</ReadOnly></RecipeState>' +
      '<RecipeType xmlns="' + x + '"><Name>Production</Name><Description /><DefaultType>true</DefaultType></RecipeType>' +
      "</MasterRecipe></BatchInformation>"
    );
  };

  BE.RecipeDoc = RecipeDoc;
})(typeof window !== "undefined" ? window : globalThis);
