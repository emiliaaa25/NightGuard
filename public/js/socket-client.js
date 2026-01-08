// === SOCKET.IO CLIENT ===

const socket = io(); 

window.initSocketConnection = async function() {
    const token = localStorage.getItem("nightguard_token");
    if (!token) return;

    try {
        const response = await fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await response.json();
        
        if (data.user) {
            socket.emit('join_user_room', data.user.id);
            console.log("Connected to Notification System");
        }
    } catch (e) { console.error(e); }
}

socket.on('emergency_alert', (data) => {
    console.log("RECEIVED ALERT:", data);
    
    // Salvăm datele alertei global pentru a le folosi când dăm "RESPOND"
    window.currentAlertData = data; 

    const audio = document.getElementById('siren-sound');
    if(audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play blocked"));
    }

    const modal = document.getElementById('guardian-alert-modal');
    if(modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        const nameEl = document.getElementById('alert-victim-name');
        const distEl = document.getElementById('alert-distance');
        
        if(nameEl) nameEl.textContent = data.victimName || "Unknown Citizen";
        if(distEl) distEl.textContent = "Location Received via GPS";
    }

    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
});

// === MODIFICARE AICI ===
window.acceptAlert = function() {
    const audio = document.getElementById('siren-sound');
    if(audio) audio.pause();
    
    // Ascundem modalul de alertă
    const modal = document.getElementById('guardian-alert-modal');
    if(modal) modal.style.display = 'none';
    
    // VERIFICĂM DACĂ AVEM COORDONATE ȘI PORNIM MISIUNEA
    if (window.currentAlertData && window.currentAlertData.location) {
        const { lat, lng } = window.currentAlertData.location;
        console.log("Starting Rescue to:", lat, lng);
        
        // Apelăm funcția nouă din map.js
        if(typeof window.startRescueMission === 'function') {
            window.startRescueMission(lat, lng);
        } else {
            alert("Map module not loaded properly.");
        }
    } else {
        alert("Error: Missing coordinates in alert data.");
    }
};

window.ignoreAlert = function() {
    const audio = document.getElementById('siren-sound');
    if(audio) audio.pause();
    const modal = document.getElementById('guardian-alert-modal');
    if(modal) modal.style.display = 'none';
};