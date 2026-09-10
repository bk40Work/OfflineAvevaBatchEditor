// equipment-instances.js - Recipe process class and process instance helpers
// A requirement is {id: processClass, instances: [{name, unit, mode}]}.
// Unit Procedures and process phases store an instance name, never a class ID.

function equipmentRequirements(){
  return currentRecipeData && currentRecipeData.equipment_requirements ? currentRecipeData.equipment_requirements : [];
}

function requirementInstances(req){
  if(!req)return [];
  if(Array.isArray(req.instances))return req.instances;
  // Compatibility for in-memory data created by pre-Stage-5 builds.
  if(req.process||req.id)return [{name:req.process||req.id,unit:req.unit||'',mode:req.mode||'Auto'}];
  return [];
}

function recipeProcessClasses(){
  return equipmentRequirements().map(function(req){return req.id||req.process||'';}).filter(function(value,index,values){return value&&values.indexOf(value)===index;});
}

function recipeProcessInstances(){
  var out=[];
  equipmentRequirements().forEach(function(req){
    requirementInstances(req).forEach(function(instance){
      if(instance&&instance.name)out.push({name:instance.name,processClass:req.id||req.process||'',unit:instance.unit||'',mode:instance.mode||'Auto'});
    });
  });
  return out;
}

function processClassForInstance(instanceName){
  var found=recipeProcessInstances().filter(function(instance){return instance.name===instanceName;})[0];
  return found?found.processClass:'';
}

function processInstanceByName(instanceName){
  var found=recipeProcessInstances().filter(function(instance){return instance.name===instanceName;})[0];
  return found||null;
}

function validUnitsForProcessClass(processClass){
  var processModel=(typeof MODEL!=='undefined'&&MODEL.processes)?MODEL.processes[processClass]:null;
  return processModel&&Array.isArray(processModel.units)?processModel.units.slice():[];
}

function isValidUnitForProcessClass(processClass,unit){
  return !unit||validUnitsForProcessClass(processClass).indexOf(unit)>=0;
}

function nextProcessInstanceName(processClass){
  var used=recipeProcessInstances().map(function(instance){return instance.name;});
  if(used.indexOf(processClass)<0)return processClass;
  var suffix=2;
  while(used.indexOf(processClass+suffix)>=0)suffix++;
  return processClass+suffix;
}

function defaultUPProcess(){
  var instances=recipeProcessInstances();
  return instances.length?instances[0].name:'';
}

function currentInstanceReferenceNames(){
  var refs=[];
  if(!currentRecipeData)return refs;
  (currentRecipeData.unit_procedures||[]).forEach(function(up){
    if(up.process)refs.push(up.process);
    (up.operations||[]).forEach(function(op){
      (op.phases||[]).forEach(function(phase){if(phase.parent_instance)refs.push(phase.parent_instance);});
    });
  });
  (currentRecipeData.equipment_transfers||[]).forEach(function(transfer){
    (transfer.instances||[]).forEach(function(instance){
      if(instance.source)refs.push(instance.source);
      if(instance.dest)refs.push(instance.dest);
    });
  });
  return refs;
}

function processInstanceIsReferenced(instanceName){
  if(currentInstanceReferenceNames().indexOf(instanceName)>=0)return true;
  // The parser retains raw formula ParentInstance references so an unmodelled
  // reference cannot be orphaned by deletion or rename.
  return !!(currentRecipeData&&currentRecipeData._raw_instance_references&&currentRecipeData._raw_instance_references.indexOf(instanceName)>=0);
}

function processClassIsReferenced(processClass){
  var instances=recipeProcessInstances().filter(function(instance){return instance.processClass===processClass;});
  if(instances.some(function(instance){return processInstanceIsReferenced(instance.name);} ))return true;
  return (currentRecipeData&&currentRecipeData.equipment_transfers||[]).some(function(transfer){return transfer.source===processClass||transfer.dest===processClass;});
}


// Seed global transfer classes from MODEL when process classes are added.
// A transfer instance is seeded only when both endpoint classes have a valid
// recipe instance. Existing transfers/instances are never removed or changed.
function seedInheritedTransfersForProcessClasses(){
  if(!currentRecipeData||typeof MODEL==='undefined'||!Array.isArray(MODEL.transfers))return false;
  var changed=false;
  if(!Array.isArray(currentRecipeData.equipment_transfers))currentRecipeData.equipment_transfers=[];
  var classes=recipeProcessClasses();
  MODEL.transfers.forEach(function(modelTransfer){
    if(!modelTransfer||!modelTransfer.name||!modelTransfer.source||!modelTransfer.dest)return;
    // Transfer inheritance is class-based. Selecting either endpoint class
    // immediately creates the configured global transfer and its fixed route.
    if(classes.indexOf(modelTransfer.source)<0&&classes.indexOf(modelTransfer.dest)<0)return;
    var transfer=currentRecipeData.equipment_transfers.filter(function(item){return item.name===modelTransfer.name&&item.source===modelTransfer.source&&item.dest===modelTransfer.dest;})[0];
    if(!transfer){transfer={name:modelTransfer.name,source:modelTransfer.source,dest:modelTransfer.dest,instances:[]};currentRecipeData.equipment_transfers.push(transfer);changed=true;}
    if(!Array.isArray(transfer.instances))transfer.instances=[];
    // The configured process-class route is the TransferInstance route; it is
    // intentionally seeded even if the counterpart class is not yet present.
    var exists=transfer.instances.some(function(instance){return instance.source===modelTransfer.source&&instance.dest===modelTransfer.dest;});
    if(!exists){transfer.instances.push({name:modelTransfer.name,source:modelTransfer.source,dest:modelTransfer.dest});changed=true;}
  });
  return changed;
}
