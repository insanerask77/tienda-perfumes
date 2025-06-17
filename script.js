document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');
    const webhookUrl = 'https://n8n.1o1.zip/webhook/6b122475-a2bc-4d56-a711-82b7f12401a9';

    // Filter UI elements
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    const storeFilterSelect = document.getElementById('storeFilter');
    const genderFilterSelect = document.getElementById('genderFilter'); // Added gender filter select
    const applyFilterButton = document.getElementById('applyFilterButton');
    const clearFilterButton = document.getElementById('clearFilterButton');

    let allPerfumesData = []; // To store all fetched perfumes before filtering

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
                    allPerfumesData = perfumes.filter(perfume => // Store the original, unfiltered search results
                        !(perfume.Precio === "" && perfume.Tienda === "" && perfume.RefTienda === "")
                    );

                    populateStoreFilter(allPerfumesData);
                    populateGenderFilter(allPerfumesData); // Populate gender filter
                    displayPerfumes(allPerfumesData); // Display initial results
                } else {
                    allPerfumesData = []; // Reset if no data
                    populateStoreFilter(allPerfumesData);
                    populateGenderFilter(allPerfumesData); // Clear gender filter
                    resultsDiv.innerHTML = '<p>No valid perfumes found matching your search after filtering.</p>';
                }
            } else {
                allPerfumesData = []; // Reset if bad data
                populateStoreFilter(allPerfumesData);
                populateGenderFilter(allPerfumesData); // Clear gender filter
                console.error('Unexpected data format:', perfumes);
                resultsDiv.innerHTML = '<p>Received unexpected data format from the server.</p>';
            }
        } catch (error) {
            allPerfumesData = []; // Reset on error
            populateStoreFilter(allPerfumesData);
            populateGenderFilter(allPerfumesData); // Clear gender filter
            console.error('Error fetching or processing data:', error);
            resultsDiv.innerHTML = `<p>Error: ${error.message}. Please try again later.</p>`;
        }
    });

    function populateStoreFilter(perfumes) {
        const currentSelectedValue = storeFilterSelect.value;
        storeFilterSelect.innerHTML = '<option value="">All Stores</option>';
        const stores = new Set();
        perfumes.forEach(perfume => {
            if (perfume.Tienda && perfume.Tienda.trim() !== "") { // Ensure not empty
                stores.add(perfume.Tienda.trim());
            }
        });
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store;
            option.textContent = store;
            storeFilterSelect.appendChild(option);
        });
        if (Array.from(stores).includes(currentSelectedValue)) {
            storeFilterSelect.value = currentSelectedValue;
        }
    }

    function populateGenderFilter(perfumes) {
        const currentSelectedValue = genderFilterSelect.value;
        genderFilterSelect.innerHTML = '<option value="">All Genders</option>'; // Reset
        const genders = new Set();
        perfumes.forEach(perfume => {
            if (perfume.genero && perfume.genero.trim() !== "") { // Ensure not empty
                genders.add(perfume.genero.trim());
            }
        });
        genders.forEach(gender => {
            const option = document.createElement('option');
            option.value = gender;
            option.textContent = gender;
            genderFilterSelect.appendChild(option);
        });
        if (Array.from(genders).includes(currentSelectedValue)) {
            genderFilterSelect.value = currentSelectedValue;
        }
    }

    function displayPerfumes(perfumesToDisplay) {
        resultsDiv.innerHTML = ''; // Clear previous results or "Searching..." message

        if (perfumesToDisplay.length === 0) {
            resultsDiv.innerHTML = '<p>No perfumes found matching your criteria.</p>';
            return;
        }

        // Sort before displaying
        perfumesToDisplay.sort((a, b) => {
            const priceA = parsePrice(a.Precio);
            const priceB = parsePrice(b.Precio);
            if (isNaN(priceA) && isNaN(priceB)) return 0;
            if (isNaN(priceA)) return 1;
            if (isNaN(priceB)) return -1;
            return priceA - priceB;
        });

        perfumesToDisplay.forEach(perfume => {
            const perfumeDiv = document.createElement('div');
            perfumeDiv.className = 'perfume-card';

            const imageUrl = perfume.image;
            const refTienda = perfume.RefTienda || 'N/A';
            const tienda = perfume.Tienda || 'N/A';
            const precioDisplay = perfume.Precio || 'Price not available';
            const url = perfume.Url;
            const format = perfume.format || 'Format details not available.';
            const description = perfume.description || 'No description available.';
            const genero = perfume.genero || 'N/A'; // Get the gender field

            let imageElement = '';
            if (imageUrl) {
                try {
                    const validImageUrl = new URL(imageUrl);
                    imageElement = `<img src="${validImageUrl.href}" alt="${refTienda}">`;
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
                <p><strong>Gender:</strong> ${genero}</p> {/* Added gender display */}
                <p><strong>Formats:</strong> ${format}</p>
                <p><strong>Description:</strong></p>
                <div class="description-text">${description}</div>
                <p>${urlLink}</p>
            `;
            resultsDiv.appendChild(perfumeDiv);
        });
    }

    applyFilterButton.addEventListener('click', () => {
        let filteredPerfumes = [...allPerfumesData]; // Start with all perfumes from the last search

        const minPrice = parseFloat(minPriceInput.value);
        const maxPrice = parseFloat(maxPriceInput.value);
        const selectedStore = storeFilterSelect.value;
        const selectedGender = genderFilterSelect.value; // Get selected gender

        // Apply price filters
        if (!isNaN(minPrice)) {
            filteredPerfumes = filteredPerfumes.filter(p => parsePrice(p.Precio) >= minPrice);
        }
        if (!isNaN(maxPrice)) {
            filteredPerfumes = filteredPerfumes.filter(p => parsePrice(p.Precio) <= maxPrice);
        }

        // Apply store filter
        if (selectedStore) {
            filteredPerfumes = filteredPerfumes.filter(p => p.Tienda === selectedStore);
        }

        // Apply gender filter
        if (selectedGender) {
            filteredPerfumes = filteredPerfumes.filter(p => p.genero === selectedGender);
        }

        displayPerfumes(filteredPerfumes);
    });

    clearFilterButton.addEventListener('click', () => {
        minPriceInput.value = '';
        maxPriceInput.value = '';
        storeFilterSelect.value = '';
        genderFilterSelect.value = ''; // Clear gender filter
        // Re-display all perfumes from the original search, without refetching
        displayPerfumes(allPerfumesData);
    });
});
