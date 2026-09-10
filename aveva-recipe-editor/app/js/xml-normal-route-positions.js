// ============================================================================
// V10.3 — normal-route positions derived from XML ProcedureLogic projection
// ============================================================================
// The normal route follows Control/branch forward links only. It deliberately
// excludes LinkType Other: that edge is the loop-back annotation, not a
// forward editing position. DUMMY and Transition nodes remain visible anchors
// during render, but only Phase RecipeElements are returned as move positions.

function xmlRouteEndpointId(link,side){
  if(side==='from')return link.from_type==='Transition'?'T:'+String(link.from_id||''):'S:'+String(link.from_re_id||'');
  return link.to_type==='Transition'?'T:'+String(link.to_id||''):'S:'+String(link.to_re_id||'');
}
function xmlRouteForwardLinks(op,endpoint){
  return ((op&&op.links)||[]).filter(function(link){
    return link.type!=='Other' && xmlRouteEndpointId(link,'from')===endpoint;
  });
}
function xmlRoutePhaseIds(op){
  if(!op)return [];
  var phaseById={}, phases=op.phases||[];
  phases.forEach(function(phase){var id=phase&&(phase._reId||phase.node_id);if(id&&!phase._dummy)phaseById[String(id)]=true;});
  var result=[],seen={},current='S:'+String(op._beginReId||'');
  // A linear normal route has exactly one forward link. Stop at a fork/join
  // boundary: branch lanes receive their own route resolver in the next
  // increment; this prevents an arbitrary lane being chosen here.
  while(current&&!seen[current]){
    seen[current]=true;
    if(current.indexOf('S:')===0){var id=current.slice(2);if(phaseById[id])result.push(id);}
    var next=xmlRouteForwardLinks(op,current);
    if(next.length!==1)break;
    current=xmlRouteEndpointId(next[0],'to');
  }
  return result;
}
function xmlRouteMoveCapabilities(op,phaseId){
  var route=xmlRoutePhaseIds(op),at=route.indexOf(String(phaseId));
  return {up:at>0?route[at-1]:'',down:at>=0&&at<route.length-1?route[at+1]:''};
}

// Override the legacy array-order capability resolver. Existing moveGraphItem
// remains the mutator; its target is now selected from ProcedureLogic order.
function graphMoveCapabilities(op,phaseId){return xmlRouteMoveCapabilities(op,phaseId);}
