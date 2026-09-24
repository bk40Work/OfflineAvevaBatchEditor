/**
 * sfc.js — ProcedureLogic <-> structured tree.
 *
 * AVEVA ProcedureLogic is a block-structured chart (like IEC 61131 SFC). This
 * module is the ONLY place that reads or writes ProcedureLogic Links/Steps/
 * Transitions. Every level uses it: MasterRecipe (Unit Procedures),
 * UnitProcedure (Operations) and Operation (Phases).
 *
 * Tree grammar
 *   Seq   := Item[]
 *   Item  := Step        { kind:"step", reId, stepId }
 *          | Transition  { kind:"transition", id, el }
 *          | Parallel    { kind:"parallel", mode, lanes: Seq[] }
 *          | Loop        { kind:"loop", body: Seq, trans: Transition }
 *
 * DUMMY placeholders are NOT tree items. They are structural and regenerated
 * by build() using the rules observed in native AVEVA exports:
 *   R1  an empty branch lane is a single DUMMY;
 *   R2  a lane that starts with a branch starts with a DUMMY (fork source);
 *   R3  a lane that ends with a branch ends with a DUMMY (join target);
 *   R4  a join followed directly by a branch goes through a continuation DUMMY;
 *   R5  a join never targets a Transition: join -> DUMMY -> Transition;
 *   R6  two Transitions are never directly linked: T -> DUMMY -> T;
 *   R7  a loop is: DUMMY marker -> body -> Transition, plus an "Other" link
 *       Transition -> marker; an empty body holds one DUMMY.
 * Existing DUMMY IDs are remembered on the owning structure and reused, so an
 * unchanged region round-trips with identical IDs.
 */
