// editor.js - Edit mode controls, dropdown menus, structural editing operations
// Handles: ⋮ menus, move/delete/insert for UPs/Ops/Phases, inline param editing

// ===== DROPDOWN MANAGEMENT =====
function closeDropdowns(){
  document.querySelectorAll('.dropdown.show').forEach(function(d){
    d.classList.remove('show');
    if(d._menuOwner)d._menuOwner.appendChild(d);
  });
  activeDropdown=null;
}
function toggleDD(el,e){
  e.stopPropagation();
  var dd=el.querySelector('.dropdown');
  if(!dd)return;
  var wasOpen=dd.classList.contains('show');
  closeDropdowns();
  if(!wasOpen){
    // A fixed child can still be trapped by a transformed/contained ancestor.
    // Portal the open menu to body, then restore it when it closes.
    dd._menuOwner=el;document.body.appendChild(dd);
    dd.classList.add('show');activeDropdown=dd;
    // Measure the actual menu and position within the usable visual viewport.
    // When near the bottom of the app, open upward rather than behind the
    // browser/OS task bar; long menus remain wholly visible.
    window.requestAnimationFrame(function(){
      if(!dd.classList.contains('show'))return;
      var viewport=window.visualViewport||{width:window.innerWidth,height:window.innerHeight,offsetLeft:0,offsetTop:0};
      var pad=8,rect=el.getBoundingClientRect(),width=dd.offsetWidth||220,height=dd.offsetHeight||240;
      var topEdge=viewport.offsetTop+pad,bottomEdge=viewport.offsetTop+viewport.height-pad;
      var left=Math.max(viewport.offsetLeft+pad,Math.min(rect.left,viewport.offsetLeft+viewport.width-width-pad));
      var below=bottomEdge-rect.bottom-4,above=rect.top-topEdge-4;
      var top=(below>=height||below>=above)?Math.min(bottomEdge-height,rect.bottom+4):Math.max(topEdge,rect.top-height-4);
      dd.style.left=left+'px';dd.style.top=top+'px';
    });
  }
}

function ddUP(u){
  return '<div class="act-more" onclick="toggleDD(this,event)"><button class="act-more-btn">\u22EE</button><div class="dropdown">'
    +'<div class="dd-label">Unit Procedure</div>'
    +'<div class="dd-item" onclick="addUPBefore('+u+')">Insert UP Before</div>'
    +'<div class="dd-item" onclick="addUPAfter('+u+')">Insert UP After</div>'
    +'<div class="dd-sep"></div>'
    +'<div class="dd-item" onclick="addOp('+u+')">+ Add Operation</div>'
    +'<div class="dd-sep"></div>'
    +'<div class="dd-item danger" onclick="removeUP('+u+')">\u2716 Delete UP</div>'
    +'</div></div>';
}

function ddOp(u,o){
  return '<div class="act-more" onclick="toggleDD(this,event)"><button class="act-more-btn">\u22EE</button><div class="dropdown">'
    +'<div class="dd-label">Operation</div>'
    +'<div class="dd-item" onclick="addOpBefore('+u+','+o+')">Insert Op Before</div>'
    +'<div class="dd-item" onclick="addOpAfter2('+u+','+o+')">Insert Op After</div>'
    +'<div class="dd-sep"></div>'
    +'<div class="dd-item" onclick="addPhaseToOp('+u+','+o+',\'Process\')">+ Add Phase</div>'
    +'<div class="dd-item" onclick="addPhaseToOp('+u+','+o+',\'Transfer\')">+ Insert Transfer after this node</div>'
    +'<div class="dd-item" onclick="addPhaseToOp('+u+','+o+',\'AllocateProcess\')">+ Insert Allocate Process after this node</div>'
    +'<div class="dd-item" onclick="addPhaseToOp('+u+','+o+',\'ReleaseProcess\')">+ Insert Release Process after this node</div>'
    +'<div class="dd-item" onclick="addPhaseToOp('+u+','+o+',\'AllocateTransfer\')">+ Insert Allocate Transfer after this node</div>'
    +'<div class="dd-item" onclick="addPhaseToOp('+u+','+o+',\'ReleaseTransfer\')">+ Insert Release Transfer after this node</div>'
    +(BRANCH_DISPLAY_ONLY?'':'<div class="dd-item" onclick="addBranchToOp('+u+','+o+')">\u2234 Add Branch</div>')
    +'<div class="dd-item" onclick="addTransToOp('+u+','+o+')">\u25C6 Add Transition</div>'
    +'<div class="dd-item" onclick="addLoopToOp('+u+','+o+')">\u21BA Add Loop</div>'
    +'<div class="dd-sep"></div>'
    +'<div class="dd-item danger" onclick="removeOp('+u+','+o+')">\u2716 Delete Op</div>'
    +'</div></div>';
}

// Common menu for a selectable RecipeElement when its actions use the generic
// node-insertion primitive. The popup is fixed-positioned by toggleDD(), so it
// is not clipped by a nested lane's horizontal scroll container.
function ddNode(u,o,nodeId,label){
  return '<div class="act-more node-more" onclick="toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for node '+nodeId+'" title="Actions for '+(label||'node')+'">⋮</button><div class="dropdown">'
    +'<div class="dd-label">'+(label||'Node')+' · #'+nodeId+'</div>'
    +'<div class="dd-item" onclick="startNodeAdd('+u+','+o+',\''+nodeId+'\',\'Process\')">Insert Process Phase after this node</div>'
    +'<div class="dd-item" onclick="startNodeAdd('+u+','+o+',\''+nodeId+'\',\'Transfer\')">Insert Transfer after this node</div>'
    +'<div class="dd-item" onclick="startNodeAdd('+u+','+o+',\''+nodeId+'\',\'AllocateProcess\')">Insert Allocate Process after this node</div>'
    +'<div class="dd-item" onclick="startNodeAdd('+u+','+o+',\''+nodeId+'\',\'ReleaseProcess\')">Insert Release Process after this node</div>'
    +'<div class="dd-item" onclick="startNodeAdd('+u+','+o+',\''+nodeId+'\',\'AllocateTransfer\')">Insert Allocate Transfer after this node</div>'
    +'<div class="dd-item" onclick="startNodeAdd('+u+','+o+',\''+nodeId+'\',\'ReleaseTransfer\')">Insert Release Transfer after this node</div>'
    +'<div class="dd-sep"></div>'
    +'<div class="dd-item" onclick="addTransitionAfterNode('+u+','+o+',\''+nodeId+'\')">◆ Insert Transition after this node</div>'
    +'<div class="dd-item" onclick="showLoopAfterNodeDialog('+u+','+o+',\''+nodeId+'\')">↺ Create loop after this node</div>'
    +'<div class="dd-item" onclick="showBranchAfterNodeDialog('+u+','+o+',\''+nodeId+'\')">⑂ Create branch after this node</div>'
    +'<div class="dd-sep"></div><div class="dd-item danger" onclick="requestGraphDeleteNode('+u+','+o+',\''+nodeId+'\',\'this node\')">✖ Delete</div>'
    +'</div></div>';
}

