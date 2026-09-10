// graph-delete.js - Stage 7H guarded canonical graph deletion
// Mutations operate on RecipeElement identities and ProcedureLogic link endpoints.
// Unsupported topology is deliberately refused; no visual-only deletion is allowed.

function graphDeleteNodeId(phase){return phase&&(phase._reId||phase.node_id)||'';}
function graphDeleteOp(u,o){return currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o];}
function graphDeleteEndpoint(op,id){
  if(id===op._beginReId)return {_reId:id,label:'Begin'};
  if(id===op._endReId)return {_reId:id,label:'End'};
  return (op.phases||[]).filter(function(p){return graphDeleteNodeId(p)===id;})[0]||null;
}
function graphDeleteLink(type,from,to){return {type:type,from:from.label||from._reId,from_id:'',from_node:from._reId,from_re_id:from._reId,from_type:'Step',to:to.label||to._reId,to_id:'',to_node:to._reId,to_re_id:to._reId,to_type:'Step'};}
function graphDeleteLinksAt(op,id){return (op.links||[]).filter(function(l){return l.from_type==='Step'&&l.to_type==='Step'&&(l.from_re_id===id||l.to_re_id===id);});}
function graphDeleteValidate(op){
  var known={};known[op._beginReId]=true;known[op._endReId]=true;
  (op.phases||[]).forEach(function(p){var id=graphDeleteNodeId(p);if(!id)throw new Error('A retained graph node has no RecipeElement identity.');known[id]=true;});
  (op.links||[]).forEach(function(l){
    // Branches may originate at a Transition (native Simple8: Transition 9
    // diverges to the two lanes). Validate RecipeElement identity only on
    // endpoints declared as Steps; Transition identity is held in from_id/to_id.
    if(l.from_type==='Step'&&(!l.from_re_id||!known[l.from_re_id]))throw new Error('A graph link has an unresolved Step source.');
    if(l.to_type==='Step'&&(!l.to_re_id||!known[l.to_re_id]))throw new Error('A graph link has an unresolved Step target.');
    if(l.from_type==='Step')l.from_node=l.from_re_id;
    if(l.to_type==='Step')l.to_node=l.to_re_id;
  });
  return true;
}
function graphDeleteCommit(op){
  graphDeleteValidate(op);
  if(typeof normaliseOperationStepEndpoints==='function')normaliseOperationStepEndpoints(op);
  op._graphEdit=true;currentRecipeData._structuralEdit=true;
}
function graphDeleteLinearNode(op,id){
  var node=graphDeleteEndpoint(op,id);if(!node||id===op._beginReId||id===op._endReId)return {ok:false,reason:'Start and End cannot be deleted.'};
  var touching=graphDeleteLinksAt(op,id),incoming=touching.filter(function(l){return l.to_re_id===id;}),outgoing=touching.filter(function(l){return l.from_re_id===id;});
  if(touching.some(function(l){return l.type!=='ControlLink';})||incoming.length!==1||outgoing.length!==1)return {ok:false,reason:'This node is a branch, join, Transition, loop, or other non-linear graph boundary.'};
  var before=graphDeleteEndpoint(op,incoming[0].from_re_id),after=graphDeleteEndpoint(op,outgoing[0].to_re_id);
  if(!before||!after)return {ok:false,reason:'The node has an unresolved predecessor or successor.'};
  op.links=op.links.filter(function(l){return touching.indexOf(l)<0;});
  op.links.push(graphDeleteLink('ControlLink',before,after));
  op.phases=op.phases.filter(function(p){return graphDeleteNodeId(p)!==id;});
  graphDeleteCommit(op);return {ok:true,mode:'linear'};
}
function graphDeleteLane(op,region,laneIndex){
  var lane=region.lanes[laneIndex];if(!lane)return {ok:false,reason:'The selected branch lane could not be resolved.'};
  var remove={},i;for(i=0;i<lane.phases.length;i++)remove[lane.phases[i]]=true;
  // The display detector only yields closed, direct lanes. Still prove no edge
  // from this lane crosses to an unrelated graph node before committing.
  var allowed={};allowed[region.forkSource]=true;allowed[region.joinTarget]=true;
  lane.phases.forEach(function(id){allowed[id]=true;});
  var touching=(op.links||[]).filter(function(l){return remove[l.from_re_id]||remove[l.to_re_id];});
  if(touching.some(function(l){return !allowed[l.from_re_id]||!allowed[l.to_re_id];}))return {ok:false,reason:'The lane has a nested or shared graph edge and cannot be removed safely.'};
  var remaining=region.lanes.filter(function(_,index){return index!==laneIndex;});
  if(remaining.length<1)return {ok:false,reason:'A branch must retain one route until the enclosing branch is removed.'};
  op.links=op.links.filter(function(l){return !remove[l.from_re_id]&&!remove[l.to_re_id];});
  op.phases=op.phases.filter(function(p){return !remove[graphDeleteNodeId(p)];});
  if(remaining.length===1){
    // Native two-to-one resolution: remove the fork/join pair and restore a
    // canonical linear route through the surviving lane.
    var survivor=remaining[0],source=graphDeleteEndpoint(op,region.forkSource),target=graphDeleteEndpoint(op,region.joinTarget);
    if(!source||!target)return {ok:false,reason:'The surviving branch boundaries could not be resolved.'};
    op.links=op.links.filter(function(l){return !(l.type===region.forkType&&l.from_re_id===region.forkSource) && !(l.type===region.joinType&&l.to_re_id===region.joinTarget);});
    op.links.push(graphDeleteLink('ControlLink',source,graphDeleteEndpoint(op,survivor.entry)));
    op.links.push(graphDeleteLink('ControlLink',graphDeleteEndpoint(op,survivor.exit),target));
  }
  graphDeleteCommit(op);return {ok:true,mode:remaining.length===1?'lane-collapse':'lane-remove'};
}
function graphDeleteDirectEmptyLaneToDummy(op,id){
  var phase=graphDeleteEndpoint(op,id);if(!phase||phase._dummy===true)return {ok:false,reason:'The selected node is not a populated branch-lane Phase.'};
  // Do not use graphDeleteLinksAt here: Simple8's first branch is emitted
  // from Transition 9, hence its divergent source is not a Step.
  var at=(op.links||[]).filter(function(l){return (l.to_type==='Step'&&l.to_re_id===id)||(l.from_type==='Step'&&l.from_re_id===id);}),inFork=at.filter(function(l){return l.to_re_id===id&&(l.type==='ParallelDivergent'||l.type==='SerialDivergent');}),outJoin=at.filter(function(l){return l.from_re_id===id&&(l.type==='ParallelConvergent'||l.type==='SerialConvergent');});
  // This is the native Simple8 #80 signature. It intentionally does not
  // depend on the renderer recognising the enclosing region.
  if(inFork.length!==1||outJoin.length!==1)return {ok:false,reason:'The selected node is not a direct fork-to-join branch lane.'};
  if(inFork[0].type.replace('Divergent','')!==outJoin[0].type.replace('Convergent',''))return {ok:false,reason:'The lane fork and join families do not match.'};
  var index=op.phases.indexOf(phase);if(index<0)return {ok:false,reason:'The branch Phase is absent from the canonical node list.'};
  var replacement={_reId:String(id),node_id:String(id),label:'',phase_type:'Dummy',parent_instance:'',description:'',_label:'',params:[],_dummy:true};
  op.phases[index]=replacement;
  graphDeleteCommit(op);return {ok:true,mode:'empty-lane-dummy'};
}
function graphDeleteSoleLanePhaseToDummy(op,region,laneIndex,id){
  var lane=region.lanes[laneIndex];
  if(!lane||lane.phases.length!==1||lane.phases[0]!==id)return {ok:false,reason:'The selected node is not the sole Phase in this lane.'};
  var phase=graphDeleteEndpoint(op,id);if(!phase)return {ok:false,reason:'The branch Phase could not be resolved.'};
  // Native Simple8 → Simple9 rule: retain the RecipeElement and both branch
  // boundaries, changing only Phase into Other OtherValue=DUMMY at this ID.
  // This deliberately leaves a real, selectable empty lane rather than
  // collapsing the branch or manufacturing replacement links.
  var replacement={_reId:String(id),node_id:String(id),label:'',phase_type:'Dummy',parent_instance:'',description:'',_label:'',params:[],_dummy:true};
  var index=op.phases.indexOf(phase);if(index<0)return {ok:false,reason:'The branch Phase is absent from the canonical node list.'};
  op.phases[index]=replacement;
  graphDeleteCommit(op);return {ok:true,mode:'empty-lane-dummy'};
}
function graphDeleteSelectedNode(u,o,id){
  var op=graphDeleteOp(u,o);if(!op)return {ok:false,reason:'The operation is no longer available.'};
  // A card in a branch is still an ordinary item when it has exactly one
  // ControlLink predecessor and successor. Delete that item first; do not
  // turn a three-item lane into an all-or-nothing lane deletion.
  var linear=graphDeleteLinearNode(op,id);
  if(linear.ok)return linear;
  var directEmptyLane=graphDeleteDirectEmptyLaneToDummy(op,id);
  if(directEmptyLane.ok)return directEmptyLane;
  var regions=typeof collectReadOnlyBranchRegions==='function'?collectReadOnlyBranchRegions(op):[];
  for(var r=0;r<regions.length;r++)for(var l=0;l<regions[r].lanes.length;l++){
    if(regions[r].lanes[l].phases.indexOf(id)<0)continue;
    var emptyLane=graphDeleteSoleLanePhaseToDummy(op,regions[r],l,id);
    if(emptyLane.ok)return emptyLane;
    return graphDeleteLane(op,regions[r],l);
  }
  return linear;
}
function requestGraphDeleteNode(u,o,id,label){
  var op=graphDeleteOp(u,o),result;
  if(!op)return;
  if(typeof confirm==='function'&&!confirm('Delete '+(label||'this graph item')+'?\n\nThe editor will only apply the deletion if it can prove a valid AVEVA graph reconnection.'))return;
  try{result=graphDeleteSelectedNode(u,o,String(id));}catch(e){alert('Delete was not applied: '+e.message);return;}
  if(!result.ok){alert('Delete was not applied: '+result.reason);return;}
  renderAll();
}
function requestGraphDeletePhase(u,o,p){var op=graphDeleteOp(u,o),phase=op&&op.phases[p],id=graphDeleteNodeId(phase);if(id)requestGraphDeleteNode(u,o,id,phase.label);}