(function (global) {
  "use strict";
  var BE = (global.BatchEditor = global.BatchEditor || {});
  var X = BE.xml;
  var NS = X.NS;

  var uidCounter = 0;
  function uid() {
    return "u" + ++uidCounter;
  }

  function StructureError(message) {
    this.name = "StructureError";
    this.message = message;
  }
  StructureError.prototype = Object.create(Error.prototype);

  // ------------------------------------------------------------------ read
  function readEndpoints(link, side) {
    var tag = side === "from" ? "FromID" : "ToID";
    var v = side === "from" ? "FromIDValue" : "ToIDValue";
    var t = side === "from" ? "FromType" : "ToType";
    return X.kids(link, tag).map(function (e) {
      return (X.text(e, t) === "Transition" ? "T:" : "S:") + X.text(e, v);
    });
  }

  /** Index the raw graph of an owner element (MasterRecipe / RecipeElement). */
  function readGraph(owner) {
    var pl = X.kid(owner, "ProcedureLogic", NS);
    var reById = {};
    X.kids(owner, "RecipeElement", NS).forEach(function (re) {
      reById[X.text(re, "ID")] = re;
    });
    var g = { pl: pl, nodes: {}, links: [], out: {}, inn: {}, reById: reById };
    if (!pl) return g;
    X.kids(pl, "Step", NS).forEach(function (s) {
      var reId = X.text(s, "RecipeElementID");
      var re = reById[reId];
      g.nodes["S:" + X.text(s, "ID")] = {
        key: "S:" + X.text(s, "ID"),
        isT: false,
        stepId: X.text(s, "ID"),
        reId: reId,
        type: re ? X.reType(re) : "?",
      };
    });
    X.kids(pl, "Transition", NS).forEach(function (t) {
      var id = X.text(t, "ID");
      g.nodes["T:" + id] = { key: "T:" + id, isT: true, id: id, el: t, type: "Transition" };
    });
    X.kids(pl, "Link", NS).forEach(function (l) {
      var link = {
        id: X.text(l, "ID"),
        type: X.text(l, "LinkType"),
        from: readEndpoints(l, "from"),
        to: readEndpoints(l, "to"),
      };
      g.links.push(link);
      link.from.forEach(function (k) {
        (g.out[k] = g.out[k] || []).push(link);
      });
      link.to.forEach(function (k) {
        (g.inn[k] = g.inn[k] || []).push(link);
      });
    });
    return g;
  }

  function linkKind(type) {
    if (/Divergent$/.test(type)) return "div";
    if (/Convergent$/.test(type)) return "conv";
    if (type === "Other") return "other";
    return "control";
  }

  /**
   * Parse an owner's ProcedureLogic into a tree.
   * Returns { owner, begin, end, seq, warnings } or throws StructureError.
   */
  function parse(owner) {
    var g = readGraph(owner);
    var tree = { owner: owner, begin: null, end: null, seq: [], warnings: [], spareDummies: [] };
    if (!g.pl) return tree; // no logic yet (brand-new element)
    var beginKey = null, endKey = null;
    Object.keys(g.nodes).forEach(function (k) {
      var n = g.nodes[k];
      if (n.type === "Begin") beginKey = k;
      if (n.type === "End") endKey = k;
    });
    if (!beginKey || !endKey) throw new StructureError("ProcedureLogic has no Begin/End step.");
    tree.begin = { reId: g.nodes[beginKey].reId, stepId: g.nodes[beginKey].stepId };
    tree.end = { reId: g.nodes[endKey].reId, stepId: g.nodes[endKey].stepId };

    g.links.forEach(function (l) {
      l.from.concat(l.to).forEach(function (k) {
        if (!g.nodes[k]) throw new StructureError("Link #" + l.id + " references missing " + k + ".");
      });
    });

    var visited = {};
    function makeItem(n) {
      if (n.isT) {
        var other = (g.out[n.key] || []).filter(function (l) {
          return l.type === "Other";
        });
        if (other.length > 1) throw new StructureError("Transition #" + n.id + " has more than one loop-back link.");
        return {
          kind: "transition",
          uid: uid(),
          id: n.id,
          el: n.el,
          loopTo: other.length ? other[0].to[0] : null,
          otherLinkId: other.length ? other[0].id : null,
        };
      }
      if (n.type === "DUMMY") return { kind: "dummy", uid: uid(), key: n.key, reId: n.reId, stepId: n.stepId };
      return { kind: "step", uid: uid(), reId: n.reId, stepId: n.stepId, type: n.type };
    }

    function walk(startKey, skipFirst) {
      var items = [], key = startKey, first = true;
      for (;;) {
        var n = g.nodes[key];
        if (!n) throw new StructureError("Route reaches a missing node " + key + ".");
        if (n.type === "End") return { items: items, term: "end" };
        if (visited[key]) throw new StructureError("Node " + key + " is reached twice (not a structured route).");
        visited[key] = true;
        if (!(first && skipFirst)) items.push(makeItem(n));
        first = false;
        var outs = (g.out[key] || []).filter(function (l) {
          return l.type !== "Other";
        });
        if (outs.length === 0) throw new StructureError("Node " + key + " has no outgoing route.");
        if (outs.length > 1) throw new StructureError("Node " + key + " has " + outs.length + " outgoing routes.");
        var L = outs[0], kind = linkKind(L.type);
        if (kind === "control") {
          if (L.to.length !== 1) throw new StructureError("ControlLink #" + L.id + " has several targets.");
          key = L.to[0];
          continue;
        }
        if (kind === "conv") return { items: items, term: "conv", conv: L };
        if (kind === "div") {
          var lanes = [], conv = null;
          L.to.forEach(function (t) {
            var r = walk(t, false);
            if (r.term !== "conv") throw new StructureError("Branch lane from link #" + L.id + " never joins.");
            if (conv && conv !== r.conv) throw new StructureError("Branch lanes of link #" + L.id + " join at different points.");
            conv = r.conv;
            lanes.push(r.items);
          });
          if (conv.from.length !== L.to.length)
            throw new StructureError("Join #" + conv.id + " does not match fork #" + L.id + ".");
          items.push({
            kind: "parallel",
            uid: uid(),
            mode: L.type.replace(/Divergent$/, ""),
            lanes: lanes,
            divLinkId: L.id,
            convLinkId: conv.id,
            laneDummies: [],
          });
          if (conv.to.length !== 1) throw new StructureError("Join #" + conv.id + " has several targets.");
          key = conv.to[0];
          continue;
        }
        throw new StructureError("Unsupported link type " + L.type + ".");
      }
    }

    var r = walk(beginKey, true);
    if (r.term !== "end") throw new StructureError("Main route does not reach End.");
    tree.seq = r.items;

    Object.keys(g.nodes).forEach(function (k) {
      if (!visited[k] && k !== beginKey && k !== endKey)
        tree.warnings.push("Unreachable " + (g.nodes[k].isT ? "Transition #" + g.nodes[k].id : g.nodes[k].type + " step #" + g.nodes[k].stepId) + " will be dropped on the next edit.");
    });

    wrapLoops(tree.seq);
    normalize(tree.seq, "top", tree);
    return tree;
  }

  function forEachSeq(seq, fn) {
    seq.forEach(function (it) {
      if (it.kind === "parallel") it.lanes.forEach(fn);
      if (it.kind === "loop") fn(it.body);
    });
  }

  /** Group loop-back transitions and their DUMMY targets into Loop items. */
  function wrapLoops(seq) {
    forEachSeq(seq, wrapLoops);
    for (;;) {
      var best = null;
      seq.forEach(function (it, j) {
        if (it.kind !== "transition" || !it.loopTo) return;
        var i = -1;
        seq.forEach(function (c, k) {
          if ((c.kind === "dummy" || c.kind === "step") && "S:" + c.stepId === it.loopTo) i = k;
        });
        if (i < 0 || i > j)
          throw new StructureError("Loop-back of Transition #" + it.id + " does not return to an earlier step in the same route.");
        if (!best || j - i < best.j - best.i) best = { i: i, j: j };
      });
      if (!best) return;
      var target = seq[best.i], trans = seq[best.j];
      var loop = {
        kind: "loop",
        uid: uid(),
        marker: target.kind === "dummy" ? { reId: target.reId, stepId: target.stepId } : null,
        body: seq.slice(target.kind === "dummy" ? best.i + 1 : best.i, best.j),
        trans: trans,
        otherLinkId: trans.otherLinkId,
      };
      trans.loopTo = null;
      seq.splice(best.i, best.j - best.i + 1, loop);
    }
  }

  /** Remove DUMMY items, remembering their IDs on the structure that needs them. */
  function normalize(seq, ctx, tree) {
    seq.forEach(function (it) {
      if (it.kind === "parallel")
        it.lanes.forEach(function (lane, k) {
          if (lane.length === 1 && lane[0].kind === "dummy") {
            it.laneDummies[k] = ids(lane[0]);
            lane.length = 0;
          } else normalize(lane, "lane", tree);
        });
      if (it.kind === "loop") {
        if (it.body.length === 1 && it.body[0].kind === "dummy") {
          it.bodyDummy = ids(it.body[0]);
          it.body.length = 0;
        } else normalize(it.body, "body", tree);
      }
    });
    for (var i = 0; i < seq.length; i++) {
      var it = seq[i];
      if (it.kind !== "dummy") continue;
      var prev = seq[i - 1], next = seq[i + 1];
      if (prev && prev.kind === "parallel" && !prev.joinDummy) prev.joinDummy = ids(it);
      else if (!prev && next && next.kind === "parallel" && !next.sourceDummy) next.sourceDummy = ids(it);
      else if (prev && next && prev.kind === "transition" && next.kind === "transition" && !prev.gapDummy) prev.gapDummy = ids(it);
      else tree.spareDummies.push(ids(it));
      seq.splice(i, 1);
      i--;
    }
  }
  function ids(d) {
    return { reId: d.reId, stepId: d.stepId };
  }

  // ------------------------------------------------------------------ build
  /**
   * Build the ProcedureLogic graph for a tree.
   * alloc() -> new global numeric ID string; allocT() -> new Transition ID.
   * Returns { steps:[{stepId,reId,dummy}], transitions:[item], links:[{type,from,to}], reOrder:[reId] }
   */
  function build(tree, alloc, allocT) {
    var out = { steps: [], transitions: [], links: [], reOrder: [], newDummies: [] };
    var spare = (tree.spareDummies || []).slice();

    function stepNode(reId, stepId) {
      out.steps.push({ stepId: stepId, reId: reId });
      out.reOrder.push(reId);
      return { key: "S:" + stepId, isT: false };
    }
    function dummy(stash) {
      var d = stash || spare.shift();
      if (!d) {
        d = { reId: alloc(), stepId: alloc() };
      }
      out.newDummies.push(d.reId);
      var n = stepNode(d.reId, d.stepId);
      out.steps[out.steps.length - 1].dummy = true;
      return n;
    }
    function transNode(item) {
      if (!item.id) item.id = allocT();
      out.transitions.push(item);
      return { key: "T:" + item.id, isT: true };
    }
    function link(type, from, to) {
      out.links.push({ type: type, from: from, to: to });
    }
    // A "tail" is either null (lane start), {node} or {join:{sources,mode,par}}.
    function connect(tail, node, ctx) {
      if (!tail) {
        ctx.first = node;
        return;
      }
      if (tail.join) {
        if (node.isT) {
          var d = dummy(tail.join.par.joinDummy);
          link(tail.join.mode + "Convergent", tail.join.sources, [d.key]);
          link("ControlLink", [d.key], [node.key]);
        } else link(tail.join.mode + "Convergent", tail.join.sources, [node.key]);
        return;
      }
      if (tail.node.isT && node.isT) {
        var g = dummy(tail.gap);
        link("ControlLink", [tail.node.key], [g.key]);
        link("ControlLink", [g.key], [node.key]);
        return;
      }
      link("ControlLink", [tail.node.key], [node.key]);
    }
    function emitSeq(items, tail, ctx) {
      items.forEach(function (it) {
        if (it.kind === "step") {
          var s = stepNode(it.reId, it.stepId);
          connect(tail, s, ctx);
          tail = { node: s };
        } else if (it.kind === "transition") {
          var t = transNode(it);
          connect(tail, t, ctx);
          tail = { node: t, gap: it.gapDummy };
        } else if (it.kind === "loop") {
          var m = dummy(it.marker);
          connect(tail, m, ctx);
          var bodyTail = { node: m };
          if (it.body.length) bodyTail = emitSeq(it.body, bodyTail, {});
          else {
            var bd = dummy(it.bodyDummy);
            connect(bodyTail, bd, {});
            bodyTail = { node: bd };
          }
          var lt = transNode(it.trans);
          connect(bodyTail, lt, {});
          link("Other", [lt.key], [m.key]);
          tail = { node: lt, gap: it.trans.gapDummy };
        } else if (it.kind === "parallel") {
          var src;
          if (!tail) {
            src = dummy(it.sourceDummy);
            ctx.first = src;
          } else if (tail.join) {
            src = dummy(tail.join.par.joinDummy);
            link(tail.join.mode + "Convergent", tail.join.sources, [src.key]);
          } else src = tail.node;
          var firsts = [], lasts = [];
          it.lanes.forEach(function (lane, k) {
            if (!lane.length) {
              var e = dummy(it.laneDummies && it.laneDummies[k]);
              firsts.push(e.key);
              lasts.push(e.key);
              return;
            }
            var lctx = {};
            var lt2 = emitSeq(lane, null, lctx);
            if (lt2.join) {
              var jd = dummy(lt2.join.par.joinDummy);
              link(lt2.join.mode + "Convergent", lt2.join.sources, [jd.key]);
              lt2 = { node: jd };
            }
            firsts.push(lctx.first.key);
            lasts.push(lt2.node.key);
          });
          link(it.mode + "Divergent", [src.key], firsts);
          tail = { join: { sources: lasts, mode: it.mode, par: it } };
        } else throw new StructureError("Unknown tree item " + it.kind);
      });
      return tail;
    }

    var begin = stepNode(tree.begin.reId, tree.begin.stepId);
    var endStep = { reId: tree.end.reId, stepId: tree.end.stepId };
    var tail = emitSeq(tree.seq, { node: begin }, {});
    var end = stepNode(endStep.reId, endStep.stepId);
    connect(tail, end, {});
    return out;
  }

  // ------------------------------------------------------------------ write
  function sig(type, from, to) {
    return type + "|" + from.join(",") + ">" + to.join(",");
  }
  function appendEndpoint(link, tag, key) {
    var e = X.append(link, tag);
    var isT = key.charAt(0) === "T";
    X.append(e, tag === "FromID" ? "FromIDValue" : "ToIDValue", key.slice(2));
    X.append(e, tag === "FromID" ? "FromType" : "ToType", isT ? "Transition" : "Step");
    X.append(e, "IDScope", "Internal");
  }
  function byNum(a, b) {
    return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0);
  }

  /**
   * Write a tree back into its owner element. Returns the list of RecipeElement
   * IDs that were removed from the owner (the caller cleans up Formula refs).
   */
  function write(tree, alloc, allocT) {
    var owner = tree.owner, doc = owner.ownerDocument;
    var old = readGraph(owner);
    var oldLinkIds = {};
    old.links.forEach(function (l) {
      oldLinkIds[sig(l.type, l.from, l.to)] = l.id;
    });
    var built = build(tree, alloc, allocT);

    var pl = old.pl;
    if (!pl) {
      pl = X.create(doc, "ProcedureLogic");
      var firstRE = X.kid(owner, "RecipeElement", NS);
      if (firstRE) owner.insertBefore(pl, firstRE);
      else owner.appendChild(pl);
    }
    while (pl.firstChild) pl.removeChild(pl.firstChild);

    var used = {};
    built.links.forEach(function (l) {
      var id = oldLinkIds[sig(l.type, l.from, l.to)];
      if (id && !used[id]) l.id = id;
      if (l.id) used[l.id] = true;
    });
    built.links.forEach(function (l) {
      if (!l.id) l.id = alloc();
    });
    built.links.sort(function (a, b) {
      return byNum(a.id, b.id);
    });
    built.links.forEach(function (l) {
      var e = X.append(pl, "Link");
      X.append(e, "ID", l.id);
      l.from.forEach(function (k) {
        appendEndpoint(e, "FromID", k);
      });
      l.to.forEach(function (k) {
        appendEndpoint(e, "ToID", k);
      });
      X.append(e, "LinkType", l.type);
      X.append(e, "Depiction", "Line");
    });
    built.steps
      .slice()
      .sort(function (a, b) {
        return byNum(a.stepId, b.stepId);
      })
      .forEach(function (s) {
        var e = X.append(pl, "Step");
        X.append(e, "ID", s.stepId);
        X.append(e, "RecipeElementID", s.reId);
        X.append(e, "RecipeElementVersion", "0");
      });
    built.transitions
      .slice()
      .sort(function (a, b) {
        return byNum(a.id, b.id);
      })
      .forEach(function (t) {
        var el = t.el;
        if (!el) {
          el = X.create(doc, "Transition");
          X.append(el, "ID", t.id);
          X.append(el, "Condition", "");
          X.append(el, "Description", "");
          X.append(el, "Name", t.id, X.EXT);
          t.el = el;
        }
        if (el.ownerDocument !== doc) el = doc.importNode(el, true);
        pl.appendChild(el);
      });

    // RecipeElements: Begin, route order, End — directly after ProcedureLogic.
    var existing = {};
    X.kids(owner, "RecipeElement", NS).forEach(function (re) {
      existing[X.text(re, "ID")] = re;
      owner.removeChild(re);
    });
    var anchor = pl;
    var placed = {};
    built.reOrder.forEach(function (reId) {
      if (placed[reId]) return;
      placed[reId] = true;
      var re = existing[reId] || (tree.pendingREs && tree.pendingREs[reId]);
      if (!re) {
        if (built.newDummies.indexOf(reId) < 0)
          throw new StructureError("RecipeElement #" + reId + " is referenced but does not exist.");
        re = X.create(doc, "RecipeElement");
        X.append(re, "ID", reId);
        X.append(re, "RecipeElementType", "Other").setAttribute("OtherValue", "DUMMY");
      }
      X.insertAfter(owner, re, anchor);
      anchor = re;
    });
    return Object.keys(existing).filter(function (id) {
      return !placed[id];
    }).map(function (id) {
      return { reId: id, el: existing[id] };
    });
  }

  // ------------------------------------------------------------------ utilities
  /** ID-free canonical form, used to prove an edit round-trips exactly. */
  function canonical(seq) {
    return seq
      .map(function (it) {
        if (it.kind === "step") return "S" + it.reId;
        if (it.kind === "transition") return "T" + it.id;
        if (it.kind === "loop") return "L{" + canonical(it.body) + ";T" + it.trans.id + "}";
        if (it.kind === "parallel")
          return it.mode + "[" + it.lanes.map(canonical).join("|") + "]";
        return "?";
      })
      .join(",");
  }

  /** Visit every item with (item, parentSeq, index, containerInfo). */
  function walkItems(seq, fn, container) {
    seq.forEach(function (it, i) {
      fn(it, seq, i, container || null);
      if (it.kind === "parallel")
        it.lanes.forEach(function (lane, k) {
          walkItems(lane, fn, { item: it, lane: k });
        });
      if (it.kind === "loop") walkItems(it.body, fn, { item: it, body: true });
    });
  }

  /** Stable identity of a tree item across re-parses (uids are per-parse). */
  function keyOf(it) {
    if (it.kind === "step") return "S:" + it.reId;
    if (it.kind === "transition") return "T:" + it.id;
    if (it.kind === "loop") return "L:" + it.trans.id;
    if (it.kind === "parallel") return "P:" + (it.divLinkId || it.uid);
    return it.uid;
  }
  function findByKey(tree, key) {
    var hit = null;
    walkItems(tree.seq, function (it) {
      if (!hit && keyOf(it) === key) hit = it;
      if (!hit && it.kind === "loop" && keyOf(it.trans) === key) hit = it.trans;
    });
    return hit;
  }

  BE.sfc = {
    keyOf: keyOf,
    findByKey: findByKey,
    StructureError: StructureError,
    uid: uid,
    readGraph: readGraph,
    parse: parse,
    build: build,
    write: write,
    canonical: canonical,
    walkItems: walkItems,
  };
})(typeof window !== "undefined" ? window : globalThis);
