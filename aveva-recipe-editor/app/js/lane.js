function v1210aToggle(id,e){if(e)e.stopPropagation();var x=document.getElementById(id);if(x)x.classList.toggle('is-open');}
// ============================================================================
// lane.js - Lane View (3-column: Unit Procedures | Operations | Phases)
// CORRECTED: Matches your working list view structure (lowercase properties)
// ============================================================================

function laneBoundary(kind,title){return '<div class="lane-boundary lane-boundary-'+kind+'"><span class="lane-boundary-mark">'+(kind==='start'?'\u25B6':'\u25A0')+'</span><span>'+esc(kind==='start'?'Start: '+title:'End')+'</span></div>';}

function renderLaneView(){if(!currentRecipeData)return;var d=currentRecipeData;var u=laneSelectedUP;var h='';
  if(editMode){h+='<div style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right"><button class="act-btn" onclick="addFirstUP()">+ Add Unit Procedure</button></div>';}
  h+=laneBoundary('start',d.id||'Recipe');
  if(!d.unit_procedures.length){h+='<div style="color:#999;padding:12px;text-align:center">No unit procedures</div>';}
  for(var i=0;i<d.unit_procedures.length;i++){var up=d.unit_procedures[i];var tph=0;for(var oi=0;oi<up.operations.length;oi++)tph+=up.operations[oi].phases.length;
    h+='<div class="lane-arrow">\u25BC</div>';
    h+='<div class="lane-item'+(i===u?' selected':'')+'" onclick="selectLaneUP('+i+')">';
    h+='<div style="display:flex;justify-content:space-between;align-items:center">';
    h+='<div><span class="li-num">'+(i+1)+'.</span><span class="li-name'+(editMode?' editable':'')+'"'+(editMode?' onclick="event.stopPropagation();editUPName('+i+',this)"':'')+'>'+esc(up.name)+'</span>';
    if(editMode){var requirements=equipmentRequirements();h+='<select class="li-tag" onclick="event.stopPropagation()" onchange="updUPProcess('+i+',this.value)">';requirements.forEach(function(req){var processClass=req.id||req.process||'';h+='<optgroup label="'+esc(processClass)+'">';requirementInstances(req).forEach(function(instance){h+='<option value="'+esc(instance.name)+'"'+(instance.name===up.process?' selected':'')+'>'+esc(instance.name)+'</option>';});h+='</optgroup>';});h+='</select>';}else h+='<span class="li-tag">'+esc(up.process)+'</span>';
    h+='</div>';
    h+='<div style="display:flex;align-items:center;gap:2px">';
    h+='<span class="li-meta">'+up.operations.length+'op/'+tph+'ph</span>';
    if(editMode){h+='<div class="act-bar" style="display:inline-flex" onclick="event.stopPropagation()"><button class="act-btn" onclick="event.stopPropagation();moveUP('+i+',-1)">\u25B2</button><button class="act-btn" onclick="event.stopPropagation();moveUP('+i+',1)">\u25BC</button><button class="act-btn danger" onclick="removeUP('+i+')">\u2716</button><button class="act-btn" onclick="addOp('+i+')">+ Op</button></div>'}
    h+='</div></div></div>'}
  h+='<div class="lane-arrow">\u25BC</div>'+laneBoundary('end','');
  document.getElementById('laneUPList').innerHTML=h;renderLaneOps()}

// Select a Unit Procedure in lane view and reset the operation selection.
function selectLaneUP(i){
  laneSelectedUP=i;
  laneSelectedOp=0;
  renderLaneView();
}

function renderLaneOps(){
  if(!currentRecipeData||!currentRecipeData.unit_procedures||laneSelectedUP<0||laneSelectedUP>=currentRecipeData.unit_procedures.length){
    document.getElementById('laneOpList').innerHTML='';
    document.getElementById('lanePhList').innerHTML='';
    return;
  }
  var up=currentRecipeData.unit_procedures[laneSelectedUP];var u=laneSelectedUP;var h=laneBoundary('start',up.name||'Unit Procedure');
  if(!up.operations.length){h+='<div style="color:#999;padding:12px;text-align:center">No operations</div>';}
  for(var o=0;o<up.operations.length;o++){var op=up.operations[o],opReadOnly=isReadOnlyBranchOperation(op);
    h+='<div class="lane-arrow">▼</div>';
    h+='<div class="lane-item'+(o===laneSelectedOp?' selected':'')+'" onclick="selectLaneOp('+o+')">';
    h+='<div style="display:flex;justify-content:space-between;align-items:center">';
    h+='<span class="li-name'+(editMode?' editable':'')+'"'+(editMode?' onclick="event.stopPropagation();editOpName('+u+','+o+',this)"':'')+'>'+esc(op.name)+'</span>';
    h+='<div style="display:flex;align-items:center;gap:4px">';
    h+='<span class="li-meta">'+op.phases.length+'ph</span>';
    if(opReadOnly)h+='<span class="lane-readonly-tag">Branch lanes</span>';
    if(editMode)h+='<div class="act-bar" style="display:inline-flex" onclick="event.stopPropagation()"><button class="act-btn" onclick="moveOp('+u+','+o+',-1)">▲</button><button class="act-btn" onclick="moveOp('+u+','+o+',1)">▼</button>'+ddOp(u,o)+'</div>';
    h+='</div></div></div>'}
  h+='<div class="lane-arrow">▼</div>'+laneBoundary('end','');
  document.getElementById('laneOpList').innerHTML=h;renderLanePhases()}


