#!/usr/bin/env python3
"""Extract node/edge counts and top weighted edges from pre-rendered graph-YYYY.html.

Writes static/dataset/graph-summary-YYYY.json. Run from repo root after
regenerating graph HTML files.

    python3 scripts/extract_graph_summary.py
"""
from __future__ import annotations

import json
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]


def extract_vis_dataset(html: str, var_name: str) -> list:
    pat = rf"{re.escape(var_name)}\s*=\s*new\s+vis\.DataSet\(\[(.*?)\]\)\s*;"
    m = re.search(pat, html, re.DOTALL)
    if not m:
        raise ValueError(f"Could not find vis.DataSet for {var_name}")
    return json.loads("[" + m.group(1) + "]")


def main() -> None:
    for path in sorted(ROOT.glob("graph-*.html")):
        m = re.match(r"graph-(\d{4})\.html$", path.name)
        if not m:
            continue
        year = int(m.group(1))
        text = path.read_text(encoding="utf-8", errors="replace")
        nodes = extract_vis_dataset(text, "nodes")
        edges = extract_vis_dataset(text, "edges")
        top = sorted(edges, key=lambda e: float(e.get("value", 0)), reverse=True)[:15]
        top_pairs = [{"from": e["from"], "to": e["to"], "weight": e.get("value")} for e in top]
        out = {
            "year": year,
            "nodeCount": len(nodes),
            "edgeCount": len(edges),
            "topEdgesByWeight": top_pairs,
            "description": (
                f"S-Index co-authorship overlap graph for {year}: {len(nodes)} conferences (nodes), "
                f"{len(edges)} weighted edges (shared authors). Highest-weight pairs are listed for overview."
            ),
        }
        outp = ROOT / "static" / "dataset" / f"graph-summary-{year}.json"
        outp.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
        print("Wrote", outp.relative_to(ROOT))


if __name__ == "__main__":
    main()
