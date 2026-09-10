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

function xmlAuthorityAttach(recipe,doc,sourceText){
  if(!recipe||!doc)return recipe;
  recipe._xmlDoc=doc;
  recipe._xmlSource=sourceText||new XMLSerializer().serializeToString(doc);
  recipe._rawXML=recipe._xmlSource;
  recipe._xmlAuthoritative=true;
  return recipe;
}
function xmlAuthoritySource(recipe){
  if(recipe&&recipe._xmlDoc)return new XMLSerializer().serializeToString(recipe._xmlDoc);
  return recipe&&recipe._rawXML||'';
}
function xmlAuthorityReindex(recipe){
  // Reparse from the authoritative XML DOM. This deliberately destroys all
  // stale renderer arrays/branch caches, replacing them with a fresh view.
  var source=xmlAuthoritySource(recipe),fresh=parseB2MML(source);
  if(!fresh)throw new Error('The XML-authoritative graph could not be re-indexed.');
  return fresh;
}
function xmlAuthorityCommitStructural(recipe){
  if(!recipe)throw new Error('No recipe graph is loaded.');
  // Existing structural exporter is used only as the controlled DOM
  // materialiser during V10. Its output immediately becomes the authoritative
  // DOM; subsequent render/action paths consume only the reparsed projection.
  var xml=saveFromRawXMLStructural(recipe),parser=new DOMParser(),doc=parser.parseFromString(xml.replace(/^\uFEFF/,''),'text/xml');
  var err=doc.getElementsByTagName('parsererror')[0];
  if(err)throw new Error('The structural edit did not produce valid XML.');
  return xmlAuthorityReindex(xmlAuthorityAttach(recipe,doc,xml));
}
function xmlAuthorityReplaceCurrent(fresh){
  currentRecipeData=fresh;
  // Keep current lane selection valid; no branch/display cache survives.
  if(typeof laneSelectedUP!=='undefined')laneSelectedUP=Math.max(0,Math.min(laneSelectedUP,(fresh.unit_procedures||[]).length-1));
  var up=fresh.unit_procedures&&fresh.unit_procedures[laneSelectedUP];
  if(typeof laneSelectedOp!=='undefined')laneSelectedOp=Math.max(0,Math.min(laneSelectedOp,up&&up.operations?up.operations.length-1:0));
  return fresh;
}
