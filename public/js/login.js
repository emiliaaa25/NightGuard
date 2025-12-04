// Tabs switching
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authTitle = document.getElementById("authTitle");

// Switch to Login
loginTab.addEventListener("click", () => {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    authTitle.textContent = "Welcome Back";
});

// Switch to Register
registerTab.addEventListener("click", () => {
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    authTitle.textContent = "Create Your Account";
});

// LOGIN FORM SUBMIT
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
            window.location.href = '/profile';
        }, 1200);

    } catch (err) {
        errorMsg.textContent = "Server error. Try again later.";
    }
});

// REGISTER FORM SUBMIT
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const full_name = document.getElementById("registerFullName").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const confirmPassword = document.getElementById("registerConfirmPassword").value.trim();
    const agreeTerms = document.getElementById("agreeTerms").checked;

    const errorMsg = document.getElementById("registerError");
    const successMsg = document.getElementById("registerSuccess");

    errorMsg.textContent = "";
    successMsg.textContent = "";

    if (password !== confirmPassword) {
        errorMsg.textContent = "Passwords do not match.";
        return;
    }

    if (!agreeTerms) {
        errorMsg.textContent = "You must agree to the Terms.";
        return;
    }

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, full_name, password })
        });

        const data = await response.json();

        if (!response.ok) {
            errorMsg.textContent = data.error || "Registration failed";
            return;
        }

        successMsg.textContent = "Account created! You can sign in now.";

        setTimeout(() => {
            loginTab.click();
        }, 1500);

    } catch (err) {
        errorMsg.textContent = "Server error. Try again later.";
    }
});
