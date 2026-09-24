/**
 * xml.js — B2MML XML helpers.
 *
 * Owns: namespaces, parsing, element access/creation and AVEVA-style
 * serialisation (2-space indent, "<Tag />" empty elements, UTF-8 BOM).
 *
 * Works with the browser DOM and with @xmldom/xmldom (Node tests), so it only
 * uses childNodes / nodeType / localName / namespaceURI.
 */
(function (global) {
  "use strict";
  var BE = (global.BatchEditor = global.BatchEditor || {});

  var NS = "http://www.wbf.org/xml/B2MML-V0401";
  var EXT = "http://www.wbf.org/xml/B2MML-V0401-AllExtensions";

  function parse(text) {
    var clean = String(text || "").replace(/^﻿/, "");
    var doc = new global.DOMParser().parseFromString(clean, "text/xml");
    if (!doc || !doc.documentElement || doc.getElementsByTagName("parsererror").length)
      throw new Error("The file is not well-formed XML.");
    return doc;
  }

  /** Element children, optionally filtered by local name (and namespace). */
  function kids(el, name, ns) {
    var out = [];
    if (!el) return out;
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 1) continue;
      if (name && n.localName !== name) continue;
      if (ns && n.namespaceURI !== ns) continue;
      out.push(n);
    }
    return out;
  }
  function kid(el, name, ns) {
    return kids(el, name, ns)[0] || null;
  }
  function text(el, name, ns) {
    var k = name ? kid(el, name, ns) : el;
    return k ? (k.textContent || "").trim() : "";
  }
  function setText(el, name, value, ns) {
    var k = kid(el, name, ns);
    if (!k) k = append(el, name, "", ns || el.namespaceURI);
    k.textContent = value == null ? "" : String(value);
    return k;
  }
  function create(doc, name, value, ns) {
    var e = doc.createElementNS(ns || NS, name);
    if (value !== undefined && value !== null) e.textContent = String(value);
    return e;
  }
  function append(parent, name, value, ns) {
    var e = create(parent.ownerDocument, name, value, ns);
    parent.appendChild(e);
    return e;
  }
  function remove(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  /** Insert `node` as a child of `parent` directly after `ref` (or first if ref null). */
  function insertAfter(parent, node, ref) {
    var next = ref ? ref.nextSibling : parent.firstChild;
    if (next) parent.insertBefore(node, next);
    else parent.appendChild(node);
  }

  /** RecipeElementType of a RecipeElement, with Other/DUMMY folded to "DUMMY". */
  function reType(re) {
    var t = kid(re, "RecipeElementType", NS);
    if (!t) return "";
    var v = (t.textContent || "").trim();
    if (v === "Other") return t.getAttribute("OtherValue") || "Other";
    return v;
  }

  // ---------- serialisation ----------
  function indent(xml) {
    var s = xml.replace(/>\s+</g, "><");
    var pad = "  ", level = 0, out = [];
    var tokenRe = /(<(?:[^>"']+|"[^"]*"|'[^']*')+>|[^<]+)/g, m;
    while ((m = tokenRe.exec(s)) !== null) {
      var tok = m[0];
      if (!tok.trim()) continue;
      if (tok.charAt(0) === "<" && tok.charAt(1) === "?") {
        out.push(tok + "\n");
        continue;
      }
      if (tok.charAt(0) !== "<") {
        var last = out[out.length - 1];
        if (last && last.charAt(last.length - 1) !== "\n") out[out.length - 1] += tok;
        else out.push(tok);
        continue;
      }
      var isClose = tok.charAt(1) === "/";
      var isSelf = tok.charAt(tok.length - 2) === "/";
      if (isClose) {
        level = Math.max(0, level - 1);
        var prev = out[out.length - 1];
        if (prev && prev.charAt(prev.length - 1) !== "\n") out[out.length - 1] += tok + "\n";
        else out.push(pad.repeat(level) + tok + "\n");
      } else if (isSelf) {
        out.push(pad.repeat(level) + tok + "\n");
      } else {
        var save = tokenRe.lastIndex, peek = tokenRe.exec(s);
        tokenRe.lastIndex = peek ? peek.index : save;
        out.push(pad.repeat(level) + tok);
        level++;
        if (!(peek && peek[0].charAt(0) !== "<" && peek[0].trim())) out[out.length - 1] += "\n";
      }
    }
    return out.join("");
  }

  function serialize(doc) {
    var body = new global.XMLSerializer().serializeToString(doc.documentElement);
    // Empty elements: <X></X> and <X/> -> <X /> (AVEVA style)
    body = body.replace(/<([A-Za-z_][\w.-]*)((?:\s+[^<>]*?)?)><\/\1>/g, "<$1$2/>");
    body = body.replace(/([^\s])\/>/g, "$1 />");
    return "﻿" + indent('<?xml version="1.0" encoding="utf-8"?>' + body);
  }

  BE.xml = {
    NS: NS,
    EXT: EXT,
    parse: parse,
    serialize: serialize,
    kids: kids,
    kid: kid,
    text: text,
    setText: setText,
    create: create,
    append: append,
    remove: remove,
    insertAfter: insertAfter,
    reType: reType,
  };
})(typeof window !== "undefined" ? window : globalThis);
