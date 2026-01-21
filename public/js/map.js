// === MAPLIBRE GL JS (CLICK & ROUTING FIX) ===

// PUNE CHEIA AICI
const API_KEY = '7GsswGN4WfdFNk3pJAeV'; 

window.map = null;
let guardianMarker = null;
let targetMarker = null;
let destinationMarker = null; // Marker nou pentru destinația aleasă

const STYLE_DARK = `https://api.maptiler.com/maps/ch-swisstopo-lbm-dark/style.json?key=${API_KEY}`; 
const STYLE_SAT = `https://api.maptiler.com/maps/satellite/style.json?key=${API_KEY}`;

// --- RESETARE ---
function resetMapGlobals() {
    if (window.map) {
        window.map.remove();
        window.map = null;
    }
    guardianMarker = null;
    targetMarker = null;
    destinationMarker = null;
    console.log("🧹 Map cleaned.");
}

// 1. SAFETY MAP (Aici facem setarea destinației)
window.openCommunityMap = function() {
    setupUI('Safe Navigation');
    
    setTimeout(() => {
        resetMapGlobals();

        window.map = new maplibregl.Map({
            container: 'map',
            style: STYLE_DARK, 
            center: [27.6014, 47.1585], // Iași
            zoom: 15,
            pitch: 45,
            attributionControl: false
        });

        window.map.addControl(new maplibregl.NavigationControl(), 'top-right');

        window.map.on('load', () => {
            window.map.resize(); 
            loadHazards();
            locateUser((lat, lng) => {
                updateMyMarker(lat, lng);
                window.map.flyTo({ center: [lng, lat], zoom: 16 });
            });
        });
        

        // --- ASCULTĂTORUL DE CLICK (CRITIC) ---
        window.map.on('click', (e) => {
            const clickedLat = e.lngLat.lat;
            const clickedLng = e.lngLat.lng;

            console.log("🖱️ Map Clicked:", clickedLat, clickedLng);

            // Verificăm dacă știm unde suntem noi (punctul de start)
            if (!window.userLat || !window.userLng) {
                alert("Waiting for your GPS location...");
                locateUser((lat, lng) => updateMyMarker(lat, lng));
                return;
            }

            // Dacă suntem în modul de setare Escortă sau doar explorăm
            if (!window.isEscortActive) {
                // 1. Punem un pin unde am dat click
                updateDestinationMarker(clickedLat, clickedLng);

                // 2. Calculăm ruta
                drawRoute(
                    [window.userLng, window.userLat], 
                    [clickedLng, clickedLat], 
                    'walking'
                );
            }
        });

    }, 200);
}

// 2. WATCHER MODE
window.startWatchingMode = function(targetUserId) {
    setupUI('LIVE TRACKING', '#ec4899');
    document.getElementById('route-controls').classList.add('hidden');

    setTimeout(() => {
        resetMapGlobals();
        window.map = new maplibregl.Map({
            container: 'map',
            style: STYLE_DARK,
            center: [27.6014, 47.1585], 
            zoom: 14,
            pitch: 0,
            attributionControl: false
        });

        window.map.on('load', () => window.map.resize());

        if(window.socket) {
            console.log("👀 JOINING ROOM:", targetUserId);
            window.socket.emit('join_watch_room', targetUserId);

            window.socket.on('update_target_location', (data) => {
                const lat = parseFloat(data.lat);
                const lng = parseFloat(data.lng);
                
                if (!window.map) return;

                if (!targetMarker) {
                    const el = document.createElement('div');
                    el.className = 'victim-marker'; 
                    // Stiluri inline backup
                    el.style.width = '24px'; el.style.height = '24px';
                    el.style.backgroundColor = '#ef4444'; el.style.borderRadius = '50%';
                    el.style.border = '4px solid white'; el.style.boxShadow = '0 0 20px #ef4444';

                    targetMarker = new maplibregl.Marker({ element: el })
                        .setLngLat([lng, lat]) 
                        .addTo(window.map);
                } else {
                    targetMarker.setLngLat([lng, lat]);
                }
                
                window.map.flyTo({ center: [lng, lat], speed: 0.5 });
            });
        }
    }, 200);
}

