// viewer.js - Recipe rendering (List View)
// Renders header, equipment, recipe hierarchy (UPs > Ops > Phases)

// ===== HEADER =====
function renderHeader(){
  var d=currentRecipeData;
  var h='<div class="card-grid">';
  if(editMode){
    h+='<div class="card-item"><label>Recipe ID</label><input class="inline-edit" value="'+esc(d.id)+'" onchange="currentRecipeData.id=this.value" style="width:100%"></div>';
    h+='<div class="card-item"><label>Description</label><input class="inline-edit" value="'+esc(d.description)+'" onchange="currentRecipeData.description=this.value" style="width:100%"></div>';
    h+='<div class="card-item"><label>Product ID</label><input class="inline-edit" value="'+esc(d.product_id)+'" onchange="currentRecipeData.product_id=this.value" style="width:100%"></div>';
    h+='<div class="card-item"><label>Product Name</label><input class="inline-edit" value="'+esc(d.product_name)+'" onchange="currentRecipeData.product_name=this.value" style="width:100%"></div>';
    h+='<div class="card-item"><label>Batch Size (kg)</label><input class="inline-edit" type="number" value="'+esc(d.batch_size_nominal)+'" onchange="currentRecipeData.batch_size_nominal=this.value" style="width:100%"></div>';
    h+='<div class="card-item"><label>Approved Prod</label><select class="inline-select" onchange="currentRecipeData.approved_production=this.value"><option value="true"'+(d.approved_production==='true'?' selected':'')+'>true</option><option value="false"'+(d.approved_production!=='true'?' selected':'')+'>false</option></select></div>';
    h+='<div class="card-item"><label>Approved Test</label><select class="inline-select" onchange="currentRecipeData.approved_test=this.value"><option value="true"'+(d.approved_test==='true'?' selected':'')+'>true</option><option value="false"'+(d.approved_test!=='true'?' selected':'')+'>false</option></select></div>';
  } else {
    h+='<div class="card-item"><label>Recipe ID</label><span>'+d.id+'</span></div>';
    h+='<div class="card-item"><label>Description</label><span>'+d.description+'</span></div>';
    h+='<div class="card-item"><label>Product</label><span>'+d.product_name+' ('+d.product_id+')</span></div>';
    h+='<div class="card-item"><label>Batch Size</label><span>'+d.batch_size_nominal+' kg</span></div>';
    h+='<div class="card-item"><label>Approved</label><span>Prod: '+d.approved_production+' | Test: '+d.approved_test+'</span></div>';
  }
  h+='</div>';
  document.getElementById('headerGrid').innerHTML=h;
  // Auto-expand header card in edit mode
  var card=document.getElementById('cardHeader');
  if(editMode)card.classList.remove('collapsed');
}


