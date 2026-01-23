const API_KEY = '7GsswGN4WfdFNk3pJAeV'; 

window.map = null;
let guardianMarker = null;
let targetMarker = null;
let destinationMarker = null; 

const STYLE_DARK = `https://api.maptiler.com/maps/ch-swisstopo-lbm-dark/style.json?key=${API_KEY}`; 
const STYLE_SAT = `https://api.maptiler.com/maps/satellite/style.json?key=${API_KEY}`;

// RESETARE 
function resetMapGlobals() {
    // Stop location tracking
    stopLocationTracking();
    
    if (window.map) {
        window.map.remove();
        window.map = null;
    }
    guardianMarker = null;
    targetMarker = null;
    destinationMarker = null;
    
    // Clear custom start location
    window.customStartLat = null;
    window.customStartLng = null;
    if (window.routeStartMarker) {
        window.routeStartMarker.remove();
        window.routeStartMarker = null;
    }
}

// 1. SAFETY MAP 
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
            
            // Get user location first, then setup search
            updateRouteStatus("📍 Getting your location...");
            locateUser((lat, lng) => {
                updateMyMarker(lat, lng);
                window.map.flyTo({ center: [lng, lat], zoom: 16 });
                updateRouteStatus("✓ Location found. Enter destination or tap map.");
                
                //continuous location tracking
                startLocationTracking();
                
                reverseGeocode(lng, lat).then(placeName => {
                    const routeStartInput = document.getElementById('route-start');
                    if (routeStartInput && placeName) {
                        routeStartInput.value = placeName;
                    } else if (routeStartInput) {
                        routeStartInput.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    }
                });
            }, (error) => {
                console.error("Location error:", error);
                updateRouteStatus("⚠️ Location access denied. Click 'My Location' to try again.");
                
                // My Location field clickable 
                const routeStartInput = document.getElementById('route-start');
                if (routeStartInput) {
                    routeStartInput.value = "Tap to get location";
                    routeStartInput.style.cursor = 'pointer';
                    routeStartInput.readOnly = false;
                    routeStartInput.onclick = () => {
                        updateRouteStatus("📍 Requesting location...");
                        locateUser((lat, lng) => {
                            updateMyMarker(lat, lng);
                            window.map.flyTo({ center: [lng, lat], zoom: 16 });
                            updateRouteStatus("✓ Location found. Enter destination or tap map.");
                            startLocationTracking();
                            
                            reverseGeocode(lng, lat).then(placeName => {
                                if (placeName) {
                                    routeStartInput.value = placeName;
                                } else {
                                    routeStartInput.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                                }
                                routeStartInput.style.cursor = 'default';
                                routeStartInput.readOnly = true;
                            });
                        }, (err) => {
                            updateRouteStatus("❌ Could not get location. Please check browser settings.");
                        });
                    };
                }
            });
            
            setupAddressSearch();
        });
        

        window.map.on('click', (e) => {
            const clickedLat = e.lngLat.lat;
            const clickedLng = e.lngLat.lng;

            console.log("🖱️ Map Clicked:", clickedLat, clickedLng);

            if (!window.userLat || !window.userLng) {
                updateRouteStatus("⏳ Getting your location...");
                locateUser((lat, lng) => {
                    updateMyMarker(lat, lng);
                    updateDestinationMarker(clickedLat, clickedLng);
                    reverseGeocode(clickedLng, clickedLat).then(placeName => {
                        const routeDestInput = document.getElementById('route-dest');
                        if (routeDestInput && placeName) {
                            routeDestInput.value = placeName;
                        }
                    });
                    drawRoute(
                        [window.userLng, window.userLat], 
                        [clickedLng, clickedLat], 
                        'walking'
                    );
                }, (error) => {
                    updateRouteStatus("❌ Cannot get your location. Please allow location access.");
                    alert("Location access is required. Please allow location access in your browser settings and try again.");
                });
                return;
            }

            if (!window.isEscortActive) {
                updateDestinationMarker(clickedLat, clickedLng);
                reverseGeocode(clickedLng, clickedLat).then(placeName => {
                    const routeDestInput = document.getElementById('route-dest');
                    if (routeDestInput && placeName) {
                        routeDestInput.value = placeName;
                    }
                });

                const startLoc = getStartLocation();
                if (!startLoc) {
                    updateRouteStatus("⏳ Getting your location...");
                    locateUser((lat, lng) => {
                        window.userLat = lat;
                        window.userLng = lng;
                        updateMyMarker(lat, lng);
                drawRoute(
                            [lng, lat], 
                            [clickedLng, clickedLat], 
                            'walking'
                        );
                    }, (error) => {
                        updateRouteStatus("❌ Cannot get start location. Please enter a start address.");
                    });
                } else {
                    drawRoute(
                        [startLoc.lng, startLoc.lat], 
                    [clickedLng, clickedLat], 
                    'walking'
                );
            }
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

// 4. VICTIM TRACKING MAP 
window.openVictimTrackingMap = function(guardianData) {
    const mapOverlay = document.getElementById('map-overlay');
    if (!mapOverlay) {
        console.error("Map overlay not found");
        return;
    }
    
    mapOverlay.classList.remove('hidden');
    mapOverlay.style.display = 'flex';
    
    const mapTitle = document.getElementById('map-title');
    if (mapTitle) {
        mapTitle.innerHTML = '🛡️ GUARDIAN TRACKING';
        mapTitle.style.color = '#10b981';
    }
    
    const routeControls = document.getElementById('route-controls');
    if (routeControls) {
        routeControls.classList.add('hidden');
    }
    
    // Add close button
    let closeBtn = document.getElementById('map-close-btn');
    if (!closeBtn) {
        closeBtn = document.createElement('button');
        closeBtn.id = 'map-close-btn';
        closeBtn.innerHTML = '<i class="ph-fill ph-x"></i>';
        closeBtn.onclick = window.closeMap;
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            width: 44px;
            height: 44px;
            background: white;
            border: none;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        mapOverlay.appendChild(closeBtn);
    }
    closeBtn.style.display = 'flex';

    setTimeout(() => {
        resetMapGlobals();
        window.map = new maplibregl.Map({
            container: 'map',
            style: STYLE_DARK,
            center: [guardianData.guardianLocation.lng, guardianData.guardianLocation.lat],
            zoom: 15,
            pitch: 0
        });

        window.map.on('load', () => {
            window.map.resize();
            
            // Marker Guardian 
            const guardianEl = document.createElement('div');
            guardianEl.innerHTML = '<i class="ph-fill ph-shield-check" style="color:#10b981; font-size:32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>';
            
            window.guardianTrackingMarker = new maplibregl.Marker({ 
                element: guardianEl,
                anchor: 'center'
            })
            .setLngLat([guardianData.guardianLocation.lng, guardianData.guardianLocation.lat])
            .addTo(window.map);

            // victim
            locateUser((myLat, myLng) => {
                updateMyMarker(myLat, myLng);
                
                // Draw line between victim and guardian
                updateTrackingLine();
                
                // Fit both markers in view
                const bounds = new maplibregl.LngLatBounds();
                bounds.extend([guardianData.guardianLocation.lng, guardianData.guardianLocation.lat]);
                bounds.extend([myLng, myLat]);
                window.map.fitBounds(bounds, { padding: 100, maxZoom: 15 });
            });
        });
    }, 200);
}


//  LOGICA RUTARE (OSRM) 
async function drawRoute(start, end, profile) {
    // start/end sunt [lng, lat]
    console.log('DRAW ROUTE CALLED', start, end)
    const osrmProfile = profile === 'walking' ? 'foot' : 'car';
    
   const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&alternatives=true&steps=true`;
    
    try {
        const res = await fetch(url);
        const json = await res.json();
        console.log('OSRM RESPONSE', json)
        
        if (!json.routes || json.routes.length === 0) {
            updateRouteStatus("❌ No route found. Please try a different destination.");
            return;
        }
        
        // Select the best route (first one, but we could enhance this to pick safest)
        const routeData = json.routes[0];
        const durationSeconds = routeData.duration;
        const distanceMeters = routeData.distance;
        const durationMinutes = Math.round(durationSeconds / 60);
        const distanceKm = (distanceMeters / 1000).toFixed(2);

        // Update route status display
        updateRouteStatus(`✓ Safe route found: ${durationMinutes} min walk (${distanceKm} km) - Uses pedestrian paths`);

        // 1. Desenăm linia pe hartă
        if (window.map.getSource('route')) {
            window.map.getSource('route').setData({
                'type': 'Feature',
                'properties': {},
                'geometry': routeData.geometry
            });
        } else {
            window.map.addSource('route', {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': routeData.geometry
                }
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

        // Center map on route with padding to show both start and end
        const coordinates = routeData.geometry.coordinates;
        if (coordinates.length > 0) {
            const bounds = new maplibregl.LngLatBounds(
                coordinates[0],
                coordinates[0]
            );
            
            // Extend bounds to include all route coordinates
            coordinates.forEach(coord => {
                bounds.extend(coord);
            });
            
            window.map.fitBounds(bounds, {
                padding: { top: 100, bottom: 100, left: 100, right: 100 },
                maxZoom: 16
            });
        }

        console.log('isEscortSetupMode BEFORE CHECK', window.isEscortSetupMode)
        if (window.isEscortSetupMode && window.virtualEscort) {
            console.log("✅ Sending estimates to Escort Module:", durationSeconds);
            console.log('isEscortSetupMode', window.isEscortSetupMode)
            window.virtualEscort.updateEstimates(durationSeconds, { lat: end[1], lng: end[0] });
        }

    } catch (e) {
        console.error("Routing error:", e);
        updateRouteStatus("❌ Error calculating route. Please try again.");
    }
}

//GEOCODING FUNCTIONALITY 
async function geocodeAddress(address) {
    if (!address || address.trim() === '') {
        return null;
    }

    try {
        const encodedAddress = encodeURIComponent(address);
        const url = `https://api.maptiler.com/geocoding/${encodedAddress}.json?key=${API_KEY}&limit=1`;
        
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.features && json.features.length > 0) {
            const feature = json.features[0];
            return {
                lat: feature.geometry.coordinates[1],
                lng: feature.geometry.coordinates[0],
                place_name: feature.place_name || address
            };
        }
        
        return null;
    } catch (e) {
        console.error("Geocoding error:", e);
        return null;
    }
}

//REVERSE GEOCODING 
async function reverseGeocode(lng, lat) {
    try {
        const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${API_KEY}&limit=1`;
        
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.features && json.features.length > 0) {
            return json.features[0].place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
        
        return null;
    } catch (e) {
        console.error("Reverse geocoding error:", e);
        return null;
    }
}

//  SETUP ADDRESS SEARCH 
function setupAddressSearch() {
    const routeDestInput = document.getElementById('route-dest');
    const routeStartInput = document.getElementById('route-start');
    const btnUseGps = document.getElementById('btn-use-gps');

    if (!routeDestInput) return;

    let searchTimeout = null;

    // Handle Enter key on destination input
    routeDestInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            await calculateRouteFromInputs();
        }
    });

    // Handle Enter key on start location input
    if (routeStartInput) {
        routeStartInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await handleStartLocationChange();
            }
        });

        routeStartInput.addEventListener('blur', async () => {
            if (routeStartInput.value.trim()) {
                await handleStartLocationChange();
            }
        });
    }

    // Handle GPS button click
    if (btnUseGps) {
        btnUseGps.addEventListener('click', async () => {
            await useGpsLocation();
        });
    }

    // autocomplete on input 
    routeDestInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
    });
}

// HANDLE START LOCATION CHANGE
async function handleStartLocationChange() {
    const routeStartInput = document.getElementById('route-start');
    if (!routeStartInput || !routeStartInput.value.trim()) return;

    const address = routeStartInput.value.trim();
    
    // Check if it's a GPS location request
    if (address.toLowerCase() === 'my location' || address.toLowerCase() === 'current location') {
        await useGpsLocation();
        return;
    }

    updateRouteStatus("🔍 Searching for start location...");
    
    const result = await geocodeAddress(address);
    
    if (!result) {
        updateRouteStatus("❌ Start location not found. Please check the address.");
        return;
    }

    // Update the input with the found place name
    routeStartInput.value = result.place_name;
    
    // Store custom start location
    window.customStartLat = result.lat;
    window.customStartLng = result.lng;
    
    // Update start marker if route exists
    if (window.routeStartMarker) {
        window.routeStartMarker.setLngLat([result.lng, result.lat]);
    } else {
        // Create a marker for custom start location
        const el = document.createElement('div');
        el.innerHTML = '<i class="ph-fill ph-map-pin" style="color:#10b981; font-size:24px;"></i>';
        window.routeStartMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([result.lng, result.lat])
            .addTo(window.map);
    }

    updateRouteStatus("✓ Start location set. Enter destination to calculate route.");
    
    // If destination is already set, recalculate route
    const routeDestInput = document.getElementById('route-dest');
    if (routeDestInput && routeDestInput.value.trim()) {
        await calculateRouteFromInputs();
    }
}

//  USE GPS LOCATION FOR START 
async function useGpsLocation() {
    const routeStartInput = document.getElementById('route-start');
    if (!routeStartInput) return;

    // Clear custom start location
    window.customStartLat = null;
    window.customStartLng = null;
    
    // Remove custom start marker if exists
    if (window.routeStartMarker) {
        window.routeStartMarker.remove();
        window.routeStartMarker = null;
    }

    if (!window.userLat || !window.userLng) {
        updateRouteStatus("⏳ Getting your GPS location...");
        locateUser((lat, lng) => {
            window.userLat = lat;
            window.userLng = lng;
            updateMyMarker(lat, lng);
            
            // Update start input with GPS location address
            reverseGeocode(lng, lat).then(placeName => {
                if (routeStartInput && placeName) {
                    routeStartInput.value = placeName;
                }
                updateRouteStatus("✓ Using GPS location. Enter destination to calculate route.");
                
                // If destination is already set, recalculate route
                const routeDestInput = document.getElementById('route-dest');
                if (routeDestInput && routeDestInput.value.trim()) {
                    calculateRouteFromInputs();
                }
            });
        }, (error) => {
            updateRouteStatus("❌ Cannot get GPS location. Please allow location access.");
        });
    } else {
        // Already have GPS location, just update the input
        reverseGeocode(window.userLng, window.userLat).then(placeName => {
            if (routeStartInput && placeName) {
                routeStartInput.value = placeName;
            }
            updateRouteStatus("✓ Using GPS location. Enter destination to calculate route.");
            
            // If destination is already set, recalculate route
            const routeDestInput = document.getElementById('route-dest');
            if (routeDestInput && routeDestInput.value.trim()) {
                calculateRouteFromInputs();
            }
        });
    }
}

//GET CURRENT START LOCATION
function getStartLocation() {
    if (window.customStartLat && window.customStartLng) {
        return {
            lat: window.customStartLat,
            lng: window.customStartLng,
            isCustom: true
        };
    }
    
    if (window.userLat && window.userLng) {
        return {
            lat: window.userLat,
            lng: window.userLng,
            isCustom: false
        };
    }
    
    return null;
}

//  CALCULATE ROUTE FROM BOTH INPUTS 
async function calculateRouteFromInputs() {
    const routeDestInput = document.getElementById('route-dest');
    if (!routeDestInput || !routeDestInput.value.trim()) {
        updateRouteStatus("Please enter a destination address");
        return;
    }

    // Get start location (custom or GPS)
    let startLoc = getStartLocation();
    if (!startLoc) {
        updateRouteStatus("⏳ Getting your location first...");
        
        // Try to get GPS location
        return new Promise((resolve) => {
            if (!window.userLat || !window.userLng) {
                locateUser((lat, lng) => {
                    window.userLat = lat;
                    window.userLng = lng;
                    updateMyMarker(lat, lng);
                    // Retry route calculation
                    calculateRouteFromInputs().then(resolve);
                }, (error) => {
                    updateRouteStatus("❌ Cannot determine start location. Please enter a start address or allow GPS access.");
                    resolve();
                });
            } else {
                // Already have GPS location, just retry
                calculateRouteFromInputs().then(resolve);
            }
        });
    }

    updateRouteStatus("🔍 Searching for destination...");
    
    const destResult = await geocodeAddress(routeDestInput.value);
    
    if (!destResult) {
        updateRouteStatus("❌ Destination not found. Please try a different address or click on the map.");
        return;
    }

    routeDestInput.value = destResult.place_name;

    updateDestinationMarker(destResult.lat, destResult.lng);

    if (startLoc.isCustom) {
        if (window.routeStartMarker) {
            window.routeStartMarker.setLngLat([startLoc.lng, startLoc.lat]);
        }
    } else {
        if (window.userLat && window.userLng) {
            updateMyMarker(window.userLat, window.userLng);
        }
    }

    drawRoute(
        [startLoc.lng, startLoc.lat],
        [destResult.lng, destResult.lat],
        'walking'
    );

    window.map.flyTo({
        center: [destResult.lng, destResult.lat],
        zoom: 15,
        speed: 1.2
    });
}

//  SEARCH ADDRESS AND ROUTE  
async function searchAndRoute(address) {
    const routeDestInput = document.getElementById('route-dest');
    if (routeDestInput) {
        routeDestInput.value = address;
    }
    await calculateRouteFromInputs();
}

//  UPDATE ROUTE STATUS 
function updateRouteStatus(message) {
    const statusEl = document.getElementById('route-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

//  HELPERS 

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

//  LOCATE USER WITH ERROR HANDLING 
function locateUser(cb, errorCb) {
    if(!navigator.geolocation) {
        if (errorCb) errorCb(new Error("Geolocation not supported"));
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            window.userLat = lat;
            window.userLng = lng;
            console.log("📍 Location obtained:", lat, lng);
            if (cb) cb(lat, lng);
        },
        (error) => {
            console.error("❌ Geolocation error:", error);
            let errorMsg = "Unknown location error";
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = "Location permission denied. Please allow location access in your browser settings.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = "Location information unavailable.";
                    break;
                case error.TIMEOUT:
                    errorMsg = "Location request timed out.";
                    break;
            }
            if (errorCb) errorCb(new Error(errorMsg));
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
    }
    
//  START CONTINUOUS LOCATION TRACKING 
function startLocationTracking() {
    if (!navigator.geolocation || !window.map) return;
    
    // Clear any existing watch
    if (window.locationWatchId) {
        navigator.geolocation.clearWatch(window.locationWatchId);
    }
    
    window.locationWatchId = navigator.geolocation.watchPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            
            // Update location if changed significantly
            if (!window.userLat || !window.userLng || 
                Math.abs(window.userLat - lat) > 0.0001 || 
                Math.abs(window.userLng - lng) > 0.0001) {
                
                window.userLat = lat;
                window.userLng = lng;
                updateMyMarker(lat, lng);
            }
        },
        (error) => {
            console.error("Location tracking error:", error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        }
    );
    }
    
//  STOP LOCATION TRACKING 
function stopLocationTracking() {
    if (window.locationWatchId) {
        navigator.geolocation.clearWatch(window.locationWatchId);
        window.locationWatchId = null;
    }
}

window.closeMap = function() { 
    // Stop location tracking when closing map
    stopLocationTracking();
    
    document.getElementById('map-overlay').style.display = 'none';
    if(window.location.search.includes('watch') || document.getElementById('map-title').innerText.includes("LIVE")) {
        window.location.reload();
    }
    }
    
    // Clear guardian view mode flag
    window.inGuardianViewMode = false;

window.reportCurrentLocationHazard = async function() {
    if (!window.userLat || !window.userLng) {
        alert("Waiting for GPS...");
        locateUser((lat, lng) => {
            window.userLat = lat;
            window.userLng = lng;
        });
        return;
    }

    const type = prompt("REPORT HAZARD:\nType one: DARK, ACCIDENT, CROWD, ANIMAL");
    if (!type) return; 

    const validTypes = ['DARK', 'ACCIDENT', 'CROWD', 'ANIMAL', 'ICE', 'OTHER'];
    const finalType = type.toUpperCase(); 

    const el = document.createElement('div');
    el.innerHTML = '<i class="ph-fill ph-warning-octagon" style="color:#f59e0b; font-size:24px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);"></i>';
    
    new maplibregl.Marker({ element: el })
        .setLngLat([window.userLng, window.userLat])
        .setPopup(new maplibregl.Popup().setHTML(`<b>${finalType}</b><br>Just reported`))
        .addTo(window.map);

    const token = localStorage.getItem("nightguard_token");
    
    try {
        const response = await fetch('/api/iot/report', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
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

async function loadHazards() {
    const token = localStorage.getItem("nightguard_token");
    console.log("🔄 Loading hazards from DB..."); 

    try {
        const res = await fetch('/api/iot/safety-map', { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await res.json();
        
        console.log("📦 Hazards Received:", data.hazards); 

        if(data.hazards && window.map) {
            data.hazards.forEach(h => {
                const el = document.createElement('div');
                el.className = 'hazard-marker'; 
                el.innerHTML = '<i class="ph-fill ph-warning-octagon" style="color:#f59e0b; font-size:24px;"></i>';
                el.style.width = '24px';
                el.style.height = '24px';
                el.style.cursor = 'pointer';

                const lat = parseFloat(h.latitude);
                const lng = parseFloat(h.longitude);

                new maplibregl.Marker({ element: el })
                    .setLngLat([lng, lat]) 
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


window.updateGuardianMarkerOnMap = function(lat, lng) {
    if (!window.map) {
        console.warn("Map not initialized for guardian marker update");
        return;
    }
    
    if (!window.guardianTrackingMarker) {
        const el = document.createElement('div');
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.innerHTML = '<i class="ph-fill ph-shield-check" style="color:#10b981; font-size:28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>';
        
        window.guardianTrackingMarker = new maplibregl.Marker({ 
            element: el,
            anchor: 'center'
        })
        .setLngLat([lng, lat])
        .addTo(window.map);
        
        console.log("✅ Guardian marker created at:", lat, lng);
        
        if (window.userLat && window.userLng) {
            const bounds = new maplibregl.LngLatBounds();
            bounds.extend([lng, lat]);
            bounds.extend([window.userLng, window.userLat]);
            window.map.fitBounds(bounds, { padding: 100, maxZoom: 15 });
        }
    } else {
        window.guardianTrackingMarker.setLngLat([lng, lat]);
        console.log("📍 Guardian marker updated:", lat, lng);
    }
    
    updateTrackingLine();
};

window.updateVictimMarkerOnMap = function(lat, lng) {
    if (!window.map) {
        console.warn("Map not initialized for victim marker update");
        return;
    }
    
    if (targetMarker) {
        targetMarker.setLngLat([lng, lat]);
        console.log("📍 Victim marker updated:", lat, lng);
        
        window.map.panTo([lng, lat], { duration: 1000 });
    } else {
        const el = document.createElement('div');
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.backgroundColor = 'red';
        el.style.borderRadius = '50%';
        el.style.border = '4px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        
        targetMarker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(window.map);
        
        console.log("✅ Victim marker created at:", lat, lng);
    }
    
    if (window.userLat && window.userLng) {
        drawRoute([window.userLng, window.userLat], [lng, lat], 'driving');
    }
};

function updateTrackingLine() {
    if (!window.guardianTrackingMarker || !window.userLat || !window.userLng) return;
    
    const guardianPos = window.guardianTrackingMarker.getLngLat();
    
    const lineData = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [window.userLng, window.userLat],
                [guardianPos.lng, guardianPos.lat]
            ]
        }
    };
    
    if (window.map.getSource('tracking-line')) {
        window.map.getSource('tracking-line').setData(lineData);
    } else {
        window.map.addSource('tracking-line', {
            type: 'geojson',
            data: lineData
        });
        
        window.map.addLayer({
            id: 'tracking-line',
            type: 'line',
            source: 'tracking-line',
            paint: {
                'line-color': '#10b981',
                'line-width': 3,
                'line-dasharray': [2, 2]
            }
        });
    }
}
