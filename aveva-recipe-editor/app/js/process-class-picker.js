// process-class-picker.js - Explicit process-class selection for Equipment Requirements.
var processClassPickerOpen=false;
var processClassPickerChoices=[];
function showProcessClassPicker(classes){
  var picker=document.getElementById('processClassPicker'),body=document.getElementById('processClassPickerBody');
  if(!picker||!body)return;
  var list=Array.isArray(classes)?classes:availableProcessClasses();
  processClassPickerChoices=list.slice();
  var h='<div style="padding:7px 8px;color:#666;font-size:0.84em">Select a process class to add. No class is added until you select it.</div>';
  list.forEach(function(processClass){
    h+='<div class="phase-picker-item proc" onclick="addSelectedEqProc(\''+esc(processClass)+'\')"><div class="pk-name">'+esc(processClass)+'</div></div>';
  });
  body.innerHTML=h;
  // Unlike the phase picker, this picker has no triggering row to anchor to.
  // Centre it explicitly so a fixed-position element cannot open below the viewport.
  picker.style.top='50%';
  picker.style.left='50%';
  picker.style.transform='translate(-50%,-50%)';
  picker.classList.add('show');
  processClassPickerOpen=true;
}
function closeProcessClassPicker(){
  var picker=document.getElementById('processClassPicker');
  if(picker)picker.classList.remove('show');
  processClassPickerOpen=false;
  processClassPickerChoices=[];
}
document.addEventListener('click',function(event){
  if(!processClassPickerOpen)return;
  if(!event.target.closest('.phase-picker')&&!event.target.closest('.act-btn'))closeProcessClassPicker();
});
