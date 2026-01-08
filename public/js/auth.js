// === AUTH & SESSION ===

// 1. Verifică sesiunea la încărcare
window.checkSession = function() {
    const token = localStorage.getItem("nightguard_token");
    
    // Selectăm elementele
    const landingView = document.getElementById("landing-view");
    const dashboardView = document.getElementById("dashboard-view");
    const bottomNav = document.getElementById("bottom-nav"); // Bara de jos
    const startOverlay = document.getElementById("start-overlay");

    if (token) {
        // === CAZ 1: UTILIZATOR LOGAT ===
        if(landingView) landingView.classList.add("hidden");      // Ascunde Login
        if(dashboardView) dashboardView.classList.remove("hidden"); // Arată Dashboard
        
        // AICI: Arată bara doar când ești logat
        if(bottomNav) bottomNav.classList.remove("hidden"); 
        
        // Încarcă datele utilizatorului
        loadUserProfile();
        
        // Inițializează modulele
        if(window.initGuardianLogic) window.initGuardianLogic();
        if(window.initSocketConnection) window.initSocketConnection();

        // Overlay pentru senzori (dacă e cazul)
        if (typeof nightGuardIoT !== 'undefined' && !nightGuardIoT.sensorsActive) {
            if(startOverlay) {
                startOverlay.style.display = "flex"; 
                startOverlay.classList.remove("hidden");
                const btnStart = document.getElementById("btn-start-app");
                if(btnStart) {
                    btnStart.onclick = async () => {
                        await nightGuardIoT.init();
                        startOverlay.style.display = "none"; 
                    };
                }
            }
        } else {
            if(startOverlay) startOverlay.style.display = "none";
        }

    } else {
        // === CAZ 2: UTILIZATOR NELOGAT (SAU LOGOUT) ===
        if(landingView) landingView.classList.remove("hidden");   // Arată Login
        if(dashboardView) dashboardView.classList.add("hidden");  // Ascunde Dashboard
        
        // === FIX CRITIC AICI ===
        // Ascundem bara de jos forțat dacă nu există token!
        if(bottomNav) {
            bottomNav.classList.add("hidden"); 
            bottomNav.style.display = 'none'; // Siguranță dublă
        }
        
        if(startOverlay) startOverlay.style.display = "none";
    }
};

window.initAuthForms = function() {
    const loginSection = document.getElementById("loginSection");
    const registerSection = document.getElementById("registerSection");
    const btnGoToRegister = document.getElementById("showRegister");
    const btnGoToLogin = document.getElementById("showLogin");

    if(btnGoToRegister) {
        btnGoToRegister.onclick = (e) => { 
            e.preventDefault(); 
            loginSection.classList.add("hidden"); 
            registerSection.classList.remove("hidden"); 
        };
    }

    if(btnGoToLogin) {
        btnGoToLogin.onclick = (e) => { 
            e.preventDefault(); 
            registerSection.classList.add("hidden"); 
            loginSection.classList.remove("hidden"); 
        };
    }

    // Login Submit
    const loginForm = document.getElementById("loginForm");
    if(loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            // Încercăm să pornim senzorii la login (best effort)
            if(typeof nightGuardIoT !== 'undefined') await nightGuardIoT.init();
            
            const email = document.getElementById("loginEmail").value;
            const password = document.getElementById("loginPassword").value;
            
            try {
                const response = await fetch('/api/auth/login', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ email, password }) 
                });
                const data = await response.json();
                
                if (response.ok) { 
                    localStorage.setItem("nightguard_token", data.token); 
                    window.checkSession(); // Asta va declanșa afișarea dashboard-ului și a barei
                } else { 
                    alert(data.error); 
                }
            } catch (err) { console.error(err); }
        });
    }

    // Register Submit
    const regForm = document.getElementById("registerForm");
    if(regForm) {
        regForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fullName = document.getElementById("registerFullName").value;
            const email = document.getElementById("registerEmail").value;
            const username = document.getElementById("registerUsername").value;
            const password = document.getElementById("registerPassword").value;
            const confirmPass = document.getElementById("registerConfirmPassword").value;
            
            if (password !== confirmPass) return alert("Passwords do not match");

            try {
                const response = await fetch('/api/auth/register', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ fullName, email, username, password }) 
                });
                const data = await response.json();
                if (response.ok) { 
                    localStorage.setItem("nightguard_token", data.token); 
                    window.checkSession(); 
                } else { alert(data.error); }
            } catch (err) { console.error(err); }
        });
    }

    // Logout Logic
    const handleLogout = () => { 
        localStorage.removeItem("nightguard_token");
        
        // Ascundem tot ce ține de user logat
        document.getElementById("dashboard-view").classList.add("hidden");
        const bottomNav = document.getElementById("bottom-nav");
        if(bottomNav) bottomNav.classList.add("hidden"); // Ascundem bara explicit
        
        // Arătăm login
        document.getElementById("landing-view").classList.remove("hidden");
        
        // Opțional: Refresh pentru a curăța starea JS
        window.location.reload(); 
    };
    
    const btnLogout = document.getElementById("logoutBtn");
    const btnLogoutMobile = document.getElementById("logoutBtnMobile");

    if(btnLogout) btnLogout.onclick = handleLogout;
    if(btnLogoutMobile) btnLogoutMobile.onclick = handleLogout;
};
   
async function loadUserProfile() {
    const token = localStorage.getItem("nightguard_token");
    if(!token) return;
    try {
        const response = await fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` }});
        if(response.ok) {
            const data = await response.json();
            const titleEl = document.getElementById("welcomeTitle");
            if(titleEl) titleEl.textContent = `Hello, ${data.user.username}`;
        }
    } catch (e) { console.error("Profile Error:", e); }
}