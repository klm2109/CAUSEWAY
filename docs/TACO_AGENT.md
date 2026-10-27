# CAUSEWAY v2 TACO research tools

Release **v2** (`2.0.0`) provides working **research evidence and dataset-description tools**. An MCP-compatible chat host supplies the AI model. The website can call the same tools directly, but has no LLM chat connection. Prediction execution has not been implemented or validated.

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

For a Codex MCP connection, the following is a **configuration template**, not an automatically installed connection. Replace `C:\path\to\CAUSEWAY` with the absolute path of your actual project folder. The v2 release does not require renaming that folder:

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
