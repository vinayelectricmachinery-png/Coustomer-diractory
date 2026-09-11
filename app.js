// ============================================================
// VINAY ELECTRIC MACHINERY - CUSTOMER DIRECTORY
// Supabase database + application logic
// ============================================================

// ------------------------------------------------------------
// 1. SUPABASE CONFIGURATION
// ------------------------------------------------------------
// Supabase Dashboard -> Project Settings -> API
// Use your Project URL and Publishable key.
// DO NOT use the Secret/service_role key in a browser app.
// ------------------------------------------------------------

const SUPABASE_URL = "https://rzomjnhypjcpeyxgfwht.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8BOilVZ4Rp_BlSqWqWlcUQ_oF2k-9jV";

let db = null;
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
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
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
// 3. SHOP SWITCHING
// ------------------------------------------------------------

function setShop(shop) {
    currentShop = shop;

    $("shopTitle").textContent = shop;
    $("s1").classList.toggle("active", shop === "Shop 1");
    $("s2").classList.toggle("active", shop === "Shop 2");

    $("q").value = "";
    loadCustomers();
}

// ------------------------------------------------------------
// 4. ADD / EDIT FORM
// ------------------------------------------------------------

function openForm(item = null) {
    $("modal").classList.add("show");

    if (item) {
        $("formTitle").textContent = "Edit Customer";
        $("editId").value = item.id || "";
        $("date").value = item.date || getTodayISO();
        $("name").value = item.customer_name || "";
        $("mobile").value = item.mobile || "";
        $("village").value = item.village || "";
        $("description").value = item.Description || "";
        $("amount").value = item.amount || "";
    } else {
        $("formTitle").textContent = "New Customer";
        $("editId").value = "";
        $("date").value = getTodayISO();
        $("name").value = "";
        $("mobile").value = "";
        $("village").value = "";
        $("description").value = "";
        $("amount").value = "";
    }

    setTimeout(() => $("name").focus(), 100);
}

function closeForm() {
    $("modal").classList.remove("show");
}

// ------------------------------------------------------------
// 5. SAVE CUSTOMER
// ------------------------------------------------------------

async function saveCustomer(event) {
    event.preventDefault();

    if (!db) {
        alert(
            "Supabase is not connected.\n\n" +
            "Open app.js and enter your Supabase Project URL " +
            "and Publishable key at the top."
        );
        return;
    }

    const editId = $("editId").value.trim();

    const row = {
        shop: currentShop,
        customer_name: $("name").value.trim(),
        village: $("village").value.trim(),
        mobile: $("mobile").value.trim(),
        date: $("date").value,
        Description: $("description").value.trim(),
        amount: $("amount").value.trim()
    };

    if (!row.customer_name) {
        alert("Please enter customer name.");
        $("name").focus();
        return;
    }

    if (!row.village) {
        alert("Please enter address / village.");
        $("village").focus();
        return;
    }

    if (!row.Description) {
        alert("Please enter job description.");
        $("description").focus();
        return;
    }

    if (!row.amount) {
        alert("Please enter amount.");
        $("amount").focus();
        return;
    }

    const saveButton = document.querySelector(".save");
    saveButton.disabled = true;
    saveButton.textContent = "SAVING...";
    $("status").textContent = "Saving customer...";

    let result;

    try {
        if (editId) {
            result = await db
                .from("customers")
                .update(row)
                .eq("id", editId);
        } else {
            result = await db
                .from("customers")
                .insert(row);
        }
    } catch (error) {
        console.error("Supabase save exception:", error);
        result = { error };
    }

    saveButton.disabled = false;
    saveButton.textContent = "SAVE CUSTOMER";

    if (result.error) {
        console.error("Supabase save error:", result.error);
        $("status").textContent = "Save failed ❌";
        alert(
            "Could not save customer.\n\n" +
            result.error.message +
            "\n\nIf this is an RLS error, we need to configure the Supabase policies next."
        );
        return;
    }

    $("status").textContent = editId
        ? "Customer updated successfully ✓"
        : "Customer saved successfully ✓";

    closeForm();
    await loadCustomers();
}

// ------------------------------------------------------------
// 6. LOAD CUSTOMERS
// ------------------------------------------------------------

