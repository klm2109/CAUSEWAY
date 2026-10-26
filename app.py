"""CAUSEWAY Atlas v1 meeting prototype: research evidence only, NO clinical prediction."""
from __future__ import annotations

import os
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("CAUSEWAY_DB", str(BASE / "demo_evidence.db")))

GENES = [
    ("ERCC3", "CT,MR", "DNA repair"),
    ("HIF1A", "CT,DCE", "Hypoxia / immune regulation"),
    ("IMMT", "CT,MR", "Mitochondrial structure"),
    ("LEF1", "CT,DCE", "Wnt signaling"),
    ("MED19", "CT,MR", "Transcription (Mediator complex)"),
    ("MYC", "CT,DCE", "Cellular stress / proliferation"),
    ("NDUFA6", "CT,MR", "Mitochondrial complex I"),
    ("PNPO", "DCE,MR", "Vitamin B6 metabolism"),
    ("POMC", "CT,DCE", "Neuroendocrine signaling"),
    ("STAT3", "CT,DCE", "Immune regulation / JAK-STAT"),
    ("TP53", "CT,DCE", "Cell cycle / DNA damage"),
]
REVIEW = [
    ("Genomics", "Long COVID susceptibility loci; immune and cardiopulmonary pathways", "Differences in population and case definitions"),
    ("Transcriptomics", "Immune / coagulation dysregulation; molecular endotypes", "Small cohorts and limited independent validation"),
    ("Proteomics", "Complement and coagulation abnormalities", "Platform differences and variable replication"),
    ("Metabolomics", "Altered mitochondrial function and cellular bioenergetics", "Longitudinal and independent validation gaps"),
    ("Multi-omics", "Potential inflammatory versus metabolic endotypes", "Heterogeneous inputs and nonstandard phenotyping"),
]
MODULES = [
    ("REVIEW", "Literature evidence", "101 Long COVID omics studies", "Evidence-quality summaries", "1_REVIEW.pdf", "https://doi.org/10.1080/10408363.2025.2583083"),
    ("MR + Control", "Gene drivers and subtypes", "GWAS, eQTL, RNA-seq, PPI", "Putative causal genes and exploratory subtypes", "2_MRCONTROL.pdf", "https://github.com/SindyPin/Causal-Multiomics-Method"),
    ("TACO", "Early risk prediction", "Gene-expression profiles and KEGG pathways", "Model-based Long COVID risk predictions", "3_TACO.pdf", "https://github.com/SindyPin/TACO"),
    ("SPLIT", "Drug prioritisation", "Causal genes, drug targets, clinical cohorts", "Predicted safety, efficacy and drug rankings", "4_SPLIT.pdf", "https://github.com/SindyPin/SPLIT"),
    ("Paper2Agent", "AI agent architecture", "Papers, code, datasets, validated tools", "Reference for research tool-calling agents", "Paper2Agent.pdf", "https://github.com/jmiao24/Paper2Agent"),
]

app = FastAPI(title="CAUSEWAY Atlas Prototype", version="0.1.0", description="Non-clinical demonstration API for research evidence and synthetic review actions")


def conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def init_db() -> None:
    with closing(conn()) as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS gene_evidence (
                gene TEXT PRIMARY KEY, methods TEXT NOT NULL, functional_category TEXT NOT NULL,
                source TEXT NOT NULL, evidence_type TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS review_evidence (
                domain TEXT PRIMARY KEY, finding TEXT NOT NULL, limitation TEXT NOT NULL, source TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS modules (
                name TEXT PRIMARY KEY, question TEXT NOT NULL, inputs TEXT NOT NULL,
                outputs TEXT NOT NULL, source_file TEXT NOT NULL, source_url TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS demo_clinician_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT, synthetic_case_id TEXT NOT NULL,
                decision TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        db.executemany("INSERT OR IGNORE INTO gene_evidence VALUES (?,?,?,?,?)", [(*row, "4_SPLIT.pdf, Table 3", "cross-method support; NOT numeric gene rank") for row in GENES])
        db.executemany("INSERT OR IGNORE INTO review_evidence VALUES (?,?,?,?)", [(*row, "1_REVIEW.pdf") for row in REVIEW])
        db.executemany("INSERT OR IGNORE INTO modules VALUES (?,?,?,?,?,?)", MODULES)
        db.commit()


init_db()
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(BASE / "static" / "index.html")


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "synthetic-demo-not-clinical"}


@app.get("/api/catalogue")
def catalogue():
    with closing(conn()) as db:
        modules = [dict(row) for row in db.execute("SELECT * FROM modules ORDER BY CASE name WHEN 'REVIEW' THEN 1 WHEN 'MR + Control' THEN 2 WHEN 'TACO' THEN 3 WHEN 'SPLIT' THEN 4 ELSE 5 END")]
        genes = [dict(row) for row in db.execute("SELECT * FROM gene_evidence ORDER BY gene")]
        review = [dict(row) for row in db.execute("SELECT * FROM review_evidence ORDER BY domain")]
    return {"modules": modules, "genes": genes, "review": review, "disclaimer": "A research demonstration; not diagnostic, predictive, or prescribing software."}


@app.get("/api/genes")
def genes(method: Literal["MR", "CT", "DCE"] | None = None, search: str = Query(default="", max_length=50)):
    with closing(conn()) as db:
        rows = [dict(row) for row in db.execute("SELECT * FROM gene_evidence ORDER BY gene")]
    if method:
        rows = [r for r in rows if method in r["methods"].split(",")]
    if search.strip():
        rows = [r for r in rows if search.strip().casefold() in r["gene"].casefold()]
    return {"count": len(rows), "items": rows, "note": "Listed method support is not a per-method numerical ranking."}


class ReviewRequest(BaseModel):
    synthetic_case_id: Literal["DEMO-001"]
    decision: Literal["agree", "uncertain", "disagree"]
    note: str = Field(default="", max_length=1000)


@app.post("/api/demo-reviews", status_code=201)
def submit_demo_review(review: ReviewRequest):
    if any(ch in review.note for ch in ("@",)):
        raise HTTPException(status_code=422, detail="Do not enter identifiers or contact details in this demo.")
    with closing(conn()) as db:
        cur = db.execute(
            "INSERT INTO demo_clinician_reviews (synthetic_case_id, decision, note) VALUES (?, ?, ?)",
            (review.synthetic_case_id, review.decision, ""),
        )
        db.commit()
        return {"id": cur.lastrowid, "status": "stored-for-demo-only", "note_persisted": False}
