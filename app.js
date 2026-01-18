// ===============================
// FounderFlowAI - Dashboard Logic
// + KPI click navigation + Instagram Scheduler + Calendar View
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDysnYzfcXShdhk9fa4Z7R-_3amh1HKxSk",
  authDomain: "founder-flow-ai.firebaseapp.com",
  projectId: "founder-flow-ai",
  appId: "1:651459464335:web:b10b7d6e5f0c105ffd74fa"
};

// ✅ Gemini (optional)
const GEMINI_API_KEY = "PASTE_YOUR_GEMINI_API_KEY_HERE";
const GEMINI_MODEL = "gemini-1.5-flash-latest";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let checkedOnce = false;

// ===============================
// Auth Protection + Business Mode
// ===============================
onAuthStateChanged(auth, (user) => {
  if (checkedOnce) return;
  checkedOnce = true;

  if (!user) {
    window.location.replace("index.html");
    return;
  }

  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.textContent = user.email || "Logged In";

  const bt = localStorage.getItem("ff_businessType");
  if (!bt) {
    window.location.replace("business.html");
    return;
  }

  const modePill = document.getElementById("businessModePill");
  if (modePill) modePill.textContent = `Mode: ${bt}`;

  document.getElementById("loading")?.remove();
});

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("index.html");
});

// ===============================
// Tabs Navigation + KPI click
// ===============================
const navBtns = document.querySelectorAll(".navBtn");
const tabs = document.querySelectorAll(".tab");

const pageTitle = document.getElementById("pageTitle");
const pageSub = document.getElementById("pageSub");

const titles = {
  home: ["Home", "Welcome to your AI dashboard."],
  complaints: ["Complaint Resolver", "Turn complaints into solutions instantly."],
  sales: ["AI Sales Assistant", "Generate sales pitch + WhatsApp messages."],
  marketing: ["AI Marketing", "Create & schedule Instagram posts + calendar view."],
  receipts: ["Receipt AI", "Track receipts & totals."],
  coming: ["Coming Soon", "More modules planned after hackathon."]
};

