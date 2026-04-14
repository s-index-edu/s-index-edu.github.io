/**
 * Theme selector: Light / Dark / System. Preference saved in localStorage.
 * Sets html class (theme-light, theme-dark) and data-theme for charts.
 */
(function () {
    var STORAGE_KEY = "sindex-theme";
    var html = document.documentElement;

    function getStored() {
        try {
            return localStorage.getItem(STORAGE_KEY) || "system";
        } catch (e) {
            return "system";
        }
    }

    function resolveTheme(choice) {
        if (choice === "light" || choice === "dark") return choice;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function apply(choice) {
        html.classList.remove("theme-light", "theme-dark");
        if (choice === "light") html.classList.add("theme-light");
        if (choice === "dark") html.classList.add("theme-dark");
        html.setAttribute("data-theme", resolveTheme(choice));
    }

    // Apply immediately to avoid flash
    apply(getStored());

    function init() {
        var sel = document.getElementById("themeSelect");
        if (sel) {
            sel.value = getStored();
            sel.addEventListener("change", function () {
                var value = sel.value || "system";
                try {
                    localStorage.setItem(STORAGE_KEY, value);
                } catch (e) {}
                apply(value);
            });
        }

        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
            if (getStored() === "system") apply("system");
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
