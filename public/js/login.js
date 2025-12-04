// Form toggle functionality
const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");
const showLoginLink = document.getElementById("showLogin");
const showRegisterLink = document.getElementById("showRegister");

if (showLoginLink) {
    showLoginLink.addEventListener("click", (e) => {
        e.preventDefault();
        registerSection.classList.remove("active");
        loginSection.classList.add("active");
    });
}

if (showRegisterLink) {
    showRegisterLink.addEventListener("click", (e) => {
        e.preventDefault();
        loginSection.classList.remove("active");
        registerSection.classList.add("active");
    });
}

// LOGIN FORM SUBMIT
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        const errorMsg = document.getElementById("loginError");
        const successMsg = document.getElementById("loginSuccess");

        errorMsg.textContent = "";
        successMsg.textContent = "";

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                errorMsg.textContent = data.error || "Login failed";
                return;
            }

            successMsg.textContent = "Login successful! Redirecting...";
            localStorage.setItem("token", data.token);

            setTimeout(() => {
                window.location.href = '/';
            }, 1200);

        } catch (err) {
            errorMsg.textContent = "Server error. Try again later.";
        }
    });
}

// REGISTER FORM SUBMIT
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fullName = document.getElementById("registerFullName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const username = document.getElementById("registerUsername").value.trim();
        const password = document.getElementById("registerPassword").value.trim();
        const confirmPassword = document.getElementById("registerConfirmPassword").value.trim();
        const agreeTerms = document.getElementById("agreeTerms").checked;

        const errorMsg = document.getElementById("registerError");
        const successMsg = document.getElementById("registerSuccess");

        errorMsg.textContent = "";
        successMsg.textContent = "";

        // Validation
        if (password !== confirmPassword) {
            errorMsg.textContent = "Passwords do not match.";
            return;
        }

        if (!agreeTerms) {
            errorMsg.textContent = "You must accept the Terms and Privacy Policy.";
            return;
        }

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, fullName, password })
            });

            const data = await response.json();

            if (!response.ok) {
                errorMsg.textContent = data.error || "Registration failed";
                return;
            }

            successMsg.textContent = "Account created! Redirecting to login...";

            setTimeout(() => {
                registerSection.classList.remove("active");
                loginSection.classList.add("active");
                // Clear form
                registerForm.reset();
            }, 1500);

        } catch (err) {
            errorMsg.textContent = "Server error. Try again later.";
        }
    });
}
