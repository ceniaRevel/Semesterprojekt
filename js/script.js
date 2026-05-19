async function loadData() {
    const url = 'https://www.zuerich.com/en/api/v2/data?id=97';

    try {
        const response = await fetch(url);
        const json = await response.json();
        return json;
    } catch (error) {
        console.error('Fehler beim Laden der API-Daten:', error);
        return [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    const popupEl = document.getElementById('map-popup');
    const popupImageEl = document.getElementById('map-popup-image');
    const popupTitleEl = document.getElementById('map-popup-title');
    const popupButtonEl = document.getElementById('map-popup-button');
    const popupCloseEl = document.getElementById('map-popup-close');
    const detailsCardEl = document.getElementById('details-card');

    const categorySelect = document.getElementById('kategorie');
    const priceSelect = document.getElementById('preisbereich');
    const placeButtons = document.querySelectorAll('.indoor-outdoor');

    const detailsImageEl = document.getElementById('details-image');
    const detailsTitleEl = document.getElementById('details-title');
    const detailsTeaserEl = document.getElementById('details-teaser');
    const detailsDescriptionEl = document.getElementById('details-description');
    const detailsCategoryEl = document.getElementById('details-category');
    const detailsAddressEl = document.getElementById('details-address');
    const detailsPriceEl = document.getElementById('details-price');
    const detailsPhoneEl = document.getElementById('details-phone');
    const detailsUrlEl = document.getElementById('details-url');

    const data = await loadData();
    if (!Array.isArray(data)) {
        console.error('API-Daten sind kein Array:', data);
        return;
    }

    const map = L.map('map').setView([46.92771791778397, 8.26013878743277], 7.5);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const defaultPin = L.icon({
        iconUrl: 'img/pin.png',
        iconSize: [16],
        iconAnchor: [8, 16],
        popupAnchor: [0, -16]
    });

    const activePin = L.icon({
        iconUrl: 'img/pin-aktiv.png',
        iconSize: [16],
        iconAnchor: [8, 16],
        popupAnchor: [0, -16]
    });

    const markers = [];
    let activeMarker = null;
    let activeItem = null;
    let activePlaceFilter = '';

    function decodeHtml(text = '') {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    function stripHtml(html = '') {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    function decodeAndClean(text = '') {
        return decodeHtml(stripHtml(String(text))).replace(/\s+/g, ' ').trim();
    }

    function getImage(item) {
        return item?.image?.url || item?.photo?.[0]?.url || item?.photo?.url || '';
    }

    function getTitle(item) {
        return decodeAndClean(item?.name?.de || item?.name?.en || 'Aktivität');
    }

    function getTeaser(item) {
        return decodeAndClean(item?.textTeaser?.de || item?.textTeaser?.en || '');
    }

    function getDescription(item) {
        return decodeAndClean(item?.description?.de || item?.description?.en || '');
    }

    function getAllCategories(item) {
        if (Array.isArray(item?.category)) {
            return item.category.map(cat => decodeAndClean(cat)).filter(Boolean);
        }
        if (item?.category) {
            return [decodeAndClean(item.category)];
        }
        return [];
    }

    function getCategory(item) {
        const categories = getAllCategories(item);
        return categories[0] || '';
    }

    function getAddress(item) {
        const street = decodeAndClean(item?.address?.streetAddress || '');
        const zip = decodeAndClean(item?.address?.postalCode || '');
        const city = decodeAndClean(item?.address?.addressLocality || '');
        return [street, [zip, city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    }

    function getPhone(item) {
        return decodeAndClean(item?.telephone || '');
    }

    function getUrl(item) {
        return decodeAndClean(item?.url || '');
    }

    function getPlace(item) {
        return decodeAndClean(item?.place || '');
    }

    function getPrice(item) {
        const rawPrice = item?.price?.de || item?.price?.en || item?.price || '';
        if (!rawPrice) return '';

        if (typeof rawPrice === 'string') {
            const text = decodeAndClean(rawPrice);
            if (text) return text;

            const temp = document.createElement('div');
            temp.innerHTML = rawPrice;

            const cells = [...temp.querySelectorAll('td, th')]
                .map(el => decodeAndClean(el.textContent))
                .filter(Boolean);

            return cells.join(' – ');
        }

        if (typeof rawPrice === 'object') {
            const values = Object.values(rawPrice)
                .map(value => decodeAndClean(value))
                .filter(Boolean);

            return values.join(' – ');
        }

        return '';
    }

    function getNumericPrice(item) {
        const priceText = getPrice(item);
        if (!priceText) return null;

        const normalized = priceText
            .replace(/CHF/gi, '')
            .replace(/Fr\./gi, '')
            .replace(',', '.');

        const match = normalized.match(/\d+(\.\d+)?/);
        if (!match) return null;

        return parseFloat(match[0]);
    }

    function normalizeCategory(category) {
        if (category === 'Schneesport') return 'SkiingSnowboarding';
        if (category === 'SUP') return 'SUP Stand Up Paddling';
        if (category === 'Waterskiing') return 'WaterskiingWakeboarding';
        return category;
    }

    function matchesPriceRange(item, selectedRange) {
        if (!selectedRange) return true;

        const priceText = getPrice(item).toLowerCase();
        const numericPrice = getNumericPrice(item);

        if (selectedRange === 'gratis') {
            return priceText.includes('gratis') ||
                priceText.includes('kostenlos') ||
                priceText.includes('free') ||
                numericPrice === 0;
        }

        if (numericPrice === null) return false;

        if (selectedRange === '0-10') return numericPrice >= 0 && numericPrice <= 10;
        if (selectedRange === '11-35') return numericPrice >= 11 && numericPrice <= 35;
        if (selectedRange === '36-50') return numericPrice >= 36 && numericPrice <= 50;
        if (selectedRange === '51-100') return numericPrice >= 51 && numericPrice <= 100;
        if (selectedRange === '101-plus') return numericPrice > 100;

        return true;
    }

    function createPhoneLink(phone) {
        if (!phone) return '';
        const href = phone.replace(/[^\d+]/g, '');
        return `<a href="tel:${href}">${phone}</a>`;
    }

    function createWebsiteLink(url) {
        if (!url) return '';
        const safeUrl = url.startsWith('http') ? url : `https://${url}`;
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    }

    function setActiveMarker(marker) {
        if (activeMarker) activeMarker.setIcon(defaultPin);
        activeMarker = marker;
        if (activeMarker) activeMarker.setIcon(activePin);
    }

    function hideDetails() {
        if (detailsCardEl) detailsCardEl.classList.add('is-hidden');
    }

    function showDetails() {
        if (detailsCardEl) detailsCardEl.classList.remove('is-hidden');
    }

    function hidePopup() {
        popupEl.classList.add('is-hidden');
    }

    function showPopup() {
        popupEl.classList.remove('is-hidden');
    }

    function renderFixedPopup(item) {
        activeItem = item;

        const image = getImage(item);
        const title = getTitle(item);

        popupImageEl.src = image || '';
        popupImageEl.alt = title || '';
        popupTitleEl.textContent = title || '';

        showPopup();
    }

    function updateDetails(item) {
        const image = getImage(item);
        const title = getTitle(item);
        const teaser = getTeaser(item);
        const description = getDescription(item);
        const category = getCategory(item);
        const address = getAddress(item);
        const phone = getPhone(item);
        const url = getUrl(item);
        const price = getPrice(item);

        detailsImageEl.src = image || '';
        detailsImageEl.alt = title || '';

        detailsTitleEl.textContent = title || '';
        detailsTeaserEl.textContent = teaser || '';
        detailsDescriptionEl.textContent = description || '';

        detailsCategoryEl.textContent = category ? `Kategorie: ${category}` : '';
        detailsAddressEl.textContent = address ? `Adresse: ${address}` : '';
        detailsPriceEl.textContent = price ? `Preis: ${price}` : '';
        detailsPhoneEl.innerHTML = phone ? `Telefon: ${createPhoneLink(phone)}` : '';
        detailsUrlEl.innerHTML = url ? `Webadresse: ${createWebsiteLink(url)}` : '';

        showDetails();
    }

    function clearSelection() {
        hidePopup();
        hideDetails();

        if (activeMarker) activeMarker.setIcon(defaultPin);
        activeMarker = null;
        activeItem = null;
    }

    function applyFilters() {
        const selectedCategory = normalizeCategory(categorySelect?.value || '');
        const selectedPrice = priceSelect?.value || '';

        markers.forEach(entry => {
            const { marker, item } = entry;

            const categories = getAllCategories(item);
            const place = getPlace(item);

            const matchesCategory = !selectedCategory || categories.includes(selectedCategory);
            const matchesPlace = !activePlaceFilter || place === activePlaceFilter;
            const matchesPrice = matchesPriceRange(item, selectedPrice);

            const shouldShow = matchesCategory && matchesPlace && matchesPrice;

            if (shouldShow) {
                if (!map.hasLayer(marker)) marker.addTo(map);
            } else {
                if (map.hasLayer(marker)) map.removeLayer(marker);
            }
        });

        const visibleMarkers = markers
            .filter(entry => map.hasLayer(entry.marker))
            .map(entry => entry.marker);

        if (visibleMarkers.length) {
            const group = L.featureGroup(visibleMarkers);
            map.fitBounds(group.getBounds(), { padding: [40, 40] });
        }

        if (activeItem) {
            const activeEntry = markers.find(entry => entry.item === activeItem);
            if (!activeEntry || !map.hasLayer(activeEntry.marker)) {
                clearSelection();
            }
        }
    }

    popupButtonEl?.addEventListener('click', () => {
        if (!activeItem) return;
        updateDetails(activeItem);
        document.getElementById('details')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    });

    popupCloseEl?.addEventListener('click', () => {
        clearSelection();
    });

    categorySelect?.addEventListener('change', applyFilters);
    priceSelect?.addEventListener('change', applyFilters);

    placeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const selectedPlace = button.dataset.place;

            if (activePlaceFilter === selectedPlace) {
                activePlaceFilter = '';
                button.classList.remove('is-active');
            } else {
                activePlaceFilter = selectedPlace;
                placeButtons.forEach(btn => btn.classList.remove('is-active'));
                button.classList.add('is-active');
            }

            applyFilters();
        });
    });

    hideDetails();
    hidePopup();

    data.forEach(item => {
        const lat = item?.geoCoordinates?.latitude;
        const lng = item?.geoCoordinates?.longitude;

        if (!lat || !lng) return;

        const marker = L.marker([lat, lng], { icon: defaultPin }).addTo(map);

        marker.on('click', () => {
            setActiveMarker(marker);
            renderFixedPopup(item);
            updateDetails(item);
        });

        markers.push({ marker, item });
    });

    if (markers.length) {
        const group = L.featureGroup(markers.map(entry => entry.marker));
        map.fitBounds(group.getBounds(), { padding: [40, 40] });
    }
}

