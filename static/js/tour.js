/**
 * First-visit guided tour (localStorage key sindex-tour-shown).
 */
(function () {
    var STORAGE_KEY = "sindex-tour-shown";
    if (typeof localStorage === "undefined") return;
    try {
        if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch (e) {
        return;
    }

    var steps = [
        {
            title: "Search",
            // Deep link example for maintainers: index.html?venue=CHI&year=2025
            body: "Pick a data year and select venues. The default chart adds first-degree neighbours from the co-authorship graph (dashed lines). Use Open network graph to see the subgraph on the Graph page."
        },
        {
            title: "Graph",
            body: "Explore co-authorship overlap as an interactive network. On the Graph page you can use Focus on venues to build a subgraph without leaving the page. A text summary of each year’s graph is available for screen readers."
        },
        {
            title: "Adjacency Matrix",
            body: "Read precomputed overlap tables in Markdown, plus a sortable table of S-Index and Google Scholar h5-index where available."
        },
        {
            title: "Survey",
            body: "Read the formative cohort report. During anonymized review the live form is not embedded; response totals are read from a small JSON config file you can update when exports change."
        },
        {
            title: "Statistics",
            body: "Optional site-traffic dashboard: paste an API token to load charts. The token stays in this browser session only."
        }
    ];

    var idx = 0;
    var overlay = document.createElement("div");
    overlay.className = "tour-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "tourTitle");

    function render() {
        var s = steps[idx];
        var dots = steps
            .map(function (_, i) {
                return '<span class="tour-dot' + (i === idx ? " is-active" : "") + '" aria-hidden="true"></span>';
            })
            .join("");
        overlay.innerHTML =
            '<div class="panel tour-dialog">' +
            '<h2 id="tourTitle" class="tour-step-title">' +
            escapeHtml(s.title) +
            "</h2>" +
            '<p class="tour-step-body">' +
            escapeHtml(s.body) +
            "</p>" +
            '<div class="tour-dots">' +
            dots +
            "</div>" +
            '<div class="tour-actions">' +
            '<button type="button" class="btn" id="tourSkip">Skip tour</button>' +
            (idx > 0 ? '<button type="button" class="btn" id="tourBack">Back</button>' : "") +
            '<button type="button" class="btn btn-primary" id="tourNext">' +
            (idx === steps.length - 1 ? "Done" : "Next") +
            "</button>" +
            "</div>" +
            "</div>";
        wire();
        var primary = overlay.querySelector("#tourNext");
        if (primary) primary.focus();
    }

    function escapeHtml(str) {
        var d = document.createElement("div");
        d.textContent = str;
        return d.innerHTML;
    }

    function closeTour() {
        try {
            localStorage.setItem(STORAGE_KEY, "1");
        } catch (e) { /* ignore */ }
        overlay.remove();
        document.removeEventListener("keydown", onKey);
    }

    function onKey(ev) {
        if (ev.key === "Escape") {
            ev.preventDefault();
            closeTour();
        }
    }

    function wire() {
        var skip = overlay.querySelector("#tourSkip");
        var back = overlay.querySelector("#tourBack");
        var next = overlay.querySelector("#tourNext");
        if (skip) skip.addEventListener("click", closeTour);
        if (back)
            back.addEventListener("click", function () {
                idx = Math.max(0, idx - 1);
                render();
            });
        if (next)
            next.addEventListener("click", function () {
                if (idx >= steps.length - 1) closeTour();
                else {
                    idx += 1;
                    render();
                }
            });
    }

    document.addEventListener("DOMContentLoaded", function () {
        document.body.appendChild(overlay);
        render();
        document.addEventListener("keydown", onKey);
    });
})();
