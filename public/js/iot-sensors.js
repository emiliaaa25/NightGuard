/**
 * NIGHTGUARD IOT SENSOR MODULE
 * Shake -> Start Recording -> Stop Manual -> Upload
 */
class NightGuardIoT {
    constructor() {
        // SENSITIVITY SETTINGS
        this.shakeThreshold = 10; 
        this.shakeTimeout = 1000; 
        
        this.lastX = null; this.lastY = null; this.lastZ = null;
        this.lastUpdate = 0;
        this.shakeCount = 0;
        
        this.sensorsActive = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentAlertId = null; 
        this.isRecording = false; 
    }

    // === CRITICAL: MUST BE CALLED FROM USER INTERACTION (START BUTTON) ===
    async init() {
        if (this.sensorsActive) return;
        console.log("Initializing Sensors...");

        // 1. REQUEST MOTION FIRST (CRITICAL FOR IOS)
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                console.log("Requesting iOS Motion Permission...");
                const response = await DeviceMotionEvent.requestPermission();
                if (response === 'granted') {
                    window.addEventListener('devicemotion', (e) => this.handleMotion(e), true);
                    this.sensorsActive = true;
                    console.log("Motion Sensors Granted (iOS)");
                } else {
                    alert("Motion permission denied. Shake feature disabled.");
                }
            } catch (error) { 
                console.error("Motion Error:", error); 
            }
        } else {
            // Android / Standard
            window.addEventListener('devicemotion', (e) => this.handleMotion(e), true);
            this.sensorsActive = true;
            console.log("Motion Sensors Active (Standard)");
        }

        // 2. REQUEST MICROPHONE AFTER SENSORS
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Microphone Access Granted");
            // Stop stream immediately, will restart on panic
            stream.getTracks().forEach(track => track.stop()); 
        } catch (e) { 
            console.warn("Microphone Permission Missing"); 
        }
    }

    handleMotion(event) {
        if (this.isRecording) return;

        const current = event.accelerationIncludingGravity;
        if (!current) return;

        const currentTime = Date.now();
        if ((currentTime - this.lastUpdate) > 100) { 
            const diffTime = currentTime - this.lastUpdate;
            this.lastUpdate = currentTime;

            if (this.lastX === null) {
                this.lastX = current.x; this.lastY = current.y; this.lastZ = current.z;
                return;
            }

            const deltaX = current.x - this.lastX;
            const deltaY = current.y - this.lastY;
            const deltaZ = current.z - this.lastZ;

            const speed = Math.abs(deltaX + deltaY + deltaZ) / diffTime * 10000;

            if (speed > this.shakeThreshold * 100) {
                this.shakeCount++;
                console.log(`Shake Detected! Count: ${this.shakeCount} (Speed: ${Math.round(speed)})`);
                
                clearTimeout(this.shakeTimer);
                this.shakeTimer = setTimeout(() => { this.shakeCount = 0; }, this.shakeTimeout);

                if (this.shakeCount >= 3) {
                    console.log("TRIGGERING PANIC MODE!");
                    this.triggerPanicMode("SHAKE_TRIGGER");
                    this.shakeCount = 0;
                }
            }

            this.lastX = current.x;
            this.lastY = current.y;
            this.lastZ = current.z;
        }
    }

    async triggerPanicMode(source) {
        const btn = document.getElementById('btn-panic');
        const card = document.querySelector('.panic-card');

        // Don't trigger new alert if we're already in rescue mode
        if (window.activeRescue && window.activeRescue.alertId) {
            console.warn("⚠️ Already in rescue mode with alert:", window.activeRescue.alertId);
            console.warn("⚠️ Not triggering new panic - use existing alert");
            return;
        }

        if (this.isRecording) {
            this.stopEmergency();
            return;
        }

        this.isRecording = true; 
        if(navigator.vibrate) navigator.vibrate([300, 100, 300]);

        if (card) {
            card.classList.add('is-recording');
            const title = card.querySelector('h3');
            const subtitle = card.querySelector('p');
            if(title) title.innerText = "RECORDING EVIDENCE...";
            if(subtitle) subtitle.innerText = "Tap again to stop";
        }
        if (btn) btn.innerText = "STOP RECORDING";

        this.startAudioRecording();
        this.sendGPSAlert(source);
    }

    async sendGPSAlert(source) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                const token = localStorage.getItem("nightguard_token");
                try {
                    const res = await fetch('/api/iot/panic', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ latitude, longitude, type: 'SOS_PANIC', trigger_method: source })
                    });
                    const data = await res.json();
                    if(res.ok) {
                        this.currentAlertId = data.alertId;
                        console.log("SOS Alert Sent");
                        
                        // Store alert ID globally for tracking
                        window.currentSOSAlertId = data.alertId;
                        
                        // Start victim location tracking
                        if (window.startVictimLocationTracking) {
                            window.startVictimLocationTracking(data.alertId);
                        }
                    }
                } catch(e) { console.error(e); }
            },
            (err) => console.warn("GPS Failed"),
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }

    async startAudioRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';

            this.mediaRecorder = new MediaRecorder(stream, { mimeType });
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.audioChunks.push(e.data); };
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.audioChunks, { type: mimeType });
                const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                this.uploadEvidence(blob, ext);
                this.resetUI();
            };
            this.mediaRecorder.start();
        } catch (err) { console.error("Mic Fail", err); this.resetUI(); }
    }

    stopEmergency() {
        // Don't trigger if we're in guardian view mode
        if (window.inGuardianViewMode) {
            console.log("⚠️ Cannot stop emergency while viewing guardian map");
            return;
        }
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
        } else {
            this.resetUI();
        }
        this.isRecording = false;
        alert("Emergency Ended. Evidence uploaded.");
    }

    resetUI() {
        // Don't reset if we're in guardian view mode
        if (window.inGuardianViewMode) {
            console.log("⚠️ Skipping resetUI in guardian view mode");
            return;
        }
        
        const btn = document.getElementById('btn-panic');
        const card = document.querySelector('.panic-card');
        if (card) {
            card.classList.remove('is-recording'); 
            const title = card.querySelector('h3');
            const subtitle = card.querySelector('p');
            if(title) title.innerText = "SOS ALERT";
            if(subtitle) subtitle.innerText = "Tap to Broadcast Location";
        }
        if (btn) btn.innerText = "STANDBY";
    }

    async uploadEvidence(blob, ext) {
        if (!this.currentAlertId) return;
        const fd = new FormData();
        fd.append('audio', blob, `evidence.${ext}`);
        fd.append('alertId', this.currentAlertId);
        const token = localStorage.getItem("nightguard_token");
        await fetch('/api/iot/upload-evidence', { method: 'POST', headers: {'Authorization': `Bearer ${token}`}, body: fd });
    }
}

