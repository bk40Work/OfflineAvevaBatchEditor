// materials.js - Bill of Materials rendering, usage tracking, autocomplete

// ===== MATERIAL HELPERS =====
function matName(id){return MATS_DB[id]?MATS_DB[id].name:''}
function matCode(id){return MATS_DB[id]?MATS_DB[id].code:''}

// ===== BOM RENDERING =====
function renderMaterials(){
  var d=currentRecipeData;var matUsage=buildMaterialUsage(d);
  var card=document.getElementById('cardMat');
  if(editMode)card.classList.remove('collapsed');

  var h='';
  if(editMode){
    h+='<table class="dt"><thead><tr><th>#</th><th>Material (type ID, name or code)</th><th>ID</th><th>Code</th><th>Qty/%</th><th>+/-</th><th>Type</th><th></th></tr></thead><tbody>';
    for(var i=0;i<d.materials.length;i++){var m=d.materials[i];var nm=matName(m.material_id);var cd=matCode(m.material_id);
      h+='<tr>';
      h+='<td>'+(i+1)+'</td>';
      h+='<td><div class="mat-ac"><input id="matAc'+i+'" value="'+esc(nm||m.material_id)+'" onfocus="openMatAc('+i+')" oninput="filterMatAc('+i+',this.value)" onblur="setTimeout(function(){closeMatAc('+i+')},200)" autocomplete="off" placeholder="Search..."></div></td>';
      h+='<td style="font-size:0.8em;color:#666">'+esc(m.material_id)+'</td>';
      h+='<td style="font-size:0.8em;color:#36398E">'+esc(cd)+'</td>';
      h+='<td><input class="inline-edit" value="'+(m.quantity||'')+'" onchange="updMatQty('+i+',this.value)" style="width:65px"></td>';
      h+='<td><input class="inline-edit" value="'+(m.high_dev||'1')+'" onchange="updMatDev('+i+',this.value)" style="width:40px"></td>';
      h+='<td><select onchange="updMatInterp('+i+',this.value)" style="font-size:0.8em"><option value="Equation"'+(m.data_interp!=='Constant'?' selected':'')+'>%</option><option value="Constant"'+(m.data_interp==='Constant'?' selected':'')+'>kg</option></select></td>';
      h+='<td><button class="act-btn danger" onclick="removeMaterial('+i+')">\u2716</button></td></tr>'}
    h+='</tbody></table>';
    h+='<button class="act-btn" onclick="addMaterial()" style="margin-top:6px">+ Add Material</button>';
  } else {
    h+='<table class="dt"><thead><tr><th>#</th><th>Material</th><th>Code</th><th>%/batch</th><th>kg (BOM)</th><th>kg (Used)</th><th>Status</th></tr></thead><tbody>';
    var bomTotalPct=0,bomTotalKg=0,usedTotalKg=0,errorCount=0;
    for(var i=0;i<d.materials.length;i++){var m=d.materials[i];var nm=matName(m.material_id);var cd=matCode(m.material_id);
      var bomVal=m.quantity?parseFloat(m.quantity):0;var isActual=(m.data_interp==='Constant');
      var pct=isActual?'(actual)':bomVal.toFixed(4)+'%';
      var bomKg=isActual?bomVal:(bomVal/100*parseFloat(d.batch_size_nominal||1));
      var allocs=matUsage[m.material_id]||[];var allocTotal=0;for(var ai=0;ai<allocs.length;ai++)allocTotal+=allocs[ai].value;
      var allocKg=isActual?allocTotal:(allocTotal/100*parseFloat(d.batch_size_nominal||1));
      var isOver=allocTotal>bomVal*1.001;var isUnder=allocTotal<bomVal*0.999&&allocs.length>0;
      var hasError=isOver||isUnder;if(hasError)errorCount++;
      var stCls=hasError?'mat-over':'mat-total';
      var stTxt=isOver?'\u26A0 Over':isUnder?'\u26A0 Under':'OK';
      if(!isActual){bomTotalPct+=bomVal;bomTotalKg+=bomKg}else{bomTotalKg+=bomKg}
      usedTotalKg+=allocKg;
      h+='<tr class="'+(hasError?'expandable over-allocated':'expandable')+'" onclick="toggleMatDetail(\'md'+i+'\')">';
      h+='<td>'+m.formula_id+'</td><td><span class="expand-icon">\u25B6</span><strong>'+(nm||m.material_id)+'</strong></td><td class="c-grey">'+cd+'</td>';
      h+='<td>'+pct+'</td><td>'+bomKg.toFixed(2)+'</td><td class="'+stCls+'">'+allocKg.toFixed(2)+'</td><td class="'+stCls+'">'+stTxt+' ('+allocs.length+')</td></tr>';
      h+='<tr class="mat-detail hidden" id="md'+i+'"><td colspan="7">';
      if(allocs.length){h+='<table style="width:100%;font-size:0.85em"><tr style="background:#f0f7f2"><th>UP</th><th>Op</th><th>Phase</th><th>Param</th><th>Value</th><th>kg</th></tr>';
        for(var ai=0;ai<allocs.length;ai++){var a=allocs[ai];var akg=isActual?a.value.toFixed(2):(a.value/100*parseFloat(d.batch_size_nominal||1)).toFixed(2);
          h+='<tr><td>'+a.up+'</td><td>'+a.op+'</td><td>'+a.phase+'</td><td>'+a.param+'</td><td>'+a.value+'</td><td>'+akg+'</td></tr>'}
        h+='<tr style="font-weight:600;background:#e8f5e9"><td colspan="4">TOTAL</td><td>'+allocTotal.toFixed(4)+'</td><td>'+allocKg.toFixed(2)+'</td></tr></table>'}
      else h+='<em class="c-grey">No allocations</em>';h+='</td></tr>'}
    // Totals row
    h+='<tr style="font-weight:700;background:#e8f5e9;border-top:2px solid #009F3C"><td colspan="3">TOTAL ('+d.materials.length+' materials)</td><td>'+bomTotalPct.toFixed(4)+'%</td><td>'+bomTotalKg.toFixed(2)+'</td><td'+(errorCount>0?' class="mat-over"':' class="mat-total"')+'>'+usedTotalKg.toFixed(2)+'</td><td'+(errorCount>0?' class="mat-over"':' class="mat-total"')+'>'+(errorCount>0?'\u26A0 '+errorCount+' error(s)':'\u2714 All OK')+'</td></tr>';
    h+='</tbody></table>';
  }
  document.getElementById('matBody').innerHTML=h;
}

