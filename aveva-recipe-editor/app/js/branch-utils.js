// ============================================================================
// BRANCH UTILITIES - Computation and manipulation of branch structures
// ============================================================================

/**
 * Build branch structure from operation links.
 * Returns a structured view of branches for rendering.
 * CORRECTED: Handles multiple ToID elements (not array-based) for Aveva compatibility.
 */
function computeBranchStructure(op) {
  var result = {
    hasFork: false,
    forkSource: null,      // Phase where branch splits
    forkTargets: [],       // Entry points [BranchA, BranchB]
    hasConvergence: false,
    convergenceTarget: null, // Phase where branches join
    convergenceSources: [],  // Exit points [BranchA, BranchB]
    branches: {
      'A': { entry: null, phases: [], exit: null },
      'B': { entry: null, phases: [], exit: null }
    },
    linearPhases: []       // Phases outside branches
  };

  if (!op.Links || op.Links.length === 0) {
    result.linearPhases = op.phases.map(function(p) { return p.label; });
    return result;
  }

  // Build forward control link map
  var ctrlFwd = {}; // from -> to
  var ctrlBack = {}; // to -> from
  
  op.Links.forEach(function(l) {
    if (l.LinkType === 'ControlLink' && l.FromID && l.ToID) {
      var fromVal = l.FromID.FromIDValue;
      var toVal = l.ToID.ToIDValue;
      if (fromVal && toVal) {
        ctrlFwd[fromVal] = toVal;
        ctrlBack[toVal] = fromVal;
      }
    }
  });

  // Find ParallelDivergent (fork) - look for Link with multiple ToID properties
  var forkLink = op.Links.find(function(l) { 
    return l.LinkType === 'ParallelDivergent'; 
  });
  
  if (!forkLink) {
    result.linearPhases = op.phases.map(function(p) { return p.label; });
    return result;
  }

  result.hasFork = true;
  
  // Handle FromID (single)
  if (forkLink.FromID && forkLink.FromID.FromIDValue) {
    result.forkSource = forkLink.FromID.FromIDValue;
  }

  // Handle multiple ToID elements (NOT an array - multiple properties)
  // Look for ToID, ToID_1, ToID_2, etc.
  var forkTargets = [];
  if (forkLink.ToID && forkLink.ToID.ToIDValue) {
    forkTargets.push(forkLink.ToID.ToIDValue);
  }
  // Check for additional ToID properties
  var idx = 1;
  while (forkLink['ToID_' + idx] && forkLink['ToID_' + idx].ToIDValue) {
    forkTargets.push(forkLink['ToID_' + idx].ToIDValue);
    idx++;
  }
  
  if (forkTargets.length >= 2) {
    result.forkTargets = forkTargets;
  } else {
    // Not a proper parallel branch
    result.linearPhases = op.phases.map(function(p) { return p.label; });
    return result;
  }

  // Find ParallelConvergent (convergence) - look for Link with multiple FromID properties
  var convLink = op.Links.find(function(l) { 
    return l.LinkType === 'ParallelConvergent'; 
  });
  
  if (convLink) {
    result.hasConvergence = true;
    
    // Handle ToID (single)
    if (convLink.ToID && convLink.ToID.ToIDValue) {
      result.convergenceTarget = convLink.ToID.ToIDValue;
    }
    
    // Handle multiple FromID elements (NOT an array - multiple properties)
    var convSources = [];
    if (convLink.FromID && convLink.FromID.FromIDValue) {
      convSources.push(convLink.FromID.FromIDValue);
    }
    // Check for additional FromID properties
    var idx = 1;
    while (convLink['FromID_' + idx] && convLink['FromID_' + idx].FromIDValue) {
      convSources.push(convLink['FromID_' + idx].FromIDValue);
      idx++;
    }
    
    if (convSources.length >= 2) {
      result.convergenceSources = convSources;
    }
  }

  // TRACE BRANCHES
  var convergenceSet = {};
  result.convergenceSources.forEach(function(s) { convergenceSet[s] = true; });

  // Validate we have both branch entry points
  if (result.forkTargets.length >= 2) {
    // Branch A
    result.branches['A'].entry = result.forkTargets[0];
    var curA = result.forkTargets[0];
    var visited = {};
    
    while (curA && !convergenceSet[curA] && !visited[curA]) {
      visited[curA] = true;
      result.branches['A'].phases.push(curA);
      var next = ctrlFwd[curA];
      if (!next || convergenceSet[next]) {
        result.branches['A'].exit = curA;
        break;
      }
      curA = next;
      if (result.branches['A'].phases.length > 50) break; // Safety
    }

    // Branch B
    result.branches['B'].entry = result.forkTargets[1];
    var curB = result.forkTargets[1];
    visited = {};
    
    while (curB && !convergenceSet[curB] && !visited[curB]) {
      visited[curB] = true;
      result.branches['B'].phases.push(curB);
      var next = ctrlFwd[curB];
      if (!next || convergenceSet[next]) {
        result.branches['B'].exit = curA;
        break;
      }
      curB = next;
      if (result.branches['B'].phases.length > 50) break; // Safety
    }
  }

  // Build linear phases list (phases not in any branch)
  var allBranchPhases = {};
  result.branches['A'].phases.forEach(function(p) { allBranchPhases[p] = true; });
  result.branches['B'].phases.forEach(function(p) { allBranchPhases[p] = true; });
  
  op.phases.forEach(function(p) {
    if (!allBranchPhases[p.label] && p.label !== result.forkSource) {
      result.linearPhases.push(p.label);
    }
  });

  return result;
}

