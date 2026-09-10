// ============================================================================
// branch-create.js - Stage 4B: WQE-aligned blank N-way branch lanes
// ============================================================================
// AVEVA represents an empty lane as RecipeElementType Other, OtherValue DUMMY.
// Stage 4B creates a complete closed N-way branch of those DUMMY slots, then
// permits a Phase/Transfer to replace a selected slot or follow a selected
// branch phase. All graph routing is by RecipeElement ID, never display label.

var branchCreateCtx=null;

function branchCreatePhaseId(phase){return phase&&(phase._reId||phase.node_id)||'';}
function branchCreateLetter(index){var label='';do{label=String.fromCharCode(65+(index%26))+label;index=Math.floor(index/26)-1;}while(index>=0);return label;}

function branchCreateEndpointExists(op,id){
  if(!id)return false;
  if(op&&((op._beginReId===id)||(op._endReId===id)))return true;
  return ((op&&op.phases)||[]).some(function(phase){return branchCreatePhaseId(phase)===id;});
}

function branchCreateEligibility(op,anchorId){
  if(!op||!anchorId)return {ok:false,reason:'Select a phase first.'};
  var phases=(op.phases||[]),links=(op.links||[]),phaseIds={};
  phases.forEach(function(phase){var id=branchCreatePhaseId(phase);if(id)phaseIds[id]=true;});
  if(!phaseIds[anchorId])return {ok:false,reason:'The selected phase is not in this operation.'};
  if(!op._beginReId||!op._endReId)return {ok:false,reason:'The operation has no usable Begin/End boundaries.'};
  if(!links.length)return {ok:false,reason:'The operation has no ProcedureLogic links.'};

  // Creation starts only from one complete, direct control path. Existing
  // branches, transitions, loops, decisions and ambiguous links are deferred.
  for(var i=0;i<links.length;i++){
    var link=links[i];
    if(link.type!=='ControlLink'||link.from_type!=='Step'||link.to_type!=='Step'||!link.from_re_id||!link.to_re_id){
      return {ok:false,reason:'Branch creation is available only in a fully linear operation.'};
    }
    if(!branchCreateEndpointExists(op,link.from_re_id)||!branchCreateEndpointExists(op,link.to_re_id)){
      return {ok:false,reason:'The operation contains a link with an unknown endpoint.'};
    }
  }
  var incoming={},outgoing={};
  links.forEach(function(link){incoming[link.to_re_id]=(incoming[link.to_re_id]||0)+1;outgoing[link.from_re_id]=(outgoing[link.from_re_id]||0)+1;});
  var allIds=[op._beginReId].concat(Object.keys(phaseIds)).concat([op._endReId]);
  for(var p=0;p<allIds.length;p++){
    var id=allIds[p],expectedIn=id===op._beginReId?0:1,expectedOut=id===op._endReId?0:1;
    if((incoming[id]||0)!==expectedIn||(outgoing[id]||0)!==expectedOut)return {ok:false,reason:'The operation is not one unambiguous linear path.'};
  }
  if(links.length!==phases.length+1)return {ok:false,reason:'The operation is not one complete linear path.'};
  var anchorOutgoing=links.filter(function(link){return link.from_re_id===anchorId;});
  if(anchorOutgoing.length!==1)return {ok:false,reason:'The selected phase has no unique linear successor.'};
  var successor=anchorOutgoing[0];
  if(successor.to_type!=='Step'||!branchCreateEndpointExists(op,successor.to_re_id))return {ok:false,reason:'The selected phase does not lead to a valid Step successor.'};
  return {ok:true,outgoing:successor,successorId:successor.to_re_id};
}

function branchCreateStepLink(type,fromPhase,toLabel,toId,toReId){
  return {type:type,from:fromPhase.label||fromPhase._reId,from_id:'',from_node:fromPhase._reId,from_re_id:fromPhase._reId,from_type:'Step',to:toLabel||'',to_id:toId||'',to_node:toReId||'',to_re_id:toReId||'',to_type:'Step'};
}

function newBranchDummy(){
  var id=allocateRecipeElementId();
  return {_reId:id,node_id:id,label:'',phase_type:'Dummy',parent_instance:'',description:'',params:[],_dummy:true};
}


