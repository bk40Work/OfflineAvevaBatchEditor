// picker.js - Phase/Transfer picker panel
// Shows available phases from MODEL when adding to a recipe

var pickerCtx = null; // {u, o, afterIdx, type}

function showPhasePicker(u,o,afterIdx,type,branchTargetId){
  pickerCtx={u:u,o:o,afterIdx:afterIdx,type:type,branchTargetId:branchTargetId||''};
  var processInstance=currentRecipeData.unit_procedures[u].process;
  var proc=processClassForInstance(processInstance)||processInstance;
  var picker=document.getElementById('phasePicker');
  var body=document.getElementById('pickerBody');
  var title=document.getElementById('pickerTitle');
  var h='';

  if(type==='Process'){
    title.textContent=(pickerCtx.branchTargetId?'Insert Process Phase after selected position':'Insert Process Phase')+' ('+processInstance+' · '+proc+')';
    // Show all phases available in this process class
    var phases=MODEL.processes[proc]?MODEL.processes[proc].phases:{};
    var phaseNames=Object.keys(phases).sort();
    if(!phaseNames.length){h='<div style="padding:12px;color:#999;text-align:center">No phases defined for '+proc+'</div>'}
    else{
      for(var i=0;i<phaseNames.length;i++){
        var pn=phaseNames[i];
        var params=phases[pn];
        var paramStr=params.map(function(p){return p.name}).join(', ');
        h+='<div class="phase-picker-item proc" onclick="pickPhase(\''+esc(pn)+'\',\''+esc(processInstance)+'\',\'Process\')">';
        h+='<div class="pk-name">'+esc(pn)+'</div>';
        if(paramStr)h+='<div class="pk-params">'+esc(paramStr)+'</div>';
        h+='</div>';
      }
    }
  } else if(type==='AllocateProcess'||type==='ReleaseProcess'){
    var actionName=type==='AllocateProcess'?'Allocate Process':'Release Process';
    title.textContent=actionName;
    var instances=recipeProcessInstances();
    if(!instances.length)h='<div style="padding:12px;color:#999;text-align:center">No process instances defined in recipe</div>';
    else instances.forEach(function(instance){h+='<div class="phase-picker-item proc" onclick="pickPhase(\''+esc(actionName)+'\',\''+esc(instance.name)+'\',\''+type+'\')"><div class="pk-name">'+esc(instance.name)+'</div><div class="pk-params">'+esc(instance.processClass)+(instance.unit?' · '+esc(instance.unit):' · no fixed unit')+' · '+esc(instance.mode||'Auto')+'</div></div>';});
  } else if(type==='AllocateTransfer'||type==='ReleaseTransfer'){
    var transferAction=type==='AllocateTransfer'?'Allocate Transfer':'Release Transfer';
    title.textContent=transferAction;
    var transferChoices=[];(currentRecipeData.equipment_transfers||[]).forEach(function(transfer){var list=Array.isArray(transfer.instances)&&transfer.instances.length?transfer.instances:[{name:transfer.name,source:transfer.source,dest:transfer.dest}];list.forEach(function(instance){transferChoices.push({name:instance.name||transfer.name,source:instance.source||'',dest:instance.dest||'',className:transfer.name||''});});});
    if(!transferChoices.length)h='<div style="padding:12px;color:#999;text-align:center">No transfer instances defined in recipe</div>';
    else transferChoices.forEach(function(instance){h+='<div class="phase-picker-item xfer" onclick="pickPhase(\''+esc(transferAction)+'\',\''+esc(instance.name)+'\',\''+type+'\')"><div class="pk-name">'+esc(instance.name)+'</div><div class="pk-params">'+esc(instance.source)+' → '+esc(instance.dest)+'</div></div>';});
  } else if(type==='Transfer'){
    title.textContent=pickerCtx.branchTargetId?'Insert Transfer after selected position':'Insert Transfer';
    // Show available transfers for this process
    var availXfers=currentRecipeData.equipment_transfers;
    if(!availXfers.length){h='<div style="padding:12px;color:#999;text-align:center">No transfers defined in recipe</div>'}
    else{
      for(var xi=0;xi<availXfers.length;xi++){
        var xfer=availXfers[xi];
        var xferPhases=MODEL.transfer_phases[xfer.name]?Object.keys(MODEL.transfer_phases[xfer.name]).sort():[];
        h+='<div class="phase-picker-sub">'+esc(xfer.name)+' ('+esc(xfer.source)+'\u2192'+esc(xfer.dest)+')</div>';
        if(xferPhases.length){
          for(var pi=0;pi<xferPhases.length;pi++){
            var pn2=xferPhases[pi];
            var params2=MODEL.transfer_phases[xfer.name][pn2];
            var paramStr2=params2.map(function(p){return p.name}).join(', ');
            h+='<div class="phase-picker-item xfer" onclick="pickPhase(\''+esc(pn2)+'\',\''+esc(xfer.name)+'\',\'Transfer\')">';
            h+='<div class="pk-name">'+esc(pn2)+'</div>';
            if(paramStr2)h+='<div class="pk-params">'+esc(paramStr2)+'</div>';
            h+='</div>';
          }
        } else {
          h+='<div class="phase-picker-item xfer" onclick="pickPhase(\'transfer\',\''+esc(xfer.name)+'\',\'Transfer\')">';
          h+='<div class="pk-name">transfer</div><div class="pk-params">(default)</div></div>';
        }
      }
    }
  }

  body.innerHTML=h;
  picker.classList.add('show');

  // Resource allocation is a deliberate selection: centre it clear of phase navigation controls.
  if(type==='AllocateProcess'||type==='ReleaseProcess'||type==='AllocateTransfer'||type==='ReleaseTransfer'){
    picker.style.top='50%';picker.style.left='50%';picker.style.transform='translate(-50%,-50%)';
    return;
  }
  picker.style.transform='';

  // Measure after the picker is visible. Use visualViewport where available:
  // it represents the usable area above browser/OS task bars and soft keyboards.
  var trigEl=window.event?window.event.target:null;
  window.requestAnimationFrame(function(){
    var viewport=window.visualViewport||{width:window.innerWidth,height:window.innerHeight,offsetLeft:0,offsetTop:0};
    var pad=10,usableTop=viewport.offsetTop+pad,usableBottom=viewport.offsetTop+viewport.height-pad;
    var width=Math.max(280,picker.offsetWidth||290),naturalHeight=Math.min(picker.scrollHeight||400,400);
    var rect=trigEl&&trigEl.getBoundingClientRect?trigEl.getBoundingClientRect():null;
    var left=rect?rect.left:viewport.offsetLeft+(viewport.width-width)/2;
    left=Math.max(viewport.offsetLeft+pad,Math.min(left,viewport.offsetLeft+viewport.width-width-pad));
    var below=rect?usableBottom-rect.bottom-6:Math.floor(viewport.height*.7);
    var above=rect?rect.top-usableTop-6:Math.floor(viewport.height*.2);
    var openUp=rect&&below<naturalHeight&&above>below;
    var available=Math.max(150,openUp?above:below);
    var height=Math.min(naturalHeight,available);
    picker.style.maxHeight=height+'px';
    var bodyEl=document.getElementById('pickerBody');
    if(bodyEl)bodyEl.style.maxHeight=Math.max(100,height-42)+'px';
    var top;
    if(rect)top=openUp?Math.max(usableTop,rect.top-height-6):Math.min(usableBottom-height,rect.bottom+6);
    else top=usableTop+Math.max(0,(viewport.height-height)/2);
    picker.style.top=top+'px';picker.style.left=left+'px';
  });
}

