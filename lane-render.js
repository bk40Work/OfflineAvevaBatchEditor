/**
 * lane-render.js — draws one route tree as a vertical flowchart (HTML string).
 *
 * Pure view: it reads the tree and the RecipeDoc, never changes anything.
 * Interaction is wired by app.js through data-* attributes:
 *   data-uid   item in the rendered tree       data-key  stable identity
 *   data-seq / data-index   insertion slot (position)
 *   data-lane  branch lane index (with data-uid of the branch)
 */
(function (global) {
  "use strict";
  var BE = (global.BatchEditor = global.BatchEditor || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var keyOf = BE.sfc.keyOf, findByKey = BE.sfc.findByKey;

  /** AVEVA writes a huge uninitialised double (8343759…) for values held elsewhere. */
  function isUnset(v) {
    return v === "" || /^\d{25,}$/.test(String(v));
  }

  var TYPE_BADGE = {
    Process: ["PROC", "b-proc"],
    Transfer: ["XFER", "b-xfer"],
    AllocateProcess: ["ALLOC", "b-alloc"],
    ReleaseProcess: ["REL", "b-alloc"],
    AllocateTransfer: ["ALLOC X", "b-alloc"],
    ReleaseTransfer: ["REL X", "b-alloc"],
  };

  function laneLetter(k) {
    var s = "";
    k += 1;
    while (k > 0) {
      var m = (k - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      k = Math.floor((k - 1) / 26);
    }
    return s;
  }

  /**
   * ctx: { doc, tree, level: "up"|"op"|"ph", edit, selKey, activeKey, cutKey,
   *        showParams, stats(reId)->string }
   */
  function render(ctx) {
    var doc = ctx.doc;
    var out = [];
    var menuBtn = function (attrs, title) {
      return ctx.edit ? '<button class="kebab" type="button" ' + attrs + ' title="' + esc(title || "Actions") + '">⋮</button>' : "";
    };
    var handle = function () {
      return ctx.edit ? '<span class="grip" title="Drag to move">⠿</span>' : "";
    };

    // empty: false | "lane" | "loop" | "route"
    function slot(seqKey, index, empty) {
      var label = { lane: "Empty branch lane", loop: "Empty loop — drag items here", route: "Empty — add the first item" }[empty];
      if (!ctx.edit)
        return empty === "lane" || empty === "loop" ? '<div class="empty-lane">' + label + "</div>" : '<div class="conn"></div>';
      return (
        '<div class="slot' + (empty ? " slot-empty" : "") + '" data-seq="' + esc(seqKey) + '" data-index="' + index + '">' +
        (empty ? '<span class="slot-label">' + label + "</span>" : "") +
        '<button class="slot-add" type="button" title="Insert here">+</button></div>'
      );
    }

    function seq(items, seqKey, emptyKind) {
      if (!items.length) return slot(seqKey, 0, emptyKind);
      var h = slot(seqKey, 0);
      items.forEach(function (it, i) {
        h += item(it);
        h += slot(seqKey, i + 1);
      });
      return h;
    }

    function stepCard(it) {
      var key = keyOf(it);
      var re = doc.re(it.reId);
      var cls = "node step";
      var body = "";
      if (!re) return '<div class="node step missing">Missing element #' + esc(it.reId) + "</div>";
      var type = BE.xml.reType(re);
      var name = doc.name(re);
      if (type === "Phase") {
        var pi = doc.phaseInfo(re);
        var badge = TYPE_BADGE[pi.phaseType] || [pi.phaseType, "b-proc"];
        cls += " ph-" + pi.phaseType.toLowerCase();
        body =
          '<div class="n-title">' + handle() + '<span class="n-name">' + esc(pi.name) + "</span>" +
          '<span class="badge ' + badge[1] + '">' + esc(badge[0]) + "</span>" +
          '<span class="n-id">#' + esc(it.reId) + "</span>" + menuBtn('data-menu="item"') + "</div>" +
          '<div class="n-sub">' + esc(pi.parentInstance) + (pi.label ? " · label " + esc(pi.label) : "") + "</div>";
        if (ctx.showParams) {
          var params = doc.phaseParams(re);
          if (params.length)
            body += '<div class="n-params">' + params.map(function (p) {
              var unset = isUnset(p.value);
              var v = unset ? "unset" : p.value;
              if (p.type === "ProcessInput") v = (p.materialId ? BE.panels.materialLabel(p.materialId) || p.materialId : "no material") + " · " + v;
              return '<span class="pchip' + (p.type === "ProcessInput" ? " mat" : "") + (unset ? " unset" : "") + '" title="' + esc(p.name + " = " + v) + '"><b>' + esc(p.name) + "</b> " + esc(v) + "</span>";
            }).join("") + "</div>";
        }
      } else {
        cls += type === "Operation" ? " op" : " up";
        var sub = type === "UnitProcedure" ? doc.upProcessInstance(re) : "";
        var stat = ctx.stats ? ctx.stats(it.reId) : "";
        body =
          '<div class="n-title">' + handle() + '<span class="n-name">' + esc(name) + "</span>" +
          '<span class="n-id">#' + esc(it.reId) + "</span>" + menuBtn('data-menu="item"') + "</div>" +
          (sub || stat ? '<div class="n-sub">' + esc(sub) + (sub && stat ? " · " : "") + esc(stat) + "</div>" : "");
      }
      if (key === ctx.selKey) cls += " sel";
      if (key === ctx.activeKey) cls += " active";
      if (key === ctx.cutKey) cls += " cut";
      return '<div class="' + cls + '" data-uid="' + it.uid + '" data-key="' + esc(key) + '"' + (ctx.edit ? ' draggable="true"' : "") + ">" + body + "</div>";
    }

    function transitionCard(it, loop) {
      var key = keyOf(it);
      var info = doc.transitionInfo(it.el);
      var cls = "node trans" + (loop ? " loop-trans" : "");
      if (key === ctx.selKey) cls += " sel";
      if (key === ctx.cutKey) cls += " cut";
      var cond = info.condition || "(no condition)";
      return (
        '<div class="' + cls + '" data-uid="' + it.uid + '" data-key="' + esc(key) + '"' + (ctx.edit && !loop ? ' draggable="true"' : "") + ">" +
        '<span class="t-mark"></span>' + (loop ? "" : handle()) +
        '<span class="t-cond' + (info.condition ? "" : " none") + '">' + esc(cond) + "</span>" +
        '<span class="n-id">T' + esc(info.id) + "</span>" +
        menuBtn('data-menu="' + (loop ? "loop-trans" : "item") + '"') + "</div>"
      );
    }

    function item(it) {
      if (it.kind === "step") return stepCard(it);
      if (it.kind === "transition") return transitionCard(it, false);
      if (it.kind === "parallel") {
        var key = keyOf(it);
        var h = '<div class="par' + (key === ctx.cutKey ? " cut" : "") + '" data-uid="' + it.uid + '" data-key="' + esc(key) + '">';
        h += '<div class="par-bar fork"' + (ctx.edit ? ' draggable="true" data-drag="' + it.uid + '"' : "") + ">" + handle() +
          "<span>" + (it.mode === "Parallel" ? "Parallel branch" : esc(it.mode) + " branch") + " · " + it.lanes.length + " lanes</span>" +
          menuBtn('data-menu="parallel"', "Branch actions") + "</div>";
        h += '<div class="par-lanes">';
        it.lanes.forEach(function (lane, k) {
          h += '<div class="lane-col"><div class="lane-head">Branch ' + laneLetter(k) +
            (ctx.edit ? '<button class="kebab" type="button" data-menu="lane" data-lane="' + k + '" title="Lane actions">⋮</button>' : "") +
            "</div>" + seq(lane, it.uid + ":" + k, "lane") + "</div>";
        });
        h += "</div><div class=\"par-bar join\"><span>Join</span></div></div>";
        return h;
      }
      if (it.kind === "loop") {
        var lkey = keyOf(it);
        var lh = '<div class="loop' + (lkey === ctx.cutKey ? " cut" : "") + (lkey === ctx.selKey ? " sel" : "") + '" data-uid="' + it.uid + '" data-key="' + esc(lkey) + '">';
        lh += '<div class="loop-head"' + (ctx.edit ? ' draggable="true" data-drag="' + it.uid + '"' : "") + ">" + handle() +
          '<span class="loop-icon">↺</span><span>Loop back point</span>' + menuBtn('data-menu="loop"', "Loop actions") + "</div>";
        lh += '<div class="loop-body">' + seq(it.body, it.uid + ":body", "loop") + "</div>";
        lh += transitionCard(it.trans, true);
        lh += '<div class="loop-return" title="Loops back to the loop point while the condition is not met">↺ loop back</div></div>';
        return lh;
      }
      return "";
    }

    var startLabel = { up: "Start", op: "Start", ph: "Start" }[ctx.level];
    out.push('<div class="flow" data-level="' + ctx.level + '">');
    out.push('<div class="terminal">' + startLabel + "</div>");
    out.push(seq(ctx.tree.seq, "top", "route"));
    out.push('<div class="terminal end">End</div>');
    out.push("</div>");
    return out.join("");
  }

  BE.render = { lane: render, isUnset: isUnset, keyOf: keyOf, findByKey: findByKey, esc: esc, laneLetter: laneLetter };
})(typeof window !== "undefined" ? window : globalThis);
