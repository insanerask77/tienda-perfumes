document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');
    const webhookUrl = 'https://n8n.1o1.zip/webhook/6b122475-a2bc-4d56-a711-82b7f12401a9';

    function parsePrice(priceStr) {
        if (!priceStr || typeof priceStr !== 'string') {
            return NaN;
        }
        const parts = priceStr.split('–');
        let numericPart = parts[0].trim();
        numericPart = numericPart.replace(/€/g, '').replace(/,/g, '.').trim();
        return parseFloat(numericPart);
    }

    searchButton.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        resultsDiv.innerHTML = '';

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
                perfumes = perfumes.filter(perfume =>
                    !(perfume.Precio === "" && perfume.Tienda === "" && perfume.RefTienda === "")
                );

                if (perfumes.length > 0) {
                    perfumes.sort((a, b) => {
                        const priceA = parsePrice(a.Precio);
                        const priceB = parsePrice(b.Precio);
                        if (isNaN(priceA) && isNaN(priceB)) return 0;
                        if (isNaN(priceA)) return 1;
                        if (isNaN(priceB)) return -1;
                        return priceA - priceB;
                    });

                    // Clear "Searching..." message before adding results
                    resultsDiv.innerHTML = '';

                    perfumes.forEach(perfume => {
                        const perfumeDiv = document.createElement('div');
                        // This class will be used for styling the card
                        perfumeDiv.className = 'perfume-card';

                        const imageUrl = perfume.image;
                        const refTienda = perfume.RefTienda || 'N/A';
                        const tienda = perfume.Tienda || 'N/A';
                        const precioDisplay = perfume.Precio || 'Price not available';
                        const url = perfume.Url;
                        const format = perfume.format || 'Format details not available.';
                        const description = perfume.description || 'No description available.';

                        let imageElement = '';
                        if (imageUrl) {
                            try {
                                const validImageUrl = new URL(imageUrl);
                                imageElement = `<img src="${validImageUrl.href}" alt="${refTienda}" style="max-width: 100px; height: auto; margin-bottom: 10px;">`; // Basic inline style for now
                            } catch (e) {
                                console.warn('Invalid image URL:', imageUrl);
                                imageElement = '<p><em>(Invalid image URL)</em></p>';
                            }
                        } else {
                            imageElement = '<p><em>(No image)</em></p>';
                        }

                        let urlLink = '';
                        if (url) {
                            try {
                                const validUrl = new URL(url.startsWith('http') ? url : `http://${url}`);
                                urlLink = `<a href="${validUrl.href}" target="_blank" class="product-link">View Product</a>`;
                            } catch (e) {
                                console.warn('Invalid URL:', url);
                                urlLink = '<span>(Invalid URL)</span>';
                            }
                        } else {
                            urlLink = '<span>(No URL provided)</span>';
                        }

                        perfumeDiv.innerHTML = `
                            ${imageElement}
                            <h3>${refTienda}</h3>
                            <p><strong>Store:</strong> ${tienda}</p>
                            <p><strong>Price:</strong> ${precioDisplay}</p>
                            <p><strong>Formats:</strong> ${format}</p>
                            <p><strong>Description:</strong></p>
                            <div class="description-text">${description}</div>
                            <p>${urlLink}</p>
                        `;
                        // Removed the <hr> for cleaner card design, will handle separation with CSS
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
