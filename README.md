# S-Index website

Web service for conference publication metrics (search, force-directed graphs, adjacency matrix views, survey, and optional statistics). This work is based on the S-Index described in the IEEE ICDMW 2024 paper (https://ieeexplore.ieee.org/abstract/document/10917437); it does not claim authorship of that paper.

## Quick start (local preview)

No build step. From the repository root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/index.html`. Any static file server works (`npx serve .`, etc.).

**Theme:** `static/js/theme.js` applies `html.theme-light` / `html.theme-dark` and `data-theme` for charts.

## Repository layout

| Path | Purpose |
|------|---------|
| `index.html` | Search and S-i charts |
| `graph.html` | Year selector + iframe to `graph-YYYY.html` |
| `matrix.html` | Renders Markdown matrices from `pages/` |
| `survey.html` | Survey copy + instrument |
| `stats.html` | Optional GoatCounter API views (token pasted locally) |
| `static/config/datasets.json` | Maps each **year** → S-Index JSON path, graph HTML filename, matrix Markdown path |
| `static/dataset/s-indices*.json` | Per-venue S-Index and S-i columns |
| `static/dataset/graph-summary-*.json` | Textual graph stats for accessibility fallback |
| `static/dataset/graph-edges-*.json` | Full node/edge lists for neighbour expansion (Search/Graph filter) |
| `graph-2023.html`, … | Pre-generated vis.js network graphs (do not hand-edit; regenerate from pipeline) |
| `pages/*.md` | Markdown content (matrix tables, survey text) |
| `static/css/styles.css` | All site styles and design tokens |

## Adding a new data year

1. Add `static/dataset/s-indices{YEAR}.json` (same schema as existing files).
2. Produce `graph-{YEAR}.html` with the existing graph-generation pipeline.
3. Run `python3 scripts/extract_graph_summary.py` and `python3 scripts/extract_graph_edges.py` (writes `graph-summary-{YEAR}.json` and `graph-edges-{YEAR}.json` from each `graph-{YEAR}.html`).
4. Add matrix Markdown `pages/adjacencymatrix-{YEAR}.md` if needed.
5. Append an entry to `static/config/datasets.json` with `year`, `sindex`, `graph`, `graphEdges`, `matrix`, and `graphSummary`.
6. Set `defaultYear` if the new year should be default.

## Regenerating datasets (overview)

Full regeneration is **not** scripted in this repository; it assumes an external pipeline that:

1. Ingests a **DBLP** XML dump (or equivalent publication index).
2. Computes per-conference S-Index and S-i columns and writes `s-indices{YEAR}.json`.
3. Builds co-authorship overlap edges and emits `graph-{YEAR}.html`.

A competent reader with DBLP access, the referenced paper's method description, and a SQL or script environment should be able to reproduce the **2025** table in roughly **under one hour** once the pipeline code exists; this README documents file contracts only.

## Deploy (GitHub Pages)

Push to `main` (or `gh-pages`) on a GitHub repository with **Pages** enabled and source set to the branch root. Pages serves files as-is; no Jekyll required unless you add a `_config.yml`.

