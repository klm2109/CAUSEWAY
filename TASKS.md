# CAUSEWAY Atlas v2 tasks

Requested order: complete each step and explain it in beginner-friendly language.

- **1. Presentation — skipped at your request.** Presentation artifacts and their build tools have been removed from the website source tree. Paper2Agent remains a research reference for the TACO agent.
- [ ] **2. Create the first TACO AI agent.** The four evidence/readiness tools, MCP server, resource and workflow prompt are implemented and tested. A conversational MCP host still needs to be connected. Scientific prediction execution remains pending because the upstream model definition, versions and reproducible outputs need resolution. See [the agent guide](docs/TACO_AGENT.md).
- [x] **3. Add comorbidities and current medicines to Patient Portal.** Add/remove fictional entries; distinguish none from unknown; share with Doctor Portal in the current browser session.
- [x] **4. Add a cross-paper method comparison table to Researcher Portal.** Compare 10 core components across causal discovery, subtyping, early detection, drug repurposing, evidence synthesis and orchestration. The table covers the linked project modules, not every algorithm in REVIEW's 101 cited studies or every TACO benchmark model.
- [x] **5. Add interpretability to Doctor Portal.** Show exact matching symptoms and the interface rule. Model attribution is unavailable because no patient prediction is executed.
- [x] **6. Add method combinations to Researcher Portal.** Eight reference/proposed workflows, including all five modules together, plus arbitrary session combinations and a select-all button. Show source, status, compatibility requirements and how each task should be evaluated. No combination is executed.

Key resource: [Sindy's Shiny explorer](https://sindypin.shinyapps.io/github/). It is prominently linked in Researcher Portal. The research browser could not inspect the live app; the associated [published study](https://doi.org/10.1371/journal.pcbi.1013725) supplies the methodological context.

## How to review the work

1. Open `CAUSEWAY_demo.html`, then click **Load fictional example**.
2. Inspect **Other conditions and current medicines** in Patient Portal.
3. Open Doctor Portal and review **Case context** and **Why is this theme shown?**
4. Open Researcher Portal, use the task filter and try a method combination.
5. Start the local server to use TACO evidence/readiness tools. The offline demo reports that tools have not executed.

See [the beginner guide](docs/BEGINNER_GUIDE.md) for explanations of each step and the remaining scientific work.
