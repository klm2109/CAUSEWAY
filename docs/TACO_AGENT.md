# CAUSEWAY v2 TACO research tools

Release **v2** (`2.0.0`) provides working **research evidence and dataset-description tools** and a Python terminal launcher for a conversational research agent. The launcher uses the installed, signed-in Codex CLI as its language-model host. The website can call the same tools directly, but has no LLM chat connection. Scientific prediction execution has not been implemented or validated.

## Ask the conversational agent from Python

The environment needs the agent dependencies, an installed Codex CLI, an existing Codex login and network access. On Windows, check the login with `codex.cmd login status`; `codex.cmd login` signs in if needed. The `.cmd` launcher avoids PowerShell script execution-policy problems without changing the execution policy.

From the project directory:

```powershell
.\.venv\Scripts\python.exe -m taco_agent.chat "What data does TACO require?" --trace
```

Check the complete fictional molecular-data description:

```powershell
.\.venv\Scripts\python.exe -m taco_agent.chat "Do these metadata meet the checks, and can I run a prediction now?" --manifest examples/taco_manifest.json --trace
```

Compare it with a fictional symptoms-only description:

```powershell
.\.venv\Scripts\python.exe -m taco_agent.chat "Can this symptoms-only dataset be used with TACO?" --manifest examples/taco_manifest_symptom_only.json --trace
```

Each invocation is one independent question. It does not remember a previous invocation; supply the manifest again when needed. `--trace` displays completed Python tool names, not hidden model reasoning. `--json` returns the verified answer and trace as machine-readable JSON.

The launcher configures this run's local MCP server and keeps the host's model selection and login. It does not save or change global/project Codex configuration. No separate OpenAI API key is required for this existing ChatGPT-authenticated Codex host. Model requests use that account's available Codex access.

## What happens during a question

1. Python validates any supplied JSON against `DatasetManifest`. Unknown fields such as participant records are rejected before being sent to the host.
2. Codex receives the question, metadata if supplied, and instructions for the research task.
3. The host discovers the four MCP tools, calls status, then selects the relevant evidence/audit/readiness tool.
4. The tools execute ordinary Python functions and return structured results.
5. The language model writes a structured answer.
6. Python checks the actual tool-completion events, returned source URLs, unchanged manifest and readiness verdict before displaying it.

The launcher disables shell, app integrations, web search and multi-agent collaboration for this run, uses a read-only sandbox, requires the TACO MCP connection and accepts traces only from the four expected tools. It supplies the research rules as host developer instructions. It rejects failed tools, invented citations, changed manifests and inconsistent structured readiness/model-execution fields. These checks improve traceability; they do not prove that every sentence in an answer is scientifically correct. Human review remains necessary.

The [official non-interactive Codex documentation](https://learn.chatgpt.com/docs/non-interactive-mode) describes the CLI's JSON events, ephemeral runs and output-schema support used here.

## What an agent means here

The assistant handles the conversation. A tool is an ordinary Python function that returns structured information. MCP is the interface that lets the assistant discover and call those functions. This server exposes four read-only tools, one resource and one workflow prompt.

Install the agent dependencies in the project environment:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-agent.txt
```

Start the server through an MCP host using:

```powershell
.\.venv\Scripts\python.exe -m taco_agent.server
```

It uses standard input/output for MCP messages, so it will wait silently when started by itself. That is expected. Its working directory must be the project root.

For an optional persistent connection in the Codex chat panel, the following is a **configuration template**, not an automatically installed connection. The Python launcher above does not need this manual setup. Replace `C:\path\to\CAUSEWAY` with the absolute path of your actual project folder. The v2 release does not require renaming that folder:

```toml
[mcp_servers.causeway_taco]
command = 'C:\path\to\CAUSEWAY\.venv\Scripts\python.exe'
args = ['-m', 'taco_agent.server']
cwd = 'C:\path\to\CAUSEWAY'
```

Add this to the active Codex MCP configuration when you want the chat host to use it, then reconnect/restart the host. No existing global Codex configuration was changed by this implementation.

The [official OpenAI MCP documentation](https://learn.chatgpt.com/docs/extend/mcp) describes these configuration fields. In the IDE extension you can also open the gear menu, choose MCP servers, add the STDIO server, and restart the extension.

Example questions after connecting:

- What data does TACO require? Use the TACO tools and cite their sources.
- What needs resolving before we can reproduce the current prediction notebook?
- Check `examples/taco_manifest.json` and explain each readiness check. Do not run a model.

## Actual source inspection

On 26 October 2026, the author repository's `ML_Models/Prediction.ipynb` was inspected through the connected GitHub reader. Its Git blob SHA was `257703cd3bda4cf9f0697816b4ef1c60cdc1c945`. The inspected requirements blob was `006a5e102110a45e972ee49ef70d33d0d9b8840d`. These are **file content hashes, not a pinned whole-repository commit**.

- The README specifies TabPFN 2.0.9; `ML_Models/requirements.txt` specifies 2.2.1.
- `run_experiment` reads a labelled molecular CSV and evaluates models with stratified cross-validation. It is not a saved deployment model.
- The notebook labels `Ensemble_TabPFN_Top5` as TACO, so the intended reference model must be confirmed rather than assumed to be standalone TabPFN.
- Example CSV paths use prefixes not present in the inspected `Data/` listing.
- The local Python environment is newer than several pinned upstream packages. Reproduction should use an isolated compatible environment, rather than upgrading the paper's pipeline silently.

Source links: [repository](https://github.com/SindyPin/TACO), [notebook](https://github.com/SindyPin/TACO/blob/main/ML_Models/Prediction.ipynb), [requirements](https://github.com/SindyPin/TACO/blob/main/ML_Models/requirements.txt), [preprint](https://doi.org/10.1101/2025.10.02.25337138).

## What remains for a scientific execution agent

1. Agree the authoritative commit, model definition, feature list and preprocessing with the authors.
2. Run their reference experiment in an isolated compatible environment and record dependencies, dataset versions and outputs.
3. Verify participant splits, repeated samples, feature-selection leakage, calibration and outcome timing.
4. Wrap the reproduced function with a strict input/output contract and test numerical agreement.
5. Only then expose model execution through MCP and the portal. Keep research prediction separate from clinical validation.

Passing a metadata checklist does not satisfy these steps. No patient risk percentage is returned by the current tools.
