// nested-branch-render.js - recursive visual rendering for nested AVEVA branches.
// Stage 6B.3: nested regions are owned by one specific parent lane before any HTML is emitted.
function nestedUnique(values){return values.filter(function(v,i,a){return v&&a.indexOf(v)===i;});}
function nestedControlSuccessors(op,id){
 var links=(op&&op.links)||[],out=[];
 links.forEach(function(link){
  // A child fork can sit immediately after an enclosing Parallel/Serial join
  // (native Simple9). Follow that convergent continuation for containment;
  // `Other` stays excluded because it is solely a loop-back leg.
  if((link.type!=='ControlLink'&&link.type!=='ParallelConvergent'&&link.type!=='SerialConvergent')||link.from_type!=='Step'||link.from_re_id!==id)return;
  if(link.to_type==='Step'&&link.to_re_id)out.push(link.to_re_id);
  // A Transition is an inline node. Follow only its normal ControlLink exit;
  // never follow its Other loop leg during forward layout traversal.
  if(link.to_type==='Transition'&&link.to_id)links.forEach(function(exit){if((exit.type==='ControlLink'||exit.type==='ParallelConvergent'||exit.type==='SerialConvergent')&&exit.from_type==='Transition'&&exit.from_id===link.to_id&&exit.to_type==='Step'&&exit.to_re_id)out.push(exit.to_re_id);});
 });return nestedUnique(out);
}
function nestedPhaseHtml(op,id,up,u,o,transAfter,loopBacks){var found=lanePhaseById(op,id);if(!found)return '';var moves=typeof graphMoveCapabilities==='function'?graphMoveCapabilities(op,id):{up:false,down:false};return buildLanePhaseHtml(found.phase,up,u,o,found.index,transAfter,loopBacks,true,moves,true);}

/* Build a true containment tree. A child may be rendered only by the lane that reaches
   its fork before the parent region's corresponding join source. */
function nestedRegionHierarchy(op){
 var regions=collectNestedBranchRegions(op),byFork={};
 regions.forEach(function(region){region._parentFork=null;region._parentLane=-1;region._childrenByLane=[];region._childrenBuilt=false;byFork[region.forkSource]=region;});
 function assignChildren(parent){
  if(parent._childrenBuilt)return;
  parent._childrenBuilt=true;
  parent.targets.forEach(function(start,laneIndex){
   var current=start,seen={};parent._childrenByLane[laneIndex]=[];
   // After deleting a post-nested Phase (e.g. #41), the parent lane entry
   // #25 can also become its outer join source. Attach the nested fork at
   // that entry before the join-stop rule, otherwise its lanes are rendered
   // as loose linear cards inside Branch A.
   var entryChild=byFork[start];
   if(entryChild&&entryChild!==parent&&entryChild._parentFork===null){
     entryChild._parentFork=parent.forkSource;entryChild._parentLane=laneIndex;
     parent._childrenByLane[laneIndex].push(entryChild);assignChildren(entryChild);
   }
   while(current&&!seen[current]&&parent.joinSources.indexOf(current)<0){
    seen[current]=true;var child=byFork[current];
    if(child&&child!==parent){
     // First enclosing lane owns the child; never re-parent it from another reachability path.
     if(child._parentFork===null){child._parentFork=parent.forkSource;child._parentLane=laneIndex;parent._childrenByLane[laneIndex].push(child);assignChildren(child);}
     current=child.joinTarget;continue;
    }
    var next=nestedControlSuccessors(op,current);if(next.length!==1)break;current=next[0];
   }
   // A native continuation DUMMY immediately after this region's join may be
   // the source of the next fork (Simple8/9). The lane walk stops at its join
   // source by design, so attach that child explicitly at the join boundary.
   if(parent.joinSources.indexOf(current)>=0){
     var postJoinChild=byFork[parent.joinTarget];
     if(postJoinChild&&postJoinChild!==parent&&postJoinChild._parentFork===null){
       // This is a subsequent main-path fork after a Join, not a child inside
       // this lane. Parent ownership prevents duplicate roots; the explicit
       // relation keeps its UI label and deletion semantics separate.
       postJoinChild._parentFork=parent.forkSource;postJoinChild._parentLane=-1;postJoinChild._relation='subsequent';
       assignChildren(postJoinChild);
     }
   }
  });
 }
 regions.forEach(function(region){assignChildren(region);});
 // Apply native join-continuation ownership independently of traversal order.
 // A fork at another region's join target (Simple8/Simple9 #72) is never a
 // second root: it is rendered exactly once after that enclosing Join.
 regions.forEach(function(child){
   var parent=regions.filter(function(candidate){return candidate!==child&&String(candidate.joinTarget)===String(child.forkSource);})[0];
   // Join continuation is stronger than traversal/discovery order. Always
   // sequence this fork after its owning join; never leave it as a root or
   // lane-nested child because the result is a duplicate/reversed display.
   if(parent){child._parentFork=parent.forkSource;child._parentLane=-1;child._relation='subsequent';}
 });
 return {regions:regions,byFork:byFork,roots:regions.filter(function(region){return region._parentFork===null;})};
}
function nestedTransitionCard(op,tid,u,o){return typeof transitionNodeHtml==='function'?transitionNodeHtml(op,u,o,tid):'<div class="lane-transition-node">Transition #'+esc(tid)+'</div>';}
function nestedStepTransition(op,id){return ((op.links||[]).filter(function(l){return l.type==='ControlLink'&&l.from_type==='Step'&&l.from_re_id===id&&l.to_type==='Transition';})[0]||{}).to_id||'';}
function nestedTransitionStep(op,tid){/* Native Simple9 Transition 9 can exit directly into ParallelDivergent. Other remains excluded because it is only a loop-back annotation. */return ((op.links||[]).filter(function(l){return (l.type==='ControlLink'||l.type==='ParallelDivergent'||l.type==='SerialDivergent'||l.type==='ParallelConvergent'||l.type==='SerialConvergent')&&l.from_type==='Transition'&&l.from_id===tid&&l.to_type==='Step';})[0]||{}).to_re_id||'';}
function nestedTransitionChain(op,tid,u,o,stopIds){
 var links=(op&&op.links)||[],seen={},h='',current=tid;
 while(current&&!seen[current]){seen[current]=true;h+=nestedTransitionCard(op,current,u,o);if(stopIds&&stopIds['@T:'+current])return {html:h,next:'',stopped:true};var next=links.filter(function(link){return link.type!=='Other'&&link.from_type==='Transition'&&link.from_id===current;})[0];if(!next)return {html:h,next:''};if(next.to_type==='Transition'){current=next.to_id;continue;}return {html:h,next:next.to_re_id||''};}
 return {html:h,next:''};
}
function nestedRenderSequence(op,start,stopIds,owner,byFork,up,u,o,transAfter,loopBacks,depth,consumed){var cur=start,seen={},h='';while(cur&&!seen[cur]){seen[cur]=true;consumed[cur]=true;var child=byFork[cur],atFork=child&&child._parentFork===owner.forkSource,phaseAtFork=atFork&&lanePhaseById(op,cur);/* A Phase is the visible source of its nested fork (simple4: Label 2). Only a structural DUMMY fork anchor is hidden. */if(!atFork||(phaseAtFork&&!phaseAtFork.phase._dummy))h+=nestedPhaseHtml(op,cur,up,u,o,transAfter,loopBacks);if(stopIds[cur])break;if(atFork){h+='<div class="lane-branch-child-viewport">'+renderNestedBranchRegion(child,op,byFork,up,u,o,transAfter,loopBacks,depth+1,consumed)+'</div>';cur=child.joinTarget;continue;}var tid=nestedStepTransition(op,cur);if(tid){var chain=nestedTransitionChain(op,tid,u,o,stopIds);h+=chain.html;if(chain.stopped)break;cur=chain.next;continue;}var next=nestedControlSuccessors(op,cur);if(next.length!==1)break;cur=next[0];}return h;}

