// Stage 8B test build — AVEVA-led Phase movement by detach and insert.
// Loop Transitions and return DUMMYs are fixed anchors. A Phase may move around them.
function graphMoveNodeId(p){return p&&(p._reId||p.node_id)||'';}
function graphMoveMap(op){var r={};(op.phases||[]).forEach(function(p){r[String(graphMoveNodeId(p))]=p;});return r;}
function graphMoveSetStep(l,side,id,map){var p=map[String(id)],label=p?(p.label||id):id;if(side==='from'){l.from=label;l.from_id='';l.from_node=String(id);l.from_re_id=String(id);l.from_type='Step';}else{l.to=label;l.to_id='';l.to_node=String(id);l.to_re_id=String(id);l.to_type='Step';}}
function graphMoveEndpoint(l,side){var t=side==='from'?l.from_type:l.to_type;if(t==='Transition')return {type:'Transition',id:String(side==='from'?l.from_id:l.to_id)};return {type:'Step',id:String(side==='from'?l.from_re_id:l.to_re_id)};}
function graphMoveSetEndpoint(l,side,e,map){if(e.type==='Step')return graphMoveSetStep(l,side,e.id,map);if(side==='from'){l.from='TRANS:'+e.id;l.from_id=e.id;l.from_node='';l.from_re_id='';l.from_type='Transition';}else{l.to='TRANS:'+e.id;l.to_id=e.id;l.to_node='';l.to_re_id='';l.to_type='Transition';}}
function graphMoveNormalOut(op,id){return (op.links||[]).filter(function(l){return l.from_type==='Step'&&String(l.from_re_id)===String(id)&&l.type!=='Other';});}
function graphMovePlan(op,moving,anchor,pos){
 moving=String(moving);anchor=String(anchor);pos=pos||'before';var map=graphMoveMap(op),links=op.links||[];
 if(!map[moving]||!map[anchor]||moving===anchor)return {ok:false,reason:'Choose another Phase.'};
 var incoming=links.filter(function(l){return l.to_type==='Step'&&String(l.to_re_id)===moving&&l.type!=='Other';}),forward=graphMoveNormalOut(op,moving);
 if(incoming.length!==1||forward.length!==1)return {ok:false,reason:'This Phase has no single AVEVA normal-route cut boundary.'};
 var dest;if(pos==='before'){var ins=links.filter(function(l){return l.to_type==='Step'&&String(l.to_re_id)===anchor&&l.type!=='Other';});if(ins.length!==1)return {ok:false,reason:'Destination has no single normal-route entry.'};dest=ins[0];}else{var outs=graphMoveNormalOut(op,anchor);if(outs.length!==1)return {ok:false,reason:'Destination has no single normal-route exit.'};dest=outs[0];}
 if(dest===incoming[0]||dest===forward[0])return {ok:false,reason:'Already at this position.'};
 return {ok:true,map:map,moving:moving,anchor:anchor,pos:pos,pre:incoming[0],forward:forward[0],successor:graphMoveEndpoint(forward[0],'to'),dest:dest,destTarget:graphMoveEndpoint(dest,'to')};
}
function moveGraphItem(op,moving,anchor,pos){var x=graphMovePlan(op,moving,anchor,pos);if(!x.ok)return x;graphMoveSetEndpoint(x.pre,'to',x.successor,x.map);graphMoveSetStep(x.dest,'to',x.moving,x.map);if(x.forward.type==='ParallelConvergent'||x.forward.type==='SerialConvergent'){/* AVEVA lane-exit move: retain convergence on the old destination, and create the normal route from moved Phase to it. */graphMoveSetStep(x.forward,'from',x.destTarget.id,x.map);op.links.push({type:'ControlLink',from:x.map[x.moving].label||x.moving,from_id:'',from_node:x.moving,from_re_id:x.moving,from_type:'Step',to:x.map[x.destTarget.id].label||x.destTarget.id,to_id:'',to_node:x.destTarget.id,to_re_id:x.destTarget.id,to_type:'Step',_linkId:''});}else graphMoveSetEndpoint(x.forward,'to',x.destTarget,x.map);var a=op.phases,from=-1,to=-1;for(var i=0;i<a.length;i++){if(graphMoveNodeId(a[i])===x.moving)from=i;if(graphMoveNodeId(a[i])===x.anchor)to=i;}if(from>=0&&to>=0){var item=a.splice(from,1)[0];if(from<to)to--;a.splice(x.pos==='after'?to+1:to,0,item);}op._graphEdit=true;return {ok:true,moved:x.moving,anchor:x.anchor,position:x.pos};}
function graphMoveCapabilities(op,id){var a=op.phases||[],i=-1,r={up:'',down:''};for(var n=0;n<a.length;n++)if(graphMoveNodeId(a[n])===String(id))i=n;if(i>0&&graphMovePlan(op,id,graphMoveNodeId(a[i-1]),'before').ok)r.up=graphMoveNodeId(a[i-1]);if(i>=0&&i<a.length-1&&graphMovePlan(op,id,graphMoveNodeId(a[i+1]),'after').ok)r.down=graphMoveNodeId(a[i+1]);return r;}
function moveGraphShortcut(op,id,dir){var c=graphMoveCapabilities(op,id),a=dir<0?c.up:c.down;return a?moveGraphItem(op,id,a,dir<0?'before':'after'):{ok:false,reason:'No adjacent Phase position.'};}
function graphMoveDropHtml(u,o,id){return editMode?'<div class="graph-drop-boundary" data-anchor-id="'+esc(id)+'" ondragover="graphMoveDragOver(event)" ondragleave="graphMoveDragLeave(event)" ondrop="graphMoveDrop(event,'+u+','+o+',\''+esc(id)+'\')">Drop Phase here</div>':'';}
function graphMoveDragStart(e,u,o,id){if(!e.dataTransfer)return;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',JSON.stringify({u:u,o:o,id:String(id)}));document.body.classList.add('graph-move-dragging');e.currentTarget.classList.add('graph-dragging');}
function graphMoveDragEnd(e){if(e.currentTarget)e.currentTarget.classList.remove('graph-dragging');document.body.classList.remove('graph-move-dragging');document.querySelectorAll('.graph-drop-active').forEach(function(x){x.classList.remove('graph-drop-active');});}
function graphMoveDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';e.currentTarget.classList.add('graph-drop-active');}
function graphMoveDragLeave(e){e.currentTarget.classList.remove('graph-drop-active');}
function graphMoveDrop(e,u,o,anchor){e.preventDefault();e.currentTarget.classList.remove('graph-drop-active');var d;try{d=JSON.parse(e.dataTransfer.getData('text/plain'));}catch(x){return;}if(!d||d.u!==u||d.o!==o)return;var op=currentRecipeData.unit_procedures[u].operations[o],r=moveGraphItem(op,d.id,anchor,'before');if(!r.ok){console.warn('Move not applied:',r.reason);return;}currentRecipeData._structuralEdit=true;renderAll();}


/* === Consolidated V12 DOM dispatcher and pointer drag fallback === */
// V12.12 — canonical ProcedureLogic DOM movement dispatcher.
// No fixture XML, node ID, label, or destination-specific data is used.
// The DOM is changed first, then reparsed to rebuild every renderer index.
(function(){
'use strict';
function local(n){return n&&n.localName||n&&n.nodeName||'';}
function kids(n,name){return Array.prototype.filter.call(n.children||[],function(x){return local(x)===name;});}
function one(n,name){return kids(n,name)[0]||null;}
function text(n,name){var x=one(n,name);return x?(x.textContent||'').trim():'';}
function setText(n,name,value){var x=one(n,name);if(!x){x=n.ownerDocument.createElementNS(n.namespaceURI,name);n.appendChild(x);}x.textContent=String(value);}
function direct(n,name){return Array.prototype.filter.call(n.children||[],function(x){return local(x)===name;});}
function logicFor(recipe,u,o){
 var ups=recipe&&recipe.unit_procedures||[], up=ups[u], op=up&&up.operations&&up.operations[o];
 if(!op||!recipe._xmlDoc)return null;
 // Operation RecipeElements are in the same order as the parsed projection.
 var all=Array.prototype.filter.call(recipe._xmlDoc.getElementsByTagName('*'),function(x){return local(x)==='RecipeElement'&&text(x,'RecipeElementType')==='Operation';});
 var index=0;for(var i=0;i<ups.length;i++)for(var j=0;j<(ups[i].operations||[]).length;j++){if(i===u&&j===o)return one(all[index],'ProcedureLogic');index++;}
 return null;
}
function links(pl){return direct(pl,'Link');} function steps(pl){return direct(pl,'Step');}
function endpoint(link,side){var tag=side==='from'?'FromID':'ToID';return kids(link,tag).map(function(x){return {node:x,id:text(x,tag+'Value'),type:text(x,side==='from'?'FromType':'ToType')};});}
function replaceEndpoints(link,side,eps){var tag=side==='from'?'FromID':'ToID', old=kids(link,tag), ref=old.length?old[old.length-1].nextSibling:null, doc=link.ownerDocument;old.forEach(function(x){link.removeChild(x);});eps.forEach(function(e){var x=doc.createElementNS(link.namespaceURI,tag);setText(x,tag+'Value',e.id);setText(x,side==='from'?'FromType':'ToType',e.type||'Step');setText(x,'IDScope','Internal');link.insertBefore(x,ref);});}
function type(link){return text(link,'LinkType');} function isOther(l){return type(l)==='Other';}
function stepForRe(pl,re){return steps(pl).filter(function(s){return text(s,'RecipeElementID')===String(re);})[0]||null;}
function reForStep(pl,id){var s=steps(pl).filter(function(x){return text(x,'ID')===String(id);})[0];return s&&text(s,'RecipeElementID');}
function maxId(doc){var m=0;Array.prototype.forEach.call(doc.getElementsByTagName('*'),function(n){if(local(n)==='ID'&&/^\d+$/.test((n.textContent||'').trim()))m=Math.max(m,+n.textContent);});return m;}
function addStep(pl,re,next){var s=pl.ownerDocument.createElementNS(pl.namespaceURI,'Step');setText(s,'ID',next());setText(s,'RecipeElementID',re);setText(s,'RecipeElementVersion','0');pl.appendChild(s);return text(s,'ID');}
function cloneBusinessRE(pl,re,next){var doc=pl.ownerDocument, all=Array.prototype.filter.call(doc.getElementsByTagName('*'),function(x){return local(x)==='RecipeElement'&&text(x,'ID')===String(re);}), src=all[0];if(!src)throw Error('Business RecipeElement #'+re+' was not found.');var clone=src.cloneNode(true), id=next();setText(clone,'ID',id);src.parentNode.insertBefore(clone,src.nextSibling);return id;}
function otherify(pl,re){var doc=pl.ownerDocument, all=Array.prototype.filter.call(doc.getElementsByTagName('*'),function(x){return local(x)==='RecipeElement'&&text(x,'ID')===String(re);}), r=all[0];if(!r)throw Error('Source RecipeElement missing.');Array.prototype.slice.call(r.children).forEach(function(c){if(local(c)!=='ID')r.removeChild(c);});var t=doc.createElementNS(r.namespaceURI,'RecipeElementType');t.setAttribute('OtherValue','DUMMY');t.textContent='Other';r.appendChild(t);}
function addLink(pl,from,to,kind,next){var l=pl.ownerDocument.createElementNS(pl.namespaceURI,'Link');setText(l,'ID',next());replaceEndpoints(l,'from',from);replaceEndpoints(l,'to',to);setText(l,'LinkType',kind||'ControlLink');setText(l,'Depiction','Line');pl.appendChild(l);return l;}
function findSource(pl,re){var s=stepForRe(pl,re);if(!s)throw Error('Dragged Phase does not have a native Step.');var sid=text(s,'ID'), ins=links(pl).filter(function(l){return !isOther(l)&&endpoint(l,'to').some(function(e){return e.type==='Step'&&e.id===sid;});}), outs=links(pl).filter(function(l){return !isOther(l)&&endpoint(l,'from').some(function(e){return e.type==='Step'&&e.id===sid;});});if(ins.length!==1||outs.length!==1)throw Error('Dragged Phase has an ambiguous native boundary.');return {step:s,sid:sid,re:String(re),incoming:ins[0],outgoing:outs[0]};}
function detach(pl,src,next){var inE=endpoint(src.incoming,'from'), outE=endpoint(src.outgoing,'to'), inKind=type(src.incoming), outKind=type(src.outgoing);
 // Replace this lane/source in grouped join links; otherwise bridge the ordinary route.
 if(/Convergent$/.test(outKind)){var remaining=endpoint(src.outgoing,'from').filter(function(e){return !(e.type==='Step'&&e.id===src.sid);});if(!remaining.length)throw Error('Cannot remove the only convergent leg.');replaceEndpoints(src.outgoing,'from',remaining);if(/Divergent$/.test(inKind)){replaceEndpoints(src.incoming,'to',endpoint(src.incoming,'to').filter(function(e){return e.id!==src.sid;}));}else {endpoint(src.incoming,'to').forEach(function(e){if(e.id===src.sid) e.id=outE[0].id;});replaceEndpoints(src.incoming,'to',endpoint(src.incoming,'to'));}
 } else {replaceEndpoints(src.incoming,'to',outE);}
 src.step.parentNode.removeChild(src.step); otherify(pl,src.re);return src;
}
function destination(pl,d){
 if(d.type==='phase-boundary'){var s=stepForRe(pl,d.anchor);if(!s)throw Error('Drop anchor is no longer present.');var hit=links(pl).filter(function(l){return !isOther(l)&&endpoint(l,'to').some(function(e){return e.type==='Step'&&e.id===text(s,'ID');});});if(hit.length!==1)throw Error('Anchor has no single incoming boundary.');return {link:hit[0],mode:'split'};}
 if(d.type==='transition-to-fork'){var hit=links(pl).filter(function(l){return !isOther(l)&&endpoint(l,'from').some(function(e){return e.type==='Transition'&&e.id===d.transition;})&&/Divergent$/.test(type(l));});if(hit.length!==1)throw Error('Transition does not resolve to one fork boundary.');return {link:hit[0],mode:'fork'};}
 if(d.type==='join-to-subsequent-fork'){var fork=stepForRe(pl,d.fork);if(!fork)throw Error('Subsequent fork is unavailable.');var hit=links(pl).filter(function(l){return !isOther(l)&&endpoint(l,'to').some(function(e){return e.type==='Step'&&e.id===text(fork,'ID');});});if(hit.length!==1)throw Error('Join boundary is ambiguous.');return {link:hit[0],mode:'split'};}
 if(d.type==='lane-to-join'){var fork=stepForRe(pl,d.fork);if(!fork)throw Error('Fork is unavailable.');var div=links(pl).filter(function(l){return /Divergent$/.test(type(l))&&endpoint(l,'from').some(function(e){return e.type==='Step'&&e.id===text(fork,'ID');});})[0];if(!div)throw Error('Fork divergence is unavailable.');var legs=endpoint(div,'to'), lane=legs[+d.lane];if(!lane)throw Error('Lane does not exist.');var cur=lane.id, seen={}, last=null;while(cur&&!seen[cur]){seen[cur]=1;var out=links(pl).filter(function(l){return !isOther(l)&&endpoint(l,'from').some(function(e){return e.type==='Step'&&e.id===cur;});});if(out.length!==1)break;last=out[0];if(/Convergent$/.test(type(last)))break;var es=endpoint(last,'to');if(es.length!==1||es[0].type!=='Step')break;cur=es[0].id;}if(!last||!/Convergent$/.test(type(last)))throw Error('Lane has no unambiguous Join boundary.');return {link:last,mode:'join-lane'};}
 throw Error('Unsupported rendered boundary.');
}
function paste(pl,src,dst,next){var newRe=cloneBusinessRE(pl,src.re,next), newStep=addStep(pl,newRe,next), oldTargets=endpoint(dst.link,'to');
 if(dst.mode==='fork'){replaceEndpoints(dst.link,'to',[{id:newStep,type:'Step'}]);one(dst.link,'LinkType').textContent='ControlLink';addLink(pl,[{id:newStep,type:'Step'}],oldTargets,'ParallelDivergent',next);}
 else if(dst.mode==='join-lane'){var fs=endpoint(dst.link,'from');fs.push({id:newStep,type:'Step'});replaceEndpoints(dst.link,'from',fs);addLink(pl,[{id:newStep,type:'Step'}],oldTargets,'ControlLink',next);}
 else {replaceEndpoints(dst.link,'to',[{id:newStep,type:'Step'}]);addLink(pl,[{id:newStep,type:'Step'}],oldTargets,'ControlLink',next);}
 return newRe;
}
function descriptor(el){return {type:el.classList.contains('v124-transition-fork-drop')?'transition-to-fork':el.classList.contains('v126-postjoin-drop')?'join-to-subsequent-fork':el.classList.contains('v128-lane-join-drop')?'lane-to-join':'phase-boundary',anchor:el.dataset.anchorId||'',transition:el.dataset.transitionBoundary||'',fork:el.dataset.fork||el.dataset.postjoinFork||'',lane:el.dataset.lane||''};}
function apply(e,u,o,d){var data;try{data=JSON.parse(e.dataTransfer.getData('text/plain'));}catch(_){throw Error('No dragged Phase was supplied.');}if(!data||data.u!==u||data.o!==o)throw Error('A Phase may only move inside its selected Operation.');var recipe=currentRecipeData, pl=logicFor(recipe,u,o);if(!pl)throw Error('The selected Operation DOM could not be located.');var serial=new XMLSerializer().serializeToString(recipe._xmlDoc), trial=new DOMParser().parseFromString(serial,'text/xml'), err=trial.getElementsByTagName('parsererror')[0];if(err)throw Error('Current XML is not valid.');var shadow=Object.assign({},recipe,{_xmlDoc:trial}), work=logicFor(shadow,u,o), n=maxId(trial)+1, next=function(){return String(n++);};var src=findSource(work,data.id), dst=destination(work,d);detach(work,src,next);paste(work,src,dst,next);var xml=new XMLSerializer().serializeToString(trial), fresh=parseB2MML(xml);if(!fresh)throw Error('The proposed DOM edit could not be reparsed.');xmlAuthorityAttach(fresh,trial,xml);xmlAuthorityReplaceCurrent(fresh);renderAll();}
window.v1212Drop=function(e,u,o){e.preventDefault();var el=e.currentTarget;el.classList.remove('graph-drop-active');try{apply(e,u,o,descriptor(el));}catch(x){console.warn('V12.12 move rejected:',x.message);alert('Move not applied: '+x.message);}finally{document.body.classList.remove('graph-move-dragging');document.querySelectorAll('.graph-drop-active').forEach(function(x){x.classList.remove('graph-drop-active');});}};
window.v1212DragOver=function(e){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';e.currentTarget.classList.add('graph-drop-active');};window.v1212DragLeave=function(e){e.currentTarget.classList.remove('graph-drop-active');};
// Override legacy scenario handlers after every legacy module has loaded.
window.v124Drop=window.v126Drop=window.v128Drop=function(e,u,o){window.v1212Drop(e,u,o);};window.graphMoveDrop=function(e,u,o){window.v1212Drop(e,u,o);};
// Browsers do not guarantee an element-level dragend after every cancelled local-file drag.
// Clear the visual state at document level as the final safeguard.
document.addEventListener('dragend',function(){document.body.classList.remove('graph-move-dragging');document.querySelectorAll('.graph-drop-active').forEach(function(x){x.classList.remove('graph-drop-active');});},true);
})();

// V12.12.2 — pointer-driven Phase drag fallback.
// Avoids browser-native HTML5 drag differences on local file pages.
(function(){
'use strict';
var state=null;
function clear(){if(!state)return;state=null;document.body.classList.remove('graph-move-dragging');document.querySelectorAll('.graph-drop-active').forEach(function(x){x.classList.remove('graph-drop-active');});}
function targetAt(x,y){var el=document.elementFromPoint(x,y);return el&&el.closest&&el.closest('.graph-drop-boundary');}
function activeTarget(x,y){document.querySelectorAll('.graph-drop-active').forEach(function(n){n.classList.remove('graph-drop-active');});var t=targetAt(x,y);if(t)t.classList.add('graph-drop-active');return t;}
document.addEventListener('pointerdown',function(e){var h=e.target&&e.target.closest&&e.target.closest('.graph-drag-handle[data-phase-id]');if(!h||e.button!==0)return;state={pointer:e.pointerId,handle:h,u:+h.dataset.phaseU,o:+h.dataset.phaseO,id:String(h.dataset.phaseId),x:e.clientX,y:e.clientY,started:false};h.setPointerCapture&&h.setPointerCapture(e.pointerId);e.preventDefault();},true);
document.addEventListener('pointermove',function(e){if(!state||e.pointerId!==state.pointer)return;var dx=e.clientX-state.x,dy=e.clientY-state.y;if(!state.started&&(dx*dx+dy*dy)>=16){state.started=true;document.body.classList.add('graph-move-dragging');state.handle.classList.add('graph-dragging');}if(state.started){activeTarget(e.clientX,e.clientY);e.preventDefault();}},true);
document.addEventListener('pointerup',function(e){if(!state||e.pointerId!==state.pointer)return;var s=state,t=s.started?activeTarget(e.clientX,e.clientY):null;s.handle.classList.remove('graph-dragging');if(t){var fake={preventDefault:function(){},currentTarget:t,dataTransfer:{getData:function(){return JSON.stringify({u:s.u,o:s.o,id:s.id});}}};window.v1212Drop(fake,s.u,s.o);}clear();},true);
document.addEventListener('pointercancel',clear,true);
})();