/**
 * Determine which branch a phase belongs to.
 * Returns 'A', 'B', or null (not in a branch / linear)
 */
function getPhaseBranch(op, phaseLabel) {
  var structure = computeBranchStructure(op);
  if (!structure.hasFork) return null;
  
  if (structure.branches['A'].phases.indexOf(phaseLabel) >= 0) return 'A';
  if (structure.branches['B'].phases.indexOf(phaseLabel) >= 0) return 'B';
  return null;
}

/**
 * Find the last phase in a branch.
 */
function getLastPhaseInBranch(op, branchId) {
  var structure = computeBranchStructure(op);
  var branchPhases = structure.branches[branchId].phases;
  if (branchPhases.length === 0) return null;
  return branchPhases[branchPhases.length - 1];
}

/**
 * Trace phases from start label following ControlLinks.
 * Returns array of phase labels in order.
 */
function traceForwardFrom(op, startLabel, stopAt) {
  var ctrlFwd = {};
  op.Links.forEach(function(l) {
    if (l.LinkType === 'ControlLink' && l.FromID && l.ToID) {
      ctrlFwd[l.FromID.FromIDValue] = l.ToID.ToIDValue;
    }
  });

  var result = [];
  var cur = startLabel;
  var stopSet = {};
  if (Array.isArray(stopAt)) {
    stopAt.forEach(function(s) { stopSet[s] = true; });
  } else if (stopAt) {
    stopSet[stopAt] = true;
  }

  while (cur && !stopSet[cur]) {
    result.push(cur);
    cur = ctrlFwd[cur];
    if (result.length > 100) break; // Safety
  }

  return result;
}

// ============================================================================
// BRANCH CREATION FUNCTIONS - CORRECTED for Aveva XML schema
// ============================================================================

/**
 * CREATE BRANCH - Insert a new parallel branch after a phase.
 * Creates the **multiple ToID elements** structure for Aveva compatibility.
 * This is the KEY FIX: uses ToID, ToID_1 instead of ToID: [...]
 */