function pickPhase(phaseName,parentInstance,phaseType){
  if(!pickerCtx)return;
  if(currentRecipeData)currentRecipeData._structuralEdit=true;
  var u=pickerCtx.u,o=pickerCtx.o,afterIdx=pickerCtx.afterIdx;
  var processInstance=currentRecipeData.unit_procedures[u].process;
  var proc=processClassForInstance(processInstance)||processInstance;

  // Build the phase with correct params from the selected instance's process class.
  var params=[];
  if(phaseType==='Transfer'){
    var tpPhases=MODEL.transfer_phases[parentInstance];
    if(tpPhases&&tpPhases[phaseName]){
      params=tpPhases[phaseName].map(function(p){return{name:p.name,value:'',param_type:p.type==='Material'?'ProcessInput':'ProcessParameter',material_id:''}});
    }
  } else {
    var procPhases=MODEL.processes[proc]?MODEL.processes[proc].phases:{};
    if(procPhases[phaseName]){
      params=procPhases[phaseName].map(function(p){return{name:p.name,value:'',param_type:p.type==='Material'?'ProcessInput':'ProcessParameter',material_id:''}});
    }
  }

  var ph={
    label:phaseName,
    phase_type:phaseType,
    parent_instance:parentInstance,
    description:'',
    params:params,
    _label:'',
    _reId:allocateRecipeElementId()
  };

  var op=currentRecipeData.unit_procedures[u].operations[o],inserted=false;
  if(pickerCtx.branchTargetId){
    var isTransitionTarget=pickerCtx.branchTargetId.indexOf('transition:')===0, isJoinTarget=pickerCtx.branchTargetId.indexOf('join:')===0;
    var nodeResult=isJoinTarget&&typeof insertItemAfterJoin==='function'?insertItemAfterJoin(op,pickerCtx.branchTargetId.substring(5),ph):(isTransitionTarget&&typeof insertItemAfterTransition==='function'?insertItemAfterTransition(op,pickerCtx.branchTargetId.substring(11),ph):(typeof insertItemAfterNode==='function'?insertItemAfterNode(op,pickerCtx.branchTargetId,ph):{ok:false,reason:'Node insertion is unavailable.'}));
    if(!nodeResult.ok){alert('Could not add after the selected '+(isJoinTarget?'join':'node')+': '+(nodeResult.reason||'unknown graph error'));return;}
    inserted=true;
  }else inserted=afterIdx>=0 ? insertPhaseAfter(op,op.phases[afterIdx]._reId,ph) : appendPhaseToOperation(op,ph);
  if(!inserted){alert('Could not add the phase because its control-link insertion point could not be found.');return;}

  closePicker();
  renderAll();
}

function closePicker(){
  document.getElementById('phasePicker').classList.remove('show');
  pickerCtx=null;
}

// Close picker on outside click (with guard to prevent same-tick close)
document.addEventListener('click',function(e){
  if(!pickerCtx) return;
  if(!e.target.closest('.phase-picker')&&!e.target.closest('.dd-item')&&!e.target.closest('.dropdown')&&!e.target.closest('.act-btn')){
    closePicker();
  }
});
