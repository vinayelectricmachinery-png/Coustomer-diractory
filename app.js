// ============================================================
// VINAY ELECTRIC MACHINERY - CUSTOMER DIRECTORY
// Supabase Database + Authentication
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


// ------------------------------------------------------------
// 2. SUPABASE INITIALIZATION
// ------------------------------------------------------------

function isSupabaseConfigured() {
    return (
        typeof window.supabase !== "undefined" &&
        SUPABASE_URL.startsWith("http") &&
        SUPABASE_PUBLISHABLE_KEY &&
        !SUPABASE_URL.includes("PASTE_YOUR") &&
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
// 3. DATE
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


// ------------------------------------------------------------
// 4. LOGIN SCREEN
// ------------------------------------------------------------

function showLoginScreen() {

    const loginScreen = $("loginScreen");
    const mainApp = $("mainApp");
    const appNav = $("appNav");

    if (loginScreen) {
        loginScreen.style.display = "flex";
    }

    if (mainApp) {
        mainApp.style.display = "none";
    }

    if (appNav) {
        appNav.style.display = "none";
    }
}


function showMainApp() {

    const loginScreen = $("loginScreen");
    const mainApp = $("mainApp");
    const appNav = $("appNav");

    if (loginScreen) {
        loginScreen.style.display = "none";
    }

    if (mainApp) {
        mainApp.style.display = "block";
    }

    if (appNav) {
        appNav.style.display = "flex";
    }
}


function setLoginStatus(message, isError = false) {

    const status = $("loginStatus");

    if (!status) return;

    status.textContent = message;

    status.style.color = isError
        ? "#d32f2f"
        : "";
}


// ------------------------------------------------------------
// 5. LOGIN
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

    const emailInput = $("loginEmail");
    const passwordInput = $("loginPassword");

    if (!emailInput || !passwordInput) {

        console.error(
            "Login inputs were not found in index.html"
        );

        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {

        setLoginStatus(
            "Please enter email and password.",
            true
        );

        return;
    }

    const loginButton =
        document.querySelector(
            "#loginForm button[type='submit']"
        );

    if (loginButton) {

        loginButton.disabled = true;
        loginButton.textContent = "LOGGING IN...";
    }

    setLoginStatus("Signing in...");

    try {

        const { data, error } =
            await db.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            throw error;
        }

        currentUser = data.user;

        setLoginStatus(
            "Login successful ✓"
        );

        showMainApp();

        await loadCustomers();

    } catch (error) {

        console.error(
            "Supabase login error:",
            error
        );

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
// 6. LOGOUT
// ------------------------------------------------------------

async function logout() {

    if (!db) return;

    try {

        const { error } =
            await db.auth.signOut();

        if (error) {
            throw error;
        }

        currentUser = null;
        customerCache = [];

        if ($("list")) {
            $("list").innerHTML = "";
        }

        if ($("count")) {
            $("count").textContent = "0";
        }

        if ($("total")) {
            $("total").textContent = "₹0";
        }

        showLoginScreen();

        if ($("loginEmail")) {
            $("loginEmail").value = "";
        }

        if ($("loginPassword")) {
            $("loginPassword").value = "";
        }

        setLoginStatus("");

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        alert(
            "Could not logout.\n\n" +
            error.message
        );
    }
}


// ------------------------------------------------------------
// 7. AUTHENTICATION INITIALIZATION
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

        const {
            data,
            error
        } = await db.auth.getSession();

        if (error) {
            throw error;
        }

        const session = data.session;

        if (session && session.user) {

            currentUser = session.user;

            showMainApp();

            await loadCustomers();

        } else {

            currentUser = null;

            showLoginScreen();
        }

        // Listen for login/logout changes
        db.auth.onAuthStateChange(
            (event, session) => {

                console.log(
                    "Auth event:",
                    event
                );

                currentUser =
                    session?.user || null;

                if (currentUser) {

                    showMainApp();

                    if (
                        event === "SIGNED_IN" ||
                        event === "INITIAL_SESSION"
                    ) {

                        setTimeout(() => {
                            loadCustomers();
                        }, 0);
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
            "Could not initialize authentication. " +
            error.message,
            true
        );
    }
}


// ------------------------------------------------------------
// 8. SHOP SWITCHING
// ------------------------------------------------------------

function setShop(shop) {

    currentShop = shop;

    if ($("shopTitle")) {
        $("shopTitle").textContent = shop;
    }

    if ($("s1")) {
        $("s1").classList.toggle(
            "active",
            shop === "Shop 1"
        );
    }

    if ($("s2")) {
        $("s2").classList.toggle(
            "active",
            shop === "Shop 2"
        );
    }

    if ($("q")) {
        $("q").value = "";
    }

    loadCustomers();
}


// ------------------------------------------------------------
// 9. OPEN ADD / EDIT FORM
// ------------------------------------------------------------

function openForm(item = null) {

    if (!currentUser) {

        alert("Please login first.");

        return;
    }

    const modal = $("modal");

    if (!modal) return;

    modal.classList.add("show");

    if (item) {

        $("formTitle").textContent =
            "Edit Customer";

        $("editId").value =
            item.id || "";

        $("date").value =
            item.date || getTodayISO();

        $("name").value =
            item.customer_name || "";

        $("mobile").value =
            item.mobile || "";

        $("village").value =
            item.village || "";

        $("description").value =
            item.Description ||
            item.description ||
            "";

        $("amount").value =
            item.amount || "";

    } else {

        $("formTitle").textContent =
            "New Customer";

        $("editId").value = "";

        $("date").value =
            getTodayISO();

        $("name").value = "";

        $("mobile").value = "";

        $("village").value = "";

        $("description").value = "";

        $("amount").value = "";
    }

    setTimeout(() => {

        if ($("name")) {
            $("name").focus();
        }

    }, 100);
}


// ------------------------------------------------------------
// 10. CLOSE FORM
// ------------------------------------------------------------

function closeForm() {

    const modal = $("modal");

    if (modal) {
        modal.classList.remove("show");
    }
}


// ------------------------------------------------------------
// 11. SAVE CUSTOMER
// ------------------------------------------------------------

async function saveCustomer(event) {

    event.preventDefault();

    if (!db) {

        alert(
            "Supabase is not connected."
        );

        return;
    }

    if (!currentUser) {

        alert(
            "Your login session has expired.\n\n" +
            "Please login again."
        );

        showLoginScreen();

        return;
    }

    const editId =
        $("editId").value.trim();

    const customerName =
        $("name").value.trim();

    const village =
        $("village").value.trim();

    const mobile =
        $("mobile").value.trim();

    const date =
        $("date").value;

    const description =
        $("description").value.trim();

    const amount =
        $("amount").value.trim();

    if (!customerName) {

        alert(
            "Please enter customer name."
        );

        return;
    }

    const row = {

        shop: currentShop,

        customer_name:
            customerName,

        village:
            village,

        mobile:
            mobile,

        date:
            date,

        Description:
            description,

        amount:
            amount
    };

    const saveButton =
        document.querySelector(".save");

    if (saveButton) {

        saveButton.disabled = true;
        saveButton.textContent = "SAVING...";
    }

    if ($("status")) {
        $("status").textContent =
            "Saving customer...";
    }

    try {

        let result;

        if (editId) {

            result =
                await db
                    .from("customers")
                    .update(row)
                    .eq("id", editId)
                    .eq(
                        "user_id",
                        currentUser.id
                    );

        } else {

            row.user_id =
                currentUser.id;

            result =
                await db
                    .from("customers")
                    .insert(row);
        }

        if (result.error) {
            throw result.error;
        }

        closeForm();

        await loadCustomers();

    } catch (error) {

        console.error(
            "Supabase save error:",
            error
        );

        alert(
            "Could not save customer.\n\n" +
            error.message
        );

        if ($("status")) {
            $("status").textContent =
                "Save failed ❌";
        }

    } finally {

        if (saveButton) {

            saveButton.disabled = false;
            saveButton.textContent = "SAVE";
        }
    }
}


// ------------------------------------------------------------
// 12. LOAD CUSTOMERS
// ------------------------------------------------------------

async function loadCustomers() {

    if (!db) {

        if ($("status")) {
            $("status").textContent =
                "Supabase is not connected.";
        }

        return;
    }

    if (!currentUser) {

        if ($("status")) {
            $("status").textContent =
                "Please login.";
        }

        if ($("count")) {
            $("count").textContent = "0";
        }

        if ($("total")) {
            $("total").textContent = "₹0";
        }

        if ($("list")) {
            $("list").innerHTML = "";
        }

        return;
    }

    if ($("status")) {
        $("status").textContent =
            "Loading customers...";
    }

    try {

        let query =
            db
                .from("customers")
                .select("*")
                .eq(
                    "user_id",
                    currentUser.id
                )
                .eq(
                    "shop",
                    currentShop
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        const search =
            $("q")
                ? $("q").value.trim()
                : "";

        if (search) {

            query = query.or(
                `customer_name.ilike.%${search}%,village.ilike.%${search}%,mobile.ilike.%${search}%,Description.ilike.%${search}%`
            );
        }

        const {
            data,
            error
        } = await query;

        if (error) {
            throw error;
        }

        customerCache =
            data || [];

        window.customerCache =
            customerCache;

        updateStats();

        renderCustomers();

        if ($("status")) {

            $("status").textContent =
                `${customerCache.length} record${customerCache.length === 1 ? "" : "s"} found`;
        }

    } catch (error) {

        console.error(
            "Supabase load error:",
            error
        );

        if ($("status")) {
            $("status").textContent =
                "Load failed ❌";
        }

        if ($("count")) {
            $("count").textContent = "0";
        }

        if ($("total")) {
            $("total").textContent = "₹0";
        }

        if ($("list")) {

            $("list").innerHTML = `
                <div class="empty">
                    Unable to load customers.<br><br>
                    ${escapeHTML(
                        error.message ||
                        "Unknown error"
                    )}
                </div>
            `;
        }
    }
}


// ------------------------------------------------------------
// 13. SEARCH
// ------------------------------------------------------------

function searchCustomers() {
    loadCustomers();
}


// ------------------------------------------------------------
// 14. UPDATE STATISTICS
// ------------------------------------------------------------

function updateStats() {

    const count =
        customerCache.length;

    let total = 0;

    customerCache.forEach(
        customer => {

            const value =
                parseFloat(
                    String(
                        customer.amount || "0"
                    ).replace(
                        /[^0-9.-]/g,
                        ""
                    )
                );

            if (!isNaN(value)) {
                total += value;
            }
        }
    );

    if ($("count")) {
        $("count").textContent =
            count;
    }

    if ($("total")) {

        $("total").textContent =
            "₹" +
            total.toLocaleString(
                "en-IN"
            );
    }
}


// ------------------------------------------------------------
// 15. RENDER CUSTOMERS
// ------------------------------------------------------------

function renderCustomers() {

    const list = $("list");

    if (!list) return;

    if (!customerCache.length) {

        list.innerHTML = `
            <div class="empty">
                No customers found.
            </div>
        `;

        return;
    }

    list.innerHTML =
        customerCache
            .map(
                customer =>
                    createCustomerCard(
                        customer
                    )
            )
            .join("");
}


// ------------------------------------------------------------
// 16. CREATE CUSTOMER CARD
// ------------------------------------------------------------

function createCustomerCard(customer) {

    const id =
        customer.id || "";

    const name =
        customer.customer_name ||
        "Unnamed Customer";

    const village =
        customer.village ||
        "";

    const mobile =
        customer.mobile ||
        "";

    const date =
        customer.date ||
        "";

    const description =
        customer.Description ||
        customer.description ||
        "";

    const amount =
        customer.amount ||
        "";

    return `
        <div class="customer-card">

            <div class="customer-main">

                <div class="customer-name">
                    ${escapeHTML(name)}
                </div>

                ${
                    village
                        ? `
                            <div class="customer-village">
                                📍 ${escapeHTML(village)}
                            </div>
                          `
                        : ""
                }

                ${
                    mobile
                        ? `
                            <div class="customer-mobile">
                                📞 ${escapeHTML(mobile)}
                            </div>
                          `
                        : ""
                }

                ${
                    description
                        ? `
                            <div class="customer-description">
                                ${escapeHTML(description)}
                            </div>
                          `
                        : ""
                }

            </div>

            <div class="customer-side">

                ${
                    amount
                        ? `
                            <div class="customer-amount">
                                ₹${escapeHTML(amount)}
                            </div>
                          `
                        : ""
                }

                ${
                    date
                        ? `
                            <div class="customer-date">
                                ${escapeHTML(date)}
                            </div>
                          `
                        : ""
                }

                <div class="customer-actions">

                    <button
                        type="button"
                        onclick="editById('${escapeJS(id)}')"
                    >
                        EDIT
                    </button>

                    <button
             