function renderNestedBranchRegion(region,op,byFork,up,u,o,transAfter,loopBacks,depth,consumed){
 var isAll=region.mode==='All',isSubsequent=region._relation==='subsequent',title=isSubsequent?'Subsequent fork':(depth?'Nested fork':'Fork'),h='<section class="lane-branch lane-branch-readonly lane-branch-'+(isAll?'all':'single')+' '+(isSubsequent?'lane-branch-subsequent':'lane-branch-nested')+'" data-nested-depth="'+depth+'" data-region-fork="'+region.forkSource+'" data-parent-fork="'+(region._parentFork||'')+'">';
 h+='<div class="lane-branch-fork"><span class="lane-branch-symbol">'+(isAll?'⇱':'◇')+'</span><span><strong>'+title+'</strong> · '+(isAll?'Parallel branches · <strong>All</strong>':'Serial branches · <strong>Single</strong>')+'</span><span class="lane-branch-mode">'+(isAll?'Execute all':'Execute one')+'</span></div><div class="lane-branch-lanes">';
 for(var i=0;i<region.targets.length;i++){var stops={};region.joinSources.forEach(function(id){stops[id]=true;});var laneMenu=((typeof editMode!=='undefined'&&editMode)&&typeof branchLaneDeleteMenuHtml==='function')?'<span class="act-bar">'+branchLaneDeleteMenuHtml(u,o,region.forkSource,i)+'</span>':'';h+='<div class="lane-branch-lane" data-parent-fork="'+region.forkSource+'" data-lane-index="'+i+'"><div class="lane-branch-label">Branch '+branchDisplayLetter(i)+laneMenu+'</div>';h+=nestedRenderSequence(op,region.targets[i],stops,region,byFork,up,u,o,transAfter,loopBacks,depth,consumed);if(editMode&&typeof v128LaneJoinDropHtml==='function')h+=v128LaneJoinDropHtml(u,o,region.forkSource,i);h+='</div>';}
 h+='</div><div class="lane-branch-join"><span class="lane-branch-symbol">⇲</span><span><strong>'+(depth?'Nested join':'Join')+'</strong> · '+(isAll?'Parallel':'Serial')+' convergent</span>'+((typeof editMode!=='undefined'&&editMode)&&typeof universalJoinMenuHtml==='function'?'<span class="act-bar">'+universalJoinMenuHtml(u,o,region.forkSource)+'</span>':'')+'</div></section>';
 // Simple8/9 continuation: the join target can itself be the structural
 // DUMMY source of the next fork. Emit that connector and child region once,
 // here, under the enclosing region—not again as an independent root.
 var postJoinChild=byFork[region.joinTarget];
 if(postJoinChild&&postJoinChild._parentFork===region.forkSource){
   // #72 is a structural join-continuation connector when it immediately
   // feeds the next main-path fork. It must not appear as a loose empty lane
   // between the two regions; the subsequent fork owns that position.
   var continuation=lanePhaseById(op,region.joinTarget);
   if(!consumed[region.joinTarget]){consumed[region.joinTarget]=true;if(continuation&&continuation.phase&&!continuation.phase._dummy)h+=nestedPhaseHtml(op,region.joinTarget,up,u,o,transAfter,loopBacks);}
   if(editMode&&typeof v126PostJoinDropHtml==='function')h+=v126PostJoinDropHtml(u,o,postJoinChild.forkSource);
   h+='<div class="lane-branch-child-viewport lane-branch-postjoin-child">'+renderNestedBranchRegion(postJoinChild,op,byFork,up,u,o,transAfter,loopBacks,depth+1,consumed)+'</div>';
 }
 return h;
}
function nestedRenderPrefixToFork(op,stopId,up,u,o,transAfter,loopBacks,consumed){
 /* The graph may contain a linear initial path before the first fork. After an
    insertion immediately before a branch, that selected Phase must remain
    visible: Begin -> selected Phase -> inserted Phase/fork. */
 var cur=op._beginReId,seen={},h='';while(cur&&!seen[cur]&&cur!==stopId){seen[cur]=true;if(cur!==op._beginReId&&!consumed[cur]){consumed[cur]=true;h+=nestedPhaseHtml(op,cur,up,u,o,transAfter,loopBacks);}var tid=nestedStepTransition(op,cur);if(tid){var chain=nestedTransitionChain(op,tid,u,o,stopId&&stopId.indexOf('@T:')===0?((function(){var x={};x[stopId]=true;return x;})()):null);h+=chain.html;/* A root fork may be Transition-led. After rendering the complete normal chain, the branch renderer owns its targets. */if(chain.stopped)break;cur=chain.next;continue;}var next=nestedControlSuccessors(op,cur);if(next.length!==1)break;cur=next[0];}return h;
}
function renderNestedOperationPhases(op,up,u,o,transAfter,loopBacks){
 // A surviving Simple10 graph has one valid Transition-led branch after the
 // second Simple9 region is deleted. It must remain in the canonical branch
 // renderer; the linear fallback cannot represent a Transition-origin fork.
 var hierarchy=nestedRegionHierarchy(op);if(!hierarchy.roots.length)return '';
 var consumed={},h='<div class="nested-operation-graph">';hierarchy.roots.forEach(function(region,index){/* Render initial linear prefix only before the first root fork. */if(index===0)h+=nestedRenderPrefixToFork(op,region.forkSource,up,u,o,transAfter,loopBacks,consumed);/* A Join continuation may immediately become the next branch's fork source (Simple8). It has one RecipeElement identity and must render once: after the first Join, before the next fork. */if(region.forkSource!==op._beginReId&&!consumed[region.forkSource]){consumed[region.forkSource]=true;h+=nestedPhaseHtml(op,region.forkSource,up,u,o,transAfter,loopBacks);}h+=renderNestedBranchRegion(region,op,hierarchy.byFork,up,u,o,transAfter,loopBacks,0,consumed);if(region.joinTarget!==op._endReId&&!consumed[region.joinTarget]){consumed[region.joinTarget]=true;h+=nestedPhaseHtml(op,region.joinTarget,up,u,o,transAfter,loopBacks);}});return h+'</div>';
}


/* === Consolidated Join boundary drop renderers === */
function postJoinDropHtml(u,o,forkId){return '<div class="graph-drop-boundary v126-postjoin-drop" data-postjoin-fork="'+esc(String(forkId))+'" ondragover="v1212DragOver(event)" ondragleave="v1212DragLeave(event)" ondrop="v1212Drop(event,'+u+','+o+')">Drop Phase here <span>after Join · before Subsequent fork</span></div>';}
function laneJoinDropHtml(u,o,forkId,laneIndex){return '<div class="graph-drop-boundary v128-lane-join-drop" data-fork="'+esc(String(forkId))+'" data-lane="'+laneIndex+'" ondragover="v1212DragOver(event)" ondragleave="v1212DragLeave(event)" ondrop="v1212Drop(event,'+u+','+o+')">Drop Phase here <span>into Branch '+branchDisplayLetter(laneIndex)+' · before Join</span></div>';}
/* Existing renderer calls retained names; aliases avoid a second visual-boundary module. */
var v126PostJoinDropHtml=postJoinDropHtml;
var v128LaneJoinDropHtml=laneJoinDropHtml;
