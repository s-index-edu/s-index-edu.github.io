#!/usr/bin/env python3
"""Extract full vis.js node and edge lists from graph-YYYY.html.

Writes static/dataset/graph-edges-YYYY.json for neighbour expansion on Search
and filtered views on Graph. Run after regenerating graph HTML:

    python3 scripts/extract_graph_edges.py
"""
from __future__ import annotations

import json
import pathlib
import re

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
        out = {"year": year, "nodes": nodes, "edges": edges}
        outp = ROOT / "static" / "dataset" / f"graph-edges-{year}.json"
        outp.write_text(json.dumps(out, separators=(",", ":")) + "\n", encoding="utf-8")
        print("Wrote", outp.relative_to(ROOT), "nodes", len(nodes), "edges", len(edges))


if __name__ == "__main__":
    main()