function createBranchAfter(op, afterPhaseLabel, processId) {
  // Find the ControlLink from afterPhaseLabel
  var linkIdx = -1;
  for (var i = 0; i < op.Links.length; i++) {
    if (op.Links[i].LinkType === 'ControlLink' && 
        op.Links[i].FromID && 
        op.Links[i].FromID.FromIDValue === afterPhaseLabel) {
      linkIdx = i;
      break;
    }
  }

  if (linkIdx < 0) {
    console.error('No outgoing link from phase:', afterPhaseLabel);
    return false;
  }

  var oldLink = op.Links[linkIdx];
  var oldTarget = oldLink.ToID.ToIDValue;

  // Create two new phases for branch entry points
  var timestamp = Date.now();
  var branchAId = 'branchA_' + timestamp;
  var branchBId = 'branchB_' + timestamp;
  
  var newPhaseA = {
    label: 'BranchA_' + timestamp,
    phase_type: 'Process',
    _reId: branchAId,
    params: []
  };
  
  var newPhaseB = {
    label: 'BranchB_' + timestamp,
    phase_type: 'Process',
    _reId: branchBId,
    params: []
  };

  op.phases.push(newPhaseA);
  op.phases.push(newPhaseB);

  // Remove old ControlLink
  op.Links.splice(linkIdx, 1);

  // Add ParallelDivergent link with **MULTIPLE ToID elements**
  // CORRECT STRUCTURE: Single Link with ToID, ToID_1 as separate properties
  var divergentLink = {
    ID: 'link_dv_' + timestamp,
    LinkType: 'ParallelDivergent',
    FromID: { 
      FromIDValue: afterPhaseLabel, 
      FromType: 'Step', 
      IDScope: 'Internal' 
    },
    ToID: { ToIDValue: branchAId, ToType: 'Step', IDScope: 'Internal' }
  };
  
  // Add second ToID as separate property (ToID_1)
  // This creates the structure: { ToID: {...}, ToID_1: {...} }
  divergentLink.ToID_1 = { ToIDValue: branchBId, ToType: 'Step', IDScope: 'Internal' };
  
  op.Links.push(divergentLink);

  // Add ControlLinks from each branch entry to old target
  op.Links.push({
    ID: 'link_cl_a_' + timestamp,
    LinkType: 'ControlLink',
    FromID: { FromIDValue: branchAId, FromType: 'Step', IDScope: 'Internal' },
    ToID: { ToIDValue: oldTarget, ToType: 'Step', IDScope: 'Internal' }
  });
  
  op.Links.push({
    ID: 'link_cl_b_' + timestamp,
    LinkType: 'ControlLink',
    FromID: { FromIDValue: branchBId, FromType: 'Step', IDScope: 'Internal' },
    ToID: { ToIDValue: oldTarget, ToType: 'Step', IDScope: 'Internal' }
  });

  return true;
}

// ============================================================================
// BRANCH MANIPULATION FUNCTIONS - CORRECTED for Aveva XML schema
// ============================================================================

/**
 * INSERT PHASE INTO BRANCH - Add a new phase to a specific branch.
 * CORRECTED: Handles multiple FromID elements (not arrays) for Aveva compatibility.
 */
function insertPhaseIntoBranch(op, branchId, newPhase) {
  var structure = computeBranchStructure(op);
  if (!structure.hasFork) {
    console.error('No branch exists');
    return false;
  }

  var branch = structure.branches[branchId];
  
  // If branch is empty (just entry), insert after entry
  var insertAfter = branch.phases.length > 0 
    ? branch.phases[branch.phases.length - 1]  // Last phase in branch
    : branch.entry;  // Entry point

  // Find the link pointing away from insertAfter
  var linkIdx = -1;
  var linkToUpdate = null;
  for (var i = 0; i < op.Links.length; i++) {
    var l = op.Links[i];
    if (l.LinkType === 'ControlLink' && 
        l.FromID && 
        l.FromID.FromIDValue === insertAfter) {
      linkIdx = i;
      linkToUpdate = l;
      break;
    }
  }

  if (linkIdx < 0) {
    // No ControlLink - might be pointing directly to convergence
    // Check for ParallelConvergent where this phase is a source
    for (var i = 0; i < op.Links.length; i++) {
      var l = op.Links[i];
      if (l.LinkType === 'ParallelConvergent') {
        // Check multiple FromID properties (not array)
        var hasFrom = false;
        if (l.FromID && l.FromID.FromIDValue === insertAfter) {
          hasFrom = true;
        } else {
          var idx = 1;
          while (l['FromID_' + idx] && !hasFrom) {
            if (l['FromID_' + idx].FromIDValue === insertAfter) {
              hasFrom = true;
            }
            idx++;
          }
        }
        
        if (hasFrom) {
          linkIdx = i;
          linkToUpdate = l;
          break;
        }
      }
    }
  }

  if (linkIdx < 0) {
    console.error('Cannot find link from phase:', insertAfter);
    return false;
  }

  op.phases.push(newPhase);

  // Update the link
  if (linkToUpdate.LinkType === 'ControlLink') {
    var oldTarget = linkToUpdate.ToID.ToIDValue;
    linkToUpdate.ToID.ToIDValue = newPhase.label;

    // Add new link from new phase to old target
    op.Links.push({
      ID: 'link_cl_' + Date.now(),
      LinkType: 'ControlLink',
      FromID: { FromIDValue: newPhase.label, FromType: 'Step', IDScope: 'Internal' },
      ToID: { ToIDValue: oldTarget, ToType: 'Step', IDScope: 'Internal' }
    });
  } else if (linkToUpdate.LinkType === 'ParallelConvergent') {
    // Find the source index in multiple FromID properties
    var foundIdx = -1;
    var foundProp = null;
    
    if (linkToUpdate.FromID && linkToUpdate.FromID.FromIDValue === insertAfter) {
      foundIdx = 0;
      foundProp = 'FromID';
    } else {
      var idx = 1;
      while (linkToUpdate['FromID_' + idx] && foundIdx < 0) {
        if (linkToUpdate['FromID_' + idx].FromIDValue === insertAfter) {
          foundIdx = idx;
          foundProp = 'FromID_' + idx;
        }
        idx++;
      }
    }
    
    if (foundIdx >= 0) {
      var convTarget = linkToUpdate.ToID.ToIDValue;
      
      // Remove this phase from convergence (set to null temporarily)
      if (foundProp === 'FromID') {
        linkToUpdate.FromID = { FromIDValue: null, FromType: 'Step', IDScope: 'Internal' };
      } else {
        linkToUpdate[foundProp] = { FromIDValue: null, FromType: 'Step', IDScope: 'Internal' };
      }
      
      // Add ControlLink from insertAfter to new phase
      op.Links.push({
        ID: 'link_cl_' + Date.now(),
        LinkType: 'ControlLink',
        FromID: { FromIDValue: insertAfter, FromType: 'Step', IDScope: 'Internal' },
        ToID: { ToIDValue: newPhase.label, ToType: 'Step', IDScope: 'Internal' }
      });
      
      // Add new phase to convergence
      // Find first available slot
      if (linkToUpdate.FromID && !linkToUpdate.FromID.FromIDValue) {
        linkToUpdate.FromID = { FromIDValue: newPhase.label, FromType: 'Step', IDScope: 'Internal' };
      } else {
        var idx = 1;
        while (linkToUpdate['FromID_' + idx] && linkToUpdate['FromID_' + idx].FromIDValue) {
          idx++;
        }
        linkToUpdate['FromID_' + idx] = { FromIDValue: newPhase.label, FromType: 'Step', IDScope: 'Internal' };
      }
    }
  }

  return true;
}

