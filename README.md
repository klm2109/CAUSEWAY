# CAUSEWAY — Long COVID Atlas (v0.1 Meeting Prototype)

A clickable, **non-clinical** prototype for the Long COVID Atlas/CAUSEWAY concept from the meeting notes. It demonstrates three portal tabs, a shared evidence catalogue, and a proposed AI-agent tool route. It is **not** approved diagnostic, predictive, or prescribing software.

## Fastest way to demo

Open `CAUSEWAY_demo.html` in a modern web browser. No installation, account, database, or internet connection is required. It includes a small embedded **reference dataset** from the accompanying research papers and will not store real patient information.

For the demo: select symptoms in **Patient** (or click **Load fictional example**), switch to **Doctor** to inspect the same in-memory symptom selections and mark a *demo-only review*, then go to **Researcher** to filter 11 genes by method and inspect the REVIEW summary and planned AI-agent actions.

## Run the local database-backed prototype

Requires Python 3.10+.

Windows PowerShell:

```powershell
cd CAUSEWAY_Atlas_v1
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload
```

Then visit http://127.0.0.1:8000/ . The prototype stores a small **research evidence dataset** in `demo_evidence.db` (SQLite) and records only a review decision linked to the fixed **synthetic** case `DEMO-001` (free-text notes are not saved). **Do not enter any real patient data**, names, identifiers, medical records or contact information: this demonstration has *no authentication, authorisation, patient consent system or secure clinical infrastructure.* The in-browser patient checklist is not saved to the backend.

API routes:
- `GET /api/health`
- `GET /api/catalogue` — evidence modules, 11 gene support records, review table
- `GET /api/genes?method=MR&search=STAT3`
- `POST /api/demo-reviews` — synthetic case only, no patient data
- `/docs` — FastAPI's interactive API docs

Run tests: `python -m pytest -q`

## Design decisions reflected in the prototype

1. **One platform; three portals:** Patient, Doctor, Researcher. The patient portal collects self-reported symptoms without personal identifiers; the doctor portal shows the *same browser session* and demonstrates a human-oversight workflow; the researcher portal provides method comparison, provenance and literature summaries.
2. **REVIEW (literature):** systematic review summarising 101 papers and limitations by omics domain.
3. **MR/CT/DCE:** researcher gene table shows only *presence among the two supporting methods* in SPLIT Table 3 for 11 multi-supported genes. It does **not** show per-method numerical ranks. Adding rank scores requires the actual validated model output files and harmonisation decisions from Sindy.
4. **TACO:** model in the paper uses gene expression and pathway-based feature selection. **No symptom-only risk percentage is produced.** Symptom themes do not diagnose Long COVID, assign validated subtypes or provide a percentage probability.
5. **SPLIT:** module entry refers to predicted drug safety, adverse events and efficacy by cohort. **Drug lists are research screening outputs, not treatment prescriptions.** No automatic prescription recommendation is implemented.
6. **Paper2Agent:** informs a planned **v2** tool-calling agent. The v1 prototype shows illustrative proposed tool routes only. It does not call LLMs, run models or claim to have used their outputs.
7. **Database:** demo server uses SQLite (zero setup). Production recommendation is PostgreSQL with migrations, explicit access controls and audited provenance.

## Provenance of seeded records

- The 11 gene support records (`ERCC3`, `HIF1A`, `IMMT`, `LEF1`, `MED19`, `MYC`, `NDUFA6`, `PNPO`, `POMC`, `STAT3`, `TP53`) and their reported pairwise method support come from **SPLIT**, Table 3.
- The five broad omics statements and their limitations are **high-level summaries**, derived from the uploaded **REVIEW** paper. They are not a machine-extracted complete dataset of all 101 studies.
- The three symptom theme names `respiratory–sleep`, `neuro-psychological/dental`, and `gastro-metabolic` follow the **MRCONTROL** paper; the checkbox-to-theme mapping is **our illustrative UI design**, not a published, validated classifier.
- GitHub sources: https://github.com/SindyPin/Causal-Multiomics-Method , https://github.com/SindyPin/TACO , https://github.com/SindyPin/SPLIT , https://github.com/jmiao24/Paper2Agent .

