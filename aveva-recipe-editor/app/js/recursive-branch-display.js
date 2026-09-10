// recursive-branch-display.js - nested AVEVA branch region discovery for display.
function nestedBranchNodeId(ph){return ph&&(ph._reId||ph.node_id)||'';}
function nestedBranchDefs(){return [{fork:'ParallelDivergent',join:'ParallelConvergent',mode:'All'},{fork:'SerialDivergent',join:'SerialConvergent',mode:'Single'}];}
function nestedBranchUnique(values){return values.filter(function(v,i,a){return v&&a.indexOf(v)===i;});}
function nestedBranchDistances(adjacency,start){var dist={},queue=[start];dist[start]=0;while(queue.length){var node=queue.shift(),next=adjacency[node]||[];for(var i=0;i<next.length;i++)if(dist[next[i]]===undefined){dist[next[i]]=dist[node]+1;queue.push(next[i]);}}return dist;}
function nestedBranchBestMatching(targets,sources,distances){var used={},best=null;function walk(index,total,pairs){if(index===targets.length){if(!best||total<best.total)best={total:total,pairs:pairs.slice()};return;}for(var i=0;i<sources.length;i++){var source=sources[i],distance=distances[targets[index]][source];if(used[source]||distance===undefined)continue;used[source]=true;pairs.push(source);walk(index+1,total+distance,pairs);pairs.pop();delete used[source];}}walk(0,0,[]);return best;}
function collectNestedBranchRegions(op){
 var links=(op&&op.links)||[],adjacency={};
 function add(a,b){if(!a||!b)return;(adjacency[a]||(adjacency[a]=[])).push(b);}
 function key(link,side){var t=side==='from'?link.from_type:link.to_type;if(t==='Transition')return '@T:'+(side==='from'?link.from_id:link.to_id);return t==='Step'?String(side==='from'?(link.from_re_id||link.from_node):(link.to_re_id||link.to_node)) : '';}
 links.forEach(function(l){if(l.type==='ControlLink')add(key(l,'from'),key(l,'to'));});
 var result=[];nestedBranchDefs().forEach(function(def){var forks={},joins={};
  links.forEach(function(l){
   if(l.type===def.fork&&l.to_type==='Step'&&l.to_re_id){var f=key(l,'from'),t=key(l,'to');if(f){(forks[f]||(forks[f]=[])).push(t);add(f,t);}}
   if(l.type===def.join&&l.to_type==='Step'&&l.to_re_id){var f=key(l,'from'),t=key(l,'to'),joinKey=l._linkId||t;if(f){if(!joins[joinKey])joins[joinKey]={target:t,sources:[]};joins[joinKey].sources.push(f);add(f,t);}}
  });Object.keys(adjacency).forEach(function(k){adjacency[k]=nestedBranchUnique(adjacency[k]);});
  Object.keys(forks).forEach(function(f){var targets=nestedBranchUnique(forks[f]);if(targets.length<2)return;var dist={},c=[];targets.forEach(function(t){dist[t]=nestedBranchDistances(adjacency,t);});Object.keys(joins).forEach(function(j){var joinDef=joins[j],sources=nestedBranchUnique(joinDef.sources);if(sources.length!==targets.length)return;var m=nestedBranchBestMatching(targets,sources,dist);if(m)c.push({joinTarget:joinDef.target,joinSources:sources,total:m.total,joinLinkId:j});});c.sort(function(x,y){return x.total-y.total;});if(c.length)result.push({forkSource:f,targets:targets,joinTarget:c[0].joinTarget,joinSources:c[0].joinSources,mode:def.mode,joinType:def.join,forkType:def.fork});});
 });return result;
}
