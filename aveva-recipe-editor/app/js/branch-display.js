// ============================================================================
// branch-display.js - read-only AVEVA branch identification and presentation
// ============================================================================
// Uses RecipeElement IDs exclusively for graph routing. It supports a closed
// Parallel branch (execute All) or Serial branch (execute Single) with two or
// more targets. This module performs no graph editing or XML serialisation.
// A region is accepted only when every fork target reaches the corresponding
// convergent link, which prevents an open branch being drawn as closed.

var BRANCH_DISPLAY_ONLY=true;

function branchDisplayPhaseId(phase){
  return phase && (phase._reId || phase.node_id) || '';
}

function branchDisplayUnique(values){
  return values.filter(function(value,index){return value && values.indexOf(value)===index;});
}

function branchDisplayBoundaryIds(op){
  var ids={};
  if(op&&op._beginReId)ids[op._beginReId]='Begin';
  if(op&&op._endReId)ids[op._endReId]='End';
  return ids;
}

function branchDisplayLetter(index){
  var label='';
  do{label=String.fromCharCode(65+(index%26))+label;index=Math.floor(index/26)-1;}while(index>=0);
  return label;
}

function collectReadOnlyBranchRegions(op){
  var links=(op&&op.links)||[];
  var phaseIds={},boundaryIds=branchDisplayBoundaryIds(op);
  ((op&&op.phases)||[]).forEach(function(phase){
    var id=branchDisplayPhaseId(phase);
    if(id)phaseIds[id]=true;
  });
  function isNode(id){return !!(phaseIds[id]||boundaryIds[id]);}

  var controlBySource={};
  links.forEach(function(link){
    if(link.type==='ControlLink' && link.from_type==='Step' && link.to_type==='Step' && link.from_re_id && link.to_re_id){
      if(!controlBySource[link.from_re_id])controlBySource[link.from_re_id]=[];
      controlBySource[link.from_re_id].push(link.to_re_id);
    }
  });

  var definitions=[
    {forkType:'ParallelDivergent',joinType:'ParallelConvergent',mode:'All',family:'Parallel'},
    {forkType:'SerialDivergent',joinType:'SerialConvergent',mode:'Single',family:'Serial'}
  ];
  var regions=[];

  definitions.forEach(function(definition){
    var forkBySource={},joinsByTarget={};
    links.forEach(function(link){
      if(link.from_type!=='Step'||link.to_type!=='Step'||!link.from_re_id||!link.to_re_id)return;
      if(link.type===definition.forkType){
        if(!forkBySource[link.from_re_id])forkBySource[link.from_re_id]=[];
        forkBySource[link.from_re_id].push(link.to_re_id);
      }
      if(link.type===definition.joinType){
        if(!joinsByTarget[link.to_re_id])joinsByTarget[link.to_re_id]=[];
        joinsByTarget[link.to_re_id].push(link.from_re_id);
      }
    });

    Object.keys(forkBySource).forEach(function(forkSource){
      var forkTargets=branchDisplayUnique(forkBySource[forkSource]);
      if(forkTargets.length<2 || !isNode(forkSource) || forkTargets.some(function(id){return !phaseIds[id];}))return;

      var lanePaths=[];
      for(var laneIndex=0;laneIndex<forkTargets.length;laneIndex++){
        var current=forkTargets[laneIndex],path=[],seen={},valid=true;
        while(current&&!seen[current]){
          seen[current]=true;
          if(!phaseIds[current]){valid=false;break;}
          path.push(current);
          var successors=branchDisplayUnique(controlBySource[current]||[]);
          if(successors.length===0)break;
          if(successors.length!==1){valid=false;break;}
          current=successors[0];
        }
        if(!valid||!path.length){lanePaths=[];break;}
        lanePaths.push(path);
      }
      if(lanePaths.length!==forkTargets.length)return;

      var exits=lanePaths.map(function(path){return path[path.length-1];});
      var joinTarget='';
      Object.keys(joinsByTarget).some(function(target){
        var joinSources=branchDisplayUnique(joinsByTarget[target]);
        var allLanesJoin=exits.every(function(exit){return joinSources.indexOf(exit)>=0;});
        // An AVEVA convergence belongs to this exact fork only when it closes
        // precisely these N lane exits, not a subset or a neighbouring region.
        if(allLanesJoin && joinSources.length===exits.length && isNode(target)){
          joinTarget=target;
          return true;
        }
        return false;
      });
      if(!joinTarget)return;

      regions.push({
        type:definition.family,
        mode:definition.mode,
        forkType:definition.forkType,
        joinType:definition.joinType,
        forkSource:forkSource,
        forkTargets:forkTargets,
        lanes:lanePaths.map(function(path,index){
          return {label:branchDisplayLetter(index),entry:path[0],phases:path,exit:path[path.length-1]};
        }),
        joinTarget:joinTarget,
        joinSources:exits
      });
    });
  });
  return regions;
}

function isReadOnlyBranchOperation(op){
  return collectReadOnlyBranchRegions(op).length>0;
}
