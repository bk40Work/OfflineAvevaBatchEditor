// V10.7 — ordinary Transition movement on XML ProcedureLogic boundaries.
// A Transition owning an Other loop-return Link is a fixed loop anchor.
function xtIsLoopTransition(op,tid){return ((op&&op.links)||[]).some(function(l){return l.type==='Other'&&l.from_type==='Transition'&&String(l.from_id)===String(tid);});}
function xtRouteItem(op,kind,id){var r=xmlBoundaryRoute(op);for(var i=0;i<r.length;i++)if(r[i].kind===kind&&String(r[i].id)===String(id))return {entry:r[i],index:i,route:r};return null;}
function xtSetTransition(link,side,tid){if(side==='from'){link.from='TRANS:'+tid;link.from_type='Transition';link.from_id=String(tid);link.from_re_id='';link.from_node='';}else{link.to='TRANS:'+tid;link.to_type='Transition';link.to_id=String(tid);link.to_re_id='';link.to_node='';}}
function xtSetEndpoint(link,side,e,map){return e.kind==='transition'?xtSetTransition(link,side,e.id):xbSetStep(link,side,e.id,map);}
function xtAdjacentBoundary(op,tid,dir){
 var hit=xtRouteItem(op,'transition',tid);if(!hit||xtIsLoopTransition(op,tid))return null;
 if(dir<0){for(var i=hit.index-1;i>=0;i--)if(hit.route[i].node==='phase'||hit.route[i].node==='transition')return hit.route[i].incoming;}
 else{for(var j=hit.index+1;j<hit.route.length;j++)if(hit.route[j].node==='phase'||hit.route[j].node==='transition'){var out=xbForward(op,hit.route[j].endpoint);return out.length===1?out[0]:null;}}
 return null;
}
function moveGraphTransition(op,tid,dir){
 var hit=xtRouteItem(op,'transition',tid),boundary=xtAdjacentBoundary(op,tid,dir),map=xbPhaseMap(op);if(!hit||!boundary)return {ok:false,reason:xtIsLoopTransition(op,tid)?'Loop Transitions are fixed anchors.':'No adjacent XML boundary for this Transition.'};
 var pre=hit.entry.incoming,forward=xbForward(op,hit.entry.endpoint)[0];if(!pre||!forward||boundary===pre||boundary===forward)return {ok:false,reason:'Already at this boundary.'};
 var oldSuccessor=xbEndpoint(forward,'to'),newSuccessor=xbEndpoint(boundary,'to');
 // CUT: predecessor directly to the original normal successor.
 xtSetEndpoint(pre,'to',oldSuccessor,map);
 // PASTE: selected boundary source -> retained Transition -> old target.
 xtSetTransition(boundary,'to',tid);
 xtSetEndpoint(forward,'to',newSuccessor,map);
 op._graphEdit=true;return {ok:true,moved:String(tid),boundary:boundary._linkId||''};
}
function transitionMoveCapabilities(op,tid){return {up:xtAdjacentBoundary(op,tid,-1)?true:false,down:xtAdjacentBoundary(op,tid,1)?true:false,fixed:xtIsLoopTransition(op,tid)};}
function moveTransition(u,o,tid,dir){var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o];if(!op)return;var r=moveGraphTransition(op,tid,dir);if(!r.ok){console.warn('Transition move not applied:',r.reason);return;}currentRecipeData._structuralEdit=true;if(typeof xmlAuthorityCommitStructural==='function'&&currentRecipeData._xmlAuthoritative){try{xmlAuthorityReplaceCurrent(xmlAuthorityCommitStructural(currentRecipeData));}catch(e){alert('Transition move was not committed to XML: '+e.message);return;}}renderAll();}
function transitionMoveDragStart(e,u,o,tid){if(!e.dataTransfer)return;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',JSON.stringify({u:u,o:o,transition:String(tid)}));document.body.classList.add('graph-move-dragging');e.currentTarget.classList.add('graph-dragging');}