function ddPh(u,o,p){
  var branchItem='';
  if(currentRecipeData){
    var up=currentRecipeData.unit_procedures[u],op=up&&up.operations[o],ph=op&&op.phases[p];
    var nodeId=ph&&(ph._reId||ph.node_id),eligible=op&&nodeId&&typeof branchAfterNodeEligibility==='function'&&branchAfterNodeEligibility(op,String(nodeId)).ok;
    if(eligible)branchItem='<div class="dd-sep"></div><div class="dd-item" onclick="showBranchAfterNodeDialog('+u+','+o+',\''+String(nodeId)+'\')">⑂ Create branch after this node</div>';
  }
  return '<div class="act-more" onclick="toggleDD(this,event)"><button class="act-more-btn">⋮</button><div class="dropdown">'
    +'<div class="dd-label">Phase</div>'
    +'<div class="dd-item" onclick="addPhaseAfter('+u+','+o+','+p+',\'Process\')">Insert Phase After</div>'
    +'<div class="dd-item" onclick="addPhaseAfter('+u+','+o+','+p+',\'Transfer\')">Insert Transfer After</div>'
    +'<div class="dd-item" onclick="addPhaseAfter('+u+','+o+','+p+',\'AllocateProcess\')">Insert Allocate Process After</div>'
    +'<div class="dd-item" onclick="addPhaseAfter('+u+','+o+','+p+',\'ReleaseProcess\')">Insert Release Process After</div>'
    +'<div class="dd-item" onclick="addPhaseAfter('+u+','+o+','+p+',\'AllocateTransfer\')">Insert Allocate Transfer After</div>'
    +'<div class="dd-item" onclick="addPhaseAfter('+u+','+o+','+p+',\'ReleaseTransfer\')">Insert Release Transfer After</div>'
    +'<div class="dd-sep"></div>'
    +'<div class="dd-item" onclick="addTransitionAfterNode('+u+','+o+',\''+String(nodeId)+'\')">◆ Insert Transition after this node</div>'
    +'<div class="dd-item" onclick="showLoopAfterNodeDialog('+u+','+o+',\''+String(nodeId)+'\')">↺ Create loop after this node</div>'
    +'<div class="dd-item" onclick="showBranchAfterNodeDialog('+u+','+o+',\''+String(nodeId)+'\')">⑂ Create branch after this node</div>'
    +'<div class="dd-sep"></div>'
    +'<div class="dd-item danger" onclick="requestGraphDeletePhase('+u+','+o+','+p+')">✖ Delete Phase</div>'
    +'</div></div>';
}
function removeTransition(u,o,tid){var op=currentRecipeData.unit_procedures[u].operations[o];delete op.transitions[tid];op.links=op.links.filter(function(l){return l.to_id!==tid&&l.from_id!==tid});renderAll()}

