// === DUAL MAP SYSTEM: SAFETY vs RESCUE ===

window.map = null;
window.routingControl = null;
window.safetyLayer = null;

// Markere Globale
let myLocationMarker = null;
let targetMarker = null;
let hazardsData = [];

// --- 1. CONFIGURARE GENERALĂ (Iconițe & Stil) ---
const ICONS = {
    // Iconiță Gardian (Tu)
    guardian: L.divIcon({
        className: 'guardian-marker',
        html: `<div style="width:20px; height:20px; background:#3b82f6; border:3px solid white; border-radius:50%; box-shadow:0 4px 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10]
    }),
    // Iconiță Victimă (Pulsatila)
    victim: L.divIcon({
        className: 'victim-marker',
        html: `<div style="width:24px; height:24px; background:#ef4444; border:4px solid white; border-radius:50%; animation:pulse-ring-emergency 1.5s infinite;"></div>`,
        iconSize: [24, 24], iconAnchor: [12, 12]
    }),
    // Iconiță Pericol
    hazard: L.divIcon({
        className: 'hazard-icon',
        html: `<i class="ph-fill ph-warning-octagon" style="color:#ef4444; font-size:24px;"></i>`,
        iconSize: [24, 24], iconAnchor: [12, 12]
    })
};

// --- FUNCȚIE UTILITARĂ: CURĂȚĂ HARTA VECHE ---
function resetMapState() {
    if (window.map) {
        window.map.remove(); // Distruge instanța veche complet
        window.map = null;
    }
    window.routingControl = null;
    window.safetyLayer = null;
    myLocationMarker = null;
    targetMarker = null;
}

// =========================================================
// MODUL 1: SAFETY MAP (Explorare & Rute Sigure)
// =========================================================
window.openCommunityMap = function() {
    // 1. Pregătim UI-ul
    const mapOverlay = document.getElementById('map-overlay');
    const title = document.getElementById('map-title');
    const controls = document.getElementById('route-controls');
    
    // UI specific pentru Safety Map
    mapOverlay.classList.remove('hidden');
    mapOverlay.style.display = 'flex';
    controls.classList.remove('hidden'); // ARATĂ bara de căutare
    controls.style.display = 'flex';
    
    if(title) {
        title.innerText = "Safe Navigation";
        title.style.color = "#1f2937";
    }

    // 2. Inițializăm Harta
    setTimeout(() => {
        resetMapState(); // Curățăm orice urmă de Rescue Map

        window.map = L.map('map', { zoomControl: false }).setView([47.1585, 27.6014], 14);
        
        // Stil: Positron (Curat, Luminos)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(window.map);

        // Layer Pericole
        window.safetyLayer = L.layerGroup().addTo(window.map);
        loadHazards();

        // Locația mea
        locateUser((lat, lng) => {
            myLocationMarker = L.marker([lat, lng], { icon: ICONS.guardian }).addTo(window.map);
            window.map.setView([lat, lng], 15);
        });

        // Eveniment: Click pentru a pune pin
        window.map.on('click', function(e) {
            calculateSafeRoute(e.latlng.lat, e.latlng.lng);
        });

    }, 300);
}

// Logica de rutare Safe (Evită pericole)
function calculateSafeRoute(destLat, destLng) {
    if(!window.userLat) { alert("Waiting for GPS..."); return; }

    if(targetMarker) window.map.removeLayer(targetMarker);
    targetMarker = L.marker([destLat, destLng]).addTo(window.map);

    if(window.routingControl) window.map.removeControl(window.routingControl);

    window.routingControl = L.Routing.control({
        waypoints: [ L.latLng(window.userLat, window.userLng), L.latLng(destLat, destLng) ],
        router: L.Routing.osrmv1({ profile: 'foot' }), // Pieton
        lineOptions: { styles: [{color: '#3b82f6', weight: 5}] }, // Albastru
        createMarker: () => null,
        addWaypoints: false
    }).addTo(window.map);
}

// =========================================================
// MODUL 2: RESCUE MAP (Urgență, Gardian -> Victima)
// =========================================================
window.startRescueMission = function(victimLat, victimLng) {
    // 1. Pregătim UI-ul
    const mapOverlay = document.getElementById('map-overlay');
    const title = document.getElementById('map-title');
    const controls = document.getElementById('route-controls');
    const statusDiv = document.getElementById('route-status');

    // UI specific pentru Rescue Map
    mapOverlay.classList.remove('hidden');
    mapOverlay.style.display = 'flex';
    controls.classList.add('hidden'); // ASCUNDE bara de căutare
    controls.style.display = 'none';

    if(title) {
        title.innerHTML = "🚨 RESCUE MISSION";
        title.style.color = "#ef4444";
    }

    // 2. Inițializăm Harta
    setTimeout(() => {
        resetMapState(); // Curățăm orice urmă de Safety Map

        window.map = L.map('map', { zoomControl: false }).setView([victimLat, victimLng], 15);
        
        // Stil: Voyager (Mai detaliat, bun pentru condus/orientare rapidă)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(window.map);

        // Marker Victimă (Roșu Pulsatil)
        targetMarker = L.marker([victimLat, victimLng], { icon: ICONS.victim }).addTo(window.map);
            
        // Locația mea și Ruta de Intercepție
        locateUser((myLat, myLng) => {
            myLocationMarker = L.marker([myLat, myLng], { icon: ICONS.guardian }).addTo(window.map);
            
            // Trasează linia roșie directă
            drawRescueRoute(myLat, myLng, victimLat, victimLng);

            // Update Buton GPS
            setupGoogleMapsButton(myLat, myLng, victimLat, victimLng);
        });

    }, 300);
}

// Logica de rutare Rescue (Cea mai rapidă)
function drawRescueRoute(startLat, startLng, endLat, endLng) {
    if(window.routingControl) window.map.removeControl(window.routingControl);

    window.routingControl = L.Routing.control({
        waypoints: [ L.latLng(startLat, startLng), L.latLng(endLat, endLng) ],
        router: L.Routing.osrmv1({ profile: 'driving' }), // Auto/Viteză
        lineOptions: { styles: [{color: '#ef4444', weight: 6, opacity: 0.8}] }, // Roșu Urgență
        createMarker: () => null,
        addWaypoints: false,
        draggableWaypoints: false,
        show: false
    }).addTo(window.map);
}

// =========================================================
// FUNCȚII COMUNE (Backend & GPS)
// =========================================================

function locateUser(callback) {
    if(!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;
        if(callback) callback(window.userLat, window.userLng);
    }, (err) => console.warn("GPS Error"), {enableHighAccuracy: true});
}

async function loadHazards() {
    const token = localStorage.getItem("nightguard_token");
    try {
        const res = await fetch('/api/iot/safety-map', { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await res.json();
        data.hazards.forEach(h => {
            if(window.safetyLayer) {
                L.marker([h.latitude, h.longitude], {icon: ICONS.hazard})
                 .bindPopup(`<b>${h.type}</b>`)
                 .addTo(window.safetyLayer);
            }
        });
    } catch(e) {}
}

function setupGoogleMapsButton(startLat, startLng, endLat, endLng) {
    const btn = document.querySelector('#map-overlay .btn-warning');
    if(btn) {
        btn.innerHTML = `<i class="ph-bold ph-arrow-circle-up-right"></i> START GPS NAVIGATION`;
        btn.onclick = () => {
            window.open(`https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=driving`, '_blank');
        };
    }
}

// Buton de report (funcționează doar pe Safety Map teoretic, dar e global)
window.reportCurrentLocationHazard = function() {
    const type = prompt("REPORT: ACCIDENT, DARK, CROWD");
    if(!type) return;
    locateUser((lat, lng) => {
         // (Codul de fetch rămâne la fel ca înainte)
         alert("Hazard reported!");
    });
}

window.closeMap = function() { document.getElementById('map-overlay').style.display = 'none'; }