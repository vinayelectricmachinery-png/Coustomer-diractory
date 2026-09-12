/*
  1) Put your Supabase Project URL and ANON/PUBLISHABLE KEY below.
  2) NEVER put the Supabase service_role/secret key in this file.
*/
const SUPABASE_URL = "https://rzomjnhypjcpeyxgfwht.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8BOilVZ4Rp_BlSqWqWlcUQ_oF2k-9jV";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
let customers = [];

document.addEventListener("DOMContentLoaded", async () => {
  $("date").value = new Date().toISOString().slice(0,10);
  $("loginForm").addEventListener("submit", login);
  $("logoutBtn").addEventListener("click", logout);
  $("mobileLogout").addEventListener("click", logout);
  $("addBtn").addEventListener("click", openAdd);
  $("heroAddBtn").addEventListener("click", openAdd);
  $("customerAddBtn").addEventListener("click", openAdd);
  $("closeModal").addEventListener("click", closeModal);
  $("customerForm").addEventListener("submit", saveCustomer);
  $("searchInput").addEventListener("input", renderAll);
  $("heroReportBtn").addEventListener("click", () => showSection("analysis"));
  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => showSection(btn.dataset.section)));

  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    await startApp(data.session);
  } else {
    $("loginScreen").classList.remove("hidden");
  }

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (session) await startApp(session);
    else {
      $("app").classList.add("hidden");
      $("loginScreen").classList.remove("hidden");
    }
  });
});

async function login(e) {
  e.preventDefault();
  $("loginMessage").textContent = "Logging in...";
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });
  $("loginMessage").textContent = error ? error.message : "";
}

async function logout() {
  await supabaseClient.auth.signOut();
}

async function startApp(session) {
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("userEmail").textContent = session.user.email || "Admin";
  await loadCustomers();
}

async function loadCustomers() {
  const { data, error } = await supabaseClient
    .from("customers")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    alert("Customers load नहीं हुए: " + error.message);
    return;
  }
  customers = data || [];
  renderAll();
}