// Ensure every Step endpoint carries its RecipeElement identity before save.
// New branches must never depend on display labels for graph routing.
function normaliseOperationStepEndpoints(op){
 var byLabel={},known={};if(!op)return;
 [op._beginReId,op._endReId].forEach(function(id){if(id)known[String(id)]=true;});
 (op.phases||[]).forEach(function(phase){var id=branchCreatePhaseId(phase);if(id){known[String(id)]=true;if(phase.label)byLabel[phase.label]=id;}});
 (op.links||[]).forEach(function(link){['from','to'].forEach(function(side){
  if(link[side+'_type']!=='Step')return;var rid=link[side+'_re_id']||link[side+'_node']||'';
  if(!rid){var label=link[side]||'';if(label==='Begin')rid=op._beginReId||'';else if(label==='End')rid=op._endReId||'';else if(byLabel[label])rid=byLabel[label];}
  if(rid&&known[String(rid)]){link[side+'_re_id']=String(rid);link[side+'_node']=String(rid);}
 });});
}

function createClosedBlankBranchAfter(op,anchorId,mode,laneCount){
  var eligibility=branchCreateEligibility(op,anchorId);
  if(!eligibility.ok)return eligibility;
  if(mode!=='All'&&mode!=='Single')return {ok:false,reason:'Choose All or Single execution.'};
  laneCount=parseInt(laneCount,10);
  if(!laneCount||laneCount<2)return {ok:false,reason:'A branch needs at least two lanes.'};
  var anchor=null,anchorIndex=-1;
  for(var i=0;i<op.phases.length;i++)if(branchCreatePhaseId(op.phases[i])===anchorId){anchor=op.phases[i];anchorIndex=i;break;}
  if(!anchor||anchorIndex<0)return {ok:false,reason:'The branch anchor could not be found.'};

  var dummies=[];
  for(var lane=0;lane<laneCount;lane++)dummies.push(newBranchDummy());
  var old=eligibility.outgoing;
  var forkType=mode==='All'?'ParallelDivergent':'SerialDivergent';
  var joinType=mode==='All'?'ParallelConvergent':'SerialConvergent';
  var additions=[];
  dummies.forEach(function(dummy){additions.push(branchCreateStepLink(forkType,anchor,'', '',dummy._reId));});
  dummies.forEach(function(dummy){additions.push(branchCreateStepLink(joinType,dummy,old.to,old.to_id,old.to_re_id));});

  // One commit: replacing the original direct edge with a complete closed graph.
  op.links=op.links.filter(function(link){return link!==old;}).concat(additions);
  op.phases.splice.apply(op.phases,[anchorIndex+1,0].concat(dummies));
  normaliseOperationStepEndpoints(op);op._graphEdit=true;
  return {ok:true,mode:mode,laneCount:laneCount,anchorId:anchorId,successorId:old.to_re_id,dummyIds:dummies.map(branchCreatePhaseId)};
}

function branchLaneReference(op,phaseId){
  var regions=typeof collectReadOnlyBranchRegions==='function'?collectReadOnlyBranchRegions(op):[];
  for(var regionIndex=0;regionIndex<regions.length;regionIndex++){
    var region=regions[regionIndex];
    for(var laneIndex=0;laneIndex<region.lanes.length;laneIndex++){
      var lane=region.lanes[laneIndex],phaseIndex=lane.phases.indexOf(phaseId);
      if(phaseIndex>=0)return {region:region,regionIndex:regionIndex,lane:lane,laneIndex:laneIndex,phaseIndex:phaseIndex};
    }
  }
  return null;
}

function branchLanePhase(op,phaseId){
  phaseId=phaseId===undefined||phaseId===null?'':String(phaseId);
  for(var i=0;i<(op.phases||[]).length;i++)if(branchCreatePhaseId(op.phases[i])===phaseId)return {phase:op.phases[i],index:i};
  return null;
}

