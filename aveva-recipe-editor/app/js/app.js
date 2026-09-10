// app.js - Application initialisation, state management, and core functions
// Loads config from model_SC.js and materials_SC.js (via script tags)

// ===== CONFIG BRIDGE =====
// MODEL_DATA and MATERIALS_DATA are loaded from config/*.js script tags
var MODEL = MODEL_DATA;
var MATS_DB = {};
var MAT_LIST = [];

(function initConfig() {
  // Build MATS_DB lookup from MATERIALS_DATA array
  for (var i = 0; i < MATERIALS_DATA.length; i++) {
    var m = MATERIALS_DATA[i];
    MATS_DB[m.id] = {name: m.name, code: m.code, type: m.type || '', ai: m.ai || false};
  }
  MAT_LIST = MATERIALS_DATA.map(function(m) { return {id: m.id, name: m.name, code: m.code, type: m.type || '', ai: m.ai || false}; });
})();

// ===== UTILITY =====
function matName(id){return MATS_DB[id]?MATS_DB[id].name:''}
function matCode(id){return MATS_DB[id]?MATS_DB[id].code:''}
function esc(s){return s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
function truncNum(v){if(!v)return v;try{var f=parseFloat(v);if(isNaN(f))return v;if(f===Math.floor(f))return String(Math.floor(f));return f.toFixed(10).replace(/0+$/,'').replace(/\.$/,'');}catch(e){return v;}}

// ===== STATE =====
var currentRecipeData=null;
var editMode=false;
var laneSelectedUP=0,laneSelectedOp=0;
var activeDropdown = null;

// AVEVA RecipeElement IDs are runtime identities. They are allocated above the
// maximum parsed ID and are not derived from display names.
function allocateRecipeElementId(){
  if(!currentRecipeData)return '';
  if(!currentRecipeData._nextId)currentRecipeData._nextId=(currentRecipeData._maxId||0)+1;
  var id=String(currentRecipeData._nextId++);
  currentRecipeData._maxId=Math.max(currentRecipeData._maxId||0,parseInt(id,10)||0);
  return id;
}

// ===== FILE HANDLING =====
document.addEventListener('dragover',function(e){e.preventDefault()});
document.addEventListener('drop',function(e){e.preventDefault()});
var dz=document.getElementById('dropZone'),fi=document.getElementById('fileInput');
dz.addEventListener('dragover',function(e){e.preventDefault();e.stopPropagation();dz.classList.add('dragover')});
dz.addEventListener('dragleave',function(e){e.preventDefault();dz.classList.remove('dragover')});
dz.addEventListener('drop',function(e){e.preventDefault();e.stopPropagation();dz.classList.remove('dragover');if(e.dataTransfer.files.length)handleFile(e.dataTransfer.files[0])});
dz.addEventListener('click',function(){fi.click()});
fi.addEventListener('change',function(e){if(e.target.files.length)handleFile(e.target.files[0])});
function handleFile(f){if(!f)return;var r=new FileReader();r.onload=function(ev){var parsed=parseB2MML(ev.target.result);if(parsed){currentRecipeData=parsed;var inherited=typeof seedInheritedTransfersForProcessClasses==='function'&&seedInheritedTransfersForProcessClasses();if(inherited)currentRecipeData._recipeCollectionEdit=true;renderAll()}};r.readAsText(f)}


// ===== VIEW & EDIT TOGGLES =====
function toggleEdit(){
  editMode=!editMode;
  document.body.classList.toggle('edit-mode',editMode);
  var btn=document.getElementById('btnEdit');
  btn.classList.toggle('active',editMode);
  btn.textContent=editMode?'\u2714 Editing':'\u270E Edit';
  renderAll();
}

// ===== LANE-ONLY VIEW =====
function expandAll(){}
function collapseAll(){}

// ===== SIDEBAR =====
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('open');renderSidebar()}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('open')}
function renderSidebar(){
  if(!currentRecipeData){document.getElementById('sidebarBody').innerHTML='<p style="color:#999">Load a recipe first</p>';return}
  var d=currentRecipeData;
  var h='<h4 style="color:#36398E;margin-bottom:8px">Equipment</h4><div style="margin-bottom:12px">';
  h+='<strong style="font-size:0.8em;color:#009F3C">Processes:</strong><br>';
  for(var i=0;i<d.equipment_requirements.length;i++){var req=d.equipment_requirements[i];var names=(typeof requirementInstances==='function'?requirementInstances(req):[]).map(function(instance){return instance.name;});h+='<span class="eq-chip">'+req.id+(names.length?' · '+names.join(', '):'')+'</span>';}
  h+='<br><strong style="font-size:0.8em;color:#36398E;margin-top:6px;display:inline-block">Transfers:</strong><br>';
  for(var i=0;i<d.equipment_transfers.length;i++){var et=d.equipment_transfers[i];h+='<span class="eq-chip transfer">'+et.name+'</span>'}
  h+='</div><h4 style="color:#36398E;margin-bottom:8px;margin-top:16px">Materials ('+d.materials.length+')</h4>';
  h+='<table style="width:100%;font-size:0.8em;border-collapse:collapse">';
  for(var i=0;i<d.materials.length;i++){var m=d.materials[i];h+='<tr style="border-bottom:1px solid #eee"><td style="padding:3px">'+matName(m.material_id)+'</td><td style="padding:3px;color:#009F3C;font-weight:500">'+(m.quantity||'0')+'</td></tr>'}
  h+='</table>';
  document.getElementById('sidebarBody').innerHTML=h;
}

