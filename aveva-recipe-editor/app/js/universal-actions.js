// universal-actions.js — common action surface for every selectable continuation point.
// Actions remain visible; unsupported deletion is blocked with a graph reason.
function graphDeleteBlocked(kind){
  alert('Delete is not yet applied here: no graph-safe deletion path has been supplied for a '+kind+'. The item and its links were left unchanged.');
}
function joinCreateContinuation(op,forkSource){
  var region=joinInsertRegion(op,forkSource);if(!region)return {ok:false,reason:'This branch join could not be resolved.'};
  var joins=joinInsertLinks(op,region);if(joins.length<2)return {ok:false,reason:'The branch join has no complete convergent links.'};
  var old=joins[0],former={to:old.to,to_id:old.to_id,to_re_id:old.to_re_id};if(!former.to_re_id)return {ok:false,reason:'The branch join has no continuation endpoint.'};
  var continuation=newBranchDummy();continuation._branchJoinConnector=true;
  joins.forEach(function(link){branchSetEndpoint(link,'to',continuation);});
  op.links.push(branchCreateStepLink('ControlLink',continuation,former.to,former.to_id,former.to_re_id));
  var target=branchLanePhase(op,former.to_re_id),at=target?target.index:(op.phases||[]).length;
  op.phases.splice(at,0,continuation);normaliseOperationStepEndpoints(op);op._graphEdit=true;
  return {ok:true,continuationId:continuation._reId,formerTarget:former.to_re_id};
}
function showBranchAfterJoinDialog(u,o,forkSource){
  var op=currentRecipeData&&currentRecipeData.unit_procedures[u]&&currentRecipeData.unit_procedures[u].operations[o],region=joinInsertRegion(op,forkSource);if(!op||!region)return;
  branchCreateCtx={u:u,o:o,joinFork:String(forkSource),joinBranch:true};
  document.getElementById('branchCreateAnchor').textContent='After this Join; AVEVA continuation position will become the source of the new branch.';
  document.getElementById('branchCreateError').textContent='';document.getElementById('branchCreateCount').value='2';document.querySelector('input[name="branchCreateMode"][value="All"]').checked=true;renderBranchCreateLanes();document.getElementById('branchCreateOverlay').style.display='block';document.getElementById('branchCreateDialog').style.display='block';
}
function universalJoinMenuHtml(u,o,forkSource){
 return '<div class="act-more node-more" onclick="toggleDD(this,event)"><button class="act-more-btn" type="button" aria-label="Actions for branch join">⋮</button><div class="dropdown"><div class="dd-label">Node · Join</div>'
 +'<div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+forkSource+'\',\'Process\')">Insert Process Phase after this node</div><div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+forkSource+'\',\'Transfer\')">Insert Transfer after this node</div><div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+forkSource+'\',\'AllocateProcess\')">Insert Allocate Process after this node</div><div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+forkSource+'\',\'ReleaseProcess\')">Insert Release Process after this node</div><div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+forkSource+'\',\'AllocateTransfer\')">Insert Allocate Transfer after this node</div><div class="dd-item" onclick="startJoinAdd('+u+','+o+',\''+forkSource+'\',\'ReleaseTransfer\')">Insert Release Transfer after this node</div>'
 +'<div class="dd-item" onclick="alert(\'Add Transition at a Join is visible but awaits the same continuation-dialog adapter as branch/loop. No graph was changed.\')">◆ Add Transition after this node</div><div class="dd-item" onclick="alert(\'Add loop at a Join is visible but awaits the same continuation-dialog adapter as branch/loop. No graph was changed.\')">↺ Add loop (yes/no Transition)</div><div class="dd-item" onclick="showBranchAfterJoinDialog('+u+','+o+',\''+forkSource+'\')">⑂ Create branch after this node</div><div class="dd-sep"></div><div class="dd-item danger" onclick="graphDeleteBlocked(\'Join\')">✖ Delete</div></div></div>';
}
