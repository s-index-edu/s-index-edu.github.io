let selectedBooks = [];

const colors = [
    "blue", "green", "red", "yellow", "lightGreen", "orange", "lightBlue", "lightRed",
    "black", "gray", "brown", "lightBrown", "darkBrown", "darkRed",
    "aqua", "azure", "beige", "bisque", "blanchedalmond", "chartreuse", "coral", "cornflowerblue", 
    "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkkhaki", "darkmagenta", 
    "darkolivegreen", "darkorange", "darkorchid", "darksalmon", "darkseagreen", "darkslateblue", 
    "darkslategray", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dodgerblue", 
    "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", 
    "honeydew", "hotpink", "indianred", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", 
    "lemonchill", "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightpink", 
    "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightsteelblue", "lime", "linen", 
    "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", 
    "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "mintcream", "mistyrose", 
    "moccasin", "navajowhite", "oldlace", "olivedrab", "orangered", "palegoldenrod", "palegreen", "paleturquoise", 
    "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", 
    "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", 
    "silver", "skyblue", "slateblue", "slategray", "snow", "springgreen", "steelblue", "tan", "teal", 
    "thistle", "tomato", "turquoise", "violet", "wheat", "whitesmoke", "yellowgreen"
]

function getColor(index) {
    const max = colors.length - 1;
    return colors[index >= max ? index % max : index];
}

let defaultMax = 20;
let defaultMin = 1;
let max = defaultMax;
let min = defaultMin;
let graph = true;