// Stage 7H.6 — selected branch lane/subtree deletion.
function graphDeleteRegionSourceLink(op,region,entry){
  var candidates=(op.links||[]).filter(function(l){return l.type===region.forkType&&l.to_type==='Step'&&l.to_re_id===entry;});
  return candidates[0]||null;
}
function graphDeleteLaneClosure(op,region,laneIndex){
  // Delete-this-branch means the complete exclusive lane closure: Step nodes,
  // Transition nodes and loop-back legs. A DUMMY -> Transition -> Phase ->
  // Transition loop must not survive invisibly and reappear after another edit.
  var entry=region.targets[laneIndex],stop={};stop[region.joinTarget]=true;
  region.targets.forEach(function(id,i){if(i!==laneIndex)stop[id]=true;});
  var nodes={},transitions={},queue=[{kind:'Step',id:entry}],seen={};
  function add(kind,id){if(!id)return;var key=kind+':'+id;if(seen[key])return;queue.push({kind:kind,id:String(id)});}
  while(queue.length){
    var item=queue.shift(),key=item.kind+':'+item.id;if(seen[key])continue;seen[key]=true;
    if(item.kind==='Step'){
      if(stop[item.id])continue;nodes[item.id]=true;
      (op.links||[]).forEach(function(l){
        if(l.from_type!=='Step'||String(l.from_re_id)!==item.id)return;
        if(l.to_type==='Step'&&!stop[l.to_re_id])add('Step',l.to_re_id);
        if(l.to_type==='Transition')add('Transition',l.to_id);
      });
    }else{
      transitions[item.id]=true;
      (op.links||[]).forEach(function(l){
        if(l.from_type!=='Transition'||String(l.from_id)!==item.id)return;
        // Follow a loop leg only if it stays within the selected lane; never
        // cross the selected region's convergent boundary into its join target.
        if(l.to_type==='Step'&&!stop[l.to_re_id])add('Step',l.to_re_id);
        if(l.to_type==='Transition')add('Transition',l.to_id);
      });
    }
  }
  return {nodes:nodes,transitions:transitions};
}
function graphDeleteLaneSubtreeIds(op,region,laneIndex){return graphDeleteLaneClosure(op,region,laneIndex).nodes;}
function graphDeleteBranchLane(u,o,forkSource,laneIndex){
  var op=graphDeleteOp(u,o);if(!op)return {ok:false,reason:'The operation is no longer available.'};
  var regions=typeof collectNestedBranchRegions==='function'?collectNestedBranchRegions(op):[];
  var region=regions.filter(function(r){return String(r.forkSource)===String(forkSource);})[0];
  if(!region)return {ok:false,reason:'The selected branch boundary could not be resolved.'};
  if(region.targets.length<2||laneIndex<0||laneIndex>=region.targets.length)return {ok:false,reason:'The selected branch lane is unavailable.'};
  var closure=graphDeleteLaneClosure(op,region,laneIndex),remove=closure.nodes,removeTransitions=closure.transitions,remaining=region.targets.filter(function(_,i){return i!==laneIndex;});
  // Do not delete a node shared by a sibling lane or the enclosing join.
  if(remove[region.joinTarget])return {ok:false,reason:'The selected lane reaches a shared join boundary.'};
  op.links=(op.links||[]).filter(function(l){return !(l.from_type==='Step'&&remove[l.from_re_id])&&!(l.to_type==='Step'&&remove[l.to_re_id])&&!(l.from_type==='Transition'&&removeTransitions[l.from_id])&&!(l.to_type==='Transition'&&removeTransitions[l.to_id]);});
  Object.keys(removeTransitions).forEach(function(id){if(op.transitions)delete op.transitions[id];if(op.transition_meta)delete op.transition_meta[id];});
  op.phases=(op.phases||[]).filter(function(p){return !remove[graphDeleteNodeId(p)];});
  if(remaining.length===1){
    var survivor=remaining[0],sourceLink=graphDeleteRegionSourceLink(op,region,survivor),source=sourceLink&&sourceLink.from_type==='Step'?graphDeleteEndpoint(op,sourceLink.from_re_id):null;
    var exit=(region.joinSources||[]).filter(function(id){return !remove[id];})[0],join=graphDeleteEndpoint(op,region.joinTarget),survivorPhase=graphDeleteEndpoint(op,survivor);
    if(!sourceLink||!exit||!join||!survivorPhase)return {ok:false,reason:'The surviving lane cannot be connected to its branch boundaries.'};
    op.links=op.links.filter(function(l){return !(l.type===region.forkType&&String((l.from_type==='Step'?l.from_re_id:'@T:'+l.from_id))===String(region.forkSource))&&!(l.type===region.joinType&&l.to_type==='Step'&&l.to_re_id===region.joinTarget);});
    if(survivorPhase._dummy===true&&survivorPhase.phase_type==='Dummy'){
      // Deleting the populated side of a two-lane branch with an empty other
      // side removes the whole region (Simple9 rule), reconnecting its source
      // straight to the former join continuation.
      op.phases=op.phases.filter(function(p){return graphDeleteNodeId(p)!==survivor;});
      op.links=op.links.filter(function(l){return !(l.from_type==='Step'&&l.from_re_id===survivor)&&!(l.to_type==='Step'&&l.to_re_id===survivor);});
      if(sourceLink.from_type==='Transition'){
        // The first Simple9 branch starts at Transition 9. Its join target
        // is the continuation DUMMY for the following branch, so preserve it.
        op.links.push({type:'ControlLink',from:sourceLink.from,from_id:sourceLink.from_id,from_type:'Transition',to:join.label||join._reId,to_id:'',to_re_id:join._reId,to_node:join._reId,to_type:'Step'});
      }else if(source&&source._dummy===true&&source.phase_type==='Dummy'){
        // The second Simple9 branch starts at the join-continuation DUMMY.
        // Removing this entire final region must remove that continuation too:
        // retarget its enclosing join to this region's downstream endpoint.
        // Preserve the incoming link type (normally ParallelConvergent), so
        // the parent region still closes as native AVEVA ProcedureLogic.
        (op.links||[]).forEach(function(link){
          if(link.to_type==='Step'&&link.to_re_id===source._reId){
            link.to=join.label||join._reId;link.to_re_id=join._reId;link.to_node=join._reId;
          }
        });
        op.links=op.links.filter(function(link){return !(link.from_type==='Step'&&link.from_re_id===source._reId);});
        op.phases=op.phases.filter(function(p){return graphDeleteNodeId(p)!==source._reId;});
      }else op.links.push(graphDeleteLink('ControlLink',source,join));
      graphDeleteCommit(op);return {ok:true,mode:'branch-region-remove-empty-survivor'};
    }
    if(sourceLink.from_type==='Transition')op.links.push({type:'ControlLink',from:sourceLink.from,from_id:sourceLink.from_id,from_type:'Transition',to:survivorPhase.label||survivor,to_id:'',to_re_id:survivor,to_node:survivor,to_type:'Step'});
    else if(source&&source._dummy===true&&source.phase_type==='Dummy'){
      // Collapsing a subsequent fork with a populated survivor (Simple9
      // Branch B delete) promotes that survivor to the preceding main path.
      // #72 is only the former join-continuation connector: retarget the
      // enclosing convergence to Feedwater, then remove #72 completely.
      (op.links||[]).forEach(function(link){
        if(link.to_type==='Step'&&link.to_re_id===source._reId){
          link.to=survivorPhase.label||survivor;link.to_re_id=survivor;link.to_node=survivor;
        }
      });
      op.links=op.links.filter(function(link){return !(link.from_type==='Step'&&link.from_re_id===source._reId);});
      op.phases=op.phases.filter(function(p){return graphDeleteNodeId(p)!==source._reId;});
    }else op.links.push(graphDeleteLink('ControlLink',source,survivorPhase));
    op.links.push(graphDeleteLink('ControlLink',graphDeleteEndpoint(op,exit),join));
  }
  graphDeleteCommit(op);return {ok:true,mode:remaining.length===1?'branch-collapse-to-main':'branch-lane-remove'};
}
function requestGraphDeleteBranchLane(u,o,forkSource,laneIndex,label){
 if(typeof confirm==='function'&&!confirm('Delete '+label+' and its nested contents?\n\nRemaining lanes will be retained; a two-lane branch collapses to its surviving main path.'))return;
 var result;try{result=graphDeleteBranchLane(u,o,String(forkSource),Number(laneIndex));}catch(e){alert('Delete was not applied: '+e.message);return;}
 if(!result.ok){alert('Delete was not applied: '+result.reason);return;}renderAll();
}
function branchLaneDeleteMenuHtml(u,o,forkSource,laneIndex){
 var letter=typeof branchDisplayLetter==='function'?branchDisplayLetter(laneIndex):String(laneIndex+1);
 return '<div class="act-more" onclick="toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for Branch '+letter+'">⋮</button><div class="dropdown"><div class="dd-label">Branch '+letter+'</div><div class="dd-item danger" onclick="requestGraphDeleteBranchLane('+u+','+o+',\''+forkSource+'\','+laneIndex+',\'Branch '+letter+'\')">✖ Delete this branch</div></div></div>';
}