function branchLaneMenuHtml(u,o,phaseId){
  var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],found=branchLanePhase(op,phaseId),ref=op&&branchLaneReference(op,phaseId);
  if(!found||!ref)return '';
  var label=found.phase._dummy?'Add to empty Branch '+ref.lane.label:'Add after Branch '+ref.lane.label+' item';
  return '<div class="act-more" onclick="toggleDD(this,event)"><button class="act-more-btn">⋮</button><div class="dropdown">'
    +'<div class="dd-label">'+label+'</div>'
    +'<div class="dd-item" onclick="startBranchLaneAdd('+u+','+o+',\''+phaseId+'\',\'Process\')">Insert Process Phase after this node</div>'
    +'<div class="dd-item" onclick="startBranchLaneAdd('+u+','+o+',\''+phaseId+'\',\'Transfer\')">Insert Transfer after this node</div>'
    +'<div class="dd-item" onclick="startBranchLaneAdd('+u+','+o+',\''+phaseId+'\',\'AllocateProcess\')">Insert Allocate Process after this node</div>'
    +'<div class="dd-item" onclick="startBranchLaneAdd('+u+','+o+',\''+phaseId+'\',\'ReleaseProcess\')">Insert Release Process after this node</div>'
    +'<div class="dd-item" onclick="startBranchLaneAdd('+u+','+o+',\''+phaseId+'\',\'AllocateTransfer\')">Insert Allocate Transfer after this node</div>'
    +'<div class="dd-item" onclick="startBranchLaneAdd('+u+','+o+',\''+phaseId+'\',\'ReleaseTransfer\')">Insert Release Transfer after this node</div>'
    +'</div></div>';
}

function startBranchLaneAdd(u,o,phaseId,type){
  var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o];
  if(!op||!branchLaneReference(op,phaseId)||typeof showPhasePicker!=='function')return;
  showPhasePicker(u,o,-1,type,phaseId);
}

function branchSetEndpoint(link,side,phase){
  var id=branchCreatePhaseId(phase);
  if(side==='from'){link.from=phase.label||id;link.from_id='';link.from_node=id;link.from_re_id=id;link.from_type='Step';}
  else{link.to=phase.label||id;link.to_id='';link.to_node=id;link.to_re_id=id;link.to_type='Step';}
}

function insertPhaseIntoBranchLane(op,targetId,newPhase){
  var ref=branchLaneReference(op,targetId),target=branchLanePhase(op,targetId);
  if(!ref||!target||!newPhase)return {ok:false,reason:'Select a valid branch lane item.'};

  // The AVEVA DUMMY slot is intentionally replaced in place. Its RecipeElement
  // and Step identity stay stable; only Other:DUMMY becomes a Phase.
  if(target.phase._dummy===true&&target.phase.phase_type==='Dummy'){
    newPhase._reId=targetId;
    newPhase.node_id=targetId;
    newPhase._replaceDummy=true;
    target.phase=newPhase;
    op.phases[target.index]=newPhase;
    op._graphEdit=true;
    return {ok:true,action:'replace-dummy',phaseId:targetId};
  }

  var links=op.links||[],nextId=ref.lane.phases[ref.phaseIndex+1]||'',outgoing=null;
  if(nextId){
    outgoing=links.filter(function(link){return link.type==='ControlLink'&&link.from_type==='Step'&&link.to_type==='Step'&&link.from_re_id===targetId&&link.to_re_id===nextId;})[0];
    if(!outgoing)return {ok:false,reason:'The selected branch item has no direct lane successor.'};
    branchSetEndpoint(outgoing,'to',newPhase);
    links.push(branchCreateStepLink('ControlLink',target.phase,newPhase.label,'',newPhase._reId));
  }else{
    outgoing=links.filter(function(link){return link.type===ref.region.joinType&&link.from_type==='Step'&&link.to_type==='Step'&&link.from_re_id===targetId&&link.to_re_id===ref.region.joinTarget;})[0];
    if(!outgoing)return {ok:false,reason:'The selected branch exit has no matching convergent link.'};
    branchSetEndpoint(outgoing,'from',newPhase);
    links.push(branchCreateStepLink('ControlLink',target.phase,newPhase.label,'',newPhase._reId));
  }
  op.phases.splice(target.index+1,0,newPhase);
  op._graphEdit=true;
  return {ok:true,action:'insert-after',phaseId:newPhase._reId};
}

