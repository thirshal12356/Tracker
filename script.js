/* =========================================================
   InternPass — Student Internship Finder & Application Tracker
   Pure HTML + CSS + JavaScript. No frameworks, no build step.
   Data is saved in the browser's localStorage — this is the
   "backend" (works offline, persists between visits/refreshes).
========================================================= */

const NS = "internpass:";

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function storageSet(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (e) {
    console.error("storage set failed", key, e);
  }
}

const STATUS_ORDER = ["Applied", "Shortlisted", "Interview", "Offer"];
const STATUS_META = {
  Applied: { color: "#7C6A46", bg: "#F1E9D6" },
  Shortlisted: { color: "#175653", bg: "#D9EDEA" },
  Interview: { color: "#8A5A18", bg: "#F5E3C4" },
  Offer: { color: "#2E6B44", bg: "#DCEFE1" },
  Rejected: { color: "#A33327", bg: "#F6DAD6" },
};

const COMPANIES = [
  { id: "c1", name: "9Dots Software Academy", role: "Frontend Development Intern", location: "Surandai, TN", domain: "Web Development", stipend: "Unpaid / Certificate", deadline: "Rolling" },
  { id: "c2", name: "Zoho Corporation", role: "Software Trainee Intern", location: "Chennai, TN", domain: "Full Stack", stipend: "₹15,000/mo", deadline: "20 Sep 2026" },
  { id: "c3", name: "Freshworks", role: "QA Intern", location: "Chennai, TN", domain: "Testing", stipend: "₹12,000/mo", deadline: "05 Sep 2026" },
  { id: "c4", name: "TCS iON", role: "Data Analytics Intern (Remote)", location: "Remote", domain: "Data Analytics", stipend: "Certificate", deadline: "Rolling" },
  { id: "c5", name: "Sparkout Tech Solutions", role: "React Developer Intern", location: "Coimbatore, TN", domain: "Web Development", stipend: "₹8,000/mo", deadline: "30 Aug 2026" },
  { id: "c6", name: "Wipro TalentNext", role: "Java Full Stack Intern", location: "Bengaluru, KA", domain: "Full Stack", stipend: "₹18,000/mo", deadline: "12 Sep 2026" },
];

/* ---------------- App state ---------------- */
let state = {
  mailId: null,
  profile: {},
  applications: [],
  enquiries: [],
  enquiryPrefill: null,
};

/* ---------------- Init ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  const auth = storageGet("auth", null);
  if (auth) {
    loginSuccess(auth.mailId);
  }
  bindStaticEvents();
  renderCompanyDomainFilter();
});

function bindStaticEvents() {
  document.getElementById("login-btn").addEventListener("click", handleLogin);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("login-password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });

  document.querySelectorAll(".nav-link[data-page], .bottom-link[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => goToPage(btn.dataset.page));
  });
  document.querySelectorAll(".quick-card[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => goToPage(btn.dataset.goto));
  });

  document.getElementById("save-profile-btn").addEventListener("click", saveProfile);
  document.getElementById("company-search").addEventListener("input", renderCompanies);
  document.getElementById("company-domain-filter").addEventListener("change", renderCompanies);
  document.getElementById("send-enquiry-btn").addEventListener("click", sendEnquiry);
  document.getElementById("add-application-btn").addEventListener("click", () => showApplicationForm(null));
}

/* ---------------- Auth ---------------- */
function handleLogin() {
  const mail = document.getElementById("login-mail").value.trim();
  const pass = document.getElementById("login-password").value.trim();
  const errEl = document.getElementById("login-error");
  if (!mail || !pass) {
    errEl.textContent = "Mail ID and password are required to log in.";
    errEl.classList.remove("hidden");
    return;
  }
  errEl.classList.add("hidden");
  storageSet("auth", { mailId: mail });
  loginSuccess(mail);
}

function loginSuccess(mailId) {
  state.mailId = mailId;
  state.profile = storageGet("profile", {});
  state.applications = storageGet("applications", []);
  state.enquiries = storageGet("enquiries", []);

  document.getElementById("page-login").classList.remove("active");
  document.getElementById("page-login").classList.add("hidden");
  document.getElementById("shell").classList.remove("hidden");

  fillProfileForm();
  goToPage("home");
}

function handleLogout() {
  storageSet("auth", null);
  state.mailId = null;
  document.getElementById("shell").classList.add("hidden");
  document.getElementById("page-login").classList.remove("hidden");
  document.getElementById("page-login").classList.add("active");
  document.getElementById("login-mail").value = "";
  document.getElementById("login-password").value = "";
}

