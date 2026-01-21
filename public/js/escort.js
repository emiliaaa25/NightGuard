/**
 * VIRTUAL ESCORT MODULE (LIVE NAVIGATION EDITION)
 */
class VirtualEscort {
    constructor() {
        this.isActive = false;
        this.timerInterval = null;
        this.endTime = null;
        this.watchId = null;
        this.destinationLatLng = null; // Final Coordinates
    }
    
    // 1. Open Setup
    openSetup() {
        window.isEscortSetupMode = true
        window.openCommunityMap();
        // document.getElementById('modal-escort-setup').classList.remove('hidden');
        document.getElementById('escort-estimates').classList.add('hidden');
        document.getElementById('btn-start-escort').classList.add('hidden');
    }

    // 2. User Picks Destination
    pickDestinationOnMap() {
        document.getElementById('modal-escort-setup').classList.add('hidden');
        // window.openCommunityMap(); // Opens Safety Map
        window.isEscortSetupMode = true; // Flag for map.js
        alert("Tap destination on map.");
    }

    // 3. Receive Estimates from Map
    updateEstimates(seconds, destLatLng) {
        console.log('UPDATE ESTIMATES CALLED', seconds, destLatLng)
        this.destinationLatLng = destLatLng; 
        
        document.getElementById('modal-escort-setup').classList.remove('hidden');
        // Keep map open in background
        // window.isEscortSetupMode = false;

        const minutes = Math.ceil(seconds / 60);
        const buffer = 5; 
        const total = minutes + buffer;

        document.getElementById('est-time-val').innerText = `${minutes} min`;
        document.getElementById('total-time-val').innerText = `${total} min`;

        document.getElementById('escort-estimates').classList.remove('hidden');
        document.getElementById('btn-start-escort').classList.remove('hidden');
        
        this.totalDurationMs = total * 60 * 1000;

        const slideup = document.getElementById('escort-slideup')
        slideup.classList.remove('hidden')
        slideup.classList.add('visible')
        console.log('updateEstimates called')
    }

    // 4. Start Journey (ROBUST VERSION)
    startJourney() {
        window.isEscortSetupMode = false;
        const slideup = document.getElementById('escort-slideup')
    slideup.classList.remove('visible')
    slideup.classList.add('hidden')
        // UI Updates
        document.getElementById('modal-escort-setup').classList.add('hidden');
        document.getElementById('escort-active-overlay').classList.remove('hidden'); 
        
        const mapOverlay = document.getElementById('map-overlay');
        mapOverlay.classList.remove('hidden');
        mapOverlay.style.display = 'flex';
        document.getElementById('route-controls').classList.add('hidden');

        // Logic Updates
        this.isActive = true;
        this.endTime = Date.now() + this.totalDurationMs;
        this.timerInterval = setInterval(() => this.tick(), 1000);
        
        // Start GPS
        this.startTracking();

        // --- SOCKET COMMUNICATION FIX ---
        console.log("🚀 PREPARING TO SEND ESCORT SIGNAL...");

        // 1. Auto-healing: If socket is missing, try to reconnect
        if (!window.socket && typeof io !== 'undefined') {
            console.warn("⚠️ Socket object missing. Attempting reconnection...");
            window.socket = io();
        }

        // 2. Send Signal
        if (window.socket && window.socket.connected) {
            window.socket.emit('escort_start', {
                duration: this.totalDurationMs,
                destination: this.destinationLatLng
            });
            console.log("✅ SIGNAL SENT: escort_start");
        } else {
            // We don't alert() here to avoid blocking the user experience, 
            // but we log the error. The Journey continues locally.
            console.warn("⚠️ Offline Mode: Escort started locally, but server not reachable.");
            if(window.socket) {
                // Try emitting anyway, it might buffer
                window.socket.emit('escort_start', {
                    duration: this.totalDurationMs,
                    destination: this.destinationLatLng
                });
            }
        }
        
        // 3. Zoom Map
        if(window.enterNavigationMode) {
            window.enterNavigationMode(this.destinationLatLng);
        }
    }

    // 5. Timer Tick
    tick() {
        const now = Date.now();
        const diff = this.endTime - now;
        if (diff <= 0) {
            this.handleExpiration();
            return;
        }
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        document.getElementById('escort-timer').innerText = 
            `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // 6. GPS Tracking (UPDATED FOR LIVE SOCKET)
    startTracking() {
        if (!navigator.geolocation) return;
        
        this.watchId = navigator.geolocation.watchPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            // A. Send to server (Only if connected)
            if(window.socket && window.socket.connected) {
                window.socket.emit('escort_update', { lat, lng });
                // console.log("📡 Sent GPS update"); // Uncomment for debug
            }

            // B. Update Map Visuals (My Location)
            if(window.updateUserLocationOnMap) {
                window.updateUserLocationOnMap(lat, lng);
            }

            // C. Check Arrival
            if (this.destinationLatLng) {
                const dist = this.getDistanceFromLatLonInKm(lat, lng, this.destinationLatLng.lat, this.destinationLatLng.lng);
                if (dist < 0.05) { // 50m threshold
                   if(navigator.vibrate) navigator.vibrate([100, 100]);
                }
            }
        }, err => console.error(err), { enableHighAccuracy: true, maximumAge: 0 });
    }

    // 7. Safe Arrival
    imSafe() {
        this.stopEscort();
        alert("Journey Complete! Stay safe.");
    }

    // 8. Timeout -> PANIC
    handleExpiration() {
        this.stopEscort();
        if(window.nightGuardIoT) window.nightGuardIoT.triggerPanicMode('ESCORT_TIMEOUT');
    }

    stopEscort() {
        this.isActive = false;
        clearInterval(this.timerInterval);
        if(this.watchId) navigator.geolocation.clearWatch(this.watchId);
        
        document.getElementById('escort-active-overlay').classList.add('hidden');
        document.getElementById('route-controls').classList.remove('hidden'); // Show search again
        
        // Notify server
        if(window.socket) window.socket.emit('escort_end', { status: 'SAFE' });
    }

    getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        var R = 6371; 
        var dLat = (lat2-lat1) * (Math.PI/180);  
        var dLon = (lon2-lon1) * (Math.PI/180); 
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return R * c; 
    }
}

const virtualEscort = new VirtualEscort();
window.virtualEscort = virtualEscort;

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-start-escort-slideup')
    if (!btn) return

    btn.addEventListener('click', () => {
        virtualEscort.startJourney()
    })
})