function selectLaneOp(o){laneSelectedOp=o;renderLaneOps()}

function buildLanePhaseHtml(ph,up,u,o,pi,transAfter,loopBacks,readOnly,moveState,suppressTransitions){
  if(ph&&ph._dummy)return buildLaneDummyHtml(ph,up,u,o,pi,suppressTransitions);
  var graphId=laneNodeKey(ph);
  var h=(typeof graphMoveDropHtml==='function'?graphMoveDropHtml(u,o,graphId):'');
  var isX=ph.phase_type==='Transfer';
  var isA=(ph.phase_type||'').indexOf('Allocate')>=0||(ph.phase_type||'').indexOf('Release')>=0;
  var cls='lane-ph';if(isA)cls+=' alloc';else if(isX)cls+=' xfer';
  h+='<div class="'+cls+' graph-move-card" data-node-id="'+esc(graphId)+'">';
  h+='<div class="v1210a-card-head">';
  if(editMode)h+='<span class="graph-drag-handle" draggable="false" data-phase-u="'+u+'" data-phase-o="'+o+'" data-phase-id="'+esc(graphId)+'" title="Hold and drag Phase to a highlighted graph boundary">⠿</span>';
  h+='<div class="lph-name v1210a-title">'+esc(ph.label||'(unnamed)')+(isX?'<span class="lph-badge" style="background:#e8eaf6;color:#36398E">XFER</span>':isA?'<span class="lph-badge" style="background:#f5f5f5;color:#777">'+(ph.phase_type.indexOf('Release')===0?'RELEASE':'ALLOC')+'</span>':'<span class="lph-badge" style="background:#e8f5e9;color:#009F3C">PROC</span>')+'<span class="node-id-badge" title="AVEVA RecipeElement ID">#'+esc(laneNodeKey(ph))+'</span></div>';
  if(editMode){var metaId='v1210aPhase_'+u+'_'+o+'_'+pi;h+='<div class="act-bar v1210a-actions"><button class="act-btn" title="Show or hide Name and Label" onclick="v1210aToggle(\''+metaId+'\',event)">?</button>'+(moveState&&moveState.up?'<button class="act-btn" title="Move earlier" onclick="movePh('+u+','+o+','+pi+',-1)">▲</button>':'')+(moveState&&moveState.down?'<button class="act-btn" title="Move later" onclick="movePh('+u+','+o+','+pi+',1)">▼</button>':'')+(!readOnly?(typeof ddPh==='function'?ddPh(u,o,pi):''):(typeof ddNode==='function'?ddNode(u,o,laneNodeKey(ph),'Node'):''))+'</div>';}
  h+='</div>';
  if(editMode)h+='<div id="'+metaId+'" class="lph-parent v1210a-meta">Name <input class="inline-edit" value="'+esc(ph.label||'')+'" onchange="updPhaseMeta('+u+','+o+','+pi+',\'label\',this.value)"> · Label <input class="inline-edit" value="'+esc(ph._label||'')+'" onchange="updPhaseMeta('+u+','+o+','+pi+',\'_label\',this.value)"></div>';
  if(ph.description){
    if(editMode&&!readOnly)h+='<div class="lph-desc editable" onclick="editPhDesc('+u+','+o+','+pi+',this)">'+ph.description+'</div>';
    else h+='<div class="lph-desc">'+ph.description+'</div>';
  } else if(editMode&&!readOnly){h+='<div class="lph-desc editable" onclick="editPhDesc('+u+','+o+','+pi+',this)" style="color:#ccc">+ description</div>'}
  if(ph.parent_instance&&(isA||ph.parent_instance!==up.process))h+='<div class="lph-parent">'+(isA?'Target: ':'↗ ')+esc(ph.parent_instance)+'</div>';
  if(ph.params&&ph.params.length){h+='<div class="lph-params">';
    for(var i=0;i<ph.params.length;i++){var p=ph.params[i]||{};
      var isMat=p.param_type==='ProcessInput'||p.material_id;
      var materialLabel=p.material_id?(matName(p.material_id)||p.material_id):'';
      var meta=[];
      if(p.param_type)meta.push(p.param_type);
      if(p.unit)meta.push(p.unit);
      if(p.description)meta.push(p.description);
      h+='<div class="lph-param'+(isMat?' is-material':'')+'">';
      h+='<div class="lph-param-head"><span class="pn">'+esc(p.name||'Unnamed parameter')+'</span>'+(meta.length?'<span class="lph-param-meta">'+esc(meta.join(' · '))+'</span>':'')+'</div>';
      if(isMat){
        if(editMode&&!readOnly){
          h+='<label class="lph-field-label">Material</label><div class="mat-ac"><input id="phMatAc_'+u+'_'+o+'_'+pi+'_'+i+'" value="'+esc(materialLabel)+'" onfocus="openPhMatAc('+u+','+o+','+pi+','+i+')" oninput="filterPhMatAc('+u+','+o+','+pi+','+i+',this.value)" onblur="setTimeout(function(){closePhMatAc()},200)" autocomplete="off" placeholder="material..."></div>';
        }else h+='<div class="lph-material">['+esc(materialLabel||'—')+']</div>';
      }
      if(editMode&&!readOnly)h+='<label class="lph-field-label">Value</label><input class="inline-edit lph-value-input" value="'+esc(p.value==null?'':String(p.value))+'" onchange="updPVal('+u+','+o+','+pi+','+i+',this.value)" placeholder="value">';
      else h+='<div class="lph-value">'+esc(p.value==null||p.value===''?'—':String(p.value))+'</div>';
      h+='</div>';
    }
    h+='</div>';
  }
  h+='</div>';
  // Transition is rendered as its own selectable card, not as metadata inside this node.
  if(!suppressTransitions)h+=typeof transitionNodesAfterStep==='function'?transitionNodesAfterStep(currentRecipeData.unit_procedures[u].operations[o],laneNodeKey(ph),u,o):'';
  return h;
}


