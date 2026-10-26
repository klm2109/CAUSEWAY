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
  const state = {selected:new Set(),tab:"patient",decision:null,agentQuestion:"genes"};
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const safeSource = url => /^https:\/\/(github\.com\/|doi\.org\/)/.test(url || "") ? url : "#";
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
  function themeMatches() {
    return themes.map(t => ({...t,matched:t.ids.filter(s=>state.selected.has(s))})).filter(t=>t.matched.length > 0).sort((a,b)=>b.matched.length-a.matched.length);
  }
  function renderSymptoms() {
    $("symptom-options").innerHTML = symptomDefinitions.map(([id,label]) => `<label class="symptom-option"><input data-symptom="${id}" type="checkbox" ${state.selected.has(id)?"checked":""}><span>${esc(label)}</span></label>`).join("");
    $("symptom-options").querySelectorAll("input").forEach(input => input.addEventListener("change",e=>{
      if(e.target.checked) state.selected.add(e.target.dataset.symptom); else state.selected.delete(e.target.dataset.symptom);
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
    $("load-example").addEventListener("click",()=>{state.selected = new Set(["brain-fog","fatigue","sleep","concentration"]);renderSymptoms();updatePatient();updateDoctor();toast("Fictional example loaded. Switch to the Doctor portal to review it.");});
    $("clear-symptoms").addEventListener("click",()=>{state.selected.clear();renderSymptoms();updatePatient();updateDoctor();});
    $("gene-search").addEventListener("input",renderGenes);
    $("method-filter").addEventListener("change",renderGenes);
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
    document.querySelectorAll(".question").forEach(b=>b.addEventListener("click",()=>{
      state.agentQuestion=b.dataset.question;
      document.querySelectorAll(".question").forEach(x=>x.classList.toggle("active",x===b));
      updateAgent();
    }));
  }
  async function init() {
    renderSymptoms();wire();updatePatient();updateDoctor();renderTables();updateAgent();
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
