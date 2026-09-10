// ============================================================================
// lane-movement.js - safe, ID-based phase movement inside one graph lane
// ============================================================================
// This module never infers a lane from op.phases array order or phase labels.
// A move exists only for two adjacent Phase RecipeElements joined by one direct
// ControlLink in the same detected branch lane (or the same non-branch linear
// lane). The swap rewires the three existing Step edges around the pair:
//
//     predecessor -> first -> second -> successor
// becomes
//     predecessor -> second -> first -> successor
//
// The predecessor/successor may be a divergent/convergent branch edge, which
// keeps the phase inside its own lane. Transitions, loops, decision edges,
// nesting and ambiguous endpoints are rejected, so the UI hides that arrow.

function movementPhaseId(phase){
  return phase && (phase._reId || phase.node_id) || '';
}

function movementUnique(values){
  return values.filter(function(value,index){return value && values.indexOf(value)===index;});
}

function movementPhaseMap(op){
  var result={};
  ((op&&op.phases)||[]).forEach(function(phase){
    var id=movementPhaseId(phase);
    if(id)result[id]=phase;
  });
  return result;
}

function movementDirectControls(op){
  return ((op&&op.links)||[]).filter(function(link){
    return link.type==='ControlLink' && link.from_type==='Step' && link.to_type==='Step' && link.from_re_id && link.to_re_id;
  });
}

function movementBranchMembership(op){
  var member={},laneByMember={};
  var regions=typeof collectReadOnlyBranchRegions==='function' ? collectReadOnlyBranchRegions(op) : [];
  regions.forEach(function(region,regionIndex){
    region.lanes.forEach(function(lane,laneIndex){
      lane.phases.forEach(function(id,phaseIndex){
        member[id]=true;
        laneByMember[id]={region:region,regionIndex:regionIndex,lane:lane,laneIndex:laneIndex,phaseIndex:phaseIndex};
      });
    });
  });
  return {member:member,laneByMember:laneByMember};
}

function laneMoveTarget(op,phaseId,direction){
  if(direction!==-1&&direction!==1)return '';
  var phases=movementPhaseMap(op);
  if(!phases[phaseId])return '';
  var branch=movementBranchMembership(op),branchRef=branch.laneByMember[phaseId];
  if(branchRef){
    var targetIndex=branchRef.phaseIndex+direction;
    if(targetIndex<0||targetIndex>=branchRef.lane.phases.length)return '';
    var target=branchRef.lane.phases[targetIndex];
    return phases[target] ? target : '';
  }

  // Outside a displayed branch, movement is available only through one direct
  // ControlLink to another non-branch phase. It cannot cross a fork or join.
  var controls=movementDirectControls(op),candidates=[];
  controls.forEach(function(link){
    var candidate=direction<0 ? (link.to_re_id===phaseId ? link.from_re_id : '') : (link.from_re_id===phaseId ? link.to_re_id : '');
    if(candidate&&phases[candidate]&&!branch.member[candidate])candidates.push(candidate);
  });
  candidates=movementUnique(candidates);
  return candidates.length===1 ? candidates[0] : '';
}

function laneMoveCapabilities(op,phaseId){
  var up=laneMoveTarget(op,phaseId,-1),down=laneMoveTarget(op,phaseId,1);
  // A geometric neighbour is not enough: hide the arrow unless the complete
  // three-edge swap is also safe for the current graph.
  if(up&&!laneMovementPlan(op,up,phaseId).ok)up='';
  if(down&&!laneMovementPlan(op,phaseId,down).ok)down='';
  return {up:up,down:down};
}

function movementAllowedIncomingType(type){
  return type==='ControlLink'||type==='ParallelDivergent'||type==='SerialDivergent';
}

function movementAllowedOutgoingType(type){
  return type==='ControlLink'||type==='ParallelConvergent'||type==='SerialConvergent';
}