/**
 * CLOSE BRANCH - Create convergence at a specific phase.
 * The phase becomes the convergence target.
 * CORRECTED: Handles multiple FromID elements (not arrays) for Aveva compatibility.
 */
function closeBranchBefore(op, convergencePhaseLabel) {
  var structure = computeBranchStructure(op);
  if (!structure.hasFork) {
    console.error('No open branch to close');
    return false;
  }

  if (structure.hasConvergence) {
    console.error('Branch already closed');
    return false;
  }

  // Find what points to convergencePhaseLabel
  var sources = [];
  for (var i = op.Links.length - 1; i >= 0; i--) {
    var l = op.Links[i];
    
    // Check ControlLink
    if (l.LinkType === 'ControlLink' && 
        l.ToID && 
        l.ToID.ToIDValue === convergencePhaseLabel) {
      sources.push({ 
        FromIDValue: l.FromID.FromIDValue, 
        FromType: 'Step', 
        IDScope: 'Internal' 
      });
      op.Links.splice(i, 1);
    }
    
    // Check ParallelDivergent - look for multiple ToID properties
    else if (l.LinkType === 'ParallelDivergent' && l.FromID) {
      var targetFound = false;
      
      // Check ToID
      if (l.ToID && l.ToID.ToIDValue === convergencePhaseLabel) {
        targetFound = true;
      } else {
        // Check ToID_1, ToID_2, etc.
        var idx = 1;
        while (l['ToID_' + idx] && !targetFound) {
          if (l['ToID_' + idx].ToIDValue === convergencePhaseLabel) {
            targetFound = true;
          }
          idx++;
        }
      }
      
      if (targetFound) {
        sources.push({ 
          FromIDValue: l.FromID.FromIDValue, 
          FromType: 'Step', 
          IDScope: 'Internal' 
        });
      }
    }
  }

  if (sources.length < 2) {
    console.error('Need at least 2 sources for convergence, found:', sources);
    return false;
  }

  // Create ParallelConvergent link with multiple FromID properties (not array)
  var convLink = {
    ID: 'link_cv_' + Date.now(),
    LinkType: 'ParallelConvergent',
    FromID: { FromIDValue: sources[0].FromIDValue, FromType: 'Step', IDScope: 'Internal' },
    ToID: { ToIDValue: convergencePhaseLabel, ToType: 'Step', IDScope: 'Internal' }
  };
  
  // Add additional FromID as separate properties
  for (var s = 1; s < sources.length; s++) {
    convLink['FromID_' + s] = { FromIDValue: sources[s].FromIDValue, FromType: 'Step', IDScope: 'Internal' };
  }
  
  op.Links.push(convLink);

  return true;
}