// Equipment requirements hold process classes and their named process instances.
// Unit Procedures select a process instance; MODEL lookup is resolved through its class.
function markRecipeCollectionEdit(){if(currentRecipeData)currentRecipeData._recipeCollectionEdit=true;}
function newOperation(name){var beginId=allocateRecipeElementId(),endId=allocateRecipeElementId();return {name:name||'New Op',phases:[],links:[{type:'ControlLink',from:'Begin',from_id:'',from_re_id:beginId,from_type:'Step',to:'End',to_id:'',to_re_id:endId,to_type:'Step'}],transitions:{},_beginReId:beginId,_endReId:endId};}
function newLaneUP(){return {name:'New UP',process:defaultUPProcess(),operations:[newOperation('Operation 1')]};}
function addUPBefore(u){
  if(!recipeProcessInstances().length){alert('Add a process instance in Equipment Requirements before adding a Unit Procedure.');return;}
  currentRecipeData._structuralEdit=true;currentRecipeData.unit_procedures.splice(u,0,newLaneUP());laneSelectedUP=u;laneSelectedOp=0;renderAll();
}
function updUPProcess(u,instanceName){
  if(!processClassForInstance(instanceName))return;
  var up=currentRecipeData.unit_procedures[u],oldInstance=up.process;
  if(oldInstance===instanceName)return;
  var existingPhases=[];
  (up.operations||[]).forEach(function(op){(op.phases||[]).forEach(function(phase){if(phase.parent_instance===oldInstance)existingPhases.push(phase);});});
  if(existingPhases.length){alert('This Unit Procedure already contains phases for '+oldInstance+'. Reassigning it would leave those phase bindings unchanged, so create or select the instance before adding phases.');renderAll();return;}
  up.process=instanceName;currentRecipeData._structuralEdit=true;renderAll();
}
function updTransCond(u,o,tid,val){currentRecipeData.unit_procedures[u].operations[o].transitions[tid]=val;currentRecipeData._structuralEdit=true}
function transitionMeta(op,tid){if(!op.transition_meta)op.transition_meta={};if(!op.transition_meta[tid])op.transition_meta[tid]={name:tid,description:''};return op.transition_meta[tid];}
function allGraphNodeIds(recipe){var used={};(recipe&&recipe.unit_procedures||[]).forEach(function(up){(up.operations||[]).forEach(function(op){[op._beginReId,op._endReId].concat((op.phases||[]).map(function(p){return p._reId||p.node_id;})).concat(Object.keys(op.transitions||{})).forEach(function(id){if(id!==undefined&&id!==null&&String(id)!=='')used[String(id)]=true;});});});return used;}
function nextFreeGraphNodeId(recipe){var used=allGraphNodeIds(recipe),n=1;while(used[String(n)])n++;return String(n);}
function renameTransitionId(u,o,oldId,value){var op=currentRecipeData.unit_procedures[u].operations[o],newId=String(value||'').trim(),input=(typeof event!=='undefined'&&event.target)?event.target:null;if(!newId||newId===oldId)return;if(!/^\d+$/.test(newId)||allGraphNodeIds(currentRecipeData)[newId]){var suggestion=nextFreeGraphNodeId(currentRecipeData);alert('Transition Label / node ID must be a unique numeric value. Suggested next free ID: '+suggestion);if(input)input.value=oldId;return;}op.transitions[newId]=op.transitions[oldId];delete op.transitions[oldId];if(op.transition_meta){op.transition_meta[newId]=op.transition_meta[oldId]||{name:oldId,description:''};delete op.transition_meta[oldId];}if(op.transition_meta[newId].name===oldId)op.transition_meta[newId].name=newId;(op.links||[]).forEach(function(link){if(link.from_type==='Transition'&&link.from_id===oldId){link.from_id=newId;link.from='TRANS:'+newId;}if(link.to_type==='Transition'&&link.to_id===oldId){link.to_id=newId;link.to='TRANS:'+newId;}});currentRecipeData._structuralEdit=true;renderAll();}
function updTransitionMeta(u,o,tid,key,value){var op=currentRecipeData.unit_procedures[u].operations[o];transitionMeta(op,tid)[key]=value;currentRecipeData._structuralEdit=true;}
function addTransToOp(u,o){var op=currentRecipeData.unit_procedures[u].operations[o];if(!op.transitions)op.transitions={};if(!op.links)op.links=[];var tid=nextTransitionId(op);op.transitions[tid]='Ask( "Condition?" )';transitionMeta(op,tid);var lastPh=op.phases.length?op.phases[op.phases.length-1]:null;if(lastPh){op.links.push({type:'ControlLink',from:lastPh.label,from_id:'',from_type:'Step',to:'TRANS:'+tid,to_id:tid,to_type:'Transition'})}renderAll()}
function addTransAfterPh(u,o,p){var op=currentRecipeData.unit_procedures[u].operations[o];if(!op.transitions)op.transitions={};if(!op.links)op.links=[];var tid=nextTransitionId(op);var ph=op.phases[p];op.transitions[tid]='Ask( "Condition?" )';transitionMeta(op,tid);op.links.push({type:'ControlLink',from:ph.label,from_id:'',from_type:'Step',to:'TRANS:'+tid,to_id:tid,to_type:'Transition'});renderAll()}
function addFirstUP(){
  if(!recipeProcessInstances().length){alert('Add a process instance in Equipment Requirements before adding a Unit Procedure.');return;}
  currentRecipeData._structuralEdit=true;currentRecipeData.unit_procedures.push(newLaneUP());laneSelectedUP=currentRecipeData.unit_procedures.length-1;laneSelectedOp=0;renderAll();
}
function addUPAfter(u){
  if(!recipeProcessInstances().length){alert('Add a process instance in Equipment Requirements before adding a Unit Procedure.');return;}
  currentRecipeData._structuralEdit=true;currentRecipeData.unit_procedures.splice(u+1,0,newLaneUP());laneSelectedUP=u+1;laneSelectedOp=0;renderAll();
}
function removeUP(u){currentRecipeData._structuralEdit=true;if(confirm('Delete this unit procedure?')){currentRecipeData.unit_procedures.splice(u,1);renderAll()}}
function moveUP(u,dir){var arr=currentRecipeData.unit_procedures;var ni=u+dir;if(ni<0||ni>=arr.length)return;var tmp=arr[u];arr[u]=arr[ni];arr[ni]=tmp;renderAll()}
function addOp(u){currentRecipeData._structuralEdit=true;currentRecipeData.unit_procedures[u].operations.push(newOperation());renderAll()}
function addOpBefore(u,o){currentRecipeData._structuralEdit=true;currentRecipeData.unit_procedures[u].operations.splice(o,0,newOperation());renderAll()}
function addOpAfter2(u,o){currentRecipeData._structuralEdit=true;currentRecipeData.unit_procedures[u].operations.splice(o+1,0,newOperation());renderAll()}
function removeOp(u,o){currentRecipeData._structuralEdit=true;currentRecipeData.unit_procedures[u].operations.splice(o,1);renderAll()}
function moveOp(u,o,dir){var arr=currentRecipeData.unit_procedures[u].operations;var ni=o+dir;if(ni<0||ni>=arr.length)return;var tmp=arr[o];arr[o]=arr[ni];arr[ni]=tmp;renderAll()}
function addPhaseToOp(u,o,type){showPhasePicker(u,o,-1,type)}
function addPhaseAfter(u,o,p,type){var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],phase=op&&op.phases&&op.phases[p],nodeId=phase&&(phase._reId||phase.node_id);if(!nodeId||typeof showPhasePicker!=='function')return;/* All selected-node insertions, including ordinary cards, use the canonical graph primitive. This supports ControlLink, forks and joins without a separate label/index path. */showPhasePicker(u,o,-1,type,String(nodeId));}
function removePh(u,o,p){requestGraphDeletePhase(u,o,p);}
function movePh(u,o,p,dir){
  var op=currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],ph=op&&op.phases[p];
  if(!op||!ph||typeof movePhaseWithinLane!=='function')return;
  var nodeId=ph._reId||ph.node_id;
  // Stage 8A delegates arrows to graph relocation. The target is discovered
  // from visible/document order but the move itself is link rewiring only.
  var result=typeof moveGraphShortcut==='function'?moveGraphShortcut(op,nodeId,dir):movePhaseWithinLane(op,nodeId,dir);
  if(!result.ok){console.warn('Graph phase move not applied:',result.reason);return;}
  currentRecipeData._structuralEdit=true;
  // V10: materialise the structural graph to canonical XML, then discard the
  // edited projection and rerender from a fresh XML-derived projection.
  if(typeof xmlAuthorityCommitStructural==='function'&&currentRecipeData._xmlAuthoritative){
    try{xmlAuthorityReplaceCurrent(xmlAuthorityCommitStructural(currentRecipeData));}
    catch(e){console.error('XML-authoritative move was not committed:',e);alert('Move was not saved to the canonical XML: '+e.message);return;}
  }
  renderAll();
}
function addBranchToOp(u,o){currentRecipeData._structuralEdit=true;var op=currentRecipeData.unit_procedures[u].operations[o];if(!op.links)op.links=[];var proc=currentRecipeData.unit_procedures[u].process;var fid='fk'+(Date.now());op.phases.push({label:'brA_'+fid,phase_type:'Process',parent_instance:proc,description:'Branch A',params:[],_branch:'A',_forkId:fid});op.phases.push({label:'brB_'+fid,phase_type:'Process',parent_instance:proc,description:'Branch B',params:[],_branch:'B',_forkId:fid});op.phases.push({label:'join_'+fid,phase_type:'Process',parent_instance:proc,description:'',params:[],_join:fid});op.links.push({type:'ParallelDivergent',from:'',to:'brA_'+fid,from_type:'Step',to_type:'Step'});op.links.push({type:'ParallelConvergent',from:'brA_'+fid,to:'join_'+fid,from_type:'Step',to_type:'Step'});renderAll()}
function addPhaseToEndOfBranch(u,o,branch,type){
  // Find the last phase index in the given branch and insert after it
  var op=currentRecipeData.unit_procedures[u].operations[o];
  if(!op.links)return;
  var bFork=[],bJoin={},bConv={},bCtrl={};
  op.links.forEach(function(l){
    if(l.type==='ParallelDivergent')bFork.push(l.to);
    if(l.type==='ParallelConvergent'){bJoin[l.to]=1;bConv[l.from]=1;}
    if(l.type==='ControlLink'&&l.from_type==='Step'&&l.to_type==='Step')bCtrl[l.from]=l.to;
  });
  if(bFork.length<2)return;
  var bm={};
  var bc=bFork[0];while(bc&&!bJoin[bc]){bm[bc]='A';if(bConv[bc])break;bc=bCtrl[bc];}
  bc=bFork[1];while(bc&&!bJoin[bc]){bm[bc]='B';if(bConv[bc])break;bc=bCtrl[bc];}
  // Find last phase index in this branch
  var lastIdx=-1;
  for(var i=op.phases.length-1;i>=0;i--){if(bm[op.phases[i].label]===branch){lastIdx=i;break;}}
  if(lastIdx<0)return;
  showPhasePicker(u,o,lastIdx,type);
  // After picking, we also need to update links: remove old conv-source link and add new one
  // This is handled by a post-pick hook - set a flag for addBranchPhaseHook
  currentRecipeData._branchInsert={u:u,o:o,branch:branch,afterIdx:lastIdx};
}
function addLoopToOp(u,o){currentRecipeData._structuralEdit=true;var op=currentRecipeData.unit_procedures[u].operations[o];if(!op.transitions)op.transitions={};if(!op.links)op.links=[];var tid=nextTransitionId(op);op.transitions[tid]='AskDoneBy( "Repeat?" )';var lastPh=op.phases.length?op.phases[op.phases.length-1]:null;if(lastPh){op.links.push({type:'ControlLink',from:lastPh.label,from_id:'',from_type:'Step',to:'TRANS:'+tid,to_id:tid,to_type:'Transition'});op.links.push({type:'Other',from:'TRANS:'+tid,from_id:tid,from_type:'Transition',to:lastPh.label,to_id:'',to_type:'Step'})}renderAll()}
function addLoopAfterPh(u,o,p){var op=currentRecipeData.unit_procedures[u].operations[o];if(!op.transitions)op.transitions={};if(!op.links)op.links=[];var tid=nextTransitionId(op);var ph=op.phases[p];op.transitions[tid]='AskDoneBy( "Repeat?" )';transitionMeta(op,tid);op.links.push({type:'ControlLink',from:ph.label,from_id:'',from_type:'Step',to:'TRANS:'+tid,to_id:tid,to_type:'Transition'});op.links.push({type:'Other',from:'TRANS:'+tid,from_id:tid,from_type:'Transition',to:ph.label,to_id:'',to_type:'Step'});renderAll()}