function buildLaneDummyHtml(ph,up,u,o,pi,suppressTransitions){
  var id=laneNodeKey(ph),isEntry=!!ph._branchEntryConnector,isExit=!!ph._branchJoinConnector,currentOp=(currentRecipeData&&currentRecipeData.unit_procedures&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations&&currentRecipeData.unit_procedures[u].operations[o])||{links:[]},links=currentOp.links||[],isLoopReturn=links.some(function(link){return link.type==='Other'&&link.from_type==='Transition'&&link.to_type==='Step'&&link.to_re_id===id;}),returnTransition=(links.filter(function(link){return link.type==='Other'&&link.from_type==='Transition'&&link.to_type==='Step'&&link.to_re_id===id;})[0]||{}).from_id||'',isTransitionEntry=(links.some(function(link){return link.type==='ControlLink'&&link.from_type==='Step'&&link.from_re_id===id&&link.to_type==='Transition';})),title=isLoopReturn?'Loop return point':((isEntry||isTransitionEntry)?'Branch entry':(isExit?'Post-join continuation':'Empty branch lane')),help=isLoopReturn?'Fixed return anchor for Transition #'+returnTransition+'. This point is not draggable or directly editable.':(isTransitionEntry?'Retained Branch entry position. The following Transition may loop back here.':(isEntry?'Selectable branch-entry node. Add or nest items here.':(isExit?'Selectable post-join node. Add the next item here.':'Add the first Process Phase or Transfer here.'))),symbol=isLoopReturn?'↺':((isEntry||isTransitionEntry)?'⇣':(isExit?'⇢':'＋')),h='<div class="lane-dummy'+(isLoopReturn?' lane-loop-return':'')+'" data-node-id="'+esc(id)+'">';
  h+='<div class="lane-dummy-title"><span class="lane-dummy-symbol">'+symbol+'</span><span>'+title+'</span><span class="node-id-badge" title="AVEVA RecipeElement ID">#'+esc(id)+'</span></div>';
  h+='<div class="lane-dummy-help">'+help+'</div>';
  // An Other Link targeting this DUMMY is AVEVA's native loop-return signature.
  // It is a real XML node but is a fixed anchor, never an editable empty lane.
  if(!isLoopReturn&&editMode&&typeof ddNode==='function')h+='<div class="act-bar lane-dummy-actions">'+ddNode(u,o,id,title)+'</div>';
  else if(!isLoopReturn&&editMode&&typeof branchLaneMenuHtml==='function'){var fallbackMenu=branchLaneMenuHtml(u,o,id);if(fallbackMenu)h+='<div class="act-bar lane-dummy-actions">'+fallbackMenu+'</div>';}
  h+='</div>';return h+(!suppressTransitions&&typeof transitionNodesAfterStep==='function'?transitionNodesAfterStep(currentRecipeData.unit_procedures[u].operations[o],id,u,o):'');
}

