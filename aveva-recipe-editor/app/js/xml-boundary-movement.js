// ============================================================================
// V10.4 — XML ProcedureLogic boundary movement
// ============================================================================
// The route is read from native Link endpoints, not op.phases ordering.
// Transition nodes are valid relative positions. Other is a loop-back only;
// its DUMMY target is rendered but is not a selectable move target.
function xbEndpoint(link,side){return (side==='from'?link.from_type:link.to_type)==='Transition'?{kind:'transition',id:String(side==='from'?link.from_id:link.to_id)}:{kind:'step',id:String(side==='from'?link.from_re_id:link.to_re_id)};}
function xbKey(e){return (e.kind==='transition'?'T:':'S:')+e.id;}
function xbForward(op,e){return (op.links||[]).filter(function(l){return l.type!=='Other'&&xbKey(xbEndpoint(l,'from'))===xbKey(e);});}
function xbPhaseMap(op){var m={};(op.phases||[]).forEach(function(p){var id=p&&(p._reId||p.node_id);if(id)m[String(id)]=p;});return m;}
function xmlBoundaryRoute(op){
 var phases=xbPhaseMap(op),out=[],seen={},cur={kind:'step',id:String(op._beginReId||'')},inLink=null;
 while(cur.id&&!seen[xbKey(cur)]){
  seen[xbKey(cur)]=true;var entry={endpoint:cur,incoming:inLink,kind:cur.kind,id:cur.id};
  if(cur.kind==='step'){var p=phases[cur.id];entry.node=p?(p._dummy?'fixed-return':'phase'):'structural';}else entry.node='transition';
  out.push(entry);var links=xbForward(op,cur);if(links.length!==1)break;inLink=links[0];cur=xbEndpoint(inLink,'to');
 }
 return out;
}
function xbSetStep(link,side,id,map){var p=map[id],label=p?(p.label||id):id;if(side==='from'){link.from=label;link.from_type='Step';link.from_re_id=id;link.from_node=id;link.from_id='';}else{link.to=label;link.to_type='Step';link.to_re_id=id;link.to_node=id;link.to_id='';}}
function xbSetEndpoint(link,side,e,map){if(e.kind==='step')return xbSetStep(link,side,e.id,map);if(side==='from'){link.from='TRANS:'+e.id;link.from_type='Transition';link.from_id=e.id;link.from_re_id='';link.from_node='';}else{link.to='TRANS:'+e.id;link.to_type='Transition';link.to_id=e.id;link.to_re_id='';link.to_node='';}}
function xbMoveToBoundary(op,movingId,boundary){
 var map=xbPhaseMap(op),route=xmlBoundaryRoute(op),mi=-1;for(var i=0;i<route.length;i++)if(route[i].node==='phase'&&route[i].id===String(movingId)){mi=i;break;}
 if(mi<0||!boundary)return {ok:false,reason:'Phase or XML boundary was not found.'};
 var pre=route[mi].incoming,forward=(xbForward(op,route[mi].endpoint)||[])[0];
 if(!pre||!forward||boundary===pre||boundary===forward)return {ok:false,reason:'Already at this XML boundary.'};
 var oldSuccessor=xbEndpoint(forward,'to'),newSuccessor=xbEndpoint(boundary,'to');
 // CUT: predecessor → original successor.
 xbSetEndpoint(pre,'to',oldSuccessor,map);
 // PASTE: boundary source → moved Phase → former boundary target.
 xbSetStep(boundary,'to',String(movingId),map);
 xbSetEndpoint(forward,'to',newSuccessor,map);
 op._graphEdit=true;return {ok:true,moved:String(movingId),boundary:boundary._linkId||''};
}
function xbAdjacentBoundary(op,phaseId,direction){
 var route=xmlBoundaryRoute(op),at=-1;for(var i=0;i<route.length;i++)if(route[i].node==='phase'&&route[i].id===String(phaseId)){at=i;break;}
 if(at<0)return null;
 if(direction<0){for(var up=at-1;up>=0;up--)if(route[up].node==='phase'||route[up].node==='transition')return route[up].incoming;}
 else{for(var down=at+1;down<route.length;down++)if(route[down].node==='phase'||route[down].node==='transition'){var after=xbForward(op,route[down].endpoint);return after.length===1?after[0]:null;}}
 return null;
}
function graphMoveCapabilities(op,phaseId){return {up:xbAdjacentBoundary(op,phaseId,-1)?'boundary-up':'',down:xbAdjacentBoundary(op,phaseId,1)?'boundary-down':''};}
function moveGraphShortcut(op,phaseId,direction){var b=xbAdjacentBoundary(op,phaseId,direction);return b?xbMoveToBoundary(op,phaseId,b):{ok:false,reason:'No adjacent XML boundary in this route.'};}
