"""Research evidence and metadata checks; no fitted prediction model is bundled."""
from __future__ import annotations

from copy import deepcopy
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SOURCE_DATE = "2026-10-26"
SOURCES = [
    {"id": "taco-paper", "title": "TACO preprint", "url": "https://doi.org/10.1101/2025.10.02.25337138", "locator": "Preprint; see linked author implementation"},
    {"id": "taco-repo", "title": "TACO author repository", "url": "https://github.com/SindyPin/TACO", "locator": "README; accessed 26 October 2026"},
    {"id": "taco-notebook", "title": "Prediction notebook", "url": "https://github.com/SindyPin/TACO/blob/main/ML_Models/Prediction.ipynb", "locator": "run_experiment and Ensemble_TabPFN_Top5", "git_blob_sha": "257703cd3bda4cf9f0697816b4ef1c60cdc1c945"},
    {"id": "taco-requirements", "title": "Prediction environment requirements", "url": "https://github.com/SindyPin/TACO/blob/main/ML_Models/requirements.txt", "locator": "tabpfn==2.2.1; differs from README's 2.0.9", "git_blob_sha": "006a5e102110a45e972ee49ef70d33d0d9b8840d"},
]

EVIDENCE = {
    "overview": {"text": "TACO investigates early Long COVID prediction from molecular data using causal feature selection and TabPFN-based modelling.", "source_ids": ["taco-paper", "taco-repo"], "kind": "source_summary"},
    "inputs": {"text": "The inspected evaluation notebook reads a CSV: Subject_ID, Long_COVID and molecular feature columns. It drops ID and target columns before modelling. Patient symptom, comorbidity and medicine forms are not an equivalent input.", "source_ids": ["taco-notebook"], "kind": "source_summary"},
    "validation": {"text": "The inspected run_experiment function uses stratified cross-validation and checks unique subject IDs. Verify whether feature selection, repeat samples and preprocessing respect participant splits before interpreting performance. This prototype has not reproduced the paper's results.", "source_ids": ["taco-notebook"], "kind": "source_summary_and_local_audit"},
    "limitations": {"text": "Local prediction execution is unavailable. The repository README and prediction notebook describe different TabPFN versions; the notebook also labels a five-model ensemble as TACO. The authoritative paper-to-code version and model definition need resolution before a prediction wrapper can be validated.", "source_ids": ["taco-repo", "taco-notebook", "taco-requirements"], "kind": "local_source_audit"},
}


class DatasetManifest(BaseModel):
    """A proposed dataset description, never raw participant records or file paths."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    dataset_kind: Literal["gene_expression", "symptom_only"]
    sample_count: int = Field(ge=1, le=1000000)
    feature_count: int = Field(ge=1, le=100000)
    gene_id_namespace: Literal["HGNC", "Ensembl", "unknown"] = "unknown"
    sampling_time: Literal["acute", "follow_up", "unknown"] = "unknown"
    preprocessing_documented: bool = False
    participant_split_documented: bool = False
    feature_selection_within_training_folds: bool = False
    feature_set_version: str = Field(default="", max_length=120)


def execution_status() -> dict:
    return {
        "agent_version": "0.1.0",
        "mode": "research-evidence-and-readiness",
        "available_tools": ["taco_evidence", "assess_taco_readiness", "get_execution_status", "inspect_reference_implementation"],
        "llm_location": "Provided by the MCP host; no LLM runs in the website or this server.",
        "prediction_available": False,
        "model_executed": False,
        "missing": ["Authoritative upstream commit and model definition", "Reproduced preprocessing and feature set", "Validated reference outputs and model artifact"],
        "sources_checked_on": SOURCE_DATE,
    }


def evidence(topic: Literal["overview", "inputs", "validation", "limitations", "all"] = "all") -> dict:
    if topic not in {*EVIDENCE, "all"}:
        raise ValueError("Unknown evidence topic")
    selected = EVIDENCE if topic == "all" else {topic: EVIDENCE[topic]}
    source_ids = {sid for entry in selected.values() for sid in entry["source_ids"]}
    return {"tool": "taco_evidence", "model_executed": False, "entries": deepcopy(selected), "sources": deepcopy([s for s in SOURCES if s["id"] in source_ids]), "checked_on": SOURCE_DATE}


def reference_audit() -> dict:
    return {
        "tool": "inspect_reference_implementation",
        "model_executed": False,
        "entrypoint": "ML_Models/Prediction.ipynb :: run_experiment",
        "observations": [
            "README pins TabPFN 2.0.9; ML_Models/requirements.txt pins 2.2.1.",
            "Prediction notebook labels Ensemble_TabPFN_Top5 as TACO; author confirmation is needed for the intended reference.",
            "Notebook example data paths differ from filenames in Data/.",
            "A cross-validation experiment is not a fitted deployment model or a validated patient-risk service.",
        ],
        "version_note": "Recorded hashes identify inspected Git blobs, not a pinned or reproduced repository commit. main links may change.",
        "sources": deepcopy(SOURCES),
        "checked_on": SOURCE_DATE,
    }


def assess_readiness(manifest: DatasetManifest) -> dict:
    checks = [
        {"name": "Molecular inputs", "passed": manifest.dataset_kind == "gene_expression", "explanation": "TACO requires gene-expression features; symptoms alone do not meet that requirement."},
        {"name": "Gene identifiers", "passed": manifest.gene_id_namespace != "unknown", "explanation": "Declare the gene identifier system so features can be matched."},
        {"name": "Early sampling", "passed": manifest.sampling_time == "acute", "explanation": "Early-detection experiments need a documented sampling time before the later outcome."},
        {"name": "Preprocessing", "passed": manifest.preprocessing_documented, "explanation": "Document normalisation, aggregation, missing values and batch handling."},
        {"name": "Participant split", "passed": manifest.participant_split_documented, "explanation": "Keep repeated samples from one participant in the same split."},
        {"name": "Feature selection", "passed": manifest.feature_selection_within_training_folds, "explanation": "Outcome-informed feature selection must not use held-out outcomes."},
        {"name": "Feature version", "passed": bool(manifest.feature_set_version), "explanation": "Identify the version of the selected molecular feature set."},
    ]
    return {
        "tool": "assess_taco_readiness",
        "checks": checks,
        "metadata_checks_passed": all(c["passed"] for c in checks),
        "prediction_available": False,
        "model_executed": False,
        "interpretation": "Checks evaluate the supplied metadata only. Passing them does not validate data, establish clinical suitability or enable prediction.",
        "next_steps": execution_status()["missing"],
        "sources": deepcopy(SOURCES),
    }