// 3. RESCUE MISSION
window.startRescueMission = function(victimLat, victimLng) {
    setupUI('🚨 RESCUE MISSION', '#ef4444');
    document.getElementById('route-controls').classList.add('hidden');

    setTimeout(() => {
        resetMapGlobals();
        window.map = new maplibregl.Map({
            container: 'map',
            style: STYLE_SAT, 
            center: [victimLng, victimLat],
            zoom: 16,
            pitch: 0
        });

        window.map.on('load', () => {
            window.map.resize();
            
            // Marker Victimă
            const el = document.createElement('div');
            el.style.width = '24px'; el.style.height = '24px';
            el.style.backgroundColor = 'red'; el.style.borderRadius = '50%'; el.style.border = '4px solid white';
            
            targetMarker = new maplibregl.Marker({ element: el })
                .setLngLat([victimLng, victimLat])
                .addTo(window.map);

            locateUser((myLat, myLng) => {
                updateMyMarker(myLat, myLng);
                drawRoute([myLng, myLat], [victimLng, victimLat], 'driving');
            });
        });
    }, 200);
}

// --- LOGICA RUTARE (OSRM) ---
async function drawRoute(start, end, profile) {
    // start/end sunt [lng, lat]
    const osrmProfile = profile === 'walking' ? 'foot' : 'car';
    const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;
    
    try {
        const res = await fetch(url);
        const json = await res.json();
        
        if (!json.routes || json.routes.length === 0) return;
        
        const routeData = json.routes[0];
        const durationSeconds = routeData.duration; // Durata în secunde

        // 1. Desenăm linia pe hartă
        if (window.map.getSource('route')) {
            window.map.getSource('route').setData(routeData.geometry);
        } else {
            window.map.addSource('route', {
                'type': 'geojson',
                'data': { 'type': 'Feature', 'properties': {}, 'geometry': routeData.geometry }
            });
            window.map.addLayer({
                'id': 'route',
                'type': 'line',
                'source': 'route',
                'layout': { 'line-join': 'round', 'line-cap': 'round' },
                'paint': {
                    'line-color': profile === 'walking' ? '#3b82f6' : '#ef4444',
                    'line-width': 6,
                    'line-opacity': 0.8
                }
            });
        }

        // 2. IMPORTANT: Trimitem datele înapoi la Escort UI
        // Verificăm dacă suntem în modul de setare (flag-ul din escort.js)
        if (window.isEscortSetupMode && window.virtualEscort) {
            console.log("✅ Sending estimates to Escort Module:", durationSeconds);
            window.virtualEscort.updateEstimates(durationSeconds, { lat: end[1], lng: end[0] });
        }

    } catch (e) { console.error("Routing error:", e); }
}

// --- HELPERS ---

function updateMyMarker(lat, lng) {
    window.userLat = lat;
    window.userLng = lng;
    
    if (!guardianMarker) {
        const el = document.createElement('div');
        el.className = 'guardian-marker';
        el.style.width = '20px'; el.style.height = '20px';
        el.style.backgroundColor = '#3b82f6'; 
        el.style.borderRadius = '50%'; el.style.border = '3px solid white';
        
        guardianMarker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(window.map);
    } else {
        guardianMarker.setLngLat([lng, lat]);
    }
}

// Funcție nouă pentru a pune un pin unde dai click
function updateDestinationMarker(lat, lng) {
    if (!destinationMarker) {
        const el = document.createElement('div');
        el.innerHTML = '<i class="ph-fill ph-flag-checkered" style="color:#ec4899; font-size:24px;"></i>';
        destinationMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lng, lat])
            .addTo(window.map);
    } else {
        destinationMarker.setLngLat([lng, lat]);
    }
}

function setupUI(text, color) {
    const overlay = document.getElementById('map-overlay');
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    document.getElementById('route-controls').classList.remove('hidden');
    const t = document.getElementById('map-title');
    if(t) { t.innerHTML = text; if(color) t.style.color = color; }
}