// Stage 7H.15 — delete a nested region from its post-join continuation node.
function graphDeleteRegionAtContinuation(op, continuationId){
  var regions=typeof collectNestedBranchRegions==='function'?collectNestedBranchRegions(op):[];
  var region=regions.filter(function(r){return String(r.joinTarget)===String(continuationId);})[0];
  if(!region)return {ok:false,reason:'The selected node is not a nested branch continuation.'};
  // Find the enclosing region whose lane reaches this nested region's fork.
  var parent=regions.filter(function(r){return r!==region&&r.targets.indexOf(region.forkSource)>=0;})[0];
  if(!parent)return {ok:false,reason:'The nested branch has no enclosing lane boundary.'};
  var outerExit=(parent.joinSources||[]).filter(function(id){return String(id)===String(continuationId);})[0];
  if(!outerExit)return {ok:false,reason:'The nested continuation is not an exit of its enclosing branch.'};
  var keepSource=graphDeleteEndpoint(op,region.forkSource),parentJoin=graphDeleteEndpoint(op,parent.joinTarget);
  if(!keepSource||!parentJoin)return {ok:false,reason:'The enclosing branch endpoints cannot be resolved.'};
  // Remove every node belonging to the nested region, including its continuation
  // target. A lane traversal stops at the region join, so add it explicitly.
  var remove={};region.targets.forEach(function(_,index){var ids=graphDeleteLaneSubtreeIds(op,region,index);Object.keys(ids).forEach(function(id){remove[id]=true;});});remove[region.joinTarget]=true;
  // Retarget the enclosing convergence *before* generic removal. Otherwise
  // #41 is filtered out with the nested subtree and Branch A loses its join.
  (op.links||[]).forEach(function(l){if(l.type===parent.joinType&&l.from_type==='Step'&&String(l.from_re_id)===String(continuationId)){l.from=keepSource.label||keepSource._reId;l.from_re_id=keepSource._reId;l.from_node=keepSource._reId;}});
  op.links=(op.links||[]).filter(function(l){return !(l.from_type==='Step'&&remove[l.from_re_id])&&!(l.to_type==='Step'&&remove[l.to_re_id]);});
  op.phases=(op.phases||[]).filter(function(p){return !remove[graphDeleteNodeId(p)];});
  // Remove only the nested fork/convergence edges. The enclosing convergence
  // has already been retargeted from #41 to #25, yielding Simple13 topology.
  op.links=op.links.filter(function(l){return !(l.type===region.forkType&&String((l.from_type==='Step'?l.from_re_id:'@T:'+l.from_id))===String(region.forkSource))&&!(l.type===region.joinType&&l.to_type==='Step'&&l.to_re_id===region.joinTarget);});
  graphDeleteCommit(op);return {ok:true,mode:'nested-region-continuation-remove'};
}

