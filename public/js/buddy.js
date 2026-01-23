// === WALKING BUDDY MODULE ===
let currentBuddyRouteId = null;
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('nightguard_token')) {
        loadNearbyBuddies();
        checkActiveWalk();
        setInterval(loadNearbyBuddies, 30000);
        initBuddySocketListeners();
    }
});

async function loadNearbyBuddies() {
    const container = document.getElementById('buddy-matches-container');
    if (!container) return; 

    const token = localStorage.getItem("nightguard_token");

    const lat = window.userLat || 0;
    const lng = window.userLng || 0;

    try {
        const res = await fetch(`/api/buddy/nearby?lat=${lat}&lng=${lng}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.matches && data.matches.length > 0) {
            container.innerHTML = data.matches.map(match => {
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
            container.innerHTML = `
                <div class="empty-state" style="padding: 15px; font-size: 12px; color: #64748b; text-align: center;">
                    <i class="ph ph-wind" style="font-size: 24px; margin-bottom: 5px; display: block; opacity: 0.5;"></i>
                    No active walkers nearby.<br>Be the first to post!
                </div>
            `;
        }
    } catch (e) { console.error("Error loading buddies:", e); }
}


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
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                window.userLat = pos.coords.latitude;
                window.userLng = pos.coords.longitude;
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
            loadNearbyBuddies(); 
        } else {
            alert("Error: " + result.error);
        }
    } catch (e) { console.error(e); }
}

window.requestJoin = function (routeId) {
    if (!window.socket || !window.socket.connected) {
        alert("⚠️ Connection lost. Please refresh the page.");
        return;
    }

    window.socket.emit('buddy_join_request', { routeId });
    alert("📩 Request sent! Waiting for approval...");
}

function initBuddySocketListeners() {
    if (!window.socket) return;
    window.socket.on('buddy_request_received', (data) => {
        const nameEl = document.getElementById('req-name');
        const destEl = document.getElementById('req-dest');
        const modal = document.getElementById('modal-buddy-request');

        if (nameEl) {
            const rating = data.requesterRating;
            const ratingHtml = (rating && rating > 0) ? ` <span style="color:#f59e0b; font-weight:800;">⭐ ${rating}</span>` : '';
            nameEl.innerHTML = `${data.requesterName}${ratingHtml}`;
        }
        if (destEl) destEl.innerText = data.destination;

        const btnAccept = document.getElementById('btn-accept-buddy');
        if (btnAccept) {
            const newBtn = btnAccept.cloneNode(true);
            btnAccept.parentNode.replaceChild(newBtn, btnAccept);

            newBtn.onclick = function () {
                window.socket.emit('buddy_request_accepted', {
                    routeId: data.routeId,
                    requesterId: data.requesterId
                });
                modal.classList.add('hidden'); 
            };
        }

        if (modal) modal.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    });

    window.socket.on('buddy_request_confirmed', (data) => {
        openBuddyChat(data.routeId);
        if (navigator.vibrate) navigator.vibrate([200]);
    });

    window.socket.on('buddy_match_success', (data) => {
        openBuddyChat(data.routeId); 
    });
    window.socket.on('buddy_chat_receive', (data) => {
        appendMessageToUI({
            sender_id: data.senderId,
            message: data.message,
            created_at: data.timestamp
        });
    });
}

function openBuddyChat(routeId) {
    currentBuddyRouteId = routeId;

    const chatModal = document.getElementById('modal-buddy-chat');
    const reqModal = document.getElementById('modal-buddy-request');

    if (chatModal) chatModal.classList.remove('hidden');
    if (reqModal) reqModal.classList.add('hidden');

    if (window.socket && window.socket.connected) {
        window.socket.emit('join_chat_room', { routeId });
        console.log("Asking server to join room:", routeId);
    }

    loadChatHistory(routeId);
    setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
    }, 100);
}
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

window.sendBuddyMessage = function (e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();

    if (!text || !currentBuddyRouteId) return;

    window.socket.emit('buddy_chat_send', {
        routeId: currentBuddyRouteId,
        message: text
    });

    input.value = ''; 
}

function appendMessageToUI(msg) {
    const container = document.getElementById('chat-messages-area');
    const isMe = msg.sender_id === window.currentUserId; 

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
            listContainer.classList.add('hidden');
            activeContainer.classList.remove('hidden');

            window.currentActiveWalk = data.activeWalk;
            document.getElementById('active-dest').innerText = data.activeWalk.destination_name;

            document.getElementById('btn-reopen-chat').onclick = function () {
                openBuddyChat(data.activeWalk.id);
            };

            document.getElementById('btn-end-walk').onclick = function () {
                if (confirm("Are you sure you met up and want to end this session?")) {
                    endCurrentWalk(data.activeWalk.id);
                }
            };

            if (window.socket && data.activeWalk.status === 'MATCHED') {
                window.socket.emit('join_chat_room', { routeId: data.activeWalk.id });
            }

            if (data.activeWalk.status === 'MATCHED') {
                activeContainer.style.background = 'linear-gradient(135deg,#fff1f2,#ffe4f0)';
                activeContainer.style.borderLeft = '4px solid #ec4899';
            } else {
                activeContainer.style.background = 'white';
                activeContainer.style.borderLeft = '4px solid #0ea5e9';
            }

        } else {
            activeContainer.classList.add('hidden');
            listContainer.classList.remove('hidden');

            currentBuddyRouteId = null;
        }
    } catch (e) { console.error(e); }
}

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

            try {
                if (result && (result.partnerId || result.partnerName)) {
                    openRatingModal(result.partnerId, result.partnerName || 'Your buddy');
                } else {
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

            checkActiveWalk();
            loadNearbyBuddies(); 
        }
    } catch (e) { console.error(e); }
}

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