function movementSetStepEndpoint(link,side,phase){
  var id=movementPhaseId(phase);
  if(side==='from'){
    link.from=phase.label||id;
    link.from_id='';
    link.from_node=id;
    link.from_re_id=id;
    link.from_type='Step';
  }else{
    link.to=phase.label||id;
    link.to_id='';
    link.to_node=id;
    link.to_re_id=id;
    link.to_type='Step';
  }
}

function laneMovementPlan(op,firstId,secondId){
  var phases=movementPhaseMap(op);
  if(!phases[firstId]||!phases[secondId])return {ok:false,reason:'The phase is not in this operation.'};
  if(laneMoveTarget(op,firstId,1)!==secondId||laneMoveTarget(op,secondId,-1)!==firstId){
    return {ok:false,reason:'The phases are not adjacent in one lane.'};
  }

  var links=(op&&op.links)||[];
  var middle=links.filter(function(link){
    return link.type==='ControlLink'&&link.from_type==='Step'&&link.to_type==='Step'&&link.from_re_id===firstId&&link.to_re_id===secondId;
  });
  var incoming=links.filter(function(link){return link.to_type==='Step'&&link.to_re_id===firstId;});
  var outgoing=links.filter(function(link){return link.from_type==='Step'&&link.from_re_id===secondId;});
  if(middle.length!==1||incoming.length!==1||outgoing.length!==1){
    return {ok:false,reason:'The lane boundary is ambiguous.'};
  }
  var inLink=incoming[0],middleLink=middle[0],outLink=outgoing[0];
  if(inLink===middleLink||outLink===middleLink||inLink===outLink){
    return {ok:false,reason:'The lane does not have a movable pair.'};
  }
  if(!movementAllowedIncomingType(inLink.type)||!movementAllowedOutgoingType(outLink.type)){
    return {ok:false,reason:'The move crosses an unsupported graph edge.'};
  }

  // No other link may touch either phase. This rejects loops, transitions,
  // decisions, nested branches and any additional incoming/outgoing edge.
  var permitted=[inLink,middleLink,outLink];
  var hasExtra=links.some(function(link){
    var touches=link.from_re_id===firstId||link.to_re_id===firstId||link.from_re_id===secondId||link.to_re_id===secondId;
    return touches&&permitted.indexOf(link)<0;
  });
  if(hasExtra)return {ok:false,reason:'The lane includes an unsupported additional link.'};

  return {ok:true,first:phases[firstId],second:phases[secondId],incoming:inLink,middle:middleLink,outgoing:outLink};
}

function movePhaseWithinLane(op,phaseId,direction){
  var targetId=laneMoveTarget(op,phaseId,direction);
  if(!targetId)return {ok:false,reason:'No lane-safe move exists in that direction.'};
  var firstId=direction<0?targetId:phaseId;
  var secondId=direction<0?phaseId:targetId;
  var plan=laneMovementPlan(op,firstId,secondId);
  if(!plan.ok)return plan;

  // Confirm document ordering can be updated before altering any graph edge.
  // It is presentation/order metadata only; links below remain authoritative.
  var firstIndex=-1,secondIndex=-1;
  for(var i=0;i<op.phases.length;i++){
    var id=movementPhaseId(op.phases[i]);
    if(id===movementPhaseId(plan.first))firstIndex=i;
    if(id===movementPhaseId(plan.second))secondIndex=i;
  }
  if(firstIndex<0||secondIndex<0)return {ok:false,reason:'The phase ordering could not be updated.'};

  movementSetStepEndpoint(plan.incoming,'to',plan.second);
  movementSetStepEndpoint(plan.middle,'from',plan.second);
  movementSetStepEndpoint(plan.middle,'to',plan.first);
  movementSetStepEndpoint(plan.outgoing,'from',plan.first);
  var hold=op.phases[firstIndex];op.phases[firstIndex]=op.phases[secondIndex];op.phases[secondIndex]=hold;
  op._graphEdit=true;
  return {ok:true,moved:phaseId,target:targetId};
}