// ===== RENDER ALL =====

// ===== RENDER ALL =====
function renderAll(){
  updateVersionBadge();
  if(!currentRecipeData)return;
  try{
    renderHeader();renderEquipment();renderMaterials();renderLaneView();
  }catch(e){console.error('renderAll error:',e);var lane=document.getElementById('lanePhList');if(lane)lane.innerHTML='<div style="color:red;padding:20px">Render error: '+esc(e.message)+'</div>';}
}


// ===== NEW RECIPE =====
function showNewRecipeDialog(){
  document.getElementById('newRecipeOverlay').style.display='block';
  document.getElementById('newRecipeDialog').style.display='block';
  document.getElementById('nr_id').value='';
  document.getElementById('nr_desc').value='';
  document.getElementById('nr_product').value='';
  document.getElementById('nr_batch').value='';
  document.getElementById('nr_error').style.display='none';
  setTimeout(function(){document.getElementById('nr_id').focus();},100);
}

function cancelNewRecipeDialog(){
  document.getElementById('newRecipeOverlay').style.display='none';
  document.getElementById('newRecipeDialog').style.display='none';
}

function confirmNewRecipe(){
  var id=document.getElementById('nr_id').value.trim();
  var desc=document.getElementById('nr_desc').value.trim();
  var product=document.getElementById('nr_product').value.trim();
  var batch=parseFloat(document.getElementById('nr_batch').value)||0;
  var errEl=document.getElementById('nr_error');

  if(!id){
    errEl.textContent='Recipe ID is required.';
    errEl.style.display='block';
    document.getElementById('nr_id').focus();
    return;
  }

  cancelNewRecipeDialog();

  // Build blank recipe data structure matching parseB2MML output
  currentRecipeData={
    id:id,
    description:desc,
    product_id:product,
    product_name:'',
    batch_size_nominal:batch?String(batch):'',
    batch_size_uom:'kg',
    approved_production:false,
    approved_test:false,
    source_xml:null,
    equipment_requirements:[],
    equipment_transfers:[],
    materials:[],
    unit_procedures:[]
  };

  // A blank recipe has no Unit Procedure yet. Reset any selection retained from a prior recipe.
  laneSelectedUP=0;
  laneSelectedOp=0;

  // Enter edit mode and render
  editMode=true;
  document.body.classList.add('edit-mode');
  document.getElementById('btnEdit').classList.add('active');
  document.getElementById('btnEdit').textContent='âœŽ Editing';
  renderAll();
}


// ===== VERSION BADGE & REVISION HISTORY =====
function updateVersionBadge(){
  var badge=document.getElementById('versionBadge');
  var label=document.getElementById('versionLabel');
  if(!badge||!label)return;
  if(!currentRecipeData){badge.style.display='none';return;}
  var logs=currentRecipeData.modification_logs||[];
  var ver=logs.length;
  badge.style.display='block';
  label.textContent='V'+ver;
}

function showHistory(){
  if(!currentRecipeData)return;
  var logs=currentRecipeData.modification_logs||[];
  document.getElementById('hist_recipe_id').textContent=currentRecipeData.id||'';
  var body=document.getElementById('histBody');
  if(!logs.length){
    body.innerHTML='<div style="padding:24px;text-align:center;color:#999;font-style:italic">No revision history recorded</div>';
  } else {
    var h='<table style="width:100%;border-collapse:collapse;font-size:0.85em">';
    h+='<thead><tr style="background:#36398E;color:#fff">';
    h+='<th style="padding:8px 12px;text-align:left;font-weight:500;width:40px">#</th>';
    h+='<th style="padding:8px 12px;text-align:left;font-weight:500;width:140px">Date</th>';
    h+='<th style="padding:8px 12px;text-align:left;font-weight:500;width:80px">Author</th>';
    h+='<th style="padding:8px 12px;text-align:left;font-weight:500">Comment</th>';
    h+='</tr></thead><tbody>';
    // Show newest first
    for(var i=logs.length-1;i>=0;i--){
      var log=logs[i];
      var ver=i+1;
      var isLatest=(i===logs.length-1);
      var rowBg=isLatest?'background:#e8f5e9':'background:'+(i%2===0?'#fff':'#f8f9fa');
      var dateStr=log.date?log.date.replace('T',' ').substring(0,16):'';
      h+='<tr style="'+rowBg+';border-bottom:1px solid #eee">';
      h+='<td style="padding:8px 12px;font-weight:700;color:#36398E">V'+ver+(isLatest?' <span style="font-size:0.7em;background:#009F3C;color:#fff;padding:1px 5px;border-radius:3px;font-weight:500">CURRENT</span>':'')+'</td>';
      h+='<td style="padding:8px 12px;color:#666;font-size:0.9em">'+esc(dateStr)+'</td>';
      h+='<td style="padding:8px 12px;font-weight:500">'+esc(log.author||'')+'</td>';
      h+='<td style="padding:8px 12px;color:#444">'+esc(log.description||'(no comment)')+'</td>';
      h+='</tr>';
    }
    h+='</tbody></table>';
    body.innerHTML=h;
  }
  document.getElementById('histOverlay').style.display='block';
  var dlg=document.getElementById('histDialog');
  dlg.style.display='flex';
}

function closeHistory(){
  document.getElementById('histOverlay').style.display='none';
  document.getElementById('histDialog').style.display='none';
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded', function() {
  // No demo loaded by default - user must open a file
  // If you want a demo: uncomment next line and add a DEMO var
  // currentRecipeData = DEMO; renderAll();
});