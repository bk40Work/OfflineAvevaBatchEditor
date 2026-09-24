/**
 * app.js — application controller.
 *
 * Owns UI state (loaded document, edit mode, selection, drag/cut state) and
 * wires DOM events to BatchEditor.actions. It never edits XML directly: every
 * change is an action (route edits) or a RecipeDoc setter inside doc.edit(),
 * followed by a full re-render from the document.
 */
(function (global) {
  "use strict";
  var BE = global.BatchEditor;
  var X = BE.xml, A = BE.actions, R = BE.render, P = BE.panels;
  var MODEL = global.MODEL_DATA || { processes: {}, transfers: [], transfer_phases: {} };
  var $ = function (id) { return document.getElementById(id); };
  var esc = R.esc;

  BE.materialsById = {};
  (global.MATERIALS_DATA || []).forEach(function (m) { BE.materialsById[m.id] = m; });

  var LEVELS = { up: "laneUP", op: "laneOP", ph: "lanePH" };
  var state = {
    doc: null,
    fileName: "",
    edit: false,
    upId: null, // selected Unit Procedure RecipeElement ID
    opId: null, // selected Operation RecipeElement ID
    sel: null, // { level, key }
    propsOpen: false,
    cut: null, // { level, key, ownerId, label }
    drag: null, // { level, uid, key }
    showParams: true,
    details: false,
    bomOpen: {}, // BOM rows expanded to show where each material is used
    trees: {}, // level -> rendered tree (uids valid until next render)
    owners: {}, // level -> owner element of that tree
    zoom: { up: 100, op: 100, ph: 100 },
  };
  try {
    var z = JSON.parse(global.localStorage.getItem("abe.zoom") || "null");
    if (z) state.zoom = z;
  } catch (e) { /* storage unavailable — defaults are fine */ }

  // ================================================================ utilities
  var toastTimer = null;
  function toast(msg, isError) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (isError ? " error" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = "toast" + (isError ? " error" : ""); }, isError ? 5200 : 2400);
  }
  /** Run a change; any refusal is shown to the user and nothing changes. */
  function act(fn, okMsg) {
    try {
      var r = fn();
      if (okMsg) toast(okMsg);
      return r;
    } catch (e) {
      console.error(e);
      toast(e.message || String(e), true);
    } finally {
      render();
    }
  }
  function firstStep(tree) {
    var hit = null;
    BE.sfc.walkItems(tree.seq, function (it) { if (!hit && it.kind === "step") hit = it.reId; });
    return hit;
  }
  function stepsCount(owner) {
    try {
      var n = 0;
      BE.sfc.walkItems(BE.sfc.parse(owner).seq, function (it) { if (it.kind === "step") n++; });
      return n;
    } catch (e) { return -1; }
  }
  function itemLabel(it) {
    if (!it) return "";
    if (it.kind === "step") { var re = state.doc.re(it.reId); return re ? state.doc.name(re) : "#" + it.reId; }
    if (it.kind === "transition") return "Transition T" + it.id;
    if (it.kind === "loop") return "Loop (T" + it.trans.id + ")";
    if (it.kind === "parallel") return it.mode === "Serial" ? "Serial branch" : "Parallel branch";
    return "";
  }
  function levelOf(el) {
    var lane = el && el.closest(".lane");
    return lane ? lane.getAttribute("data-level") : null;
  }
  function upRE() { return state.upId ? state.doc.re(state.upId) : null; }
  function opRE() { return state.opId ? state.doc.re(state.opId) : null; }

  // ================================================================ loading
  function load(text, fileName) {
    var doc;
    try {
      doc = new BE.RecipeDoc(text);
    } catch (e) {
      toast("Cannot open: " + e.message, true);
      return;
    }
    state.doc = doc;
    state.fileName = fileName || "";
    state.upId = state.opId = null;
    state.sel = null;
    state.cut = null;
    state.propsOpen = false;
    document.body.classList.add("has-doc");
    render();
  }
  function confirmDiscard() {
    return !state.doc || !state.doc.dirty || global.confirm("Discard unsaved changes to the current recipe?");
  }

  // ================================================================ render
  function render() {
    var doc = state.doc;
    $("btnEdit").classList.toggle("on", state.edit);
    $("btnEdit").textContent = state.edit ? "✔ Editing" : "✎ Edit";
    document.body.classList.toggle("edit-mode", state.edit);
    document.querySelectorAll("[data-needs-doc]").forEach(function (b) { b.disabled = !doc; });
    $("btnUndo").disabled = !(doc && state.edit && doc.canUndo());
    $("btnRedo").disabled = !(doc && state.edit && doc.canRedo());
    if (!doc) return;
    var h = doc.header();
    $("recipeTitle").textContent = (h.id || "(no ID)") + (h.description ? " — " + h.description : "") + (state.fileName ? "  ·  " + state.fileName : "");
    var logs = doc.modificationLogs();
    $("versionBadge").hidden = false;
    $("versionLabel").textContent = "V" + logs.length;
    var st = $("statusText");
    st.textContent = doc.dirty ? "Unsaved changes" : "Saved / unchanged";
    st.className = "status" + (doc.dirty ? " dirty" : "");

    $("details").hidden = !state.details;
    if (state.details) {
      $("headerBody").innerHTML = P.header(doc, state.edit);
      $("eqBody").innerHTML = P.equipment(doc, state.edit, MODEL);
      $("bomBody").innerHTML = P.bom(doc, state.edit, state.bomOpen);
    }
    $("lanes").hidden = false;
    renderLanes();
    renderProps();
    renderCut();
  }

  function renderLane(level, owner, emptyMsg) {
    var body = $(LEVELS[level]);
    state.trees[level] = null;
    state.owners[level] = owner;
    if (!owner) {
      body.innerHTML = '<div class="lane-empty-msg">' + emptyMsg + "</div>";
      return null;
    }
    var tree;
    try {
      tree = state.doc.tree(owner);
    } catch (e) {
      body.innerHTML = '<div class="lane-error"><b>This route cannot be shown as a structured chart.</b><br>' + esc(e.message) +
        "<br><br>It is left exactly as it is and will be saved unchanged. Editing is disabled for this route only.</div>";
      return null;
    }
    state.trees[level] = tree;
    var activeKey = level === "up" && state.upId ? "S:" + state.upId : level === "op" && state.opId ? "S:" + state.opId : null;
    var html = "";
    if (tree.warnings.length) html += '<div class="lane-note">' + tree.warnings.map(esc).join("<br>") + "</div>";
    html += R.lane({
      doc: state.doc,
      tree: tree,
      level: level,
      edit: state.edit,
      selKey: state.sel && state.sel.level === level ? state.sel.key : null,
      activeKey: activeKey,
      cutKey: state.cut && state.cut.level === level ? state.cut.key : null,
      showParams: state.showParams,
      stats: level === "ph" ? null : function (reId) {
        var n = stepsCount(state.doc.re(reId));
        return n < 0 ? "unstructured" : n + (level === "up" ? " operation" : " phase") + (n === 1 ? "" : "s");
      },
    });
    body.innerHTML = html;
    var flow = body.querySelector(".flow");
    if (flow) flow.style.zoom = state.zoom[level] / 100;
    var zl = document.querySelector('[data-zoom="' + level + '"] .zl');
    if (zl) zl.textContent = state.zoom[level] + "%";
    var lane = body.closest(".lane");
    lane.classList.toggle("targeting", !!(state.cut && state.cut.level === level));
    lane.classList.toggle("pasting", !!(state.cut && state.cut.level === level));
    return tree;
  }

  function renderLanes() {
    var doc = state.doc;
    var master = renderLane("up", doc.master);
    // keep the selected unit procedure / operation valid
    if (master && (!state.upId || !BE.sfc.findByKey(master, "S:" + state.upId))) state.upId = firstStep(master);
    if (!master) state.upId = null;
    if (master) renderLane("up", doc.master); // re-render with the active card highlighted
    var up = upRE();
    $("opLaneTitle").textContent = up ? "Operations · " + doc.name(up) : "Operations";
    var upTree = renderLane("op", up, master ? "Add a unit procedure first." : "");
    if (upTree && (!state.opId || !BE.sfc.findByKey(upTree, "S:" + state.opId))) {
      state.opId = firstStep(upTree);
      renderLane("op", up);
    }
    if (!upTree) state.opId = null;
    var op = opRE();
    $("phLaneTitle").textContent = op ? "Phases · " + doc.name(op) + (up ? "  (" + doc.upProcessInstance(up) + ")" : "") : "Phases";
    renderLane("ph", op, up ? "Add an operation to this unit procedure first." : "");
  }

  function selectedItem() {
    if (!state.sel) return null;
    var tree = state.trees[state.sel.level];
    return tree ? BE.sfc.findByKey(tree, state.sel.key) : null;
  }
  function loopOfTransition(tree, key) {
    var hit = null;
    BE.sfc.walkItems(tree.seq, function (it) { if (it.kind === "loop" && R.keyOf(it.trans) === key) hit = it; });
    return hit;
  }

  function renderProps() {
    var panel = $("props");
    var it = selectedItem();
    if (!state.propsOpen || !it) {
      panel.hidden = true;
      return;
    }
    var doc = state.doc, html = "", title = "Properties";
    if (it.kind === "step") {
      var re = doc.re(it.reId);
      var type = X.reType(re);
      if (type === "Phase") {
        title = "Phase · " + doc.name(re);
        html = P.phaseProps(doc, re, state.edit);
      } else {
        title = (type === "UnitProcedure" ? "Unit procedure · " : "Operation · ") + doc.name(re);
        html = P.containerProps(doc, re, state.edit, MODEL);
      }
    } else if (it.kind === "transition") {
      var tree = state.trees[state.sel.level];
      title = "Transition T" + it.id;
      html = P.transitionProps(doc, it.el, state.edit, !!loopOfTransition(tree, R.keyOf(it)));
    } else if (it.kind === "loop") {
      title = "Loop · T" + it.trans.id;
      html = P.transitionProps(doc, it.trans.el, state.edit, true);
    } else {
      panel.hidden = true;
      return;
    }
    if (!state.edit) html += '<p class="muted">Switch on ✎ Edit to change values.</p>';
    $("propsTitle").textContent = title;
    $("propsBody").innerHTML = html;
    panel.hidden = false;
  }

  function renderCut() {
    var b = $("cutBanner");
    if (!state.cut) {
      b.hidden = true;
      return;
    }
    var where = { up: "the Unit Procedures lane", op: "any unit procedure's Operations lane", ph: "any operation's Phases lane" }[state.cut.level];
    b.innerHTML = "<span>Moving <b>" + esc(state.cut.label) + "</b>: click a highlighted position in " + where +
      ' (select another container first to move it there).</span><button class="btn" type="button" data-cmd="cancelCut">Cancel</button>';
    b.hidden = false;
  }

  // ================================================================ menus
  function closePopover() {
    $("popover").hidden = true;
    $("popover").innerHTML = "";
  }
  /** items: [{label, sub, danger, run}] | {header} | {sep} | {html} */
  function showMenu(anchor, items) {
    var pop = $("popover");
    pop.innerHTML = "";
    items.forEach(function (m) {
      if (!m) return;
      if (m.header) {
        var hd = document.createElement("div");
        hd.className = "menu-h";
        hd.textContent = m.header;
        pop.appendChild(hd);
      } else if (m.sep) {
        var s = document.createElement("div");
        s.className = "menu-sep";
        pop.appendChild(s);
      } else if (m.node) pop.appendChild(m.node);
      else {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "menu-item" + (m.danger ? " danger" : "");
        b.innerHTML = esc(m.label) + (m.sub ? "<small>" + esc(m.sub) + "</small>" : "");
        if (m.disabled) b.disabled = true;
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          closePopover();
          m.run();
        });
        pop.appendChild(b);
      }
    });
    pop.hidden = false;
    var r = anchor.getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.min(r.left, global.innerWidth - w - 10);
    var top = r.bottom + 4;
    if (top + h > global.innerHeight - 10) top = Math.max(10, r.top - h - 4);
    pop.style.left = Math.max(10, left) + "px";
    pop.style.top = top + "px";
    var first = pop.querySelector("input, .menu-item");
    if (first) first.focus();
  }

  /** Searchable list menu (phase pickers). entries: [{label, sub, group, run}] */
  function showPicker(anchor, title, entries) {
    var list = document.createElement("div");
    var search = document.createElement("input");
    search.className = "picker-search";
    search.placeholder = "Filter…";
    function fill(q) {
      list.innerHTML = "";
      var lastGroup = null, shown = 0;
      entries.forEach(function (e) {
        if (q && (e.label + " " + (e.sub || "") + " " + (e.group || "")).toLowerCase().indexOf(q) < 0) return;
        if (e.group && e.group !== lastGroup) {
          var g = document.createElement("div");
          g.className = "menu-h";
          g.textContent = e.group;
          list.appendChild(g);
          lastGroup = e.group;
        }
        var b = document.createElement("button");
        b.type = "button";
        b.className = "menu-item";
        b.innerHTML = esc(e.label) + (e.sub ? "<small>" + esc(e.sub) + "</small>" : "");
        b.addEventListener("click", function (ev) {
          ev.stopPropagation();
          closePopover();
          e.run();
        });
        list.appendChild(b);
        shown++;
      });
      if (!shown) list.innerHTML = '<div class="menu-h">Nothing matches</div>';
    }
    search.addEventListener("input", function () { fill(search.value.trim().toLowerCase()); });
    search.addEventListener("click", function (e) { e.stopPropagation(); });
    fill("");
    showMenu(anchor, [{ header: title }, { node: search }, { node: list }]);
    search.focus();
  }

  // ---------------------------------------------------------------- add menu
  function addMenu(anchor, level, pos) {
    var tree = state.trees[level], doc = state.doc;
    var items = [];
    if (level === "up") items.push({ label: "Unit procedure…", run: function () { dlgUnitProcedure(tree, pos); } });
    if (level === "op") items.push({ label: "Operation…", run: function () { dlgOperation(tree, pos); } });
    if (level === "ph") {
      items.push({ label: "Process phase…", sub: "phases of this unit procedure's process class", run: function () { pickProcessPhase(anchor, tree, pos); } });
      items.push({ label: "Transfer phase…", run: function () { pickTransferPhase(anchor, tree, pos); } });
      items.push({ label: "Allocate / release…", sub: "process or transfer equipment", run: function () { pickAllocate(anchor, tree, pos); } });
    }
    items.push({ sep: true });
    items.push({ label: "Transition", sub: "condition set in its properties", run: function () {
      var id = act(function () { return A.addTransition(doc, tree, pos, ""); });
      if (id) openProps(level, "T:" + id);
    } });
    items.push({ label: "Loop back", sub: "empty loop — drag items into it", run: function () {
      act(function () { return A.addLoop(doc, tree, pos, ""); }, "Loop added — drag items into it and set its condition");
    } });
    items.push({ label: "Branch…", sub: "execute all or execute one, any number of lanes", run: function () { dlgBranch(tree, pos); } });
    showMenu(anchor, [{ header: "Insert here" }].concat(items));
  }

  function currentProcessClass() {
    var up = upRE();
    return up ? state.doc.processClassOf(state.doc.upProcessInstance(up)) : "";
  }

  function pickProcessPhase(anchor, tree, pos) {
    var up = upRE(), doc = state.doc;
    var instance = doc.upProcessInstance(up), pc = currentProcessClass();
    var phases = (MODEL.processes[pc] && MODEL.processes[pc].phases) || {};
    var entries = Object.keys(phases).sort().map(function (name) {
      return {
        label: name,
        sub: phases[name].map(function (p) { return p.name; }).join(", "),
        run: function () {
          var id = act(function () {
            return A.addPhase(doc, tree, pos, { phaseType: "Process", name: name, parentInstance: instance, processClass: pc }, MODEL);
          }, "Added " + name);
          if (id) state.sel = { level: "ph", key: "S:" + id }, render();
        },
      };
    });
    if (!entries.length) return toast("No phases are configured for process class '" + pc + "' (instance " + instance + ").", true);
    showPicker(anchor, "Process phase · " + instance + " (" + pc + ")", entries);
  }

  function pickTransferPhase(anchor, tree, pos) {
    var doc = state.doc, pc = currentProcessClass();
    var entries = [];
    doc.transfers()
      .sort(function (a, b) {
        var ra = a.source === pc || a.dest === pc ? 0 : 1, rb = b.source === pc || b.dest === pc ? 0 : 1;
        return ra - rb || a.name.localeCompare(b.name);
      })
      .forEach(function (t) {
        var phases = MODEL.transfer_phases[t.name] || {};
        Object.keys(phases).sort().forEach(function (name) {
          entries.push({
            group: t.name + " (" + t.source + " → " + t.dest + ")",
            label: name,
            sub: phases[name].map(function (p) { return p.name; }).join(", "),
            run: function () {
              var id = act(function () {
                return A.addPhase(doc, tree, pos, { phaseType: "Transfer", name: name, parentInstance: t.name }, MODEL);
              }, "Added " + name);
              if (id) state.sel = { level: "ph", key: "S:" + id }, render();
            },
          });
        });
      });
    if (!entries.length) return toast("The recipe has no transfers with configured phases. Add process classes in Recipe details → Equipment.", true);
    showPicker(anchor, "Transfer phase", entries);
  }

  function pickAllocate(anchor, tree, pos) {
    var doc = state.doc, entries = [];
    doc.processInstances().forEach(function (i) {
      [["AllocateProcess", "Allocate Process"], ["ReleaseProcess", "Release Process"]].forEach(function (k) {
        entries.push({ group: k[1], label: i.name, sub: i.processClass, run: function () {
          act(function () { return A.addPhase(doc, tree, pos, { phaseType: k[0], name: k[1], parentInstance: i.name }, MODEL); });
        } });
      });
    });
    doc.transfers().forEach(function (t) {
      [["AllocateTransfer", "Allocate Transfer"], ["ReleaseTransfer", "Release Transfer"]].forEach(function (k) {
        entries.push({ group: k[1], label: t.name, sub: t.source + " → " + t.dest, run: function () {
          act(function () { return A.addPhase(doc, tree, pos, { phaseType: k[0], name: k[1], parentInstance: t.name }, MODEL); });
        } });
      });
    });
    entries.sort(function (a, b) { return a.group.localeCompare(b.group); });
    showPicker(anchor, "Allocate / release", entries);
  }

  // ---------------------------------------------------------------- item menus
  function itemMenu(anchor, level, uid, kind) {
    var tree = state.trees[level], doc = state.doc;
    var at = BE.ops.locate(tree, uid);
    var it = at.item, key = R.keyOf(it);
    var items = [];
    if (kind === "loop-trans") {
      var loop = at.loop;
      items.push({ label: "Edit loop condition", run: function () { openProps(level, key); } });
      items.push({ label: "Remove loop", sub: "keeps the items inside", run: function () { act(function () { A.removeLoop(doc, tree, loop.uid); }, "Loop removed"); } });
      return showMenu(anchor, items);
    }
    if (it.kind === "step" || it.kind === "transition") items.push({ label: "Properties", run: function () { openProps(level, key); } });
    if (it.kind === "step" && level !== "ph") items.push({ label: "Open", sub: level === "up" ? "show its operations" : "show its phases", run: function () { openContainer(level, it.reId); } });
    if (it.kind === "loop") items.push({ label: "Edit loop condition", run: function () { openProps(level, key); } });
    items.push({ label: "Move…", sub: "then click the destination (other containers too)", run: function () { startCut(level, it); } });
    if (it.kind === "step" || it.kind === "parallel") items.push({ label: "Loop back around this", run: function () {
      act(function () { A.wrapInLoop(doc, tree, uid, ""); }, "Loop added — set its condition");
    } });
    if (it.kind === "parallel") {
      items.push({ label: "Add lane", run: function () { act(function () { A.addLane(doc, tree, uid); }); } });
      var other = it.mode === "Serial" ? "Parallel" : "Serial";
      items.push({
        label: other === "Serial" ? "Change to execute one (serial)" : "Change to execute all (parallel)",
        run: function () { act(function () { A.setBranchMode(doc, tree, uid, other); }, other === "Serial" ? "Branch now executes one lane" : "Branch now executes all lanes"); },
      });
    }
    items.push({ sep: true });
    if (it.kind === "loop") {
      items.push({ label: "Remove loop", sub: "keeps the items inside", run: function () { act(function () { A.removeLoop(doc, tree, uid); }, "Loop removed"); } });
      items.push({ label: "Delete loop and its contents", danger: true, run: function () { deleteItem(level, uid); } });
    } else items.push({ label: it.kind === "parallel" ? "Delete branch and its contents" : "Delete", danger: true, run: function () { deleteItem(level, uid); } });
    showMenu(anchor, items);
  }

  function laneMenu(anchor, level, parUid, laneIndex) {
    var tree = state.trees[level], doc = state.doc;
    var par = BE.ops.locate(tree, parUid).item;
    var n = par.lanes[laneIndex].length;
    showMenu(anchor, [
      { header: "Branch " + R.laneLetter(laneIndex) },
      { label: "Add lane", run: function () { act(function () { A.addLane(doc, tree, parUid); }); } },
      { sep: true },
      {
        label: "Delete this lane" + (n ? " and its contents" : ""),
        sub: par.lanes.length === 2 ? "the other lane joins the main route" : "",
        danger: true,
        run: function () {
          if (n && !global.confirm("Delete Branch " + R.laneLetter(laneIndex) + " and the " + n + " item(s) in it?")) return;
          act(function () { A.removeLane(doc, tree, parUid, laneIndex); }, "Lane deleted");
        },
      },
    ]);
  }

  function deleteItem(level, uid) {
    var tree = state.trees[level], doc = state.doc;
    var at = BE.ops.locate(tree, uid);
    var it = at.item;
    var inner = BE.ops.stepsIn(it).length;
    var msg = null;
    if (it.kind === "step" && level !== "ph") {
      var n = stepsCount(doc.re(it.reId));
      if (n > 0) msg = "Delete " + doc.name(doc.re(it.reId)) + " and everything in it (" + n + (level === "up" ? " operation" : " phase") + (n === 1 ? "" : "s") + ")?";
    } else if ((it.kind === "parallel" || it.kind === "loop") && inner) msg = "Delete this " + (it.kind === "loop" ? "loop" : "branch") + " and the " + inner + " item(s) inside it?";
    if (msg && !global.confirm(msg)) return;
    act(function () { A.remove(doc, tree, uid); }, "Deleted");
    if (state.sel && state.sel.key === R.keyOf(it)) state.sel = null, render();
  }

  // ---------------------------------------------------------------- dialogs
  function modal(title, html, onOk, okLabel) {
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = html + '<div class="form-error" id="modalErr" hidden></div><div class="modal-actions"><button class="btn" type="button" data-cmd="closeModal">Cancel</button><button class="btn primary" type="button" id="modalOk">' + esc(okLabel || "OK") + "</button></div>";
    $("modal").hidden = $("modalBack").hidden = false;
    $("modalOk").onclick = function () {
      try {
        if (onOk() !== false) closeModal();
      } catch (e) {
        $("modalErr").textContent = e.message;
        $("modalErr").hidden = false;
      }
    };
    var first = $("modalBody").querySelector("input, textarea, select");
    if (first) first.focus();
  }
  function closeModal() {
    $("modal").hidden = $("modalBack").hidden = true;
  }
  function modalError(msg) {
    $("modalErr").textContent = msg;
    $("modalErr").hidden = false;
    return false;
  }

  function dlgBranch(tree, pos) {
    modal(
      "New branch",
      '<div class="field"><label>Execution</label>' +
        '<label class="radio"><input type="radio" name="bMode" value="Parallel" checked> <b>Execute all</b> — every lane runs (parallel)</label>' +
        '<label class="radio"><input type="radio" name="bMode" value="Serial"> <b>Execute one</b> — one lane runs (serial)</label></div>' +
        '<div class="field"><label>Number of lanes (2–' + BE.ops.MAX_LANES + ')</label><input id="bCount" type="number" min="2" max="' + BE.ops.MAX_LANES + '" value="2"></div>' +
        '<p class="muted">Empty lanes are created; add items with their + or drag items into them.</p>',
      function () {
        var n = parseInt($("bCount").value, 10);
        if (!(n >= 2 && n <= BE.ops.MAX_LANES)) return modalError("Enter a lane count between 2 and " + BE.ops.MAX_LANES + ".");
        var mode = document.querySelector('input[name="bMode"]:checked').value;
        act(function () { A.addBranch(state.doc, tree, pos, n, mode); }, (mode === "Serial" ? "Execute-one" : "Execute-all") + " branch with " + n + " lanes added");
      },
      "Add branch"
    );
  }

  function dlgOperation(tree, pos) {
    var name = A.uniqueName(state.doc, tree, "Operation");
    modal("New operation", '<div class="field"><label>Operation name</label><input id="dName" value="' + esc(name) + '"></div>', function () {
      var v = $("dName").value.trim();
      if (!v) return modalError("A name is required.");
      var id = act(function () { return A.addOperation(state.doc, tree, pos, v); }, "Operation added");
      if (id) { state.opId = id; render(); }
    }, "Add operation");
  }
  function dlgUnitProcedure(tree, pos) {
    var insts = state.doc.processInstances();
    if (!insts.length) return toast("Add a process class first (Recipe details → Equipment requirements).", true);
    var name = A.uniqueName(state.doc, tree, "Unit procedure");
    modal(
      "New unit procedure",
      '<div class="field"><label>Name</label><input id="dName" value="' + esc(name) + '"></div>' +
      '<div class="field"><label>Process instance</label><select id="dInst">' + insts.map(function (i) {
        return '<option value="' + esc(i.name) + '">' + esc(i.name + " (" + i.processClass + ")") + "</option>";
      }).join("") + "</select></div>",
      function () {
        var v = $("dName").value.trim();
        if (!v) return modalError("A name is required.");
        var id = act(function () { return A.addUnitProcedure(state.doc, tree, pos, v, $("dInst").value); }, "Unit procedure added");
        if (id) { state.upId = id; state.opId = null; render(); }
      },
      "Add unit procedure"
    );
  }
  function dlgNewRecipe() {
    if (!confirmDiscard()) return;
    modal(
      "New recipe",
      '<div class="field"><label>Recipe ID *</label><input id="nId" placeholder="e.g. GM_A8207M"></div>' +
      '<div class="field"><label>Description</label><input id="nDesc"></div>' +
      '<div class="field"><label>Product ID</label><input id="nProd"></div>' +
      '<div class="field"><label>Batch size (kg)</label><input id="nBatch" type="number"></div>',
      function () {
        var id = $("nId").value.trim();
        if (!id) return modalError("Recipe ID is required.");
        load(BE.RecipeDoc.blankXml({ id: id, description: $("nDesc").value.trim(), productId: $("nProd").value.trim(), batchNominal: $("nBatch").value || "0" }), id + ".xml");
        state.doc.dirty = true;
        state.edit = true;
        state.details = true;
        render();
        toast("Blank recipe created — add process classes, then unit procedures");
      },
      "Create"
    );
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dlgSave() {
    var logs = state.doc.modificationLogs();
    var author = "";
    try { author = global.localStorage.getItem("abe.author") || ""; } catch (e) { /* ignore */ }
    var last = logs[logs.length - 1];
    modal(
      "Save recipe XML",
      '<div class="muted">Saving as version <b>V' + (logs.length + 1) + "</b>" + (last ? " · last: " + esc(last.author) + " " + esc((last.date || "").split("T")[0]) + " — " + esc(last.description) : "") + "</div>" +
      '<div class="field"><label>Author *</label><input id="sAuthor" value="' + esc(author) + '"></div>' +
      '<div class="field"><label>Comment *</label><textarea id="sComment" rows="3" placeholder="What changed in this version?"></textarea></div>',
      function () {
        var a = $("sAuthor").value.trim(), c = $("sComment").value.trim();
        if (!a) return modalError("Author is required.");
        if (!c) return modalError("A comment is required.");
        try { global.localStorage.setItem("abe.author", a); } catch (e) { /* ignore */ }
        var d = new Date();
        var iso = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
        state.doc.edit("Modification log", function () { state.doc.addModificationLog(a, c, iso); });
        download();
        state.doc.dirty = false;
        render();
        toast("Saved V" + state.doc.modificationLogs().length);
      },
      "Save & download"
    );
    setTimeout(function () { (author ? $("sComment") : $("sAuthor")).focus(); }, 30);
  }
  function download() {
    var xml = state.doc.xml();
    var blob = new Blob([xml], { type: "text/xml" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (state.doc.header().id || "recipe") + ".xml";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function dlgHistory() {
    var logs = state.doc.modificationLogs();
    var html = logs.length
      ? '<table class="dt"><thead><tr><th>#</th><th>Date</th><th>Author</th><th>Comment</th></tr></thead><tbody>' +
        logs.map(function (l, i) { return "<tr><td>V" + (i + 1) + "</td><td>" + esc((l.date || "").replace("T", " ")) + "</td><td>" + esc(l.author) + "</td><td>" + esc(l.description) + "</td></tr>"; }).reverse().join("") + "</tbody></table>"
      : '<p class="muted">No revision history recorded.</p>';
    modal("Revision history", html, function () {}, "Close");
  }

  // ---------------------------------------------------------------- selection & navigation
  function openProps(level, key) {
    state.sel = { level: level, key: key };
    state.propsOpen = true;
    render();
  }
  function openContainer(level, reId) {
    if (level === "up") {
      if (state.upId !== reId) state.opId = null;
      state.upId = reId;
    } else if (level === "op") state.opId = reId;
    state.sel = { level: level, key: "S:" + reId };
    render();
  }
  /** Open the unit procedure and operation that contain a phase, select it and show it. */
  function gotoPhase(reId) {
    var re = state.doc.re(reId);
    if (!re) return toast("That phase no longer exists.", true);
    var op = re.parentNode, up = op && op.parentNode;
    state.upId = X.text(up, "ID");
    state.opId = X.text(op, "ID");
    state.sel = { level: "ph", key: "S:" + reId };
    state.propsOpen = true;
    render();
    var card = document.querySelector('#lanePH .node[data-key="S:' + reId + '"]');
    if (card) {
      document.getElementById("lanes").scrollIntoView({ behavior: "smooth", block: "start" });
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  function startCut(level, it) {
    state.cut = { level: level, key: R.keyOf(it), ownerId: X.text(state.owners[level], "ID"), label: itemLabel(it) };
    state.propsOpen = false;
    render();
  }
  function pasteAt(level, pos) {
    var c = state.cut, doc = state.doc;
    var dstOwner = state.owners[level];
    var dstId = X.text(dstOwner, "ID");
    state.cut = null;
    act(function () {
      if (c.ownerId === dstId) {
        var tree = state.trees[level];
        var item = BE.sfc.findByKey(tree, c.key);
        if (!item) throw new BE.ops.EditError("The item to move no longer exists.");
        if (!A.move(doc, tree, item.uid, pos)) return;
      } else {
        var src = doc.re(c.ownerId);
        if (!src) throw new BE.ops.EditError("The source container no longer exists.");
        A.transfer(doc, src, c.key, state.trees[level], pos);
      }
    }, "Moved " + c.label);
  }

  // ================================================================ events
  function onClick(e) {
    var t = e.target;
    if (!$("popover").hidden && !t.closest("#popover")) closePopover();
    var cmdEl = t.closest("[data-cmd]");
    if (cmdEl && !cmdEl.disabled) return command(cmdEl.getAttribute("data-cmd"), cmdEl, e);
    var laneBody = t.closest(".lane-body");
    if (!laneBody || !state.doc) return;
    var level = levelOf(laneBody);

    var slot = t.closest(".slot");
    if (slot) {
      var pos = { seq: slot.getAttribute("data-seq"), index: parseInt(slot.getAttribute("data-index"), 10) };
      if (state.cut) {
        if (state.cut.level === level) pasteAt(level, pos);
        return;
      }
      if (t.closest(".slot-add") || slot.classList.contains("slot-empty")) addMenu(t.closest(".slot-add") || slot, level, pos);
      return;
    }
    var kebab = t.closest(".kebab");
    if (kebab) {
      e.stopPropagation();
      var kind = kebab.getAttribute("data-menu");
      var holder = kebab.closest("[data-uid]");
      if (kind === "lane") return laneMenu(kebab, level, holder.getAttribute("data-uid"), parseInt(kebab.getAttribute("data-lane"), 10));
      return itemMenu(kebab, level, holder.getAttribute("data-uid"), kind);
    }
    var node = t.closest(".node, .loop-head");
    if (!node) return;
    var holderEl = node.classList.contains("loop-head") ? node.closest(".loop") : node;
    var key = holderEl.getAttribute("data-key");
    var tree = state.trees[level];
    var item = tree && BE.sfc.findByKey(tree, key);
    if (!item) return;
    if (item.kind === "step" && level !== "ph") return openContainer(level, item.reId);
    if (node.classList.contains("loop-trans")) key = holderEl.getAttribute("data-key");
    openProps(level, key);
  }

  function onDblClick(e) {
    var node = e.target.closest(".node");
    if (!node || !state.doc) return;
    var level = levelOf(node);
    if (level !== "ph") openProps(level, node.getAttribute("data-key"));
  }

  function command(cmd, el) {
    var doc = state.doc;
    switch (cmd) {
      case "new": return dlgNewRecipe();
      case "open": if (confirmDiscard()) $("fileInput").click(); return;
      case "save": return dlgSave();
      case "edit": state.edit = !state.edit; state.cut = null; return render();
      case "undo": if (doc && doc.canUndo()) { var u = doc.undo(); toast("Undone: " + u); render(); } return;
      case "redo": if (doc && doc.canRedo()) { var r = doc.redo(); toast("Redone: " + r); render(); } return;
      case "details": state.details = !state.details; return render();
      case "print": return printRecipe();
      case "closeProps": state.propsOpen = false; return render();
      case "closeModal": return closeModal();
      case "cancelCut": state.cut = null; return render();
      case "addClass": {
        var sel = $("addClassSel");
        if (!sel || !sel.value) return;
        return act(function () { doc.edit("Add process class", function () { doc.addProcessClass(sel.value, MODEL); }); }, "Added " + sel.value);
      }
      case "removeClass": {
        var cls = el.getAttribute("data-arg");
        if (!global.confirm("Remove process class " + cls + "?")) return;
        return act(function () { doc.edit("Remove process class", function () { doc.removeProcessClass(cls); }); });
      }
      case "addMaterial": return act(function () { doc.edit("Add material", function () { doc.addMaterial(""); }); });
      case "toggleBom": {
        var k = el.getAttribute("data-arg");
        if (state.bomOpen[k]) delete state.bomOpen[k];
        else state.bomOpen[k] = true;
        return render();
      }
      case "bomAll": {
        var mats = doc.materials();
        var anyClosed = mats.some(function (m) { return !state.bomOpen[m.id]; });
        state.bomOpen = {};
        if (anyClosed) mats.forEach(function (m) { state.bomOpen[m.id] = true; });
        return render();
      }
      case "gotoPhase": return gotoPhase(el.getAttribute("data-arg"));
      case "removeMaterial": {
        var fid = el.getAttribute("data-arg");
        return act(function () { doc.edit("Remove material", function () { doc.removeMaterial(fid); }); });
      }
    }
  }

  /** Every editable control has data-bind="<target>:<args>". */
  function onChange(e) {
    var el = e.target.closest("[data-bind]");
    if (!el || !state.doc || !state.edit) return;
    var doc = state.doc;
    var parts = el.getAttribute("data-bind").split(":");
    var v = el.value;
    act(function () {
      doc.edit("Edit " + parts[0], function () {
        switch (parts[0]) {
          case "header": return doc.setHeader(parts[1], v);
          case "inst": return doc.setInstanceField(parts[1], parts[2], parts[3], v);
          case "mat": return doc.setMaterial(parts[1], parts[2], parts[2] === "materialId" ? v.split(/\s/)[0] : v);
          case "param": return doc.setPhaseParam(doc.re(parts[1]), parts[2], v);
          case "parammat": return doc.setPhaseParamMaterial(doc.re(parts[1]), parts[2], v);
          case "name": if (!v.trim()) throw new Error("A name is required."); return doc.setName(doc.re(parts[1]), v.trim());
          case "desc": return X.setText(doc.re(parts[1]), "Description", v, X.NS);
          case "upinst": {
            var moved = doc.setUpProcessInstance(doc.re(parts[1]), v);
            if (moved) setTimeout(function () { toast(moved + " phase(s) now use " + v); }, 0);
            return;
          }
          case "trans": {
            var all = doc.doc.getElementsByTagNameNS(X.NS, "Transition");
            for (var i = 0; i < all.length; i++)
              if (X.text(all[i], "ID") === parts[1]) {
                var f = {};
                f[parts[2]] = v;
                return doc.setTransition(all[i], f);
              }
            throw new Error("Transition not found.");
          }
        }
        throw new Error("Unknown field " + parts[0]);
      });
    });
  }

  // ---------------------------------------------------------------- drag & drop
  function onDragStart(e) {
    if (!state.edit || state.cut) return;
    var src = e.target.closest("[draggable=true]");
    if (!src) return;
    var level = levelOf(src);
    var uid = src.getAttribute("data-drag") || src.getAttribute("data-uid");
    var tree = state.trees[level];
    var it = tree && BE.ops.locate(tree, uid).item;
    if (!it) return;
    e.stopPropagation();
    state.drag = { level: level, uid: uid, key: R.keyOf(it), ownerId: X.text(state.owners[level], "ID"), label: itemLabel(it) };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemLabel(it));
    var lane = src.closest(".lane");
    (src.closest(".node, .par, .loop") || src).classList.add("dragging");
    setTimeout(function () { lane.classList.add("targeting"); }, 0);
    if (level === "ph") document.querySelector('.lane[data-level="op"]').classList.add("drop-containers");
    if (level === "op") document.querySelector('.lane[data-level="up"]').classList.add("drop-containers");
  }
  function dropTarget(e) {
    if (!state.drag) return null;
    var slot = e.target.closest(".slot");
    if (slot && levelOf(slot) === state.drag.level) return { slot: slot };
    // Dropping a phase on an operation card (or an operation on a unit procedure card)
    var card = e.target.closest(".node.step");
    var lvl = card && levelOf(card);
    if (card && ((state.drag.level === "ph" && lvl === "op") || (state.drag.level === "op" && lvl === "up"))) return { card: card, level: lvl };
    return null;
  }
  function onDragOver(e) {
    var t = dropTarget(e);
    if (!t) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    document.querySelectorAll(".over").forEach(function (o) { if (o !== (t.slot || t.card)) o.classList.remove("over"); });
    (t.slot || t.card).classList.add("over");
  }
  function onDrop(e) {
    var t = dropTarget(e);
    if (!t) return;
    e.preventDefault();
    var d = state.drag;
    endDrag();
    var doc = state.doc;
    if (t.slot) {
      var level = d.level;
      var pos = { seq: t.slot.getAttribute("data-seq"), index: parseInt(t.slot.getAttribute("data-index"), 10) };
      var tree = state.trees[level];
      act(function () {
        var item = BE.sfc.findByKey(tree, d.key);
        if (!A.move(doc, tree, item.uid, pos)) return;
        toast("Moved " + d.label);
      });
      return;
    }
    var cardTree = state.trees[t.level];
    var target = BE.sfc.findByKey(cardTree, t.card.getAttribute("data-key"));
    if (!target || target.kind !== "step") return;
    if (target.reId === d.ownerId) return toast("It is already in " + doc.name(doc.re(target.reId)));
    act(function () {
      var dst = doc.re(target.reId);
      var dstTree = doc.tree(dst);
      A.transfer(doc, doc.re(d.ownerId), d.key, dstTree, { seq: "top", index: dstTree.seq.length });
    }, "Moved " + d.label + " to the end of " + doc.name(doc.re(target.reId)));
  }
  function endDrag() {
    state.drag = null;
    document.querySelectorAll(".targeting, .drop-containers").forEach(function (l) { if (!state.cut) l.classList.remove("targeting"); l.classList.remove("drop-containers"); });
    document.querySelectorAll(".over, .dragging").forEach(function (o) { o.classList.remove("over"); o.classList.remove("dragging"); });
  }

  // ---------------------------------------------------------------- keyboard
  function onKey(e) {
    if (e.key === "Escape") {
      if (!$("popover").hidden) return closePopover();
      if (!$("modal").hidden) return closeModal();
      if (state.cut) { state.cut = null; return render(); }
      if (state.propsOpen) { state.propsOpen = false; return render(); }
      return;
    }
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (!state.doc || !state.edit || typing || !$("modal").hidden) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); command(e.shiftKey ? "redo" : "undo"); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); command("redo"); }
    else if (e.key === "Delete" && state.sel) {
      var it = selectedItem();
      if (!it) return;
      var tree = state.trees[state.sel.level];
      var loop = it.kind === "transition" && loopOfTransition(tree, R.keyOf(it));
      if (loop) act(function () { A.removeLoop(state.doc, tree, loop.uid); }, "Loop removed");
      else deleteItem(state.sel.level, it.uid);
    }
  }

  // ---------------------------------------------------------------- print
  function printRecipe() {
    var doc = state.doc, h = doc.header();
    var html = "<h1>" + esc(h.id) + " — " + esc(h.description) + "</h1><div>Product " + esc(h.productId) + " · batch " + esc(h.batchNominal) + " · V" + doc.modificationLogs().length + " · printed " + esc(new Date().toLocaleString()) + "</div>";
    var ctx = function (tree, level) { return R.lane({ doc: doc, tree: tree, level: level, edit: false, showParams: true }); };
    try {
      var master = doc.tree(doc.master);
      html += "<h2>Unit procedures</h2>" + ctx(master, "up");
      BE.sfc.walkItems(master.seq, function (u) {
        if (u.kind !== "step") return;
        var up = doc.re(u.reId);
        var ut = doc.tree(up);
        html += "<h2>Unit procedure: " + esc(doc.name(up)) + " (" + esc(doc.upProcessInstance(up)) + ")</h2>" + ctx(ut, "op");
        BE.sfc.walkItems(ut.seq, function (o) {
          if (o.kind !== "step") return;
          var op = doc.re(o.reId);
          html += "<h3>Operation: " + esc(doc.name(op)) + "</h3>" + ctx(doc.tree(op), "ph");
        });
      });
    } catch (e) {
      html += '<p class="lane-error">' + esc(e.message) + "</p>";
    }
    $("printView").innerHTML = html;
    global.print();
  }

  // ---------------------------------------------------------------- zoom
  function onZoom(e) {
    var b = e.target.closest("[data-z]");
    if (!b) return;
    var level = b.closest("[data-zoom]").getAttribute("data-zoom");
    state.zoom[level] = Math.max(40, Math.min(160, state.zoom[level] + 10 * parseInt(b.getAttribute("data-z"), 10)));
    try { global.localStorage.setItem("abe.zoom", JSON.stringify(state.zoom)); } catch (err) { /* ignore */ }
    e.stopPropagation();
    render();
  }

  // ================================================================ init
  function init() {
    var dl = $("materialList");
    dl.innerHTML = (global.MATERIALS_DATA || []).map(function (m) {
      return '<option value="' + esc(m.id) + '">' + esc(m.name + " (" + m.code + ")") + "</option>";
    }).join("");
    document.addEventListener("click", onClick);
    document.addEventListener("dblclick", onDblClick);
    document.addEventListener("change", onChange);
    document.addEventListener("keydown", onKey);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    document.addEventListener("dragend", endDrag);
    document.querySelectorAll(".zoom").forEach(function (z) { z.addEventListener("click", onZoom); });
    $("versionBadge").addEventListener("click", function () { if (state.doc) dlgHistory(); });
    $("showParams").addEventListener("change", function (e) { state.showParams = e.target.checked; render(); });
    $("modalBack").addEventListener("click", closeModal);

    function readFile(f) {
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { load(String(r.result), f.name); };
      r.readAsText(f);
    }
    $("fileInput").addEventListener("change", function (e) { readFile(e.target.files[0]); e.target.value = ""; });
    var dz = $("dropZone");
    dz.addEventListener("click", function () { $("fileInput").click(); });
    dz.addEventListener("dragover", function (e) { if (e.dataTransfer.types.indexOf("Files") >= 0) { e.preventDefault(); dz.classList.add("over"); } });
    dz.addEventListener("dragleave", function () { dz.classList.remove("over"); });
    dz.addEventListener("drop", function (e) {
      e.preventDefault();
      dz.classList.remove("over");
      readFile(e.dataTransfer.files[0]);
    });
    // Opening a file by dropping it anywhere on the page
    document.addEventListener("dragover", function (e) { if (!state.drag && e.dataTransfer.types.indexOf("Files") >= 0) e.preventDefault(); });
    document.addEventListener("drop", function (e) {
      if (state.drag || !e.dataTransfer.files.length) return;
      e.preventDefault();
      if (confirmDiscard()) readFile(e.dataTransfer.files[0]);
    });
    global.addEventListener("beforeunload", function (e) {
      if (state.doc && state.doc.dirty) { e.preventDefault(); e.returnValue = ""; }
    });
    render();
  }

  // Exposed for automated UI tests and the browser console.
  BE.app = { state: state, load: load, render: render };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