// ============================================================================
// Helper function - used by lane.js during branch creation
// ============================================================================

/**
 * Attempts to create a branch in an operation at the last phase.
 * This is called by the UI when user clicks "Add Branch Lane"
 */
function addBranchToOp(u, o) {
  currentRecipeData._structuralEdit = true;
  var up = currentRecipeData.unit_procedures[u];
  var op = up.operations[o];
  
  // Initialize Links array if needed
  if (!op.Links) op.Links = [];
  
  // Find the last phase in the operation
  var lastPhase = op.phases.length > 0 ? op.phases[op.phases.length - 1] : null;
  
  if (!lastPhase) {
    alert('Cannot create branch in empty operation. Add a phase first.');
    return;
  }
  
  // Use createBranchAfter for proper structure
  var success = createBranchAfter(op, lastPhase.label);
  
  if (success) {
    renderAll();
    alert('Branch created successfully! Branch A and Branch B are now parallel.');
  }
}

// Export for use in node.js context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeBranchStructure: computeBranchStructure,
    getPhaseBranch: getPhaseBranch,
    getLastPhaseInBranch: getLastPhaseInBranch,
    traceForwardFrom: traceForwardFrom,
    createBranchAfter: createBranchAfter,
    insertPhaseIntoBranch: insertPhaseIntoBranch,
    closeBranchBefore: closeBranchBefore
  };
}

// ============================================================================
// Stage 2 — ID-based linear insertion helpers
// ============================================================================
// Insert a phase after a specific Phase RecipeElement ID. The outgoing
// ControlLink is rewired by identity, never by display label.
function insertPhaseAfter(op,afterReId,newPhase){
  var outgoing=null;
  for(var i=0;i<op.links.length;i++){
    var link=op.links[i];
    if(link.type==='ControlLink'&&link.from_type==='Step'&&link.from_re_id===afterReId){outgoing=link;break;}
  }
  if(!outgoing){console.error('Cannot find outgoing ControlLink from RecipeElement',afterReId);return false;}
  var index=-1;
  for(var p=0;p<op.phases.length;p++)if(op.phases[p]._reId===afterReId){index=p;break;}
  if(index<0){console.error('Cannot find phase to insert after',afterReId);return false;}
  var oldLabel=outgoing.to,oldStepId=outgoing.to_id,oldReId=outgoing.to_re_id,oldType=outgoing.to_type;
  outgoing.to=newPhase.label;outgoing.to_id='';outgoing.to_re_id=newPhase._reId;outgoing.to_type='Step';
  op.links.push({type:'ControlLink',from:newPhase.label,from_id:'',from_re_id:newPhase._reId,from_type:'Step',to:oldLabel,to_id:oldStepId||'',to_re_id:oldReId||'',to_type:oldType||'Step'});
  op.phases.splice(index+1,0,newPhase);
  return true;
}

// Append to a linear operation. If it already has phases, use the final phase;
// otherwise replace the existing Begin -> End ControlLink.
function appendPhaseToOperation(op,newPhase){
  if(op.phases.length)return insertPhaseAfter(op,op.phases[op.phases.length-1]._reId,newPhase);
  var beginId=op._beginReId,outgoing=null;
  for(var i=0;i<op.links.length;i++){var link=op.links[i];if(link.type==='ControlLink'&&link.from_type==='Step'&&link.from_re_id===beginId){outgoing=link;break;}}
  if(!outgoing){console.error('Cannot find Begin ControlLink for empty operation');return false;}
  var oldLabel=outgoing.to,oldStepId=outgoing.to_id,oldReId=outgoing.to_re_id,oldType=outgoing.to_type;
  outgoing.to=newPhase.label;outgoing.to_id='';outgoing.to_re_id=newPhase._reId;outgoing.to_type='Step';
  op.links.push({type:'ControlLink',from:newPhase.label,from_id:'',from_re_id:newPhase._reId,from_type:'Step',to:oldLabel,to_id:oldStepId||'',to_re_id:oldReId||'',to_type:oldType||'Step'});
  op.phases.push(newPhase);return true;
}


