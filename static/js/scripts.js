/**
 * S-Index Search - loads dataset from config (static/config/datasets.json).
 * To add a new year: add a new entry to datasets.json and put the JSON file
 * in static/dataset/ (e.g. s-indices2024.json).
 */

let selectedBooks = [];
let config = null;
let currentData = [];
/** @type {Record<string, object[]>} */
let yearToData = {};
let yearCompareChart = null;
let graphEdgesCache = null;
let graphEdgesCacheYear = null;
let resultsRenderGeneration = 0;

const colors = [
    "#7c3aed", "#22c55e", "#ef4444", "#eab308", "#84cc16", "#f97316", "#06b6d4", "#ec4899",
    "#a855f7", "#64748b", "#78716c", "#d97706", "#b91c1c", "#0ea5e9",
    "#14b8a6", "#6366f1", "#f43f5e", "#8b5cf6", "#e11d48", "#10b981"
];

function getColor(index) {
    return colors[index % colors.length];
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

let defaultMax = 20;
let defaultMin = 1;
let max = defaultMax;
let min = defaultMin;
let graph = true;

function getDatasetPath() {
    if (!config || !config.datasets || config.datasets.length === 0) return null;
    const yearSelect = document.getElementById("yearSelect");
    const year = yearSelect ? yearSelect.value : "";
    const entry = config.datasets.find(d => String(d.year) === year);
    const found = entry || config.datasets[0];
    return found ? (found.sindex || found.path) : null;
}

function fetchData(path) {
    return fetch(path).then(response => {
        if (!response.ok) throw new Error("Network response was not ok: " + response.statusText);
        return response.json();
    });
}

function loadConfig() {
    return fetch("static/config/datasets.json")
        .then(response => {
            if (!response.ok) throw new Error("Could not load config");
            return response.json();
        })
        .then(data => {
            config = data;
            const sel = document.getElementById("yearSelect");
            if (!sel) return;
            sel.innerHTML = "";
            const defaultYear = config.defaultYear != null ? String(config.defaultYear) : null;
            (config.datasets || []).forEach(d => {
                const opt = document.createElement("option");
                opt.value = String(d.year);
                opt.textContent = d.year;
                if (opt.value === defaultYear || config.datasets.length === 1) opt.selected = true;
                sel.appendChild(opt);
            });
            if (!sel.value && config.datasets && config.datasets.length > 0) {
                sel.selectedIndex = 0;
            }
        });
}

function loadDataset() {
    const path = getDatasetPath();
    if (!path) return Promise.reject(new Error("No dataset configured"));
    return fetchData(path).then(data => {
        currentData = data;
        return data;
    });
}

function loadAllYearCaches() {
    if (!config || !config.datasets) return Promise.resolve();
    yearToData = {};
    return Promise.all(
        config.datasets.map(d => {
            const p = d.sindex || d.path;
            if (!p) return Promise.resolve();
            return fetchData(p).then(data => {
                yearToData[d.year] = data;
            });
        })
    );
}

function invalidateGraphEdgesCache() {
    graphEdgesCache = null;
    graphEdgesCacheYear = null;
}

function getDatasetEntryForYear(yearStr) {
    if (!config || !config.datasets) return null;
    return config.datasets.find(d => String(d.year) === String(yearStr)) || null;
}

function fetchGraphEdgesForYear(yearStr) {
    if (graphEdgesCacheYear === String(yearStr) && graphEdgesCache) {
        return Promise.resolve(graphEdgesCache);
    }
    const entry = getDatasetEntryForYear(yearStr);
    if (!entry || !entry.graphEdges) {
        return Promise.resolve(null);
    }
    return fetchData(entry.graphEdges)
        .then(data => {
            graphEdgesCache = data;
            graphEdgesCacheYear = String(yearStr);
            return data;
        })
        .catch(err => {
            console.error(err);
            return null;
        });
}

function expandTitlesWithGraphNeighbours(seedTitles, edges) {
    const out = new Set(seedTitles);
    if (!edges || !edges.length) return out;
    const adj = new Map();
    edges.forEach(e => {
        const a = e.from;
        const b = e.to;
        if (a == null || b == null) return;
        if (!adj.has(a)) adj.set(a, new Set());
        if (!adj.has(b)) adj.set(b, new Set());
        adj.get(a).add(b);
        adj.get(b).add(a);
    });
    seedTitles.forEach(s => {
        const nb = adj.get(s);
        if (nb) nb.forEach(n => out.add(n));
    });
    return out;
}

function buildChartTableRows(selectedBooksList, graphEdgesPayload, data) {
    const seeds = selectedBooksList.map(b => b.booktitle);
    const edgeList = graphEdgesPayload && graphEdgesPayload.edges ? graphEdgesPayload.edges : null;
    const expanded = expandTitlesWithGraphNeighbours(seeds, edgeList);
    const seedSet = new Set(seeds);
    const neighbours = [...expanded].filter(t => !seedSet.has(t)).sort((a, b) => a.localeCompare(b));
    const order = [...seeds, ...neighbours];
    const byTitle = new Map(data.map(c => [c.booktitle, c]));
    return order.map(t => byTitle.get(t)).filter(Boolean);
}

document.addEventListener("DOMContentLoaded", function () {
    const searchBox = document.getElementById("searchBox");
    const searchButton = document.getElementById("searchButton");
    const yearSelect = document.getElementById("yearSelect");
    const table = document.getElementById("table");
    const results = document.getElementById("results");
    const indexLive = document.getElementById("indexLive");

    function announceIndex(msg) {
        if (indexLive) indexLive.textContent = msg;
    }

    function updateUrlFromSelection() {
        if (!yearSelect) return;
        const p = new URLSearchParams(window.location.search);
        p.set("year", yearSelect.value);
        if (selectedBooks.length === 1) p.set("venue", selectedBooks[0].booktitle);
        else p.delete("venue");
        const qs = p.toString();
        history.replaceState(null, "", qs ? "index.html?" + qs : "index.html");
    }

    function updateYearComparePanel() {
        const panel = document.getElementById("yearComparePanel");
        const hint = document.getElementById("yearCompareHint");
        const canvas = document.getElementById("yearCompareSpark");
        if (!panel || !hint || !canvas) return;

        if (yearCompareChart) {
            yearCompareChart.destroy();
            yearCompareChart = null;
        }

        if (selectedBooks.length !== 1) {
            panel.hidden = true;
            return;
        }

        const book = selectedBooks[0].booktitle;
        const years = Object.keys(yearToData)
            .map(Number)
            .sort((a, b) => a - b);
        if (!years.length) {
            panel.hidden = true;
            return;
        }

        const labels = years.map(String);
        const values = years.map(y => {
            const rows = yearToData[y];
            if (!rows) return null;
            const row = rows.find(r => r.booktitle === book);
            if (!row) return null;
            const v = row["Non-Distinct-S-Index"];
            return v !== undefined && v !== "" ? parseInt(String(v), 10) : null;
        });

        if (values.every(v => v == null || Number.isNaN(v))) {
            panel.hidden = true;
            return;
        }

        panel.hidden = false;
        const parts = years.map((y, i) => {
            const v = values[i];
            return v == null || Number.isNaN(v) ? `${y}: -` : `${y}: ${v}`;
        });
        hint.textContent = `Non-distinct S-Index for ${book}: ${parts.join(", ")}.`;

        const resolved =
            document.documentElement.getAttribute("data-theme") ||
            (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        const isDark = resolved === "dark";
        const chartText = isDark ? "#a1a1aa" : "#6c757d";
        const chartGrid = isDark ? "#2e2e36" : "#dee2e6";
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() || "#5b21b6";

        yearCompareChart = new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "S-Index",
                        data: values,
                        spanGaps: false,
                        borderColor: accent,
                        backgroundColor: "transparent",
                        tension: 0.2,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: chartText }, grid: { color: chartGrid } },
                    y: { ticks: { color: chartText }, grid: { color: chartGrid } }
                }
            }
        });
    }

    function applyDeepLinkFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const year = params.get("year");
        const venue = params.get("venue");
        const runSelect = () => {
            if (!venue) return;
            const match = currentData.find(
                c => c.booktitle.toUpperCase() === venue.trim().toUpperCase()
            );
            if (!match) {
                announceIndex(`No venue matching “${venue}” in this year.`);
                return;
            }
            selectedBooks = [match];
            document.querySelectorAll(".books-check").forEach(cb => {
                cb.checked = cb.value === match.booktitle;
            });
            displayResults();
            announceIndex(`Opened ${match.booktitle} from link.`);
        };

        if (year && yearSelect && [...yearSelect.options].some(o => o.value === String(year))) {
            yearSelect.value = String(year);
            return loadDataset().then(data => {
                currentData = data;
                displayBooks(data.map(b => b.booktitle));
                runSelect();
                updateUrlFromSelection();
            });
        }
        runSelect();
        return Promise.resolve();
    }

    const defaultResultToolbar = () => {
        const tableBtn = `<button type="button" id="tableResultBtn" class="view-btn" title="Table view"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9.5H20M4 14.5H20M9 4.5V19.5M7.2 19.5H16.8C17.9201 19.5 18.4802 19.5 18.908 19.282C19.2843 19.0903 19.5903 18.7843 19.782 18.408C20 17.9802 20 17.4201 20 16.3V7.7C20 6.5799 20 6.01984 19.782 5.59202C19.5903 5.21569 19.2843 4.90973 18.908 4.71799C18.4802 4.5 17.9201 4.5 16.8 4.5H7.2C6.0799 4.5 5.51984 4.5 5.09202 4.71799C4.71569 4.90973 4.40973 5.21569 4.21799 5.59202C4 6.01984 4 6.57989 4 7.7V16.3C4 17.4201 4 17.9802 4.21799 18.408C4.40973 18.7843 4.71569 19.0903 5.09202 19.282C5.51984 19.5 6.07989 19.5 7.2 19.5Z"/></svg></button>`;
        const chart10Btn = `<button type="button" id="10ResultBtn" class="view-btn" title="Chart (S-10 and above)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5V19C4 19.5523 4.44772 20 5 20H19"/><path d="M18 9L13 13.9999L10.5 11.4998L7 14.9998" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
        const chartAllBtn = `<button type="button" id="AllResultBtn" class="view-btn" title="Chart (all S-i)"><svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M0 25.406h22.406v-1.75h-20.656v-17.063h-1.75v18.813zM3.063 21.969h19.25v-13.813l-4.063 3.719-3.781-1.375-4 4.563-4.094-1.469-3.313 3.438v4.938z"/></svg></button>`;
        return `<div class="result-toolbar">${tableBtn} ${chart10Btn} ${chartAllBtn}</div>`;
    };

    function setViewActive() {
        const tableResultBtn = document.getElementById("tableResultBtn");
        const tenResultBtn = document.getElementById("10ResultBtn");
        const allResultBtn = document.getElementById("AllResultBtn");
        [tableResultBtn, tenResultBtn, allResultBtn].forEach(b => b && b.classList.remove("active"));
        if (!graph && tableResultBtn) tableResultBtn.classList.add("active");
        else if (graph && min === 10 && tenResultBtn) tenResultBtn.classList.add("active");
        else if (allResultBtn) allResultBtn.classList.add("active");
    }

    function initResultButtons() {
        const tableResultBtn = document.getElementById("tableResultBtn");
        const tenResultBtn = document.getElementById("10ResultBtn");
        const allResultBtn = document.getElementById("AllResultBtn");
        if (tableResultBtn) {
            tableResultBtn.addEventListener("click", () => {
                graph = false;
                max = defaultMax;
                min = defaultMin;
                displayResults();
            });
        }
        if (tenResultBtn) {
            tenResultBtn.addEventListener("click", () => {
                graph = true;
                max = defaultMax;
                min = 10;
                displayResults();
            });
        }
        if (allResultBtn) {
            allResultBtn.addEventListener("click", () => {
                graph = true;
                max = defaultMax;
                min = defaultMin;
                displayResults();
            });
        }
        setViewActive();
    }

    function displayBooks(books) {
        if (!table) return;
        table.innerHTML = "Loading…";
        announceIndex("Loading conference list.");
        if (books.length === 0) {
            table.innerHTML = '<p class="empty">No conferences in this dataset.</p>';
            announceIndex("No conferences in this dataset.");
            return;
        }
        table.innerHTML = books
            .map(
                book =>
                    `<label><input type="checkbox" name="books-check" class="books-check" value="${String(book).replace(/"/g, "&quot;")}"><span>${escapeHtml(book)}</span></label>`
            )
            .join("");

        document.querySelectorAll(".books-check").forEach(checkbox => {
            checkbox.addEventListener("change", function () {
                const book = checkbox.value;
                if (checkbox.checked) {
                    const conf = currentData.find(c => c.booktitle === book);
                    if (conf) {
                        selectedBooks.push(conf);
                        displayResults();
                    }
                } else {
                    selectedBooks = selectedBooks.filter(b => b.booktitle !== book);
                    displayResults();
                }
            });
        });
        announceIndex(`Loaded ${books.length} conferences.`);
    }

    function hideResults() {
        resultsRenderGeneration++;
        if (results) {
            results.hidden = true;
            results.innerHTML = "";
        }
        document.querySelectorAll(".books-check").forEach(cb => {
            cb.checked = false;
        });
        selectedBooks = [];
        updateYearComparePanel();
        updateUrlFromSelection();
        announceIndex("Selection cleared.");
    }

    function buildFilteredGraphHref() {
        const ys = yearSelect ? yearSelect.value : "";
        const vs = selectedBooks.map(b => encodeURIComponent(b.booktitle)).join(",");
        return `graph.html?year=${encodeURIComponent(ys)}&venues=${vs}`;
    }

    function displayResults() {
        if (!results) return;
        if (selectedBooks.length === 0) {
            hideResults();
            return;
        }

        results.hidden = false;
        const bookNames = selectedBooks.map(c => c.booktitle);
        document.querySelectorAll(".books-check").forEach(checkbox => {
            checkbox.checked = bookNames.includes(checkbox.value);
        });

        const year = yearSelect ? yearSelect.value : "";
        const myGen = ++resultsRenderGeneration;

        fetchGraphEdgesForYear(year).then(ge => {
            if (myGen !== resultsRenderGeneration) return;

            const rows = buildChartTableRows(selectedBooks, ge, currentData);
            const seedSet = new Set(selectedBooks.map(b => b.booktitle));
            const neighbourCount = rows.filter(c => !seedSet.has(c.booktitle)).length;
            const neighbourHint =
                neighbourCount > 0
                    ? `<p class="hint results-neighbour-hint">Including ${neighbourCount} conference(s) that share a co-authorship graph edge with your selection. In the chart, neighbour lines start hidden; click the legend label to show or hide each series (neighbours use a dashed line).</p>`
                    : "";

            const networkBtn = `<div class="results-network-actions"><a class="btn btn-primary" href="${escapeHtml(buildFilteredGraphHref())}">Open network graph (selection + neighbours)</a></div>`;

            if (graph) {
                results.innerHTML =
                    defaultResultToolbar() +
                    neighbourHint +
                    '<div class="result-chart-wrap"><canvas id="result-chart"></canvas></div>' +
                    networkBtn;
                let nbrColorIdx = 0;
                const datasets = rows.map(conf => {
                    const isSeed = seedSet.has(conf.booktitle);
                    const seedIdx = isSeed ? selectedBooks.findIndex(s => s.booktitle === conf.booktitle) : -1;
                    const colorIdx = isSeed ? seedIdx : selectedBooks.length + nbrColorIdx++;
                    return {
                        label: conf.booktitle + (isSeed ? "" : " · graph neighbour"),
                        data: generateSIndicesData(conf),
                        borderColor: getColor(Math.max(0, colorIdx)),
                        borderDash: isSeed ? undefined : [6, 4],
                        backgroundColor: "transparent",
                        tension: 0.2,
                        hidden: !isSeed
                    };
                });
                const labels = range(min, max);
                const resolved =
                    document.documentElement.getAttribute("data-theme") ||
                    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
                const isDark = resolved === "dark";
                const chartText = isDark ? "#a1a1aa" : "#6c757d";
                const chartGrid = isDark ? "#2e2e36" : "#dee2e6";
                new Chart(document.getElementById("result-chart"), {
                    type: "line",
                    data: { labels, datasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { labels: { color: chartText }, position: "bottom" }
                        },
                        scales: {
                            x: { ticks: { color: chartText }, grid: { color: chartGrid } },
                            y: { ticks: { color: chartText }, grid: { color: chartGrid } }
                        }
                    }
                });
            } else {
                let tableHTML =
                    neighbourHint +
                    '<div class="results-table-wrap"><table class="results-table"><thead><tr><th>Conference</th><th>S-Index</th><th>S-Index Set Size</th>';
                for (let i = 1; i <= 20; i++) tableHTML += `<th>S<sub>${i}</sub></th>`;
                tableHTML += "</tr></thead><tbody>";
                rows.forEach(conf => {
                    const isSeed = seedSet.has(conf.booktitle);
                    let row = `<tr><td>${escapeHtml(conf.booktitle)}${isSeed ? "" : " *"}</td><td class="num">${escapeHtml(String(conf["Non-Distinct-S-Index"]))}</td><td class="num">${escapeHtml(String(conf["Non-Distinct-S-Index-set-size"]))}</td>`;
                    for (let i = 1; i <= 20; i++) {
                        const v = conf[`S_${i}_index`];
                        row += `<td class="num">${v !== undefined ? escapeHtml(String(v)) : ""}</td>`;
                    }
                    row += "</tr>";
                    tableHTML += row;
                });
                tableHTML += "</tbody></table></div>";
                if (neighbourCount > 0) {
                    tableHTML +=
                        '<p class="hint">* Connected to your selection in the co-authorship graph (not checkbox-selected).</p>';
                }
                tableHTML += networkBtn;
                results.innerHTML = defaultResultToolbar() + tableHTML;
            }

            initResultButtons();
            updateYearComparePanel();
            updateUrlFromSelection();
            const totalMsg =
                rows.length > selectedBooks.length
                    ? `Showing ${selectedBooks.length} selected and ${rows.length - selectedBooks.length} graph neighbour row(s).`
                    : selectedBooks.length === 1
                      ? `Showing results for ${selectedBooks[0].booktitle}.`
                      : `Showing results for ${selectedBooks.length} conferences.`;
            announceIndex(totalMsg);
        });
    }

    function generateSIndicesData(conference) {
        const data = [];
        for (let i = min; i <= max; i++) {
            const index = conference[`S_${i}_index`];
            if (index === undefined) break;
            data.push(Number(index));
        }
        return data;
    }

    function range(lo, hi) {
        const arr = [];
        for (let i = lo; i <= hi; i++) arr.push(i);
        return arr;
    }

    loadConfig()
        .then(() => loadAllYearCaches())
        .then(() => loadDataset())
        .then(data => {
            displayBooks(data.map(b => b.booktitle));
            return applyDeepLinkFromUrl();
        })
        .then(() => {
            announceIndex("Search page ready.");
        })
        .catch(err => {
            console.error(err);
            if (table) table.innerHTML = '<p class="empty">Failed to load data. Check config and dataset path.</p>';
            const sel = document.getElementById("yearSelect");
            if (sel) sel.innerHTML = '<option value="">No data</option>';
            announceIndex("Failed to load data.");
        });

    if (yearSelect) {
        yearSelect.addEventListener("change", () => {
            invalidateGraphEdgesCache();
            announceIndex("Loading year " + yearSelect.value + "…");
            loadDataset()
                .then(data => {
                    selectedBooks = [];
                    currentData = data;
                    displayBooks(data.map(b => b.booktitle));
                    hideResults();
                    announceIndex("Year " + yearSelect.value + " loaded.");
                })
                .catch(err => {
                    console.error(err);
                    if (table) table.innerHTML = '<p class="empty">Failed to load dataset.</p>';
                    announceIndex("Failed to load dataset.");
                });
        });
    }

    searchButton.addEventListener("click", function () {
        const query = (searchBox.value || "").toLowerCase().trim();
        if (!query) {
            displayBooks(currentData.map(c => c.booktitle));
            announceIndex("Showing full conference list.");
            return;
        }
        selectedBooks = currentData.filter(c => c.booktitle.toLowerCase().includes(query));
        displayResults();
    });

    searchBox.addEventListener("keydown", function (e) {
        if (e.key === "Enter") searchButton.click();
    });

    const menuBtn = document.querySelector(".menu-btn");
    const nav = document.querySelector(".nav");
    if (menuBtn && nav) {
        menuBtn.removeAttribute("hidden");
        menuBtn.addEventListener("click", () => {
            const open = nav.classList.toggle("is-open");
            menuBtn.setAttribute("aria-expanded", open);
        });
    }
});