function openTab(tabKey) {
  navBtns.forEach((b) => b.classList.remove("active"));
  document.querySelector(`.navBtn[data-tab="${tabKey}"]`)?.classList.add("active");

  tabs.forEach((t) => t.classList.remove("active"));
  document.getElementById(`tab-${tabKey}`)?.classList.add("active");

  if (titles[tabKey]) {
    pageTitle.textContent = titles[tabKey][0];
    pageSub.textContent = titles[tabKey][1];
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

navBtns.forEach((btn) => btn.addEventListener("click", () => openTab(btn.dataset.tab)));

// KPI click
document.querySelectorAll(".kpiCard").forEach((card) => {
  card.addEventListener("click", () => {
    const go = card.dataset.go;
    if (go) openTab(go);
  });
});

// ===============================
// Gemini API
// ===============================
async function geminiGenerate(prompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("PASTE_")) throw new Error("Gemini key missing");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 }
    })
  });

  const dataText = await res.text();
  if (!res.ok) throw new Error(dataText);

  const data = JSON.parse(dataText);
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseJsonSafe(rawText) {
  const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

// ===============================
// KPI Elements
// ===============================
const kpiComplaints = document.getElementById("kpiComplaints");
const kpiReceipts = document.getElementById("kpiReceipts");
const kpiSalesAmount = document.getElementById("kpiSalesAmount");
const kpiRefundsToday = document.getElementById("kpiRefundsToday");
const kpiInventory = document.getElementById("kpiInventory");
const kpiColdEmails = document.getElementById("kpiColdEmails");
const kpiReviewScore = document.getElementById("kpiReviewScore");
const kpiRank = document.getElementById("kpiRank");
const kpiChurn = document.getElementById("kpiChurn");

// counters
let resolutionsCount = 0;
let salesCount = 0;

// ===============================
// Receipts Module
// ===============================
const receiptAddBtn = document.getElementById("receiptAddBtn");
const receiptClearBtn = document.getElementById("receiptClearBtn");
const rCustomer = document.getElementById("rCustomer");
const rAmount = document.getElementById("rAmount");

const totalSalesEl = document.getElementById("totalSales");
const totalBillsEl = document.getElementById("totalBills");
const receiptTable = document.getElementById("receiptTable");

let receipts = JSON.parse(localStorage.getItem("ff_receipts") || "[]");

function saveReceipts() {
  localStorage.setItem("ff_receipts", JSON.stringify(receipts));
}

function renderReceipts() {
  if (!receiptTable) return;

  receiptTable.innerHTML = receipts.map((r, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(r.customer)}</td>
      <td>₹ ${Number(r.amount).toFixed(0)}</td>
      <td>${escapeHtml(r.date)}</td>
    </tr>
  `).join("");

  const total = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  if (totalSalesEl) totalSalesEl.textContent = total.toFixed(0);
  if (totalBillsEl) totalBillsEl.textContent = receipts.length;

  updateStats();
}

receiptAddBtn?.addEventListener("click", () => {
  const customer = rCustomer.value.trim();
  const amount = Number(rAmount.value);

  if (!customer || !amount || amount <= 0) return;

  const date = new Date().toLocaleString();
  receipts.unshift({ customer, amount, date });

  saveReceipts();
  renderReceipts();

  rCustomer.value = "";
  rAmount.value = "";
});

receiptClearBtn?.addEventListener("click", () => {
  receipts = [];
  saveReceipts();
  renderReceipts();
});

// ===============================
// Update Stats
// ===============================
function updateStats() {
  if (kpiComplaints) kpiComplaints.textContent = resolutionsCount;
  if (kpiReceipts) kpiReceipts.textContent = receipts.length;

  const total = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  if (kpiSalesAmount) kpiSalesAmount.textContent = total.toFixed(0);

  // marketing scheduled count -> show number of scheduled posts
  const scheduledPosts = igPosts.length;
  if (kpiColdEmails) kpiColdEmails.textContent = String(scheduledPosts);

  if (kpiRefundsToday) kpiRefundsToday.textContent = localStorage.getItem("ff_refundsToday") || "0";
  if (kpiReviewScore) kpiReviewScore.textContent = localStorage.getItem("ff_reviewScore") || "5.0";
  if (kpiRank) kpiRank.textContent = localStorage.getItem("ff_rank") || "#20";
  if (kpiChurn) kpiChurn.textContent = localStorage.getItem("ff_churnAlerts") || "0";

  const inv = localStorage.getItem("ff_inventoryShortage") || "No";
  if (kpiInventory) kpiInventory.textContent = inv;
}

// ===============================
// Complaint Resolver
// ===============================
const complaintInput = document.getElementById("complaintInput");
const complaintGenBtn = document.getElementById("complaintGenBtn");
const complaintCopyBtn = document.getElementById("complaintCopyBtn");
const complaintStatus = document.getElementById("complaintStatus");

const sentimentPill = document.getElementById("sentimentPill");
const priorityPill = document.getElementById("priorityPill");
const categoryPill = document.getElementById("categoryPill");

const complaintReply = document.getElementById("complaintReply");
const complaintAction = document.getElementById("complaintAction");

let lastReplyText = "";

complaintGenBtn?.addEventListener("click", async () => {
  const complaint = complaintInput.value.trim();
  if (!complaint) {
    complaintStatus.textContent = "⚠️ Please paste a complaint message.";
    return;
  }

  complaintStatus.textContent = "⏳ Generating resolution...";
  complaintGenBtn.disabled = true;
  complaintCopyBtn.disabled = true;

  const prompt = `
Return JSON only with keys: sentiment, priority, category, reply, action
Complaint: "${complaint}"
`;

  try {
    let parsed = null;

    try {
      const raw = await geminiGenerate(prompt);
      parsed = parseJsonSafe(raw);
      if (!parsed) throw new Error("Invalid Gemini JSON");
    } catch {
      parsed = offlineComplaintAI(complaint);
    }

    sentimentPill.textContent = `Sentiment: ${parsed.sentiment ?? "—"}`;
    priorityPill.textContent = `Priority: ${parsed.priority ?? "—"}`;
    categoryPill.textContent = `Category: ${parsed.category ?? "—"}`;

    complaintReply.textContent = parsed.reply ?? "—";
    complaintAction.textContent = parsed.action ?? "—";

    lastReplyText = parsed.reply ?? "";
    complaintCopyBtn.disabled = false;

    resolutionsCount++;
    updateStats();
    complaintStatus.textContent = "✅ Resolution generated!";
  } catch {
    complaintStatus.textContent = "❌ Error generating complaint solution.";
  } finally {
    complaintGenBtn.disabled = false;
  }
});

complaintCopyBtn?.addEventListener("click", async () => {
  if (!lastReplyText) return;
  await navigator.clipboard.writeText(lastReplyText);
  complaintStatus.textContent = "✅ Reply copied!";
});

// ===============================
// Sales Assistant
// ===============================
const productInput = document.getElementById("productInput");
const customerInput = document.getElementById("customerInput");

const salesGenBtn = document.getElementById("salesGenBtn");
const salesCopyBtn = document.getElementById("salesCopyBtn");
const salesStatus = document.getElementById("salesStatus");

const salesPitch = document.getElementById("salesPitch");
const salesWhatsApp = document.getElementById("salesWhatsApp");

let lastWhatsAppText = "";

salesGenBtn?.addEventListener("click", async () => {
  const product = productInput.value.trim();
  const customer = customerInput.value.trim();

  if (!product || !customer) {
    salesStatus.textContent = "⚠️ Enter product + customer type.";
    return;
  }

  salesStatus.textContent = "⏳ Generating sales copy...";
  salesGenBtn.disabled = true;
  salesCopyBtn.disabled = true;

  const prompt = `
Return JSON only with keys: pitch, whatsapp
Product: "${product}"
Customer: "${customer}"
`;

  try {
    let parsed = null;

    try {
      const raw = await geminiGenerate(prompt);
      parsed = parseJsonSafe(raw);
      if (!parsed) throw new Error("Invalid Gemini JSON");
    } catch {
      parsed = offlineSalesAI(product, customer);
    }

    salesPitch.textContent = parsed.pitch ?? "—";
    salesWhatsApp.textContent = parsed.whatsapp ?? "—";

    lastWhatsAppText = parsed.whatsapp ?? "";
    salesCopyBtn.disabled = false;

    salesCount++;
    updateStats();

    salesStatus.textContent = "✅ Sales copy generated!";
  } catch {
    salesStatus.textContent = "❌ Error generating sales copy.";
  } finally {
    salesGenBtn.disabled = false;
  }
});

salesCopyBtn?.addEventListener("click", async () => {
  if (!lastWhatsAppText) return;
  await navigator.clipboard.writeText(lastWhatsAppText);
  salesStatus.textContent = "✅ WhatsApp message copied!";
});

// ===============================
// AI Marketing: Instagram Scheduler
// ===============================
const igTopic = document.getElementById("igTopic");
const igAudience = document.getElementById("igAudience");
const igDate = document.getElementById("igDate");
const igTime = document.getElementById("igTime");
const igGenBtn = document.getElementById("igGenBtn");
const igScheduleBtn = document.getElementById("igScheduleBtn");
const igStatus = document.getElementById("igStatus");
const igCaptionPreview = document.getElementById("igCaptionPreview");
const igTable = document.getElementById("igTable");

let igLastCaption = "";
let igPosts = JSON.parse(localStorage.getItem("ff_ig_posts") || "[]");

function renderIG() {
  if (!igTable) return;
  igTable.innerHTML = igPosts.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(p.topic)}</td>
      <td>${escapeHtml(p.date)}</td>
      <td>${escapeHtml(p.time)}</td>
      <td>${escapeHtml(p.status)}</td>
    </tr>
  `).join("");
}
renderIG();

igGenBtn?.addEventListener("click", async () => {
  const topic = igTopic.value.trim();
  const audience = igAudience.value.trim();

  if (!topic || !audience) {
    igStatus.textContent = "⚠️ Enter topic + audience.";
    return;
  }

  igStatus.textContent = "⏳ Generating Instagram post...";
  igGenBtn.disabled = true;
  igScheduleBtn.disabled = true;

  const prompt = `
Return JSON only with keys: caption
Topic: "${topic}"
Audience: "${audience}"
`;

  try {
    let captionText = "";

    try {
      const raw = await geminiGenerate(prompt);
      const parsed = parseJsonSafe(raw);
      captionText = parsed?.caption || "";
      if (!captionText) throw new Error("Invalid Gemini JSON");
    } catch {
      captionText = offlineIGCaption(topic, audience);
    }

    igLastCaption = captionText;
    if (igCaptionPreview) igCaptionPreview.textContent = captionText;

    igScheduleBtn.disabled = false;
    igStatus.textContent = "✅ Post generated!";
  } catch {
    igStatus.textContent = "❌ Failed to generate post.";
  } finally {
    igGenBtn.disabled = false;
  }
});

igScheduleBtn?.addEventListener("click", () => {
  const topic = igTopic.value.trim();
  const date = igDate.value;
  const time = igTime.value;

  if (!topic || !date || !time || !igLastCaption) {
    igStatus.textContent = "⚠️ Generate post + select date & time first.";
    return;
  }

  igPosts.unshift({ topic, date, time, caption: igLastCaption, status: "Scheduled" });
  localStorage.setItem("ff_ig_posts", JSON.stringify(igPosts));

  renderIG();
  renderCalendar(); // ✅ refresh calendar instantly
  updateStats();

  igStatus.textContent = "✅ Scheduled successfully!";
  igTopic.value = "";
  igAudience.value = "";
  igDate.value = "";
  igTime.value = "";
  igLastCaption = "";
  if (igCaptionPreview) igCaptionPreview.textContent = "Caption will appear here…";
  igScheduleBtn.disabled = true;
});

// ===============================
// Calendar View Logic
// ===============================
const calendarGrid = document.getElementById("calendarGrid");
const calPrevBtn = document.getElementById("calPrevBtn");
const calNextBtn = document.getElementById("calNextBtn");
const calMonthLabel = document.getElementById("calMonthLabel");
const calSelectedLabel = document.getElementById("calSelectedLabel");
const calEvents = document.getElementById("calEvents");

let calCurrent = new Date();
calCurrent.setDate(1);

function formatMonthLabel(dt){
  return dt.toLocaleString("en-US", { month:"long", year:"numeric" });
}

function ymd(dt){
  const y = dt.getFullYear();
  const m = String(dt.getMonth()+1).padStart(2,"0");
  const d = String(dt.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

function renderCalendar(){
  if (!calendarGrid) return;
  if (calMonthLabel) calMonthLabel.textContent = formatMonthLabel(calCurrent);

  const year = calCurrent.getFullYear();
  const month = calCurrent.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startWeekday = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const prevMonthLast = new Date(year, month, 0).getDate();

  calendarGrid.innerHTML = "";

  for (let i = 0; i < 42; i++){
    const cell = document.createElement("div");
    cell.className = "calDay";

    let dayNum = 0;
    let cellDate = null;
    let muted = false;

    if (i < startWeekday){
      dayNum = prevMonthLast - (startWeekday - 1 - i);
      cellDate = new Date(year, month - 1, dayNum);
      muted = true;
    } else if (i >= startWeekday + totalDays){
      dayNum = i - (startWeekday + totalDays) + 1;
      cellDate = new Date(year, month + 1, dayNum);
      muted = true;
    } else {
      dayNum = i - startWeekday + 1;
      cellDate = new Date(year, month, dayNum);
    }

    if (muted) cell.classList.add("mutedDay");

    const key = ymd(cellDate);
    const todaysPosts = igPosts.filter(p => p.date === key);

    cell.innerHTML = `
      <div class="calDayNum">${dayNum}</div>
      ${todaysPosts.length ? `
        <div class="calBadge">
          <span class="calDot"></span>
          ${todaysPosts.length} post${todaysPosts.length>1 ? "s" : ""}
        </div>
      ` : ``}
    `;

    cell.addEventListener("click", () => {
      document.querySelectorAll(".calDay").forEach(d => d.classList.remove("active"));
      cell.classList.add("active");
      openDay(key);
    });

    calendarGrid.appendChild(cell);
  }
}

function openDay(dateKey){
  if (calSelectedLabel) calSelectedLabel.textContent = `Selected: ${dateKey}`;

  const posts = igPosts.filter(p => p.date === dateKey);

  if (!calEvents) return;

  if (!posts.length){
    calEvents.innerHTML = `<div class="muted">No scheduled posts for this day.</div>`;
    return;
  }

  calEvents.innerHTML = posts.map(p => `
    <div class="calEventItem">
      <div class="title">${escapeHtml(p.topic)}</div>
      <div class="meta">⏰ ${escapeHtml(p.time)} • ${escapeHtml(p.status)}</div>
    </div>
  `).join("");
}

calPrevBtn?.addEventListener("click", () => {
  calCurrent.setMonth(calCurrent.getMonth() - 1);
  renderCalendar();
});

calNextBtn?.addEventListener("click", () => {
  calCurrent.setMonth(calCurrent.getMonth() + 1);
  renderCalendar();
});

// ===============================
// FREE AI MODE
// ===============================
function offlineComplaintAI(complaint) {
  return {
    sentiment: "Neutral",
    priority: "Medium",
    category: "Service",
    reply: `Hi! Sorry for the inconvenience. We will resolve this quickly. Please share your order ID.`,
    action: `1) Apologize 2) Ask order ID 3) Refund/replacement 4) Follow-up`
  };
}

function offlineSalesAI(product, customer) {
  return {
    pitch: `🔥 ${product}\nPerfect for: ${customer}\n✅ Great quality ✅ Best price ✅ Limited stock`,
    whatsapp: `Hi 👋 Interested in *${product}*? Perfect for *${customer}* ✅\nWant price + offer? Reply YES 🔥`
  };
}

function offlineIGCaption(topic, audience) {
  return `
🔥 ${topic.toUpperCase()}

If you're a ${audience}, this is for you ✅

✅ What you'll get:
• Better reach & conversions
• Easy strategy to follow
• Real business results

💡 Comment "INFO" or DM us now 📩

#founderflowai #marketing #startups #saas #ecommerce #ai #automation
  `.trim();
}

// init
renderReceipts();
renderCalendar();
updateStats();

