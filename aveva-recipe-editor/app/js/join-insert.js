// join-insert.js — every convergent branch boundary is one selectable insertion point.
// It is intentionally independent of nesting depth. A new item is inserted between
// the convergence and its former successor: lane joins -> new item -> former target.
function joinInsertRegion(op,forkSource){
  var regions=[];
  if(typeof collectNestedBranchRegions==='function')regions=regions.concat(collectNestedBranchRegions(op)||[]);
  if(typeof collectReadOnlyBranchRegions==='function')regions=regions.concat(collectReadOnlyBranchRegions(op)||[]);
  for(var i=0;i<regions.length;i++)if(String(regions[i].forkSource)===String(forkSource))return regions[i];
  return null;
}
function joinInsertLinks(op,region){
  return ((op&&op.links)||[]).filter(function(link){
    return link.type===region.joinType&&link.to_type==='Step'&&String(link.to_re_id)===String(region.joinTarget);
  });
}
function insertItemAfterJoin(op,forkSource,newPhase){
  var region=joinInsertRegion(op,forkSource);if(!region)return {ok:false,reason:'This branch join could not be resolved.'};
  var joins=joinInsertLinks(op,region);if(joins.length<2)return {ok:false,reason:'The branch join has no complete convergent links.'};
  var old=joins[0],formerTarget={to:old.to,to_id:old.to_id,to_re_id:old.to_re_id};if(!formerTarget.to_re_id)return {ok:false,reason:'The branch join has no continuation endpoint.'};
  // Move every lane's convergent target to the new item, then continue from it
  // to the original target. This is the same topology at outer and nested levels.
  joins.forEach(function(link){branchSetEndpoint(link,'to',newPhase);});
  op.links.push(branchCreateStepLink('ControlLink',newPhase,formerTarget.to,formerTarget.to_id,formerTarget.to_re_id));
  var target=branchLanePhase(op,formerTarget.to_re_id),at=target?target.index:(op.phases||[]).length;
  op.phases.splice(at,0,newPhase);
  if(typeof normaliseOperationStepEndpoints==='function')normaliseOperationStepEndpoints(op);
  op._graphEdit=true;
  return {ok:true,action:'insert-after-join',forkSource:String(forkSource),phaseId:newPhase._reId,formerTarget:formerTarget.to_re_id,joinCount:joins.length};
}
function startJoinAdd(u,o,forkSource,type){
  var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o];
  if(!op||!joinInsertRegion(op,forkSource)||typeof showPhasePicker!=='function')return;
  showPhasePicker(u,o,-1,type,'join:'+String(forkSource));
}
function joinInsertMenuHtml(u,o,forkSource){
  return '<div class="act-more node-more" onclick="toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for branch join" title="Add after this join">⋮</button><div class="dropdown"><div class="dd-label">Branch join</div><div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+String(forkSource)+'\',\'Process\')">Add Process Phase after this join</div><div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+String(forkSource)+'\',\'Transfer\')">Add Transfer after this join</div><div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+String(forkSource)+'\',\'AllocateProcess\')">Allocate Process after this join</div><div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+String(forkSource)+'\',\'ReleaseProcess\')">Release Process after this join</div><div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+String(forkSource)+'\',\'AllocateTransfer\')">Allocate Transfer after this join</div><div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+String(forkSource)+'\',\'ReleaseTransfer\')">Release Transfer after this join</div></div></div>';
}
