// print.js - Lane-only print view

function printLaneView(){
  if(!currentRecipeData)return;
  // Generate a printable lane document showing all UPs->Ops->Phases
  var d=currentRecipeData;
  var w=window.open('','_blank');
  var h='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+esc(d.id)+' - Lane View</title>';
  h+='<style>';
  h+='body{font-family:"Segoe UI",sans-serif;font-size:11px;color:#333;margin:20px}';
  h+='h1{color:#36398E;font-size:1.3em;margin-bottom:4px}';
  h+='.sub{color:#666;font-size:0.9em;margin-bottom:16px}';
  h+='.up-section{margin-bottom:16px;border:1px solid #ddd;border-radius:4px;page-break-inside:avoid}';
  h+='.up-hdr{background:#36398E;color:#fff;padding:8px 12px;font-weight:600;font-size:0.95em;-webkit-print-color-adjust:exact;print-color-adjust:exact}';
  h+='.up-body{padding:10px}';
  h+='.op-section{margin-left:12px;margin-bottom:8px;border-left:3px solid #009F3C;padding-left:10px}';
  h+='.op-hdr{color:#2E7D32;font-weight:600;font-size:0.9em;margin-bottom:4px;background:#f1f8e9;padding:4px 8px;border-radius:3px;-webkit-print-color-adjust:exact;print-color-adjust:exact}';
  h+='.ph{margin:3px 0;padding:4px 8px;border-left:3px solid #009F3C;background:#f8f9fa;border-radius:0 3px 3px 0;page-break-inside:avoid}';
  h+='.ph.xfer{border-left-color:#36398E;background:#f5f5fc}';
  h+='.ph.alloc{border-left-color:#999;background:#fafafa;opacity:0.7}';
  h+='.ph-name{font-weight:500;font-size:0.9em}';
  h+='.ph-desc{color:#666;font-size:0.85em;font-style:italic}';
  h+='.ph-parent{color:#36398E;font-size:0.8em}';
  h+='.ph-params{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}';
  h+='.ph-param{background:#fff;padding:2px 6px;border:1px solid #eee;border-radius:3px;font-size:0.82em}';
  h+='.pn{color:#666}.pv{color:#009F3C;font-weight:600}.pm{color:#36398E;font-weight:500}';
  h+='.badge{display:inline-block;padding:1px 4px;border-radius:2px;font-size:0.7em;margin-left:4px;font-weight:500}';
  h+='.b-proc{background:#e8f5e9;color:#009F3C}.b-xfer{background:#e8eaf6;color:#36398E}.b-alloc{background:#f5f5f5;color:#777}';
  h+='.trans{margin:3px 0 3px 12px;padding:3px 8px;border-radius:3px;font-size:0.8em;font-weight:500}';
  h+='.trans.loop{background:#fce4ec;color:#c62828;border:1px dashed #ef535080}';
  h+='.trans.cond{background:#fff8e1;color:#f57c00;border:1px dashed #ffb30080}';
  h+='.arrow{color:#ccc;text-align:center;font-size:0.8em;padding:1px 0}';
  h+='.parallel{display:flex;gap:6px;margin:4px 0;border:1px dashed #009F3C80;border-radius:4px;padding:6px;background:#f0f7f2}';
  h+='.branch{flex:1}.branch-label{color:#009F3C;font-size:0.72em;font-weight:600;text-transform:uppercase;margin-bottom:3px}';
  h+='@media print{body{margin:10px}.up-section{page-break-inside:avoid}}';
  h+='</style></head><body>';
  h+='<h1>'+esc(d.id)+' - '+esc(d.description)+'</h1>';
  h+='<div class="sub">Product: '+esc(d.product_name)+' ('+esc(d.product_id)+') | Batch: '+d.batch_size_nominal+' kg | Printed: '+new Date().toLocaleDateString()+'</div>';

  for(var u=0;u<d.unit_procedures.length;u++){
    var up=d.unit_procedures[u];
    h+='<div class="up-section"><div class="up-hdr">'+(u+1)+'. '+esc(up.name)+' ['+up.process+']</div><div class="up-body">';
    for(var o=0;o<up.operations.length;o++){
      var op=up.operations[o];
      if(o>0)h+='<div class="arrow">\u25BC</div>';
      h+='<div class="op-section"><div class="op-hdr">'+esc(op.name)+' ('+op.phases.length+' phases)</div>';
      for(var p=0;p<op.phases.length;p++){
        var ph=op.phases[p];var isX=ph.phase_type==="Transfer";
        var isA=(ph.phase_type||"").indexOf("Allocate")>=0||(ph.phase_type||"").indexOf("Release")>=0;
        var cls="ph";if(isA)cls+=" alloc";else if(isX)cls+=" xfer";
        var badge=isX?"<span class=\"badge b-xfer\">XFER</span>":isA?"<span class=\"badge b-alloc\">"+ph.phase_type.replace("Process","").replace("Transfer","")+"</span>":"<span class=\"badge b-proc\">PROC</span>";
        h+="<div class=\""+cls+"\"><div class=\"ph-name\">"+esc(ph.label)+badge+"</div>";
        if(ph.description)h+="<div class=\"ph-desc\">"+esc(ph.description)+"</div>";
        if(ph.parent_instance&&ph.parent_instance!==up.process)h+="<div class=\"ph-parent\">\u2197 "+esc(ph.parent_instance)+"</div>";
        if(ph.params&&ph.params.length){h+="<div class=\"ph-params\">";
          for(var pi=0;pi<ph.params.length;pi++){var pm=ph.params[pi];var ms=pm.material_id?"<span class=\"pm\">["+matName(pm.material_id)+"]</span> ":"";
            h+="<div class=\"ph-param\"><span class=\"pn\">"+pm.name+"</span> = "+ms+"<span class=\"pv\">"+(pm.value||"\u2014")+"</span></div>"}
          h+="</div>"}
        h+="</div>";
      }
      h+='</div>';
    }
    h+='</div></div>';
  }
  h+='</div></body></html>';
  w.document.write(h);w.document.close();
  setTimeout(function(){w.print()},500);
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded',function(){currentRecipeData=DEMO;renderAll()});
