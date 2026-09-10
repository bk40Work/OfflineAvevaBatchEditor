// lane-zoom.js - independent visual zoom for the three lane-view columns.
// View-only state: it is never written to the recipe model or exported XML.
var laneZoomLevels={up:100,op:100,ph:100};
function laneZoomKey(key){return key==='up'||key==='op'||key==='ph'?key:null;}
function laneZoomBodyId(key){return {up:'laneUPList',op:'laneOpList',ph:'lanePhList'}[key];}
function laneZoomApply(key){key=laneZoomKey(key);if(!key)return;var body=document.getElementById(laneZoomBodyId(key)),value=laneZoomLevels[key];if(body){body.style.zoom=(value/100);body.setAttribute('data-zoom',value);}
 var label=document.getElementById('laneZoomLabel_'+key);if(label)label.textContent=value+'%';
 var out=document.getElementById('laneZoomOut_'+key),inn=document.getElementById('laneZoomIn_'+key);if(out)out.disabled=value<=60;if(inn)inn.disabled=value>=160;
}
function laneZoomChange(key,delta){key=laneZoomKey(key);if(!key)return;laneZoomLevels[key]=Math.max(60,Math.min(160,laneZoomLevels[key]+delta));laneZoomApply(key);}
function laneZoomReset(key){key=laneZoomKey(key);if(!key)return;laneZoomLevels[key]=100;laneZoomApply(key);}
function laneZoomControls(key,label){return '<span class="lane-zoom" aria-label="Zoom '+label+' lane"><button id="laneZoomOut_'+key+'" type="button" title="Zoom out '+label+' lane" aria-label="Zoom out '+label+' lane" onclick="event.stopPropagation();laneZoomChange(\''+key+'\',-10)">−</button><button id="laneZoomLabel_'+key+'" type="button" title="Reset '+label+' lane zoom" aria-label="Reset '+label+' lane zoom" onclick="event.stopPropagation();laneZoomReset(\''+key+'\')">100%</button><button id="laneZoomIn_'+key+'" type="button" title="Zoom in '+label+' lane" aria-label="Zoom in '+label+' lane" onclick="event.stopPropagation();laneZoomChange(\''+key+'\',10)">+</button></span>';}
function applyAllLaneZoom(){laneZoomApply('up');laneZoomApply('op');laneZoomApply('ph');}
