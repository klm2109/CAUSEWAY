"""Verify the conversational agent's trace and evidence boundaries without API calls."""
import json

import pytest

from taco_agent.chat import AgentError, verify_turn
from taco_agent.core import DatasetManifest, assess_readiness, evidence, execution_status


def completed_tool(name, payload, arguments=None):
    return {"type":"item.completed", "item":{"type":"mcp_tool_call", "server":"causeway_taco", "tool":name, "arguments":arguments or {}, "status":"completed", "result":{"structuredContent":payload, "isError":False}}}


def completed_answer(sources, verdict=None, model_executed=False):
    return {"type":"item.completed", "item":{"type":"agent_message", "text":json.dumps({"answer":"TACO requires molecular data. These checks do not enable prediction.", "source_urls":sources, "model_executed":model_executed, "metadata_checks_passed":verdict})}}


def evidence_turn():
    payload = evidence("inputs")
    return [completed_tool("get_execution_status", execution_status()), completed_tool("taco_evidence", payload, {"topic":"inputs"}), completed_answer([payload["sources"][0]["url"]])]


def test_success_requires_real_tool_events_and_grounded_sources():
    result = verify_turn(evidence_turn(), None)
    assert [call["tool"] for call in result.tool_calls] == ["get_execution_status", "taco_evidence"]
    assert result.model_executed is False
    assert result.metadata_checks_passed is None
    with pytest.raises(AgentError, match="No verified"):
        verify_turn([completed_answer([])], None)


def test_rejects_invented_sources_and_prediction_claims():
    events = evidence_turn()
    events[-1] = completed_answer(["https://example.com/invented-evidence"])
    with pytest.raises(AgentError, match="sources"):
        verify_turn(events, None)
    events = evidence_turn()
    answer = json.loads(events[-1]["item"]["text"])
    answer["answer"] += " See https://example.com/invented-inline-source."
    events[-1]["item"]["text"] = json.dumps(answer)
    with pytest.raises(AgentError, match="sources"):
        verify_turn(events, None)
    events[-1] = completed_answer([], model_executed=True)
    with pytest.raises(AgentError, match="output contract"):
        verify_turn(events, None)


def test_rejects_failed_or_unexpected_tool_calls():
    events = evidence_turn()
    events[1]["item"]["result"]["isError"] = True
    with pytest.raises(AgentError, match="did not complete"):
        verify_turn(events, None)
    events = evidence_turn()
    events[1]["item"]["server"] = "another_server"
    with pytest.raises(AgentError, match="unexpected MCP"):
        verify_turn(events, None)
    events = evidence_turn()
    events.insert(0, {"type":"item.completed", "item":{"type":"command_execution"}})
    with pytest.raises(AgentError, match="outside"):
        verify_turn(events, None)


def test_preserves_manifest_values_and_failed_readiness_verdict():
    manifest = DatasetManifest(dataset_kind="symptom_only", sample_count=5, feature_count=3)
    payload = assess_readiness(manifest)
    sources = [source["url"] for source in payload["sources"]]
    events = [completed_tool("get_execution_status", execution_status()), completed_tool("assess_taco_readiness", payload, {"manifest":manifest.model_dump()}), completed_answer(sources, verdict=False)]
    assert verify_turn(events, manifest).metadata_checks_passed is False
    events[-1] = completed_answer(sources, verdict=True)
    with pytest.raises(AgentError, match="changed.*verdict"):
        verify_turn(events, manifest)
    events[-1] = completed_answer(sources, verdict=False)
    events[1]["item"]["arguments"]["manifest"]["dataset_kind"] = "gene_expression"
    with pytest.raises(AgentError, match="changed or invented"):
        verify_turn(events, manifest)


def test_manifest_must_be_checked_and_cannot_be_invented():
    manifest = DatasetManifest(dataset_kind="gene_expression", sample_count=5, feature_count=3)
    with pytest.raises(AgentError, match="was not checked"):
        verify_turn(evidence_turn(), manifest)
    payload = assess_readiness(manifest)
    events = [completed_tool("get_execution_status", execution_status()), completed_tool("assess_taco_readiness", payload, {"manifest":manifest.model_dump()}), completed_answer([], False)]
    with pytest.raises(AgentError, match="changed or invented"):
        verify_turn(events, None)
