// parser.js - B2MML XML Parser
// Parses AVEVA Batch MasterRecipe format into internal data model

function parseB2MML(xmlText){
  try{
  var parser=new DOMParser();
  var doc=parser.parseFromString(xmlText,'text/xml');
  var ns='http://www.wbf.org/xml/B2MML-V0401';
  var ext='http://www.wbf.org/xml/B2MML-V0401-AllExtensions';
  function gb(el,tag){var f=el.getElementsByTagNameNS(ns,tag)[0];return f&&f.textContent?f.textContent.trim():'';}
  function ge(el,tag){var f=el.getElementsByTagNameNS(ext,tag)[0];return f&&f.textContent?f.textContent.trim():'';}
  var recipe=doc.getElementsByTagNameNS(ns,'MasterRecipe')[0];
  if(!recipe){alert('No MasterRecipe found');return null;}
  var header=recipe.getElementsByTagNameNS(ns,'Header')[0];
  var bsEl=header?header.getElementsByTagNameNS(ns,'BatchSize')[0]:null;
  var modLogs=[];if(header){var mlEls=header.getElementsByTagNameNS(ns,'ModificationLog');for(var mli=0;mli<mlEls.length;mli++){var ml=mlEls[mli];modLogs.push({date:gb(ml,'ModifiedDate'),description:gb(ml,'Description'),author:gb(ml,'Author')})}}
  var d={id:gb(recipe,'ID'),description:gb(recipe,'Description'),product_id:header?gb(header,'ProductID'):'',product_name:header?gb(header,'ProductName'):'',batch_size_nominal:bsEl?gb(bsEl,'Nominal'):'',batch_size_min:bsEl?gb(bsEl,'Min'):'',batch_size_max:bsEl?gb(bsEl,'Max'):'',approved_production:header?ge(header,'ApprovedForProduction'):'',approved_test:header?ge(header,'ApprovedForTest'):'',modification_logs:modLogs,equipment_requirements:[],equipment_transfers:[],materials:[],unit_procedures:[]};
  var children=recipe.childNodes;
  for(var ci=0;ci<children.length;ci++){var ch=children[ci];if(!ch.localName)continue;
    if(ch.localName==='EquipmentRequirement'&&ch.namespaceURI===ns){
      var piEls=ch.getElementsByTagNameNS(ext,'ProcessInstance'),instances=[];
      for(var pii=0;pii<piEls.length;pii++)instances.push({name:ge(piEls[pii],'Name'),unit:ge(piEls[pii],'Unit'),mode:ge(piEls[pii],'UnitSelectionMode')||'Auto'});
      d.equipment_requirements.push({id:gb(ch,'ID'),instances:instances});
    }
    if(ch.localName==='EquipmentTransfer'&&ch.namespaceURI===ext){
      var tiEls=ch.getElementsByTagNameNS(ext,'TransferInstance'),transferInstances=[];
      for(var tii0=0;tii0<tiEls.length;tii0++)transferInstances.push({name:ge(tiEls[tii0],'Name'),source:ge(tiEls[tii0],'Source'),dest:ge(tiEls[tii0],'Destination')});
      d.equipment_transfers.push({name:ge(ch,'Name'),source:ge(ch,'Source'),dest:ge(ch,'Destination'),instances:transferInstances});
    }
  }
  var formula=recipe.getElementsByTagNameNS(ns,'Formula')[0];
  var formulaLookup={};
  if(formula){var params=formula.getElementsByTagNameNS(ns,'Parameter');
    for(var i=0;i<params.length;i++){var p=params[i];var pType=gb(p,'ParameterType');var pId=gb(p,'ID');var valEl=p.getElementsByTagNameNS(ns,'Value')[0];var valStr=valEl?gb(valEl,'ValueString'):'';var dataInterp=valEl?gb(valEl,'DataInterpretation'):'';
      if(pType==='ProcessInput'){var matId=ge(p,'MaterialID');d.materials.push({formula_id:pId,material_id:matId,quantity:valStr,high_dev:ge(p,'HighDeviation'),low_dev:ge(p,'LowDeviation'),data_interp:dataInterp});formulaLookup[pId]={value:valStr,material_id:matId,type:'material'}}
      else if(pType==='ProcessParameter'){formulaLookup[pId]={value:valStr,material_id:'',type:'process'}}
  }}
  var topREs=recipe.childNodes;
  for(var ti=0;ti<topREs.length;ti++){var tre=topREs[ti];if(!tre.localName||tre.localName!=='RecipeElement'||tre.namespaceURI!==ns)continue;if(gb(tre,'RecipeElementType')!=='UnitProcedure')continue;
    var upInfo=tre.getElementsByTagNameNS(ext,'UnitProcedureInformation')[0];
    var upData={name:upInfo?ge(upInfo,'Name'):'',process:upInfo?ge(upInfo,'ProcessInstance'):'',operations:[],_reId:gb(tre,'ID')};
    var opEls=tre.childNodes;
    for(var oi=0;oi<opEls.length;oi++){var opEl=opEls[oi];if(!opEl.localName||opEl.localName!=='RecipeElement'||opEl.namespaceURI!==ns)continue;if(gb(opEl,'RecipeElementType')!=='Operation')continue;
      var opInfo=opEl.getElementsByTagNameNS(ext,'OperationInformation')[0];
      var opData={name:opInfo?ge(opInfo,'Name'):'',phases:[],links:[],transitions:{},transition_meta:{},_reId:gb(opEl,'ID')};
      var pl=opEl.getElementsByTagNameNS(ns,'ProcedureLogic')[0];
      var stepMap={},phaseLabelMap={};
      if(pl){var steps=pl.getElementsByTagNameNS(ns,'Step');for(var si=0;si<steps.length;si++)stepMap[gb(steps[si],'ID')]=gb(steps[si],'RecipeElementID');
        var trans=pl.getElementsByTagNameNS(ns,'Transition');for(var si2=0;si2<trans.length;si2++){var trId=gb(trans[si2],'ID'),trName=ge(trans[si2],'Name')||trId;opData.transitions[trId]=gb(trans[si2],'Condition');opData.transition_meta[trId]={name:trName,description:gb(trans[si2],'Description')||''};}}
      var phEls=opEl.childNodes;
      for(var pi2=0;pi2<phEls.length;pi2++){var phEl=phEls[pi2];if(!phEl.localName||phEl.localName!=='RecipeElement'||phEl.namespaceURI!==ns)continue;var phId=gb(phEl,'ID');var phTypeEl=phEl.getElementsByTagNameNS(ns,'RecipeElementType')[0],phType=phTypeEl?phTypeEl.textContent.trim():'',isDummy=phType==='Other'&&phTypeEl.getAttribute('OtherValue')==='DUMMY';
        if(phType==='Begin'||phType==='End'){phaseLabelMap[phId]=phType;if(phType==='Begin')opData._beginReId=phId;else opData._endReId=phId;continue}
        if(phType==='Phase'){var phInfo=phEl.getElementsByTagNameNS(ext,'PhaseInformation')[0];phaseLabelMap[phId]=phInfo?ge(phInfo,'Name'):phId;}
        else if(isDummy)phaseLabelMap[phId]='Empty lane';
      }
      if(pl){var lnks=pl.getElementsByTagNameNS(ns,'Link');
        for(var li=0;li<lnks.length;li++){var lk=lnks[li];var lType=gb(lk,'LinkType');
          var fromEls=lk.getElementsByTagNameNS(ns,'FromID');
          var toEls=lk.getElementsByTagNameNS(ns,'ToID');
          // Build source/dest arrays - ParallelDivergent has multiple ToID, Convergent multiple FromID
          var froms=[];for(var fi=0;fi<fromEls.length;fi++){froms.push({val:gb(fromEls[fi],'FromIDValue'),type:gb(fromEls[fi],'FromType')})}
          var tos=[];for(var tii=0;tii<toEls.length;tii++){tos.push({val:gb(toEls[tii],'ToIDValue'),type:gb(toEls[tii],'ToType')})}
          if(!froms.length)froms=[{val:'',type:''}];
          if(!tos.length)tos=[{val:'',type:''}];
          // Pair: divergent = one from, many to; convergent = many from, one to; else first/first
          var pairs=[];
          if(lType==='ParallelDivergent'||lType==='SerialDivergent'){for(var ti2=0;ti2<tos.length;ti2++)pairs.push([froms[0],tos[ti2]])}
          else if(lType==='ParallelConvergent'||lType==='SerialConvergent'){for(var fi2=0;fi2<froms.length;fi2++)pairs.push([froms[fi2],tos[0]])}
          else{pairs.push([froms[0],tos[0]])}
          for(var pi4=0;pi4<pairs.length;pi4++){
            var fv=pairs[pi4][0].val,ft=pairs[pi4][0].type,tv=pairs[pi4][1].val,tt=pairs[pi4][1].type;
            var fromLabel='',toLabel='',fromNode='',toNode='';
            if(ft==='Step'){var reId=stepMap[fv]||'';fromNode=reId;fromLabel=phaseLabelMap[reId]||'s'+fv}else if(ft==='Transition')fromLabel='TRANS:'+fv;
            if(tt==='Step'){var reId2=stepMap[tv]||'';toNode=reId2;toLabel=phaseLabelMap[reId2]||'s'+tv}else if(tt==='Transition')toLabel='TRANS:'+tv;
            // Keep display labels for baseline/edit-mode behaviour, and retain the AVEVA
            // RecipeElement IDs for view-mode graph routing. Labels are not unique.
            opData.links.push({_linkId:gb(lk,'ID'),type:lType,from:fromLabel,from_id:fv,from_node:fromNode,from_re_id:ft==='Step'?fromNode:'',from_type:ft,to:toLabel,to_id:tv,to_node:toNode,to_re_id:tt==='Step'?toNode:'',to_type:tt})}}}
      for(var pi3=0;pi3<phEls.length;pi3++){
        var phEl2=phEls[pi3];if(!phEl2.localName||phEl2.localName!=='RecipeElement'||phEl2.namespaceURI!==ns)continue;
        var phTypeEl2=phEl2.getElementsByTagNameNS(ns,'RecipeElementType')[0],phType2=phTypeEl2?phTypeEl2.textContent.trim():'',isDummy2=phType2==='Other'&&phTypeEl2.getAttribute('OtherValue')==='DUMMY';
        if(phType2!=='Phase'&&!isDummy2)continue;
        if(isDummy2){var dummyId=gb(phEl2,'ID');opData.phases.push({label:'',node_id:dummyId,_reId:dummyId,phase_type:'Dummy',parent_instance:'',description:'',_label:'',params:[],_dummy:true});continue;}
        var phInfo2=phEl2.getElementsByTagNameNS(ext,'PhaseInformation')[0];if(!phInfo2)continue;
        var phData={label:ge(phInfo2,'Name'),node_id:gb(phEl2,'ID'),_reId:gb(phEl2,'ID'),phase_type:ge(phInfo2,'PhaseType'),parent_instance:ge(phInfo2,'ParentInstance'),description:gb(phEl2,'Description'),_label:ge(phInfo2,'Label'),params:[]};
        var phParams=phEl2.getElementsByTagNameNS(ns,'Parameter');
        for(var ppi=0;ppi<phParams.length;ppi++){var pp=phParams[ppi];var ppId=gb(pp,'ID');var ppType=gb(pp,'ParameterType');var ppRef=ge(pp,'FormulaParameterID');
          var ppValEl=pp.getElementsByTagNameNS(ns,'Value')[0];var ppDirect=ppValEl?gb(ppValEl,'ValueString'):'';
          var resolved='',matId2='';
          if(ppType==='ProcessInput'){
            if(ppRef&&formulaLookup[ppRef]){matId2=formulaLookup[ppRef].material_id||'';resolved=ppDirect&&ppDirect.length<20?ppDirect:'';}
            else if(ppDirect&&ppDirect.length<20){resolved=ppDirect}
          }else if(ppType==='ProcessParameter'){if(ppRef&&formulaLookup[ppRef])resolved=formulaLookup[ppRef].value;else if(ppDirect&&ppDirect.length<20)resolved=ppDirect}
          phData.params.push({name:ppId,value:resolved,param_type:ppType,material_id:matId2,_fid:ppRef||''})
        }
        opData.phases.push(phData)
      }
      (opData.phases||[]).forEach(function(phase){if(!phase._dummy)return;var id=phase._reId,links=opData.links||[];var fork=links.some(function(l){return (l.type==='ParallelDivergent'||l.type==='SerialDivergent')&&l.from_type==='Step'&&l.from_re_id===id;}),entered=links.some(function(l){return l.type==='ControlLink'&&l.to_type==='Step'&&l.to_re_id===id;}),joined=links.some(function(l){return (l.type==='ParallelConvergent'||l.type==='SerialConvergent')&&l.to_type==='Step'&&l.to_re_id===id;}),continues=links.some(function(l){return l.type==='ControlLink'&&l.from_type==='Step'&&l.from_re_id===id;});if(fork&&entered)phase._branchEntryConnector=true;if(joined&&continues)phase._branchJoinConnector=true;});
      upData.operations.push(opData)}
    d.unit_procedures.push(upData)}
  var maxId=0;var idEls=recipe.getElementsByTagNameNS(ns,'ID');for(var idi=0;idi<idEls.length;idi++){var idNum=parseInt((idEls[idi].textContent||'').trim(),10);if(!isNaN(idNum)&&idNum>maxId)maxId=idNum;}
  d._maxId=maxId;
  // Retain raw ParentInstance references not represented in the simplified editor
  // model. They are used only to prevent unsafe instance rename/deletion.
  d._raw_instance_references=[];
  var rawParentInstances=doc.getElementsByTagNameNS(ext,'ParentInstance');
  for(var rpi=0;rpi<rawParentInstances.length;rpi++){var rpiName=(rawParentInstances[rpi].textContent||'').trim();if(rpiName&&d._raw_instance_references.indexOf(rpiName)<0)d._raw_instance_references.push(rpiName);}
  return (typeof xmlAuthorityAttach==='function')?xmlAuthorityAttach(d,doc,xmlText):(d._rawXML=xmlText,d);
  }catch(e){alert('Error parsing: '+e.message);return null}
}