// ===== EQUIPMENT =====
function renderEquipment(){
  var d=currentRecipeData;var h='';
  // Equipment card auto-expands in edit mode.
  var card=document.getElementById('cardEq');
  if(editMode)card.classList.remove('collapsed');

  function unitOptions(processClass,instance){
    var units=validUnitsForProcessClass(processClass),out='<option value=""'+(!instance.unit?' selected':'')+'>— no fixed unit —</option>';
    // Preserve a loaded unit even when its configured model is unavailable, but
    // do not offer it as a selectable value for a newly edited instance.
    if(instance.unit&&units.indexOf(instance.unit)<0)out+='<option value="'+esc(instance.unit)+'" selected disabled>'+esc(instance.unit)+' (not in current site model)</option>';
    units.forEach(function(unit){out+='<option value="'+esc(unit)+'"'+(unit===instance.unit?' selected':'')+'>'+esc(unit)+'</option>';});
    return out;
  }
  function transferInstances(transfer){
    if(Array.isArray(transfer.instances)&&transfer.instances.length)return transfer.instances;
    return [{name:transfer.name||'',source:transfer.source||'',dest:transfer.dest||''}];
  }

  h+='<div style="margin-bottom:10px"><strong style="font-size:0.8em;color:#009F3C">Process classes</strong>';
  if(editMode)h+='<button class="act-btn" onclick="addEqProc()" style="margin-left:6px">+ Process</button>';
  if(!d.equipment_requirements.length)h+='<div style="color:#999;padding:7px 0">No process classes selected.</div>';
  for(var i=0;i<d.equipment_requirements.length;i++){
    var req=d.equipment_requirements[i],processClass=req.id||req.process||'',instances=requirementInstances(req);
    h+='<div class="eq-process-card" style="margin:7px 0;padding:7px 8px;border:1px solid #dfe5df;border-radius:4px">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><strong style="color:#009F3C">'+esc(processClass)+'</strong>';
    if(editMode)h+='<span><button class="act-btn" onclick="addEqInstance('+i+')">+ Instance</button><button class="act-btn danger" onclick="removeEqProc('+i+')" style="margin-left:4px">✖ Process</button></span>';
    h+='</div>';
    if(!instances.length)h+='<div style="color:#999;font-size:0.85em;margin-top:6px">No process instances.</div>';
    for(var j=0;j<instances.length;j++){
      var instance=instances[j],unitText=instance.unit||'No fixed unit',mode=instance.mode||'Auto';
      h+='<div class="eq-instance-row" style="margin-top:6px;padding-top:6px;border-top:1px solid #edf0ed">';
      if(editMode){
        h+='<label style="font-size:0.76em;color:#666">Instance <input class="inline-edit" style="width:130px" value="'+esc(instance.name)+'" onchange="updEqInstanceName('+i+','+j+',this.value)"></label> ';
        h+='<label style="font-size:0.76em;color:#666">Unit <select class="inline-select" onchange="updEqInstanceUnit('+i+','+j+',this.value)">'+unitOptions(processClass,instance)+'</select></label> ';
        h+='<label style="font-size:0.76em;color:#666">Selection <select class="inline-select" onchange="updEqInstanceMode('+i+','+j+',this.value)"><option value="Auto"'+(mode==='Auto'?' selected':'')+'>Auto</option><option value="Manual"'+(mode==='Manual'?' selected':'')+'>Manual</option></select></label>';
        if(processInstanceIsReferenced(instance.name)){
          var alternatives=recipeProcessInstances().filter(function(candidate){return candidate.processClass===processClass&&candidate.name!==instance.name;});
          if(alternatives.length){h+='<label style="font-size:0.76em;color:#666">Reassign to <select class="inline-select" onchange="reassignProcessInstance('+i+','+j+',this.value);this.value=\'\'"><option value="">— select —</option>';alternatives.forEach(function(candidate){h+='<option value="'+esc(candidate.name)+'">'+esc(candidate.name)+'</option>';});h+='</select></label>';}
        }
        h+='<button class="act-btn danger" onclick="removeEqInstance('+i+','+j+')" style="margin-left:5px">✖</button>';
      } else {
        h+='<span class="eq-chip">'+esc(instance.name)+'</span><span style="font-size:0.8em;color:#666">'+esc(mode)+' · '+esc(unitText)+'</span>';
      }
      h+='</div>';
    }
    h+='</div>';
  }
  h+='</div>';

  h+='<div style="margin-top:11px"><strong style="font-size:0.8em;color:#36398E">Transfer instances</strong>';
  if(!d.equipment_transfers.length)h+='<div style="color:#999;padding:7px 0">No transfer instances in the recipe.</div>';
  for(var ti=0;ti<d.equipment_transfers.length;ti++){
    var transfer=d.equipment_transfers[ti],instancesForTransfer=transferInstances(transfer);
    for(var tj=0;tj<instancesForTransfer.length;tj++){
      var transferInstance=instancesForTransfer[tj];
      h+='<div class="eq-chip transfer" style="display:inline-block;margin-top:5px"><strong>'+esc(transferInstance.name||transfer.name)+'</strong> ';
      h+='<span class="c-grey">('+esc(transferInstance.source)+' → '+esc(transferInstance.dest)+')</span>';
      h+='<div style="font-size:0.78em;color:#667">class: '+esc(transfer.source)+'→'+esc(transfer.dest)+'</div></div>';
    }
  }
  h+='</div>';
  document.getElementById('eqBody').innerHTML=h;
}