// After the nested region has already been reduced manually, its former join
// continuation (#41 in simple11/12) is an outer-lane exit: ControlLink in,
// outer ParallelConvergent out. Delete it by retargeting that convergence.
function graphDeleteOuterLaneExit(op,id){
 var node=graphDeleteEndpoint(op,id);if(!node)return {ok:false,reason:'The selected continuation cannot be resolved.'};
 var touching=graphDeleteLinksAt(op,id),incoming=touching.filter(function(l){return l.to_re_id===id&&l.type==='ControlLink';}),outgoing=touching.filter(function(l){return l.from_re_id===id&&(l.type==='ParallelConvergent'||l.type==='SerialConvergent');});
 if(incoming.length!==1||outgoing.length!==1||touching.length!==2)return {ok:false,reason:'The selected node is not a removable outer-lane continuation.'};
 var predecessor=graphDeleteEndpoint(op,incoming[0].from_re_id);if(!predecessor)return {ok:false,reason:'The outer-lane predecessor cannot be resolved.'};
 outgoing[0].from=predecessor.label||predecessor._reId;outgoing[0].from_re_id=predecessor._reId;outgoing[0].from_node=predecessor._reId;
 op.links=op.links.filter(function(l){return l!==incoming[0];});
 op.phases=op.phases.filter(function(p){return graphDeleteNodeId(p)!==id;});
 graphDeleteCommit(op);return {ok:true,mode:'outer-lane-continuation-bypass'};
}
// Override dispatch so structural continuations are dealt with before generic
// node/lane matching. This supports direct #41 deletion and the staged path.
function graphDeleteSelectedNode(u,o,id){
 var op=graphDeleteOp(u,o);if(!op)return {ok:false,reason:'The operation is no longer available.'};
 var linear=graphDeleteLinearNode(op,id);if(linear.ok)return linear;
 var intactNested=graphDeleteRegionAtContinuation(op,id);if(intactNested.ok)return intactNested;
 var outerExit=graphDeleteOuterLaneExit(op,id);if(outerExit.ok)return outerExit;
 var directEmptyLane=graphDeleteDirectEmptyLaneToDummy(op,id);if(directEmptyLane.ok)return directEmptyLane;
 var regions=typeof collectReadOnlyBranchRegions==='function'?collectReadOnlyBranchRegions(op):[];
 for(var r=0;r<regions.length;r++)for(var l=0;l<regions[r].lanes.length;l++){
   if(regions[r].lanes[l].phases.indexOf(id)<0)continue;
   var emptyLane=graphDeleteSoleLanePhaseToDummy(op,regions[r],l,id);if(emptyLane.ok)return emptyLane;
   return graphDeleteLane(op,regions[r],l);
 }
 return linear;
}