function toggleMatDetail(id){var el=document.getElementById(id);if(el)el.classList.toggle('hidden')}
function buildMaterialUsage(d){var usage={};for(var u=0;u<d.unit_procedures.length;u++){var up=d.unit_procedures[u];for(var o=0;o<up.operations.length;o++){var op=up.operations[o];for(var p=0;p<op.phases.length;p++){var ph=op.phases[p];if(!ph.params)continue;for(var pi=0;pi<ph.params.length;pi++){var pm=ph.params[pi];if(pm.material_id){if(!usage[pm.material_id])usage[pm.material_id]=[];usage[pm.material_id].push({up:up.name,op:op.name,phase:ph.label,parent:ph.parent_instance,param:pm.name,value:parseFloat(pm.value)||0})}}}}}return usage}


// ===== RENDER RECIPE (List View) =====
// ===== DROPDOWN MENUS =====
var activeDropdown=null;
document.addEventListener('click',function(e){
  if(!e.target.closest('.act-more')){closeDropdowns()}
});

// ===== MATERIAL EDIT FUNCTIONS =====
// === Material edit functions ===
function addMaterial(){currentRecipeData.materials.push({formula_id:String(currentRecipeData.materials.length+1),material_id:'',quantity:'',high_dev:'1',low_dev:'1',data_interp:'Equation'});renderAll()}
function removeMaterial(i){currentRecipeData.materials.splice(i,1);renderAll()}
function updMatId(i,v){currentRecipeData.materials[i].material_id=v}
function updMatQty(i,v){currentRecipeData.materials[i].quantity=v}
function updMatDev(i,v){currentRecipeData.materials[i].high_dev=v;currentRecipeData.materials[i].low_dev=v}
function updMatInterp(i,v){currentRecipeData.materials[i].data_interp=v}
// === Material Autocomplete ===
var matAcListEl=null;
var matAcIdx=-1; // which material row is active

function openMatAc(idx){
  matAcIdx=idx;
  var inp=document.getElementById('matAc'+idx);
  filterMatAc(idx,inp.value);
}

function closeMatAc(idx){
  if(matAcListEl){matAcListEl.remove();matAcListEl=null}
  matAcIdx=-1;
}

function filterMatAc(idx,query){
  // Remove existing list
  if(matAcListEl){matAcListEl.remove();matAcListEl=null}

  var q=query.toLowerCase().trim();
  var results=[];

  if(q.length===0){
    // Show all (limited to 50)
    results=MAT_LIST.slice(0,50);
  } else {
    // Filter across id, name, code
    for(var i=0;i<MAT_LIST.length;i++){
      var m=MAT_LIST[i];
      var idMatch=m.id.toLowerCase().indexOf(q)>=0;
      var nameMatch=m.name.toLowerCase().indexOf(q)>=0;
      var codeMatch=m.code.toLowerCase().indexOf(q)>=0;
      if(idMatch||nameMatch||codeMatch){
        results.push({id:m.id,name:m.name,code:m.code,matchField:idMatch?'id':nameMatch?'name':'code'});
        if(results.length>=30)break;
      }
    }
  }

  // Create dropdown
  var list=document.createElement('div');
  list.className='mat-ac-list show';

  // Header
  list.innerHTML='<div class="mat-ac-hdr"><span>ID</span><span>Name</span><span>Code</span></div>';

  if(results.length===0){
    list.innerHTML+='<div class="mat-ac-empty">No matches</div>';
  } else {
    for(var i=0;i<results.length;i++){
      var r=results[i];
      var idStr=highlightMatch(r.id,q);
      var nameStr=highlightMatch(r.name,q);
      var codeStr=highlightMatch(r.code,q);
      list.innerHTML+='<div class="mat-ac-item" onmousedown="pickMat('+idx+',\''+esc(r.id)+'\')"><span class="ac-id">'+idStr+'</span><span class="ac-name">'+nameStr+'</span><span class="ac-code">'+codeStr+'</span></div>';
    }
  }

  // Position relative to input
  var inp=document.getElementById('matAc'+idx);
  var rect=inp.getBoundingClientRect();
  list.style.top=(rect.bottom+2)+'px';
  list.style.left=rect.left+'px';
  list.style.minWidth=Math.max(350,rect.width)+'px';

  document.body.appendChild(list);
  matAcListEl=list;
}

function highlightMatch(text,query){
  if(!query||!text)return esc(text||'');
  var lower=text.toLowerCase();
  var idx=lower.indexOf(query);
  if(idx<0)return esc(text);
  return esc(text.substring(0,idx))+'<span class="ac-match">'+esc(text.substring(idx,idx+query.length))+'</span>'+esc(text.substring(idx+query.length));
}

function pickMat(idx,matId){
  currentRecipeData.materials[idx].material_id=matId;
  closeMatAc(idx);
  renderMaterials(); // re-render to show updated ID/code columns
}



// Inline editing