// === Equipment process class and instance edit functions ===
function availableProcessClasses(){
  var existing=recipeProcessClasses();
  return Object.keys(MODEL.processes||{}).sort().filter(function(processClass){return existing.indexOf(processClass)<0;});
}
function addEqProc(){
  var available=availableProcessClasses();
  if(!available.length){alert('All process classes in the loaded site model are already present.');return;}
  showProcessClassPicker(available);
}
function addSelectedEqProc(processClass){
  if(typeof processClassPickerOpen!=='undefined'&&(!processClassPickerOpen||processClassPickerChoices.indexOf(processClass)<0))return;
  if(availableProcessClasses().indexOf(processClass)<0)return;
  currentRecipeData.equipment_requirements.push({id:processClass,instances:[{name:nextProcessInstanceName(processClass),unit:'',mode:'Auto'}]});
  // Restore Stage 4C transfer inheritance while retaining Stage 5 endpoint validity.
  if(typeof seedInheritedTransfersForProcessClasses==='function')seedInheritedTransfersForProcessClasses();
  markRecipeCollectionEdit();closeProcessClassPicker();renderAll();
}
function removeEqProc(i){
  var removed=currentRecipeData.equipment_requirements[i];
  if(!removed)return;
  var processClass=removed.id||removed.process||'';
  if(processClassIsReferenced(processClass)){alert('Cannot delete '+processClass+' because one of its instances or a global transfer still references it. Reassign or remove those references first.');return;}
  currentRecipeData.equipment_requirements.splice(i,1);markRecipeCollectionEdit();renderAll();
}
function addEqInstance(i){
  var req=currentRecipeData.equipment_requirements[i];if(!req)return;
  if(!Array.isArray(req.instances))req.instances=requirementInstances(req);
  var processClass=req.id||req.process||'';
  req.instances.push({name:nextProcessInstanceName(processClass),unit:'',mode:'Auto'});
  markRecipeCollectionEdit();renderAll();
}
function updEqInstanceName(i,j,value){
  var req=currentRecipeData.equipment_requirements[i],instance=req&&requirementInstances(req)[j],name=(value||'').trim();
  if(!instance)return;
  if(!name){alert('A process-instance name is required.');renderAll();return;}
  if(name===instance.name)return;
  if(recipeProcessInstances().some(function(item){return item.name===name;})){alert('Process-instance names must be unique across the recipe.');renderAll();return;}
  if(processInstanceIsReferenced(instance.name)){alert('Cannot rename '+instance.name+' because it is referenced by a Unit Procedure, phase, parameter, or transfer instance.');renderAll();return;}
  instance.name=name;markRecipeCollectionEdit();renderAll();
}
function updEqInstanceUnit(i,j,unit){
  var req=currentRecipeData.equipment_requirements[i],instance=req&&requirementInstances(req)[j],processClass=req&&(req.id||req.process||'');
  if(!instance)return;
  if(!isValidUnitForProcessClass(processClass,unit)){alert('Unit '+unit+' is not valid for process class '+processClass+'.');renderAll();return;}
  instance.unit=unit||'';markRecipeCollectionEdit();renderAll();
}
function updEqInstanceMode(i,j,mode){
  var instance=currentRecipeData.equipment_requirements[i]&&requirementInstances(currentRecipeData.equipment_requirements[i])[j];
  if(!instance)return;
  if(['Auto','Manual'].indexOf(mode)<0){alert('Only Auto and Manual selection modes are supported by the reference XML.');renderAll();return;}
  instance.mode=mode;markRecipeCollectionEdit();renderAll();
}
function removeEqInstance(i,j){
  var req=currentRecipeData.equipment_requirements[i],instance=req&&requirementInstances(req)[j];
  if(!req||!instance)return;
  if(req.instances.length<=1){alert('A process class must retain at least one process instance. Delete the process class instead if it is no longer required.');return;}
  if(processInstanceIsReferenced(instance.name)){alert('Cannot delete '+instance.name+' because it is referenced by a Unit Procedure, phase, parameter, or transfer instance.');return;}
  req.instances.splice(j,1);markRecipeCollectionEdit();renderAll();
}




// Reassign a used process instance only to another instance in the same class.
// This updates all structured recipe references; linked Formula ParentInstance
// entries are patched during structural save using their preserved _fid values.
function reassignProcessInstance(i,j,newName){
  var req=currentRecipeData.equipment_requirements[i],instance=req&&requirementInstances(req)[j],oldName=instance&&instance.name;
  if(!instance||!newName||newName===oldName)return;
  var replacement=processInstanceByName(newName);
  if(!replacement||replacement.processClass!==(req.id||req.process||'')){alert('Choose a replacement instance from the same process class.');renderAll();return;}
  var summary={ups:0,phases:0,transfers:0};
  (currentRecipeData.unit_procedures||[]).forEach(function(up){
    if(up.process===oldName){up.process=newName;summary.ups++;}
    (up.operations||[]).forEach(function(op){(op.phases||[]).forEach(function(phase){if(phase.parent_instance===oldName){phase.parent_instance=newName;summary.phases++;}});});
  });
  (currentRecipeData.equipment_transfers||[]).forEach(function(transfer){(transfer.instances||[]).forEach(function(transferInstance){if(transferInstance.source===oldName){transferInstance.source=newName;summary.transfers++;}if(transferInstance.dest===oldName){transferInstance.dest=newName;summary.transfers++;}});});
  if(!confirm('Reassign '+oldName+' to '+newName+'? This updates '+summary.ups+' Unit Procedure(s), '+summary.phases+' phase binding(s), and '+summary.transfers+' transfer endpoint(s).')){renderAll();return;}
  // Formula records can include bindings outside the simplified phase parameter map.
  // Preserve the confirmed rename mapping so structural save updates all of them.
  if(!currentRecipeData._instance_reassignments)currentRecipeData._instance_reassignments={};
  currentRecipeData._instance_reassignments[oldName]=newName;
  currentRecipeData._raw_instance_references=(currentRecipeData._raw_instance_references||[]).filter(function(name){return name!==oldName;});
  markRecipeCollectionEdit();currentRecipeData._structuralEdit=true;renderAll();
}

// Transfer instance endpoints select only instances belonging to the transfer's class route.
function instancesForTransferEndpoint(transfer,side){
  var processClass=side==='source'?transfer.source:transfer.dest;
  return recipeProcessInstances().filter(function(instance){return instance.processClass===processClass;});
}
function transferEndpointIsReferenced(instanceName){
  return (currentRecipeData.unit_procedures||[]).some(function(up){return (up.operations||[]).some(function(op){return (op.phases||[]).some(function(phase){return phase.parent_instance===instanceName&&(phase.phase_type==='Transfer'||phase.phase_type==='AllocateTransfer'||phase.phase_type==='ReleaseTransfer');});});});
}
function updTransferInstanceEndpoint(transferIndex,instanceIndex,side,value){
  var transfer=currentRecipeData.equipment_transfers[transferIndex],instance=transfer&&transfer.instances&&transfer.instances[instanceIndex];
  if(!transfer||!instance)return;
  var valid=instancesForTransferEndpoint(transfer,side).some(function(candidate){return candidate.name===value;});
  if(!valid){alert('That '+side+' instance is not valid for transfer class '+transfer.name+'.');renderAll();return;}
  if(instance[side]===value)return;
  if(transferEndpointIsReferenced(instance.name)){alert('Cannot change the selected route for '+instance.name+' because a Transfer, Allocate Transfer, or Release Transfer phase references it. Reassign those phases first.');renderAll();return;}
  instance[side]=value;markRecipeCollectionEdit();renderAll();
}

// ===== INLINE PARAMETER & DESCRIPTION EDITING =====
function updPVal(u,o,p,pi,val){currentRecipeData.unit_procedures[u].operations[o].phases[p].params[pi].value=val}

// Phase-level material autocomplete
var phMatAcListEl=null;
var phMatAcCtx=null; // {u,o,p,pi}

function openPhMatAc(u,o,p,pi){
  phMatAcCtx={u:u,o:o,p:p,pi:pi};
  var inp=document.getElementById('phMatAc_'+u+'_'+o+'_'+p+'_'+pi);
  filterPhMatAc(u,o,p,pi,inp.value);
}

