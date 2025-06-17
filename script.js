const translations = {
  en: {
    // From index.html
    docTitle: "Your favorite perfume",
    pageTitle: "Your favorite perfume",
    searchInputPlaceholder: "Enter perfume name...",
    searchButton: "Search",
    minPriceLabel: "Min Price:",
    minPricePlaceholder: "Min",
    maxPriceLabel: "Max Price:",
    maxPricePlaceholder: "Max",
    storeFilterLabel: "Store:",
    allStoresOption: "All Stores",
    genderFilterLabel: "Gender:",
    allGendersOption: "All Genders",
    applyFiltersButton: "Apply Filters",
    clearFiltersButton: "Clear Filters",

    // From script.js (dynamic messages)
    enterPerfumeName: "Please enter a perfume name to search.",
    searching: "Searching...",
    failedToFetch: "Failed to fetch data",
    httpError: "HTTP error",
    noValidPerfumesInitial: "No valid perfumes found matching your search after filtering.",
    unexpectedFormat: "Received unexpected data format from the server.",
    errorPrefix: "Error:",
    tryAgainLater: "We have not found what you are looking for :(",
    noPerfumesAfterFilter: "No perfumes found matching your criteria.",

    // Fallbacks & Card text
    notAvailable: "N/A",
    priceNotAvailable: "Price not available",
    formatNotAvailable: "Format details not available.",
    descriptionNotAvailable: "No description available.",
    invalidImageUrl: "(Invalid image URL)",
    noImageProvided: "(No image provided)",
    invalidUrl: "(Invalid URL)",
    noUrlProvided: "(No URL provided)",
    viewProduct: "View Product",

    // Labels within perfume card
    labelStore: "Store:",
    labelPrice: "Price:",
    labelGender: "Gender:",
    labelFormats: "Formats:",
    labelDescription: "Description:",
    languageLabel: "Language:", // Added
  },
  es: {
    // From index.html
    docTitle: "Tu perfume favorito",
    pageTitle: "Tu perfume favorito",
    searchInputPlaceholder: "Introduce el nombre del perfume...",
    searchButton: "Buscar",
    minPriceLabel: "Precio Mín:",
    minPricePlaceholder: "Mín",
    maxPriceLabel: "Precio Máx:",
    maxPricePlaceholder: "Máx",
    storeFilterLabel: "Tienda:",
    allStoresOption: "Todas las Tiendas",
    genderFilterLabel: "Género:",
    allGendersOption: "Todos los Géneros",
    applyFiltersButton: "Aplicar Filtros",
    clearFiltersButton: "Limpiar Filtros",

    // From script.js (dynamic messages)
    enterPerfumeName: "Por favor, introduce un nombre de perfume para buscar.",
    searching: "Buscando...",
    failedToFetch: "Error al obtener los datos",
    httpError: "Error HTTP",
    noValidPerfumesInitial: "No se encontraron perfumes válidos que coincidan con tu búsqueda después de filtrar.",
    unexpectedFormat: "Se recibió un formato de datos inesperado del servidor.",
    errorPrefix: "Error:",
    tryAgainLater: "No hemos encontrado lo que buscas :(",
    noPerfumesAfterFilter: "No se encontraron perfumes que coincidan con tus criterios.",

    // Fallbacks & Card text
    notAvailable: "No disponible",
    priceNotAvailable: "Precio no disponible",
    formatNotAvailable: "Detalles de formato no disponibles.",
    descriptionNotAvailable: "No hay descripción disponible.",
    invalidImageUrl: "(URL de imagen inválida)",
    noImageProvided: "(No se proporcionó imagen)",
    invalidUrl: "(URL inválida)",
    noUrlProvided: "(No se proporcionó URL)",
    viewProduct: "Ver Producto",

    // Labels within perfume card
    labelStore: "Tienda:",
    labelPrice: "Precio:",
    labelGender: "Género:",
    labelFormats: "Formatos:",
    labelDescription: "Descripción:",
    languageLabel: "Idioma:", // Added
  }
};

let currentLang = 'en'; // Default language
const supportedLangs = ['en', 'es'];