/* ---------------- Navigation ---------------- */
function goToPage(page) {
  document.querySelectorAll(".app-page").forEach((el) => el.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");

  document.querySelectorAll(".nav-link[data-page], .bottom-link[data-page]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  if (page === "home") renderHome();
  if (page === "companies") renderCompanies();
  if (page === "enquiry") renderEnquiry();
  if (page === "tracker") renderApplications();
}

/* ---------------- Home ---------------- */
function renderHome() {
  const name = state.profile.name || state.mailId.split("@")[0];
  document.getElementById("home-welcome").textContent = `Welcome, ${name}!`;

  const counts = {};
  STATUS_ORDER.concat("Rejected").forEach((s) => {
    counts[s] = state.applications.filter((a) => a.status === s).length;
  });
  const grid = document.getElementById("stats-grid");
  grid.innerHTML = STATUS_ORDER.concat("Rejected")
    .map(
      (s) => `
      <div class="stat-card">
        <p class="stat-num" style="color:${STATUS_META[s].color}">${counts[s]}</p>
        <p class="stat-label">${s}</p>
      </div>`
    )
    .join("");
}

/* ---------------- Profile ---------------- */
function fillProfileForm() {
  const p = state.profile;
  ["name", "qualification", "skills", "domain", "location", "locationLookingFor", "phone", "email", "duration"].forEach((k) => {
    const el = document.getElementById("p-" + k);
    if (el) el.value = p[k] || "";
  });
}
function saveProfile() {
  const p = {};
  ["name", "qualification", "skills", "domain", "location", "locationLookingFor", "phone", "email", "duration"].forEach((k) => {
    p[k] = document.getElementById("p-" + k).value;
  });
  state.profile = p;
  storageSet("profile", p);

  const btn = document.getElementById("save-profile-btn");
  const original = btn.textContent;
  btn.textContent = "Saved!";
  setTimeout(() => (btn.textContent = original), 2000);
}

/* ---------------- Companies ---------------- */
function renderCompanyDomainFilter() {
  const domains = ["All", ...new Set(COMPANIES.map((c) => c.domain))];
  const sel = document.getElementById("company-domain-filter");
  sel.innerHTML = domains.map((d) => `<option value="${d}">${d}</option>`).join("");
}

function renderCompanies() {
  const q = document.getElementById("company-search").value.toLowerCase();
  const domain = document.getElementById("company-domain-filter").value || "All";
  const filtered = COMPANIES.filter(
    (c) =>
      (domain === "All" || c.domain === domain) &&
      (c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q))
  );
  const grid = document.getElementById("companies-grid");
  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-text">No results found. Try a different search.</p>`;
    return;
  }
  grid.innerHTML = filtered
    .map(
      (c) => `
    <div class="company-card">
      <p class="co-name">${escapeHtml(c.name)}</p>
      <p>💼 ${escapeHtml(c.role)}</p>
      <p>📍 ${escapeHtml(c.location)}</p>
      <p>📅 Deadline: ${escapeHtml(c.deadline)}</p>
      <div class="co-row">
        <span class="stipend-badge">${escapeHtml(c.stipend)}</span>
        <button class="btn-link" data-enquire="${c.id}">Enquire →</button>
      </div>
    </div>`
    )
    .join("");

  grid.querySelectorAll("[data-enquire]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const company = COMPANIES.find((c) => c.id === btn.dataset.enquire);
      state.enquiryPrefill = company;
      goToPage("enquiry");
    });
  });
}

/* ---------------- Enquiry ---------------- */
function renderEnquiry() {
  if (state.enquiryPrefill) {
    document.getElementById("enq-company").value = state.enquiryPrefill.name;
    document.getElementById("enq-message").placeholder =
      `Hi, I'm ${state.profile.name || "a BCA student"}. I'd like to know more about your internship openings...`;
    state.enquiryPrefill = null;
  }
  const list = document.getElementById("enquiry-list");
  if (state.enquiries.length === 0) {
    list.innerHTML = `<p class="empty-text" style="padding:0">No enquiries sent yet.</p>`;
    return;
  }
  list.innerHTML = state.enquiries
    .slice()
    .reverse()
    .map(
      (en) => `
    <div class="enquiry-card">
      <div class="enq-head">
        <span class="enq-company">${escapeHtml(en.company)}</span>
        <span class="enq-date">${en.date}</span>
      </div>
      <p class="enq-msg">${escapeHtml(en.message)}</p>
    </div>`
    )
    .join("");
}

function sendEnquiry() {
  const company = document.getElementById("enq-company").value.trim();
  const message = document.getElementById("enq-message").value.trim();
  if (!company || !message) return;
  state.enquiries.push({
    id: Date.now().toString(),
    company,
    message,
    date: new Date().toISOString().slice(0, 10),
  });
  storageSet("enquiries", state.enquiries);
  document.getElementById("enq-company").value = "";
  document.getElementById("enq-message").value = "";
  renderEnquiry();
}

