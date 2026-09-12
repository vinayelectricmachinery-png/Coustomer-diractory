/ ============================================================
// VINAY ELECTRIC MACHINERY - CUSTOMER DIRECTORY
// Supabase Database + Authentication
// ============================================================
// ------------------------------------------------------------
// 1. SUPABASE CONFIGURATION
// ------------------------------------------------------------
const SUPABASE_URL =
    "https://rzomjnhypjcpeyxgfwht.supabase.co";
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
    const offset =
        now.getTimezoneOffset() * 60000;
    return new Date(
        now.getTime() - offset
    )
        .toISOString()
        .slice(0, 10);
}
function updateToday() {
    const today = $("today");
    if (today) {
        today.textContent =
            new Date().toLocaleDateString(
                "en-IN",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            );
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
function setLoginStatus(
    message,
    isError = false
) {
    const status = $("loginStatus");
    if (!status) return;
    status.textContent = message;
    status.style.color =
        isError
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
    const emailInput =
        $("loginEmail");
    const passwordInput =
        $("loginPassword");
    if (!emailInput || !passwordInput) {
        console.error(
            "Login inputs were not found in index.html"
        );
        return;
    }
    const email =
        emailInput.value.trim();
    const password =
        passwordInput.value;
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
        loginButton.textContent =
            "LOGGING IN...";
    }
    setLoginStatus(
        "Signing in..."
    );
    try {
        const {
            data,
            error
        } =
            await db.auth.signInWithPassword({
                email: email,
                password: password
            });
        if (error) {
            throw error;
        }
        currentUser =
            data.user;
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
            error.message ||
            "Login failed.",
            true
        );
    } finally {
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent =
                "LOGIN";
        }
    }
}
// ------------------------------------------------------------
// 6. LOGOUT
// ------------------------------------------------------------
async function logout() {
    if (!db) return;
    try {
        const {
            error
        } =
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
        } =
            await db.auth.getSession();
        if (error) {
            throw error;
        }
        const session =
            data.session;
        if (
            session &&
            session.user
        ) {
            currentUser =
                session.user;
            showMainApp();
            await loadCustomers();
        } else {
            currentUser = null;
            showLoginScreen();
        }
        db.auth.onAuthStateChange(
            (
                event,
                session
            ) => {
                console.log(
                    "Auth event:",
                    event
                );
                currentUser =
                    session?.user ||
                    null;
                if (currentUser) {
                    showMainApp();
                    if (
                        event ===
                            "SIGNED_IN" ||
                        event ===
                            "INITIAL_SESSION"
                    ) {
                        setTimeout(
                            () => {
                                loadCustomers();
                            },
                            0
                        );
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
        $("shopTitle").textContent =
            shop;
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
        alert(
            "Please login first."
        );
        return;
    }
    const modal =
        $("modal");
    if (!modal) return;
    modal.classList.add("show");
    if (item) {
        $("formTitle").textContent =
            "Edit Customer";
        $("editId").value =
            item.id || "";
        $("date").value =
            item.date ||
            getTodayISO();
        $("name").value =
            item.customer_name ||
            "";
        $("mobile").value =
            item.mobile ||
            "";
        $("village").value =
            item.village ||
            "";
        $("description").value =
            item.Description ||
            item.description ||
            "";
        $("amount").value =
            item.amount ||
            "";
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
    setTimeout(
        () => {
            if ($("name")) {
                $("name").focus();
            }
        },
        100
    );
}
// ------------------------------------------------------------
// 10. CLOSE FORM
// ------------------------------------------------------------
function closeForm() {
    const modal =
        $("modal");
    if (modal) {
        modal.classList.remove(
            "show"
        );
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
        $("description")
            .value
            .trim();
    const amount =
        $("amount")
            .value
            .trim();
    if (!customerName) {
        alert(
            "Please enter customer name."
        );
        return;
    }
    const row = {
        shop:
            currentShop,
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
        document.querySelector(
            ".save"
        );
    if (saveButton) {
        saveButton.disabled =
            true;
        saveButton.textContent =
            "SAVING...";
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
                    .eq(
                        "id",
                        editId
                    )
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
            saveButton.disabled =
                false;
            saveButton.textContent =
                "SAVE";
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
            $("count").textContent =
                "0";
        }
        if ($("total")) {
            $("total").textContent =
                "₹0";
        }
        if ($("list")) {
            $("list").innerHTML =
                "";
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
                    "date",
                    {
                        ascending: false
                    }
                );
        const search =
            $("q")
                ? $("q")
                    .value
                    .trim()
                : "";
        if (search) {
            query =
                query.or(
                    `customer_name.ilike.%${search}%,village.ilike.%${search}%,mobile.ilike.%${search}%,Description.ilike.%${search}%`
                );
        }
        const {
            data,
            error
        } =
            await query;
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
        // Refresh analysis whenever data changes
        updateAnalysis();
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
            $("count").textContent =
                "0";
        }
        if ($("total")) {
            $("total").textContent =
                "₹0";
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
                parseAmount(
                    customer.amount
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
    const list =
        $("list");
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
function createCustomerCard(
    customer
) {
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
                    ${
                        mobile
                            ? `
                                <button
                                    type="button"
                                    class="call-btn"
                                    onclick="callCustomer('${escapeJS(mobile)}')"
                                    title="Call ${escapeHTML(name)}"
                                >
                                    <span class="call-icon">
                                        ☎
                                    </span>
                                    CALL
                                </button>
                              `
                            : ""
                    }
                    <button
                        type="button"
                        onclick="editById('${escapeJS(id)}')"
                    >
                        EDIT
                    </button>
                    <button
                        type="button"
                        onclick="deleteById('${escapeJS(id)}')"
                    >
                        DELETE
                    </button>
                </div>
            </div>
        </div>
    `;
}
// ------------------------------------------------------------
// 17. CALL CUSTOMER
// ------------------------------------------------------------
function callCustomer(
    mobile
) {
    if (!mobile) {
        alert(
            "No mobile number available."
        );
        return;
    }
    const cleanNumber =
        String(mobile)
            .replace(
                /[^0-9+]/g,
                ""
            );
    if (!cleanNumber) {
        alert(
            "Invalid mobile number."
        );
        return;
    }
    window.location.href =
        `tel:${cleanNumber}`;
}
// ------------------------------------------------------------
// 18. EDIT CUSTOMER
// ------------------------------------------------------------
function editById(id) {
    const item =
        customerCache.find(
            customer =>
                String(
                    customer.id
                ) ===
                String(id)
        );
    if (!item) {
        alert(
            "Customer record not found."
        );
        return;
    }
    openForm(item);
}
// ------------------------------------------------------------
// 19. DELETE CUSTOMER
// ------------------------------------------------------------
async function deleteById(id) {
    if (
        !db ||
        !currentUser
    ) {
        alert(
            "Please login first."
        );
        return;
    }
    const item =
        customerCache.find(
            customer =>
                String(
                    customer.id
                ) ===
                String(id)
        );
    const name =
        item?.customer_name ||
        "this customer";
    const confirmed =
        confirm(
            `Delete ${name}?\n\nThis cannot be undone.`
        );
    if (!confirmed) {
        return;
    }
    try {
        const {
            error
        } =
            await db
                .from("customers")
                .delete()
                .eq(
                    "id",
                    id
                )
                .eq(
                    "user_id",
                    currentUser.id
                );
        if (error) {
            throw error;
        }
        await loadCustomers();
    } catch (error) {
        console.error(
            "Delete error:",
            error
        );
        alert(
            "Could not delete customer.\n\n" +
            error.message
        );
    }
}
// ============================================================
// 20. ANALYSIS
// ============================================================
// ------------------------------------------------------------
// Convert amount safely
// ------------------------------------------------------------
function parseAmount(
    value
) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }
    const number =
        parseFloat(
            String(value)
                .replace(
                    /[^0-9.-]/g,
                    ""
                )
        );
    return isNaN(number)
        ? 0
        : number;
}
// ------------------------------------------------------------
// Month names
// ------------------------------------------------------------
const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];
// ------------------------------------------------------------
// Get years available in data
// ------------------------------------------------------------
function getAvailableYears() {
    const years = new Set();
    customerCache.forEach(
        customer => {
            if (!customer.date) {
                return;
            }
            const date =
                new Date(
                    customer.date
                );
            if (
                !isNaN(
                    date.getTime()
                )
            ) {
                years.add(
                    date.getFullYear()
                );
            }
        }
    );
    const currentYear =
        new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years)
        .sort(
            (a, b) =>
                b - a
        );
}
// ------------------------------------------------------------
// Monthly analysis
// ------------------------------------------------------------
function getMonthlyAnalysis(
    year
) {
    const months =
        Array.from(
            {
                length: 12
            },
            () => ({
                customers: 0,
                jobs: 0,
                amount: 0
            })
        );
    customerCache.forEach(
        customer => {
            if (!customer.date) {
                return;
            }
            const date =
                new Date(
                    customer.date
                );
            if (
                isNaN(
                    date.getTime()
                )
            ) {
                return;
            }
            if (
                date.getFullYear() !==
                Number(year)
            ) {
                return;
            }
            const month =
                date.getMonth();
            months[month].customers += 1;
            months[month].jobs += 1;
            months[month].amount +=
                parseAmount(
                    customer.amount
                );
        }
    );
    return months;
}
// ------------------------------------------------------------
// Open analysis page
// ------------------------------------------------------------
function openAnalysis() {
    createAnalysisUI();
    const home =
        $("homeSection");
    const analysis =
        $("analysisSection");
    if (home) {
        home.style.display =
            "none";
    }
    if (analysis) {
        analysis.style.display =
            "block";
        analysis.classList.add(
            "active"
        );
    }
    updateAnalysis();
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}
// ------------------------------------------------------------
// Close analysis page
// ------------------------------------------------------------
function closeAnalysis() {
    const analysis =
        $("analysisSection");
    if (analysis) {
        analysis.style.display =
            "none";
        analysis.classList.remove(
            "active"
        );
    }
    const home =
        $("homeSection");
    if (home) {
        home.style.display =
            "";
    }
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}
// ------------------------------------------------------------
// Build Analysis UI
// ------------------------------------------------------------
function createAnalysisUI() {
    if (
        $("analysisSection")
    ) {
        return;
    }
    const mainApp =
        $("mainApp");
    if (!mainApp) {
        return;
    }
    const section =
        document.createElement(
            "section"
        );
    section.id =
        "analysisSection";
    section.className =
        "analysis";
    section.style.display =
        "none";
    section.innerHTML = `
        <div class="analysis-header">
            <div>
                <div class="section-label">
                    BUSINESS INSIGHTS
                </div>
                <h2>
                    Analysis
                </h2>
                <p>
                    ${escapeHTML(currentShop)}
                    performance
                </p>
            </div>
            <button
                type="button"
                class="analysis-close"
                onclick="closeAnalysis()"
            >
                ✕
            </button>
        </div>
        <div class="analysis-filters">
            <select
                id="analysisYear"
                class="month-select"
                onchange="updateAnalysis()"
            ></select>
        </div>
        <div
            class="analysis-summary"
            id="analysisSummary"
        >
            <div class="analysis-box customers">
                <span>
                    CUSTOMERS
                </span>
                <strong id="analysisCustomers">
                    0
                </strong>
                <small>
                    Total customer records
                </small>
            </div>
            <div class="analysis-box jobs">
                <span>
                    JOBS
                </span>
                <strong id="analysisJobs">
                    0
                </strong>
                <small>
                    Repair jobs
                </small>
            </div>
            <div class="analysis-box collection">
                <span>
                    COLLECTION
                </span>
                <strong id="analysisCollection">
                    ₹0
                </strong>
                <small>
                    Total billed amount
                </small>
            </div>
            <div class="analysis-box pending">
                <span>
                    AVG / JOB
                </span>
                <strong id="analysisAverage">
                    ₹0
                </strong>
                <small>
                    Average amount
                </small>
            </div>
        </div>
        <div
            class="analysis-highlight"
            id="analysisHighlight"
        >
        </div>
        <div class="chart-card">
            <div class="chart-card-header">
                <div>
                    <strong>
                        Customers by Month
                    </strong>
                    <small>
                        Monthly customer activity
                    </small>
                </div>
            </div>
            <div class="chart-container">
                <canvas
                    id="customerChart"
                ></canvas>
            </div>
        </div>
        <div class="chart-card">
            <div class="chart-card-header">
                <div>
                    <strong>
                        Collection by Month
                    </strong>
                    <small>
                        Monthly billed amount
                    </small>
                </div>
            </div>
            <div class="chart-container">
                <canvas
                    id="collectionChart"
                ></canvas>
            </div>
        </div>
        <div class="chart-card">
            <div class="chart-card-header">
                <div>
                    <strong>
                        Month-to-Month Details
                    </strong>
                    <small>
                        Complete yearly breakdown
                    </small>
                </div>
            </div>
            <div
                class="analysis-months"
                id="analysisMonths"
            ></div>
        </div>
    `;
    mainApp.appendChild(
        section
    );
}
// ------------------------------------------------------------
// Update analysis
// ------------------------------------------------------------
function updateAnalysis() {
    createAnalysisUI();
    const yearSelect =
        $("analysisYear");
    if (!yearSelect) {
        return;
    }
    const years =
        getAvailableYears();
    const selectedYear =
        yearSelect.value ||
        String(
            new Date()
                .getFullYear()
        );
    yearSelect.innerHTML =
        years
            .map(
                year => `
                    <option
                        value="${year}"
                        ${
                            String(year) ===
                            String(selectedYear)
                                ? "selected"
                                : ""
                        }
                    >
                        ${year}
                    </option>
                `
            )
            .join("");
    const year =
        Number(
            yearSelect.value
        );
    const monthly =
        getMonthlyAnalysis(
            year
        );
    let totalCustomers = 0;
    let totalJobs = 0;
    let totalCollection = 0;
    monthly.forEach(
        month => {
            totalCustomers +=
                month.customers;
            totalJobs +=
                month.jobs;
            totalCollection +=
                month.amount;
        }
    );
    const average =
        totalJobs > 0
            ? totalCollection /
              totalJobs
            : 0;
    if ($("analysisCustomers")) {
        $("analysisCustomers")
            .textContent =
            totalCustomers;
    }
    if ($("analysisJobs")) {
        $("analysisJobs")
            .textContent =
            totalJobs;
    }
    if ($("analysisCollection")) {
        $("analysisCollection")
            .textContent =
            formatCurrency(
                totalCollection
            );
    }
    if ($("analysisAverage")) {
        $("analysisAverage")
            .textContent =
            formatCurrency(
                average
            );
    }
    updateAnalysisHighlights(
        monthly,
        year
    );
    renderAnalysisMonths(
        monthly
    );
    drawBarChart(
        "customerChart",
        monthly.map(
            month =>
                month.customers
        ),
        MONTH_NAMES.map(
            name =>
                name.substring(
                    0,
                    3
                )
        ),
        "customers"
    );
    drawBarChart(
        "collectionChart",
        monthly.map(
            month =>
                month.amount
        ),
        MONTH_NAMES.map(
            name =>
                name.substring(
                    0,
                    3
                )
        ),
        "amount"
    );
}
// ------------------------------------------------------------
// Analysis highlights
// ------------------------------------------------------------
function updateAnalysisHighlights(
    monthly,
    year
) {
    let highestCustomers =
        0;
    let highestCustomerMonth =
        "-";
    let highestCollection =
        0;
    let highestCollectionMonth =
        "-";
    monthly.forEach(
        (month, index) => {
            if (
                month.customers >
                highestCustomers
            ) {
                highestCustomers =
                    month.customers;
                highestCustomerMonth =
                    MONTH_NAMES[index];
            }
            if (
                month.amount >
                highestCollection
            ) {
                highestCollection =
                    month.amount;
                highestCollectionMonth =
                    MONTH_NAMES[index];
            }
        }
    );
    const highlight =
        $("analysisHighlight");
    if (!highlight) {
        return;
    }
    if (
        highestCustomers === 0 &&
        highestCollection === 0
    ) {
        highlight.innerHTML = `
            <div>
                <strong>
                    No data for ${year}
                </strong>
                <span>
                    Add some customer records to see your business analysis.
                </span>
            </div>
        `;
        return;
    }
    highlight.innerHTML = `
        <div>
            <strong>
                📈 Best Customer Month
            </strong>
            <span>
                ${escapeHTML(
                    highestCustomerMonth
                )}
                —
                ${highestCustomers}
                customer
                ${
                    highestCustomers === 1
                        ? ""
                        : "s"
                }
            </span>
        </div>
        <div>
            <strong>
                💰 Best Collection Month
            </strong>
            <span>
                ${escapeHTML(
                    highestCollectionMonth
                )}
                —
                ${formatCurrency(
                    highestCollection
                )}
            </span>
        </div>
    `;
}
// ------------------------------------------------------------
// Monthly detail cards
// ------------------------------------------------------------
function renderAnalysisMonths(
    monthly
) {
    const container =
        $("analysisMonths");
    if (!container) {
        return;
    }
    container.innerHTML =
        monthly
            .map(
                (
                    month,
                    index
                ) => {
                    return `
                        <div
                            class="analysis-month"
                        >
                            <div>
                                <strong>
                                    ${MONTH_NAMES[index]}
                                </strong>
                                <small>
                                    ${
                                        month.customers
                                    }
                                    customer${
                                        month.customers === 1
                                            ? ""
                                            : "s"
                                    }
                                </small>
                            </div>
                            <div>
                                <strong>
                                    ${
                                        formatCurrency(
                                            month.amount
                                        )
                                    }
                                </strong>
                                <small>
                                    ${
                                        month.jobs
                                    }
                                    job${
                                        month.jobs === 1
                                            ? ""
                                            : "s"
                                    }
                                </small>
                            </div>
                        </div>
                    `;
                }
            )
            .join("");
}
// ------------------------------------------------------------
// Currency formatter
// ------------------------------------------------------------
function formatCurrency(
    value
) {
    return (
        "₹" +
        Number(
            value || 0
        ).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        )
    );
}
// ------------------------------------------------------------
// Canvas bar chart
// ------------------------------------------------------------
function drawBarChart(
    canvasId,
    values,
    labels,
    type
) {
    const canvas =
        $(canvasId);
    if (!canvas) {
        return;
    }
    const container =
        canvas.parentElement;
    const width =
        Math.max(
            container?.clientWidth ||
            330,
            280
        );
    const height = 230;
    const ratio =
        window.devicePixelRatio ||
        1;
    canvas.width =
        width * ratio;
    canvas.height =
        height * ratio;
    canvas.style.width =
        width + "px";
    canvas.style.height =
        height + "px";
    const ctx =
        canvas.getContext(
            "2d"
        );
    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );
    ctx.clearRect(
        0,
        0,
        width,
        height
    );
    const maxValue =
        Math.max(
            ...values,
            1
        );
    const padding = {
        top: 20,
        right: 10,
        bottom: 45,
        left: 45
    };
    const chartWidth =
        width -
        padding.left -
        padding.right;
    const chartHeight =
        height -
        padding.top -
        padding.bottom;
    const barWidth =
        chartWidth /
        values.length *
        0.58;
    values.forEach(
        (
            value,
            index
        ) => {
            const x =
                padding.left +
                (
                    index +
                    0.5
                ) *
                (
                    chartWidth /
                    values.length
                ) -
                barWidth / 2;
            const barHeight =
                (
                    value /
                    maxValue
                ) *
                chartHeight;
            const y =
                padding.top +
                chartHeight -
                barHeight;
            // Bar
            ctx.beginPath();
            ctx.roundRect(
                x,
                y,
                barWidth,
                Math.max(
                    barHeight,
                    2
                ),
                6
            );
            ctx.fillStyle =
                type ===
                "amount"
                    ? "#8f9cf4"
                    : "#7ac7b7";
            ctx.fill();
            // Value
            ctx.fillStyle =
                "#4b5563";
            ctx.font =
                "600 10px Plus Jakarta Sans, sans-serif";
            ctx.textAlign =
                "center";
            const displayValue =
                type === "amount"
                    ? formatShortCurrency(
                        value
                    )
                    : String(
                        value
                    );
            ctx.fillText(
                displayValue,
                x +
                    barWidth /
                    2,
                Math.max(
                    y - 7,
                    12
                )
            );
            // Month
            ctx.fillStyle =
                "#7b8494";
            ctx.font =
                "500 10px Plus Jakarta Sans, sans-serif";
            ctx.fillText(
                labels[index],
                x +
                    barWidth /
                    2,
                height -
                    17
            );
        }
    );
}
// ------------------------------------------------------------
// Short currency for graph
// ------------------------------------------------------------
function formatShortCurrency(
    value
) {
    if (value >= 100000) {
        return (
            "₹" +
            (
                value /
                100000
            ).toFixed(1) +
            "L"
        );
    }
    if (value >= 1000) {
        return (
            "₹" +
            (
                value /
                1000
            ).toFixed(1) +
            "K"
        );
    }
    return (
        "₹" +
        Math.round(
            value
        )
    );
}
// ------------------------------------------------------------
// Refresh charts when screen size changes
// ------------------------------------------------------------
window.addEventListener(
    "resize",
    () => {
        const analysis =
            $("analysisSection");
        if (
            analysis &&
            analysis.style.display !==
                "none"
        ) {
            updateAnalysis();
        }
    }
);
// ============================================================
// 21. NAVIGATION SUPPORT
// ============================================================
// ------------------------------------------------------------
// Go Home
// ------------------------------------------------------------
function openHome() {
    closeAnalysis();
    const home =
        $("homeSection");
    if (home) {
        home.style.display =
            "";
    }
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}
// ------------------------------------------------------------
// Add button
// ------------------------------------------------------------
function openAddCustomer() {
    closeAnalysis();
    openForm();
}
// ------------------------------------------------------------
// Search button
// ------------------------------------------------------------
function openSearch() {
    closeAnalysis();
    const search =
        $("q");
    if (search) {
        search.focus();
        search.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}
// ------------------------------------------------------------
// Setup navigation buttons
// ------------------------------------------------------------
function setupNavigation() {
    const nav =
        $("appNav");
    if (!nav) {
        return;
    }
    // Existing buttons with data-action
    nav.addEventListener(
        "click",
        event => {
            const button =
                event.target.closest(
                    "button"
                );
            if (!button) {
                return;
            }
            const action =
                button.dataset.action;
            if (!action) {
                return;
            }
            if (
                action ===
                "home"
            ) {
                openHome();
            }
            if (
                action ===
                "add"
            ) {
                openAddCustomer();
            }
            if (
                action ===
                "search"
            ) {
                openSearch();
            }
            if (
                action ===
                "analysis"
            ) {
                openAnalysis();
            }
            if (
                action ===
                "logout"
            ) {
                logout();
            }
        }
    );
}
// ------------------------------------------------------------
// Make analysis globally available
// ------------------------------------------------------------
window.openAnalysis =
    openAnalysis;
window.closeAnalysis =
    closeAnalysis;
window.openHome =
    openHome;
window.openAddCustomer =
    openAddCustomer;
window.openSearch =
    openSearch;
window.callCustomer =
    callCustomer;
window.updateAnalysis =
    updateAnalysis;
// ============================================================
// 22. HTML ESCAPE
// ============================================================
function escapeHTML(
    value
) {
    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}
function escapeJS(
    value
) {
    return String(
        value ?? ""
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            '\\"'
        )
        .replace(
            /\n/g,
            "\\n"
        )
        .replace(
            /\r/g,
            "\\r"
        );
}
// ============================================================
// 23. MODAL EVENTS
// ============================================================
document.addEventListener(
    "DOMContentLoaded",
    () => {
        updateToday();
        const modal =
            $("modal");
        if (modal) {
            modal.addEventListener(
                "click",
                event => {
                    if (
                        event.target ===
                        modal
                    ) {
                        closeForm();
                    }
                }
            );
        }
        const loginForm =
            $("loginForm");
        if (loginForm) {
            loginForm.addEventListener(
                "submit",
                login
            );
        }
        const customerForm =
            $("customerForm");
        if (customerForm) {
            customerForm.addEventListener(
                "submit",
                saveCustomer
            );
        }
        const searchInput =
            $("q");
        if (searchInput) {
            searchInput.addEventListener(
                "input",
                () => {
                    loadCustomers();
                }
            );
        }
        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key ===
                    "Escape"
                ) {
                    closeForm();
                }
            }
        );
        // Create analysis structure
        createAnalysisUI();
        // Navigation
        setupNavigation();
        // Start authentication
        initializeAuthentication();
    }
);
