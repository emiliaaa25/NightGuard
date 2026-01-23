//HISTORY & AUDIO

window.openHistoryModal = async function() {
    const modal = document.getElementById('modal-history');
    const list = document.getElementById('history-list');
    const token = localStorage.getItem("nightguard_token");

    if (!modal || !list) return;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    list.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; padding: 40px; color: #9ca3af;">
            <div class="loader-ring" style="width:24px; height:24px; border-width:3px; margin-bottom:12px;"></div>
            <p style="font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px;">Loading Archives...</p>
        </div>
    `;

    try {
        const res = await fetch('/api/user/history', { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        const data = await res.json();

        if (!data.history || data.history.length === 0) {
            list.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color: #9ca3af;">
                    <i class="ph ph-folder-dashed" style="font-size: 40px; margin-bottom: 10px; opacity:0.5;"></i>
                    <p style="font-size:13px; font-weight:600;">No records found</p>
                </div>
            `;
            return;
        }

        list.innerHTML = data.history.map(item => {
            const dateObj = new Date(item.created_at);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit' });
            
            // Audio Player 
            let audioSection = '';
            if (item.audio_url) {
                audioSection = `
                    <div style="margin-top:16px; padding:12px; background: rgba(255,255,255,0.6); border-radius:12px; border: 1px solid rgba(236, 72, 153, 0.1);">
                        <div style="display:flex; align-items:center; gap:6px; font-size:10px; font-weight:700; color:#db2777; margin-bottom:8px; letter-spacing:0.5px; text-transform:uppercase;">
                            <i class="ph-fill ph-microphone"></i> Voice Evidence
                        </div>
                        <audio controls src="/uploads/${item.audio_url}" style="width:100%; height:28px; border-radius: 4px; outline:none; filter: hue-rotate(300deg);"></audio>
                    </div>
                `;
            } else {
                audioSection = `
                    <div style="margin-top:12px; display:flex; align-items:center; gap:6px; font-size:11px; color:#9ca3af; font-weight:500;">
                        <i class="ph ph-prohibit" style="font-size:14px;"></i> No audio data
                    </div>
                `;
            }

            // Google Maps Link
            const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;

            return `
                <div style="
                    background: white; 
                    border-radius: 20px; 
                    padding: 20px; 
                    margin-bottom: 16px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.02); 
                    border: 1px solid #f3f4f6;
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="position:absolute; left:0; top:0; bottom:0; width:4px; background: linear-gradient(to bottom, #ec4899, #8b5cf6);"></div>

                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px; padding-left:10px;">
                        
                        <div>
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                                <i class="ph-fill ph-warning-octagon" style="color:#ec4899; font-size:18px;"></i>
                                <h4 style="margin:0; font-size:15px; font-weight:800; color:#1f2937;">SOS ALERT</h4>
                            </div>
                            <span style="font-size:11px; color:#9ca3af; font-weight:500; margin-left: 26px;">ID #${item.id}</span>
                        </div>

                        <div style="text-align:right;">
                            <div style="font-size:13px; font-weight:700; color:#374151;">${timeStr}</div>
                            <div style="font-size:11px; color:#9ca3af;">${dateStr}</div>
                        </div>
                    </div>

                    <div style="padding-left:10px;">
                        <a href="${mapLink}" target="_blank" style="
                            display:inline-flex; align-items:center; gap:6px; 
                            text-decoration:none; 
                            background: linear-gradient(135deg, #f0f9ff, #e0f2fe); 
                            padding: 8px 14px; 
                            border-radius: 30px; 
                            font-size: 11px; font-weight: 700; 
                            color: #0284c7; 
                            border: 1px solid #bae6fd;
                            transition: transform 0.1s;
                        ">
                            <i class="ph-fill ph-map-pin"></i> View Location
                        </a>
                    </div>

                    <div style="padding-left:10px;">
                        ${audioSection}
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
        list.innerHTML = `<p style="color:#ef4444; text-align:center; font-size:13px;">Error loading data.</p>`;
    }
}