// ===== SINGLE PHASE RENDERER =====
function renderSinglePhase(ph,upProcess,uIdx,oIdx,pIdx){
  var isX=ph.phase_type==='Transfer';
  var isA=(ph.phase_type||'').indexOf('Allocate')>=0||(ph.phase_type||'').indexOf('Release')>=0;
  var cls='pf-ph';if(isA)cls+=' alloc';else if(isX)cls+=' xfer';
  var badge='';if(isX)badge='<span class="badge b-xfer">XFER</span>';
  else if(isA){var allocBadge=ph.phase_type==='AllocateProcess'?'ALLOC PROC':ph.phase_type==='ReleaseProcess'?'RELEASE PROC':ph.phase_type==='AllocateTransfer'?'ALLOC XFER':'RELEASE XFER';badge='<span class="badge b-alloc">'+allocBadge+'</span>';}
  else badge='<span class="badge b-proc">PROC</span>';
  var h='<div class="'+cls+'">';
  // Phase name + inline actions
  h+='<div style="display:flex;justify-content:space-between;align-items:flex-start">';
  h+='<div class="pf-ph-name">'+ph.label+badge+'</div>';
  // Edit mode action bar
  h+='<div class="act-bar">';
  h+='<button class="act-btn" onclick="movePh('+uIdx+','+oIdx+','+pIdx+',-1)" title="Move up">\u25B2</button>';
  h+='<button class="act-btn" onclick="movePh('+uIdx+','+oIdx+','+pIdx+',1)" title="Move down">\u25BC</button>';
  h+='<button class="act-btn danger" onclick="removePh('+uIdx+','+oIdx+','+pIdx+')" title="Delete">\u2716</button>';
  h+=ddPh(uIdx,oIdx,pIdx);
  h+='</div></div>';
  if(ph.description)h+='<div class="pf-ph-desc'+(editMode?' editable':'')+'"'+(editMode?' onclick="editPhDesc('+uIdx+','+oIdx+','+pIdx+',this)"':'')+'>'+ph.description+'</div>';
  else if(editMode)h+='<div class="pf-ph-desc editable" onclick="editPhDesc('+uIdx+','+oIdx+','+pIdx+',this)" style="color:#ccc">+ description</div>';
  if(ph.parent_instance&&(isA||ph.parent_instance!==upProcess))h+='<div class="pf-ph-parent">'+(isA?'Target: ':'\u2197 ')+esc(ph.parent_instance)+'</div>';
  if(ph.params&&ph.params.length>0){h+='<div class="pf-ph-params">';
    for(var i=0;i<ph.params.length;i++){var p=ph.params[i];var v=p.value||'\u2014';
      var isMat=p.param_type==='ProcessInput'||p.material_id;
      if(editMode){
        h+='<div class="pf-param"><span class="pn">'+p.name+'</span> = ';
        if(isMat){
          // Material autocomplete + qty input side by side
          var mn=matName(p.material_id)||p.material_id||'';
          h+='<div class="mat-ac" style="display:inline-block;width:120px;vertical-align:middle"><input id="phMatAc_'+uIdx+'_'+oIdx+'_'+pIdx+'_'+i+'" value="'+esc(mn)+'" onfocus="openPhMatAc('+uIdx+','+oIdx+','+pIdx+','+i+')" oninput="filterPhMatAc('+uIdx+','+oIdx+','+pIdx+','+i+',this.value)" onblur="setTimeout(function(){closePhMatAc()},200)" autocomplete="off" placeholder="material..." style="width:100%;font-size:0.9em;padding:2px 4px"></div> ';
        }
        h+='<input class="inline-edit" value="'+esc(p.value||'')+'" onchange="updPVal('+uIdx+','+oIdx+','+pIdx+','+i+',this.value)" style="width:55px" placeholder="qty">';
        h+='</div>';
      } else {
        var ms='';
        if(p.material_id){var mn2=matName(p.material_id);ms='<span class="pm">['+(mn2||p.material_id)+']</span> '}
        h+='<div class="pf-param"><span class="pn">'+p.name+'</span> = '+ms+'<span class="pv">'+v+'</span></div>';
      }}
    h+='</div>'}
  h+='</div>';return h;
}



