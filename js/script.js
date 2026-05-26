// DATEN LADEN aus API
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

// EINSTIEGSPUNKT
// Wartet bis das HTML vollständig geladen ist, dann App starten.
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// HAUPT-INITIALISIERUNG
async function initApp() {

    // --- DOM-Elemente: Karten-Popup (kleines Overlay beim Pin-Klick) ---
    const popupEl = document.getElementById('map-popup');
    const popupImageEl = document.getElementById('map-popup-image');
    const popupTitleEl = document.getElementById('map-popup-title');
    const popupButtonEl = document.getElementById('map-popup-button');
    const popupCloseEl = document.getElementById('map-popup-close');

    // Detail-Karte (grosse Ansicht unterhalb der Karte)
    const detailsCardEl = document.getElementById('details-card');

    // Filter-Elemente
    const categorySelect = document.getElementById('kategorie');
    const priceSelect = document.getElementById('preisbereich');
    const placeButtons = document.querySelectorAll('.indoor-outdoor');

    // Einzelne Felder im Detail-Bereich
    const detailsImageEl = document.getElementById('details-image');
    const detailsTitleEl = document.getElementById('details-title');
    const detailsTeaserEl = document.getElementById('details-teaser');
    const detailsDescriptionEl = document.getElementById('details-description');
    const detailsCategoryEl = document.getElementById('details-category');
    const detailsAddressEl = document.getElementById('details-address');
    const detailsPriceEl = document.getElementById('details-price');
    const detailsPhoneEl = document.getElementById('details-phone');
    const detailsUrlEl = document.getElementById('details-url');

    // --- Daten laden und Typ prüfen ---
    const data = await loadData();
    if (!Array.isArray(data)) {
        console.error('API-Daten sind kein Array:', data);
        return;
    }

    // KARTE INITIALISIEREN aus Leaflet.js
    const map = L.map('map').setView([46.92771791778397, 8.26013878743277], 8);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Standard-Pin
    const defaultPin = L.icon({
        iconUrl: 'img/pin.png',
        iconSize: [16],
        iconAnchor: [8, 16],  // Ankerpunkt: untere Mitte des Pins
        popupAnchor: [0, -16] 
    });

    // Aktiver Pin 
    const activePin = L.icon({
        iconUrl: 'img/pin-aktiv.png',
        iconSize: [16],
        iconAnchor: [8, 16],
        popupAnchor: [0, -16]
    });

    // ZUSTANDSVARIABLEN
    const markers = [];         // Alle erstellten Marker: [{marker, item}, ...]
    let activeMarker = null;    // Aktuell ausgewählter Leaflet-Marker
    let activeItem = null;      // Aktuell ausgewähltes API-Datenobjekt
    let activePlaceFilter = ''; // Aktiver Indoor/Outdoor-Filter ('Indoors' | 'Outdoors' | '')


    //TEXT BEREINIGEN mit Ü Ä Ö

    // Wandelt HTML-Entities um (z.B. &amp; → &, &uuml; → ü)
    function decodeHtml(text = '') {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    // Entfernt alle HTML-Tags und gibt reinen Text zurück
    function stripHtml(html = '') {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    // Kombiniert stripHtml + decodeHtml + normalisiert mehrfache Leerzeichen.
    function decodeAndClean(text = '') {
        return decodeHtml(stripHtml(String(text))).replace(/\s+/g, ' ').trim();
    }

    // HILFSFUNKTIONEN – FELDER AUS API-OBJEKT LESEN

    function getImage(item) {
        return item?.image?.url || item?.photo?.[0]?.url || item?.photo?.url || '';
    }

    function getTitle(item) {
        return decodeAndClean(item?.name?.de || 'Aktivität');
    }

    function getTeaser(item) {
        return decodeAndClean(item?.textTeaser?.de || '');
    }

    function getDescription(item) {
        return decodeAndClean(item?.description?.de || '');
    }

    // Alle Kategorien eines Eintrags als Array zurückgeben.
    // Die API liefert `category` entweder als Array, Objekt oder einfachen String.
    function getAllCategories(item) {

        if (Array.isArray(item.category)) {
            // Format: ["Hikes", "Nature"]
            return item.category.map(cat => decodeAndClean(cat)).filter(Boolean);
        }

        if (typeof item.category === 'object' && item.category !== null) {
            // Format: { "Hikes": true, "Nature": true } → Keys als Kategorienamen
            return Object.keys(item.category).map(cat => decodeAndClean(cat)).filter(Boolean);
        }

        // Format: "Hikes" (einzelner String)
        return [decodeAndClean(item.category)].filter(Boolean);
    }

    // Adresse aus Einzelteilen zusammensetzen (Strasse, PLZ, Ort)
    function getAddress(item) {
        const street = decodeAndClean(item?.address?.streetAddress || '');
        const zip    = decodeAndClean(item?.address?.postalCode || '');
        const city   = decodeAndClean(item?.address?.addressLocality || '');
        return [street, [zip, city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    }

    function getPhone(item) {
        return decodeAndClean(item?.address?.telephone || item?.telephone || '');
    }

    function getUrl(item) {
        return decodeAndClean(item?.address?.url || '');
    }

    function getPlace(item) {
        return decodeAndClean(item?.place || '');
    }

    // Preis als lesbaren String extrahieren.
    // Die API liefert `price` in verschiedenen Formaten: String, HTML-Tabelle oder Objekt.
    function getPrice(item) {
        const rawPrice = item?.price?.de;
        if (!rawPrice) return '';

        if (typeof rawPrice === 'string') {
            // Zuerst direkt bereinigen (funktioniert für einfache Strings)
            const text = decodeAndClean(rawPrice);
            if (text) return text;

            // Falls rawPrice eine HTML-Tabelle enthält: Zellen auslesen
            const temp = document.createElement('div');
            temp.innerHTML = rawPrice;
            const cells = [...temp.querySelectorAll('td, th')]
                .map(el => decodeAndClean(el.textContent))
                .filter(Boolean);
            return cells.join(' – ');
        }

        if (typeof rawPrice === 'object') {
            const values = Object.values(rawPrice)
                .filter(value => value !== null)
                .map(value => decodeAndClean(value))
                .filter(Boolean);
            return values.join(' – ');
        }

        return '';
    }

    // Ersten numerischen Preiswert aus dem Preistext extrahieren.
    function getNumericPrice(item) {
        const priceText = getPrice(item);
        if (!priceText) return null;

        const normalized = priceText
            .replace(/CHF/gi, '')
            .replace(/Fr\./gi, '')

        const match = normalized.match(/\d+(\.\d+)?/);
        if (!match) return null;

        return parseFloat(match[0]);
    }

    // FILTER-LOGIK
    // Prüft ob ein Eintrag zum gewählten Preisbereich passt.
    // Gibt true zurück wenn kein Filter gesetzt ist.
    function matchesPriceRange(item, selectedRange) {
        if (!selectedRange) return true;

        const priceText    = getPrice(item).toLowerCase();
        const numericPrice = getNumericPrice(item);

        if (selectedRange === 'gratis') {
            return priceText.includes('gratis') ||
                   priceText.includes('kostenlos') ||
                   priceText.includes('free') ||
                   numericPrice === 0;
        }

        // Ohne numerischen Wert kann kein Bereichsvergleich gemacht werden
        if (numericPrice === null) return false;

        if (selectedRange === '0-10')   return numericPrice >= 0  && numericPrice <= 10;
        if (selectedRange === '11-35')  return numericPrice >= 11 && numericPrice <= 35;
        if (selectedRange === '36-50')  return numericPrice >= 36 && numericPrice <= 50;
        if (selectedRange === '51-100') return numericPrice >= 51 && numericPrice <= 100;

        return true;
    }

    // MARKER-VERWALTUNG
    // Wechselt den aktiven Marker: alten auf defaultPin zurücksetzen, neuen auf activePin setzen
    function setActiveMarker(marker) {
        if (activeMarker) activeMarker.setIcon(defaultPin);
        activeMarker = marker;
        if (activeMarker) activeMarker.setIcon(activePin);
    }

    //POPUP & DETAILS EIN-/AUSBLENDEN
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

    // Kleine Karten-Popup mit Bild und Titel
    function renderFixedPopup(item) {
        activeItem = item;

        const image = getImage(item);
        const title = getTitle(item);

        popupImageEl.src = image || '';
        popupImageEl.alt = title || '';
        popupTitleEl.textContent = title || '';

        showPopup();
    }

    // Befüllt alle Felder des grossen Detail-Bereichs und blendet ihn ein
    function updateDetails(item) {
        console.log('updateDetails aufgerufen', item);
        const image = getImage(item);
        const title = getTitle(item);
        const teaser = getTeaser(item);
        const description = getDescription(item);
        const address = getAddress(item);
        const phone = getPhone(item);
        const url = getUrl(item);
        const price = getPrice(item);

        detailsImageEl.src = image || '';
        detailsImageEl.alt = title || '';

        detailsTitleEl.textContent = title || '';
        detailsTeaserEl.textContent = teaser || '';
        detailsDescriptionEl.textContent = description || '';

        const allCategories = getAllCategories(item)
            .filter(cat => categoryTranslations[cat])
            .map(cat => categoryTranslations[cat]);
        detailsCategoryEl.textContent = allCategories.length ? `Kategorie: ${allCategories.join(', ')}` : '';
        detailsAddressEl.textContent = address ? `${address}`   : '';
        detailsPriceEl.textContent = price ? ` ${price}`       : 'Keine Angabe vorhanden';
        detailsPhoneEl.textContent = phone ? ` ${phone}` : '';
        detailsUrlEl.textContent   = url   ? ` ${url}` : '';

        showDetails();
    }

    // Kategorien für Detail-Ansicht übersetzen 
    const categoryTranslations = {
        'Attractions': 'Attraktionen',
        'Climbing': 'Klettern',
        'Hikes': 'Wanderungen',
        'Motor Boat Hire': 'Motorbootverleih',
        'Mountain Biking': 'Mountainbiken',
        'Nature': 'Natur',
        'SkiingSnowboarding': 'Schneesport',
        'Sport': 'Sport',
        'SUP Stand Up Paddling': 'Stand-up-Paddling',
        'Vantage Points': 'Aussichtspunkte',
        'Walks': 'Spaziergänge',
        'Water': 'Wasser',
        'WaterskiingWakeboarding': 'Wasserski',
        'Wellness': 'Wellness',
    }

    // Setzt die gesamte Auswahl zurück: Popup + Details schliessen, aktiven Marker deaktivieren
    function clearSelection() {
        hidePopup();
        hideDetails();

        if (activeMarker) activeMarker.setIcon(defaultPin);
        activeMarker = null;
        activeItem   = null;
    }


    // FILTER ANWENDEN
    // Wird bei jeder Filteränderung aufgerufen.
    // Zeigt oder versteckt jeden Marker je nach Kategorie, Ort und Preis.
    // Passt danach den Kartenausschnitt auf die sichtbaren Marker an.
    function applyFilters() {
        const selectedCategory = categorySelect?.value || '';
        const selectedPrice    = priceSelect?.value || '';

        markers.forEach(({ marker, item }) => {
            const categories = getAllCategories(item);
            const place = getPlace(item);

            const matchesCategory = !selectedCategory || categories.includes(selectedCategory);
            const matchesPlace    = !activePlaceFilter || place === activePlaceFilter;
            const matchesPrice    = matchesPriceRange(item, selectedPrice);

            const shouldShow = matchesCategory && matchesPlace && matchesPrice;

            // Marker hinzufügen oder entfernen je nach Filterergebnis
            if (shouldShow) {
                if (!map.hasLayer(marker)) marker.addTo(map);
            } else {
                if (map.hasLayer(marker)) map.removeLayer(marker);
            }
        });

        // Karte auf alle sichtbaren Marker zoomen
        const visibleMarkers = markers
            .filter(({ marker }) => map.hasLayer(marker))
            .map(({ marker }) => marker);

        if (visibleMarkers.length) {
            const group = L.featureGroup(visibleMarkers);
            map.fitBounds(group.getBounds(), { padding: [40, 40] });
        }

        // Falls der aktuell ausgewählte Eintrag durch den Filter ausgeblendet wird → Auswahl aufheben
        if (activeItem) {
            const activeEntry = markers.find(entry => entry.item === activeItem);
            if (!activeEntry || !map.hasLayer(activeEntry.marker)) {
                clearSelection();
            }
        }
    }

    // EVENT LISTENERS
    // "Erfahre mehr"-Button im Popup: Details befüllen und zur Detail-Sektion scrollen
    popupButtonEl?.addEventListener('click', () => {
        if (!activeItem) return;
        updateDetails(activeItem);
        document.getElementById('details')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    });

    // Schliessen-Button (×) im Popup
    popupCloseEl?.addEventListener('click', () => {
        clearSelection();
    });

    // Kategorie- und Preis-Dropdowns
    categorySelect?.addEventListener('change', applyFilters);
    priceSelect?.addEventListener('change', applyFilters);

    // Indoor/Outdoor-Buttons (Toggle: nochmals klicken deaktiviert den Filter)
    placeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const selectedPlace = button.dataset.place;

            if (activePlaceFilter === selectedPlace) {
                // Bereits aktiver Filter → ausschalten
                activePlaceFilter = '';
                button.classList.remove('is-active');
            } else {
                // Neuen Filter setzen, alle anderen Buttons deaktivieren
                activePlaceFilter = selectedPlace;
                placeButtons.forEach(btn => btn.classList.remove('is-active'));
                button.classList.add('is-active');
            }

            applyFilters();
        });
    });

    // INITIALER ZUSTAND
    // Popup und Details beim Start ausblenden
    hideDetails();
    hidePopup();

    // MARKER AUS API-DATEN ERSTELLEN
    data.forEach(item => {
        const lat = item?.geoCoordinates?.latitude;
        const lng = item?.geoCoordinates?.longitude;

        // Einträge ohne gültige Koordinaten überspringen
        if (!lat || !lng) return;

        // Marker auf der Karte platzieren
        const marker = L.marker([lat, lng], { icon: defaultPin }).addTo(map);

        // Klick auf Marker: Pin aktivieren, Popup und Details befüllen
        marker.on('click', () => {
            setActiveMarker(marker);
            renderFixedPopup(item);
            updateDetails(item);
        });

        markers.push({ marker, item });
    });

    // Initiale Kartenansicht auf alle Marker einpassen
    if (markers.length) {
        const group = L.featureGroup(markers.map(entry => entry.marker));
        map.fitBounds(group.getBounds(), { padding: [40, 40] });
    }
}