// Preserve an AVEVA Transition that is directly after Begin when a formerly
// branched operation has become linear after deletion.
function laneInitialTransitionHtml(op,u,o){
  var link=((op&&op.links)||[]).filter(function(l){return l.type==='ControlLink'&&l.from_type==='Step'&&l.from_re_id===op._beginReId&&l.to_type==='Transition'&&l.to_id;})[0];
  return link&&typeof transitionNodeHtml==='function'?transitionNodeHtml(op,u,o,link.to_id):'';
}
function laneNodeKey(ph){return ph._reId||ph.node_id||ph.label;}

function lanePhaseById(op,id){
  for(var i=0;i<op.phases.length;i++)if(laneNodeKey(op.phases[i])===id)return {phase:op.phases[i],index:i};
  return null;
}

function laneBranchEndpointName(op,id){
  var found=lanePhaseById(op,id);
  if(found)return found.phase.label;
  if(op&&id===op._beginReId)return 'Begin';
  if(op&&id===op._endReId)return 'End';
  return id||'the branch endpoint';
}

function renderReadOnlyBranchRegion(region,op,up,u,o,transAfter,loopBacks){
  var isAll=region.mode==='All';
  var h='<section class="lane-branch lane-branch-readonly lane-branch-'+(isAll?'all':'single')+'" aria-label="Closed '+(isAll?'parallel':'serial')+' branch">';
  h+='<div class="lane-branch-fork"><span class="lane-branch-symbol">'+(isAll?'⇱':'◇')+'</span><span><strong>Fork</strong> · '+(isAll?'Parallel branches · <strong>All</strong>':'Serial branches · <strong>Single</strong>')+'</span>';
  h+='<span class="lane-branch-mode">'+(isAll?'Execute all':'Execute one')+'</span>';
  if(editMode&&typeof branchCollapseEligibility==='function'&&branchCollapseEligibility(op,region.forkSource).ok)h+='<button class="lane-branch-remove" title="Remove this complete branch" onclick="event.stopPropagation();requestBranchCollapse('+u+','+o+',\''+region.forkSource+'\')">Remove branch</button>';
  h+='</div>';
  // Serial / Single has the same side-by-side lane layout as Parallel / All.
  // Its AVEVA execution semantics remain Serial in the ProcedureLogic links.
  h+='<div class="lane-branch-lanes">';
  for(var laneIndex=0;laneIndex<region.lanes.length;laneIndex++){
    var branch=region.lanes[laneIndex];
    var laneMenu=editMode&&typeof branchLaneDeleteMenuHtml==='function'?'<span class="act-bar">'+branchLaneDeleteMenuHtml(u,o,region.forkSource,laneIndex)+'</span>':'';
    h+='<div class="lane-branch-lane"><div class="lane-branch-label">Branch '+branch.label+laneMenu+'</div>';
    for(var phaseIndex=0;phaseIndex<branch.phases.length;phaseIndex++){
      var found=lanePhaseById(op,branch.phases[phaseIndex]);
      if(found)h+=buildLanePhaseHtml(found.phase,up,u,o,found.index,transAfter,loopBacks,true,(typeof graphMoveCapabilities==='function'?graphMoveCapabilities(op,laneNodeKey(found.phase)):laneMoveCapabilities(op,laneNodeKey(found.phase))));
    }
    h+='</div>';
  }
  var successor=laneBranchEndpointName(op,region.joinTarget);
  h+='</div><div class="lane-branch-join"><span class="lane-branch-symbol">⇲</span><span><strong>Join</strong> · '+(isAll?'Parallel':'Serial')+' convergent</span>';
  h+='<span class="lane-branch-continues">'+(isAll?'All branches continue':'Selected option continues')+(successor==='End'?' to <strong>End</strong>':' to <strong>'+esc(successor)+'</strong>')+'</span>';
  if(editMode&&typeof universalJoinMenuHtml==='function')h+='<span class="act-bar">'+universalJoinMenuHtml(u,o,region.forkSource)+'</span>';
  h+='</div></section>';
  return h;
}

