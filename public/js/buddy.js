// === WALKING BUDDY MODULE (FINAL) ===
let currentBuddyRouteId = null;
document.addEventListener('DOMContentLoaded', () => {
    // Verificăm dacă utilizatorul este logat
    if (localStorage.getItem('nightguard_token')) {
        // 1. Încarcă lista inițială
        loadNearbyBuddies();
        checkActiveWalk();

        // 2. Refresh automat la fiecare 30 secunde
        setInterval(loadNearbyBuddies, 30000);

        // 3. Activează ascultătorii pentru cereri live (Socket)
        initBuddySocketListeners();
    }
});

// ==========================================
// 1. LOGICA DE AFIȘARE (LISTĂ)
// ==========================================

async function loadNearbyBuddies() {
    const container = document.getElementById('buddy-matches-container');
    if (!container) return; // Dacă nu suntem pe dashboard, ieșim

    const token = localStorage.getItem("nightguard_token");

    // Încercăm să luăm locația din map.js, altfel punem 0 (backend-ul va returna oricum ultimele postări)
    const lat = window.userLat || 0;
    const lng = window.userLng || 0;

    try {
        const res = await fetch(`/api/buddy/nearby?lat=${lat}&lng=${lng}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.matches && data.matches.length > 0) {
            // Generăm HTML pentru fiecare coleg găsit
            container.innerHTML = data.matches.map(match => {
                // Formatăm ora (ex: 10:30 PM)
                const timeStr = new Date(match.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const ratingLabel = (match.avg_rating && match.avg_rating > 0) ? ` <span style="color:#f59e0b; font-weight:800;">⭐ ${match.avg_rating}</span>` : '';

                return `
                    <div style="background: white; padding: 10px; border-radius: 12px; border: 1px solid #e0f2fe; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 35px; height: 35px; background: #e0f2fe; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0284c7; font-weight: bold; font-size: 14px;">
                            ${match.full_name.charAt(0)}
                        </div>
                        <div>
                                <div style="font-size: 13px; font-weight: 700; color: #1f2937;">${match.full_name}${ratingLabel}</div>
                            <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px;">
                                <i class="ph-bold ph-arrow-right"></i> ${match.destination_name} 
                                <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${timeStr}</span>
                            </div>
                        </div>
                    </div>
                        <button onclick="requestJoin(${match.id})" style="background: #0ea5e9; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.2s;">
                        JOIN
                    </button>
                </div>
            `;
            }).join('');
        } else {
            // Starea goală (Empty State)
            container.innerHTML = `
                <div class="empty-state" style="padding: 15px; font-size: 12px; color: #64748b; text-align: center;">
                    <i class="ph ph-wind" style="font-size: 24px; margin-bottom: 5px; display: block; opacity: 0.5;"></i>
                    No active walkers nearby.<br>Be the first to post!
                </div>
            `;
        }
    } catch (e) { console.error("Error loading buddies:", e); }
}

// ==========================================
// 2. LOGICA DE POSTARE (FORMULAR)
// ==========================================

// Arată formularul
window.showPostRouteForm = function () {
    document.getElementById('buddy-list-view').classList.add('hidden');
    document.getElementById('buddy-post-view').classList.remove('hidden');
}

// Ascunde formularul
window.hidePostRouteForm = function () {
    document.getElementById('buddy-post-view').classList.add('hidden');
    document.getElementById('buddy-list-view').classList.remove('hidden');
}

// Trimite ruta la server
window.submitRoute = async function () {
    const dest = document.getElementById('buddy-dest').value;
    const time = document.getElementById('buddy-time').value;
    const token = localStorage.getItem("nightguard_token");

    if (!dest) return alert("Please enter a destination (e.g. 'Tudor Campus')");

    // Încercăm să luăm GPS-ul dacă nu e setat
    if (!window.userLat) {
        // Dacă nu avem locația din map.js, cerem permisiunea acum
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                window.userLat = pos.coords.latitude;
                window.userLng = pos.coords.longitude;
                // Reapelăm funcția după ce avem locația
                submitRoute();
            },
            () => {
                alert("Location is required to verify you are in the area.");
            }
        );
        return;
    }

    try {
        const res = await fetch('/api/buddy/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                startLat: window.userLat,
                startLng: window.userLng,
                destination: dest,
                timeOffset: parseInt(time)
            })
        });

        const result = await res.json();

        if (res.ok) {
            alert("✅ Route Posted! Wait for others to join you.");
            hidePostRouteForm();
            loadNearbyBuddies(); // Refresh la listă
        } else {
            alert("Error: " + result.error);
        }
    } catch (e) { console.error(e); }
}

// ==========================================
// 3. LOGICA SOCKET.IO (CERERI LIVE)
// ==========================================

// A. Trimite cererea de JOIN (Click pe butonul din listă)
window.requestJoin = function (routeId) {
    if (!window.socket || !window.socket.connected) {
        alert("⚠️ Connection lost. Please refresh the page.");
        return;
    }

    // Trimitem evenimentul la server
    window.socket.emit('buddy_join_request', { routeId });

    // Feedback vizual imediat
    alert("📩 Request sent! Waiting for approval...");
}

// B. Ascultători Socket (Inițializați la start)
function initBuddySocketListeners() {
    if (!window.socket) return;

    // --- CAZ 1: EȘTI PROPRIETARUL RUTEI ---
    // Cineva vrea să vină cu tine
    window.socket.on('buddy_request_received', (data) => {
        // 1. Populăm modalul cu datele solicitantului
        const nameEl = document.getElementById('req-name');
        const destEl = document.getElementById('req-dest');
        const modal = document.getElementById('modal-buddy-request');

        if (nameEl) {
            // Show name plus rating if available
            const rating = data.requesterRating;
            const ratingHtml = (rating && rating > 0) ? ` <span style="color:#f59e0b; font-weight:800;">⭐ ${rating}</span>` : '';
            nameEl.innerHTML = `${data.requesterName}${ratingHtml}`;
        }
        if (destEl) destEl.innerText = data.destination;

        // 2. Configurăm butonul de ACCEPT din modal
        const btnAccept = document.getElementById('btn-accept-buddy');
        if (btnAccept) {
            // Curățăm event listenerii vechi (clonând elementul)
            const newBtn = btnAccept.cloneNode(true);
            btnAccept.parentNode.replaceChild(newBtn, btnAccept);

            newBtn.onclick = function () {
                // Trimitem acceptul la server
                window.socket.emit('buddy_request_accepted', {
                    routeId: data.routeId,
                    requesterId: data.requesterId
                });
                modal.classList.add('hidden'); // Închidem modalul
            };
        }

        // 3. Arătăm modalul
        if (modal) modal.classList.remove('hidden');

        // Vibrație telefon
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    });

    // --- CAZ 2: EȘTI SOLICITANTUL ---
    // Ți-a fost acceptată cererea
    window.socket.on('buddy_request_confirmed', (data) => {
        // În loc de alert, deschidem chat-ul
        openBuddyChat(data.routeId);
        if (navigator.vibrate) navigator.vibrate([200]);
    });

    // UPDATE: Când ai acceptat pe cineva (Proprietar)
    window.socket.on('buddy_match_success', (data) => {
        openBuddyChat(data.routeId); // <--- DESCHIDE CHATUL AUTOMAT
    });
    window.socket.on('buddy_chat_receive', (data) => {
        appendMessageToUI({
            sender_id: data.senderId,
            message: data.message,
            created_at: data.timestamp
        });
    });
}
// În public/js/buddy.js

function openBuddyChat(routeId) {
    currentBuddyRouteId = routeId;

    // 1. Arată Modalul
    const chatModal = document.getElementById('modal-buddy-chat');
    const reqModal = document.getElementById('modal-buddy-request');

    if (chatModal) chatModal.classList.remove('hidden');
    if (reqModal) reqModal.classList.add('hidden');

    // 2. JOIN ROOM (FIXUL CRITIC PENTRU TELEFON)
    // Îi spunem serverului că am intrat în chat, ca să primim mesaje
    if (window.socket && window.socket.connected) {
        window.socket.emit('join_chat_room', { routeId });
        console.log("Asking server to join room:", routeId);
    }

    // 3. Încarcă Istoricul
    loadChatHistory(routeId);

    // 4. Focus pe input
    setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
    }, 100);
}
// Încarcă mesajele vechi
async function loadChatHistory(routeId) {
    const container = document.getElementById('chat-messages-area');
    container.innerHTML = '<div class="text-center text-muted" style="font-size:12px; margin-top:20px;">Secure channel established.</div>';

    const token = localStorage.getItem("nightguard_token");
    try {
        const res = await fetch(`/api/buddy/chat/${routeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.messages) {
            data.messages.forEach(msg => appendMessageToUI(msg));
        }
        scrollToBottom();
    } catch (e) { console.error(e); }
}

// Trimite mesaj (din formular)
window.sendBuddyMessage = function (e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();

    if (!text || !currentBuddyRouteId) return;

    // Emitere către server
    window.socket.emit('buddy_chat_send', {
        routeId: currentBuddyRouteId,
        message: text
    });

    input.value = ''; // Curăță inputul
    // Nota: Nu adăugăm manual în UI aici, așteptăm evenimentul 'buddy_chat_receive' de la server ca să fim siguri
}

// Adaugă bula de mesaj în HTML
function appendMessageToUI(msg) {
    const container = document.getElementById('chat-messages-area');
    const isMe = msg.sender_id === window.currentUserId; // Verificăm dacă eu am scris

    const bubbleHTML = `
        <div style="display: flex; justify-content: ${isMe ? 'flex-end' : 'flex-start'};">
            <div style="
                max-width: 75%; 
                padding: 10px 14px; 
                border-radius: 18px; 
                font-size: 14px; 
                line-height: 1.4;
                ${isMe ?
            'background: #0284c7; color: white; border-bottom-right-radius: 4px;' :
            'background: #e2e8f0; color: #1e293b; border-bottom-left-radius: 4px;'}
            ">
                ${msg.message}
            </div>
        </div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 2px; text-align: ${isMe ? 'right' : 'left'}; padding: 0 5px;">
            ${new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
    `;

    container.insertAdjacentHTML('beforeend', bubbleHTML);
    scrollToBottom();
}
function scrollToBottom() {
    const container = document.getElementById('chat-messages-area');
    if (!container) return;

    // Folosim un mic delay pentru a permite mobilului să randeze tastatura/layout-ul
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}
async function checkActiveWalk() {
    const token = localStorage.getItem("nightguard_token");
    const activeContainer = document.getElementById('active-walk-container');
    const listContainer = document.getElementById('buddy-list-view');

    if (!activeContainer) return;

    try {
        const res = await fetch('/api/buddy/active-walk', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.activeWalk) {
            // --- CAZ 1: AVEM CURSĂ ACTIVĂ ---

            // Ascundem lista, arătăm cardul activ
            listContainer.classList.add('hidden');
            activeContainer.classList.remove('hidden');

            // Store globally for later actions (rating)
            window.currentActiveWalk = data.activeWalk;
            document.getElementById('active-dest').innerText = data.activeWalk.destination_name;

            // Activăm butonul CHAT
            document.getElementById('btn-reopen-chat').onclick = function () {
                openBuddyChat(data.activeWalk.id);
            };

            // Activăm butonul END WALK (NOU)
            document.getElementById('btn-end-walk').onclick = function () {
                if (confirm("Are you sure you met up and want to end this session?")) {
                    endCurrentWalk(data.activeWalk.id);
                }
            };

            // Re-conectare la socket room dacă e matched
            if (window.socket && data.activeWalk.status === 'MATCHED') {
                window.socket.emit('join_chat_room', { routeId: data.activeWalk.id });
            }

            // Change visual style when matched/active (pink theme)
            if (data.activeWalk.status === 'MATCHED') {
                activeContainer.style.background = 'linear-gradient(135deg,#fff1f2,#ffe4f0)';
                activeContainer.style.borderLeft = '4px solid #ec4899';
            } else {
                activeContainer.style.background = 'white';
                activeContainer.style.borderLeft = '4px solid #0ea5e9';
            }

        } else {
            // --- CAZ 2: NU AVEM CURSĂ (Sau s-a terminat) ---
            // Ascundem cardul activ, arătăm lista ca să poți da REQUEST iar
            activeContainer.classList.add('hidden');
            listContainer.classList.remove('hidden');

            // Curățăm ID-ul curent
            currentBuddyRouteId = null;
        }
    } catch (e) { console.error(e); }
}

// Funcție nouă pentru a închide cursa
async function endCurrentWalk(routeId) {
    const token = localStorage.getItem("nightguard_token");
    try {
        const res = await fetch('/api/buddy/end-walk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ routeId })
        });

        const result = await res.json();
        if (res.ok) {
            alert("✅ Walk completed! Stay safe.");

            // Prefer server-provided partner info (more reliable)
            try {
                if (result && (result.partnerId || result.partnerName)) {
                    openRatingModal(result.partnerId, result.partnerName || 'Your buddy');
                } else {
                    // Fallback: try using cached activeWalk
                    const active = window.currentActiveWalk;
                    if (active) {
                        let partnerId = null;
                        let partnerName = 'Your buddy';
                        const me = window.currentUserId;
                        if (me && active.owner_id && active.buddy_id) {
                            if (parseInt(me) === parseInt(active.owner_id)) {
                                partnerId = active.buddy_id;
                                partnerName = active.buddy_name || partnerName;
                            } else {
                                partnerId = active.owner_id;
                                partnerName = active.owner_name || partnerName;
                            }
                        }

                        if (partnerId) openRatingModal(partnerId, partnerName);
                    }
                }
            } catch (e) { console.error(e); }

            // Re-verificăm statusul -> Serverul va zice că nu mai e active -> checkActiveWalk va afișa lista
            checkActiveWalk();
            loadNearbyBuddies(); // Refresh la lista de oameni din jur
        }
    } catch (e) { console.error(e); }
}

