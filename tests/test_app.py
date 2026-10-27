from fastapi.testclient import TestClient

from app import app  # noqa: E402

client = TestClient(app)


def test_health_and_catalogue():
    health = client.get("/api/health").json()
    assert health["status"] == "ok"
    assert health["version"] == "2.0.0"
    assert client.get("/openapi.json").json()["info"]["version"] == health["version"]
    assert client.get("/api/taco/status").json()["agent_version"] == health["version"]
    data = client.get("/api/catalogue").json()
    assert len(data["genes"]) == 11
    assert len(data["modules"]) == 5
    assert all("source" in x for x in data["genes"])


def test_gene_filter():
    x = client.get("/api/genes", params={"method": "MR"}).json()
    assert x["count"] == 5
    assert all("MR" in z["methods"] for z in x["items"])


def test_clinician_review_validation():
    r = client.post("/api/demo-reviews", json={"synthetic_case_id": "DEMO-001", "decision": "uncertain", "note": "Review the evidence"})
    assert r.status_code == 201
    assert client.post("/api/demo-reviews", json={"synthetic_case_id": "REAL-001", "decision": "agree", "note": ""}).status_code == 422
    assert client.post("/api/demo-reviews", json={"synthetic_case_id": "DEMO-001", "decision": "agree", "note": "somebody@example.com"}).status_code == 422