async function loadCustomers() {
    if (!db) {
        $("status").textContent = "Supabase not connected yet.";
        $("count").textContent = "0";
        $("total").textContent = "₹0";
        $("list").innerHTML = `
            <div class="empty">
                Add your Supabase Project URL and Publishable key in app.js.
            </div>
        `;
        return;
    }

    $("status").textContent = "Loading customers...";

    try {
        let query = db
            .from("customers")
            .select("*")
            .eq("shop", currentShop)
            .order("created_at", { ascending: false });

        const searchText = $("q").value.trim();

        if (searchText) {
            // Escape characters that have special meaning in PostgREST filters.
            const safeSearch = searchText
                .replace(/\\/g, "")
                .replace(/%/g, "")
                .replace(/,/g, " ")
                .trim();

            if (safeSearch) {
                query = query.or(
                    `customer_name.ilike.%${safeSearch}%,` +
                    `village.ilike.%${safeSearch}%,` +
                    `mobile.ilike.%${safeSearch}%,` +
                    `Description.ilike.%${safeSearch}%`
                );
            }
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        customerCache = data || [];
        window.customerCache = customerCache;

        updateStats();
        renderCustomers();

        $("status").textContent =
            `${customerCache.length} record${customerCache.length === 1 ? "" : "s"} found`;
    } catch (error) {
        console.error("Supabase load error:", error);
        $("status").textContent = "Load failed ❌";
        $("count").textContent = "0";
        $("total").textContent = "₹0";
        $("list").innerHTML = `
            <div class="empty">
                Unable to load customers.<br><br>
                ${escapeHTML(error.message || "Unknown error")}
            </div>
        `;
    }
}

// ------------------------------------------------------------
// 7. STATS
// ------------------------------------------------------------

function updateStats() {
    $("count").textContent = customerCache.length;

    const totalAmount = customerCache.reduce((sum, customer) => {
        const numericAmount = parseFloat(
            String(customer.amount || "")
                .replace(/,/g, "")
                .replace(/₹/g, "")
                .trim()
        );

        return sum + (Number.isFinite(numericAmount) ? numericAmount : 0);
    }, 0);

    $("total").textContent =
        "₹" + totalAmount.toLocaleString("en-IN");
}

// ------------------------------------------------------------
// 8. RENDER CUSTOMER CARDS
// ------------------------------------------------------------

function renderCustomers() {
    if (customerCache.length === 0) {
        $("list").innerHTML = `
            <div class="empty">
                No customers found in ${escapeHTML(currentShop)}.
            </div>
        `;
        return;
    }

    $("list").innerHTML = customerCache
        .map(createCustomerCard)
        .join("");
}

function createCustomerCard(customer) {
    const id = escapeHTML(customer.id || "");
    const name = escapeHTML(customer.customer_name || "Unknown");
    const mobile = escapeHTML(customer.mobile || "—");
    const village = escapeHTML(customer.village || "—");
    const description = escapeHTML(customer.Description || "—");
    const amount = escapeHTML(customer.amount || "0");
    const date = escapeHTML(customer.date || "—");

    let createdTime = "—";

    if (customer.created_at) {
        const parsed = new Date(customer.created_at);
        if (!Number.isNaN(parsed.getTime())) {
            createdTime = parsed.toLocaleString("en-IN");
        }
    }

    return `
        <div class="card">
            <div class="row">
                <div>
                    <div class="name">${name}</div>
                    <div class="meta">📞 ${mobile} · 📍 ${village}</div>
                </div>
                <div class="amount">₹${amount}</div>
            </div>

            <div class="desc">🔧 ${description}</div>
            <div class="meta">📅 ${date}</div>
            <div class="time">Created: ${escapeHTML(createdTime)}</div>

            <div class="actions">
                <button type="button" onclick="editById('${id}')">✏ Edit</button>
                <button type="button" onclick="deleteById('${id}')">🗑 Delete</button>
            </div>
        </div>
    `;
}

// ------------------------------------------------------------
// 9. EDIT CUSTOMER
// ------------------------------------------------------------

function editById(id) {
    const customer = customerCache.find(
        (item) => String(item.id) === String(id)
    );

    if (!customer) {
        alert("Customer record not found.");
        return;
    }

    openForm(customer);
}

// ------------------------------------------------------------
// 10. DELETE CUSTOMER
// ------------------------------------------------------------

async function deleteById(id) {
    if (!db) {
        alert("Supabase is not connected.");
        return;
    }

    const customer = customerCache.find(
        (item) => String(item.id) === String(id)
    );

    const customerName = customer?.customer_name || "this customer";

    if (!confirm(`Delete ${customerName}?\n\nThis action cannot be undone.`)) {
        return;
    }

    $("status").textContent = "Deleting customer...";

    try {
        const { error } = await db
            .from("customers")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }

        $("status").textContent = "Customer deleted ✓";
        await loadCustomers();
    } catch (error) {
        console.error("Supabase delete error:", error);
        $("status").textContent = "Delete failed ❌";
        alert("Could not delete customer.\n\n" + error.message);
    }
}

// ------------------------------------------------------------
// 11. HTML ESCAPING
// ------------------------------------------------------------

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// ------------------------------------------------------------
// 12. MODAL BEHAVIOUR
// ------------------------------------------------------------

$("modal").addEventListener("click", (event) => {
    if (event.target === $("modal")) {
        closeForm();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeForm();
    }
});

// ------------------------------------------------------------
// 13. START APP
// ------------------------------------------------------------

loadCustomers();
