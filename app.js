// ============================================================
// VINAY ELECTRIC MACHINERY - CUSTOMER DIRECTORY
// Supabase database + authentication + application logic
// ============================================================

// ------------------------------------------------------------
// 1. SUPABASE CONFIGURATION
// ------------------------------------------------------------

const SUPABASE_URL = "https://rzomjnhypjcpeyxgfwht.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_8BOilVZ4Rp_BlSqWqWlcUQ_oF2k-9jV";

let db = null;
let currentUser = null;
let currentShop = "Shop 1";
let customerCache = [];

const $ = (id) => document.getElementById(id);

function isSupabaseConfigured() {
    return (
        typeof window.supabase !== "undefined" &&
        SUPABASE_URL.startsWith("http") &&
        !SUPABASE_URL.includes("PASTE_YOUR") &&
        SUPABASE_PUBLISHABLE_KEY &&
        !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_YOUR")
    );
}

if (isSupabaseConfigured()) {
    db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );
}

// ------------------------------------------------------------
// 2. INITIAL UI
// ------------------------------------------------------------

function getTodayISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;

    return new Date(now.getTime() - offset)
        .toISOString()
        .slice(0, 10);
}

function updateToday() {
    const today = $("today");

    if (today) {
        today.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }
}

updateToday();

// ------------------------------------------------------------
// 3. AUTHENTICATION UI
// ------------------------------------------------------------

function showLoginScreen() {
    const loginScreen = $("loginScreen");
    const mainApp = $("mainApp");
    const appNav = $("appNav");

    if (loginScreen) loginScreen.style.display = "flex";
    if (mainApp) mainApp.style.display = "none";
    if (appNav) appNav.style.display = "none";
}

function showMainApp() {
    const loginScreen = $("loginScreen");
    const mainApp = $("mainApp");
    const appNav = $("appNav");

    if (loginScreen) loginScreen.style.display = "none";
    if (mainApp) mainApp.style.display = "block";
    if (appNav) appNav.style.display = "flex";
}

function setLoginStatus(message, isError = false) {
    const status = $("loginStatus");

    if (!status) return;

    status.textContent = message;
    status.style.color = isError ? "#d32f2f" : "";
}

// ------------------------------------------------------------
// 4. LOGIN
// ------------------------------------------------------------

async function login(event) {
    event.preventDefault();

    if (!db) {
        setLoginStatus(
            "Supabase is not configured.",
            true
        );
        return;
    }

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    if (!email || !password) {
        setLoginStatus(
            "Please enter email and password.",
            true
        );
        return;
    }

    const loginButton =
        document.querySelector("#loginForm button[type='submit']");

    if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = "LOGGING IN...";
    }

    setLoginStatus("Signing in...");

    try {
        const { data, error } =
            await db.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            throw error;
        }

        currentUser = data.user;

        setLoginStatus("Login successful ✓");

        showMainApp();

        await loadCustomers();

    } catch (error) {
        console.error("Supabase login error:", error);

        setLoginStatus(
            error.message || "Login failed.",
            true
        );
    } finally {
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = "LOGIN";
        }
    }
}

// ------------------------------------------------------------
// 5. LOGOUT
// ------------------------------------------------------------

async function logout() {
    if (!db) return;

    try {
        const { error } = await db.auth.signOut();

        if (error) {
            throw error;
        }

        currentUser = null;
        customerCache = [];

        $("list").innerHTML = "";
        $("count").textContent = "0";
        $("total").textContent = "₹0";

        showLoginScreen();

        if ($("loginEmail")) {
            $("loginEmail").value = "";
        }

        if ($("loginPassword")) {
            $("loginPassword").value = "";
        }

        setLoginStatus("");

    } catch (error) {
        console.error("Logout error:", error);

        alert(
            "Could not logout.\n\n" +
            error.message
        );
    }
}

// ------------------------------------------------------------
// 6. AUTH INITIALIZATION
// ------------------------------------------------------------

async function initializeAuthentication() {

    if (!db) {
        showLoginScreen();

        setLoginStatus(
            "Supabase is not configured.",
            true
        );

        return;
    }

    try {

        // Check existing login session
        const {
            data: { session },
            error
        } = await db.auth.getSession();

        if (error) {
            throw error;
        }

        if (session?.user) {

            currentUser = session.user;

            showMainApp();

            await loadCustomers();

        } else {

            currentUser = null;

            showLoginScreen();
        }

        // Watch login/logout changes
        db.auth.onAuthStateChange(
            async (event, session) => {

                console.log(
                    "Auth event:",
                    event
                );

                currentUser =
                    session?.user || null;

                if (currentUser) {

                    showMainApp();

                    // Avoid unnecessary duplicate work
                    if (
                        event === "SIGNED_IN" ||
                        event === "INITIAL_SESSION"
                    ) {
                        await loadCustomers();
                    }

                } else {

                    customerCache = [];

                    showLoginScreen();
                }
            }
        );

    } catch (error) {

        console.error(
            "Authentication initialization error:",
            error
        );

        showLoginScreen();

        setLoginStatus(
            "Could not initialize authentication.\n" +
            error.message,
            true
        );
    }
}

// ------------------------------------------------------------
// 7. SHOP SWITCHING
// ------------------------------------------------------------

function setShop(shop) {

    currentShop = shop;

    $("shopTitle").textContent = shop;

    $("s1").classList.toggle(
        "active",
        shop === "Shop 1"
    );

    $("s2").classList.toggle(
        "active",
        shop === "Shop 2"
    );

    $("q").value = "";

    loadCustomers();
}

// ------------------------------------------------------------
// 8. ADD / EDIT FORM
//