function parseAmount(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function customerDate(c) {
  const raw = c.date || c.created_at;
  const d = raw ? new Date(raw) : new Date();
  return isNaN(d) ? new Date() : d;
}

function monthKey(c) {
  const d = customerDate(c);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
}

function monthLabel(key) {
  const [y,m] = key.split("-").map(Number);
  return new Date(y,m-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"});
}

function initials(name) {
  return String(name || "C").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
}

function cardClass(i) {
  return ["blue","yellow-card","orange-card","green-card","purple-card","pink-card"][i % 6];
}

function renderAll() {
  const q = $("searchInput").value.toLowerCase().trim();
  const filtered = customers.filter(c => [c.customer_name,c.mobile,c.village,c.Description,c.description].join(" ").toLowerCase().includes(q));
  renderCards($("customerCards"), filtered);
  renderCards($("customerCards2"), filtered);
  $("emptyState").classList.toggle("hidden", filtered.length !== 0);
  updateStats();
  renderMonthly();
}

function renderCards(container, list) {
  container.innerHTML = "";
  list.forEach((c) => {
    const i = customers.indexOf(c);
    const description = c.Description ?? c.description ?? "";
    const dateText = c.date ? new Date(c.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : new Date(c.created_at).toLocaleDateString("en-IN");
    const article = document.createElement("article");
    article.className = `card ${cardClass(i)}`;
    article.innerHTML = `
      <div class="card-head">
        <div class="avatar">${initials(c.customer_name)}</div>
        <div>
          <h3>${esc(c.customer_name || "Unnamed Customer")}</h3>
          <div class="meta">☎ ${esc(c.mobile || "No contact")}</div>
          <div class="meta">⌖ ${esc(c.village || "No address")}</div>
        </div>
        <button class="dots">⋮</button>
      </div>
      <div class="description">
        <div class="description-label">Description</div>
        <p>${esc(description || "No description added")}</p>
      </div>
      <div class="amount-row">
        <div><div class="amount-label">AMOUNT</div><div class="amount">${money(parseAmount(c.amount))}</div></div>
        <div class="date">${esc(dateText)}</div>
      </div>
      <div class="buttons">
        <a class="call" href="tel:${esc(c.mobile || "")}">☎ Call</a>
        <button class="details" data-id="${c.id}">✏ Edit</button>
      </div>`;
    article.querySelector(".details").addEventListener("click",()=>openEdit(c));
    container.appendChild(article);
  });
}

function updateStats() {
  $("totalCustomers").textContent = customers.length;
  $("totalCollection").textContent = money(customers.reduce((s,c)=>s+parseAmount(c.amount),0));
  const map = {};
  customers.forEach(c=>{
    const k=monthKey(c);
    if(!map[k]) map[k]={amount:0,count:0};
    map[k].amount += parseAmount(c.amount);
    map[k].count++;
  });
  const entries=Object.entries(map);
  if(!entries.length){
    $("bestMonth").textContent="₹0"; $("bestMonthName").textContent="No data yet";
    $("mostCustomerMonth").textContent="0"; $("mostCustomerMonthName").textContent="No data yet";
    return;
  }
  entries.sort((a,b)=>b[1].amount-a[1].amount);
  $("bestMonth").textContent=money(entries[0][1].amount);
  $("bestMonthName").textContent=monthLabel(entries[0][0]);
  entries.sort((a,b)=>b[1].count-a[1].count);
  $("mostCustomerMonth").textContent=entries[0][1].count;
  $("mostCustomerMonthName").textContent=monthLabel(entries[0][0]);
}

function renderMonthly() {
  const map={};
  customers.forEach(c=>{
    const k=monthKey(c);
    if(!map[k]) map[k]={amount:0,count:0};
    map[k].amount+=parseAmount(c.amount); map[k].count++;
  });
  const rows=Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0]));
  $("monthlyRows").innerHTML = rows.length ? rows.map(([k,v])=>`
    <div class="month-row">
      <div><span>MONTH</span><br><b>${monthLabel(k)}</b></div>
      <div><span>COLLECTION</span><br><b>${money(v.amount)}</b></div>
      <div><span>CUSTOMERS</span><br><b>${v.count}</b></div>
    </div>`).join("") : `<div class="empty">Monthly data अभी available नहीं है।</div>`;
}

async function saveCustomer(e) {
  e.preventDefault();
  $("formMessage").textContent = "Saving...";
  const user = (await supabaseClient.auth.getUser()).data.user;
  const id = $("customerId").value;
  const payload = {
    shop: "Vinay Electric Machinery",
    customer_name: $("customerName").value.trim(),
    village: $("village").value.trim(),
    mobile: $("mobile").value.trim(),
    date: $("date").value,
    Description: $("description").value.trim(),
    amount: $("amount").value.trim(),
    user_id: user.id
  };

  let result;
  if (id) result = await supabaseClient.from("customers").update(payload).eq("id",id).eq("user_id",user.id);
  else result = await supabaseClient.from("customers").insert(payload);

  if (result.error) {
    $("formMessage").textContent = result.error.message;
    return;
  }
  closeModal();
  await loadCustomers();
}

function openAdd() {
  $("modalTitle").textContent="Add Customer";
  $("customerForm").reset();
  $("customerId").value="";
  $("date").value=new Date().toISOString().slice(0,10);
  $("formMessage").textContent="";
  $("customerModal").classList.remove("hidden");
}

function openEdit(c) {
  $("modalTitle").textContent="Edit Customer";
  $("customerId").value=c.id;
  $("customerName").value=c.customer_name || "";
  $("mobile").value=c.mobile || "";
  $("village").value=c.village || "";
  $("description").value=c.Description ?? c.description ?? "";
  $("amount").value=parseAmount(c.amount);
  $("date").value=c.date || new Date(c.created_at).toISOString().slice(0,10);
  $("formMessage").textContent="";
  $("customerModal").classList.remove("hidden");
}

function closeModal(){ $("customerModal").classList.add("hidden"); }

function showSection(section) {
  ["dashboard","customers","analysis"].forEach(s=>$(`${s}Section`).classList.toggle("hidden",s!==section));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.section===section));
}

function esc(v){
  return String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}
