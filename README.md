# CAUSEWAY — Long COVID Atlas v2

A clickable, **non-clinical** prototype for the Long COVID Atlas/CAUSEWAY concept from the meeting notes. It demonstrates three portal tabs, a shared evidence catalogue, cross-paper method planning and a first TACO evidence/readiness MCP server. It is **not** approved diagnostic, predictive, or prescribing software.

This is the second prototype release, **v2** (`2.0.0` in API and agent metadata). The current work is tracked in [TASKS.md](TASKS.md). Start with the [beginner guide](docs/BEGINNER_GUIDE.md). The active scope is the TACO agent and portal updates.

## What v2 includes

- Patient comorbidities and current medicines, shared with the Doctor Portal in the same browser session.
- Doctor explanations showing which symptoms matched each illustrative theme rule.
- Ten core research method components, eight reference/proposed combinations, a custom combination workbench and the Shiny explorer link.
- Four working TACO evidence/readiness MCP tools, also available through the website's local API. Conversational host integration and scientific prediction execution remain pending.

## Fastest way to demo

Open `CAUSEWAY_demo.html` in a modern web browser. No installation, account, database, or internet connection is required. It includes a small embedded **reference dataset** from the accompanying research papers and will not store real patient information.

For the demo: click **Load fictional example** in **Patient**, then add/remove other conditions and current medicines. In **Doctor**, inspect the shared session history and exact symptom-rule explanations. In **Researcher**, open the [Shiny explorer](https://sindypin.shinyapps.io/github/), compare ten core method components, build a proposed combination, filter the 11-gene subset, and inspect REVIEW. TACO evidence/readiness tool execution requires the local server. The website has no LLM chat connection or scientific prediction execution.

## Run the local database-backed prototype

Requires Python 3.10+ for the portal; Python 3.11+ for the optional MCP agent.

Windows PowerShell:

```powershell
# Open a terminal in the project folder first.
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
- `GET /api/research-methods` — method catalogue and reference/proposed combinations
- `GET /api/taco/status` — capabilities and missing prediction requirements
- `GET /api/taco/evidence?topic=inputs` — curated source-linked evidence
- `GET /api/taco/source-audit` — inspected upstream code/version discrepancies
- `POST /api/taco/readiness` — metadata-only checks; never a model prediction
- `POST /api/demo-reviews` — synthetic case only, no patient data
- `/docs` — FastAPI's interactive API docs

Run tests: `python -m pytest -q`

Browser workflow check (Playwright plus Chromium or Microsoft Edge): `python tests/browser_check.py`. It exercises offline and backend-backed views, with HTTP requests routed through FastAPI's real handlers using TestClient. The check uses a temporary database and leaves no screenshots or presentation files in the project. Regenerate the offline demo using `python scripts/build_demo.py`. See [TACO_AGENT.md](docs/TACO_AGENT.md) to install and connect the MCP server to a chat host.

## Project files

| Path | Purpose |
|---|---|
| `app.py`, `static/`, `requirements.txt` | Local website, API and runtime dependencies |
| `taco_agent/`, `requirements-agent.txt` | Shared TACO research tools and optional MCP server |
| `demo_evidence.db` | Local SQLite evidence and synthetic demo-review storage |
| `CAUSEWAY_demo.html`, `scripts/build_demo.py` | Generated offline website and its rebuild script |
| `examples/` | Fictional metadata for the readiness tool |
| `tests/` | API, MCP and browser workflow checks |
| `docs/`, `ARCHITECTURE.md`, `TASKS.md` | Usage guidance, current architecture and remaining work |

Skipped presentation materials, presentation-only dependencies and scripts, and generated preview images have been removed from the website source tree. Python environments, Git history and the local evidence database are retained.

## Design decisions reflected in the prototype

1. **One platform; three portals:** Patient, Doctor, Researcher. The patient portal collects self-reported symptoms without personal identifiers; the doctor portal shows the *same browser session* and demonstrates a human-oversight workflow; the researcher portal provides method comparison, provenance and literature summaries.
2. **REVIEW (literature):** systematic review summarising 101 papers and limitations by omics domain.
3. **MR/CT/DCE:** researcher gene table shows only *presence among the two supporting methods* in SPLIT Table 3 for 11 multi-supported genes. It does **not** show per-method numerical ranks. Adding rank scores requires the actual validated model output files and harmonisation decisions from Sindy.
4. **TACO:** model in the paper uses gene expression and pathway-based feature selection. **No symptom-only risk percentage is produced.** Symptom themes do not diagnose Long COVID, assign validated subtypes or provide a percentage probability.
5. **SPLIT:** module entry refers to predicted drug safety, adverse events and efficacy by cohort. **Drug lists are research screening outputs, not treatment prescriptions.** No automatic prescription recommendation is implemented.
6. **Paper2Agent:** informs the first local TACO MCP server, exposing evidence, source audit, readiness and status tools. A separate MCP host supplies the LLM; its connection is not automatically installed. The website calls the same research tools through FastAPI. No scientific model has been executed; other example agent routes remain proposed.
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
| Future agent integration | LLM tool calls connected to the existing MCP tools | Retrieve evidence and invoke scientific functions only after reference validation |
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
2. Should v2 evolve into an anonymous public research site or a restricted platform with patient/doctor accounts? Does institutional ethics approval cover personal symptom collection?
3. Which fields are mandatory in the **claim schema**, and how will uncertainty and evidence strength be defined per method?
4. Is there a validated **symptom-only** patient risk or subtype model? If not, should percentage prediction be deferred or presented as unavailable until a clinical pipeline exists?
5. Is a clinician supposed to review patient intake, AI statements or a formal diagnosis? What is the escalation and override procedure?
6. For drug evidence, should the interface prioritise *avoid-list* flags or show all ranked candidates with cohort-specific safety and efficacy?
7. Should v2 display **precomputed** outputs only, or should a later extension launch analysis jobs through CAUSA?
8. For MR/CT/DCE, what numeric score normalization is scientifically appropriate for side-by-side rankings? Are missing scores zero, null, or not applicable?

## Next practical steps

1. Discuss this prototype and confirm audiences, capabilities, safety boundaries and 2-3 core stories per role.
2. Create a CAUSA package input/output and evidence schema with Sindy and Thuc.
3. Load actual *versioned* research outputs and design the visualisations, preserving method names and provenance.
4. Rebuild the approved UI in React; implement the Python APIs and PostgreSQL schema.
5. Only then add and benchmark agent tool use, retrieval faithfulness, uncertainty handling and clinician review.
