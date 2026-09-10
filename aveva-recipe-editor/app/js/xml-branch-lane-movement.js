// ============================================================================
// V10.8 — XML boundary movement within outer and nested branch lanes
// ============================================================================
// XML branch regions identify a lane start and its matching join-source. The
// displayed items in that lane are then obtained by following native normal
// ControlLinks only. This never uses op.phases ordering as routing authority.
function xblStepForward(op,id){return ((op&&op.links)||[]).filter(function(l){return l.type==='ControlLink'&&l.from_type==='Step'&&String(l.from_re_id)===String(id)&&l.to_type==='Step'&&l.to_re_id;});}
function xblLanePath(op,start,stop){var result=[],seen={},cur=String(start);while(cur&&!seen[cur]){seen[cur]=true;result.push(cur);if(cur===String(stop))break;var next=xblStepForward(op,cur);if(next.length!==1)break;cur=String(next[0].to_re_id);}return result;}
function xblPhaseMap(op){var m={};(op.phases||[]).forEach(function(p){var id=p&&(p._reId||p.node_id);if(id&&!p._dummy)m[String(id)]=p;});return m;}
function xblFindLane(op,nodeId){var regions=typeof collectNestedBranchRegions==='function'?collectNestedBranchRegions(op):[],phases=xblPhaseMap(op);for(var r=0;r<regions.length;r++)for(var i=0;i<regions[r].targets.length;i++){var source=regions[r].joinSources[i],path=xblLanePath(op,regions[r].targets[i],source);if(path.indexOf(String(nodeId))>=0)return {region:regions[r],lane:i,all:path,phases:path.filter(function(id){return !!phases[id];})};}return null;}
function xblCapabilities(op,nodeId){var lane=xblFindLane(op,nodeId);if(!lane)return null;var at=lane.phases.indexOf(String(nodeId));return {up:at>0?lane.phases[at-1]:'',down:at>=0&&at<lane.phases.length-1?lane.phases[at+1]:''};}
function xblSetStep(link,side,id,map){var p=map[String(id)],label=p?(p.label||id):id;if(side==='from'){link.from=label;link.from_type='Step';link.from_re_id=String(id);link.from_node=String(id);link.from_id='';}else{link.to=label;link.to_type='Step';link.to_re_id=String(id);link.to_node=String(id);link.to_id='';}}
function xblMove(op,nodeId,direction){
 var lane=xblFindLane(op,nodeId),map=xblPhaseMap(op);if(!lane)return {ok:false,reason:'This node is not in a discovered branch lane.'};
 var cap=xblCapabilities(op,nodeId),target=direction<0?cap.up:cap.down;if(!target)return {ok:false,reason:'No adjacent Phase in this branch lane.'};
 var links=op.links||[],incoming=links.filter(function(l){return l.to_type==='Step'&&String(l.to_re_id)===String(nodeId)&&l.type!=='Other';}),forward=xblStepForward(op,nodeId);
 // Destination boundary is directly before target when moving up, directly
 // after target when moving down. Both are native ControlLink boundaries.
 // At lane entry the retained native boundary is Parallel/SerialDivergent,
 // not a ControlLink. It is still the exact XML link to split and retain.
 var boundary=direction<0?links.filter(function(l){return l.to_type==='Step'&&String(l.to_re_id)===String(target)&&l.type!=='Other';})[0]:xblStepForward(op,target)[0];
 if(incoming.length!==1||forward.length!==1||!boundary)return {ok:false,reason:'The branch lane has no single normal XML cut-and-paste boundary.'};
 if(boundary===incoming[0]||boundary===forward[0])return {ok:false,reason:'Already at this branch-lane boundary.'};
 var oldSuccessor=String(forward[0].to_re_id),destinationTarget=String(boundary.to_re_id);
 // CUT and PASTE by retaining the same native Link objects.
 xblSetStep(incoming[0],'to',oldSuccessor,map);
 xblSetStep(boundary,'to',nodeId,map);
 xblSetStep(forward[0],'to',destinationTarget,map);
 op._graphEdit=true;return {ok:true,moved:String(nodeId),target:String(target),lane:lane.lane};
}
// Extend the already-loaded V10.7 handlers with XML lane-local controls.
// Assignment (rather than a function declaration) is intentional: declarations
// are hoisted, which would make the captured fallback point to this override.
var _v107GraphMoveCapabilities=graphMoveCapabilities;
graphMoveCapabilities=function(op,nodeId){var lane=xblCapabilities(op,nodeId);return lane||_v107GraphMoveCapabilities(op,nodeId);};
var _v107MoveGraphShortcut=moveGraphShortcut;
moveGraphShortcut=function(op,nodeId,direction){var lane=xblFindLane(op,nodeId);return lane?xblMove(op,nodeId,direction):_v107MoveGraphShortcut(op,nodeId,direction);};