const nightGuardIoT = new NightGuardIoT();

// === VICTIM UI: "HELP IS ON THE WAY" ===
window.showHelpIsComingUI = function(data) {
    const card = document.querySelector('.panic-card');
    
    if (!card) return;
    
    // Store data globally for tracking
    window.guardianTrackingData = data;
    
    // Update the panic card to show help is coming
    card.classList.add('help-coming');
    card.classList.remove('is-recording');
    
    const title = card.querySelector('h3');
    const subtitle = card.querySelector('p');
    
    if (title) {
        title.innerText = "HELP IS ON THE WAY";
    }
    
    if (subtitle) {
        subtitle.innerHTML = `Guardian <strong>${data.guardianName}</strong> is coming<br>` +
                           `<span style="font-weight: 700;">ETA: ${data.eta} minutes</span>`;
    }
    
    // Replace card content with large action buttons
    const panicContent = card.querySelector('.panic-content');
    if (panicContent) {
        const actionsHTML = `
            <div id="rescue-actions" style="display: grid; grid-template-columns: 1fr; gap: 12px; width: 100%; margin-top: 20px;">
                <button onclick="window.viewGuardianOnMap()" class="rescue-action-btn rescue-btn-map">
                    <div class="rescue-btn-icon"><i class="ph-fill ph-map-pin"></i></div>
                    <div class="rescue-btn-text">
                        <div class="rescue-btn-title">View Location</div>
                        <div class="rescue-btn-desc">See where guardian is</div>
                    </div>
                </button>
                <button onclick="window.stopRecordingOnly()" class="rescue-action-btn rescue-btn-stop">
                    <div class="rescue-btn-icon"><i class="ph-fill ph-stop-circle"></i></div>
                    <div class="rescue-btn-text">
                        <div class="rescue-btn-title">Stop Recording</div>
                        <div class="rescue-btn-desc">Alert stays active</div>
                    </div>
                </button>
                <button onclick="window.markAsSafe()" class="rescue-action-btn rescue-btn-safe">
                    <div class="rescue-btn-icon"><i class="ph-fill ph-check-circle"></i></div>
                    <div class="rescue-btn-text">
                        <div class="rescue-btn-title">I'm Safe!</div>
                        <div class="rescue-btn-desc">End emergency</div>
                    </div>
                </button>
            </div>
        `;
        panicContent.innerHTML = actionsHTML;
        window.savedRescueActionsHTML = actionsHTML;
    }
    
    // Vibrate to notify
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    
    // Show notification
    if (Notification.permission === 'granted') {
        new Notification('Help is Coming!', {
            body: `Guardian ${data.guardianName} is on the way. ETA: ${data.eta} minutes`,
            icon: '/images/logo.png'
        });
    }
};

