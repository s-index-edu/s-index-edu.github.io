/**
 * S-Index Search — loads dataset from config (static/config/datasets.json).
 * To add a new year: add a new entry to datasets.json and put the JSON file
 * in static/dataset/ (e.g. s-indices2024.json).
 */

let selectedBooks = [];
let config = null;
let currentData = [];

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
    // support both old {path} and new {sindex} key
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
                if (opt.value === defaultYear || (config.datasets.length === 1)) opt.selected = true;
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

document.addEventListener("DOMContentLoaded", function () {
    const searchBox = document.getElementById("searchBox");
    const searchButton = document.getElementById("searchButton");
    const yearSelect = document.getElementById("yearSelect");
    const table = document.getElementById("table");
    const main = document.getElementById("main");
    const results = document.getElementById("results");

    const defaultResultToolbar = () => {
        const tableBtn = `<button type="button" id="tableResultBtn" class="view-btn" title="Table view"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9.5H20M4 14.5H20M9 4.5V19.5M7.2 19.5H16.8C17.9201 19.5 18.4802 19.5 18.908 19.282C19.2843 19.0903 19.5903 18.7843 19.782 18.408C20 17.9802 20 17.4201 20 16.3V7.7C20 6.5799 20 6.01984 19.782 5.59202C19.5903 5.21569 19.2843 4.90973 18.908 4.71799C18.4802 4.5 17.9201 4.5 16.8 4.5H7.2C6.0799 4.5 5.51984 4.5 5.09202 4.71799C4.71569 4.90973 4.40973 5.21569 4.21799 5.59202C4 6.01984 4 6.57989 4 7.7V16.3C4 17.4201 4 17.9802 4.21799 18.408C4.40973 18.7843 4.71569 19.0903 5.09202 19.282C5.51984 19.5 6.07989 19.5 7.2 19.5Z"/></svg></button>`;
        const chart10Btn = `<button type="button" id="10ResultBtn" class="view-btn" title="Chart (S-10 and above)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5V19C4 19.5523 4.44772 20 5 20H19"/><path d="M18 9L13 13.9999L10.5 11.4998L7 14.9998" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
        const chartAllBtn = `<button type="button" id="AllResultBtn" class="view-btn" title="Chart (all S-i)"><svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><path d="M0 25.406h22.406v-1.75h-20.656v-17.063h-1.75v18.813zM3.063 21.969h19.25v-13.813l-4.063 3.719-3.781-1.375-4 4.563-4.094-1.469-3.313 3.438v4.938z"/></svg></button>`;
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
        if (books.length === 0) {
            table.innerHTML = '<p class="empty">No conferences in this dataset.</p>';
            return;
        }
        table.innerHTML = books
            .map(
                (book) =>
                    `<label><input type="checkbox" name="books-check" class="books-check" value="${String(book).replace(/"/g, "&quot;")}"><span>${escapeHtml(book)}</span></label>`
            )
            .join("");

        document.querySelectorAll(".books-check").forEach((checkbox) => {
            checkbox.addEventListener("change", function () {
                const book = checkbox.value;
                if (checkbox.checked) {
                    const conf = currentData.find((c) => c.booktitle === book);
                    if (conf) {
                        selectedBooks.push(conf);
                        displayResults();
                    }
                } else {
                    selectedBooks = selectedBooks.filter((b) => b.booktitle !== book);
                    displayResults();
                }
            });
        });
    }

    function hideResults() {
        if (results) {
            results.hidden = true;
            results.innerHTML = "";
        }
        document.querySelectorAll(".books-check").forEach((cb) => (cb.checked = false));
        selectedBooks = [];
    }

    function displayResults() {
        if (!results) return;
        if (selectedBooks.length === 0) {
            hideResults();
            return;
        }

        results.hidden = false;
        const bookNames = selectedBooks.map((c) => c.booktitle);
        document.querySelectorAll(".books-check").forEach((checkbox) => {
            checkbox.checked = bookNames.includes(checkbox.value);
        });

        if (graph) {
            results.innerHTML =
                defaultResultToolbar() +
                '<div class="result-chart-wrap"><canvas id="result-chart"></canvas></div>';
            const datasets = selectedBooks.map((conf, i) => ({
                label: conf.booktitle,
                data: generateSIndicesData(conf),
                borderColor: getColor(i),
                backgroundColor: "transparent",
                tension: 0.2
            }));
            const labels = range(min, max);
            var resolved = document.documentElement.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
            var isDark = resolved === "dark";
            var chartText = isDark ? "#a1a1aa" : "#6c757d";
            var chartGrid = isDark ? "#2e2e36" : "#dee2e6";
            new Chart(document.getElementById("result-chart"), {
                type: "line",
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: chartText } }
                    },
                    scales: {
                        x: { ticks: { color: chartText }, grid: { color: chartGrid } },
                        y: { ticks: { color: chartText }, grid: { color: chartGrid } }
                    }
                }
            });
        } else {
            let tableHTML =
                '<div class="results-table-wrap"><table class="results-table"><thead><tr><th>Conference</th><th>S-Index</th><th>S-Index Set Size</th>';
            for (let i = 1; i <= 20; i++) tableHTML += `<th>S<sub>${i}</sub></th>`;
            tableHTML += "</tr></thead><tbody>";
            selectedBooks.forEach((conf) => {
                let row = `<tr><td>${conf.booktitle}</td><td class="num">${conf["Non-Distinct-S-Index"]}</td><td class="num">${conf["Non-Distinct-S-Index-set-size"]}</td>`;
                for (let i = 1; i <= 20; i++) {
                    const v = conf[`S_${i}_index`];
                    row += `<td class="num">${v !== undefined ? v : ""}</td>`;
                }
                row += "</tr>";
                tableHTML += row;
            });
            tableHTML += "</tbody></table></div>";
            results.innerHTML = defaultResultToolbar() + tableHTML;
        }
        initResultButtons();
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

    // Initial load: config -> dataset -> UI
    loadConfig()
        .then(() => loadDataset())
        .then((data) => displayBooks(data.map((b) => b.booktitle)))
        .catch((err) => {
            console.error(err);
            if (table) table.innerHTML = '<p class="empty">Failed to load data. Check config and dataset path.</p>';
            const sel = document.getElementById("yearSelect");
            if (sel) sel.innerHTML = '<option value="">No data</option>';
        });

    if (yearSelect) {
        yearSelect.addEventListener("change", () => {
            loadDataset()
                .then((data) => {
                    selectedBooks = [];
                    displayBooks(data.map((b) => b.booktitle));
                    hideResults();
                })
                .catch((err) => {
                    console.error(err);
                    if (table) table.innerHTML = '<p class="empty">Failed to load dataset.</p>';
                });
        });
    }

    searchButton.addEventListener("click", function () {
        const query = (searchBox.value || "").toLowerCase().trim();
        if (!query) {
            displayBooks(currentData.map((c) => c.booktitle));
            return;
        }
        selectedBooks = currentData.filter((c) => c.booktitle.toLowerCase().includes(query));
        displayResults();
    });

    searchBox.addEventListener("keydown", function (e) {
        if (e.key === "Enter") searchButton.click();
    });

    // Mobile nav
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
