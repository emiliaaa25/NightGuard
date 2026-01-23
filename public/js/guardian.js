// === GUARDIAN & ADMIN LOGIC ===

let locationInterval = null;

window.initGuardianLogic = async function() {
    const token = localStorage.getItem("nightguard_token");
    if(!token) return;

    const guardianContainer = document.getElementById('guardian-controls-container');
    const adminPanel = document.getElementById('admin-panel');
    const appPanel = document.getElementById('application-panel');
    const btnApply = document.getElementById('btn-apply');
    const appStatus = document.getElementById('app-status');

    try {
        const response = await fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` }});
        const data = await response.json();
        const user = data.user;
        const role = user.role; 

        // 1. ADMIN PANEL
        if (role === 'ADMIN') {
            if(adminPanel) {
                adminPanel.classList.remove('hidden');
                loadApplicants();
            }
        } else {
            if(adminPanel) adminPanel.classList.add('hidden');
        }

        // 2. APPLICATION PANEL
        if(appPanel) {
            if (role === 'USER') {
                appPanel.classList.remove('hidden');
                btnApply.style.display = 'inline-block';
                if(appStatus) appStatus.style.display = 'none';
            } else if (role === 'PENDING') {
                appPanel.classList.remove('hidden');
                btnApply.style.display = 'none';
                if(appStatus) appStatus.style.display = 'block';
            } else {
                appPanel.classList.add('hidden');
            }
        }

        // 3. GUARDIAN SLIDER
        if (role === 'SECURITY' || role === 'ADMIN' || role === 'POLICE') {
            
            if(guardianContainer) {
                guardianContainer.innerHTML = `
                    <div id="guardianWrapper" class="guardian-toggle-wrapper">
                         <span id="guardianLabel" class="guardian-label">OFF DUTY</span>
                         <label class="switch">
                            <input type="checkbox" id="guardianToggle">
                            <span class="slider"></span>
                        </label>
                    </div>
                `;
                
                moveSwitchToMobileIfNeeded(); 
            }

            const toggle = document.getElementById('guardianToggle');
            const wrapper = document.getElementById('guardianWrapper');
            const label = document.getElementById('guardianLabel');

            if (user.is_guardian && toggle) {
                toggle.checked = true;
                updateVisuals(true);
            }

            if(toggle) {
                toggle.addEventListener('change', async (e) => {
                    const isChecked = e.target.checked;
                    updateVisuals(isChecked); 

                    try {
                        const res = await fetch('/api/user/toggle-guardian', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                        const d = await res.json();
                        updateVisuals(d.is_guardian);
                        toggle.checked = d.is_guardian;
                    } catch (err) { 
                        toggle.checked = !isChecked; 
                        updateVisuals(!isChecked);
                    }
                });
            }
        } else {
            if(guardianContainer) guardianContainer.innerHTML = "";
        }

    } catch (e) { console.error(e); }
}

function moveSwitchToMobileIfNeeded() {
    const desktopContainer = document.getElementById('guardian-controls-container');
    const mobileContainer = document.getElementById('guardian-controls-mobile');
    
    if (window.innerWidth < 768 && desktopContainer && mobileContainer) {
        while (desktopContainer.firstChild) {
            mobileContainer.appendChild(desktopContainer.firstChild);
        }
    }
}

function updateVisuals(isActive) {
    const wrapper = document.getElementById('guardianWrapper');
    const label = document.getElementById('guardianLabel');
    const statusText = document.getElementById('guardianStatusText');

    if (isActive) {
        if(wrapper) wrapper.classList.add('active-mode');
        if(label) label.innerText = "ON DUTY";
        
        if(statusText) {
            statusText.innerHTML = "Live Tracking Active";
            statusText.style.color = "#ec4899";
            statusText.style.fontWeight = "bold";
        }
        startLocationPulse();
    } else {
        if(wrapper) wrapper.classList.remove('active-mode');
        if(label) label.innerText = "OFF DUTY";

        if(statusText) {
            statusText.innerHTML = "System Standby";
            statusText.style.color = "#6b7280";
            statusText.style.fontWeight = "normal";
        }
        stopLocationPulse();
    }
}

window.openApplyModal = function() { 
    const modal = document.getElementById('modal-apply');
    if(modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
}
window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; }

// Apply Form
const applyForm = document.getElementById('form-apply');
if(applyForm) {
    applyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("nightguard_token");
        const body = {
            phone: document.getElementById('app-phone').value,
            idCard: document.getElementById('app-idcard').value,
            reason: document.getElementById('app-reason').value,
            experience: document.getElementById('app-exp').value
        };
        try {
            const res = await fetch('/api/user/apply', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
            if(res.ok) { alert("Application Sent!"); location.reload(); }
        } catch(e) { alert("Error sending application"); }
    });
}

// Admin Logic
async function loadApplicants() {
    const token = localStorage.getItem("nightguard_token");
    const container = document.getElementById('applicants-list');
    if(!container) return;

    const res = await fetch('/api/user/applicants', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if(data.applicants.length === 0) { 
        container.innerHTML = '<p style="font-size:13px; color: #6b7280; text-align: center; padding: 20px;">No pending applications.</p>'; 
        return; 
    }

    container.innerHTML = data.applicants.map(app => `
        <div style="background:white; padding:15px; border-radius:16px; display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px; border: 1px solid #f3f4f6;">
            <div>
                <div style="font-size:14px; font-weight: 700; color: #1f2937;">${app.full_name}</div>
                <div style="font-size:12px; color: #6b7280;">${app.email}</div>
            </div>
            <button onclick='reviewApplicant(${JSON.stringify(app)})' style="background:#ec4899; color:white; border:none; padding:8px 16px; border-radius:10px; font-size: 12px; font-weight: 700; cursor:pointer;">Review</button>
        </div>
    `).join('');
}

window.reviewApplicant = function(app) {
    const confirmApprove = confirm(`Review Application for ${app.full_name}\n\nReason: ${app.application_reason}\nExperience: ${app.experience}\n\nPress OK to APPROVE, Cancel to Ignore.`);
    if(confirmApprove) { processApp(app.id, 'approve'); }
}

async function processApp(id, type) {
    const token = localStorage.getItem("nightguard_token");
    const endpoint = type === 'approve' ? '/api/user/approve' : '/api/user/reject';
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ applicantId: id }) });
    if(res.ok) { alert("User Approved!"); loadApplicants(); }
}

// Location
function startLocationPulse() { if (locationInterval) return; sendLocationUpdate(); locationInterval = setInterval(sendLocationUpdate, 30000); }
function stopLocationPulse() { if (locationInterval) { clearInterval(locationInterval); locationInterval = null; } }

async function sendLocationUpdate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        const token = localStorage.getItem("nightguard_token");
        try { await fetch('/api/user/location', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ latitude, longitude }) }); } catch (e) {}
    });
}

window.addEventListener('resize', moveSwitchToMobileIfNeeded);