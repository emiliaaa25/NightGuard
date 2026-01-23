
if (typeof io !== 'undefined') {
    const socket = io(); 
    window.socket = socket; 
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
            window.currentUserId = data.user.id; 

            // Connect to our user channel
            window.socket.emit('join_user_room', data.user.id);
            console.log("✅ Logged in as User ID:", window.currentUserId);
        }
    } catch (e) { console.error(e); }
}

// 2. LISTEN FOR EVENTS 
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

    // --- FRIEND JOURNEY ENDED ---
    window.socket.on('friend_journey_ended', (data) => {
        // Only remove the banner when user marked SAFE
        if (data?.status === 'SAFE') {
            const card = document.getElementById(`feed-${data.friendId}`);
            if (card) card.remove();

            const list = document.getElementById('feeds-list');
            const container = document.getElementById('active-feeds-container');
            if (list && container) {
                const hasItems = list.children && list.children.length > 0;
                if (!hasItems) {
                    container.classList.add('hidden');
                    container.removeAttribute('style');
                }
            }
        }
        // For TIMEOUT or other statuses, keep banner visible.
    });

    // SOS ALERT 
    window.socket.on('emergency_alert', (data) => {
        window.currentAlertData = data;
        
        const modal = document.getElementById('guardian-alert-modal');
        if(modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            const nameEl = document.getElementById('alert-victim-name');
            if(nameEl) nameEl.textContent = data.victimName || "Unknown";
        }
        
        if(navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    });

    //GUARDIAN COMING 
    window.socket.on('guardian_coming', (data) => {
        console.log("✅ Guardian accepted! Help is coming:", data);
        
        // Store tracking info globally
        window.activeRescue = {
            alertId: data.alertId,
            guardianId: data.guardianId,
            guardianName: data.guardianName,
            trackingRoom: data.trackingRoom
        };
        
        // Join tracking room
        if (window.socket) {
            window.socket.emit('join_tracking_room', { alertId: data.alertId });
        }
        
        if (window.showHelpIsComingUI) {
            window.showHelpIsComingUI(data);
        }
        
        if(navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    });
    
    // RESCUE MISSION STARTED 
    window.socket.on('rescue_mission_started', (data) => {
        console.log("🚨 Rescue mission confirmed:", data);
        
        // Store rescue info globally
        window.activeRescue = {
            alertId: data.alertId,
            victimId: data.victimId,
            trackingRoom: data.trackingRoom
        };
        
        // Join tracking room
        if (window.socket) {
            window.socket.emit('join_tracking_room', { alertId: data.alertId });
        }
        
        // Start location tracking for guardian
        if (window.startGuardianLocationTracking) {
            window.startGuardianLocationTracking(data.alertId);
        }
    });
    
    // GUARDIAN LOCATION UPDATE 
    window.socket.on('update_guardian_location', (data) => {
        console.log("📍 Guardian location update:", data);
        
        if (window.updateGuardianMarkerOnMap) {
            window.updateGuardianMarkerOnMap(data.lat, data.lng);
        }
    });
    
    // VICTIM LOCATION UPDATE 
    window.socket.on('update_victim_location', (data) => {
        console.log("📍 Victim location update:", data);
        
        if (window.updateVictimMarkerOnMap) {
            window.updateVictimMarkerOnMap(data.lat, data.lng);
        }
    });
    
    // VICTIM MARKED SAFE 
    window.socket.on('victim_marked_safe', (data) => {
        console.log("✅ Victim is safe:", data);
        
        alert(`Good news! The victim is now safe and has ended the emergency alert.`);
        
        // Stop guardian location tracking
        if (window.stopGuardianLocationTracking) {
            window.stopGuardianLocationTracking();
        }
        
        // Close map after a moment
        setTimeout(() => {
            if (window.closeMap) {
                window.closeMap();
            }
        }, 2000);
    });
    
    // VICTIM STOPPED RECORDING 
    window.socket.on('victim_recording_stopped_notification', (data) => {
        console.log("⏹️ Victim stopped recording:", data);
        
        if (Notification.permission === 'granted') {
            new Notification('Recording Stopped', {
                body: 'Victim stopped recording but emergency is still active',
                icon: '/images/logo.png'
            });
        }
    });
}

// Helpers
window.acceptAlert = function() {
    const modal = document.getElementById('guardian-alert-modal');
    if (modal) modal.style.display = 'none';
    
    if (!window.currentAlertData) {
        console.error("No alert data available");
        return;
    }
    const alertId = window.currentAlertData.alertId;
    const victimLocation = window.currentAlertData.location;
    
    if (window.socket && window.currentUserId) {
        window.socket.emit('guardian_accept_alert', {
            alertId: alertId,
            victimId: window.currentAlertData.victimId || null
        });
        
        console.log("✅ Guardian accepted alert:", alertId);
    }
    
    if (victimLocation && window.startRescueMission) {
        window.startRescueMission(victimLocation.lat, victimLocation.lng);
    }
};

window.ignoreAlert = function() {
    const modal = document.getElementById('guardian-alert-modal');
    if (modal) modal.style.display = 'none';
    window.currentAlertData = null;
};