function renderLanePhases(){
  if(!currentRecipeData||!currentRecipeData.unit_procedures||laneSelectedUP<0||laneSelectedUP>=currentRecipeData.unit_procedures.length){
    document.getElementById('lanePhList').innerHTML='';
    return;
  }
  var u=laneSelectedUP,o=laneSelectedOp,up=currentRecipeData.unit_procedures[u];
  if(!up||!up.operations||o<0||o>=up.operations.length){document.getElementById('lanePhList').innerHTML='';return}
  var op=up.operations[o];
  var h=laneBoundary('start',op.name||'Operation'),transAfter={},loopBacks=[];
  if(op.links){for(var li=0;li<op.links.length;li++){var lk=op.links[li];if(lk.type==='Other'&&lk.from_type==='Transition')loopBacks.push(lk);if(lk.to_type==='Transition')transAfter[lk.from]={cond:op.transitions?op.transitions[lk.to_id]||'':'',tid:lk.to_id};}}

  var nestedHtml=typeof renderNestedOperationPhases==='function'?renderNestedOperationPhases(op,up,u,o,transAfter,loopBacks):'';
  if(nestedHtml){h+=nestedHtml+'<div class="lane-arrow">▼</div>'+laneBoundary('end','');document.getElementById('lanePhList').innerHTML=h;return;}

  // Once the final branch region has collapsed, the native graph can be
  // Begin → Transition 9 → surviving Step. The legacy linear pass starts at
  // phases, so explicitly retain that entry Transition before the first card.
  if(typeof laneInitialTransitionHtml==='function')h+=laneInitialTransitionHtml(op,u,o);
  var regions=collectReadOnlyBranchRegions(op),regionAfterFork={},regionBeforePhase={},branchMembers={};
  for(var r=0;r<regions.length;r++){
    var region=regions[r],forkIsPhase=!!lanePhaseById(op,region.forkSource);
    if(forkIsPhase){
      if(!regionAfterFork[region.forkSource])regionAfterFork[region.forkSource]=[];
      regionAfterFork[region.forkSource].push(region);
    }else{
      // A Begin fork has no phase card to follow. Insert before the first
      // member encountered in document order, so it appears after Start.
      var firstMember='';
      for(var orderIndex=0;orderIndex<op.phases.length&&!firstMember;orderIndex++){
        var candidateId=laneNodeKey(op.phases[orderIndex]);
        for(var laneIndex=0;laneIndex<region.lanes.length;laneIndex++)if(region.lanes[laneIndex].phases.indexOf(candidateId)>=0){firstMember=candidateId;break;}
      }
      if(firstMember){
        if(!regionBeforePhase[firstMember])regionBeforePhase[firstMember]=[];
        regionBeforePhase[firstMember].push(region);
      }
    }
    for(var lane=0;lane<region.lanes.length;lane++)for(var p=0;p<region.lanes[lane].phases.length;p++)branchMembers[region.lanes[lane].phases[p]]=true;
  }
  for(var pi=0;pi<op.phases.length;pi++){
    var ph=op.phases[pi],nodeKey=laneNodeKey(ph);
    if(regionBeforePhase[nodeKey])for(var beforeIndex=0;beforeIndex<regionBeforePhase[nodeKey].length;beforeIndex++)h+=renderReadOnlyBranchRegion(regionBeforePhase[nodeKey][beforeIndex],op,up,u,o,transAfter,loopBacks);
    if(branchMembers[nodeKey])continue;
    h+=buildLanePhaseHtml(ph,up,u,o,pi,transAfter,loopBacks,false,(typeof graphMoveCapabilities==='function'?graphMoveCapabilities(op,nodeKey):laneMoveCapabilities(op,nodeKey)));
    if(regionAfterFork[nodeKey])for(var regionIndex=0;regionIndex<regionAfterFork[nodeKey].length;regionIndex++)h+=renderReadOnlyBranchRegion(regionAfterFork[nodeKey][regionIndex],op,up,u,o,transAfter,loopBacks);
  }
  if(!op.phases.length)h+='<div style="color:#999;padding:12px;text-align:center">No phases</div>';
  h+='<div class="lane-arrow">▼</div>'+laneBoundary('end','');
  document.getElementById('lanePhList').innerHTML=h;
}