// Remove only Transition records no longer referenced by any retained link.
// This prevents deleted nested loops (Transitions 6/8 in simple11) being
// serialised after their branch nodes are gone.
function graphDeletePruneOrphanTransitions(op){
 var used={};(op.links||[]).forEach(function(l){if(l.from_type==='Transition'&&l.from_id)used[String(l.from_id)]=true;if(l.to_type==='Transition'&&l.to_id)used[String(l.to_id)]=true;});
 Object.keys(op.transitions||{}).forEach(function(id){if(!used[String(id)]){delete op.transitions[id];if(op.transition_meta)delete op.transition_meta[id];}});
}
// Redefine the commit point after deletion helpers so all removal paths prune
// detached Transition records before export/render.
function graphDeleteCommit(op){
  graphDeletePruneOrphanTransitions(op);
  graphDeleteValidate(op);
  if(typeof normaliseOperationStepEndpoints==='function')normaliseOperationStepEndpoints(op);
  op._graphEdit=true;currentRecipeData._structuralEdit=true;
}

// Stage 7H.16 — deleting a Phase after a nested join removes only that Phase.
// Example: Simple11 #41. The nested fork and every nested lane remain intact;
// its convergence is simply retargeted to the outer join target.
function graphDeletePostNestedPhase(op,id){
 // Native AVEVA Simple12 -> Simple12a rule. A visible Phase immediately after
 // a nested join is deleted as a Phase, but its graph position remains an
 // Other/DUMMY connector. Both the nested and enclosing join Link groups are
 // intentionally untouched so later branch deletion remains valid.
 var node=graphDeleteEndpoint(op,id);if(!node||node._dummy===true)return {ok:false,reason:'The selected node is not a populated post-nested Phase.'};
 var touching=(op.links||[]).filter(function(l){return (l.to_type==='Step'&&l.to_re_id===id)||(l.from_type==='Step'&&l.from_re_id===id);});
 var incoming=touching.filter(function(l){return l.to_re_id===id&&(l.type==='ParallelConvergent'||l.type==='SerialConvergent');});
 var outgoing=touching.filter(function(l){return l.from_re_id===id&&(l.type==='ParallelConvergent'||l.type==='SerialConvergent');});
 if(!incoming.length||outgoing.length!==1||touching.length!==incoming.length+1)return {ok:false,reason:'The selected Phase is not directly after a nested join.'};
 var index=op.phases.indexOf(node);if(index<0)return {ok:false,reason:'The selected Phase is absent from the canonical node list.'};
 op.phases[index]={_reId:String(id),node_id:String(id),label:'',phase_type:'Dummy',parent_instance:'',description:'',_label:'',params:[],_dummy:true,_postNestedConnector:true};
 graphDeleteCommit(op);return {ok:true,mode:'post-nested-phase-to-dummy'};
}
// Final canonical delete dispatch: single-node semantics take precedence over
// any branch that happens to be before/after the selected Phase.
function graphDeleteSelectedNode(u,o,id){
 var op=graphDeleteOp(u,o);if(!op)return {ok:false,reason:'The operation is no longer available.'};
 var linear=graphDeleteLinearNode(op,id);if(linear.ok)return linear;
 var postNested=graphDeletePostNestedPhase(op,id);if(postNested.ok)return postNested;
 var outerExit=graphDeleteOuterLaneExit(op,id);if(outerExit.ok)return outerExit;
 var directEmptyLane=graphDeleteDirectEmptyLaneToDummy(op,id);if(directEmptyLane.ok)return directEmptyLane;
 var regions=typeof collectReadOnlyBranchRegions==='function'?collectReadOnlyBranchRegions(op):[];
 for(var r=0;r<regions.length;r++)for(var l=0;l<regions[r].lanes.length;l++){
   if(regions[r].lanes[l].phases.indexOf(id)<0)continue;
   var emptyLane=graphDeleteSoleLanePhaseToDummy(op,regions[r],l,id);if(emptyLane.ok)return emptyLane;
   return graphDeleteLane(op,regions[r],l);
 }
 return linear;
}