/* ---------------- Tracker ---------------- */
function renderApplications() {
  const grid = document.getElementById("applications-grid");
  if (state.applications.length === 0) {
    grid.innerHTML = `<p class="empty-text">No applications added yet. Click "Add Application" to get started.</p>`;
    return;
  }
  grid.innerHTML = state.applications
    .map((a) => {
      const meta = STATUS_META[a.status] || STATUS_META.Applied;
      return `
      <div class="app-card" data-id="${a.id}">
        <div class="app-head">
          <div>
            <p class="app-company">${escapeHtml(a.company)}</p>
            <p class="app-role">${escapeHtml(a.role || "")}</p>
          </div>
          <span class="stamp" style="color:${meta.color};border-color:${meta.color};background:${meta.bg}">🔖 ${a.status}</span>
        </div>
        <p class="app-meta">📍 ${escapeHtml(a.location || "")} &nbsp;•&nbsp; 📅 ${a.appliedDate || ""}</p>
        ${a.notes ? `<p class="app-notes">"${escapeHtml(a.notes)}"</p>` : ""}
        ${renderTimeline(a.status)}
        <div class="app-actions">
          <button class="btn-link" data-edit="${a.id}">✎ Edit</button>
          <button class="btn-link danger" data-delete="${a.id}">🗑 Delete</button>
        </div>
      </div>`;
    })
    .join("");

  grid.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const app = state.applications.find((a) => a.id === btn.dataset.edit);
      showApplicationForm(app);
    });
  });
  grid.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.applications = state.applications.filter((a) => a.id !== btn.dataset.delete);
      storageSet("applications", state.applications);
      renderApplications();
      renderHome();
    });
  });
}

function renderTimeline(status) {
  if (status === "Rejected") {
    return `<div class="timeline-closed" style="color:${STATUS_META.Rejected.color}">Application closed</div>`;
  }
  const idx = STATUS_ORDER.indexOf(status);
  let html = `<div class="timeline">`;
  STATUS_ORDER.forEach((s, i) => {
    html += `<div class="timeline-dot ${i <= idx ? "done" : ""}"></div>`;
    if (i < STATUS_ORDER.length - 1) {
      html += `<div class="timeline-line ${i < idx ? "done" : ""}"></div>`;
    }
  });
  html += `</div>`;
  return html;
}

function showApplicationForm(app) {
  const slot = document.getElementById("application-form-slot");
  const isEdit = !!app;
  const f = app || { company: "", role: "", location: "", status: "Applied", appliedDate: new Date().toISOString().slice(0, 10), notes: "" };

  slot.innerHTML = `
    <div class="app-form">
      <div class="form-row">
        <label class="field"><span>Company Name</span><input id="af-company" value="${escapeAttr(f.company)}" placeholder="Wipro TalentNext" /></label>
        <label class="field"><span>Role</span><input id="af-role" value="${escapeAttr(f.role)}" placeholder="Java Full Stack Intern" /></label>
        <label class="field"><span>Location</span><input id="af-location" value="${escapeAttr(f.location)}" placeholder="Bengaluru, KA" /></label>
        <label class="field"><span>Applied Date</span><input id="af-date" type="date" value="${f.appliedDate}" /></label>
      </div>
      <label class="field">
        <span>Status</span>
        <select id="af-status">
          ${STATUS_ORDER.concat("Rejected").map((s) => `<option value="${s}" ${s === f.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </label>
      <label class="field"><span>Notes</span><input id="af-notes" value="${escapeAttr(f.notes)}" placeholder="Interview on Friday" /></label>
      <div class="form-actions">
        <button class="btn btn-primary" id="af-save">✓ Save</button>
        <button class="btn btn-secondary" id="af-cancel">Cancel</button>
      </div>
    </div>`;

  document.getElementById("add-application-btn").classList.add("hidden");

  document.getElementById("af-cancel").addEventListener("click", () => {
    slot.innerHTML = "";
    document.getElementById("add-application-btn").classList.remove("hidden");
  });

  document.getElementById("af-save").addEventListener("click", () => {
    const data = {
      company: document.getElementById("af-company").value.trim(),
      role: document.getElementById("af-role").value.trim(),
      location: document.getElementById("af-location").value.trim(),
      status: document.getElementById("af-status").value,
      appliedDate: document.getElementById("af-date").value,
      notes: document.getElementById("af-notes").value.trim(),
    };
    if (!data.company) return;

    if (isEdit) {
      state.applications = state.applications.map((a) => (a.id === app.id ? { ...a, ...data } : a));
    } else {
      state.applications.push({ ...data, id: Date.now().toString() });
    }
    storageSet("applications", state.applications);
    slot.innerHTML = "";
    document.getElementById("add-application-btn").classList.remove("hidden");
    renderApplications();
    renderHome();
  });
}

/* ---------------- Helpers ---------------- */
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function escapeAttr(str) {
  return escapeHtml(str);
}