function showBranchCreateDialog(u,o,p){
  var up=currentRecipeData&&currentRecipeData.unit_procedures[u],op=up&&up.operations[o],anchor=op&&op.phases[p],eligibility=branchCreateEligibility(op,branchCreatePhaseId(anchor));
  if(!eligibility.ok){console.warn('Branch creation not offered:',eligibility.reason);return;}
  branchCreateCtx={u:u,o:o,p:p,anchorId:branchCreatePhaseId(anchor),nodeBranch:true};
  document.getElementById('branchCreateAnchor').textContent='After '+(anchor.label||branchCreateCtx.anchorId)+'; blank lanes will join before '+branchCreateSuccessorName(op,eligibility.successorId)+'.';
  document.getElementById('branchCreateError').textContent='';
  document.getElementById('branchCreateCount').value='2';
  document.querySelector('input[name="branchCreateMode"][value="All"]').checked=true;
  renderBranchCreateLanes();
  document.getElementById('branchCreateOverlay').style.display='block';
  document.getElementById('branchCreateDialog').style.display='block';
}

function branchCreateSuccessorName(op,id){
  if(op&&id===op._endReId)return 'End';
  var found=branchLanePhase(op,id);
  return found&&found.phase.label||id||'the original successor';
}

function renderBranchCreateLanes(){
  if(!branchCreateCtx)return;
  var count=Math.max(2,parseInt(document.getElementById('branchCreateCount').value,10)||2),h='';
  document.getElementById('branchCreateCount').value=String(count);
  for(var lane=0;lane<count;lane++)h+='<div class="branch-create-lane"><span>Lane '+branchCreateLetter(lane)+'</span><span class="branch-create-empty">Empty AVEVA DUMMY slot</span></div>';
  document.getElementById('branchCreateLanes').innerHTML=h;
}

function confirmBranchCreate(){
  if(!branchCreateCtx)return;
  var op=currentRecipeData&&currentRecipeData.unit_procedures[branchCreateCtx.u]&&currentRecipeData.unit_procedures[branchCreateCtx.u].operations[branchCreateCtx.o];
  var selected=document.querySelector('input[name="branchCreateMode"]:checked'),mode=selected?selected.value:'',count=parseInt(document.getElementById('branchCreateCount').value,10),error=document.getElementById('branchCreateError');
  var result;if(branchCreateCtx.joinBranch){var continuation=typeof joinCreateContinuation==='function'?joinCreateContinuation(op,branchCreateCtx.joinFork):{ok:false,reason:'Join continuation creation is unavailable.'};result=continuation.ok?createBranchAfterNode(op,continuation.continuationId,mode,count):continuation;}else result=branchCreateCtx.transitionBranch?createBranchAfterTransition(op,branchCreateCtx.transitionId,mode,count):createBranchAfterNode(op,branchCreateCtx.anchorId,mode,count);
  if(!result.ok){error.textContent=result.reason;return;}
  currentRecipeData._structuralEdit=true;
  cancelBranchCreateDialog();
  renderAll();
}

function cancelBranchCreateDialog(){
  var overlay=document.getElementById('branchCreateOverlay'),dialog=document.getElementById('branchCreateDialog');
  if(overlay)overlay.style.display='none';
  if(dialog)dialog.style.display='none';
  branchCreateCtx=null;
}