function closePhMatAc(){
  if(phMatAcListEl){phMatAcListEl.remove();phMatAcListEl=null}
  phMatAcCtx=null;
}

function filterPhMatAc(u,o,p,pi,query){
  if(phMatAcListEl){phMatAcListEl.remove();phMatAcListEl=null}
  var q=query.toLowerCase().trim();
  var results=[];
  if(q.length===0){
    // Show materials already in the recipe BOM first, then others
    var bomIds=currentRecipeData.materials.map(function(m){return m.material_id});
    for(var i=0;i<MAT_LIST.length;i++){
      if(bomIds.indexOf(MAT_LIST[i].id)>=0)results.push(MAT_LIST[i]);
      if(results.length>=20)break;
    }
  } else {
    for(var i=0;i<MAT_LIST.length;i++){
      var m=MAT_LIST[i];
      if(m.id.toLowerCase().indexOf(q)>=0||m.name.toLowerCase().indexOf(q)>=0||m.code.toLowerCase().indexOf(q)>=0){
        results.push(m);if(results.length>=20)break;
      }
    }
  }

  var list=document.createElement('div');
  list.className='mat-ac-list show';
  list.innerHTML='<div class="mat-ac-hdr"><span>ID</span><span>Name</span><span>Code</span></div>';
  if(!results.length){list.innerHTML+='<div class="mat-ac-empty">No matches</div>'}
  else{for(var i=0;i<results.length;i++){var r=results[i];
    list.innerHTML+='<div class="mat-ac-item" onmousedown="pickPhMat('+u+','+o+','+p+','+pi+',\''+esc(r.id)+'\')"><span class="ac-id">'+highlightMatch(r.id,q)+'</span><span class="ac-name">'+highlightMatch(r.name,q)+'</span><span class="ac-code">'+highlightMatch(r.code,q)+'</span></div>';
  }}

  var inp=document.getElementById('phMatAc_'+u+'_'+o+'_'+p+'_'+pi);
  var rect=inp.getBoundingClientRect();
  list.style.top=(rect.bottom+2)+'px';
  list.style.left=rect.left+'px';
  list.style.minWidth='320px';
  document.body.appendChild(list);
  phMatAcListEl=list;
}

function pickPhMat(u,o,p,pi,matId){
  currentRecipeData.unit_procedures[u].operations[o].phases[p].params[pi].material_id=matId;
  currentRecipeData.unit_procedures[u].operations[o].phases[p].params[pi].param_type='ProcessInput';
  closePhMatAc();
  renderAll();
}

function editParamVal(u,o,p,pi,el){
  var cur=currentRecipeData.unit_procedures[u].operations[o].phases[p].params[pi].value||'';
  var inp=document.createElement('input');inp.className='inline-edit';inp.value=cur;inp.style.width='60px';
  el.textContent='';el.appendChild(inp);inp.focus();inp.select();
  inp.onblur=function(){currentRecipeData.unit_procedures[u].operations[o].phases[p].params[pi].value=inp.value;renderAll()};
  inp.onkeydown=function(e){if(e.key==='Enter')inp.blur();if(e.key==='Escape'){inp.value=cur;inp.blur()}};
}
function editPhDesc(u,o,p,el){
  var cur=currentRecipeData.unit_procedures[u].operations[o].phases[p].description||'';
  var inp=document.createElement('input');inp.className='inline-edit';inp.value=cur;inp.style.width='100%';
  el.textContent='';el.appendChild(inp);inp.focus();
  inp.onblur=function(){currentRecipeData.unit_procedures[u].operations[o].phases[p].description=inp.value;renderAll()};
  inp.onkeydown=function(e){if(e.key==='Enter')inp.blur();if(e.key==='Escape'){inp.value=cur;inp.blur()}};
}



// ===== UP / OPERATION RENAME =====
function editUPName(u, el){
  var cur = currentRecipeData.unit_procedures[u].name || '';
  var inp = document.createElement('input');
  inp.className = 'inline-edit';
  inp.value = cur;
  inp.style.width = '180px';
  inp.style.color = '#fff';
  inp.style.background = '#2d3078';
  inp.style.border = '1px solid #009F3C';
  el.textContent = '';
  el.appendChild(inp);
  inp.focus();
  inp.select();
  inp.onblur = function(){
    var val = inp.value.trim();
    if(val && val !== cur){
      currentRecipeData.unit_procedures[u].name = val;
      currentRecipeData._structuralEdit = true;
    }
    renderAll();
  };
  inp.onkeydown = function(e){
    if(e.key === 'Enter') inp.blur();
    if(e.key === 'Escape'){ inp.value = cur; inp.blur(); }
  };
}

function editOpName(u, o, el){
  var cur = currentRecipeData.unit_procedures[u].operations[o].name || '';
  var inp = document.createElement('input');
  inp.className = 'inline-edit';
  inp.value = cur;
  inp.style.width = '160px';
  el.textContent = '';
  el.appendChild(inp);
  inp.focus();
  inp.select();
  inp.onblur = function(){
    var val = inp.value.trim();
    if(val && val !== cur){
      currentRecipeData.unit_procedures[u].operations[o].name = val;
      currentRecipeData._structuralEdit = true;
    }
    renderAll();
  };
  inp.onkeydown = function(e){
    if(e.key === 'Enter') inp.blur();
    if(e.key === 'Escape'){ inp.value = cur; inp.blur(); }
  };
}

/**
 * CREATE BRANCH - Insert a new parallel branch AFTER the last phase.
 * Creates proper ParallelDivergent link structure with array ToID.
 */
function addBranchToOp(u, o) {
  currentRecipeData._structuralEdit = true;
  var up = currentRecipeData.unit_procedures[u];
  var op = up.operations[o];
  
  if (!op.Links) op.Links = [];
  
  // Find the last phase in the operation
  var lastPhase = op.phases.length > 0 ? op.phases[op.phases.length - 1] : null;
  
  if (!lastPhase) {
    alert('Cannot create branch in empty operation. Add a phase first.');
    return;
  }
  
  var timestamp = Date.now();
  var branchAId = 'branchA_' + timestamp;
  var branchBId = 'branchB_' + timestamp;
  
  // Create branch entry phases
  var newPhaseA = {
    label: 'BranchA_' + timestamp,
    phase_type: 'Process',
    _reId: branchAId,
    params: []
  };
  
  var newPhaseB = {
    label: 'BranchB_' + timestamp,
    phase_type: 'Process',
    _reId: branchBId,
    params: []
  };
  
  // Find and remove the link FROM the last phase
  var linkIdx = -1;
  var oldTarget = null;
  for (var i = 0; i < op.Links.length; i++) {
    if (op.Links[i].LinkType === 'ControlLink' && 
        op.Links[i].FromID && 
        op.Links[i].FromID.FromIDValue === lastPhase.label) {
      linkIdx = i;
      oldTarget = op.Links[i].ToID.ToIDValue;
      break;
    }
  }
  
  // Remove the old link
  if (linkIdx >= 0) {
    op.Links.splice(linkIdx, 1);
  }
  
  // Add the new branch phases
  op.phases.push(newPhaseA);
  op.phases.push(newPhaseB);
  
  // Create ParallelDivergent link from last phase to both branches
  op.Links.push({
    ID: 'link_dv_' + timestamp,
    LinkType: 'ParallelDivergent',
    FromID: { 
      FromIDValue: lastPhase.label, 
      FromType: 'Step', 
      IDScope: 'Internal' 
    },
    ToID: [
      { ToIDValue: branchAId, ToType: 'Step', IDScope: 'Internal' },
      { ToIDValue: branchBId, ToType: 'Step', IDScope: 'Internal' }
    ]
  });
  
  // If there was an old target, reconnect both branches to it
  if (oldTarget) {
    op.Links.push({
      ID: 'link_cl_a_' + timestamp,
      LinkType: 'ControlLink',
      FromID: { FromIDValue: branchAId, FromType: 'Step', IDScope: 'Internal' },
      ToID: { ToIDValue: oldTarget, ToType: 'Step', IDScope: 'Internal' }
    });
    
    op.Links.push({
      ID: 'link_cl_b_' + timestamp,
      LinkType: 'ControlLink',
      FromID: { FromIDValue: branchBId, FromType: 'Step', IDScope: 'Internal' },
      ToID: { ToIDValue: oldTarget, ToType: 'Step', IDScope: 'Internal' }
    });
  }
  
  renderAll();
  alert('Branch created successfully! You can now add phases to each branch lane.');
}

