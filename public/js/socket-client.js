// === SOCKET.IO CLIENT GLOBAL ===

// 1. Immediate Initialization
// Check if IO is loaded
if (typeof io !== 'undefined') {
    const socket = io(); 
    window.socket = socket; // <--- CRITICAL: Make socket global immediately
    console.log("✅ Socket initialized globally.");
} else {
    console.error("❌ Socket.io library not loaded!");
}

window.initSocketConnection = async function() {
    const token = localStorage.getItem("nightguard_token");
    if (!token || !window.socket) return;

    try {
        const response = await fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await response.json();
        
        if (data.user) {
            // === SAVE USER ID GLOBALLY ===
            window.currentUserId = data.user.id; // <--- NEW CRITICAL LINE: Save ID globally

            // Connect to our user channel
            window.socket.emit('join_user_room', data.user.id);
            console.log("✅ Logged in as User ID:", window.currentUserId);
        }
    } catch (e) { console.error(e); }
}

// 2. LISTEN FOR EVENTS (Using window.socket)
if (window.socket) {
    
    // --- FRIEND JOURNEY ALERT ---
    window.socket.on('friend_journey_started', (data) => {
        console.log("🔥 ALERT RECEIVED:", data); 
        
        const container = document.getElementById('active-feeds-container');
        const list = document.getElementById('feeds-list');
        
        if (container && list) {
            container.classList.remove('hidden');
            container.setAttribute('style', 'display: block !important;');

            if(document.getElementById(`feed-${data.friendId}`)) return;

            const cardHTML = `
                <div id="feed-${data.friendId}" class="glass-panel" style="border-left: 4px solid #ec4899; padding: 15px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; background: white; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.1);">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:40px; height:40px; background:#fce7f3; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#db2777;">
                            <i class="ph-fill ph-person-walking" style="font-size:20px;"></i>
                        </div>
                        <div>
                            <h4 style="margin:0; font-size:15px; font-weight:700; color:#1f2937;">${data.friendName}</h4>
                            <p style="margin:0; font-size:12px; color:#6b7280;">is sharing live location</p>
                        </div>
                    </div>
                    <button onclick="window.startWatchingMode(${data.friendId})" class="btn-primary" style="padding: 8px 16px; font-size: 12px; height: auto; background: linear-gradient(135deg, #ec4899, #be185d); border:none; color:white; border-radius:20px; cursor: pointer;">
                        WATCH
                    </button>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', cardHTML);
            if(navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
    });

    // --- SOS ALERT ---
    window.socket.on('emergency_alert', (data) => {
        const modal = document.getElementById('guardian-alert-modal');
        if(modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            const nameEl = document.getElementById('alert-victim-name');
            if(nameEl) nameEl.textContent = data.victimName || "Unknown";
        }
    });
}

// Helpers
window.acceptAlert = function() {
    document.getElementById('guardian-alert-modal').style.display = 'none';
    if (window.currentAlertData && window.currentAlertData.location && window.startRescueMission) {
        window.startRescueMission(window.currentAlertData.location.lat, window.currentAlertData.location.lng);
    }
};

window.ignoreAlert = function() {
    document.getElementById('guardian-alert-modal').style.display = 'none';
};