// Stage 6I — one insertion primitive for every selectable RecipeElement node.
// It does not classify the node by lane, fork, join or nesting level.
function nodeOutgoingStepLinks(op,nodeId){/* A Phase may be immediately before a fork. Inserting after it moves its divergent links to the new node, retaining the native graph as source -> new node -> fork. */return ((op&&op.links)||[]).filter(function(link){return link.from_type==='Step'&&String(link.from_re_id)===String(nodeId)&&link.to_type==='Step'&&link.to_re_id&&(link.type==='ControlLink'||link.type==='ParallelDivergent'||link.type==='SerialDivergent'||link.type==='ParallelConvergent'||link.type==='SerialConvergent');});}
function insertItemAfterNode(op,nodeId,newPhase){
  var selected=branchLanePhase(op,nodeId);if(!selected||!newPhase)return {ok:false,reason:'Select a valid RecipeElement node.'};
  var outgoing=nodeOutgoingStepLinks(op,nodeId);if(!outgoing.length)return {ok:false,reason:'The selected node has no outgoing Step link.'};
  // AVEVA DUMMY is an empty selectable RecipeElement, not an insertion anchor.
  // Its first added item replaces it in place, retaining the same ID and every
  // existing outgoing edge. The replacement therefore remains the editable node.
  if(selected.phase._dummy===true&&selected.phase.phase_type==='Dummy'){
    newPhase._reId=nodeId;newPhase.node_id=nodeId;newPhase._replaceDummy=true;
    op.phases[selected.index]=newPhase;normaliseOperationStepEndpoints(op);op._graphEdit=true;
    return {ok:true,action:'replace-dummy-node',nodeId:nodeId,phaseId:nodeId,outgoingCount:outgoing.length};
  }
  // A populated node receives a new node after it. Preserve each original edge
  // type/destination by moving its source to the new item.
  outgoing.forEach(function(link){branchSetEndpoint(link,'from',newPhase);});
  op.links.push(branchCreateStepLink('ControlLink',selected.phase,newPhase.label,'',newPhase._reId));
  op.phases.splice(selected.index+1,0,newPhase);normaliseOperationStepEndpoints(op);op._graphEdit=true;
  return {ok:true,action:'insert-after-node',nodeId:nodeId,phaseId:newPhase._reId,outgoingCount:outgoing.length};
}
function startNodeAdd(u,o,nodeId,type){
  var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o];
  if(!op||!branchLanePhase(op,nodeId)||typeof showPhasePicker!=='function')return;
  showPhasePicker(u,o,-1,type,nodeId);
}


// Stage 6R — AVEVA branch-at-node topology, matched to nests3.xml.
// The selected node is the divergent source. New lanes converge to an explicit
// DUMMY connector, which inherits the selected node's original outgoing links.
function branchAfterNodeEligibility(op,nodeId){
  nodeId=nodeId===undefined||nodeId===null?'':String(nodeId);
  var selected=branchLanePhase(op,nodeId);if(!selected)return {ok:false,reason:'Select a valid RecipeElement node.'};
  var outgoing=nodeOutgoingStepLinks(op,nodeId);if(!outgoing.length)return {ok:false,reason:'The selected node has no outgoing Step link.'};
  return {ok:true,selected:selected,outgoing:outgoing};
}
function createBranchAfterNode(op,nodeId,mode,laneCount){
  nodeId=nodeId===undefined||nodeId===null?'':String(nodeId);
  var e=branchAfterNodeEligibility(op,nodeId);if(!e.ok)return e;
  if(mode!=='All'&&mode!=='Single')return {ok:false,reason:'Choose All or Single execution.'};
  laneCount=parseInt(laneCount,10);if(!laneCount||laneCount<2)return {ok:false,reason:'A branch needs at least two lanes.'};
  var forkType=mode==='All'?'ParallelDivergent':'SerialDivergent',joinType=mode==='All'?'ParallelConvergent':'SerialConvergent',old=e.outgoing.slice(),lanes=[],additions=[];
  for(var i=0;i<laneCount;i++)lanes.push(newBranchDummy());
  // simple2: the old route was ControlLink to End, so lane exits converge direct to End.
  var directToEnd=old.length===1&&old[0].type==='ControlLink'&&String(old[0].to_re_id)===String(op._endReId),rejoin=null;
  if(!directToEnd){
    // simple4: old route is the parent/outer convergence. Nested lanes first
    // converge to one DUMMY rejoin; that rejoin then replaces the old source.
    rejoin=newBranchDummy();rejoin._branchRejoinNode=true;
  }
  lanes.forEach(function(lane){
    additions.push(branchCreateStepLink(forkType,e.selected.phase,'','',lane._reId));
    if(rejoin)additions.push(branchCreateStepLink(joinType,lane,'','',rejoin._reId));
    else old.forEach(function(link){additions.push(branchCreateStepLink(joinType,lane,link.to,link.to_id,link.to_re_id));});
  });
  if(rejoin)old.forEach(function(link){branchSetEndpoint(link,'from',rejoin);});
  else op.links=op.links.filter(function(link){return old.indexOf(link)<0;});
  op.links=op.links.concat(additions);
  var insert=[].concat(lanes);if(rejoin)insert.push(rejoin);
  op.phases.splice.apply(op.phases,[e.selected.index+1,0].concat(insert));
  if(typeof normaliseOperationStepEndpoints==='function')normaliseOperationStepEndpoints(op);
  op._graphEdit=true;
  return {ok:true,action:directToEnd?'create-simple2-branch':'create-simple4-nested-branch',nodeId:nodeId,laneIds:lanes.map(branchCreatePhaseId),rejoinId:rejoin?rejoin._reId:'',mode:mode,laneCount:laneCount};
}