/**
 * ADD PHASE TO BRANCH - Add a new phase to a specific branch lane
 * Call this when clicking "+" on a branch lane (not on linear phases)
 */
function addPhaseToBranchLane(u, o, branchId) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  var structure = computeBranchStructure(op);
  
  if (!structure.hasFork) {
    alert('No branch exists. Create a branch first.');
    return;
  }
  
  var lastPhase = getLastPhaseInBranch(op, branchId);
  if (!lastPhase) {
    // Branch is empty, use the entry point
    lastPhase = structure.branches[branchId].entry;
  }
  
  var timestamp = Date.now();
  var newPhase = {
    label: 'Phase_' + timestamp,
    phase_type: 'Process',
    _reId: 'phase_' + timestamp,
    params: []
  };
  
  insertPhaseIntoBranch(op, branchId, newPhase);
  renderAll();
}

/**
 * CLOSE BRANCH - Seal the parallel branches at a convergence point
 * Call this when selecting a phase to converge to
 */
function closeBranchAtPhase(u, o, convergenceLabel) {
  currentRecipeData._structuralEdit = true;
  var op = currentRecipeData.unit_procedures[u].operations[o];
  
  var structure = computeBranchStructure(op);
  if (!structure.hasFork) {
    alert('No open branch to close');
    return;
  }
  
  if (structure.hasConvergence) {
    alert('Branch already closed');
    return;
  }
  
  closeBranchBefore(op, convergenceLabel);
  renderAll();
  alert('Branch closed at: ' + convergenceLabel);
}

/**
 * Add phase to the end of a specific branch
 */
function addPhaseToEndOfBranch(u, o, branch, type) {
  var op = currentRecipeData.unit_procedures[u].operations[o];
  var structure = computeBranchStructure(op);
  
  if (!structure.hasFork) {
    console.error('No branch exists');
    return;
  }
  
  var lastPhase = getLastPhaseInBranch(op, branch);
  if (!lastPhase) {
    console.error('No phases found in branch', branch);
    return;
  }
  
  // Find the link from lastPhase
  var linkIdx = -1;
  for (var i = 0; i < op.Links.length; i++) {
    if (op.Links[i].LinkType === 'ControlLink' && 
        op.Links[i].FromID && 
        op.Links[i].FromID.FromIDValue === lastPhase) {
      linkIdx = i;
      break;
    }
  }
  
  if (linkIdx < 0) {
    // Might be pointing to convergence
    console.error('Cannot find link from phase:', lastPhase);
    return;
  }
  
  // Create new phase
  var timestamp = Date.now();
  var newPhase = {
    label: 'Phase_' + timestamp,
    phase_type: type,
    _reId: 'phase_' + timestamp,
    params: []
  };
  
  op.phases.push(newPhase);
  
  // Update the link
  var oldLink = op.Links[linkIdx];
  var oldTarget = oldLink.ToID.ToIDValue;
  oldLink.ToID.ToIDValue = newPhase._reId;
  
  // Add new link from new phase to old target
  op.Links.push({
    ID: 'link_cl_' + timestamp,
    LinkType: 'ControlLink',
    FromID: { FromIDValue: newPhase._reId, FromType: 'Step', IDScope: 'Internal' },
    ToID: { ToIDValue: oldTarget, ToType: 'Step', IDScope: 'Internal' }
  });
  
  renderAll();
}

/**
 * CLOSE BRANCH - Create convergence at a specific phase.
 */
function closeBranchBefore(u, o, convergencePhaseLabel) {
  currentRecipeData._structuralEdit = true;
  var op = currentRecipeData.unit_procedures[u].operations[o];
  
  var structure = computeBranchStructure(op);
  if (!structure.hasFork) {
    alert('No open branch to close');
    return;
  }

  if (structure.hasConvergence) {
    alert('Branch already closed');
    return;
  }

  // Find all sources pointing to convergencePhaseLabel
  var sources = [];
  for (var i = op.Links.length - 1; i >= 0; i--) {
    var l = op.Links[i];
    if (l.LinkType === 'ControlLink' && 
        l.ToID && 
        l.ToID.ToIDValue === convergencePhaseLabel) {
      sources.push({ 
        FromIDValue: l.FromID.FromIDValue, 
        FromType: 'Step', 
        IDScope: 'Internal' 
      });
      op.Links.splice(i, 1);
    }
  }

  if (sources.length < 2) {
    alert('Need at least 2 sources for convergence, found: ' + sources.length);
    return;
  }

  // Create ParallelConvergent link with array FromID
  op.Links.push({
    ID: 'link_cv_' + Date.now(),
    LinkType: 'ParallelConvergent',
    FromID: sources,
    ToID: { ToIDValue: convergencePhaseLabel, ToType: 'Step', IDScope: 'Internal' }
  });

  renderAll();
}

// ===== LANE VIEW =====

// Stage 6S — Transition after any node. The selected node becomes the
// Transition's source and its original outgoing Step links become Transition outputs.
function transitionNodePhase(op,nodeId){for(var i=0;i<((op&&op.phases)||[]).length;i++){var phase=op.phases[i];if((phase._reId||phase.node_id)===nodeId)return {phase:phase,index:i};}return null;}
function transitionAfterNodeEligibility(op,nodeId){
  if(!op||!transitionNodePhase(op,nodeId))return {ok:false,reason:'Select a valid RecipeElement node.'};
  var outgoing=typeof nodeOutgoingStepLinks==='function'?nodeOutgoingStepLinks(op,nodeId):((op.links||[]).filter(function(link){return link.from_type==='Step'&&link.from_re_id===nodeId&&link.to_type==='Step'&&link.to_re_id;}));
  if(!outgoing.length)return {ok:false,reason:'The selected node has no outgoing Step link.'};
  return {ok:true,outgoing:outgoing};
}
function nextTransitionId(op){return nextFreeGraphNodeId(currentRecipeData);}
function setTransitionEndpoint(link,side,tid){
  if(side==='from'){link.from='TRANS:'+tid;link.from_id=tid;link.from_node='';link.from_re_id='';link.from_type='Transition';}
  else{link.to='TRANS:'+tid;link.to_id=tid;link.to_node='';link.to_re_id='';link.to_type='Transition';}
}
function addTransitionAfterNode(u,o,nodeId){
  var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],e=transitionAfterNodeEligibility(op,nodeId);
  if(!e.ok){console.warn('Transition creation not offered:',e.reason);return e;}
  if(!op.transitions)op.transitions={};var tid=nextTransitionId(op),selected=transitionNodePhase(op,nodeId);
  op.transitions[tid]='Ask( "Condition?" )';transitionMeta(op,tid);
  // Move each original Step route behind the transition, retaining type/destination.
  e.outgoing.forEach(function(link){setTransitionEndpoint(link,'from',tid);});
  op.links.push({type:'ControlLink',from:selected.phase.label||nodeId,from_id:'',from_node:nodeId,from_re_id:nodeId,from_type:'Step',to:'TRANS:'+tid,to_id:tid,to_node:'',to_re_id:'',to_type:'Transition'});
  op._graphEdit=true;currentRecipeData._structuralEdit=true;renderAll();return {ok:true,action:'transition-after-node',nodeId:nodeId,transitionId:tid,outgoingCount:e.outgoing.length};
}