function getTranslatedString(key) {
    return translations[currentLang]?.[key] || translations['en']?.[key] || `Missing: ${key}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // Language Switcher
    const languageSwitcher = document.getElementById('languageSwitcher');

    // Static text elements that need translation - using IDs added to HTML
    const pageTitleEl = document.getElementById('pageTitle');
    const searchInputEl = document.getElementById('searchInput'); // For placeholder & value
    const searchButtonEl = document.getElementById('searchButton');
    const minPriceLabelEl = document.getElementById('minPriceLabel');
    const minPriceInputEl = document.getElementById('minPrice'); // For placeholder
    const maxPriceLabelEl = document.getElementById('maxPriceLabel');
    const maxPriceInputEl = document.getElementById('maxPrice'); // For placeholder
    const storeFilterLabelEl = document.getElementById('storeFilterLabel');
    // allStoresOptionEl and allGendersOptionEl will be handled within their populate functions
    const genderFilterLabelEl = document.getElementById('genderFilterLabel');
    const applyFilterButtonEl = document.getElementById('applyFilterButton');
    const clearFilterButtonEl = document.getElementById('clearFilterButton');

    // Original elements (some might be duplicates of above, ensure correct usage)
    // const searchButton = document.getElementById('searchButton'); // Now searchButtonEl
    // const searchInput = document.getElementById('searchInput'); // Now searchInputEl
    const resultsDiv = document.getElementById('results');
    const webhookUrl = 'https://n8n.1o1.zip/webhook/6b122475-a2bc-4d56-a711-82b7f12401a9';

    // Filter UI elements
    // const minPriceInput = document.getElementById('minPrice'); // Now minPriceInputEl
    // const maxPriceInput = document.getElementById('maxPrice'); // Now maxPriceInputEl
    const storeFilterSelect = document.getElementById('storeFilter');
    const genderFilterSelect = document.getElementById('genderFilter');
    // const applyFilterButton = document.getElementById('applyFilterButton'); // Now applyFilterButtonEl
    // const clearFilterButton = document.getElementById('clearFilterButton'); // Now clearFilterButtonEl

    let allPerfumesData = [];

    function updateUIText(lang) {
        if (!supportedLangs.includes(lang)) {
            console.warn(`Language ${lang} not supported. Falling back to 'en'.`);
            lang = 'en';
        }
        currentLang = lang;
        document.documentElement.lang = lang;
        document.title = getTranslatedString('docTitle'); // Update document title

        // Update static text content using data-i18n-key attributes
        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const keyWithOptions = element.dataset.i18nKey;
            const [key, attribute] = keyWithOptions.split(':');
            const translation = getTranslatedString(key);

            if (translation) { // Check if translation exists
                if (attribute === 'placeholder') {
                    element.placeholder = translation;
                } else if (attribute) {
                    // For other potential attributes like 'title', 'aria-label' etc.
                    // Not used in current HTML, but good for future proofing
                    element.setAttribute(attribute, translation);
                } else {
                    // Default to textContent if no attribute specified or if it's not a known one like placeholder
                    element.textContent = translation;
                }
            }
        });

        // Re-populate filters to ensure "All Stores" / "All Genders" options are translated
        // These functions now use getTranslatedString internally for their default options.
        populateStoreFilter(allPerfumesData);
        populateGenderFilter(allPerfumesData);

        // Re-render displayed perfume cards to apply language changes to their content
        const currentDisplayedItems = getCurrentDisplayedPerfumes();
        if (currentDisplayedItems) {
            const isDisplayingItems = resultsDiv.querySelector('.perfume-card') !== null;
            // Only re-display if there are actual items or if allPerfumesData has content,
            // to avoid clearing messages like "Please enter..." unnecessarily if no search has been made.
            if (isDisplayingItems || allPerfumesData.length > 0) {
                 displayPerfumes(currentDisplayedItems);
            }
            // If resultsDiv contains a simple text message (e.g. "Searching...", "No results..."),
            // that message would have been set using getTranslatedString() at the time it was displayed.
            // Re-triggering the action that set it (e.g. search or filter) would be complex here.
            // The current approach correctly translates messages when they are first set.
            // If a message is static in resultsDiv and needs translation on lang change without re-filtering,
            // it would also need a data-i18n-key.
        }
    }

    function getCurrentDisplayedPerfumes() {
        if (allPerfumesData.length === 0 && resultsDiv.querySelector('.perfume-card') === null) return null;
        // If no data and no cards, nothing to return for re-display.
        // This check prevents trying to filter an empty allPerfumesData if a search hasn't been made yet.

        let filteredPerfumes = [...allPerfumesData];
        const minPrice = parseFloat(minPriceInputEl.value);
        const maxPrice = parseFloat(maxPriceInputEl.value);
        const selectedStore = storeFilterSelect.value;
        const selectedGender = genderFilterSelect.value;

        if (!isNaN(minPrice)) filteredPerfumes = filteredPerfumes.filter(p => parsePrice(p.Precio) >= minPrice);
        if (!isNaN(maxPrice)) filteredPerfumes = filteredPerfumes.filter(p => parsePrice(p.Precio) <= maxPrice);
        if (selectedStore) filteredPerfumes = filteredPerfumes.filter(p => p.Tienda === selectedStore);
        if (selectedGender) filteredPerfumes = filteredPerfumes.filter(p => p.genero === selectedGender);
        return filteredPerfumes;
    }

    languageSwitcher.addEventListener('change', (event) => {
        updateUIText(event.target.value);
    });

    // Initial UI text setup
    let browserLang = navigator.language.split('-')[0];
    if (!supportedLangs.includes(browserLang)) {
        browserLang = 'en';
    }
    languageSwitcher.value = browserLang;
    // updateUIText(browserLang); // Call this after the full DOM is ready and other scripts potentially.
                               // Or ensure all elements it touches are defined.
                               // Calling it here. Most elements are available.
                               // The select options (allStoresOption, allGendersOption) textContent might be overwritten by populate functions later.
                               // So, populate functions also need to use getTranslatedString.

    function parsePrice(priceStr) {
        if (!priceStr || typeof priceStr !== 'string') {
            return NaN;
        }
        const parts = priceStr.split('–');
        let numericPart = parts[0].trim();
        numericPart = numericPart.replace(/€/g, '').replace(/,/g, '.').trim();
        return parseFloat(numericPart);
    }

    // searchButton.addEventListener('click', async () => { // searchButton is now searchButtonEl
    searchButtonEl.addEventListener('click', async () => {
        const query = searchInputEl.value.trim(); // Use searchInputEl
        resultsDiv.innerHTML = '';

        if (!query) {
            resultsDiv.innerHTML = `<p>${getTranslatedString('enterPerfumeName')}</p>`;
            return;
        }

        resultsDiv.innerHTML = `<p>${getTranslatedString('searching')}</p>`;

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
                throw new Error(`${getTranslatedString('httpError')} ${response.status}: ${errorText || getTranslatedString('failedToFetch')}`);
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
                    populateGenderFilter(allPerfumesData);
                    displayPerfumes(allPerfumesData);
                } else {
                    allPerfumesData = [];
                    populateStoreFilter(allPerfumesData);
                    populateGenderFilter(allPerfumesData);
                    resultsDiv.innerHTML = `<p>${getTranslatedString('noValidPerfumesInitial')}</p>`;
                }
            } else {
                allPerfumesData = [];
                populateStoreFilter(allPerfumesData);
                populateGenderFilter(allPerfumesData);
                console.error(getTranslatedString('unexpectedFormat'), perfumes); // Use translated string for console too
                resultsDiv.innerHTML = `<p>${getTranslatedString('unexpectedFormat')}</p>`;
            }
        } catch (error) {
            allPerfumesData = [];
            populateStoreFilter(allPerfumesData);
            populateGenderFilter(allPerfumesData);
            // console.error(getTranslatedString('errorPrefix'), error); // Use translated string for console too
            resultsDiv.innerHTML = `${getTranslatedString('tryAgainLater')}</p>`;
        }
    });

    function populateStoreFilter(perfumes) {
        const currentSelectedValue = storeFilterSelect.value;
        storeFilterSelect.innerHTML = `<option value="">${getTranslatedString('allStoresOption')}</option>`;
        const stores = new Set();
        perfumes.forEach(perfume => {
            if (perfume.Tienda && perfume.Tienda.trim() !== "") {
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
        // Update the text of the selected "All Stores" option if it exists and is selected.
        // This ensures that if "All Stores" was the selected one, its text also updates.
        // This might be redundant if the innerHTML reset above already sets the correct text.
        const allStoresOpt = storeFilterSelect.querySelector('option[value=""]');
        if (allStoresOpt) allStoresOpt.textContent = getTranslatedString('allStoresOption');
    }

    function populateGenderFilter(perfumes) {
        const currentSelectedValue = genderFilterSelect.value;
        genderFilterSelect.innerHTML = `<option value="">${getTranslatedString('allGendersOption')}</option>`;
        const genders = new Set();
        perfumes.forEach(perfume => {
            if (perfume.genero && perfume.genero.trim() !== "") {
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
        const allGendersOpt = genderFilterSelect.querySelector('option[value=""]');
        if (allGendersOpt) allGendersOpt.textContent = getTranslatedString('allGendersOption');
    }

    function displayPerfumes(perfumesToDisplay) {
        resultsDiv.innerHTML = '';

        if (perfumesToDisplay.length === 0) {
            resultsDiv.innerHTML = `<p>${getTranslatedString('noPerfumesAfterFilter')}</p>`;
            return;
        }

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

            const refTienda = perfume.RefTienda || getTranslatedString('notAvailable');
            const tienda = perfume.Tienda || getTranslatedString('notAvailable');
            const precioDisplay = perfume.Precio || getTranslatedString('priceNotAvailable');
            const url = perfume.Url;
            const format = perfume.format || getTranslatedString('formatNotAvailable');
            const description = perfume.description || getTranslatedString('descriptionNotAvailable');
            const genero = perfume.genero || getTranslatedString('notAvailable');
            const imageUrlFromWebhook = perfume.image;

            let finalImageSource = '';
            let altText = refTienda;

            if (perfume.genero === "Masculino") {
                finalImageSource = "images/man.png";
            } else if (perfume.genero === "Femenino") {
                finalImageSource = "images/woman.png";
            } else if (perfume.genero === "Unisex") {
                finalImageSource = "images/unisex.png";
            } else if (imageUrlFromWebhook) {
                finalImageSource = imageUrlFromWebhook;
            }

            let imageElement = '';
            if (finalImageSource) {
                if (finalImageSource === imageUrlFromWebhook) {
                    try {
                        const validUrl = new URL(finalImageSource);
                        imageElement = `<img src="${validUrl.href}" alt="${altText}">`;
                    } catch (e) {
                        console.warn(getTranslatedString('invalidImageUrl'), finalImageSource);
                        imageElement = `<p><em>${getTranslatedString('invalidImageUrl')}</em></p>`;
                    }
                } else {
                    imageElement = `<img src="${finalImageSource}" alt="${altText}">`;
                }
            } else {
                imageElement = `<p><em>${getTranslatedString('noImageProvided')}</em></p>`;
            }

            let urlLink = '';
            if (url) {
                try {
                    const validUrl = new URL(url.startsWith('http') ? url : `http://${url}`);
                    urlLink = `<a href="${validUrl.href}" target="_blank" class="product-link">${getTranslatedString('viewProduct')}</a>`;
                } catch (e) {
                    console.warn(getTranslatedString('invalidUrl'), url);
                    urlLink = `<span>(${getTranslatedString('invalidUrl')})</span>`;
                }
            } else {
                urlLink = `<span>(${getTranslatedString('noUrlProvided')})</span>`;
            }

            perfumeDiv.innerHTML = `
                ${imageElement}
                <h3>${refTienda}</h3>
                <p><strong>${getTranslatedString('labelStore')}</strong> ${tienda}</p>
                <p><strong>${getTranslatedString('labelPrice')}</strong> ${precioDisplay}</p>
                <p><strong>${getTranslatedString('labelGender')}</strong> ${genero}</p>
                <p><strong>${getTranslatedString('labelFormats')}</strong> ${format}</p>
                <p><strong>${getTranslatedString('labelDescription')}</strong></p>
                <div class="description-text">${description}</div>
                <p>${urlLink}</p>
            `;
            resultsDiv.appendChild(perfumeDiv);
        });
    }

    // applyFilterButton.addEventListener('click', () => { // applyFilterButton is now applyFilterButtonEl
    applyFilterButtonEl.addEventListener('click', () => {
        let filteredPerfumes = [...allPerfumesData];

        const minPrice = parseFloat(minPriceInputEl.value); // Use ...El versions
        const maxPrice = parseFloat(maxPriceInputEl.value);
        const selectedStore = storeFilterSelect.value;
        const selectedGender = genderFilterSelect.value;

        if (!isNaN(minPrice)) {
            filteredPerfumes = filteredPerfumes.filter(p => parsePrice(p.Precio) >= minPrice);
        }
        if (!isNaN(maxPrice)) {
            filteredPerfumes = filteredPerfumes.filter(p => parsePrice(p.Precio) <= maxPrice);
        }

        if (selectedStore) {
            filteredPerfumes = filteredPerfumes.filter(p => p.Tienda === selectedStore);
        }

        if (selectedGender) {
            filteredPerfumes = filteredPerfumes.filter(p => p.genero === selectedGender);
        }

        displayPerfumes(filteredPerfumes);
    });

    // clearFilterButton.addEventListener('click', () => { // clearFilterButton is now clearFilterButtonEl
    clearFilterButtonEl.addEventListener('click', () => {
        minPriceInputEl.value = ''; // Use ...El versions
        maxPriceInputEl.value = '';
        storeFilterSelect.value = '';
        genderFilterSelect.value = '';
        displayPerfumes(allPerfumesData);
    });

    // Initialize UI with current language settings
    updateUIText(languageSwitcher.value || browserLang);
});