function showBranchAfterNodeDialog(u,o,nodeId){
  nodeId=nodeId===undefined||nodeId===null?'':String(nodeId);
  var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],e=branchAfterNodeEligibility(op,nodeId);
  if(!e.ok){console.warn('Branch creation not offered:',e.reason);return;}
  branchCreateCtx={u:u,o:o,anchorId:nodeId,nodeBranch:true};
  document.getElementById('branchCreateAnchor').textContent='After '+(e.selected.phase.label||nodeId)+'; new lanes converge into the original route.';
  document.getElementById('branchCreateError').textContent='';document.getElementById('branchCreateCount').value='2';document.querySelector('input[name="branchCreateMode"][value="All"]').checked=true;renderBranchCreateLanes();document.getElementById('branchCreateOverlay').style.display='block';document.getElementById('branchCreateDialog').style.display='block';
}


// Stage 6V.1 — the same AVEVA branch topology is valid after a Transition.
// The Transition remains the divergent source; lane DUMMYs converge to an
// explicit connector which inherits the Transition's former normal exit(s).
function transitionBranchStepLink(type,tid,toReId){return {type:type,from:'TRANS:'+tid,from_id:tid,from_node:'',from_re_id:'',from_type:'Transition',to:'',to_id:'',to_node:toReId,to_re_id:toReId,to_type:'Step'};}
function branchAfterTransitionEligibility(op,tid){
 if(!op||!tid)return {ok:false,reason:'Select a valid Transition.'};
 var exits=((op.links||[]).filter(function(link){return link.from_type==='Transition'&&link.from_id===tid&&link.type!=='Other'&&link.to_type==='Step'&&link.to_re_id;}));
 if(!exits.length)return {ok:false,reason:'The Transition has no onward Step exit.'};
 return {ok:true,outgoing:exits};
}
function createBranchAfterTransition(op,tid,mode,laneCount){
 var e=branchAfterTransitionEligibility(op,tid);if(!e.ok)return e;
 if(mode!=='All'&&mode!=='Single')return {ok:false,reason:'Choose All or Single execution.'};laneCount=parseInt(laneCount,10);if(!laneCount||laneCount<2)return {ok:false,reason:'A branch needs at least two lanes.'};
 var forkType=mode==='All'?'ParallelDivergent':'SerialDivergent',joinType=mode==='All'?'ParallelConvergent':'SerialConvergent',lanes=[],connector=newBranchDummy(),additions=[];connector._branchJoinConnector=true;
 for(var i=0;i<laneCount;i++)lanes.push(newBranchDummy());
 lanes.forEach(function(lane){additions.push(transitionBranchStepLink(forkType,tid,lane._reId));additions.push(branchCreateStepLink(joinType,lane,'','',connector._reId));});
 e.outgoing.forEach(function(link){branchSetEndpoint(link,'from',connector);});op.links=op.links.concat(additions);op.phases.push.apply(op.phases,lanes.concat([connector]));op._graphEdit=true;
 return {ok:true,action:'create-branch-after-transition',transitionId:tid,mode:mode,laneCount:laneCount,laneIds:lanes.map(branchCreatePhaseId),connectorId:connector._reId,outgoingCount:e.outgoing.length};
}
function showBranchAfterTransitionDialog(u,o,tid){
 var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],e=branchAfterTransitionEligibility(op,tid);if(!e.ok){console.warn('Transition branch creation not offered:',e.reason);return;}
 branchCreateCtx={u:u,o:o,transitionId:tid,transitionBranch:true};document.getElementById('branchCreateAnchor').textContent='After Transition #'+tid+'; new lanes converge into the Transition’s original exit route.';document.getElementById('branchCreateError').textContent='';document.getElementById('branchCreateCount').value='2';document.querySelector('input[name="branchCreateMode"][value="All"]').checked=true;renderBranchCreateLanes();document.getElementById('branchCreateOverlay').style.display='block';document.getElementById('branchCreateDialog').style.display='block';
}