## Recommended production stack

| Layer | Stack | Purpose |
|---|---|---|
| Client | React + TypeScript + Vite | Multi-role views, typed API client, visualisations |
| API | Python + FastAPI + Pydantic | Typed research methods gateway and role-oriented APIs |
| Data | PostgreSQL + SQLModel or SQLAlchemy + Alembic | Harmonised findings, gene ids, sources, evidence claims, reviews |
| R compatibility | R and `Rscript` (isolated process/container) | Preserve MR/CT methods before reimplementing; avoid untrusted execution |
| Jobs | Background worker (Celery/RQ when needed) | Long-running research jobs, not request-thread model inference |
| Agent (v2) | LLM tool calls / MCP adapter (optional) | Query validated CAUSA tools, retrieve evidence, not generate scientific numbers |
| Auth | Institution-managed SSO/OIDC and audited RBAC | Real patient/clinician workflows **only after** ethics, security and privacy review |

The offline HTML is a **design prototype**, not intended to replace the planned React frontend. It allows stakeholders to agree on requirements before introducing build complexity.

## Proposed future data model (draft only; needs Sindy sign-off)

- `sources(id, title, url, year, repository, commit_hash, license)`
- `datasets(id, source_id, version, cohort_id, phenotype_definition, preprocessing, access_level)`
- `methods(id, name, version, input_contract, output_contract, repository_commit)`
- `claims(id, subject_type, subject_id, predicate, phenotype, method_id, cohort_id, value, unit, uncertainty_type, uncertainty_value, evidence_tier, created_at)`
- `claim_evidence(id, claim_id, source_id, dataset_id, reference_locator, validation_status)`
- `gene_scores(claim_id, gene_id, method_id, rank, effect_size, p_value, fdr, score_scale)`
- `prediction_runs(id, method_id, dataset_id, split_version, metrics, calibration_metadata, applicability_notes)`
- `drug_rankings(claim_id, drug_id, cohort_id, safety, adverse_event_burden, efficacy, algorithm_version, flag_type)`
- `clinician_reviews(id, claim_id, reviewer_id, action, notes, timestamp)` only after appropriate role-based security and governance.

The **claim schema** must preserve distinct uncertainty types: a p-value, cross-method support, model-predicted probability and clinical trial outcome are not interchangeable. Avoid a single invented universal "confidence %".

## Unanswered questions for Sindy / Thuc

1. Which repository commits, model versions and output files are the *authoritative* baseline for the CAUSA package?
2. Should v1 be an anonymous public research site or a restricted platform with patient/doctor accounts? Does institutional ethics approval cover personal symptom collection?
3. Which fields are mandatory in the **claim schema**, and how will uncertainty and evidence strength be defined per method?
4. Is there a validated **symptom-only** patient risk or subtype model? If not, should percentage prediction be deferred or presented as unavailable until a clinical pipeline exists?
5. Is a clinician supposed to review patient intake, AI statements or a formal diagnosis? What is the escalation and override procedure?
6. For drug evidence, should the interface prioritise *avoid-list* flags or show all ranked candidates with cohort-specific safety and efficacy?
7. Should v1 display **precomputed** outputs only, or should it launch analysis jobs through CAUSA?
8. For MR/CT/DCE, what numeric score normalization is scientifically appropriate for side-by-side rankings? Are missing scores zero, null, or not applicable?

## Next practical steps

1. Discuss this prototype and confirm audiences, capabilities, safety boundaries and 2-3 core stories per role.
2. Create a CAUSA package input/output and evidence schema with Sindy and Thuc.
3. Load actual *versioned* research outputs and design the visualisations, preserving method names and provenance.
4. Rebuild the approved UI in React; implement the Python APIs and PostgreSQL schema.
5. Only then add and benchmark agent tool use, retrieval faithfulness, uncertainty handling and clinician review.
