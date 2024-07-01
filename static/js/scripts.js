document.addEventListener('DOMContentLoaded', function () {
    const searchBox = document.getElementById('searchBox');
    const searchButton = document.getElementById('searchButton');
    const results = document.getElementById('results');

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
                const filteredResults = data.filter(conference => conference.booktitle.toLowerCase().includes(query));
                displayResults(filteredResults);
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });
    });

    function displayResults(conferences) {
        results.innerHTML = '';
        if (conferences.length === 0) {
            results.innerHTML = '<p>No results found</p>';
        } else {
            let tableHTML = '<table><thead><tr><th>Booktitle</th><th>S-Index</th><th>S-Index Set Size</th>';
            for (let i = 1; i <= 20; i++) {
                tableHTML += `<th>S_${i} Index</th>`;
            }
            tableHTML += '</tr></thead><tbody>';
            conferences.forEach(conference => {
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
            results.innerHTML = tableHTML;
        }
    }

    function generateSIndices(conference) {
        let sIndicesHTML = '';
        for (let i = 1; i <= 20; i++) {
            sIndicesHTML += `<td>${conference[`S_${i}_index`] !== undefined ? conference[`S_${i}_index`] : ''}</td>`;
        }
        return sIndicesHTML;
    }
});
