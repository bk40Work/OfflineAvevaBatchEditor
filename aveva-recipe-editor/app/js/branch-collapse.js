// ============================================================================
// branch-collapse.js - Stage 4C: remove one complete closed N-way branch
// ============================================================================
// Collapse means remove the full branch region (all lane Phases and DUMMYs)
// and restore its direct Step-to-Step route: fork source -> join target.
// It is intentionally unavailable for nested, partial, transition/loop, or
// otherwise ambiguous regions. All validation uses RecipeElement IDs.

function branchCollapsePhaseId(phase){return phase&&(phase._reId||phase.node_id)||'';}

function branchCollapseEndpoint(op,id){
  if(op&&id===op._beginReId)return {_reId:id,label:'Begin'};
  if(op&&id===op._endReId)return {_reId:id,label:'End'};
  for(var i=0;i<(op&&op.phases||[]).length;i++)if(branchCollapsePhaseId(op.phases[i])===id)return op.phases[i];
  return null;
}

function branchCollapseLink(type,fromPhase,toPhase){
  return {type:type,from:fromPhase.label||fromPhase._reId,from_id:'',from_node:fromPhase._reId,from_re_id:fromPhase._reId,from_type:'Step',to:toPhase.label||toPhase._reId,to_id:'',to_node:toPhase._reId,to_re_id:toPhase._reId,to_type:'Step'};
}

function branchCollapseRegion(op,forkSource){
  var regions=typeof collectReadOnlyBranchRegions==='function'?collectReadOnlyBranchRegions(op):[];
  for(var i=0;i<regions.length;i++)if(regions[i].forkSource===forkSource)return regions[i];
  return null;
}

function branchCollapseEligibility(op,forkSource){
  var region=branchCollapseRegion(op,forkSource);
  if(!region)return {ok:false,reason:'Closed branch region not found.'};
  var source=branchCollapseEndpoint(op,region.forkSource),target=branchCollapseEndpoint(op,region.joinTarget);
  if(!source||!target)return {ok:false,reason:'The branch boundary could not be resolved.'};
  if(!region.lanes||region.lanes.length<2)return {ok:false,reason:'A branch needs at least two lanes.'};

  var branchNodes={},expected=[];
  for(var laneIndex=0;laneIndex<region.lanes.length;laneIndex++){
    var lane=region.lanes[laneIndex];
    if(!lane.phases||!lane.phases.length)return {ok:false,reason:'A branch lane is empty or incomplete.'};
    for(var phaseIndex=0;phaseIndex<lane.phases.length;phaseIndex++){
      var id=lane.phases[phaseIndex],phase=branchCollapseEndpoint(op,id);
      if(!phase)return {ok:false,reason:'A branch lane node could not be resolved.'};
      branchNodes[id]=true;
      if(phaseIndex===0)expected.push({type:region.forkType,from:region.forkSource,to:id});
      if(phaseIndex<lane.phases.length-1)expected.push({type:'ControlLink',from:id,to:lane.phases[phaseIndex+1]});
      else expected.push({type:region.joinType,from:id,to:region.joinTarget});
    }
  }

  var links=(op&&op.links)||[];
  // Any Transition, loop, decision, nested edge or other link touching one
  // lane node invalidates collapse. It must not be silently discarded.
  var touchingLane=links.filter(function(link){return branchNodes[link.from_re_id]||branchNodes[link.to_re_id];});
  if(expected.length!==touchingLane.length)return {ok:false,reason:'The branch contains additional or unsupported links.'};

  var matched=[];
  for(var expectedIndex=0;expectedIndex<expected.length;expectedIndex++){
    var need=expected[expectedIndex];
    var candidates=links.filter(function(link){
      return link.type===need.type&&link.from_type==='Step'&&link.to_type==='Step'&&link.from_re_id===need.from&&link.to_re_id===need.to;
    });
    if(candidates.length!==1)return {ok:false,reason:'The branch graph is incomplete or ambiguous.'};
    matched.push(candidates[0]);
  }

  // The fork must send only this region's divergent links, and the join must
  // receive only this region's convergent links. This blocks a shared/nested edge.
  var sourceOutgoing=links.filter(function(link){return link.from_type==='Step'&&link.from_re_id===region.forkSource;});
  var targetIncoming=links.filter(function(link){return link.to_type==='Step'&&link.to_re_id===region.joinTarget;});
  var forkEdges=matched.filter(function(link){return link.type===region.forkType&&link.from_re_id===region.forkSource;});
  var joinEdges=matched.filter(function(link){return link.type===region.joinType&&link.to_re_id===region.joinTarget;});
  if(sourceOutgoing.length!==forkEdges.length||targetIncoming.length!==joinEdges.length){
    return {ok:false,reason:'The branch shares a fork or join boundary with another graph path.'};
  }

  return {ok:true,region:region,source:source,target:target,branchNodes:branchNodes,links:matched};
}

function collapseClosedBranch(op,forkSource){
  var eligibility=branchCollapseEligibility(op,forkSource);
  if(!eligibility.ok)return eligibility;
  var region=eligibility.region,removeLinks=eligibility.links,branchNodes=eligibility.branchNodes;
  // Commit only after every graph edge has passed the closed-region checks.
  op.links=op.links.filter(function(link){return removeLinks.indexOf(link)<0;});
  op.links.push(branchCollapseLink('ControlLink',eligibility.source,eligibility.target));
  op.phases=op.phases.filter(function(phase){return !branchNodes[branchCollapsePhaseId(phase)];});
  op._graphEdit=true;
  return {ok:true,mode:region.mode,laneCount:region.lanes.length,forkSource:region.forkSource,joinTarget:region.joinTarget,removedNodeIds:Object.keys(branchNodes)};
}

function requestBranchCollapse(u,o,forkSource){
  var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o];
  var eligibility=branchCollapseEligibility(op,forkSource);
  if(!eligibility.ok){console.warn('Branch removal not applied:',eligibility.reason);return;}
  var noun=eligibility.region.mode==='All'?'All / Parallel':'Single / Serial';
  var message='Remove this '+eligibility.laneCount+'-lane '+noun+' branch?\n\nAll branch lane items and empty slots will be removed, and the direct path to '+(eligibility.target.label||'the original successor')+' will be restored.';
  if(typeof confirm==='function'&&!confirm(message))return;
  var result=collapseClosedBranch(op,forkSource);
  if(!result.ok){console.warn('Branch removal not applied:',result.reason);return;}
  currentRecipeData._structuralEdit=true;
  renderAll();
}