// === VICTIM LOCATION TRACKING ===
let victimLocationInterval = null;

window.startVictimLocationTracking = function(alertId) {
    console.log("📍 Starting victim location tracking for alert:", alertId);
    
    // Clear any existing interval
    if (victimLocationInterval) {
        clearInterval(victimLocationInterval);
    }
    
    // Send location every 5 seconds
    victimLocationInterval = setInterval(() => {
        if (navigator.geolocation && window.socket) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    window.socket.emit('victim_location_update', {
                        alertId: alertId,
                        lat: latitude,
                        lng: longitude
                    });
                    console.log(`📍 Victim location sent: ${latitude}, ${longitude}`);
                },
                (err) => console.warn("GPS error:", err),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    }, 5000);
};

window.stopVictimLocationTracking = function() {
    if (victimLocationInterval) {
        clearInterval(victimLocationInterval);
        victimLocationInterval = null;
        console.log("🛑 Stopped victim location tracking");
    }
};

// === GUARDIAN LOCATION TRACKING ===
let guardianLocationInterval = null;

window.startGuardianLocationTracking = function(alertId) {
    console.log("📍 Starting guardian location tracking for alert:", alertId);
    
    // Clear any existing interval
    if (guardianLocationInterval) {
        clearInterval(guardianLocationInterval);
    }
    
    // Send location every 3 seconds (more frequent for guardian)
    guardianLocationInterval = setInterval(() => {
        if (navigator.geolocation && window.socket) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    window.socket.emit('guardian_location_update', {
                        alertId: alertId,
                        lat: latitude,
                        lng: longitude
                    });
                    console.log(`📍 Guardian location sent: ${latitude}, ${longitude}`);
                },
                (err) => console.warn("GPS error:", err),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    }, 3000);
};

window.stopGuardianLocationTracking = function() {
    if (guardianLocationInterval) {
        clearInterval(guardianLocationInterval);
        guardianLocationInterval = null;
        console.log("🛑 Stopped guardian location tracking");
    }
};

// === VICTIM ACTION BUTTONS ===

// 1. View Guardian on Map
window.viewGuardianOnMap = function() {
    if (!window.guardianTrackingData) {
        alert("No guardian tracking data available");
        return;
    }
    
    // Save current state so we don't lose it
    window.inGuardianViewMode = true;
    
    // Store rescue actions container to restore it later
    const rescueActions = document.getElementById('rescue-actions');
    if (rescueActions) {
        window.savedRescueActionsHTML = rescueActions.outerHTML;
    }
    
    console.log("📍 Opening guardian location map...");
    
    // Open tracking map mode for victim
    if (window.openVictimTrackingMap) {
        window.openVictimTrackingMap(window.guardianTrackingData);
    } else {
        alert("Map feature loading...");
    }
};