function locateUser(cb) {
    if(!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;
        cb(window.userLat, window.userLng);
    });
}

window.closeMap = function() { 
    document.getElementById('map-overlay').style.display = 'none';
    if(window.location.search.includes('watch') || document.getElementById('map-title').innerText.includes("LIVE")) {
        window.location.reload();
    }
}

// ==========================================
// 4. HAZARD REPORTING (LIPSEA)
// ==========================================
// ==========================================
// 4. HAZARD REPORTING (FINAL)
// ==========================================

window.reportCurrentLocationHazard = async function() {
    // 1. Verificăm locația
    if (!window.userLat || !window.userLng) {
        alert("Waiting for GPS...");
        locateUser((lat, lng) => {
            window.userLat = lat;
            window.userLng = lng;
        });
        return;
    }

    // 2. Userul alege tipul
    const type = prompt("REPORT HAZARD:\nType one: DARK, ACCIDENT, CROWD, ANIMAL");
    if (!type) return; 

    const validTypes = ['DARK', 'ACCIDENT', 'CROWD', 'ANIMAL', 'ICE', 'OTHER'];
    const finalType = type.toUpperCase(); // Facem textul mare automat

    // 3. Adăugăm vizual pe hartă (Instant Feedback)
    const el = document.createElement('div');
    el.innerHTML = '<i class="ph-fill ph-warning-octagon" style="color:#f59e0b; font-size:24px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);"></i>';
    
    new maplibregl.Marker({ element: el })
        .setLngLat([window.userLng, window.userLat])
        .setPopup(new maplibregl.Popup().setHTML(`<b>${finalType}</b><br>Just reported`))
        .addTo(window.map);

    // 4. TRIMITEM LA SERVER (Aceasta parte lipsea/era comentată)
    const token = localStorage.getItem("nightguard_token");
    
    try {
        const response = await fetch('/api/iot/report', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Critic: trebuie să fim logați
            },
            body: JSON.stringify({
                type: finalType,
                description: "User reported via Live Map",
                latitude: window.userLat,
                longitude: window.userLng
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log("✅ Hazard saved to DB:", result);
            alert(`Hazard "${finalType}" reported successfully!`);
        } else {
            console.error("❌ Failed to save:", result);
            alert("Error saving report. Check console.");
        }

    } catch(e) { 
        console.error("❌ Network Error:", e); 
        alert("Server connection failed.");
    }
};

// Funcție pentru a încărca pericolele existente
async function loadHazards() {
    const token = localStorage.getItem("nightguard_token");
    console.log("🔄 Loading hazards from DB..."); // Debug

    try {
        const res = await fetch('/api/iot/safety-map', { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await res.json();
        
        console.log("📦 Hazards Received:", data.hazards); // Vezi aici dacă primești datele

        if(data.hazards && window.map) {
            data.hazards.forEach(h => {
                // 1. Creăm elementul vizual
                const el = document.createElement('div');
                el.className = 'hazard-marker'; // Folosim o clasă CSS
                el.innerHTML = '<i class="ph-fill ph-warning-octagon" style="color:#f59e0b; font-size:24px;"></i>';
                el.style.width = '24px';
                el.style.height = '24px';
                el.style.cursor = 'pointer';

                // 2. CONVERTIM COORDONATELE (Critic!)
                const lat = parseFloat(h.latitude);
                const lng = parseFloat(h.longitude);

                // 3. Adăugăm pe hartă
                new maplibregl.Marker({ element: el })
                    .setLngLat([lng, lat]) // MapLibre vrea [Lng, Lat]
                    .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
                        <div style="text-align:center;">
                            <b style="color:#f59e0b">${h.type}</b><br>
                            <span style="font-size:12px; color:#666;">${h.description || ''}</span>
                        </div>
                    `))
                    .addTo(window.map);
            });
        }
    } catch(e) { 
        console.error("❌ Error loading hazards:", e); 
    }
}