// ---------- Rating Modal Logic ----------
function openRatingModal(targetId, targetName) {
    const modal = document.getElementById('modal-rating');
    if (!modal) return;
    modal.dataset.targetId = targetId;
    document.getElementById('rating-target-name').innerText = targetName;
    document.getElementById('rating-comment').value = '';
    // reset stars
    Array.from(document.querySelectorAll('#rating-stars span')).forEach(s => s.textContent = '☆');
    modal.classList.remove('hidden');

    // attach star handlers
    document.querySelectorAll('#rating-stars span').forEach(el => {
        el.onclick = function () {
            const val = parseInt(el.dataset.star);
            Array.from(document.querySelectorAll('#rating-stars span')).forEach(s => {
                s.textContent = (parseInt(s.dataset.star) <= val) ? '★' : '☆';
            });
            modal.dataset.selectedStars = val;
        };
    });

    document.getElementById('btn-submit-rating').onclick = submitRating;
}

function closeRatingModal() {
    const modal = document.getElementById('modal-rating');
    if (modal) modal.classList.add('hidden');
}

function skipRating() {
    closeRatingModal();
}

async function submitRating() {
    const modal = document.getElementById('modal-rating');
    if (!modal) return;
    const targetId = modal.dataset.targetId;
    const stars = modal.dataset.selectedStars || 0;
    const comment = document.getElementById('rating-comment').value.trim();
    if (!targetId || !stars) return alert('Please select 1-5 stars');

    const token = localStorage.getItem('nightguard_token');
    try {
        const res = await fetch('/api/buddy/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ targetId: parseInt(targetId), stars: parseInt(stars), comment })
        });
        const data = await res.json();
        if (res.ok) {
            closeRatingModal();
            alert('Thanks for your feedback!');
            // Refresh lists to show new avg
            loadNearbyBuddies();
            checkActiveWalk();
        } else {
            alert('Error: ' + (data.error || 'Unable to save rating'));
        }
    } catch (e) { console.error(e); alert('Network error'); }
}