document.addEventListener('DOMContentLoaded', function () {
    const searchBox = document.getElementById('searchBox');
    const searchButton = document.getElementById('searchButton');
    const table = document.getElementById("table");
    const main = document.getElementById("main");
    const results = document.getElementById('results');
    const defaultResults = results.innerHTML = `<br><button id="tableResultBtn" class="tablebtn"><svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 9.5H20M4 14.5H20M9 4.5V19.5M7.2 19.5H16.8C17.9201 19.5 18.4802 19.5 18.908 19.282C19.2843 19.0903 19.5903 18.7843 19.782 18.408C20 17.9802 20 17.4201 20 16.3V7.7C20 6.5799 20 6.01984 19.782 5.59202C19.5903 5.21569 19.2843 4.90973 18.908 4.71799C18.4802 4.5 17.9201 4.5 16.8 4.5H7.2C6.0799 4.5 5.51984 4.5 5.09202 4.71799C4.71569 4.90973 4.40973 5.21569 4.21799 5.59202C4 6.01984 4 6.57989 4 7.7V16.3C4 17.4201 4 17.9802 4.21799 18.408C4.40973 18.7843 4.71569 19.0903 5.09202 19.282C5.51984 19.5 6.07989 19.5 7.2 19.5Z" stroke="#000000" stroke-width="2"/></svg></button>`
        + ` <button id="10ResultBtn" class="tablebtn"><svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5V19C4 19.5523 4.44772 20 5 20H19" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 9L13 13.9999L10.5 11.4998L7 14.9998" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`
        + ` <button id="AllResultBtn" class="tablebtn"><svg style="padding-left: 3px" width="800px" height="800px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M0 25.406h22.406v-1.75h-20.656v-17.063h-1.75v18.813zM3.063 21.969h19.25v-13.813l-4.063 3.719-3.781-1.375-4 4.563-4.094-1.469-3.313 3.438v4.938z"></path></svg></button>`;

    fetch('static/dataset/s-indices2023.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            displayBooks(data.map(book => book.booktitle))
        })
        .catch(error => {
            console.error('There has been a problem with your fetch operation:', error);
        });

    searchButton.addEventListener('click', function () {
        const query = searchBox.value.toLowerCase();
        fetch('static/dataset/s-indices2023.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                selectedBooks = data.filter(conference => conference.booktitle.toLowerCase().includes(query));
                displayResults()
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });
    });

    function initResultButtons() {
        const tableResultBtn = document.getElementById("tableResultBtn");
        tableResultBtn.addEventListener("click", () => {
            graph = false;
            max = defaultMax;
            min = defaultMin;
            displayResults()
        })
        const tenResultBtn = document.getElementById("10ResultBtn");
        tenResultBtn.addEventListener("click", () => {
            graph = true;
            max = defaultMax;
            min = 10;
            displayResults()
        })
        const allResultBtn = document.getElementById("AllResultBtn");
        allResultBtn.addEventListener("click", () => {
            graph = true;
            max = defaultMax;
            min = defaultMin;
            displayResults()
        })
    }

    function displayBooks(books) {
        table.innerHTML = "Loading";
        if (books.length === 0) {
            table.innerHTML = '<p>No book found</p>';
        } else {
            table.innerHTML = books.map(book => `<input type="checkbox" id="${book}" name="books-check" class="books-check" value="${book}">`
                + `<label for="${book}">${book}</label><br>`).join("");

            document.querySelectorAll('.books-check').forEach((checkbox) => {
                checkbox.addEventListener('change', (event) => {
                    const book = checkbox.id;
                    if (event.target.checked) {
                        fetch('static/dataset/s-indices2023.json')
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('Network response was not ok ' + response.statusText);
                                }
                                return response.json();
                            })
                            .then(data => {
                                selectedBooks.push(data.find(conference => book === conference.booktitle))
                                displayBooks(data.map(conference => conference.booktitle))
                                displayResults();
                            })
                            .catch(error => {
                                console.error('There has been a problem with your fetch operation:', error);
                            });
                    } else {
                        selectedBooks = selectedBooks.filter(selectedBook => selectedBook.booktitle !== book);
                        displayResults()
                    }
                })
            })
        }
    }

    function hideResults() {
        main.classList.remove("up")
        main.classList.add("full")
        results.style.display = "none";
        results.innerHTML = '';
        document.querySelectorAll('.books-check').forEach(checkbox => {
            checkbox.checked = false
        })
    }

    function displayResults() {
        main.classList.remove("full")
        main.classList.add("up")
        results.style.display = "block";
        results.innerHTML = defaultResults;

        const bookNames = selectedBooks.map(conference => conference.booktitle);
        document.querySelectorAll('.books-check').forEach(checkbox => {
            checkbox.checked = bookNames.includes(checkbox.id)
        })

        if (selectedBooks.length === 0) {
            hideResults()
            return;
        }

        if (graph) {
            results.innerHTML = `<canvas id="result-chart" style="width:100%;max-width:700px;height: 30vh"></canvas>` + defaultResults
            const datasets = [];
            selectedBooks.forEach(conference => {
                datasets.push({
                    label: conference.booktitle,
                    data: generateSIndices(conference),
                    borderColor: getColor(selectedBooks.indexOf(conference))
                })
            })
            new Chart(`result-chart`, {
                type: "line",
                data: {
                    datasets,
                    labels: range(min, max)
                }
            });
        } else {
            let tableHTML = '<table><thead><tr><th>Book Title</th><th>S-Index</th><th>S-Index Set Size</th>';
            for (let i = 1; i <= 20; i++) {
                tableHTML += `<th>S_${i} Index</th>`;
            }
            tableHTML += '</tr></thead><tbody>';
            selectedBooks.forEach(conference => {
                tableHTML += `
                <tr>
                    <td>${conference.booktitle}</td>
                    <td>${conference["Non-Distinct-S-Index"]}</td>
                    <td>${conference["Non-Distinct-S-Index-set-size"]}</td>
                    ${generateSIndices(conference)}
                </tr>
            `;
            });
            tableHTML += '</tbody></table>';
            results.innerHTML = tableHTML + defaultResults;
        }
        initResultButtons()
    }

    function generateSIndices(conference) {
        if (graph) {
            const data = [];
            for (let i = min; i <= max; i++) {
                const index = conference[`S_${i}_index`];
                if (!index) break;
                data.push(Number(index))
            }
            return data;
        } else {
            let sIndicesHTML = '';
            for (let i = 1; i <= max; i++) {
                sIndicesHTML += `<td>${conference[`S_${i}_index`] !== undefined ? conference[`S_${i}_index`] : ''}</td>`;
            }
            return sIndicesHTML;
        }
    }

    function range(min, max) {
        const array = []
        for (let i = min; i <= max; i++)
            array.push(i)
        return array
    }
});
