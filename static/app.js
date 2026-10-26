(() => {
  "use strict";
  const GENE_ROWS = [
    ["ERCC3","CT,MR","DNA repair"],["HIF1A","CT,DCE","Hypoxia / immune regulation"],
    ["IMMT","CT,MR","Mitochondrial structure"],["LEF1","CT,DCE","Wnt signaling"],
    ["MED19","CT,MR","Transcription (Mediator complex)"],["MYC","CT,DCE","Cellular stress / proliferation"],
    ["NDUFA6","CT,MR","Mitochondrial complex I"],["PNPO","DCE,MR","Vitamin B6 metabolism"],
    ["POMC","CT,DCE","Neuroendocrine signaling"],["STAT3","CT,DCE","Immune regulation / JAK-STAT"],
    ["TP53","CT,DCE","Cell cycle / DNA damage"]
  ];
  const MODULE_ROWS = [
    ["REVIEW","Literature evidence","101 Long COVID omics studies","Evidence-quality summaries","1_REVIEW.pdf","https://doi.org/10.1080/10408363.2025.2583083"],
    ["MR + Control","Gene drivers and subtypes","GWAS, eQTL, RNA-seq, PPI","Putative causal genes and exploratory subtypes","2_MRCONTROL.pdf","https://github.com/SindyPin/Causal-Multiomics-Method"],
    ["TACO","Early risk prediction","Gene-expression profiles and KEGG pathways","Model-based Long COVID risk predictions","3_TACO.pdf","https://github.com/SindyPin/TACO"],
    ["SPLIT","Drug prioritisation","Causal genes, drug targets, clinical cohorts","Predicted safety, efficacy and drug rankings","4_SPLIT.pdf","https://github.com/SindyPin/SPLIT"],
    ["Paper2Agent","AI agent architecture","Papers, code, datasets, validated tools","Reference for research tool-calling agents","Paper2Agent.pdf","https://github.com/jmiao24/Paper2Agent"]
  ];
  const REVIEW_ROWS = [
    ["Genomics","Long COVID susceptibility loci; immune and cardiopulmonary pathways","Differences in population and case definitions"],
    ["Transcriptomics","Immune / coagulation dysregulation; molecular endotypes","Small cohorts and limited independent validation"],
    ["Proteomics","Complement and coagulation abnormalities","Platform differences and variable replication"],
    ["Metabolomics","Altered mitochondrial function and cellular bioenergetics","Longitudinal and independent validation gaps"],
    ["Multi-omics","Potential inflammatory versus metabolic endotypes","Heterogeneous inputs and nonstandard phenotyping"]
  ];
  const seed = {
    genes: GENE_ROWS.map(([gene, methods, functional_category]) => ({gene, methods, functional_category, source:"4_SPLIT.pdf, Table 3"})),
    modules: MODULE_ROWS.map(([name,question,inputs,outputs,source_file,source_url])=>({name,question,inputs,outputs,source_file,source_url})),
    review: REVIEW_ROWS.map(([domain,finding,limitation])=>({domain,finding,limitation,source:"1_REVIEW.pdf"}))
  };
  let data = seed;
  let research = {methods:[],pipelines:[]};
  const state = {selected:new Set(),tab:"patient",decision:null,agentQuestion:"genes",conditionStatus:"unknown",conditions:new Set(),customConditions:[],medicineStatus:"unknown",medicines:[],combination:new Set(),customCombinations:[]};
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const safeSource = url => /^https:\/\/(github\.com\/|doi\.org\/|arxiv\.org\/|sindypin\.shinyapps\.io\/)/.test(url || "") ? url : "#";
  const symptomDefinitions = [
    ["brain-fog","Brain fog / unclear thinking"],
    ["concentration","Memory / concentration issues"],
    ["breathlessness","Shortness of breath"],
    ["cough","Persistent cough"],
    ["sleep","Sleep disturbances"],
    ["fatigue","Persistent fatigue"],
    ["digestive","Digestive discomfort"],
    ["appetite","Appetite / weight changes"],
    ["mood","Mood-related symptoms"],
    ["oral","Oral / dental concerns"],
    ["pem","Symptoms after exertion"],
    ["other","Other persistent symptoms"]
  ];
  const themes = [
    {title:"Respiratory–sleep",ids:["breathlessness","cough","sleep"],description:"Reported study theme: breathing and sleep symptoms"},
    {title:"Neuro-psychological / dental",ids:["brain-fog","concentration","mood","oral"],description:"Reported study theme: cognitive, psychological and oral symptoms"},
    {title:"Gastro-metabolic",ids:["digestive","appetite"],description:"Reported study theme: digestive and metabolic symptoms"}
  ];
  const conditionDefinitions = [["asthma","Asthma"],["diabetes","Diabetes"],["cardiovascular","Cardiovascular condition"],["autoimmune","Autoimmune condition"],["kidney","Kidney condition"],["mental-health","Mental health condition"]];
  function invalidateReview() {
    state.decision = null;
    document.querySelectorAll(".decision-option").forEach(button => button.classList.remove("chosen"));
    $("review-message").textContent = "";
  }
  function conditionLabels() {
    return [...conditionDefinitions.filter(([id]) => state.conditions.has(id)).map(([,label]) => label), ...state.customConditions];
  }
  function historyEmpty(status, kind) {
    if (status === "none") return kind === "conditions" ? "No known other conditions reported." : "Not taking any medicines, as reported.";
    return status === "listed" ? "History marked for entry; no items supplied yet." : "Not supplied / unknown.";
  }
  function renderHistory() {
    $("condition-status").value = state.conditionStatus;
    $("medicine-status").value = state.medicineStatus;
    $("condition-fields").disabled = state.conditionStatus !== "listed";
    $("medicine-fields").disabled = state.medicineStatus !== "listed";
    $("condition-options").innerHTML = conditionDefinitions.map(([id,label]) => `<label class="symptom-option"><input type="checkbox" data-condition="${id}" ${state.conditions.has(id)?"checked":""}><span>${esc(label)}</span></label>`).join("");
    $("custom-conditions").innerHTML = state.customConditions.map((label,i) => `<span class="chip">${esc(label)} <button class="remove-item" data-remove-condition="${i}" aria-label="Remove ${esc(label)}">×</button></span>`).join("");
    $("medicine-list").innerHTML = state.medicines.length ? state.medicines.map((medicine,i) => `<div class="context-item"><div><b>${esc(medicine.name)}</b><small>Dose: ${esc(medicine.dose || "Not supplied")} · Frequency: ${esc(medicine.frequency || "Not supplied")}</small><small>Reason: ${esc(medicine.reason || "Not supplied")}</small></div><button class="remove-item" data-remove-medicine="${i}" aria-label="Remove ${esc(medicine.name)}">×</button></div>`).join("") : `<p class="field-help">${esc(historyEmpty(state.medicineStatus,"medicines"))}</p>`;
  }
  function updateHistory() {
    invalidateReview(); renderHistory(); updateDoctor();
  }
  function themeMatches() {
    return themes.map(t => ({...t,matched:t.ids.filter(s=>state.selected.has(s))})).filter(t=>t.matched.length > 0).sort((a,b)=>b.matched.length-a.matched.length);
  }
  function renderSymptoms() {
    $("symptom-options").innerHTML = symptomDefinitions.map(([id,label]) => `<label class="symptom-option"><input data-symptom="${id}" type="checkbox" ${state.selected.has(id)?"checked":""}><span>${esc(label)}</span></label>`).join("");
    $("symptom-options").querySelectorAll("input").forEach(input => input.addEventListener("change",e=>{
      if(e.target.checked) state.selected.add(e.target.dataset.symptom); else state.selected.delete(e.target.dataset.symptom);
      invalidateReview();
      updatePatient(); updateDoctor();
    }));
  }
  function updatePatient() {
    $("selected-count").textContent = `${state.selected.size} selected`;
    const matches = themeMatches();
    if (!state.selected.size) {
      $("theme-results").className = "theme-results empty";
      $("theme-results").innerHTML = `<div class="empty-icon">◌</div><h4>No symptoms selected yet</h4><p>Select symptoms on the left to see potentially relevant research themes.</p>`;
    } else if (!matches.length) {
      $("theme-results").className = "theme-results empty";
      $("theme-results").innerHTML = `<div class="empty-icon">◌</div><h4>No specific theme overlap</h4><p>These symptoms can occur across many conditions and do not map uniquely to one research subtype.</p>`;
    } else {
      $("theme-results").className = "theme-results";
      $("theme-results").innerHTML = `<p style="font-size:11px;color:#7b8ca3;line-height:1.5">Selected symptoms overlap with the following exploratory research themes. These are not patient subtype assignments.</p>`+
         matches.map(t=>`<div class="theme-item"><span class="theme-number">${t.matched.length}</span><div><b>${esc(t.title)}</b><small>${esc(t.description)}</small></div></div>`).join("");
    }
  }
  function updateDoctor() {
    $("doctor-intake-count").textContent = String(state.selected.size);
    const selected = symptomDefinitions.filter(s=>state.selected.has(s[0])).map(s=>s[1]);
    $("doctor-symptoms").innerHTML = selected.length ? selected.map(s=>`<span class="chip">${esc(s)}</span>`).join("") : `<span class="placeholder-label">No symptoms have been selected in the Patient tab.</span>`;
    const matches = themeMatches();
    $("doctor-themes").innerHTML = matches.length ? `<b>Symptom overlap only:</b> ${matches.map(t=>esc(t.title)).join(" · ")}. These should not be treated as a formal subtype classification.` : `No specific subtype pattern can be inferred from the available inputs.`;
    $("doctor-conditions").innerHTML = state.conditionStatus === "listed" && conditionLabels().length ? conditionLabels().map(label => `<span class="chip">${esc(label)}</span>`).join(" ") : `<p class="field-help">${esc(historyEmpty(state.conditionStatus,"conditions"))}</p>`;
    $("doctor-medicines").innerHTML = state.medicineStatus === "listed" && state.medicines.length ? state.medicines.map(medicine => `<div class="context-item"><div><b>${esc(medicine.name)}</b><small>Dose: ${esc(medicine.dose || "Not supplied")} · Frequency: ${esc(medicine.frequency || "Not supplied")}</small><small>Reason: ${esc(medicine.reason || "Not supplied")}</small></div></div>`).join("") : `<p class="field-help">${esc(historyEmpty(state.medicineStatus,"medicines"))}</p>`;
    $("doctor-explanation").innerHTML = matches.length ? matches.map(theme => `<div class="explanation-item"><b>${esc(theme.title)}</b><p>Matched ${theme.matched.length} of ${theme.ids.length} symptoms in this interface rule: ${theme.matched.map(id => esc(symptomDefinitions.find(s => s[0] === id)[1])).join(", ")}.</p><small>Rule includes: ${theme.ids.map(id => esc(symptomDefinitions.find(s => s[0] === id)[1])).join(", ")}.</small></div>`).join("") : `<p class="field-help">No theme rule currently matches. Select symptoms in the Patient Portal to inspect the matching explanation.</p>`;
    $("submit-review").disabled = !state.decision || state.selected.size === 0;
  }
  function renderTables() {
    $("modules-table").innerHTML = data.modules.map(r=>`<tr><td class="module-name">${esc(r.name)}</td><td>${esc(r.question)}</td><td>${esc(r.inputs)}</td><td>${esc(r.outputs)}</td><td><a class="source-url" href="${esc(safeSource(r.source_url))}" target="_blank" rel="noopener noreferrer">GitHub / DOI ↗</a></td></tr>`).join("");
    $("review-table").innerHTML = data.review.map(r=>`<tr><td class="module-name">${esc(r.domain)}</td><td>${esc(r.finding)}</td><td>${esc(r.limitation)}</td></tr>`).join("");
    renderGenes();
  }
  function renderGenes() {
    const search = $("gene-search").value.trim().toLowerCase();
    const method = $("method-filter").value;
    const rows = data.genes.filter(r=>r.gene.toLowerCase().includes(search) && (method === "all" || r.methods.split(",").includes(method)));
    $("genes-table").innerHTML = rows.length ? rows.map(r=>`<tr><td class="gene-name">${esc(r.gene)}</td><td>${esc(r.functional_category)}</td>${["MR","CT","DCE"].map(m=>`<td class="center">${r.methods.split(",").includes(m)?'<span class="method-yes" title="Reported support">✓</span>':'<span class="method-no" title="Not listed in Table 3 for this gene">—</span>'}</td>`).join("")}<td>${esc(r.source)}</td></tr>`).join("") : `<tr><td colspan="6" style="text-align:center;padding:25px">No genes found in the current 11-gene subset.</td></tr>`;
    $("gene-count-label").textContent = `${rows.length} gene${rows.length===1?"":"s"}`;
  }
  function renderMethodCatalogue() {
    const stage = $("stage-filter").value;
    const rows = research.methods.filter(method => stage === "all" || method.stage === stage);
    $("method-catalogue-table").innerHTML = rows.length ? rows.map(method => `<tr><td class="module-name">${esc(method.name)}<div class="method-description">${esc(method.paper)}</div></td><td>${esc(method.stage)}</td><td>${esc(method.inputs)}<br><b>→</b> ${esc(method.outputs)}</td><td>${esc(method.requirements)}</td><td><span class="status-label">${esc(method.status)}</span><br><a class="source-url" href="${esc(safeSource(method.source))}" target="_blank" rel="noopener noreferrer">Source ↗</a></td></tr>`).join("") : '<tr><td colspan="5" class="method-empty">No methods available for this task.</td></tr>';
    $("method-catalogue-count").textContent = `${rows.length} of ${research.methods.length} methods`;
  }
  function combinationDetails(ids) {
    const selected = research.methods.filter(method => ids.includes(method.id));
    const known = research.pipelines.find(pipeline => pipeline.methods.length === ids.length && pipeline.methods.every(id => ids.includes(id)));
    const warnings = ["Align identifiers, data versions, population definitions and uncertainty measures before connecting outputs."];
    if (ids.includes("taco")) warnings.push("TACO requires molecular features and a resolved model version; a selected combination cannot produce a patient risk score.");
    if (ids.includes("subtyping")) warnings.push("Subtyping requires expression profiles. Symptom themes in the demo are not molecular cluster assignments.");
    if (ids.some(id => ["drug-mapping","planet","split"].includes(id))) warnings.push("Drug predictions require a specified trial cohort; they are not individual prescriptions or interaction checks.");
    if (ids.includes("subtyping") && ids.includes("planet")) warnings.push("A molecular subtype does not automatically define a PlaNet trial cohort; establish a mapping first.");
    if (ids.includes("paper2agent")) warnings.push("Paper2Agent supplies an orchestration approach. Scientific functions still need individual verification.");
    if (ids.includes("ct") && ids.includes("mr")) warnings.push("MR effect evidence and CT controllability are different quantities; retain their separate interpretation.");
    return {selected,known,warnings};
  }
  function renderCombinations() {
    const methods = new Map(research.methods.map(method => [method.id,method]));
    const rows = [...research.pipelines,...state.customCombinations];
    $("combinations-table").innerHTML = rows.map(pipeline => `<tr><td class="module-name">${esc(pipeline.name)}<div class="method-description">${esc(pipeline.description)}</div>${pipeline.custom?`<button class="button subtle remove-combination" data-remove-combination="${esc(pipeline.id)}">Remove</button>`:""}</td><td>${pipeline.methods.map(id => esc(methods.get(id)?.name || id)).join(" + ")}</td><td><span class="status-label">${esc(pipeline.evidence)}</span>${pipeline.source?`<br><a class="source-url" href="${esc(safeSource(pipeline.source))}" target="_blank" rel="noopener noreferrer">Reference ↗</a>`:""}<div class="method-description">Not executed in CAUSEWAY</div></td><td>${esc(pipeline.compatibility)}</td><td>${esc(pipeline.validation)}</td></tr>`).join("");
  }
  function updateCombinationPreview() {
    const ids = [...state.combination];
    $("add-combination").disabled = ids.length < 2;
    if (!ids.length) {$("combination-preview").textContent="Choose at least two methods to inspect their requirements.";return;}
    const {selected,known,warnings} = combinationDetails(ids);
    $("combination-preview").innerHTML = `<b>${selected.map(method=>esc(method.name)).join(" + ")}</b><p>Evidence status: ${esc(known?.evidence || "Proposed experiment; not validated")}.</p><ul>${warnings.map(warning=>`<li>${esc(warning)}</li>`).join("")}</ul><p>No combined performance or confidence percentage is defined. Each task needs its own evaluation.</p>`;
  }
  function renderResearch() {
    renderMethodCatalogue();
    $("combination-options").innerHTML = research.methods.map(method => `<label><input type="checkbox" data-combine-method="${method.id}" ${state.combination.has(method.id)?"checked":""}><span><b class="method-picker-name">${esc(method.name)}</b><small>${esc(method.stage)} · ${esc(method.paper)}</small></span></label>`).join("");
    renderCombinations();updateCombinationPreview();
  }
  function renderToolResult(result) {
    let content = '<div class="tool-result-banner">Evidence / metadata tool completed. Prediction model not executed.</div>';
    if (result.entries) content += Object.entries(result.entries).map(([name,entry])=>`<h4>${esc(name)}</h4><p>${esc(entry.text)}</p>`).join("");
    if (result.observations) content += `<h4>Source audit</h4><ul>${result.observations.map(observation=>`<li>${esc(observation)}</li>`).join("")}</ul><p>${esc(result.version_note)}</p>`;
    if (result.checks) content += `<h4>Metadata checks ${result.metadata_checks_passed?"passed":"need attention"}</h4>${result.checks.map(check=>`<div class="check-row"><b class="${check.passed?"check-pass":"check-fail"}">${check.passed?"✓":"!"} ${esc(check.name)}</b><small>${esc(check.explanation)}</small></div>`).join("")}<p>${esc(result.interpretation)}</p><h4>Still needed for prediction</h4><ul>${result.next_steps.map(step=>`<li>${esc(step)}</li>`).join("")}</ul>`;
    if (result.sources) content += '<h4>Sources</h4>' + result.sources.map(source=>`<a class="source-url" href="${esc(safeSource(source.url))}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a><small>${esc(source.locator)}</small>`).join("");
    $("taco-tool-result").innerHTML = content;
  }
  async function runTacoTool(path, manifest) {
    if (!window.location.protocol.startsWith("http")) {
      $("taco-tool-status").textContent="Offline preview: tool not executed.";
      $("taco-tool-result").innerHTML='<p class="field-help">Start the local FastAPI server and open http://127.0.0.1:8000 to run the evidence and readiness tools. The offline preview does not contact an AI service or run a model.</p>';
      return;
    }
    $("taco-tool-status").textContent="Running local research tool…";
    const buttons = document.querySelectorAll("[data-taco-topic], #taco-audit, #taco-readiness");
    buttons.forEach(button=>button.disabled=true);
    try {
      const options = manifest === undefined ? {} : {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(manifest)};
      const response = await fetch(path,options);
      if (!response.ok) throw new Error(`Tool request rejected (HTTP ${response.status}). Check the JSON fields and local server.`);
      const result = await response.json();
      renderToolResult(result);
      $("taco-tool-status").textContent="Local tool completed · no model prediction";
    } catch(error) {
      $("taco-tool-status").textContent="Tool did not complete.";
      $("taco-tool-result").textContent=error.message;
    } finally {buttons.forEach(button=>button.disabled=false);}
  }
  const agentPlans = {
    genes:[
      ["Resolve scientific entity","Normalize STAT3 identifiers and retrieve candidate gene records"],
      ["Compare validated methods","Query MR, Control Theory and DCE evidence with source-specific context"],
      ["Return an evidence summary","Show which methods support the claim; do not invent missing numerical ranks"]
    ],
    subtypes:[
      ["Retrieve subtype study","Load subtype descriptions and their study population"],
      ["Compare reported profiles","Summarise reported molecular and clinical differences"],
      ["Report limitations","Clearly mark subtypes as exploratory and not individual diagnoses"]
    ],
    drugs:[
      ["Select cohort context","Identify SPLIT cognitive vs respiratory cohort"],
      ["Retrieve drug scoring outputs","Query predicted safety, efficacy, adverse-event burden and flags"],
      ["Compare with provenance","Distinguish modelled prioritisation from clinical treatment recommendations"]
    ],
    prediction:[
      ["Retrieve TACO model metadata","Read dataset definition, input requirements and model version"],
      ["Inspect evaluation results","Summarise nested cross-validation and risk of leakage"],
      ["Check suitability","Explain external-validation gaps; do not compute symptom-only patient risk"]
    ]
  };
  function updateAgent() {
    $("agent-route").innerHTML = agentPlans[state.agentQuestion].map(([title,desc],i)=>`<div class="flow-step"><span class="flow-step-number">${i+1}</span><div><b>${esc(title)}</b><small>${esc(desc)}</small></div></div>${i===2?"":'<div class="flow-arrow">↓</div>'}`).join("") + `<div class="agent-warning">AI agent not connected in v1. Future answers must call the validated CAUSA package, retain source citations and describe uncertainty.</div>`;
  }
  function showTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("hidden",p.id!==`tab-${tab}`));
    document.querySelectorAll(".nav-link").forEach(b=>{
      const on=b.dataset.tab===tab;
      b.classList.toggle("active",on);
      b.setAttribute("aria-pressed",String(on));
    });
    $("crumb-label").textContent = {patient:"Patient portal",doctor:"Doctor portal",researcher:"Researcher portal"}[tab];
    window.scrollTo({top:0,behavior:"auto"});
  }
  function toast(message) {
    const el = document.createElement("div"); el.className="toast"; el.textContent=message;document.body.appendChild(el);
    setTimeout(()=>el.remove(),3700);
  }
  function wire() {
    document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
    $("load-example").addEventListener("click",()=>{state.selected = new Set(["brain-fog","fatigue","sleep","concentration"]);state.conditionStatus="listed";state.conditions=new Set(["asthma"]);state.customConditions=[];state.medicineStatus="listed";state.medicines=[{name:"Example medicine A",dose:"Fictional dose",frequency:"Example frequency",reason:"Fictional case only"}];invalidateReview();renderSymptoms();renderHistory();updatePatient();updateDoctor();toast("Fictional symptoms, condition and medicine loaded. Switch to the Doctor portal to review.");});
    $("clear-symptoms").addEventListener("click",()=>{state.selected.clear();invalidateReview();renderSymptoms();updatePatient();updateDoctor();});
    $("condition-status").addEventListener("change",e=>{state.conditionStatus=e.target.value;if(state.conditionStatus!=="listed"){state.conditions.clear();state.customConditions=[];}updateHistory();});
    $("condition-options").addEventListener("change",e=>{const id=e.target.dataset.condition;if(!id)return;if(e.target.checked)state.conditions.add(id);else state.conditions.delete(id);updateHistory();});
    $("condition-form").addEventListener("submit",e=>{e.preventDefault();const label=$("condition-name").value.trim();if(state.conditionStatus!=="listed"||!label)return;if(!conditionLabels().some(x=>x.toLowerCase()===label.toLowerCase()))state.customConditions.push(label);$("condition-name").value="";updateHistory();});
    $("custom-conditions").addEventListener("click",e=>{const button=e.target.closest("[data-remove-condition]");if(!button)return;state.customConditions.splice(Number(button.dataset.removeCondition),1);updateHistory();});
    $("medicine-status").addEventListener("change",e=>{state.medicineStatus=e.target.value;if(state.medicineStatus!=="listed")state.medicines=[];updateHistory();});
    $("medicine-form").addEventListener("submit",e=>{e.preventDefault();const name=$("medicine-name").value.trim();if(state.medicineStatus!=="listed"||!name)return;state.medicines.push({name,dose:$("medicine-dose").value.trim(),frequency:$("medicine-frequency").value.trim(),reason:$("medicine-reason").value.trim()});$("medicine-form").reset();updateHistory();});
    $("medicine-list").addEventListener("click",e=>{const button=e.target.closest("[data-remove-medicine]");if(!button)return;state.medicines.splice(Number(button.dataset.removeMedicine),1);updateHistory();});
    $("gene-search").addEventListener("input",renderGenes);
    $("method-filter").addEventListener("change",renderGenes);
    $("stage-filter").addEventListener("change",renderMethodCatalogue);
    $("combination-options").addEventListener("change",event=>{const id=event.target.dataset.combineMethod;if(!id)return;if(event.target.checked)state.combination.add(id);else state.combination.delete(id);updateCombinationPreview();});
    $("clear-combination").addEventListener("click",()=>{state.combination.clear();renderResearch();});
    $("select-all-methods").addEventListener("click",()=>{state.combination=new Set(research.methods.map(method=>method.id));renderResearch();});
    $("add-combination").addEventListener("click",()=>{
      const ids=[...state.combination].sort();if(ids.length<2)return;
      const key=ids.join("+");
      if (state.customCombinations.some(combination=>combination.id===key)) {toast("This combination is already in your comparison table.");return;}
      const {known,warnings}=combinationDetails(ids);
      state.customCombinations.push({id:key,custom:true,name:`Session combination ${state.customCombinations.length+1}`,methods:ids,evidence:known?.evidence||"Proposed experiment; not validated",description:known?.description||"Custom research plan selected in this browser session.",compatibility:warnings.join(" "),validation:known?.validation||"Define separate task-specific endpoints, participant splits and independent validation before execution.",source:known?.source||null});
      renderCombinations();toast("Combination added for comparison; no scientific analysis was run.");
    });
    $("combinations-table").addEventListener("click",event=>{const button=event.target.closest("[data-remove-combination]");if(!button)return;state.customCombinations=state.customCombinations.filter(combination=>combination.id!==button.dataset.removeCombination);renderCombinations();});
    document.querySelectorAll("[data-taco-topic]").forEach(button=>button.addEventListener("click",()=>runTacoTool(`/api/taco/evidence?topic=${encodeURIComponent(button.dataset.tacoTopic)}`)));
    $("taco-audit").addEventListener("click",()=>runTacoTool("/api/taco/source-audit"));
    $("taco-readiness").addEventListener("click",()=>{try {const manifest=JSON.parse($("taco-manifest").value);runTacoTool("/api/taco/readiness",manifest);}catch(error){$("taco-tool-status").textContent="Invalid JSON; nothing was sent.";$("taco-tool-result").textContent="Use the example JSON format with double-quoted field names and valid values.";}});
    document.querySelectorAll(".decision-option").forEach(b=>b.addEventListener("click",()=>{
      state.decision=b.dataset.decision;
      document.querySelectorAll(".decision-option").forEach(x=>x.classList.toggle("chosen",x===b));
      $("review-message").textContent="";updateDoctor();
    }));
    $("submit-review").addEventListener("click",async()=>{
      const note=$("review-note").value.trim();
      if (!state.decision || state.selected.size===0) return;
      if (/@/.test(note)) {$("review-message").textContent="Please omit names and contact details from this demo.";return;}
      if (window.location.protocol.startsWith("http")) {
        try {
          const res=await fetch("/api/demo-reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({synthetic_case_id:"DEMO-001",decision:state.decision,note})});
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          $("review-message").textContent="Demo-only decision stored in local SQLite; free-text notes were not saved. Not a clinical record.";
        } catch(e) {$("review-message").textContent="Could not save to backend. Start the local FastAPI server to enable database storage.";}
      } else {$("review-message").textContent="Decision recorded in this browser preview only. Run the local server for SQLite demo storage.";}
    });
    document.querySelectorAll(".question[data-question]").forEach(b=>b.addEventListener("click",()=>{
      state.agentQuestion=b.dataset.question;
      document.querySelectorAll(".question[data-question]").forEach(x=>x.classList.toggle("active",x===b));
      updateAgent();
    }));
  }
  async function init() {
    renderSymptoms();renderHistory();wire();updatePatient();updateDoctor();renderTables();updateAgent();
    $("taco-manifest").value=JSON.stringify({dataset_kind:"gene_expression",sample_count:20,feature_count:411,gene_id_namespace:"HGNC",sampling_time:"acute",preprocessing_documented:true,participant_split_documented:true,feature_selection_within_training_folds:true,feature_set_version:"fictional-example-v1"},null,2);
    try {
      const embedded=$("research-data");
      if (embedded) research=JSON.parse(embedded.textContent);
      else {const response=await fetch("/api/research-methods");if(!response.ok)throw new Error("Catalogue unavailable");research=await response.json();}
      renderResearch();
    } catch(error) {$("method-catalogue-table").innerHTML='<tr><td colspan="5" class="method-empty">Research catalogue unavailable. Restart the server or rebuild the offline demo.</td></tr>';}
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      try {
        const resp = await fetch("/api/catalogue", {headers:{"Accept":"application/json"}});
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const remote = await resp.json();
        if (!Array.isArray(remote.genes)||!Array.isArray(remote.modules)||!Array.isArray(remote.review)) throw new Error("Invalid data");
        data=remote; renderTables(); $("data-status").textContent="Local SQLite demo database connected";
      } catch(e) {$("data-status").textContent="Embedded reference data (offline preview)";}
    } else {$("data-status").textContent="Embedded reference data (offline preview)";}
  }
  init();
})();
