document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');
    const webhookUrl = 'https://n8n.1o1.zip/webhook/6b122475-a2bc-4d56-a711-82b7f12401a9';

    function parsePrice(priceStr) {
        if (!priceStr || typeof priceStr !== 'string') {
            return NaN;
        }
        // Take the first part if it's a range
        const parts = priceStr.split('–');
        let numericPart = parts[0].trim();
        // Remove currency symbol and whitespace, then replace comma with dot
        numericPart = numericPart.replace(/€/g, '').replace(/,/g, '.').trim();
        return parseFloat(numericPart);
    }

    searchButton.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        resultsDiv.innerHTML = ''; // Clear previous results

        if (!query) {
            resultsDiv.innerHTML = '<p>Please enter a perfume name to search.</p>';
            return;
        }

        resultsDiv.innerHTML = '<p>Searching...</p>';

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ search: query }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error ${response.status}: ${errorText || 'Failed to fetch data'}`);
            }

            let perfumes = await response.json();

            if (Array.isArray(perfumes)) {
                // Filter out entries that are essentially empty
                perfumes = perfumes.filter(perfume =>
                    !(perfume.Precio === "" && perfume.Tienda === "" && perfume.RefTienda === "")
                );

                if (perfumes.length > 0) {
                    perfumes.sort((a, b) => {
                        const priceA = parsePrice(a.Precio);
                        const priceB = parsePrice(b.Precio);

                        if (isNaN(priceA) && isNaN(priceB)) return 0;
                        if (isNaN(priceA)) return 1; // Put items without a valid price at the end
                        if (isNaN(priceB)) return -1;

                        return priceA - priceB;
                    });

                    perfumes.forEach(perfume => {
                        const perfumeDiv = document.createElement('div');
                        perfumeDiv.style.border = '1px solid #eee';
                        perfumeDiv.style.padding = '10px';
                        perfumeDiv.style.marginBottom = '10px';
                        perfumeDiv.style.borderRadius = '4px';

                        const refTienda = perfume.RefTienda || 'N/A';
                        const tienda = perfume.Tienda || 'N/A';
                        const precioDisplay = perfume.Precio || 'Price not available';
                        const url = perfume.Url;

                        let urlLink = '';
                        if (url) {
                            try {
                                // Ensure URL is valid and absolute, or make it so if possible
                                const validUrl = new URL(url.startsWith('http') ? url : `http://${url}`);
                                urlLink = `<a href="${validUrl.href}" target="_blank">View Product</a>`;
                            } catch (e) {
                                console.warn('Invalid URL:', url);
                                urlLink = '<span>(Invalid URL)</span>';
                            }
                        } else {
                            urlLink = '<span>(No URL provided)</span>';
                        }

                        perfumeDiv.innerHTML = `
                            <h3>${refTienda}</h3>
                            <p><strong>Store:</strong> ${tienda}</p>
                            <p><strong>Price:</strong> ${precioDisplay}</p>
                            <p>${urlLink}</p>
                            <hr>
                        `;
                        resultsDiv.appendChild(perfumeDiv);
                    });
                } else {
                    resultsDiv.innerHTML = '<p>No valid perfumes found matching your search after filtering.</p>';
                }
            } else {
                console.error('Unexpected data format:', perfumes);
                resultsDiv.innerHTML = '<p>Received unexpected data format from the server.</p>';
            }
        } catch (error) {
            console.error('Error fetching or processing data:', error);
            resultsDiv.innerHTML = `<p>Error: ${error.message}. Please try again later.</p>`;
        }
    });
});