// ===== RECIPE LIST VIEW =====
function renderRecipe(){
  if(!currentRecipeData){document.getElementById('recipeView').innerHTML='';return}
  var d=currentRecipeData;var h='';
  if(d.unit_procedures.length===0){
    if(editMode){
      h+='<div style="padding:24px;text-align:center;background:#fff;border:2px dashed #009F3C;border-radius:8px;margin:16px 0">';
      h+='<p style="color:#36398E;font-size:1em;margin-bottom:12px">Recipe has no unit procedures</p>';
      h+='<button class="act-btn" style="padding:8px 16px;font-size:0.9em" onclick="addFirstUP()">+ Add Unit Procedure</button>';
      h+='</div>';
    } else {
      h+='<div style="padding:16px;text-align:center;color:#999;font-style:italic">No unit procedures defined</div>';
    }
    document.getElementById('recipeView').innerHTML=h;return;
  }
  for(var idx=0;idx<d.unit_procedures.length;idx++){var up=d.unit_procedures[idx];
    if(idx>0)h+='<div class="seq-arrow">\u25BC</div>';
    var tph=0;for(var oi=0;oi<up.operations.length;oi++)tph+=up.operations[oi].phases.length;
    h+='<div class="pf-up open"><div class="pf-up-hdr" onclick="this.parentElement.classList.toggle(\'open\')">';
    h+='<h4><span class="caret">\u25B6</span>'+(idx+1)+'. '+(editMode?'<span class="editable" onclick="event.stopPropagation();editUPName('+idx+',this)">'+esc(up.name)+'</span>':esc(up.name))+'</h4>';
    h+='<div style="display:flex;align-items:center;gap:8px">';
    h+='<span class="tag">'+up.process+'</span>';
    h+='<span style="color:#c8c9e8;font-size:0.75em">'+up.operations.length+' ops / '+tph+' ph</span>';
    // UP action bar (edit mode)
    h+='<div class="act-bar" onclick="event.stopPropagation()">';
    h+='<button class="act-btn" onclick="moveUP('+idx+',-1)" title="Move up">\u25B2</button>';
    h+='<button class="act-btn" onclick="moveUP('+idx+',1)" title="Move down">\u25BC</button>';
    h+=ddUP(idx);
    h+='</div>';
    h+='</div></div>';
    h+='<div class="pf-up-body">';
    for(var oi=0;oi<up.operations.length;oi++){var op=up.operations[oi];
      h+='<div class="pf-op open"><div class="pf-op-hdr" onclick="this.parentElement.classList.toggle(\'open\')">';
      h+='<div style="display:flex;align-items:center"><span class="caret">\u25B6</span><span class="pf-op-title">'+(editMode?'<span class="editable" onclick="event.stopPropagation();editOpName('+idx+','+oi+',this)">'+esc(op.name)+'</span>':esc(op.name));
      var hasP=false,hasL=false,hasT=false;
      if(op.links){for(var li=0;li<op.links.length;li++){if(op.links[li].type==='ParallelDivergent')hasP=true;if(op.links[li].type==='Other')hasL=true}}
      if(op.transitions&&Object.keys(op.transitions).length>0)hasT=true;
      if(hasP)h+=' <span class="badge b-proc">PARALLEL</span>';if(hasL)h+=' <span class="badge b-xfer">LOOP</span>';if(hasT)h+=' <span class="badge b-alloc">TRANSITIONS</span>';
      h+='</span></div>';
      h+='<div style="display:flex;align-items:center;gap:6px">';
      h+='<span style="color:#999;font-size:0.72em">'+op.phases.length+' ph</span>';
      // Op action bar
      h+='<div class="act-bar" onclick="event.stopPropagation()">';
      h+='<button class="act-btn" onclick="moveOp('+idx+','+oi+',-1)" title="Move up">\u25B2</button>';
      h+='<button class="act-btn" onclick="moveOp('+idx+','+oi+',1)" title="Move down">\u25BC</button>';
      h+=ddOp(idx,oi);
      h+='</div>';
      h+='</div></div>';
      h+='<div class="pf-op-body">';
      // Empty operation - show placeholder with add buttons
      if(op.phases.length===0){
        if(editMode){
          h+='<div style="padding:12px 16px;text-align:center;color:#999;border:1px dashed #ddd;border-radius:4px;margin:4px 16px">';
          h+='<span style="font-size:0.85em">No phases</span><br>';
          h+='<button class="act-btn" style="margin:6px 4px;padding:4px 10px" onclick="addPhaseToOp('+idx+','+oi+',\'Process\')">+ Phase</button>';
          h+='<button class="act-btn" style="margin:6px 4px;padding:4px 10px" onclick="addPhaseToOp('+idx+','+oi+',\'Transfer\')">+ Transfer</button>';
          h+='</div>';
        } else {
          h+='<div style="padding:8px 16px;color:#999;font-size:0.82em;font-style:italic">Empty operation</div>';
        }
      }
      // Dynamic branch rendering. Uses stable RecipeElement IDs (node_id) when available,
      // because AVEVA recipes may legitimately reuse the same visible phase name.
      var viewerTransAfter={},viewerLoops=[];
      if(op.links){for(var vli=0;vli<op.links.length;vli++){var vlk=op.links[vli];
        if(vlk.type==='Other'&&vlk.from_type==='Transition')viewerLoops.push(vlk);
        if(vlk.to_type==='Transition')viewerTransAfter[vlk.from]={cond:op.transitions?op.transitions[vlk.to_id]||'':'',tid:vlk.to_id};
      }}
      var viewerRegions=(typeof collectLaneBranchRegions==='function')?collectLaneBranchRegions(op):[];
      var viewerStarts={},viewerMembers={};
      for(var vri=0;vri<viewerRegions.length;vri++){
        var vr=viewerRegions[vri];
        for(var vti=0;vti<vr.targets.length;vti++)viewerStarts[vr.targets[vti]]=vr;
        for(var vla=0;vla<vr.lanes.length;vla++)for(var vpl=0;vpl<vr.lanes[vla].phases.length;vpl++)viewerMembers[vr.lanes[vla].phases[vpl]]=vr;
      }
      var viewerRendered=[];
      for(var pi=0;pi<op.phases.length;pi++){var ph=op.phases[pi],viewerKey=(typeof laneNodeKey==='function'?laneNodeKey(ph):ph.node_id||ph.label),viewerStart=viewerStarts[viewerKey],viewerMember=viewerMembers[viewerKey];
        if(viewerStart){
          if(viewerRendered.indexOf(viewerStart)<0){
            h+='<div class="parallel-box dynamic-branch-box">';
            for(var vbi=0;vbi<viewerStart.lanes.length;vbi++){
              var vbranch=viewerStart.lanes[vbi];h+='<div class="branch"><div class="branch-label">Branch '+vbranch.label+'</div>';
              for(var vpi=0;vpi<op.phases.length;vpi++){var vphase=op.phases[vpi],vkey=(typeof laneNodeKey==='function'?laneNodeKey(vphase):vphase.node_id||vphase.label);if(vbranch.phases.indexOf(vkey)>=0)h+=renderSinglePhase(vphase,up.process,idx,oi,vpi);}
              h+='</div>';
            }
            h+='</div>';viewerRendered.push(viewerStart);
          }
          continue;
        }
        if(viewerMember)continue;
        h+=renderSinglePhase(ph,up.process,idx,oi,pi);
        if(viewerTransAfter[ph.label]){var vta=viewerTransAfter[ph.label],vcond=vta.cond,vtid=vta.tid,visLoop=viewerLoops.some(function(lb){return lb.from_id===vtid});
          if(editMode){var vinput='<input class="inline-edit" value="'+esc(vcond)+'" onchange="updTransCond('+idx+','+oi+',\''+vtid+'\',this.value)" onclick="event.stopPropagation()" style="width:250px;margin:2px 0">';h+='<div class="flow-ann '+(visLoop?'loop':'trans')+'">'+(visLoop?'↺ Loop: ':'◆ Transition: ')+vinput+'</div>'}
          else h+='<div class="flow-ann '+(visLoop?'loop':'trans')+'">◆ '+esc(vcond)+(visLoop?'<br>↺ YES=loop | NO=continue':'')+'</div>';
        }
      }
      h+='</div></div>'}
    h+='</div></div>'}
  document.getElementById('recipeView').innerHTML=h;
}


// ===== EDIT ACTIONS =====