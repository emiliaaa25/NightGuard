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