"""Check research boundaries and shared API/MCP tool behaviour."""
import asyncio
import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import app

ROOT = Path(__file__).resolve().parents[1]
client = TestClient(app)


def test_sources_and_no_model_execution():
    response = client.get("/api/taco/evidence?topic=limitations")
    assert response.status_code == 200
    result = response.json()
    assert result["model_executed"] is False
    assert "different TabPFN versions" in result["entries"]["limitations"]["text"]
    assert all(source["url"].startswith("https://") for source in result["sources"])
    assert client.get("/api/taco/evidence?topic=prescribe").status_code == 422


def test_metadata_success_never_enables_prediction():
    manifest = json.loads((ROOT / "examples/taco_manifest.json").read_text())
    response = client.post("/api/taco/readiness", json=manifest)
    assert response.status_code == 200
    result = response.json()
    assert result["metadata_checks_passed"] is True
    assert result["prediction_available"] is False
    assert result["model_executed"] is False
    assert "risk" not in result and "probability" not in result
    manifest["dataset_kind"] = "symptom_only"
    manifest["sampling_time"] = "follow_up"
    result = client.post("/api/taco/readiness", json=manifest).json()
    assert result["metadata_checks_passed"] is False
    assert sum(not check["passed"] for check in result["checks"]) == 2


def test_manifest_rejects_raw_records_and_invalid_sizes():
    manifest = json.loads((ROOT / "examples/taco_manifest.json").read_text())
    assert client.post("/api/taco/readiness", json={**manifest,"patient_records":[{"name":"Example"}]}).status_code == 422
    assert client.post("/api/taco/readiness", json={**manifest,"sample_count":-1}).status_code == 422


def test_catalogue_is_traceable_and_combinations_reference_known_methods():
    catalogue = client.get("/api/research-methods").json()
    methods = {method["id"] for method in catalogue["methods"]}
    assert {"mr","ct","dce","subtyping","taco","drug-mapping","planet","split","review","paper2agent"} == methods
    assert all(set(pipeline["methods"]) <= methods for pipeline in catalogue["pipelines"])
    assert any("Proposed" in pipeline["evidence"] for pipeline in catalogue["pipelines"])
    assert catalogue["shiny_url"] == "https://sindypin.shinyapps.io/github/"


def test_real_mcp_stdio_handshake_and_tools():
    pytest.importorskip("mcp")
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    async def check():
        parameters = StdioServerParameters(command=sys.executable, args=["-m","taco_agent.server"], cwd=str(ROOT))
        async with stdio_client(parameters) as (read,write):
            async with ClientSession(read,write) as session:
                await session.initialize()
                assert {tool.name for tool in (await session.list_tools()).tools} == {"taco_evidence","assess_taco_readiness","get_execution_status","inspect_reference_implementation"}
                result = await session.call_tool("taco_evidence", {"topic":"inputs"})
                assert result.isError is False
                assert "Subject_ID" in " ".join(block.text for block in result.content if hasattr(block,"text"))
                manifest = json.loads((ROOT / "examples/taco_manifest.json").read_text())
                result = await session.call_tool("assess_taco_readiness", {"manifest":manifest})
                assert result.isError is False
                text = " ".join(block.text for block in result.content if hasattr(block,"text"))
                assert json.loads(text)["prediction_available"] is False
                assert len((await session.list_resources()).resources) == 1
                assert len((await session.list_prompts()).prompts) == 1
    asyncio.run(asyncio.wait_for(check(), timeout=30))