// Stage 6U — AVEVA loop: selected Step -> Transition, Transition --Other--> explicit loop target,
// and Transition --ControlLink--> the selected node's original exit route(s).
var loopAfterNodeCtx=null;
function loopNodeDisplay(phase){return (phase.label||'')+' · Label: '+(phase._label||'—')+' · #'+(phase._reId||phase.node_id||'');}
function loopTargetOptions(op){return (op.phases||[]).map(function(phase){var id=phase._reId||phase.node_id;return '<option value="'+esc(id)+'">'+esc(loopNodeDisplay(phase))+'</option>';}).join('');}
function showLoopDialog(ctx,anchorText){
 var op=currentRecipeData&&currentRecipeData.unit_procedures[ctx.u]&&currentRecipeData.unit_procedures[ctx.u].operations[ctx.o];if(!op)return;loopAfterNodeCtx=ctx;
 document.getElementById('loopCreateAnchor').textContent=anchorText+'. The normal route remains the exit; choose where the Other loop leg returns.';
 var targets=document.getElementById('loopTarget');targets.innerHTML=loopTargetOptions(op);targets.value=ctx.defaultTarget||'';document.getElementById('loopCondition').value='AskDoneBy( "Repeat?" )';document.getElementById('loopCreateError').textContent='';document.getElementById('loopCreateOverlay').style.display='block';document.getElementById('loopCreateDialog').style.display='block';
}
function showLoopAfterNodeDialog(u,o,nodeId){var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],e=transitionAfterNodeEligibility(op,nodeId),selected=transitionNodePhase(op,nodeId);if(!e.ok||!selected)return;showLoopDialog({u:u,o:o,nodeId:nodeId,defaultTarget:nodeId},'After '+loopNodeDisplay(selected.phase));}
function showLoopAfterTransitionDialog(u,o,tid){var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],exits=transitionExitLinks(op,tid),source=transitionSourceNode(op,tid);if(!op||!exits.length)return;showLoopDialog({u:u,o:o,transitionId:tid,defaultTarget:source},'Configure yes/no loop-back on Transition #'+tid);}
function cancelLoopAfterNodeDialog(){var a=document.getElementById('loopCreateOverlay'),b=document.getElementById('loopCreateDialog');if(a)a.style.display='none';if(b)b.style.display='none';loopAfterNodeCtx=null;}
function confirmLoopAfterNode(){if(!loopAfterNodeCtx)return;var c=loopAfterNodeCtx,targetId=document.getElementById('loopTarget').value,condition=document.getElementById('loopCondition').value;var result=c.transitionId?addLoopAfterTransition(c.u,c.o,c.transitionId,targetId,condition):addLoopAfterNode(c.u,c.o,c.nodeId,targetId,condition);if(!result.ok){document.getElementById('loopCreateError').textContent=result.reason||'Loop was not created.';return;}cancelLoopAfterNodeDialog();}
function addLoopAfterNode(u,o,nodeId,targetId,condition){
  var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],e=transitionAfterNodeEligibility(op,nodeId),selected=transitionNodePhase(op,nodeId),target=transitionNodePhase(op,targetId);
  if(!e.ok||!selected)return e.ok?{ok:false,reason:'Select a valid loop source.'}:e;
  if(!target)return {ok:false,reason:'Choose a loop-back target in this operation.'};
  if(!op.transitions)op.transitions={};var tid=nextTransitionId(op);op.transitions[tid]=condition||'AskDoneBy( "Repeat?" )';transitionMeta(op,tid);
  // Preserve every pre-existing exit exactly, then add AVEVA's separate Other loop leg.
  e.outgoing.forEach(function(link){setTransitionEndpoint(link,'from',tid);});
  op.links.push({type:'ControlLink',from:selected.phase.label||nodeId,from_id:'',from_node:nodeId,from_re_id:nodeId,from_type:'Step',to:'TRANS:'+tid,to_id:tid,to_node:'',to_re_id:'',to_type:'Transition'});
  op.links.push({type:'Other',from:'TRANS:'+tid,from_id:tid,from_node:'',from_re_id:'',from_type:'Transition',to:target.phase.label||targetId,to_id:'',to_node:targetId,to_re_id:targetId,to_type:'Step'});
  op._graphEdit=true;currentRecipeData._structuralEdit=true;renderAll();return {ok:true,action:'loop-after-node',nodeId:nodeId,targetId:targetId,transitionId:tid,outgoingCount:e.outgoing.length};
}
function addLoopAfterTransition(u,o,tid,targetId,condition){
 var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],target=transitionNodePhase(op,targetId),exits=transitionExitLinks(op,tid);if(!op||!target)return {ok:false,reason:'Choose a loop-back target in this operation.'};if(!exits.length)return {ok:false,reason:'The Transition has no normal Step exit.'};
 // Existing Transition remains the decision/ask; add one Other leg only. Its ControlLink exit(s) are untouched.
 if((op.links||[]).some(function(link){return link.type==='Other'&&link.from_type==='Transition'&&link.from_id===tid;}))return {ok:false,reason:'This Transition already has a loop-back leg.'};
 op.links.push({type:'Other',from:'TRANS:'+tid,from_id:tid,from_node:'',from_re_id:'',from_type:'Transition',to:target.phase.label||targetId,to_id:'',to_node:targetId,to_re_id:targetId,to_type:'Step'});op._graphEdit=true;currentRecipeData._structuralEdit=true;renderAll();return {ok:true,action:'loop-after-transition',transitionId:tid,targetId:targetId};
}
function updPhaseMeta(u,o,p,key,value){var phase=currentRecipeData.unit_procedures[u].operations[o].phases[p];if(!phase)return;phase[key]=value;currentRecipeData._structuralEdit=true;}