// 2. Stop Recording Only (keep alert active)
window.stopRecordingOnly = function() {
    console.log("⏹️ Stopping recording...");
    
    // Make sure we're in rescue mode
    if (!window.activeRescue || !window.activeRescue.alertId) {
        console.warn("⚠️ Not in rescue mode - cannot stop recording");
        return;
    }
    
    if (nightGuardIoT.isRecording && nightGuardIoT.mediaRecorder) {
        nightGuardIoT.mediaRecorder.stop();
        nightGuardIoT.mediaRecorder.stream.getTracks().forEach(t => t.stop());
        nightGuardIoT.isRecording = false;
        
        // Notify guardian that recording stopped
        if (window.socket && window.activeRescue && window.activeRescue.alertId) {
            console.log("📢 Notifying guardian - recording stopped. AlertId:", window.activeRescue.alertId);
            window.socket.emit('victim_recording_stopped', {
                alertId: window.activeRescue.alertId
            });
        } else {
            console.warn("⚠️ Cannot notify guardian - no activeRescue or alertId");
        }
        
        // Update button to show recording stopped
        const stopBtn = document.querySelector('.rescue-btn-stop');
        if (stopBtn) {
            stopBtn.innerHTML = `
                <div class="rescue-btn-icon"><i class="ph-fill ph-check"></i></div>
                <div class="rescue-btn-text">
                    <div class="rescue-btn-title">Recording Stopped</div>
                    <div class="rescue-btn-desc">Alert stays active</div>
                </div>
            `;
            stopBtn.style.opacity = '0.6';
            stopBtn.disabled = true;
            stopBtn.onclick = null;
        }
        
        alert("Recording stopped. Evidence uploaded.");
    } else {
        alert("No active recording.");
    }
};

// 3. Mark as Safe (end alert)
window.markAsSafe = function() {
    // Don't trigger if we're viewing map
    if (window.inGuardianViewMode) {
        console.log("⚠️ Cannot mark as safe while viewing map");
        return;
    }
    
    // Make sure we're in rescue mode
    if (!window.activeRescue || !window.activeRescue.alertId) {
        console.warn("⚠️ Not in rescue mode - cannot mark as safe");
        return;
    }
    
    const confirmed = confirm("Are you safe now? This will end the emergency alert.");
    if (!confirmed) return;
    
    console.log("✅ Marking victim as safe...");
    
    // Stop all tracking
    window.stopVictimLocationTracking();
    
    // Stop recording if active (don't call function, do it directly)
    if (nightGuardIoT.isRecording) {
        nightGuardIoT.mediaRecorder.stop();
        nightGuardIoT.mediaRecorder.stream.getTracks().forEach(t => t.stop());
        nightGuardIoT.isRecording = false;
    }
    
    // Update alert status to resolved via socket
    if (window.socket && window.activeRescue && window.activeRescue.alertId) {
        console.log("📢 Notifying guardian - victim is safe. AlertId:", window.activeRescue.alertId);
        window.socket.emit('victim_safe', { 
            alertId: window.activeRescue.alertId 
        });
    } else if (window.currentSOSAlertId && window.socket) {
        console.log("📢 Notifying guardian - victim is safe (fallback). AlertId:", window.currentSOSAlertId);
        window.socket.emit('victim_safe', { 
            alertId: window.currentSOSAlertId 
        });
    } else {
        console.warn("⚠️ Cannot notify guardian - no activeRescue or currentSOSAlertId");
    }
    
    // Reset UI
    const card = document.querySelector('.panic-card');
    if (card) {
        card.classList.remove('help-coming', 'is-recording');
        card.innerHTML = `
            <div class="panic-bg-effect"></div>
            <div class="panic-content">
                <div class="panic-icon-lg"><i class="ph-fill ph-check-circle"></i></div>
                <div style="text-align: center;">
                    <h3 style="color: #10b981;">YOU'RE SAFE!</h3>
                    <p>Emergency ended successfully</p>
                </div>
                <div id="btn-panic" class="status-pill" style="background: #10b981;">SAFE</div>
            </div>
        `;
        
        // Reset after 3 seconds
        setTimeout(() => {
            location.reload();
        }, 3000);
    }
    
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
};
