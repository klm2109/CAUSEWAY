"""CAUSEWAY v2 MCP tools; run python -m taco_agent.server with an LLM host."""
from __future__ import annotations

import json
from typing import Literal

from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations

from taco_agent.core import DatasetManifest, assess_readiness, evidence, execution_status, reference_audit

mcp = FastMCP("CAUSEWAY TACO Research Assistant v2", instructions="Use the tools for sourced TACO evidence and dataset readiness. No prediction model is connected. Never infer patient risk from symptoms or present metadata checks as scientific validation.")
READ_ONLY = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False)


@mcp.tool(annotations=READ_ONLY)
def taco_evidence(topic: Literal["overview", "inputs", "validation", "limitations", "all"] = "all") -> dict:
    """Retrieve curated, source-linked TACO evidence; does not execute a model."""
    return evidence(topic)


@mcp.tool(annotations=READ_ONLY)
def assess_taco_readiness(manifest: DatasetManifest) -> dict:
    """Check a dataset description without reading or transmitting participant measurements."""
    return assess_readiness(manifest)


@mcp.tool(annotations=READ_ONLY)
def get_execution_status() -> dict:
    """Report available capabilities and why prediction execution is unavailable."""
    return execution_status()


@mcp.tool(annotations=READ_ONLY)
def inspect_reference_implementation() -> dict:
    """Retrieve the source audit, including upstream version and model-definition discrepancies."""
    return reference_audit()


@mcp.resource("taco://reference")
def taco_reference() -> str:
    """Curated TACO reference evidence with provenance."""
    return json.dumps(evidence(), ensure_ascii=False, indent=2)


@mcp.prompt()
def review_taco_dataset() -> str:
    """Guide an assistant through an evidence-grounded TACO readiness discussion."""
    return "Call get_execution_status, then taco_evidence(inputs) and inspect_reference_implementation. Ask for a dataset manifest containing no participant measurements or identifiers. Call assess_taco_readiness. Explain each failed check plainly, cite returned sources, and distinguish metadata checks from model or clinical validation. Do not provide a risk percentage or claim that prediction ran."


if __name__ == "__main__":
    mcp.run(transport="stdio")