// Stage 6V — Transitions are first-class ProcedureLogic nodes in the editor.
function transitionInputs(op,tid){return ((op&&op.links)||[]).filter(function(l){return l.to_type==='Transition'&&l.to_id===tid;});}
function transitionExitLinks(op,tid){return ((op&&op.links)||[]).filter(function(l){return l.from_type==='Transition'&&l.from_id===tid&&l.type!=='Other'&&l.to_type==='Step'&&l.to_re_id;});}
function transitionSourceNode(op,tid){var a=transitionInputs(op,tid).filter(function(l){return l.from_type==='Step'&&l.from_re_id;});return a.length===1?a[0].from_re_id:'';}
function startTransitionNodeAdd(u,o,tid,type){if(typeof showPhasePicker==='function')showPhasePicker(u,o,-1,type,'transition:'+tid);}
function addTransitionAfterTransition(u,o,tid){
 var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],exits=transitionExitLinks(op,tid);if(!op||!exits.length){console.warn('Transition insertion unavailable: no normal forward route.');return {ok:false,reason:'This Transition has no normal forward route.'};}if(!op.transitions)op.transitions={};var next=nextTransitionId(op);op.transitions[next]='Ask( "Condition?" )';transitionMeta(op,next);exits.forEach(function(link){setTransitionEndpoint(link,'from',next);});op.links.push({type:'ControlLink',from:'TRANS:'+tid,from_id:tid,from_node:'',from_re_id:'',from_type:'Transition',to:'TRANS:'+next,to_id:next,to_node:'',to_re_id:'',to_type:'Transition'});op._graphEdit=true;currentRecipeData._structuralEdit=true;renderAll();return {ok:true,transitionId:next};
}
function ddTransitionNode(u,o,tid){
 return '<div class="act-more node-more" onclick="toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for transition '+esc(tid)+'">⋮</button><div class="dropdown"><div class="dd-label">Transition · #'+esc(tid)+'</div><div class="dd-item" onclick="startTransitionNodeAdd('+u+','+o+',\''+esc(tid)+'\',\'Process\')">Insert Process Phase after this Transition</div><div class="dd-item" onclick="startTransitionNodeAdd('+u+','+o+',\''+esc(tid)+'\',\'Transfer\')">Insert Transfer after this Transition</div><div class="dd-item" onclick="startTransitionNodeAdd('+u+','+o+',\''+esc(tid)+'\',\'AllocateProcess\')">Insert Allocate Process after this Transition</div><div class="dd-item" onclick="startTransitionNodeAdd('+u+','+o+',\''+esc(tid)+'\',\'ReleaseProcess\')">Insert Release Process after this Transition</div><div class="dd-item" onclick="startTransitionNodeAdd('+u+','+o+',\''+esc(tid)+'\',\'AllocateTransfer\')">Insert Allocate Transfer after this Transition</div><div class="dd-item" onclick="startTransitionNodeAdd('+u+','+o+',\''+esc(tid)+'\',\'ReleaseTransfer\')">Insert Release Transfer after this Transition</div><div class="dd-sep"></div><div class="dd-item" onclick="addTransitionAfterTransition('+u+','+o+',\''+esc(tid)+'\')">◆ Insert Transition after this Transition</div><div class="dd-item" onclick="showLoopAfterTransitionDialog('+u+','+o+',\''+esc(tid)+'\')">↺ Create loop after this Transition</div><div class="dd-item" onclick="showBranchAfterTransitionDialog('+u+','+o+',\''+esc(tid)+'\')">⑂ Create branch after this Transition</div></div></div>';
}
function insertItemAfterTransition(op,tid,newPhase){
 var exits=transitionExitLinks(op,tid);if(!exits.length)return {ok:false,reason:'This Transition has no onward Step exit to insert into.'};
 exits.forEach(function(link){branchSetEndpoint(link,'from',newPhase);});
 op.links.push({type:'ControlLink',from:'TRANS:'+tid,from_id:tid,from_node:'',from_reId:'',from_re_id:'',from_type:'Transition',to:newPhase.label||newPhase._reId,to_id:'',to_node:newPhase._reId,to_re_id:newPhase._reId,to_type:'Step'});
 var source=transitionSourceNode(op,tid),at=-1;for(var i=0;i<(op.phases||[]).length;i++)if((op.phases[i]._reId||op.phases[i].node_id)===source){at=i;break;}
 op.phases.splice(at<0?op.phases.length:at+1,0,newPhase);op._graphEdit=true;return {ok:true,action:'insert-after-transition',transitionId:tid,phaseId:newPhase._reId,outgoingCount:exits.length};
}
function transitionNodeHtml(op,u,o,tid){
 var condition=(op.transitions&&op.transitions[tid])||'',meta=transitionMeta(op,tid),loops=((op.links||[]).filter(function(l){return l.type==='Other'&&l.from_type==='Transition'&&l.from_id===tid;})),move=typeof transitionMoveCapabilities==='function'?transitionMoveCapabilities(op,tid):{up:false,down:false,fixed:!!loops.length};
 var controls='';if(editMode){if(!move.fixed)controls+='<span class="graph-drag-handle" draggable="true" title="Drag Transition to a normal-route boundary" ondragstart="transitionMoveDragStart(event,'+u+','+o+',\''+esc(tid)+'\')" ondragend="graphMoveDragEnd(event)">⠿</span>';if(move.up)controls+='<button class="act-btn" title="Move earlier on normal route" onclick="moveTransition('+u+','+o+',\''+esc(tid)+'\',-1)">▲</button>';if(move.down)controls+='<button class="act-btn" title="Move later on normal route" onclick="moveTransition('+u+','+o+',\''+esc(tid)+'\',1)">▼</button>';controls+=ddTransitionNode(u,o,tid);}
 var transitionMetaId='v1210aTransition_'+u+'_'+o+'_'+tid;var h='<div class="lane-ph lane-transition-node" data-transition-id="'+esc(tid)+'"><div class="v1210a-card-head"><div class="lph-name v1210a-title">◆ '+esc(meta.name||'Transition')+' <span class="node-id-badge" title="AVEVA Transition ID">#'+esc(tid)+'</span></div>'+(editMode?'<div class="act-bar v1210a-actions"><button class="act-btn" title="Show or hide Transition details" onclick="v1210aToggle(\''+transitionMetaId+'\',event)">?</button>'+controls+'</div>':'')+'</div>';
 h+='<div id="'+transitionMetaId+'" class="v1210a-transition-meta">';
 h+='<div class="lph-parent">Label / node ID '+(editMode?'<input class="inline-edit" value="'+esc(tid)+'" onchange="renameTransitionId('+u+','+o+',\''+esc(tid)+'\',this.value)">':esc(tid))+' · Name '+(editMode?'<input class="inline-edit" value="'+esc(meta.name||'')+'" onchange="updTransitionMeta('+u+','+o+',\''+esc(tid)+'\',\'name\',this.value)">':esc(meta.name||''))+'</div>';
 h+='<div class="lph-parent">Condition '+(editMode?'<input class="inline-edit" value="'+esc(condition)+'" onchange="updTransCond('+u+','+o+',\''+esc(tid)+'\',this.value)">':esc(condition))+'</div>';
 h+='<div class="lph-desc">Description '+(editMode?'<input class="inline-edit" value="'+esc(meta.description||'')+'" onchange="updTransitionMeta('+u+','+o+',\''+esc(tid)+'\',\'description\',this.value)">':esc(meta.description||'—'))+'</div></div>';
 loops.forEach(function(loop){var target=lanePhaseById(op,loop.to_re_id);h+='<div class="lph-desc">↺ Loop to '+esc(target?loopNodeDisplay(target.phase):('#'+loop.to_re_id))+'</div>';});
 return h+'</div>';
}
// Render the complete normal Transition chain after a Step. A newly inserted
// Transition may follow another Transition (Step → T4 → T1 → Step); only the
// Other loop-back is excluded from this forward traversal.
function transitionNodesAfterStep(op,nodeId,u,o){
 var links=(op&&op.links)||[],first=links.filter(function(l){return l.from_type==='Step'&&l.from_re_id===nodeId&&l.to_type==='Transition'&&l.to_id&&l.type!=='Other';})[0],seen={},h='',tid=first&&first.to_id;
 while(tid&&!seen[tid]){seen[tid]=true;h+=transitionNodeHtml(op,u,o,tid);var next=links.filter(function(l){return l.from_type==='Transition'&&l.from_id===tid&&l.to_type==='Transition'&&l.to_id&&l.type!=='Other';})[0];tid=next&&next.to_id;}
 return h;
}


/* === Consolidated Transition-to-Fork drop boundary === */
function transitionForkDropHtml(u,o,tid){return '<div class="graph-drop-boundary v124-transition-fork-drop" data-transition-boundary="'+esc(String(tid))+'" ondragover="v1212DragOver(event)" ondragleave="v1212DragLeave(event)" ondrop="v1212Drop(event,'+u+','+o+')">Drop Phase here <span>after Transition #'+esc(String(tid))+' · before Fork</span></div>';}
var _consolidatedTransitionNodeHtml=transitionNodeHtml;
transitionNodeHtml=function(op,u,o,tid){var h=_consolidatedTransitionNodeHtml(op,u,o,tid),outs=(op&&op.links||[]).filter(function(l){return l.from_type==='Transition'&&String(l.from_id)===String(tid)&&l.type!=='Other';}),isFork=outs.length>0&&outs.every(function(l){return l.type==='ParallelDivergent'||l.type==='SerialDivergent';});return h+(editMode&&isFork?transitionForkDropHtml(u,o,tid):'');};
