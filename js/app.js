// EMAIL SENDING (EmailJS — public key, safe to ship client-side by design)
const EMAILJS_SERVICE_ID = "service_gnt5dm3";
const EMAILJS_TEMPLATE_ID = "template_o7kvnwa";
const EMAILJS_PUBLIC_KEY = "zmcBH6ScmJWIKnYsN";

if (window.emailjs && typeof emailjs.init === "function") {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// GLOBAL APPLICATION STATE
let currentStartupData = JSON.parse(JSON.stringify(DEFAULT_STARTUP));
let currentTemplateId = "exec-grid";
let currentView = "dashboard";
// Bulk items use the SAME field names/shape as currentStartupData (plus a
// few bulk-only fields: id/status/reviewerEmail) so a bulk row can be
// dropped straight into the editable canvas or a PDF export with zero
// translation. The built-in sample data predates this shape, so it's
// adapted once at load time.
function sampleStartupToBulkItem(s, idx) {
  return {
    id: s.id || `sample-${idx}`,
    status: s.status || "Draft",
    reviewerEmail: s.reviewerEmail || "",
    name: s.name || "",
    tagline: s.description || "",
    climateSector: s.sector || "",
    subSector: "",
    stage: s.stage || "",
    marketSize: "",
    totalFundRaised: "",
    revenueLast12Months: s.currentTraction || "",
    countries: "",
    co2EmissionReduced: s.climateMetrics || "",
    avgEnergySavings: "",
    waterSaved: "",
    uspAIUse: s.description || "",
    targetCustomer: "",
    businessModel: "",
    teamSize: "",
    currentAsk: s.currentAsk || "",
    incorporateYear: "",
    headquaters: s.location || "",
    website: "",
    logo: s.logo || "",
    foundingTeam: [],
    strategicPartners: [],
    backedBy: []
  };
}

let bulkStartupsList = SAMPLE_BULK_STARTUPS.map((s, idx) => sampleStartupToBulkItem(s, idx));
let currentBulkLayout = "grid";
let selectedBulkIds = new Set();
let notificationFeed = JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS));
let replyThreadsData = JSON.parse(JSON.stringify(INITIAL_REPLY_THREADS));
let isUserAuthenticated = true; // Workspace opens directly on first load for instant access

// CANVAS HISTORY FOR UNDO / REDO
let canvasHistory = [];
let historyIndex = -1;

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  initApp();
  bindAuthEventListeners();
});

function initApp() {
  try {
    saveCanvasState();
    renderTemplateDropdown();
    populateFormFields();
    renderFoundersForm();
    renderFoundersCanvas();
    renderStrategicPartnersForm();
    renderStrategicPartnersCanvas();
    renderBackedByForm();
    renderBackedByCanvas();
    updateCanvasUI();
    renderNotifications();
    renderBulkGallery(currentBulkLayout);
    checkAuthState();
  } catch (err) {
    console.error("Initialization error in PageCraft AI:", err);
  }
}

function bindAuthEventListeners() {
  const submitBtn = document.getElementById("authSubmitBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleAuthSubmit(e);
    });
  }

  const tabLogin = document.getElementById("authTabLogin");
  if (tabLogin) {
    tabLogin.addEventListener("click", () => switchAuthTab("login"));
  }

  const tabSignup = document.getElementById("authTabSignup");
  if (tabSignup) {
    tabSignup.addEventListener("click", () => switchAuthTab("signup"));
  }

  const authForm = document.querySelector("#authFullView form");
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleAuthSubmit(e);
    });
  }
}

/* ---------------------------------------------------- */
/* TEMPLATE SWITCHER (13 Templates) */
/* ---------------------------------------------------- */
function renderTemplateDropdown() {
  const select = document.getElementById("templateSelect");
  if (!select) return;

  select.innerHTML = TEMPLATES.map(t => `
    <option value="${t.id}" ${t.id === currentTemplateId ? 'selected' : ''}>
      ${t.name} (${t.category}) - ${t.badge}
    </option>
  `).join("");
}

function changeTemplate(templateId) {
  currentTemplateId = templateId;
  const t = TEMPLATES.find(item => item.id === templateId) || TEMPLATES[0];

  // Highlight active visual template card
  document.querySelectorAll(".template-card-btn").forEach(btn => {
    btn.classList.remove("ring-2", "ring-cyan-400", "scale-105");
  });

  const activeCard = document.getElementById(`tmplCard_${templateId}`);
  if (activeCard) {
    activeCard.classList.add("ring-2", "ring-cyan-400", "scale-105");
  }

  // Update Badge in Left Panel
  const badge = document.getElementById("activeTemplateBadge");
  if (badge) {
    badge.innerText = `${t.name}`;
  }

  // Update Canvas Container Styling
  const canvas = document.getElementById("onePagerCanvas");
  if (!canvas) return;

  // Apply template class
  canvas.className = `w-full max-w-4xl min-h-[1100px] p-8 md:p-10 shadow-2xl transition-all duration-300 relative select-text template-${templateId}`;

  // Smart Theme Mode & Contrast Adjustment
  setCanvasThemeMode(t.isDark !== false);

  showToast(`Switched AI Design Template to ${t.name}`);
  saveCanvasState();
}

function applyCanvasGradient(gradientKey) {
  const canvas = document.getElementById("onePagerCanvas");
  if (!canvas) return;

  const gradients = {
    "cosmic-indigo": "linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%)",
    "emerald-esg": "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0f172a 100%)",
    "cyber-neon": "linear-gradient(135deg, #020617 0%, #1e1035 50%, #0e7490 100%)",
    "sunset-gold": "linear-gradient(135deg, #451a03 0%, #1e1b4b 50%, #78350f 100%)",
    "arctic-light": "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
    "deep-midnight": "linear-gradient(135deg, #000000 0%, #0f172a 50%, #020617 100%)"
  };

  const selectedGradient = gradients[gradientKey] || (gradientKey.includes("gradient") ? gradientKey : gradients["cosmic-indigo"]);

  canvas.style.setProperty("--canvas-custom-bg", selectedGradient);
  canvas.style.setProperty("background", selectedGradient, "important");

  if (gradientKey === "arctic-light" || selectedGradient.includes("#f8fafc") || selectedGradient.includes("#ffffff")) {
    setCanvasThemeMode(false);
  } else {
    setCanvasThemeMode(true);
  }

  saveCanvasState();
  showToast(`Applied Canvas Gradient: ${gradientKey.toUpperCase()}`);
}

/* ---------------------------------------------------- */
/* PRESET COLOR THEMES & POSITION LAYOUT SWITCHER */
/* ---------------------------------------------------- */
let currentCanvasLayout = "layout-grid-ref";

function applyPresetTheme(themeKey) {
  const themes = {
    "ocean-blue": { primary: "#0284c7", accent: "#38bdf8", template: "exec-grid" },
    "emerald-esg": { primary: "#059669", accent: "#34d399", template: "climate-tech" },
    "neon-violet": { primary: "#8b5cf6", accent: "#06b6d4", template: "web3-crypto" },
    "gold-executive": { primary: "#d97706", accent: "#fbbf24", template: "premium-executive" },
    "minimal-slate": { primary: "#0f172a", accent: "#2563eb", template: "minimal" }
  };

  const t = themes[themeKey] || themes["ocean-blue"];
  changeTemplate(t.template);
  changeCanvasPrimaryColor(t.primary);
  showToast(`Applied Theme Preset: ${themeKey.toUpperCase()}`);
}

function switchCanvasLayout(layoutKey) {
  currentCanvasLayout = layoutKey;
  if (layoutKey === "layout-grid-ref") {
    changeTemplate("exec-grid");
  } else if (layoutKey === "layout-modern-saas") {
    changeTemplate("modern-saas");
  } else if (layoutKey === "layout-dense-vc") {
    changeTemplate("investor-pitch");
  }
  showToast(`Switched Layout Position: ${layoutKey}`);
}

/* ---------------------------------------------------- */
/* FORM & MODEL SYNC */
/* ---------------------------------------------------- */
function populateFormFields() {
  const s = currentStartupData;
  const val = (v) => (v !== undefined && v !== null ? v : "");

  if (document.getElementById("inputName")) document.getElementById("inputName").value = val(s.name);
  if (document.getElementById("inputTagline")) document.getElementById("inputTagline").value = val(s.tagline);
  if (document.getElementById("inputLogo")) document.getElementById("inputLogo").value = val(s.logo);

  if (document.getElementById("inputClimateSector")) document.getElementById("inputClimateSector").value = val(s.climateSector);
  if (document.getElementById("inputSubSector")) document.getElementById("inputSubSector").value = val(s.subSector);
  if (document.getElementById("inputStage")) document.getElementById("inputStage").value = val(s.stage);
  if (document.getElementById("inputMarketSize")) document.getElementById("inputMarketSize").value = val(s.marketSize);

  if (document.getElementById("inputTotalFundRaised")) document.getElementById("inputTotalFundRaised").value = val(s.totalFundRaised);
  if (document.getElementById("inputRevenueLast12")) document.getElementById("inputRevenueLast12").value = val(s.revenueLast12Months);
  if (document.getElementById("inputCountries")) document.getElementById("inputCountries").value = val(s.countries);
  if (document.getElementById("inputCO2Reduced")) document.getElementById("inputCO2Reduced").value = val(s.co2EmissionReduced);
  if (document.getElementById("inputAvgEnergySavings")) document.getElementById("inputAvgEnergySavings").value = val(s.avgEnergySavings);
  if (document.getElementById("inputWaterSaved")) document.getElementById("inputWaterSaved").value = val(s.waterSaved);

  if (document.getElementById("inputUSPAIUse")) document.getElementById("inputUSPAIUse").value = val(s.uspAIUse);
  if (document.getElementById("inputTargetCustomer")) document.getElementById("inputTargetCustomer").value = val(s.targetCustomer);
  if (document.getElementById("inputBusinessModel")) document.getElementById("inputBusinessModel").value = val(s.businessModel);
  if (document.getElementById("inputTeamSize")) document.getElementById("inputTeamSize").value = val(s.teamSize);

  if (document.getElementById("inputAsk")) document.getElementById("inputAsk").value = val(s.currentAsk);

  if (document.getElementById("inputIncorporateYear")) document.getElementById("inputIncorporateYear").value = val(s.incorporateYear);
  if (document.getElementById("inputHeadquaters")) document.getElementById("inputHeadquaters").value = val(s.headquaters);
  if (document.getElementById("inputWebsite")) document.getElementById("inputWebsite").value = val(s.website);

  renderFoundersForm();
  renderFoundersCanvas();
}

function updateStartupData(field, val) {
  currentStartupData[field] = val;
  updateCanvasUI();
}

function toggleTemplateStudioPanel() {
  const body = document.getElementById("templateStudioBody");
  const icon = document.getElementById("templatePanelChevron");
  if (!body) return;

  const isHidden = body.classList.toggle("hidden");
  if (icon) {
    if (isHidden) {
      icon.classList.add("rotate-180");
    } else {
      icon.classList.remove("rotate-180");
    }
  }
  showToast(isHidden ? "Minimized AI Design Template Studio" : "Expanded AI Design Template Studio");
}

/* ---------------------------------------------------- */
/* FULL CANVAS CUSTOMIZATION & TYPOGRAPHY ENGINE */
/* ---------------------------------------------------- */

function toggleCustomizationPanel() {
  const panel = document.getElementById("canvasCustomizationPanel");
  const text = document.getElementById("toggleStudioText");
  const icon = document.getElementById("toggleStudioIcon");

  if (!panel) return;

  const isHidden = panel.classList.toggle("hidden");

  if (isHidden) {
    if (text) text.innerText = "Maximize Panel";
    if (icon) {
      icon.classList.add("rotate-180");
    }
    showToast("Minimized Customization Studio");
  } else {
    if (text) text.innerText = "Minimize Panel";
    if (icon) {
      icon.classList.remove("rotate-180");
    }
    showToast("Maximized Customization Studio");
  }

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

function applyTextFormatting(command) {
  document.execCommand(command, false, null);
  saveCanvasState();
  showToast(`Applied ${command.toUpperCase()} text style`);
}

function applyTextAlignment(align) {
  document.execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`, false, null);
  saveCanvasState();
  showToast(`Aligned text ${align}`);
}

function applyTextColor(colorHex) {
  document.execCommand("foreColor", false, colorHex);
  saveCanvasState();
  showToast("Updated text color");
}

function applyBoxBgColor(colorHex) {
  const cards = document.querySelectorAll("#onePagerCanvas .glass-card, #onePagerCanvas .ref-box");
  cards.forEach(c => {
    c.style.backgroundColor = colorHex;
  });
  saveCanvasState();
  showToast("Updated card box background color!");
}

function applyBoxBorderColor(colorHex) {
  const cards = document.querySelectorAll("#onePagerCanvas .glass-card, #onePagerCanvas .ref-box");
  cards.forEach(c => {
    c.style.borderColor = colorHex;
  });
  saveCanvasState();
  showToast("Updated card border color!");
}

function setCanvasThemeMode(isDark) {
  const canvas = document.getElementById("onePagerCanvas");
  if (!canvas) return;

  if (isDark) {
    canvas.classList.add("theme-dark-mode");
    canvas.classList.remove("theme-light-mode");
    canvas.style.color = "#f8fafc";
  } else {
    canvas.classList.add("theme-light-mode");
    canvas.classList.remove("theme-dark-mode");
    canvas.style.color = "#0f172a";
  }
}

function applyPageBgColor(colorHex) {
  const canvas = document.getElementById("onePagerCanvas");
  if (!canvas) return;
  canvas.style.setProperty("--canvas-custom-bg", colorHex);
  canvas.style.setProperty("background", colorHex, "important");

  const hex = colorHex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  setCanvasThemeMode(luminance < 0.6);

  saveCanvasState();
  showToast("Updated Page Background Color!");
}

let isGlassCardLight = false;

function toggleGlassCardFill() {
  isGlassCardLight = !isGlassCardLight;
  const btn = document.getElementById("toggleCardFillBtn");
  const cards = document.querySelectorAll("#onePagerCanvas .glass-card, #onePagerCanvas .ref-box");

  if (isGlassCardLight) {
    cards.forEach(c => {
      c.style.background = "linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.98) 100%)";
      c.style.borderColor = "rgba(15, 23, 42, 0.15)";
      c.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.08)";
      c.classList.add("card-light-fill");
      c.classList.remove("card-dark-fill");
    });

    if (btn) {
      btn.innerHTML = `<i data-lucide="moon" class="w-3.5 h-3.5 text-amber-300"></i> <span>Dark Glass Cards</span>`;
      btn.className = "px-2.5 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 text-xs font-bold border border-amber-500/30 cursor-pointer transition-all flex items-center space-x-1.5 shadow";
    }

    showToast("Applied White Card Fill with High-Contrast Dark Text!");
  } else {
    cards.forEach(c => {
      c.style.background = "rgba(15, 23, 42, 0.75)";
      c.style.borderColor = "rgba(255, 255, 255, 0.1)";
      c.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.4)";
      c.classList.add("card-dark-fill");
      c.classList.remove("card-light-fill");
    });

    if (btn) {
      btn.innerHTML = `<i data-lucide="sun" class="w-3.5 h-3.5 text-cyan-300"></i> <span>White Card Fill</span>`;
      btn.className = "px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-bold border border-indigo-500/30 cursor-pointer transition-all flex items-center space-x-1.5 shadow";
    }

    showToast("Toggled back to Dark Glass Cards!");
  }

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

function applyCardGradient(gradientCss) {
  const cards = document.querySelectorAll("#onePagerCanvas .glass-card, #onePagerCanvas .ref-box");
  cards.forEach(c => {
    c.style.background = gradientCss;
  });
  saveCanvasState();
  showToast("Applied card box gradient!");
}

function applyCardBorderRadius(radiusPx) {
  const cards = document.querySelectorAll("#onePagerCanvas .glass-card, #onePagerCanvas .ref-box");
  cards.forEach(c => {
    c.style.borderRadius = `${radiusPx}px`;
  });
  saveCanvasState();
  showToast(`Applied ${radiusPx}px corner radius`);
}

function changeFontFamily(fontName) {
  const canvas = document.getElementById("onePagerCanvas");
  if (!canvas) return;
  canvas.style.fontFamily = fontName;
  saveCanvasState();
  showToast(`Changed font family to ${fontName}`);
}

function applyHeadingStyle(tag) {
  document.execCommand("formatBlock", false, `<${tag}>`);
  saveCanvasState();
  showToast(`Formatted text as ${tag.toUpperCase()}`);
}

function updateClimateData(field, val) {
  if (!currentStartupData.climateMetrics) currentStartupData.climateMetrics = {};
  currentStartupData.climateMetrics[field] = val;
  updateCanvasUI();
}

function syncEditableText(field, text) {
  currentStartupData[field] = text;
  saveCanvasState();
}

function syncEditableClimate(field, text) {
  if (!currentStartupData.climateMetrics) currentStartupData.climateMetrics = {};
  currentStartupData.climateMetrics[field] = text;
  saveCanvasState();
}

/* ---------------------------------------------------- */
/* LIVE CANVAS UPDATE ENGINE */
/* ---------------------------------------------------- */
function updateCanvasUI() {
  const s = currentStartupData;
  const str = (v) => (v !== undefined && v !== null ? v : "");
  
  if (document.getElementById("canvasName")) document.getElementById("canvasName").innerText = str(s.name);
  if (document.getElementById("canvasTagline")) document.getElementById("canvasTagline").innerText = str(s.tagline);
  if (document.getElementById("canvasLogo")) document.getElementById("canvasLogo").src = s.logo || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80";
  if (document.getElementById("canvasStage")) document.getElementById("canvasStage").innerText = str(s.stage);

  if (document.getElementById("canvasClimateSector")) document.getElementById("canvasClimateSector").innerText = str(s.climateSector);
  if (document.getElementById("canvasSubSector")) document.getElementById("canvasSubSector").innerText = str(s.subSector);
  if (document.getElementById("canvasStageField")) document.getElementById("canvasStageField").innerText = str(s.stage);
  if (document.getElementById("canvasMarketSize")) document.getElementById("canvasMarketSize").innerText = str(s.marketSize);

  if (document.getElementById("canvasTotalFundRaised")) document.getElementById("canvasTotalFundRaised").innerText = str(s.totalFundRaised);
  if (document.getElementById("canvasRevenueLast12")) document.getElementById("canvasRevenueLast12").innerText = str(s.revenueLast12Months);
  if (document.getElementById("canvasCountries")) document.getElementById("canvasCountries").innerText = str(s.countries);
  if (document.getElementById("canvasCO2Reduced")) document.getElementById("canvasCO2Reduced").innerText = str(s.co2EmissionReduced);
  if (document.getElementById("canvasAvgEnergySavings")) document.getElementById("canvasAvgEnergySavings").innerText = str(s.avgEnergySavings);
  if (document.getElementById("canvasWaterSaved")) document.getElementById("canvasWaterSaved").innerText = str(s.waterSaved);

  if (document.getElementById("canvasUSPAIUse")) document.getElementById("canvasUSPAIUse").innerText = str(s.uspAIUse);
  if (document.getElementById("canvasTargetCustomer")) document.getElementById("canvasTargetCustomer").innerText = str(s.targetCustomer);
  if (document.getElementById("canvasBusinessModel")) document.getElementById("canvasBusinessModel").innerText = str(s.businessModel);
  if (document.getElementById("canvasTeamSizeField")) document.getElementById("canvasTeamSizeField").innerText = str(s.teamSize);

  if (document.getElementById("canvasAsk")) document.getElementById("canvasAsk").innerText = str(s.currentAsk);

  if (document.getElementById("canvasIncorporateYear")) document.getElementById("canvasIncorporateYear").innerText = str(s.incorporateYear);
  if (document.getElementById("canvasHeadquaters")) document.getElementById("canvasHeadquaters").innerText = str(s.headquaters);
  if (document.getElementById("canvasWebsite")) document.getElementById("canvasWebsite").innerText = str(s.website);

  renderStrategicPartnersCanvas();
  renderBackedByCanvas();
  renderFoundersCanvas();
}

/* ---------------------------------------------------- */
/* FOUNDERS MANAGEMENT & PHOTO UPLOAD */
/* ---------------------------------------------------- */
function renderFoundersForm() {
  const container = document.getElementById("foundersFormList");
  if (!container) return;

  if (!currentStartupData.foundingTeam) currentStartupData.foundingTeam = [];

  container.innerHTML = currentStartupData.foundingTeam.map((f, idx) => `
    <div class="glass-card p-3 rounded-xl border border-white/10 space-y-2.5">
      <div class="flex items-center justify-between border-b border-white/5 pb-1.5">
        <span class="text-[11px] font-bold text-indigo-300">Founder ${idx + 1}</span>
        ${currentStartupData.foundingTeam.length > 1 ? `
          <button type="button" onclick="removeFounder(${idx})" class="text-rose-400 hover:text-rose-300 text-[10px] font-semibold cursor-pointer">Remove</button>
        ` : ''}
      </div>

      <!-- Photo Preview & Upload Controls -->
      <div class="flex items-center space-x-3 bg-slate-900/60 p-2 rounded-lg border border-white/5">
        <img src="${f.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}" class="w-10 h-10 rounded-full object-cover border border-indigo-500/50 shrink-0">
        <div class="flex-1 text-xs space-y-1">
          <label class="block text-[10px] text-gray-400 font-semibold">Founder Photo Source</label>
          <div class="flex items-center space-x-2">
            <label class="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer transition-all flex items-center space-x-1">
              <i data-lucide="upload" class="w-3 h-3"></i>
              <span>Upload Photo</span>
              <input type="file" onchange="handleFounderPhotoUpload(${idx}, event)" accept="image/*" class="hidden">
            </label>
            <input type="text" value="${f.photo || ''}" oninput="updateFounderData(${idx}, 'photo', this.value)" placeholder="Or paste image URL..." class="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-0.5 text-white text-[11px]">
          </div>
        </div>
      </div>

      <input type="text" value="${f.name}" oninput="updateFounderData(${idx}, 'name', this.value)" placeholder="Full Name" class="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1.5 text-white text-xs">
      <input type="text" value="${f.title}" oninput="updateFounderData(${idx}, 'title', this.value)" placeholder="Title / Role" class="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1.5 text-white text-xs">
      <textarea oninput="updateFounderData(${idx}, 'experience', this.value)" placeholder="Experience / Bio" rows="2" class="w-full bg-slate-900 border border-white/10 rounded p-2 text-white text-xs">${f.experience || ''}</textarea>
    </div>
  `).join("");

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

function handleFounderPhotoUpload(idx, e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const photoUrl = evt.target.result;
    if (currentStartupData.foundingTeam[idx]) {
      currentStartupData.foundingTeam[idx].photo = photoUrl;
      renderFoundersForm();
      renderFoundersCanvas();
      showToast(`Uploaded photo for ${currentStartupData.foundingTeam[idx].name}!`);
    }
  };
  reader.readAsDataURL(file);
}

function triggerFounderPhotoModal(idx) {
  const f = currentStartupData.foundingTeam[idx];
  if (!f) return;

  const newUrl = prompt(`Enter new photo URL or image address for ${f.name}:`, f.photo || "");
  if (newUrl !== null && newUrl.trim() !== "") {
    f.photo = newUrl.trim();
    renderFoundersForm();
    renderFoundersCanvas();
    showToast(`Updated photo for ${f.name}!`);
  }
}

function updateFounderData(idx, field, val) {
  if (currentStartupData.foundingTeam[idx]) {
    currentStartupData.foundingTeam[idx][field] = val;
    renderFoundersCanvas();
  }
}

function addFounderField() {
  currentStartupData.foundingTeam.push({
    name: "New Co-Founder",
    title: "Chief Product Officer",
    experience: "Ex-Meta Product Manager, 8 yrs experience.",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
  });
  renderFoundersForm();
  renderFoundersCanvas();
}

function removeFounder(idx) {
  currentStartupData.foundingTeam.splice(idx, 1);
  renderFoundersForm();
  renderFoundersCanvas();
}

function getFounderPhotoUrl(f, idx) {
  if (f && f.photo && f.photo.startsWith('http')) return f.photo;
  if (f && f.name) {
    const nameLower = f.name.toLowerCase();
    if (nameLower.includes("pratap raju")) return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80";
    if (nameLower.includes("pramod raju")) return "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80";
    if (nameLower.includes("nalin agarwal")) return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=4f46e5&color=ffffff&bold=true`;
  }
  return "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
}

function renderFoundersCanvas() {
  const container = document.getElementById("canvasFoundersGrid");
  if (!container) return;

  if (!currentStartupData.foundingTeam) currentStartupData.foundingTeam = [];

  const count = currentStartupData.foundingTeam.length;
  if (count === 1) {
    container.className = "grid grid-cols-1 gap-2 max-w-xs";
  } else if (count === 2) {
    container.className = "grid grid-cols-2 gap-2";
  } else if (count === 3) {
    container.className = "grid grid-cols-3 gap-2";
  } else if (count === 4) {
    container.className = "grid grid-cols-2 sm:grid-cols-4 gap-2";
  } else {
    container.className = "grid grid-cols-2 sm:grid-cols-3 gap-2";
  }

  container.innerHTML = currentStartupData.foundingTeam.map((f, idx) => {
    const avatarUrl = getFounderPhotoUrl(f, idx);
    return `
      <div class="glass-card p-2 rounded-xl border border-white/10 flex items-center space-x-2.5 shadow-sm min-w-0">
        <!-- Interactive Photo Avatar -->
        <div class="relative group cursor-pointer shrink-0" onclick="triggerFounderPhotoModal(${idx})" data-tooltip="Click to change photo">
          <img src="${avatarUrl}" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || 'Founder')}&background=4f46e5&color=ffffff&bold=true';" class="w-8 h-8 rounded-full object-cover border border-indigo-500/40 shadow">
          <div class="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] font-bold text-white text-center">
            Change
          </div>
        </div>

        <div class="text-xs flex-1 min-w-0">
          <h4 contenteditable="true" onblur="updateFounderData(${idx}, 'name', this.innerText)" class="font-bold text-white text-[11px] canvas-editable truncate">${f.name}</h4>
          <span contenteditable="true" onblur="updateFounderData(${idx}, 'title', this.innerText)" class="text-indigo-300 block text-[10px] font-medium canvas-editable truncate">${f.title}</span>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

/* ---------------------------------------------------- */
/* STRATEGIC PARTNERS & BACKED BY INVESTORS MANAGEMENT */
/* ---------------------------------------------------- */
function renderStrategicPartnersForm() {
  const container = document.getElementById("strategicPartnersFormList");
  if (!container) return;

  if (!currentStartupData.strategicPartners) currentStartupData.strategicPartners = [];

  container.innerHTML = currentStartupData.strategicPartners.map((p, idx) => `
    <div class="glass-card p-2 rounded-lg border border-white/10 space-y-1.5 text-xs">
      <div class="flex items-center space-x-2">
        <img src="${p.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}" class="w-7 h-7 rounded object-cover border border-white/10 shrink-0">
        <input type="text" value="${p.name}" oninput="updatePartnerData(${idx}, 'name', this.value)" placeholder="Partner Name (e.g. Microsoft)" class="flex-1 bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-xs">
        <button type="button" onclick="removeStrategicPartner(${idx})" class="text-rose-400 hover:text-rose-300 text-[10px] font-semibold px-1 cursor-pointer">Remove</button>
      </div>
      <div class="flex items-center space-x-2">
        <label class="px-2 py-0.5 rounded bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200 text-[10px] font-bold cursor-pointer transition-all flex items-center space-x-1">
          <i data-lucide="upload" class="w-3 h-3"></i>
          <span>Logo</span>
          <input type="file" onchange="handlePartnerLogoUpload(${idx}, event)" accept="image/*" class="hidden">
        </label>
        <input type="text" value="${p.logo || ''}" oninput="updatePartnerData(${idx}, 'logo', this.value)" placeholder="Logo URL..." class="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-0.5 text-white text-[10px]">
      </div>
    </div>
  `).join("");

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

function updatePartnerData(idx, field, val) {
  if (currentStartupData.strategicPartners[idx]) {
    currentStartupData.strategicPartners[idx][field] = val;
    renderStrategicPartnersCanvas();
  }
}

function handlePartnerLogoUpload(idx, e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    if (currentStartupData.strategicPartners[idx]) {
      currentStartupData.strategicPartners[idx].logo = evt.target.result;
      renderStrategicPartnersForm();
      renderStrategicPartnersCanvas();
      showToast(`Updated logo for partner!`);
    }
  };
  reader.readAsDataURL(file);
}

function addStrategicPartnerField() {
  if (!currentStartupData.strategicPartners) currentStartupData.strategicPartners = [];
  currentStartupData.strategicPartners.push({
    name: "New Partner",
    logo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
  });
  renderStrategicPartnersForm();
  renderStrategicPartnersCanvas();
}

function removeStrategicPartner(idx) {
  currentStartupData.strategicPartners.splice(idx, 1);
  renderStrategicPartnersForm();
  renderStrategicPartnersCanvas();
}

function renderStrategicPartnersCanvas() {
  const container = document.getElementById("canvasPartnersGrid");
  if (!container) return;

  if (!currentStartupData.strategicPartners) currentStartupData.strategicPartners = [];

  container.innerHTML = currentStartupData.strategicPartners.map((p, idx) => `
    <div class="cursor-pointer hover:scale-110 transition-all flex items-center justify-center p-1" onclick="triggerPartnerFileInput(${idx})" data-tooltip="Click to change ${p.name || 'Partner'} logo">
      <img src="${p.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'}" class="h-6 md:h-7 w-auto max-w-[140px] min-w-[70px] object-contain drop-shadow-md rounded-md">
    </div>
  `).join("");

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

function triggerPartnerFileInput(idx) {
  const p = currentStartupData.strategicPartners[idx];
  if (!p) return;

  const choice = confirm(`Click OK to UPLOAD a local logo file for ${p.name || 'Partner'}, or CANCEL to enter an image URL.`);
  if (choice) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (evt) => handlePartnerLogoUpload(idx, evt);
    fileInput.click();
  } else {
    triggerPartnerLogoModal(idx);
  }
}

function triggerPartnerLogoModal(idx) {
  const p = currentStartupData.strategicPartners[idx];
  if (!p) return;

  const url = prompt(`Enter logo URL for ${p.name}:`, p.logo || "");
  if (url !== null && url.trim() !== "") {
    p.logo = url.trim();
    renderStrategicPartnersForm();
    renderStrategicPartnersCanvas();
    showToast(`Updated logo for ${p.name}!`);
  }
}

/* ---------------------------------------------------- */
/* BACKED BY INVESTORS MANAGEMENT */
/* ---------------------------------------------------- */
function renderBackedByForm() {
  const container = document.getElementById("backedByFormList");
  if (!container) return;

  if (!currentStartupData.backedBy) currentStartupData.backedBy = [];

  container.innerHTML = currentStartupData.backedBy.map((b, idx) => `
    <div class="glass-card p-2 rounded-lg border border-white/10 space-y-1.5 text-xs">
      <div class="flex items-center space-x-2">
        <img src="${b.logo || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80'}" class="w-7 h-7 rounded object-cover border border-white/10 shrink-0">
        <input type="text" value="${b.name}" oninput="updateBackedByData(${idx}, 'name', this.value)" placeholder="Investor Name (e.g. Y Combinator)" class="flex-1 bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-xs">
        <button type="button" onclick="removeBackedBy(${idx})" class="text-rose-400 hover:text-rose-300 text-[10px] font-semibold px-1 cursor-pointer">Remove</button>
      </div>
      <div class="flex items-center space-x-2">
        <label class="px-2 py-0.5 rounded bg-purple-600/40 hover:bg-purple-600 text-purple-200 text-[10px] font-bold cursor-pointer transition-all flex items-center space-x-1">
          <i data-lucide="upload" class="w-3 h-3"></i>
          <span>Logo</span>
          <input type="file" onchange="handleBackedByLogoUpload(${idx}, event)" accept="image/*" class="hidden">
        </label>
        <input type="text" value="${b.logo || ''}" oninput="updateBackedByData(${idx}, 'logo', this.value)" placeholder="Logo URL..." class="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-0.5 text-white text-[10px]">
      </div>
    </div>
  `).join("");

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

function updateBackedByData(idx, field, val) {
  if (currentStartupData.backedBy[idx]) {
    currentStartupData.backedBy[idx][field] = val;
    renderBackedByCanvas();
  }
}

function handleBackedByLogoUpload(idx, e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    if (currentStartupData.backedBy[idx]) {
      currentStartupData.backedBy[idx].logo = evt.target.result;
      renderBackedByForm();
      renderBackedByCanvas();
      showToast(`Updated investor logo!`);
    }
  };
  reader.readAsDataURL(file);
}

function addBackedByField() {
  if (!currentStartupData.backedBy) currentStartupData.backedBy = [];
  currentStartupData.backedBy.push({
    name: "New Investor VC",
    logo: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80"
  });
  renderBackedByForm();
  renderBackedByCanvas();
}

function removeBackedBy(idx) {
  currentStartupData.backedBy.splice(idx, 1);
  renderBackedByForm();
  renderBackedByCanvas();
}

function renderBackedByCanvas() {
  const container = document.getElementById("canvasBackedByGrid");
  if (!container) return;

  if (!currentStartupData.backedBy) currentStartupData.backedBy = [];

  container.innerHTML = currentStartupData.backedBy.map((b, idx) => `
    <div class="cursor-pointer hover:scale-110 transition-all flex items-center justify-center p-1" onclick="triggerBackedByFileInput(${idx})" data-tooltip="Click to change ${b.name || 'Investor'} logo">
      <img src="${b.logo || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80'}" class="h-6 md:h-7 w-auto max-w-[140px] min-w-[70px] object-contain drop-shadow-md rounded-md">
    </div>
  `).join("");

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

function triggerBackedByFileInput(idx) {
  const b = currentStartupData.backedBy[idx];
  if (!b) return;

  const choice = confirm(`Click OK to UPLOAD a local logo file for ${b.name || 'Investor'}, or CANCEL to enter an image URL.`);
  if (choice) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (evt) => handleBackedByLogoUpload(idx, evt);
    fileInput.click();
  } else {
    triggerBackedByLogoModal(idx);
  }
}

function triggerBackedByLogoModal(idx) {
  const b = currentStartupData.backedBy[idx];
  if (!b) return;

  const url = prompt(`Enter logo URL for ${b.name}:`, b.logo || "");
  if (url !== null && url.trim() !== "") {
    b.logo = url.trim();
    renderBackedByForm();
    renderBackedByCanvas();
    showToast(`Updated logo for ${b.name}!`);
  }
}

function triggerLogoUpload() {
  const currentLogo = currentStartupData.logo || "";
  const choice = prompt("Enter Startup Logo Image URL (or paste image link):", currentLogo);
  if (choice !== null && choice.trim() !== "") {
    currentStartupData.logo = choice.trim();
    if (document.getElementById("inputLogo")) {
      document.getElementById("inputLogo").value = choice.trim();
    }
    updateCanvasUI();
    showToast("Updated Startup Logo!");
  }
}

function handleStartupLogoFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const logoUrl = evt.target.result;
    currentStartupData.logo = logoUrl;
    if (document.getElementById("inputLogo")) {
      document.getElementById("inputLogo").value = logoUrl;
    }
    updateCanvasUI();
    showToast("Uploaded Startup Logo!");
  };
  reader.readAsDataURL(file);
}

/* ---------------------------------------------------- */
/* CANVAS STYLING CONTROLS (Colors, Fonts, Images) */
/* ---------------------------------------------------- */
function changeCanvasPrimaryColor(colorHex) {
  const picker = document.getElementById("canvasColorPicker");
  if (picker) picker.value = colorHex;

  currentStartupData.brandColor = colorHex;
  const stageBadge = document.getElementById("canvasStage");
  if (stageBadge) {
    stageBadge.style.borderColor = colorHex;
    stageBadge.style.color = colorHex;
  }
}

function changeCanvasFont(fontClass) {
  const canvas = document.getElementById("onePagerCanvas");
  if (!canvas) return;
  canvas.classList.remove("font-['Plus_Jakarta_Sans']", "font-['Inter']", "font-['Outfit']");
  canvas.classList.add(fontClass);
}

/* ---------------------------------------------------- */
/* AI DOCUMENT UPLOAD & PARSER SIMULATOR */
/* ---------------------------------------------------- */
function switchInputTab(tab) {
  const formTab = document.getElementById("tabContentForm");
  const uploadTab = document.getElementById("tabContentUpload");
  const btnForm = document.getElementById("tabBtnForm");
  const btnUpload = document.getElementById("tabBtnUpload");

  if (!formTab || !uploadTab) return;

  const activeTabClass = "py-2 px-3 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white shadow-md border border-cyan-400/30 flex items-center justify-center space-x-1.5 transition-all cursor-pointer font-bold";
  const inactiveTabClass = "py-2 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 flex items-center justify-center space-x-1.5 transition-all border border-transparent cursor-pointer font-bold";

  if (tab === "form") {
    formTab.classList.remove("hidden");
    uploadTab.classList.add("hidden");
    if (btnForm) btnForm.className = activeTabClass;
    if (btnUpload) btnUpload.className = inactiveTabClass;
  } else {
    formTab.classList.add("hidden");
    uploadTab.classList.remove("hidden");
    if (btnUpload) btnUpload.className = activeTabClass;
    if (btnForm) btnForm.className = inactiveTabClass;
  }
}

/* ---------------------------------------------------- */
/* SHARED STARTUP-DATA EXTRACTION (used by PDF upload    */
/* AND the "research this website" chat feature)         */
/* ---------------------------------------------------- */
const STARTUP_EXTRACTION_FIELDS = [
  "name", "tagline", "climateSector", "subSector", "stage", "marketSize",
  "totalFundRaised", "revenueLast12Months", "countries", "co2EmissionReduced",
  "avgEnergySavings", "waterSaved", "uspAIUse", "targetCustomer", "businessModel",
  "teamSize", "currentAsk", "incorporateYear", "headquaters", "website"
];

const STARTUP_FIELD_LABELS = {
  name: "Startup Name", tagline: "Tagline", climateSector: "Sector", subSector: "Sub Sector",
  stage: "Stage", marketSize: "Market Size", totalFundRaised: "Total Fund Raised",
  revenueLast12Months: "Revenue (Last 12M)", countries: "Countries", co2EmissionReduced: "CO2 Reduced",
  avgEnergySavings: "Energy Saved", waterSaved: "Water Saved", uspAIUse: "USP / AI Use",
  targetCustomer: "Target Customer", businessModel: "Business Model", teamSize: "Team Size",
  currentAsk: "Current Ask", incorporateYear: "Incorporation Year", headquaters: "Headquarters",
  website: "Website", foundingTeam: "Founding Team"
};

const STARTUP_FIELD_ALIASES = {
  name: ["startup_name", "company_name", "companyName"],
  uspAIUse: ["solution", "usp"],
  marketSize: ["tam"],
  currentAsk: ["ask", "fundingAsk"]
};

const NON_ANSWER_PATTERN = /^(n\/?a|not (mentioned|specified|stated|available|found|applicable)|unknown|none|no data|tbd|null)\.?$/i;

function isMeaningfulExtractedValue(val) {
  if (val === undefined || val === null) return false;
  const str = String(val).trim();
  if (!str) return false;
  return !NON_ANSWER_PATTERN.test(str);
}

function getStartupExtractionSystemPrompt() {
  return `You are an expert startup data parser for PageCraft AI.
Analyze the provided source text and return ONLY a valid JSON object matching this exact structure with no markdown backticks.
Only include a key if the source actually states or clearly implies that value. Omit any key entirely if it is not mentioned anywhere in the text — do not write "N/A", "Not mentioned", or invent a plausible-sounding value. Never invent founder names that aren't in the text.
{
  "name": "Startup Name",
  "tagline": "Short elevator tagline",
  "climateSector": "Primary industry sector",
  "subSector": "Sub sector or core technology focus",
  "stage": "Funding stage (e.g. Seed, Series A)",
  "marketSize": "TAM or Market size",
  "totalFundRaised": "Total funds raised to date",
  "revenueLast12Months": "Annual Revenue or ARR",
  "countries": "Active countries / expansion",
  "co2EmissionReduced": "CO2 reduction or environmental metric",
  "avgEnergySavings": "Average energy savings %",
  "waterSaved": "Water saved metric",
  "uspAIUse": "USP & how AI/ML is used in solution",
  "targetCustomer": "Ideal Target Customer Profile (ICP)",
  "businessModel": "Revenue & Business model",
  "teamSize": "Team size / employee count",
  "currentAsk": "Current funding ask",
  "incorporateYear": "Incorporation year",
  "headquaters": "Headquarters city & country",
  "website": "Company website",
  "foundingTeam": [
    {
      "name": "Full Name",
      "title": "Their exact title as stated (e.g. Co-Founder & CEO, or Head of Engineering)",
      "experience": "Background / Bio"
    }
  ]
}
For "foundingTeam": include EVERY person shown on any "team"/"leadership"/"founders" page, not only people whose title literally contains the word "founder". If a page/section lists several people under a "team"/"leadership" heading, all of them belong in this array with their exact stated titles.
CRITICAL: Do NOT include people from customer testimonials, reviews, quotes, or case studies — those people work at a DIFFERENT company (this is usually obvious because their own company's name is stated right next to their title, e.g. "Founder, Livstations" or "— Jane Doe, CEO of AcmeCorp"). Only include people who are clearly part of THIS startup's own team.
CRITICAL: Company names collide constantly — search results often mix in a completely different company that happens to share the same name (different domain, different country, different industry). If the source text names a specific website/domain for the startup, only use facts clearly tied to that exact domain/company, and ignore any result belonging to a same-named but unrelated business.`;
}

// Applies whatever the AI genuinely found to currentStartupData.
// - onlyFillEmpty: true  -> only fills fields that are currently blank (gap-filling, e.g. from the chat "research" feature)
// - onlyFillEmpty: false -> overwrites any field the AI found (e.g. a fresh PDF upload, which is the primary data source)
// Returns the list of field keys that were actually applied, for building a human-readable summary.
function applyStartupFieldsFromJSON(parsedJSON, sourceText, { onlyFillEmpty = false } = {}) {
  const appliedKeys = [];

  STARTUP_EXTRACTION_FIELDS.forEach((key) => {
    if (onlyFillEmpty && isMeaningfulExtractedValue(currentStartupData[key])) return;

    let val = parsedJSON?.[key];
    if (!isMeaningfulExtractedValue(val)) {
      for (const alias of STARTUP_FIELD_ALIASES[key] || []) {
        if (isMeaningfulExtractedValue(parsedJSON?.[alias])) {
          val = parsedJSON[alias];
          break;
        }
      }
    }
    if (isMeaningfulExtractedValue(val)) {
      currentStartupData[key] = val;
      appliedKeys.push(key);
    }
  });

  const hasExistingFounders = Array.isArray(currentStartupData.foundingTeam) && currentStartupData.foundingTeam.length > 0;
  if (!onlyFillEmpty || !hasExistingFounders) {
    const extractedFounders = extractFoundersFromPDFText(sourceText || "", parsedJSON);
    if (extractedFounders.length > 0) {
      currentStartupData.foundingTeam = extractedFounders;
      appliedKeys.push("foundingTeam");
    }
  }

  return appliedKeys;
}

// Real text extraction. PDFs are parsed server-side (actual PDF text layer,
// via pdf-parse) instead of guessing at raw bytes in the browser. Plain text
// files are read directly; other binary formats (.doc/.docx/.ppt/.pptx/images)
// aren't supported yet, so we return an empty string rather than feeding the
// AI garbled binary content that it could hallucinate real-looking data from.
async function readTextFromFile(file) {
  if (!file) return "";

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-document", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn("PDF parse warning:", data.error);
        return "";
      }
      return data.text || "";
    } catch (err) {
      console.warn("PDF parse request failed:", err);
      return "";
    }
  }

  const isPlainText = file.type.startsWith("text/") || /\.(txt|csv|md)$/i.test(file.name);
  if (!isPlainText) {
    return "";
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(typeof e.target?.result === "string" ? e.target.result : "");
    reader.onerror = () => resolve("");
    reader.readAsText(file);
  });
}

function extractFoundersFromPDFText(fileText, parsedJSON) {
  // 1. Check if AI returned a valid non-empty foundingTeam array
  const aiFounders = parsedJSON?.foundingTeam || parsedJSON?.founders || parsedJSON?.team;
  if (Array.isArray(aiFounders) && aiFounders.length > 0) {
    const valid = aiFounders.filter(f => f && isMeaningfulExtractedValue(f.name || f.fullName));
    if (valid.length > 0) {
      return valid.map((f, idx) => ({
        name: f.name || f.fullName || `Co-Founder ${idx + 1}`,
        title: f.title || f.role || (idx === 0 ? "Co-Founder & CEO" : "Co-Founder & Director"),
        experience: f.experience || f.bio || "Co-Founder & Executive Leader",
        photo: getFounderPhotoUrl(f, idx)
      }));
    }
  }

  // 2. Scan raw PDF text for names near leadership titles
  const foundNames = [];
  const nameTitlePattern = /\b([A-Z][a-z]{2,15}\s+(?:[A-Z][a-z]{2,15}\s+)?([A-Z][a-z]{2,15}))\b[\s\-\–|,]*(Co-Founder|Founder|CEO|CTO|CPO|Director|President|VP|Head of [A-Za-z]+|Partner|Leader)/gi;
  
  let match;
  while ((match = nameTitlePattern.exec(fileText)) !== null) {
    const name = match[1].trim();
    const role = match[3].trim();
    if (name && !foundNames.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      foundNames.push({
        name,
        title: role.toLowerCase().includes("founder") ? role : `Co-Founder & ${role}`,
        experience: "Executive Leader",
        photo: getFounderPhotoUrl({ name }, foundNames.length)
      });
    }
  }

  if (foundNames.length > 0) {
    return foundNames.slice(0, 6);
  }

  // 3. Fallback: Parse 2-word capitalized human name pairs from raw PDF text
  const namePairs = fileText.match(/\b[A-Z][a-z]{2,15}\s+[A-Z][a-z]{2,15}\b/g) || [];
  const ignoreList = ["Climate Tech", "Clean Energy", "Series A", "Total Addressable", "Market Size", "PageCraft AI", "HyperScale AI", "United States", "San Francisco", "Strategic Partner", "Impact Metric", "Solution Architecture", "Business Model", "Annual Revenue", "Target Customer", "Executive Summary", "Financial Growth"];
  
  const cleanPairs = namePairs.filter(p => !ignoreList.includes(p) && !p.toLowerCase().includes("tech") && !p.toLowerCase().includes("energy") && !p.toLowerCase().includes("market") && !p.toLowerCase().includes("data") && !p.toLowerCase().includes("system"));
  const uniqueNames = [...new Set(cleanPairs)];

  if (uniqueNames.length > 0) {
    return uniqueNames.slice(0, 4).map((nameStr, idx) => ({
      name: nameStr,
      title: idx === 0 ? "Co-Founder & CEO" : idx === 1 ? "Co-Founder & CTO" : idx === 2 ? "Co-Founder & CPO" : "Co-Founder & VP",
      experience: "Co-Founder & Executive",
      photo: getFounderPhotoUrl({ name: nameStr }, idx)
    }));
  }

  // 4. Nothing genuine found — return no founders rather than inventing
  // fictional people. The UI's "Add Co-Founder" button lets the user fill
  // this in by hand, and any founders already on the canvas are preserved
  // by the caller (handleDocUpload only overwrites foundingTeam when this
  // returns a non-empty array).
  return [];
}

async function handleDocUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const loader = document.getElementById("parsingLoader");
  const preview = document.getElementById("extractedDataPreview");
  const bar = document.getElementById("parsingProgressBar");

  if (loader) loader.classList.remove("hidden");
  if (preview) preview.classList.add("hidden");
  if (bar) bar.style.width = "15%";

  showToast(`Reading & extracting pitch deck: ${file.name}...`);

  try {
    const fileText = await readTextFromFile(file);
    if (bar) bar.style.width = "40%";

    const systemPrompt = getStartupExtractionSystemPrompt();

    if (bar) bar.style.width = "65%";

    let parsedJSON = null;
    let providerUsed = "Groq AI";
    // Only call the AI when we actually have real document text — sending
    // just a filename would let the model invent plausible-looking (but
    // fake) startup data instead of admitting there's nothing to read.
    // The backend runs this prompt 3x (temperature 0) and merges the JSON
    // results, since a single pass tends to randomly skip a field or two
    // even when the answer is clearly present in the text.
    if (fileText && fileText.trim().length > 20) {
      try {
        const docPrompt = `Pitch Deck Document File Name: ${file.name}\n\nExtracted Document Text:\n${fileText.slice(0, 15000)}`;
        const res = await fetch("/api/ai/extract-json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: docPrompt, systemInstruction: systemPrompt, attempts: 3 })
        });
        const data = await res.json();
        if (res.ok && data.foundAnything) {
          parsedJSON = data.data;
          providerUsed = data.provider || "Groq AI";
        }
      } catch (eAI) {
        console.warn("AI extraction warning:", eAI);
      }
    }

    if (bar) bar.style.width = "85%";

    // A fresh PDF upload is the primary data source, so found fields
    // overwrite whatever was already there (onlyFillEmpty: false).
    const appliedKeys = applyStartupFieldsFromJSON(parsedJSON, fileText, { onlyFillEmpty: false });
    const foundAnyField = appliedKeys.length > 0;

    window.latestExtractedStartupData = JSON.parse(JSON.stringify(currentStartupData));

    // Update UI preview card elements
    if (document.getElementById("extCompany")) document.getElementById("extCompany").innerText = currentStartupData.name || "—";
    if (document.getElementById("extSector")) document.getElementById("extSector").innerText = currentStartupData.climateSector || "—";
    if (document.getElementById("extTraction")) document.getElementById("extTraction").innerText = currentStartupData.revenueLast12Months || "—";
    if (document.getElementById("extAsk")) document.getElementById("extAsk").innerText = currentStartupData.currentAsk || "—";
    if (document.getElementById("extFounders")) {
      const founderNames = (currentStartupData.foundingTeam || []).map(f => f.name).filter(Boolean);
      document.getElementById("extFounders").innerText = founderNames.length ? founderNames.join(", ") : "None found — add manually";
    }
    if (document.getElementById("extConfidenceBadge")) {
      document.getElementById("extConfidenceBadge").innerText = foundAnyField ? "Extracted from document" : "Nothing extracted";
    }

    // AUTO-POPULATE Form Fields AND Update Live Canvas UI immediately!
    populateFormFields();
    updateCanvasUI();

    if (bar) bar.style.width = "100%";
    setTimeout(() => {
      if (loader) loader.classList.add("hidden");
      if (preview) preview.classList.remove("hidden");
      if (foundAnyField) {
        showToast(`✨ Pitch deck "${file.name}" extracted via ${providerUsed}! Applied to canvas and forms.`);
      } else if (!fileText) {
        showToast(`⚠️ Couldn't read text from "${file.name}". Only PDF text extraction is supported — please fill fields in manually.`);
      } else {
        showToast(`⚠️ No usable data found in "${file.name}". Please fill fields in manually.`);
      }
    }, 400);

  } catch (err) {
    console.error("Pitch deck extraction error:", err);
    if (loader) loader.classList.add("hidden");
    if (preview) preview.classList.remove("hidden");
    showToast(`⚠️ Couldn't process "${file.name}": ${err.message || "unknown error"}. Please fill fields in manually.`);
  }
}

function applyExtractedData() {
  populateFormFields();
  updateCanvasUI();
  switchInputTab("form");
  showToast("Extracted Pitch Deck metadata applied to form and canvas!");
}

/* ---------------------------------------------------- */
/* AI GENERATION & COPY ENHANCEMENT ENGINE */
/* ---------------------------------------------------- */
async function runAIGeneration() {
  const btn = event.currentTarget;
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>AI Enhancing One-Pager...</span>`;
  if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons();

  showToast("Connecting to AI Engine (Gemini/Groq) to generate startup copy...");

  const prompt = `You are a world-class venture capitalist and startup storyteller.
Current Startup Info:
- Name: ${currentStartupData.name || "HyperScale AI"}
- Sector: ${currentStartupData.climateSector || "Technology"}
- Stage: ${currentStartupData.stage || "Series A"}
- Tagline: ${currentStartupData.tagline || ""}
- Problem: ${currentStartupData.problemStatement || ""}
- Solution: ${currentStartupData.solution || ""}
- UVP: ${currentStartupData.uvp || ""}

Task: Generate an elevated, investor-ready set of copy fields for this startup. Return ONLY a valid JSON object matching this structure (no markdown backticks, no extra text):
{
  "tagline": "A punchy, memorable elevator tagline",
  "problemStatement": "A quantitative, high-impact enterprise problem statement",
  "solution": "A compelling description of the proprietary solution & product",
  "uvp": "A metric-driven unique value proposition (e.g. 10x throughput, 40% cost reduction)",
  "targetCustomer": "Refined Ideal Customer Profile (ICP)"
}`;

  try {
    const res = await callAIProvider(prompt, "You return strictly JSON format for startup one-pager generation.");
    let parsed = null;
    const jsonMatch = res.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch (e) {}
    }

    if (parsed) {
      if (parsed.tagline) currentStartupData.tagline = parsed.tagline;
      if (parsed.problemStatement) currentStartupData.problemStatement = parsed.problemStatement;
      if (parsed.solution) currentStartupData.solution = parsed.solution;
      if (parsed.uvp) currentStartupData.uvp = parsed.uvp;
      if (parsed.targetCustomer) currentStartupData.targetCustomer = parsed.targetCustomer;
    } else {
      // Direct text fallback if JSON parsing failed
      currentStartupData.uvp = res.text.slice(0, 200);
    }

    populateFormFields();
    updateCanvasUI();

    // Trigger visual canvas glow
    const canvas = document.getElementById("onePagerCanvas");
    if (canvas) {
      canvas.classList.add("glow-indigo");
      setTimeout(() => canvas.classList.remove("glow-indigo"), 2000);
    }

    showToast(`✨ One-Pager Enhanced live via ${res.provider}!`);
  } catch (err) {
    console.error("AI Generation Error:", err);
    showToast(`AI Enhancement Error: ${err.message}`);
  } finally {
    btn.innerHTML = originalHTML;
    if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons();
  }
}

async function triggerAICopyTool(action) {
  const actionsDesc = {
    rewrite: "rewriting for maximum clarity & investor engagement",
    improve: "elevating tone to tier-1 VC standards",
    shorten: "condensing copy for high impact",
    expand: "expanding value proposition with market differentiation"
  };

  const currentUvp = currentStartupData.uvp || currentStartupData.tagline || "Proprietary AI automation platform";
  showToast(`AI Tool (${action}): ${actionsDesc[action] || action}...`);

  const prompt = `Take this startup value proposition/tagline and ${action} it.
Current text: "${currentUvp}"

Action: ${action} (Target: Make it punchy, metric-driven, and institutional VC ready).
Return ONLY the final revised text string without quotes or conversational filler.`;

  try {
    const res = await callAIProvider(prompt, "You are a expert pitch deck editor. Output only the refined text.");
    const cleanText = res.text.trim().replace(/^["']|["']$/g, '');
    if (cleanText) {
      currentStartupData.uvp = cleanText;
      populateFormFields();
      updateCanvasUI();
      showToast(`✨ UVP ${action}d via ${res.provider}!`);
    }
  } catch (err) {
    console.error(`AI Tool ${action} error:`, err);
    showToast(`AI Tool Error: ${err.message}`);
  }
}

/* ---------------------------------------------------- */
/* BULK CREATION WORKSPACE & CSV GENERATOR */
/* ---------------------------------------------------- */
function switchView(view) {
  currentView = view;
  isUserAuthenticated = true;
  checkAuthState();

  const dashView = document.getElementById("mainDashboardView");
  const bulkView = document.getElementById("bulkWorkspaceView");
  const landingHero = document.getElementById("landingHero");

  const tabDash = document.getElementById("navTabDashboard");
  const tabBulk = document.getElementById("navTabBulk");

  if (landingHero) landingHero.classList.add("hidden");

  const activeViewClass = "py-2.5 px-3 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white shadow-lg border border-cyan-400/40 font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer";
  const inactiveViewClass = "py-2.5 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 font-bold flex items-center justify-center space-x-1.5 transition-all border border-transparent cursor-pointer";

  if (view === "dashboard") {
    if (dashView) dashView.classList.remove("hidden");
    if (bulkView) bulkView.classList.add("hidden");
    if (tabDash) tabDash.className = activeViewClass;
    if (tabBulk) tabBulk.className = inactiveViewClass;
  } else if (view === "bulk") {
    if (dashView) dashView.classList.add("hidden");
    if (bulkView) bulkView.classList.remove("hidden");
    if (tabBulk) tabBulk.className = activeViewClass;
    if (tabDash) tabDash.className = inactiveViewClass;
    updateBulkTotalCount();
    renderBulkGallery(currentBulkLayout);
  }
}

function switchBulkLayout(layout) {
  currentBulkLayout = layout;
  const btnGrid = document.getElementById("bulkViewGrid");
  const btnList = document.getElementById("bulkViewList");
  const btnCarousel = document.getElementById("bulkViewCarousel");

  [btnGrid, btnList, btnCarousel].forEach(b => {
    if (b) b.className = "px-3 py-1.5 rounded text-gray-400 hover:text-white flex items-center space-x-1.5";
  });

  if (layout === "grid" && btnGrid) btnGrid.className = "px-3 py-1.5 rounded bg-indigo-600 text-white font-semibold flex items-center space-x-1.5";
  if (layout === "list" && btnList) btnList.className = "px-3 py-1.5 rounded bg-indigo-600 text-white font-semibold flex items-center space-x-1.5";
  if (layout === "carousel" && btnCarousel) btnCarousel.className = "px-3 py-1.5 rounded bg-indigo-600 text-white font-semibold flex items-center space-x-1.5";

  renderBulkGallery(layout);
}

function bulkStatusBadgeClass(status) {
  if (status === "Ready") return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  if (status === "Sent") return "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30";
  if (status === "Generating" || status === "Sending") return "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse";
  if (status === "Error") return "bg-rose-500/20 text-rose-300 border border-rose-500/30";
  return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
}

function toggleBulkSelection(id, checked) {
  if (checked) selectedBulkIds.add(id);
  else selectedBulkIds.delete(id);
  updateBulkSelectionUI();
}

function toggleSelectAllBulk(checked) {
  selectedBulkIds = checked ? new Set(bulkStartupsList.map((i) => i.id)) : new Set();
  renderBulkGallery(currentBulkLayout);
}

function updateBulkSelectionUI() {
  const sendBtn = document.getElementById("bulkSendSelectedBtn");
  const countEl = document.getElementById("bulkSelectedCount");
  const selectAllBox = document.getElementById("bulkSelectAllCheckbox");

  if (sendBtn) sendBtn.disabled = selectedBulkIds.size === 0;
  if (countEl) countEl.innerText = selectedBulkIds.size;
  if (selectAllBox) {
    selectAllBox.checked = bulkStartupsList.length > 0 && selectedBulkIds.size === bulkStartupsList.length;
    selectAllBox.indeterminate = selectedBulkIds.size > 0 && selectedBulkIds.size < bulkStartupsList.length;
  }
}

function bulkCardCheckbox(item) {
  const checked = selectedBulkIds.has(item.id) ? "checked" : "";
  return `<label class="absolute top-3 left-3 z-10 w-6 h-6 rounded-md bg-black/50 backdrop-blur flex items-center justify-center cursor-pointer border border-white/20" onclick="event.stopPropagation()">
    <input type="checkbox" ${checked} onchange="toggleBulkSelection('${item.id}', this.checked)" class="w-4 h-4 accent-indigo-500 cursor-pointer">
  </label>`;
}

function renderBulkGallery(layout) {
  const container = document.getElementById("bulkGalleryContainer");
  if (!container) return;

  if (layout === "grid") {
    container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
    container.innerHTML = bulkStartupsList.map(item => `
      <div class="relative glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-indigo-500/40 transition-all">
        ${bulkCardCheckbox(item)}
        <div>
          <div class="flex items-center justify-between mb-3 pl-7">
            <img src="${item.logo}" class="w-10 h-10 rounded-lg object-cover border border-white/10">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${bulkStatusBadgeClass(item.status)}">
              ${item.status}
            </span>
          </div>
          <h3 class="text-base font-bold text-white font-['Outfit']">${item.name || "Untitled Startup"}</h3>
          <span class="text-xs text-indigo-400 font-medium block">${item.climateSector || "—"} • ${item.stage || "—"}</span>
          <p class="text-xs text-gray-400 mt-2 line-clamp-2">${item.tagline || item.uspAIUse || ""}</p>

          <div class="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span class="text-[10px] text-gray-500 block">Revenue / Traction</span>
              <span class="text-white font-semibold text-[11px] truncate block">${item.revenueLast12Months || "—"}</span>
            </div>
            <div>
              <span class="text-[10px] text-gray-500 block">Funding Ask</span>
              <span class="text-indigo-300 font-semibold text-[11px] truncate block">${item.currentAsk || "—"}</span>
            </div>
          </div>
        </div>

        <div class="mt-5 pt-3 border-t border-white/10 flex items-center justify-between space-x-2">
          <button onclick="openBulkEditModal('${item.id}')" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-200 flex items-center space-x-1">
            <i data-lucide="edit-3" class="w-3.5 h-3.5 text-indigo-400"></i>
            <span>Edit</span>
          </button>
          <button onclick="openReviewModalForBulk('${item.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1">
            <i data-lucide="send" class="w-3.5 h-3.5"></i>
            <span>Review</span>
          </button>
        </div>
      </div>
    `).join("");
  } else if (layout === "list") {
    container.className = "space-y-3 w-full";
    container.innerHTML = bulkStartupsList.map(item => `
      <div class="relative glass-card p-4 pl-14 rounded-xl border border-white/10 flex items-center justify-between">
        ${bulkCardCheckbox(item)}
        <div class="flex items-center space-x-4">
          <img src="${item.logo}" class="w-10 h-10 rounded-lg object-cover border border-white/10">
          <div>
            <h3 class="text-sm font-bold text-white">${item.name || "Untitled Startup"}</h3>
            <span class="text-xs text-gray-400">${item.climateSector || "—"} | ${item.stage || "—"} | ${item.headquaters || "—"}</span>
          </div>
        </div>
        <div class="hidden md:flex items-center space-x-6 text-xs">
          <div>
            <span class="text-gray-500 text-[10px] block">Revenue</span>
            <span class="text-white font-medium">${item.revenueLast12Months || "—"}</span>
          </div>
          <div>
            <span class="text-gray-500 text-[10px] block">Ask</span>
            <span class="text-indigo-400 font-medium">${item.currentAsk || "—"}</span>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="openBulkEditModal('${item.id}')" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-200">Edit</button>
          <button onclick="openReviewModalForBulk('${item.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs">Review</button>
        </div>
      </div>
    `).join("");
  } else if (layout === "carousel") {
    container.className = "flex space-x-6 overflow-x-auto pb-4";
    container.innerHTML = bulkStartupsList.map(item => `
      <div class="relative glass-card p-5 rounded-2xl border border-white/10 min-w-[300px] flex flex-col justify-between">
        ${bulkCardCheckbox(item)}
        <div>
          <img src="${item.logo}" class="w-12 h-12 rounded-lg object-cover mb-3">
          <h3 class="text-base font-bold text-white">${item.name || "Untitled Startup"}</h3>
          <span class="text-xs text-indigo-400">${item.climateSector || "—"}</span>
          <p class="text-xs text-gray-400 mt-2">${item.tagline || item.uspAIUse || ""}</p>
        </div>
        <button onclick="openBulkEditModal('${item.id}')" class="mt-4 w-full py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold">Edit One-Pager</button>
      </div>
    `).join("");
  }

  updateBulkSelectionUI();
  lucide.createIcons();
}

// Asks the AI to turn one bulk row's raw facts into proper one-pager copy.
// Only fills gaps — a row that already came in with rich data (e.g. from the
// full startup spreadsheet) keeps what it has rather than being overwritten.
async function generateBulkStartupWithAI(item) {
  const prompt = `Startup Name: ${item.name}
Sector: ${item.climateSector}
Stage: ${item.stage}
Headquarters: ${item.headquaters}
Revenue / Traction: ${item.revenueLast12Months}
Funding Ask: ${item.currentAsk}
Existing tagline/description: ${item.tagline || "Not provided"}

Write a compelling investor one-pager profile for this startup. Return ONLY a valid JSON object, no markdown backticks, no commentary:
{
  "tagline": "punchy one-line tagline (under 12 words)",
  "uspAIUse": "2-3 sentence USP and how technology/AI is used in the product",
  "targetCustomer": "who the ideal customer is, one sentence",
  "businessModel": "the revenue/business model, one sentence"
}`;

  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      systemInstruction: "You are a startup pitch copywriter. Return ONLY valid JSON matching the requested structure, nothing else."
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "AI generation failed.");

  const match = (data.text || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI did not return usable JSON.");
  const enriched = JSON.parse(match[0]);

  // Gap-fill only — never clobber real data already present on this row.
  const filled = {};
  Object.keys(enriched).forEach((key) => {
    if (!isMeaningfulExtractedValue(item[key])) filled[key] = enriched[key];
  });
  return filled;
}

// Processes every row with a real AI call, one at a time (bulk AI calls run
// sequentially rather than in parallel to stay under provider rate limits),
// updating each card's status and the progress bar as real results land —
// no fake timer, no simulated progress.
async function runBulkGeneratorBatch() {
  if (bulkStartupsList.length === 0) {
    showToast("No startups to process — upload a spreadsheet first.");
    return;
  }

  const container = document.getElementById("bulkProgressBarContainer");
  const bar = document.getElementById("bulkProgressBar");
  const text = document.getElementById("bulkProgressText");
  const total = bulkStartupsList.length;

  container.classList.remove("hidden");
  bar.style.width = "0%";
  text.innerText = `0 of ${total} completed`;

  let succeeded = 0;

  for (let i = 0; i < total; i++) {
    const item = bulkStartupsList[i];
    item.status = "Generating";
    renderBulkGallery(currentBulkLayout);

    try {
      const enriched = await generateBulkStartupWithAI(item);
      Object.assign(item, enriched);
      item.status = "Ready";
      succeeded++;
    } catch (err) {
      console.warn(`Bulk AI generation failed for "${item.name}":`, err);
      item.status = "Error";
    }

    const done = i + 1;
    bar.style.width = `${Math.round((done / total) * 100)}%`;
    text.innerText = `${done} of ${total} completed`;
    renderBulkGallery(currentBulkLayout);
  }

  setTimeout(() => container.classList.add("hidden"), 800);

  if (succeeded === total) {
    showToast(`✨ Successfully generated all ${total} one-pagers with AI!`);
  } else {
    showToast(`AI generation finished — ${succeeded} of ${total} succeeded. Failed ones are marked "Error" and can be retried.`);
  }
}

/* ---------------------------------------------------- */
/* BULK EDIT POPUP — reuses the real editable canvas by  */
/* physically moving its DOM node into the modal and back */
/* ---------------------------------------------------- */
let bulkEditingItemId = null;
let bulkEditSavedStartupData = null;
let bulkEditCanvasOriginalParent = null;
let bulkEditCanvasOriginalNextSibling = null;

const CANVAS_SHAPED_FIELDS = [
  "name", "tagline", "climateSector", "subSector", "stage", "marketSize",
  "totalFundRaised", "revenueLast12Months", "countries", "co2EmissionReduced",
  "avgEnergySavings", "waterSaved", "uspAIUse", "targetCustomer", "businessModel",
  "teamSize", "currentAsk", "incorporateYear", "headquaters", "website", "logo"
];

function bulkItemToStartupData(item) {
  const data = JSON.parse(JSON.stringify(DEFAULT_STARTUP));
  CANVAS_SHAPED_FIELDS.forEach((key) => {
    if (isMeaningfulExtractedValue(item[key])) data[key] = item[key];
  });
  data.foundingTeam = item.foundingTeam && item.foundingTeam.length ? item.foundingTeam : [];
  data.strategicPartners = item.strategicPartners && item.strategicPartners.length ? item.strategicPartners : [];
  data.backedBy = item.backedBy && item.backedBy.length ? item.backedBy : [];
  return data;
}

function openBulkEditModal(id) {
  const item = bulkStartupsList.find((b) => b.id === id);
  if (!item) return;

  bulkEditingItemId = id;
  bulkEditSavedStartupData = currentStartupData;
  currentStartupData = bulkItemToStartupData(item);

  const canvasEl = document.getElementById("onePagerCanvas");
  const host = document.getElementById("bulkEditCanvasHost");
  bulkEditCanvasOriginalParent = canvasEl.parentElement;
  bulkEditCanvasOriginalNextSibling = canvasEl.nextSibling;
  host.appendChild(canvasEl);

  document.getElementById("bulkEditModal").classList.remove("hidden");
  populateFormFields();
  updateCanvasUI();
  if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons();
}

function closeBulkEditModal() {
  const item = bulkStartupsList.find((b) => b.id === bulkEditingItemId);
  if (item) {
    CANVAS_SHAPED_FIELDS.forEach((key) => { item[key] = currentStartupData[key]; });
    item.foundingTeam = currentStartupData.foundingTeam || [];
    item.strategicPartners = currentStartupData.strategicPartners || [];
    item.backedBy = currentStartupData.backedBy || [];
  }

  const canvasEl = document.getElementById("onePagerCanvas");
  if (bulkEditCanvasOriginalNextSibling) {
    bulkEditCanvasOriginalParent.insertBefore(canvasEl, bulkEditCanvasOriginalNextSibling);
  } else if (bulkEditCanvasOriginalParent) {
    bulkEditCanvasOriginalParent.appendChild(canvasEl);
  }

  document.getElementById("bulkEditModal").classList.add("hidden");
  currentStartupData = bulkEditSavedStartupData;
  bulkEditSavedStartupData = null;
  bulkEditingItemId = null;

  populateFormFields();
  updateCanvasUI();
  renderBulkGallery(currentBulkLayout);
  showToast(item ? `Saved changes to ${item.name}` : "Closed editor");
}

function downloadSampleCSV() {
  const header = "Startup Name,Sector,Stage,Location,Traction,Ask,Reviewer Email,Description";
  const rows = SAMPLE_BULK_STARTUPS.map((s) => [
    s.name, s.sector, s.stage, s.location, s.currentTraction, s.currentAsk, s.reviewerEmail, s.description
  ].map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");

  const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(`${header}\n${rows}`);
  const link = document.createElement("a");
  link.setAttribute("href", csvContent);
  link.setAttribute("download", "PageCraft_Bulk_Startups_Sample.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Downloaded sample startup CSV template!");
}

// Case/spacing-insensitive lookup so "Startup Name", "startup_name", "Name",
// "Company" etc. all resolve to the same field regardless of how the user
// titled their spreadsheet columns.
function findColumnValue(row, ...candidateNames) {
  const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const rowKeys = Object.keys(row);
  for (const candidate of candidateNames) {
    const target = normalize(candidate);
    const match = rowKeys.find((k) => normalize(k) === target);
    if (match && String(row[match]).trim()) return String(row[match]).trim();
  }
  return "";
}

// Best-effort company name from a logo URL when the sheet only gives a logo
// (e.g. Clearbit-style "https://logo.clearbit.com/ibm.com" -> "Ibm") — the
// sheet format this app expects doesn't include separate partner/backer
// name columns, only logo URLs.
function deriveNameFromLogoUrl(url) {
  try {
    const u = new URL(url);
    const domain = u.pathname.replace(/^\//, "") || u.hostname;
    const base = domain.split(".")[0];
    return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Partner";
  } catch {
    return "Partner";
  }
}

function extractFoundersFromRow(row) {
  const founders = [];
  for (let n = 1; n <= 3; n++) {
    const name = findColumnValue(row, `founder${n}Name`, `Founder ${n} Name`, `Founder${n}`);
    if (!name) continue;
    const title = findColumnValue(row, `founder${n}Role`, `Founder ${n} Role`, `Founder${n}Title`) || "Co-Founder";
    const photo = findColumnValue(row, `founder${n}PhotoUrl`, `Founder ${n} Photo`) || getFounderPhotoUrl({ name }, n - 1);
    founders.push({ name, title, photo });
  }
  return founders;
}

function extractLogoArrayFromRow(row, prefix, count) {
  const list = [];
  for (let n = 1; n <= count; n++) {
    const logo = findColumnValue(row, `${prefix}${n}LogoUrl`, `${prefix} ${n} Logo`, `${prefix}${n} Logo Url`);
    if (!logo) continue;
    list.push({ name: deriveNameFromLogoUrl(logo), logo });
  }
  return list;
}

// Maps one spreadsheet row onto the full canvas-shaped bulk item. Column
// names are checked against both this app's own rich schema (startupName,
// climateSector, uspAiUsage, ...) and plainer generic names (Name, Sector,
// USP, ...), so either a fully-detailed sheet or a bare-bones one maps
// correctly through the same function.
function mapExcelRowToBulkItem(row, idx) {
  const name = findColumnValue(row, "startupName", "Startup Name", "Name", "Company", "Company Name") || `Startup ${idx + 1}`;

  return {
    id: `bulk-${Date.now()}-${idx}`,
    status: "Draft",
    reviewerEmail: findColumnValue(row, "contactEmail", "Contact Email", "email", "Email", "Reviewer Email"),

    name,
    tagline: findColumnValue(row, "startupDescription", "Tagline", "Description", "Summary"),
    climateSector: findColumnValue(row, "climateSector", "Sector", "Industry"),
    subSector: findColumnValue(row, "subSectors", "subSector", "Sub Sector", "Sub-Sector"),
    stage: findColumnValue(row, "stage", "Funding Stage"),
    marketSize: findColumnValue(row, "marketSize", "Market Size", "TAM"),
    totalFundRaised: findColumnValue(row, "totalFundingRaised", "Total Fund Raised", "Total Funding Raised", "Funding Raised"),
    revenueLast12Months: findColumnValue(row, "revenueLast12Months", "Revenue", "Revenue Last 12 Months", "Traction", "Current Traction"),
    countries: findColumnValue(row, "marketsOperatingIn", "Markets Operating In", "Countries", "Markets"),
    co2EmissionReduced: findColumnValue(row, "co2EmissionsReduced", "CO2 Emission Reduced", "CO2 Emissions Reduced", "CO2 Reduced"),
    avgEnergySavings: findColumnValue(row, "energySavings", "Energy Savings", "Avg Energy Savings"),
    waterSaved: findColumnValue(row, "waterSaved", "Water Saved"),
    uspAIUse: findColumnValue(row, "uspAiUsage", "USP", "USP AI Use", "USP/AI Use"),
    targetCustomer: findColumnValue(row, "targetCustomers", "Target Customers", "Target Customer"),
    businessModel: findColumnValue(row, "businessModel", "Business Model"),
    teamSize: findColumnValue(row, "teamSize", "Team Size"),
    currentAsk: findColumnValue(row, "currentAsk", "Ask", "Funding Ask", "Current Ask"),
    incorporateYear: findColumnValue(row, "incorporationYear", "Incorporation Year", "Incorporate Year", "Founded"),
    headquaters: findColumnValue(row, "headquarters", "Headquarters", "Location", "HQ"),
    website: findColumnValue(row, "website", "Website"),
    logo: findColumnValue(row, "startupLogoUrl", "Startup Logo Url", "Logo", "Logo URL") ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=ffffff&bold=true`,

    foundingTeam: extractFoundersFromRow(row),
    strategicPartners: extractLogoArrayFromRow(row, "partner", 2),
    backedBy: extractLogoArrayFromRow(row, "backedBy", 2)
  };
}

async function handleBulkFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  showToast(`Reading "${file.name}"...`);

  try {
    if (typeof XLSX === "undefined") {
      throw new Error("Spreadsheet reader failed to load. Check your connection and try again.");
    }
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

    if (rows.length === 0) {
      showToast(`"${file.name}" has no data rows. Check the file and try again.`);
      return;
    }

    bulkStartupsList = rows.map((row, idx) => mapExcelRowToBulkItem(row, idx));
    selectedBulkIds = new Set();
    updateBulkTotalCount();
    renderBulkGallery(currentBulkLayout);
    showToast(`Loaded ${bulkStartupsList.length} startup${bulkStartupsList.length === 1 ? "" : "s"} from "${file.name}".`);
  } catch (err) {
    console.error("Bulk file upload error:", err);
    showToast(`Couldn't read "${file.name}": ${err.message || "unknown error"}`);
  } finally {
    e.target.value = "";
  }
}

function updateBulkTotalCount() {
  const el = document.getElementById("bulkTotalCount");
  if (el) el.innerText = `${bulkStartupsList.length} Record${bulkStartupsList.length === 1 ? "" : "s"}`;
}

/* ---------------------------------------------------- */
/* SEND FOR REVIEW & EMAIL WORKFLOW */
/* ---------------------------------------------------- */
function openReviewModal() {
  document.getElementById("reviewModal").classList.remove("hidden");
}

let activeReviewContextName = null;

function openReviewModalForBulk(id) {
  const item = bulkStartupsList.find((b) => b.id === id);
  if (!item) return;

  activeReviewContextName = item.name;
  document.getElementById("emailSubject").value = `${item.name} — One-Pager Ready for Your Review`;
  document.getElementById("emailRecipient").value = item.reviewerEmail || "";
  const missing = getMissingFieldLabels(item);
  document.getElementById("emailBody").value = buildReviewEmailBody(item, missing);
  openReviewModal();
}

function closeReviewModal() {
  document.getElementById("reviewModal").classList.add("hidden");
}

/* ---------------------------------------------------- */
/* BULK "SEND FOR REVIEW" — real PDF attachment + a note */
/* about any fields the sheet didn't have data for        */
/* ---------------------------------------------------- */
const BULK_REQUIRED_FIELD_LABELS = {
  climateSector: "Climate Sector", subSector: "Sub Sector", stage: "Stage",
  marketSize: "Market Size", uspAIUse: "USP / How AI Is Used", targetCustomer: "Target Customer",
  businessModel: "Business Model", teamSize: "Team Size", totalFundRaised: "Total Fund Raised",
  revenueLast12Months: "Revenue (Last 12 Months)", countries: "Markets Operating In",
  co2EmissionReduced: "CO2 Emission Reduced", avgEnergySavings: "Energy Savings", waterSaved: "Water Saved",
  currentAsk: "Current Ask", incorporateYear: "Incorporation Year", headquaters: "Headquarters", website: "Website"
};

function getMissingFieldLabels(item) {
  const missing = Object.entries(BULK_REQUIRED_FIELD_LABELS)
    .filter(([key]) => !isMeaningfulExtractedValue(item[key]))
    .map(([, label]) => label);
  if (!item.foundingTeam || item.foundingTeam.length === 0) missing.push("Founding Team");
  return missing;
}

// EmailJS's file-attachment feature is a paid add-on, so instead the PDF is
// hosted briefly on our own server (see /api/store-pdf) and the email links
// to it — no attachment, no upgrade needed, and it works in every mail client.
function buildReviewEmailBody(item, missingLabels, pdfUrl) {
  const greetingName = (item.foundingTeam && item.foundingTeam[0] && item.foundingTeam[0].name) || "there";
  let body = `Hi ${greetingName},\n\nWe've prepared the investor one-pager for ${item.name}, ready for your review.\n`;

  if (pdfUrl) {
    body += `\nYou can view/download it here:\n${pdfUrl}\n`;
  }

  if (missingLabels && missingLabels.length > 0) {
    body += `\nWhile putting this together, we noticed the following information wasn't available in our records:\n`;
    body += missingLabels.map((l) => `- ${l}`).join("\n");
    body += `\n\nIf you're able to share these details, we'll update the one-pager to make it complete.\n`;
  }

  body += `\nBest regards,\nPageCraft AI Team`;
  return body;
}

// Uploads a generated PDF to our own server and returns a full, shareable
// download URL (valid for 48 hours).
async function uploadPdfAndGetLink(base64, filename) {
  const res = await fetch("/api/store-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, filename })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to upload the PDF.");
  return `${window.location.origin}${data.url}`;
}

// Renders the given canvas-shaped data onto the real #onePagerCanvas and
// Waits for every <img> inside a container to finish loading (or fail) before
// resolving, so html2canvas never captures a page with images mid-fetch.
// Caps the wait so one slow/broken image can't hang the whole batch forever.
function waitForImagesToLoad(container, timeoutMs = 4000) {
  const imgs = Array.from(container.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();

  const loadPromises = imgs.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  });

  const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([Promise.all(loadPromises), timeout]);
}

// Swaps every <img src> in a container for a same-origin data: URI fetched
// through /api/proxy-image. html2canvas can only read pixels from an image
// that was loaded with CORS permission, and most external photo hosts
// (LinkedIn, Google Drive, ui-avatars.com, a startup's own website) don't
// send the right headers for that — the photo displays fine on screen but
// comes out blank in the export. A same-origin data: URI has no such
// restriction, so this makes every photo capture-safe regardless of source.
function inlineImagesAsDataUris(container) {
  const imgs = Array.from(container.querySelectorAll("img"));
  return Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) return;
    try {
      const resp = await fetch(`/api/proxy-image?url=${encodeURIComponent(src)}`);
      if (!resp.ok) return; // leave original src — its onerror fallback (if any) still applies
      const blob = await resp.blob();
      const dataUri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      img.src = dataUri;
    } catch {
      // network hiccup or blocked source — leave the original src so at
      // worst that one photo is missing, rather than failing the export
    }
  }));
}

// Clones #onePagerCanvas into an off-screen container fixed at its true
// design size (794x1123, the A4 page at 96 DPI) and captures THAT with
// html2canvas, instead of capturing the live element in place. Capturing
// the live element directly is unreliable: the customization side panel
// can squeeze it narrower than 794px (stretching/cropping content in the
// export), and during the bulk-send view swap it can even be display:none
// (0x0, blank export). The clone always lays out at full, correct size.
// It also gets an explicit background color, because several templates
// (e.g. the glassmorphic "Modern SaaS" grid) have no background of their
// own on #onePagerCanvas — on screen the dark app background shows through
// from behind it, but html2canvas only captures the element itself, so a
// transparent capture turns solid white once flattened to JPEG.
function captureOnePagerCanvas(scale) {
  return new Promise((resolve, reject) => {
    const original = document.getElementById("onePagerCanvas");
    if (!original || typeof html2canvas === "undefined") {
      reject(new Error("Export libraries not loaded."));
      return;
    }

    const liveBg = getComputedStyle(original).backgroundColor;
    const appBg = getComputedStyle(document.body).backgroundColor;
    const isTransparent = !liveBg || liveBg === "rgba(0, 0, 0, 0)" || liveBg === "transparent";
    const isAppBgOpaque = appBg && appBg !== "rgba(0, 0, 0, 0)" && appBg !== "transparent";
    const fallbackBg = isTransparent ? (isAppBgOpaque ? appBg : "#090d16") : liveBg;

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:fixed; top:0; left:-99999px; width:794px; height:1123px; overflow:hidden; z-index:-1; margin:0; padding:0;";

    const clone = original.cloneNode(true);
    clone.style.setProperty("width", "794px", "important");
    clone.style.setProperty("max-width", "794px", "important");
    clone.style.setProperty("height", "1123px", "important");
    clone.style.setProperty("min-height", "1123px", "important");
    clone.style.margin = "0";

    // html2canvas doesn't reliably render `text-overflow: ellipsis` — it's a
    // known limitation where it clips the text raggedly mid-glyph with no
    // "..." instead of truncating cleanly. Since this export exists to show
    // a startup's real figures, let anything using Tailwind's .truncate
    // (nowrap + ellipsis) wrap onto extra lines in the capture instead of
    // losing part of the value.
    clone.querySelectorAll(".truncate").forEach((el) => {
      el.style.setProperty("white-space", "normal", "important");
      el.style.setProperty("overflow", "visible", "important");
      el.style.setProperty("text-overflow", "clip", "important");
      el.style.setProperty("word-break", "break-word", "important");
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const cleanup = () => { if (wrapper.parentNode) document.body.removeChild(wrapper); };

    // Also wait for web fonts (e.g. Plus Jakarta Sans) to finish loading —
    // if html2canvas snapshots text before its real font is ready, it uses
    // fallback-font metrics with different line-height, so wrapped values
    // (like a 2-line impact-metric figure) render with the second line
    // clipped by the card's box even though nothing actually overflows.
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

    inlineImagesAsDataUris(clone)
      .then(() => Promise.all([waitForImagesToLoad(clone), fontsReady]))
      .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
      .then(() => html2canvas(clone, {
        scale: scale || 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: fallbackBg,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123
      }))
      .then((cvs) => { cleanup(); resolve(cvs); })
      .catch((err) => { cleanup(); reject(err); });
  });
}

// Generates the one-page PDF as base64 — used by the bulk "Send for Review"
// flow, which needs raw bytes to upload rather than a browser download.
function generateOnePagerPdfBase64() {
  return captureOnePagerCanvas(2).then((cvs) => {
    if (!window.jspdf) throw new Error("Export libraries not loaded.");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const imgData = cvs.toDataURL("image/jpeg", 0.92);
    pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    const dataUri = pdf.output("datauristring");
    const base64 = dataUri.split("base64,")[1] || "";
    if (!base64) throw new Error("PDF generation produced no data.");
    return base64;
  });
}

async function sendReviewEmailWithPdfLink(item, pdfBase64, missingLabels) {
  if (!item.reviewerEmail) {
    throw new Error("No contact email on file for this startup.");
  }
  if (!window.emailjs || typeof emailjs.send !== "function") {
    throw new Error("Email service failed to load.");
  }

  const pdfUrl = await uploadPdfAndGetLink(pdfBase64, `${item.name}_OnePager.pdf`);

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: item.reviewerEmail,
    subject: `${item.name} — One-Pager Ready for Your Review`,
    message: buildReviewEmailBody(item, missingLabels, pdfUrl),
    name: "PageCraft AI",
    from_name: "PageCraft AI",
    email: item.reviewerEmail,
    time: new Date().toLocaleString()
  });
}

function showBulkSendOverlay(text) {
  let overlay = document.getElementById("bulkSendOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "bulkSendOverlay";
    overlay.className = "fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex flex-col items-center justify-center gap-4";
    overlay.innerHTML = `
      <i data-lucide="loader-2" class="w-8 h-8 text-indigo-400 animate-spin"></i>
      <span id="bulkSendOverlayText" class="text-sm text-white font-semibold"></span>
    `;
    document.body.appendChild(overlay);
  }
  overlay.classList.remove("hidden");
  document.getElementById("bulkSendOverlayText").innerText = text;
  if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons();
}

function updateBulkSendOverlay(text) {
  const el = document.getElementById("bulkSendOverlayText");
  if (el) el.innerText = text;
}

function hideBulkSendOverlay() {
  const overlay = document.getElementById("bulkSendOverlay");
  if (overlay) overlay.remove();
}

// The main bulk action: for every checked startup, render its real one-pager,
// export it as a PDF, and email it to that startup's own contact address —
// noting any fields our records were missing so they can send that data back.
async function sendSelectedForReview() {
  const selectedItems = bulkStartupsList.filter((i) => selectedBulkIds.has(i.id));
  if (selectedItems.length === 0) {
    showToast("Select at least one startup first.");
    return;
  }

  const missingEmail = selectedItems.filter((i) => !i.reviewerEmail);
  if (missingEmail.length > 0) {
    showToast(`⚠️ ${missingEmail.length} selected startup(s) have no contact email — deselect or fix those first: ${missingEmail.map((i) => i.name).join(", ")}`);
    return;
  }

  if (!confirm(`Send one-pager review emails to ${selectedItems.length} startup(s)?`)) return;

  showBulkSendOverlay(`Preparing ${selectedItems.length} one-pager(s)...`);

  const savedStartupData = currentStartupData;
  const savedView = currentView;
  const dashView = document.getElementById("mainDashboardView");
  const bulkView = document.getElementById("bulkWorkspaceView");

  // checkAuthState()/switchView() set an inline style.display on these views
  // (not just the "hidden" class) based on currentView. If we only touch the
  // class here, that inline style keeps forcing display:none — the canvas
  // stays 0x0 and html2canvas captures a blank page no matter how long we
  // wait. So flip currentView too and set style.display directly.
  currentView = "dashboard";
  dashView.classList.remove("hidden");
  dashView.style.display = "flex";
  bulkView.classList.add("hidden");
  bulkView.style.display = "none";

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < selectedItems.length; i++) {
    const item = selectedItems[i];
    updateBulkSendOverlay(`Generating PDF for ${item.name} (${i + 1}/${selectedItems.length})...`);
    try {
      currentStartupData = bulkItemToStartupData(item);
      updateCanvasUI();
      // A single frame so updateCanvasUI()'s DOM writes are committed before
      // we clone the element for capture (captureOnePagerCanvas handles its
      // own image-load/layout waits on the clone itself).
      await new Promise((r) => requestAnimationFrame(r));

      const pdfBase64 = await generateOnePagerPdfBase64();
      const missing = getMissingFieldLabels(item);

      updateBulkSendOverlay(`Emailing ${item.name} (${i + 1}/${selectedItems.length})...`);
      await sendReviewEmailWithPdfLink(item, pdfBase64, missing);

      item.status = "Sent";
      sent++;
      notificationFeed.unshift({
        id: `notif-${Date.now()}-${i}`,
        timestamp: "Just now",
        title: "Email Sent Successfully",
        message: `Sent one-pager review email to ${item.reviewerEmail}${missing.length ? ` (noted ${missing.length} missing field${missing.length === 1 ? "" : "s"})` : ""}`,
        type: "sent",
        read: false,
        startupName: item.name
      });
    } catch (err) {
      console.error(`Failed to send review email for "${item.name}":`, err);
      item.status = "Error";
      failed++;
    }
  }

  currentStartupData = savedStartupData;
  currentView = savedView;
  dashView.classList.add("hidden");
  dashView.style.display = "none";
  bulkView.classList.remove("hidden");
  bulkView.style.display = "block";
  updateCanvasUI();
  hideBulkSendOverlay();
  selectedBulkIds = new Set();
  renderBulkGallery(currentBulkLayout);
  if (sent > 0) renderNotifications();

  if (failed === 0) {
    showToast(`✅ Sent ${sent} one-pager review email(s)!`);
  } else {
    showToast(`Sent ${sent} email(s), ${failed} failed — check the console for details.`);
  }
}

function runAIEmailAutofill() {
  const s = currentStartupData;
  document.getElementById("emailRecipient").value = "alex@horizonvc.com";
  document.getElementById("emailSubject").value = `${s.name} - ${s.stage} Startup One-Pager Report for Review`;
  document.getElementById("emailBody").value = `Hi Alex,

Please find the attached AI-generated One-Pager report for ${s.name} (${s.stage} in ${s.sector}).

Key Highlights:
• Traction: ${s.currentTraction}
• Funding Ask: ${s.currentAsk}
• Unique Value Proposition: ${s.uvp}

Let us know if you would like to schedule an introductory call with the founding team.

Best regards,
PageCraft AI Review Automation Agent`;

  showToast("AI Autofilled review recipient email and message body!");
}

function confirmAndSendEmail() {
  const recipient = document.getElementById("emailRecipient").value.trim();
  const subject = document.getElementById("emailSubject").value.trim();
  const body = document.getElementById("emailBody").value;

  if (!recipient) {
    showToast("Please enter a recipient email address.");
    return;
  }

  if (!confirm(`Are you sure you want to send this startup one-pager to ${recipient}?`)) {
    return;
  }

  if (!window.emailjs || typeof emailjs.send !== "function") {
    showToast("⚠️ Email service failed to load — check your connection and try again.");
    return;
  }

  const sendBtn = document.querySelector('#reviewModal button[onclick="confirmAndSendEmail()"]');
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.classList.add("opacity-50", "cursor-not-allowed");
  }

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: recipient,
    subject,
    message: body,
    name: "PageCraft AI",
    from_name: "PageCraft AI",
    email: recipient,
    time: new Date().toLocaleString()
  }).then(() => {
    closeReviewModal();

    const newNotif = {
      id: `notif-${Date.now()}`,
      timestamp: "Just now",
      title: "Email Sent Successfully",
      message: `Sent one-pager review email to ${recipient}`,
      type: "sent",
      read: false,
      startupName: activeReviewContextName || currentStartupData.name
    };
    notificationFeed.unshift(newNotif);
    renderNotifications();
    activeReviewContextName = null;

    showToast(`✅ Email sent to ${recipient}!`);
  }).catch((err) => {
    console.error("EmailJS send error:", err);
    showToast(`⚠️ Couldn't send email: ${err?.text || err?.message || "unknown error"}`);
  }).finally(() => {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  });
}

/* ---------------------------------------------------- */
/* NOTIFICATIONS & EMAIL REPLY TRACKING */
/* ---------------------------------------------------- */
function toggleNotificationMenu() {
  const menu = document.getElementById("notificationMenu");
  menu.classList.toggle("hidden");
}

function renderNotifications() {
  const list = document.getElementById("notificationList");
  const badge = document.getElementById("notifBadge");
  if (!list) return;

  const unreadCount = notificationFeed.filter(n => !n.read).length;
  if (badge) {
    badge.innerText = unreadCount;
    badge.style.display = unreadCount > 0 ? "flex" : "none";
  }

  list.innerHTML = notificationFeed.map(n => `
    <div onclick="openThreadModal('${n.startupName}')" class="p-3 hover:bg-white/5 cursor-pointer transition-all ${!n.read ? 'bg-indigo-950/20' : ''}">
      <div class="flex items-center justify-between text-xs font-semibold text-white">
        <span class="flex items-center space-x-1.5">
          <i data-lucide="${n.type === 'replied' ? 'message-circle' : 'mail'}" class="w-3.5 h-3.5 text-indigo-400"></i>
          <span>${n.title}</span>
        </span>
        <span class="text-[10px] text-gray-500">${n.timestamp}</span>
      </div>
      <p class="text-[11px] text-gray-400 mt-1 line-clamp-2">${n.message}</p>
    </div>
  `).join("");

  lucide.createIcons();
}

function markAllNotifsRead() {
  notificationFeed.forEach(n => n.read = true);
  renderNotifications();
}

function openThreadModal(startupName) {
  document.getElementById("notificationMenu").classList.add("hidden");
  const modal = document.getElementById("threadModal");
  modal.classList.remove("hidden");

  document.getElementById("threadModalSub").innerText = startupName || currentStartupData.name;
  renderThreadMessages(startupName || currentStartupData.name);
}

function closeThreadModal() {
  document.getElementById("threadModal").classList.add("hidden");
}

function renderThreadMessages(startupName) {
  const list = document.getElementById("threadMessagesList");
  if (!list) return;

  const msgs = replyThreadsData[startupName] || [
    {
      sender: "You (PageCraft AI)",
      email: "incubator@pagecraft.ai",
      timestamp: "Today at 9:15 AM",
      body: `Initial review email sent for ${startupName}.`
    }
  ];

  list.innerHTML = msgs.map(m => `
    <div class="glass-card p-3 rounded-xl border border-white/10 space-y-1">
      <div class="flex items-center justify-between">
        <strong class="text-white text-xs">${m.sender}</strong>
        <span class="text-[10px] text-gray-500">${m.timestamp}</span>
      </div>
      <p class="text-gray-300 text-xs whitespace-pre-line leading-relaxed">${m.body}</p>
    </div>
  `).join("");
}

function sendThreadReply() {
  const input = document.getElementById("threadReplyInput");
  const val = input.value.trim();
  if (!val) return;

  const key = currentStartupData.name;
  if (!replyThreadsData[key]) replyThreadsData[key] = [];

  replyThreadsData[key].push({
    sender: "You (PageCraft AI)",
    email: "incubator@pagecraft.ai",
    timestamp: "Just now",
    body: val
  });

  input.value = "";
  renderThreadMessages(key);
  showToast("Reply sent to reviewer thread!");
}

/* ---------------------------------------------------- */
/* CRAFTAI ASSISTANT (Live Gemini & Groq API Engine)     */
/* ---------------------------------------------------- */
// All AI provider calls are proxied through our own backend (server.js) so
// that Gemini/Groq API keys stay server-side and are never shipped to the browser.
async function callGeminiAPI(userPrompt, systemInstruction = "") {
  const res = await fetch("/api/ai/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: userPrompt, systemInstruction })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gemini request failed (HTTP ${res.status}).`);
  if (!data.text) throw new Error("Gemini API endpoint failed or returned empty text.");
  return data.text;
}

async function callAIProvider(userPrompt, systemInstruction = "") {
  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: userPrompt, systemInstruction })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `AI Engine Error (HTTP ${res.status}).`);
  return { text: data.text, provider: data.provider || "AI" };
}

let attachedChatFile = null;
let attachedChatFileText = "";

async function handleChatFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  attachedChatFile = file;
  attachedChatFileText = await readTextFromFile(file);

  const badge = document.getElementById("chatAttachmentBadge");
  const fileNameSpan = document.getElementById("chatAttachmentFileName");
  if (badge && fileNameSpan) {
    fileNameSpan.innerText = `📄 ${file.name}`;
    badge.classList.remove("hidden");
  }
  showToast(`Attached file: ${file.name}`);
}

function removeChatAttachment() {
  attachedChatFile = null;
  attachedChatFileText = "";
  const fileInput = document.getElementById("chatFileInput");
  if (fileInput) fileInput.value = "";

  const badge = document.getElementById("chatAttachmentBadge");
  if (badge) badge.classList.add("hidden");
}

function optimizeSearchQuery(userQuery) {
  if (!userQuery) return "";
  let query = userQuery.trim();
  const lower = query.toLowerCase();

  if (
    lower.includes("who is") ||
    lower.includes("founder") ||
    lower.includes("ceo") ||
    lower.includes("owner") ||
    lower.includes("director") ||
    lower.includes("creator") ||
    lower.includes("team") ||
    lower.includes("leadership")
  ) {
    if (!lower.includes("founder") && !lower.includes("ceo") && !lower.includes("team")) {
      query += " founder CEO team leadership";
    }
  }

  return query;
}

// Real live web search, powered server-side by Groq's "compound" model (an
// agentic model that actually executes web searches, not just a knowledge-
// graph lookup) — so this can find things like a startup's LinkedIn page,
// funding news, or headcount, not just Wikipedia-famous topics.
async function fetchFreeWebSearchResults(query) {
  if (!query) return "";

  const optimizedQuery = optimizeSearchQuery(query);

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(optimizedQuery)}`);
    if (!res.ok) return "";
    const data = await res.json();
    return (data.text || "").trim();
  } catch (err) {
    console.warn("Free web search warning:", err);
    return "";
  }
}

async function callGroqAPI(userPrompt, extraWebSearchContext = "", extraFileContext = "") {
  const systemContent = `You are PageCraft Assistant. Use the following web search results to thoroughly answer the user's question. Cross-reference the snippets to find hidden details (like founder names or specific dates). Do not refuse to answer if the exact phrase isn't present; deduce the most likely factual answer from the surrounding context.`;

  const res = await fetch("/api/ai/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: userPrompt,
      systemInstruction: systemContent,
      webSearchContext: extraWebSearchContext || "",
      fileContext: extraFileContext || ""
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  if (!data.text) throw new Error("No response message returned from Groq API.");
  return data.text;
}

function toggleAIAssistant() {
  console.log("Button clicked");
  const widget = document.getElementById("aiAssistantWidget");
  if (!widget) return;
  const isHidden = widget.classList.toggle("hidden");
  if (!isHidden) {
    widget.style.display = "flex";
    widget.style.zIndex = "99999";
    initChatboxResizer();
  } else {
    widget.style.display = "none";
  }
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

/* ---------------------------------------------------- */
/* DYNAMIC CHATBOX DRAG RESIZER ENGINE                 */
/* ---------------------------------------------------- */
function initChatboxResizer() {
  const widget = document.getElementById("aiAssistantWidget");
  if (!widget) return;

  const handles = widget.querySelectorAll(".resize-handle");
  let isResizing = false;
  let currentDir = "";
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;

  handles.forEach((handle) => {
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      currentDir = handle.getAttribute("data-direction") || "";
      startX = e.clientX;
      startY = e.clientY;
      startW = widget.offsetWidth;
      startH = widget.offsetHeight;

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "none";
    });
  });

  function onMouseMove(e) {
    if (!isResizing) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newW = startW;
    let newH = startH;

    // Handle horizontal resizing (Width)
    if (currentDir.includes("w")) {
      newW = startW - dx;
    } else if (currentDir.includes("e")) {
      newW = startW + dx;
    }

    // Handle vertical resizing (Height)
    if (currentDir.includes("n")) {
      newH = startH - dy;
    } else if (currentDir.includes("s")) {
      newH = startH + dy;
    }

    // Clamping boundaries
    const minW = 320;
    const maxW = Math.min(1200, window.innerWidth * 0.95);
    const minH = 350;
    const maxH = Math.min(900, window.innerHeight * 0.90);

    newW = Math.max(minW, Math.min(maxW, newW));
    newH = Math.max(minH, Math.min(maxH, newH));

    widget.style.width = newW + "px";
    widget.style.height = newH + "px";
  }

  function onMouseUp() {
    isResizing = false;
    currentDir = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.userSelect = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initChatboxResizer();

  const craftAiBtn = document.getElementById("craft-ai-trigger-btn") || document.getElementById("headerAIBtn");
  if (craftAiBtn) {
    craftAiBtn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleAIAssistant();
    });
  }

  const craftAiSendBtn = document.getElementById("craftai-chat-send-btn") || document.getElementById("craft-ai-send-btn");
  if (craftAiSendBtn) {
    craftAiSendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      sendAIAssistantMessage();
    });
  }

  const aiChatInput = document.getElementById("craftai-chat-input") || document.getElementById("aiChatInput");
  if (aiChatInput) {
    aiChatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendAIAssistantMessage();
      }
    });
  }
});

function askAIAssistant(promptText) {
  const input = document.getElementById("craftai-chat-input") || document.getElementById("aiChatInput");
  if (input) {
    input.value = promptText;
  }
  sendAIAssistantMessage();
}

/* ---------------------------------------------------- */
/* CHAT-DRIVEN "RESEARCH THIS WEBSITE & FILL GAPS" FLOW  */
/* ---------------------------------------------------- */
function extractFirstUrl(text) {
  if (!text) return null;

  const httpMatch = text.match(/\bhttps?:\/\/[^\s<>"')]+/i);
  if (httpMatch) return httpMatch[0].replace(/[.,;:!?]+$/, "");

  const wwwMatch = text.match(/\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+\b(?:\/[^\s<>"')]*)?/i);
  if (wwwMatch) return wwwMatch[0].replace(/[.,;:!?]+$/, "");

  // Bare domain typed without a scheme or "www." prefix, e.g. "enlog.co.in"
  // or "openai.com" — very common in casual chat messages.
  const bareMatch = text.match(
    /\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?){0,3}\.(?:com|in|co|io|ai|org|net|dev|app|xyz|info|biz|tech|store|shop|me|us|uk|ca|au|de|fr|jp|cn)\b(?:\/[^\s<>"')]*)?/i
  );
  if (bareMatch) return bareMatch[0].replace(/[.,;:!?]+$/, "");

  return null;
}

function renderAssistantChatBubble(html, providerUsed, bodyId) {
  return `
    <div class="flex items-start space-x-2">
      <div class="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 p-0.5 shrink-0 shadow">
        <div class="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
          <i data-lucide="sparkles" class="w-3.5 h-3.5 text-cyan-300"></i>
        </div>
      </div>
      <div class="bg-slate-800 p-3.5 rounded-xl border border-cyan-500/30 text-gray-200 text-xs space-y-2 shadow max-w-[85%]">
        <div class="flex items-center justify-between border-b border-white/10 pb-1.5">
          <span class="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider">✨ PageCraft Assistant</span>
          <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30">${providerUsed} Verified</span>
        </div>
        <div${bodyId ? ` id="${bodyId}"` : ""} class="leading-relaxed whitespace-pre-line text-gray-200">${html}</div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Extracted data found in chat is never applied automatically — it's parked
// here until the user clicks the "Apply to Sheet" button on that specific
// chat bubble, so they stay in control of what lands on their canvas.
function storePendingExtraction(parsedJSON, sourceText) {
  window.__pendingExtractions = window.__pendingExtractions || {};
  const id = `extract_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  window.__pendingExtractions[id] = { parsedJSON, sourceText };
  return id;
}

function applyPendingExtraction(id, btnEl) {
  const entry = window.__pendingExtractions?.[id];
  if (!entry) return;

  const appliedKeys = applyStartupFieldsFromJSON(entry.parsedJSON, entry.sourceText, { onlyFillEmpty: true });
  populateFormFields();
  updateCanvasUI();
  delete window.__pendingExtractions[id];

  if (!btnEl) return;

  if (appliedKeys.length === 0) {
    btnEl.outerHTML = `<span class="text-[10px] text-gray-400 italic">Nothing new to apply — your sheet already had this data.</span>`;
    return;
  }

  const labels = appliedKeys.map((k) => STARTUP_FIELD_LABELS[k] || k).join(", ");
  btnEl.outerHTML = `<span class="text-[10px] text-emerald-400 font-bold flex items-center space-x-1"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i><span>Applied: ${escapeHtml(labels)}</span></span>`;
  if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons();
  showToast(`✨ Applied ${appliedKeys.length} field(s) to your One-Pager!`);
}

// Builds the "here's what I found — Apply to Sheet" block shown under a chat
// answer. Only lists fields that are BOTH present in parsedJSON AND still
// blank on the canvas, so the preview always matches what the button would
// actually change. Returns "" when there's nothing new to offer.
function renderExtractionPreviewBlock(parsedJSON, extractionId) {
  if (!parsedJSON) return "";

  const newFields = STARTUP_EXTRACTION_FIELDS.filter(
    (k) => isMeaningfulExtractedValue(parsedJSON[k]) && !isMeaningfulExtractedValue(currentStartupData[k])
  );
  const hasNewFounders = Array.isArray(parsedJSON.foundingTeam) && parsedJSON.foundingTeam.length > 0 &&
    !(Array.isArray(currentStartupData.foundingTeam) && currentStartupData.foundingTeam.length > 0);

  if (newFields.length === 0 && !hasNewFounders) return "";

  const items = newFields.map((k) => {
    const label = escapeHtml(STARTUP_FIELD_LABELS[k] || k);
    const val = escapeHtml(String(parsedJSON[k]).slice(0, 90));
    return `<li><strong>${label}:</strong> ${val}</li>`;
  }).join("");

  const founderItem = hasNewFounders
    ? `<li><strong>Founding Team:</strong> ${escapeHtml(parsedJSON.foundingTeam.map((f) => f.name).join(", "))}</li>`
    : "";

  return `
    <div class="mt-2.5 pt-2.5 border-t border-white/10 space-y-1.5">
      <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">📋 Data found:</span>
      <ul class="text-[11px] text-gray-300 space-y-0.5 list-disc list-inside">${items}${founderItem}</ul>
      <button type="button" onclick="applyPendingExtraction('${extractionId}', this)" class="mt-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center space-x-1.5 shadow transition-all cursor-pointer">
        <i data-lucide="arrow-down-to-line" class="w-3.5 h-3.5"></i>
        <span>Apply to Sheet</span>
      </button>
    </div>
  `;
}

// Pasting a startup's website URL into the chat researches that site
// (homepage + common about/team subpages) plus a general web search for the
// company name, then fills in ONLY the canvas fields that are still blank —
// data already on the canvas (e.g. from a PDF upload) is never overwritten.
async function handleWebsiteResearchInChat(url, userMessage, feed, loaderId) {
  const loader = document.getElementById(loaderId);
  const loaderLabel = loader?.querySelector("span:last-child");
  if (loaderLabel) loaderLabel.textContent = `Fetching ${url} and researching online...`;

  let fetchData = { text: "" };
  try {
    const fetchRes = await fetch("/api/fetch-website", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    fetchData = await fetchRes.json();
  } catch (eFetch) {
    console.warn("Website fetch warning:", eFetch);
  }

  const hostname = url.replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./i, "");
  // Always include the domain, even when we already know a name — company
  // names collide constantly (there's more than one "Enlog" on the internet,
  // for instance), and searching by name alone risks pulling in a totally
  // unrelated company's facts.
  const companyLabel = isMeaningfulExtractedValue(currentStartupData.name)
    ? `${currentStartupData.name} (${hostname})`
    : hostname;

  // What the user actually asked ("...check headquarters and team size")
  // has to be part of the search query itself — searching on just the
  // company name returns a generic "about this company" blurb, not the
  // specific fact being asked for.
  const askedQuestion = userMessage.replace(url, "").trim();
  const companyQuery = askedQuestion ? `${companyLabel} — ${askedQuestion}` : companyLabel;

  let searchContext = "";
  try {
    searchContext = await fetchFreeWebSearchResults(companyQuery);
  } catch (eSearch) {
    console.warn("Web search warning:", eSearch);
  }

  // Cap each part BEFORE combining (not after) — otherwise a long website
  // scrape eats the whole prompt budget and the web search results (often
  // where headquarters/team size actually live, e.g. LinkedIn/Crunchbase)
  // get truncated away entirely.
  // Search results go first — they carry a verified, disambiguated answer
  // for facts like headquarters/team size — with the website's own text
  // after as secondary context (its marketing/testimonial copy can be
  // vague or, for facts like location, actively misleading).
  const combinedText = [
    searchContext ? `=== WEB SEARCH RESULTS FOR "${companyQuery}" ===\n${searchContext.slice(0, 6000)}` : "",
    fetchData.text ? `=== WEBSITE CONTENT (${url}) ===\n${fetchData.text.slice(0, 9000)}` : ""
  ].filter(Boolean).join("\n\n");

  const loaderEl = document.getElementById(loaderId);
  if (loaderEl) loaderEl.remove();

  if (!combinedText.trim()) {
    feed.innerHTML += renderAssistantChatBubble(
      `⚠️ Couldn't reach or read <strong>${url}</strong>, and no useful web search results came back either. Try a different link, or fill the remaining fields in by hand.`,
      "Groq AI"
    );
    return;
  }

  const systemPrompt = getStartupExtractionSystemPrompt();
  const docPrompt = `Startup Website: ${url}\n\nSource Content:\n${combinedText.slice(0, 15000)}`;

  let data = { data: null, provider: "Groq AI", foundAnything: false };
  try {
    const res = await fetch("/api/ai/extract-json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: docPrompt, systemInstruction: systemPrompt, attempts: 3 })
    });
    data = await res.json();
  } catch (eExtract) {
    console.warn("Website extraction warning:", eExtract);
  }

  if (!data.foundAnything) {
    feed.innerHTML += renderAssistantChatBubble(
      `Researched <strong>${url}</strong> but couldn't confidently extract any usable startup data from it. Please fill the remaining fields in by hand.`,
      data.provider || "Groq AI"
    );
    return;
  }

  // Marketing websites often have a "customers say" testimonials block, and
  // the model occasionally misreads a quoted customer as if they worked at
  // THIS startup. Those entries reliably come back shaped like
  // '"Founder, OtherCompany"' or an experience field that's just
  // "<title> at <OtherCompany>" with nothing else — real team bios are never
  // that terse. Drop anything matching that shape before it touches the canvas.
  if (Array.isArray(data.data?.foundingTeam)) {
    data.data.foundingTeam = data.data.foundingTeam.filter((p) => {
      if (!p || !p.name) return false;
      const title = String(p.title || "").trim();
      const experience = String(p.experience || "").trim();
      if (/,\s*[A-Z][\w&.\- ]{2,30}$/.test(title)) return false;
      if (title && experience) {
        const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (new RegExp(`^${escapedTitle}\\s+at\\s+[A-Z]`, "i").test(experience)) return false;
      }
      return true;
    });
  }

  // Never apply automatically — park the result and let the user confirm
  // with the "Apply to Sheet" button. Fields already on the canvas (e.g.
  // from a PDF upload) are excluded from the preview since the button only
  // ever fills gaps, never overwrites.
  const extractionId = storePendingExtraction(data.data, combinedText);
  const previewBlock = renderExtractionPreviewBlock(data.data, extractionId);

  if (!previewBlock) {
    feed.innerHTML += renderAssistantChatBubble(
      `Researched <strong>${url}</strong> — everything it found was already filled in on your canvas, so there's nothing new to apply.`,
      data.provider || "Groq AI"
    );
    return;
  }

  const stillMissing = STARTUP_EXTRACTION_FIELDS.filter(
    (k) => !isMeaningfulExtractedValue(data.data[k]) && !isMeaningfulExtractedValue(currentStartupData[k])
  );

  let msg = `🔎 Researched <strong>${url}</strong> — found some data your sheet is missing. Review it below and click <strong>Apply to Sheet</strong> to fill it in.`;
  if (stillMissing.length > 0) {
    msg += `<br><br>Couldn't find: ${stillMissing.map((k) => STARTUP_FIELD_LABELS[k] || k).join(", ")}.`;
  }
  msg += previewBlock;

  feed.innerHTML += renderAssistantChatBubble(msg, data.provider || "Groq AI");
  if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons();
}

async function sendAIAssistantMessage() {
  console.log("sendAIAssistantMessage triggered");
  const input = document.getElementById("craftai-chat-input") || document.getElementById("aiChatInput");
  const sendBtn = document.getElementById("craftai-chat-send-btn") || document.getElementById("craft-ai-send-btn");
  if (!input) return;

  const msg = input.value.trim();
  if (!msg && !attachedChatFileText) return;

  const promptText = msg || (attachedChatFile ? `Analyze attached file ${attachedChatFile.name}` : "");

  const feed = document.getElementById("aiChatFeed");
  if (!feed) return;

  const filePillHtml = attachedChatFile
    ? `<span class="inline-flex items-center space-x-1 bg-white/20 text-white font-bold text-[10px] px-2 py-0.5 rounded-md mb-1 border border-white/30 block w-fit"><i data-lucide="paperclip" class="w-3 h-3"></i><span>${attachedChatFile.name}</span></span>`
    : '';

  // 1. Append user prompt bubble
  feed.innerHTML += `
    <div class="flex items-start space-x-2 justify-end">
      <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-2.5 rounded-xl text-white text-xs max-w-[85%] shadow">
        ${filePillHtml}
        <p class="font-semibold">${promptText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        <span class="text-[9px] text-cyan-200 mt-1 block">Sent to PageCraft Assistant</span>
      </div>
    </div>
  `;

  // 2. Clear text input immediately & disable send button
  input.value = "";
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.classList.add("opacity-50", "cursor-not-allowed");
  }
  feed.scrollTop = feed.scrollHeight;

  const currentFileText = attachedChatFileText;
  removeChatAttachment();

  // 3. Append temporary thinking indicator
  const loaderId = "loader_" + Date.now();
  feed.innerHTML += `
    <div id="${loaderId}" class="flex items-start space-x-2">
      <div class="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 p-0.5 shrink-0 shadow animate-pulse">
        <div class="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
          <i data-lucide="sparkles" class="w-3.5 h-3.5 text-cyan-300"></i>
        </div>
      </div>
      <div class="bg-slate-800/90 p-2.5 rounded-xl border border-cyan-500/30 text-xs text-cyan-300 flex items-center space-x-2 shadow">
        <i data-lucide="loader-2" class="w-4 h-4 animate-spin text-cyan-400"></i>
        <span>Fetching live web search & analyzing with Groq AI...</span>
      </div>
    </div>
  `;
  feed.scrollTop = feed.scrollHeight;
  if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons();

  // 4. Live Groq AI Assistant Call — or, if the message contains a URL,
  // research that startup's website and auto-fill missing canvas fields.
  try {
    const detectedUrl = extractFirstUrl(promptText);

    if (detectedUrl) {
      await handleWebsiteResearchInChat(detectedUrl, promptText, feed, loaderId);
    } else {
      let searchContext = "";
      try {
        searchContext = await fetchFreeWebSearchResults(promptText);
      } catch (eSearch) {
        console.warn("Web search warning:", eSearch);
      }

      let aiText = "";
      let providerUsed = "Groq AI";

      try {
        aiText = await callGroqAPI(promptText, searchContext, currentFileText);
      } catch (eGroq) {
        console.warn("Groq API call warning in chat assistant:", eGroq);
        const res = await callAIProvider(promptText, "You are PageCraft Assistant. Answer the user's question clearly.");
        aiText = res.text;
        providerUsed = res.provider;
      }

      const loader = document.getElementById(loaderId);
      if (loader) loader.remove();

      let formattedText = aiText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\s*[\-\*]\s+/gm, '• ')
        .replace(/\n/g, '<br>');

      const bubbleBodyId = "chatbody_" + Date.now();
      feed.innerHTML += renderAssistantChatBubble(formattedText, providerUsed, bubbleBodyId);
      feed.scrollTop = feed.scrollHeight;

      // Best-effort: whatever this exchange turned up (the user might have
      // just typed startup facts in directly, or asked a factual question
      // the assistant answered) could contain real startup data. Check for
      // it and, if found, append an "Apply to Sheet" button under this same
      // reply — nothing is ever pushed to the canvas without that click.
      try {
        const extractPrompt = `User message: ${promptText}\n\nAssistant reply: ${aiText}`;
        const exRes = await fetch("/api/ai/extract-json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: extractPrompt, systemInstruction: getStartupExtractionSystemPrompt(), attempts: 1 })
        });
        const exData = await exRes.json();
        if (exRes.ok && exData.foundAnything) {
          const extractionId = storePendingExtraction(exData.data, extractPrompt);
          const previewBlock = renderExtractionPreviewBlock(exData.data, extractionId);
          const bodyEl = document.getElementById(bubbleBodyId);
          if (previewBlock && bodyEl) {
            bodyEl.insertAdjacentHTML("afterend", previewBlock);
            if (window.lucide && typeof lucide.createIcons === "function") lucide.createIcons();
          }
        }
      } catch (eLightExtract) {
        console.warn("Chat data-extraction check warning:", eLightExtract);
      }
    }
  } catch (err) {
    console.error("AI API Assistant Error:", err);
    const loader = document.getElementById(loaderId);
    if (loader) loader.remove();

    feed.innerHTML += `
      <div class="flex items-start space-x-2">
        <div class="w-7 h-7 rounded-xl bg-rose-600 flex items-center justify-center shrink-0 shadow">
          <i data-lucide="alert-circle" class="w-4 h-4 text-white"></i>
        </div>
        <div class="bg-slate-800 p-3 rounded-xl border border-rose-500/40 text-rose-300 text-xs space-y-1 max-w-[85%]">
          <p class="font-bold text-rose-400">Assistant Error</p>
          <p class="text-[11px] text-gray-200">${err.message || 'An error occurred while calling the API.'}</p>
        </div>
      </div>
    `;
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
    feed.scrollTop = feed.scrollHeight;
    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  }
}

function applyFullGeminiExtractedData() {
  if (!window.latestExtractedStartupData) {
    showToast("No extracted startup data available.");
    return;
  }

  const d = window.latestExtractedStartupData;

  if (d.name) currentStartupData.name = d.name;
  if (d.tagline) currentStartupData.tagline = d.tagline;

  // Format Clean Website URL
  if (d.website) {
    let cleanWeb = d.website.trim();
    if (!cleanWeb.startsWith('http://') && !cleanWeb.startsWith('https://')) {
      cleanWeb = 'https://' + cleanWeb;
    }
    currentStartupData.website = cleanWeb;
  }

  // Auto-fetch Official Startup Logo URL
  if (d.logo && d.logo.startsWith('http')) {
    currentStartupData.logo = d.logo;
  } else if (currentStartupData.website) {
    const domain = currentStartupData.website.replace(/https?:\/\//, '').split('/')[0];
    if (domain) {
      currentStartupData.logo = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
    }
  }

  if (d.climateSector) currentStartupData.climateSector = d.climateSector;
  if (d.subSector) currentStartupData.subSector = d.subSector;
  if (d.stage) currentStartupData.stage = d.stage;
  if (d.marketSize) currentStartupData.marketSize = d.marketSize;
  if (d.totalFundRaised) currentStartupData.totalFundRaised = d.totalFundRaised;
  if (d.revenueLast12Months) currentStartupData.revenueLast12Months = d.revenueLast12Months;
  if (d.countries) currentStartupData.countries = d.countries;
  if (d.co2EmissionReduced) currentStartupData.co2EmissionReduced = d.co2EmissionReduced;
  if (d.avgEnergySavings) currentStartupData.avgEnergySavings = d.avgEnergySavings;
  if (d.waterSaved) currentStartupData.waterSaved = d.waterSaved;
  if (d.uspAIUse) currentStartupData.uspAIUse = d.uspAIUse;
  if (d.targetCustomer) currentStartupData.targetCustomer = d.targetCustomer;
  if (d.businessModel) currentStartupData.businessModel = d.businessModel;
  if (d.teamSize) currentStartupData.teamSize = d.teamSize;
  if (d.currentAsk) currentStartupData.currentAsk = d.currentAsk;
  if (d.incorporateYear) currentStartupData.incorporateYear = d.incorporateYear;
  if (d.headquaters) currentStartupData.headquaters = d.headquaters;

  // Auto-fetch ALL members of the founding team (Name & Title ONLY)
  if (d.foundingTeam && Array.isArray(d.foundingTeam) && d.foundingTeam.length > 0) {
    currentStartupData.foundingTeam = d.foundingTeam.map((f, i) => {
      let photoUrl = f.photo;

      if (!photoUrl || !photoUrl.startsWith('http')) {
        photoUrl = getFounderPhotoUrl(f, i);
      }

      return {
        name: f.name || `Founder ${i + 1}`,
        title: f.title || "Co-Founder",
        photo: photoUrl
      };
    });
  }

  // Also sync form logo input if exists
  const logoInput = document.getElementById("startupLogoInput");
  if (logoInput) logoInput.value = currentStartupData.logo || "";

  // Refresh all forms and canvas elements
  if (typeof renderFoundersForm === "function") renderFoundersForm();
  if (typeof renderFoundersCanvas === "function") renderFoundersCanvas();
  if (typeof populateFormFields === "function") populateFormFields();
  if (typeof updateCanvasUI === "function") updateCanvasUI();

  showToast(`✨ Auto-applied Name, Designation & Official Website for ${currentStartupData.name}!`);
}

function applyAIAnswerToCanvas(answer) {
  if (answer.includes("Tagline")) {
    currentStartupData.tagline = answer;
  } else if (answer.includes("CO2")) {
    currentStartupData.co2EmissionReduced = answer;
  } else {
    currentStartupData.uspAIUse = answer;
  }
  updateCanvasUI();
  showToast("Applied Gemini AI suggestion directly to One-Pager!");
}

/* ---------------------------------------------------- */
/* AUTHENTICATION STATE & LOG IN / SIGN UP FLOW */
/* ---------------------------------------------------- */

let currentAuthTab = "login";

function checkAuthState() {
  try {
    const authView = document.getElementById("authFullView");
    const dashView = document.getElementById("mainDashboardView");
    const bulkView = document.getElementById("bulkWorkspaceView");
    const landingHero = document.getElementById("landingHero");

    const searchGroup = document.getElementById("headerSearchGroup");
    const notifGroup = document.getElementById("headerNotifGroup");
    const aiBtn = document.getElementById("headerAIBtn");
    const userAuthSec = document.getElementById("userAuthSection");
    const navTabDash = document.getElementById("navTabDashboard");

    if (!isUserAuthenticated) {
      // Show ONLY the Login / Signup Page
      if (authView) {
        authView.classList.remove("hidden");
        authView.style.display = "flex";
      }
      if (dashView) {
        dashView.classList.add("hidden");
        dashView.style.display = "none";
      }
      if (bulkView) {
        bulkView.classList.add("hidden");
        bulkView.style.display = "none";
      }
      if (landingHero) {
        landingHero.classList.add("hidden");
        landingHero.style.display = "none";
      }

      if (searchGroup) searchGroup.classList.add("hidden");
      if (notifGroup) notifGroup.classList.add("hidden");
      if (aiBtn) aiBtn.classList.add("hidden");
      if (navTabDash && navTabDash.parentElement) navTabDash.parentElement.classList.add("hidden");

      if (userAuthSec) {
        userAuthSec.innerHTML = `
          <button type="button" onclick="handleAuthSubmit(event)" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all border border-white/10 cursor-pointer">Sign In</button>
          <button type="button" onclick="handleAuthSubmit(event)" class="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md cursor-pointer">Create Account</button>
        `;
      }
    } else {
      // Show Main One-Pager Design Workspace
      if (authView) {
        authView.classList.add("hidden");
        authView.style.display = "none";
      }
      if (landingHero) {
        landingHero.classList.add("hidden");
        landingHero.style.display = "none";
      }

      if (currentView === "dashboard") {
        if (dashView) {
          dashView.classList.remove("hidden");
          dashView.style.display = "flex";
        }
        if (bulkView) {
          bulkView.classList.add("hidden");
          bulkView.style.display = "none";
        }
      } else {
        if (dashView) {
          dashView.classList.add("hidden");
          dashView.style.display = "none";
        }
        if (bulkView) {
          bulkView.classList.remove("hidden");
          bulkView.style.display = "block";
        }
      }

      if (searchGroup) searchGroup.classList.remove("hidden");
      if (notifGroup) notifGroup.classList.remove("hidden");
      if (aiBtn) aiBtn.classList.remove("hidden");
      if (navTabDash && navTabDash.parentElement) navTabDash.parentElement.classList.remove("hidden");

      if (userAuthSec) {
        userAuthSec.innerHTML = `
          <div class="flex items-center space-x-2 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" class="w-6 h-6 rounded-full border border-indigo-400">
            <span class="text-xs font-semibold text-gray-200 hidden sm:inline">Alex Vance</span>
            <button type="button" onclick="handleSignOut()" data-tooltip="Sign Out" class="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-rose-400 transition-all ml-1 cursor-pointer">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `;
      }
    }

    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }
  } catch (err) {
    console.error("checkAuthState error:", err);
  }
}

function switchAuthTab(mode) {
  currentAuthTab = mode;
  const tabLogin = document.getElementById("authTabLogin");
  const tabSignup = document.getElementById("authTabSignup");
  const nameGroup = document.getElementById("nameFieldGroup");
  const submitBtn = document.getElementById("authSubmitBtn");

  if (mode === "login") {
    if (tabLogin) tabLogin.className = "flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold shadow text-center transition-all cursor-pointer";
    if (tabSignup) tabSignup.className = "flex-1 py-2 rounded-lg text-gray-400 hover:text-white text-center transition-all cursor-pointer";
    if (nameGroup) nameGroup.classList.add("hidden");
    if (submitBtn) submitBtn.innerHTML = `<span>Sign In to One-Pager Platform</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
  } else {
    if (tabSignup) tabSignup.className = "flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold shadow text-center transition-all cursor-pointer";
    if (tabLogin) tabLogin.className = "flex-1 py-2 rounded-lg text-gray-400 hover:text-white text-center transition-all cursor-pointer";
    if (nameGroup) nameGroup.classList.remove("hidden");
    if (submitBtn) submitBtn.innerHTML = `<span>Create Free Account & Launch</span> <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
  }

  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }
}

function simulateOAuthLogin(provider) {
  isUserAuthenticated = true;
  currentView = "dashboard";
  forceShowDashboardView();
  showToast(`Authenticated with ${provider} OAuth! Welcome to PageCraft AI.`);
}

function handleAuthSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  isUserAuthenticated = true;
  currentView = "dashboard";
  forceShowDashboardView();
  showToast(`Authentication successful! Welcome to PageCraft AI Workspace.`);
}

function forceShowDashboardView() {
  isUserAuthenticated = true;
  const authView = document.getElementById("authFullView");
  const dashView = document.getElementById("mainDashboardView");
  const bulkView = document.getElementById("bulkWorkspaceView");

  if (authView) {
    authView.classList.add("hidden");
    authView.style.display = "none";
  }
  if (dashView) {
    dashView.classList.remove("hidden");
    dashView.style.display = "flex";
  }
  if (bulkView) {
    bulkView.classList.add("hidden");
    bulkView.style.display = "none";
  }
  checkAuthState();
}

function handleSignOut() {
  isUserAuthenticated = false;
  checkAuthState();
  showToast("Logged out successfully. Please sign in to access workspace.");
}

function showForgotPasswordAlert() {
  const email = document.getElementById("authEmailInput") ? document.getElementById("authEmailInput").value : "your email";
  alert(`Password reset instructions have been sent to ${email}. Please check your inbox.`);
}

function openAuthModal(type) {
  isUserAuthenticated = false;
  checkAuthState();
  switchAuthTab(type || "login");
}

function closeAuthModal() {
  // Unused as full screen view is used
}

/* ---------------------------------------------------- */
/* FIGMA & CANVA TEMPLATE IMPORTER ENGINE */
/* ---------------------------------------------------- */
function openFigmaCanvaModal() {
  const modal = document.getElementById("figmaCanvaModal");
  if (modal) modal.classList.remove("hidden");
}

function closeFigmaCanvaModal() {
  const modal = document.getElementById("figmaCanvaModal");
  if (modal) modal.classList.add("hidden");
}

function fillPresetDesignLink(type) {
  const input = document.getElementById("figmaCanvaUrlInput");
  const provider = document.getElementById("figmaCanvaProvider");

  if (type === "canva-user-presentation") {
    if (provider) provider.value = "canva";
    if (input) input.value = "https://canva.link/dkhp6favcylb5nr";
  } else if (type === "figma-modern") {
    if (provider) provider.value = "figma";
    if (input) input.value = "https://www.figma.com/file/a84920f/PageCraft-VC-Pitch-OnePager-Frame-104";
  } else if (type === "canva-pitch") {
    if (provider) provider.value = "canva";
    if (input) input.value = "https://www.canva.com/design/DAF9012/view?embed";
  }
}

function importFigmaCanvaTemplate() {
  const urlInput = document.getElementById("figmaCanvaUrlInput");
  const provider = document.getElementById("figmaCanvaProvider");
  const url = urlInput ? urlInput.value.trim() : "";
  const platform = provider ? provider.value : "figma";

  if (!url) {
    alert("Please enter a valid Figma frame link or Canva design embed URL.");
    return;
  }

  closeFigmaCanvaModal();

  // Switch active template to custom imported frame
  changeTemplate("figma-canva-custom");

  // Show Toast Confirmation
  showToast(`Successfully imported ${platform.toUpperCase()} template! Applied custom frame layout.`);
}

/* ---------------------------------------------------- */
/* EXPORT ENGINE (A4 PORTRAIT SPECIFICATION: 210mm x 297mm) */
/* ---------------------------------------------------- */
function exportReport(format) {
  const canvas = document.getElementById("onePagerCanvas");
  if (!canvas) return;

  showToast(`Generating ${format.toUpperCase()} (A4 Standard 210×297mm)...`);

  if (format === 'print') {
    window.print();
  } else if (format === 'png' || format === 'pdf') {
    // Render at 3x scale for crisp 300 DPI A4 print standard
    captureOnePagerCanvas(3.125).then(cvs => {
      if (format === 'png') {
        const link = document.createElement("a");
        link.download = `${currentStartupData.name}_OnePager_A4.png`;
        link.href = cvs.toDataURL("image/png");
        link.click();
        showToast("Crisp A4 PNG exported successfully!");
      } else if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        // Standard A4 portrait document (210mm width x 297mm height)
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
          compress: true
        });
        const imgData = cvs.toDataURL("image/jpeg", 0.98);
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        pdf.save(`${currentStartupData.name}_OnePager_A4.pdf`);
        showToast("Standard Single-Page A4 PDF exported successfully!");
      }
    }).catch(err => {
      console.error("Export error:", err);
      showToast(`Export Error: ${err.message}`);
    });
  } else {
    showToast(`Exporting presentation file for ${currentStartupData.name}...`);
  }
}

/* ---------------------------------------------------- */
/* HELPER UTILITIES & HISTORY */
/* ---------------------------------------------------- */
function saveCanvasState() {
  canvasHistory.push(JSON.stringify(currentStartupData));
  historyIndex = canvasHistory.length - 1;
}

function undoCanvasChange() {
  if (historyIndex > 0) {
    historyIndex--;
    currentStartupData = JSON.parse(canvasHistory[historyIndex]);
    populateFormFields();
    updateCanvasUI();
    showToast("Undo applied! Restored canvas state.");
  } else {
    showToast("No earlier state to undo.");
  }
}

function clearAllTemplateData() {
  saveCanvasState(); // Save current state into history before clearing so Undo restores it!

  currentStartupData = {
    name: "",
    logo: "",
    tagline: "",
    climateSector: "",
    subSector: "",
    stage: "",
    marketSize: "",
    totalFundRaised: "",
    revenueLast12Months: "",
    countries: "",
    co2EmissionReduced: "",
    avgEnergySavings: "",
    waterSaved: "",
    uspAIUse: "",
    targetCustomer: "",
    businessModel: "",
    teamSize: "",
    currentAsk: "",
    incorporateYear: "",
    headquaters: "",
    website: "",
    foundingTeam: [],
    strategicPartners: [],
    backedBy: []
  };

  // 1. Directly reset sidebar form input values
  const sidebarInputs = ["inputName", "inputTagline", "inputLogo", "inputClimateSector", "inputSubSector", "inputStage", "inputMarketSize", "inputTotalFundRaised", "inputRevenueLast12", "inputCountries", "inputCO2Reduced", "inputAvgEnergySavings", "inputWaterSaved", "inputUSPAIUse", "inputTargetCustomer", "inputBusinessModel", "inputTeamSize", "inputAsk", "inputIncorporateYear", "inputHeadquaters", "inputWebsite"];
  sidebarInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });

  // 2. Directly clear canvas editable text elements
  const canvasIds = ["canvasName", "canvasTagline", "canvasClimateSector", "canvasSubSector", "canvasStageField", "canvasStage", "canvasMarketSize", "canvasTotalFundRaised", "canvasRevenueLast12", "canvasCountries", "canvasCO2Reduced", "canvasAvgEnergySavings", "canvasWaterSaved", "canvasUSPAIUse", "canvasTargetCustomer", "canvasBusinessModel", "canvasAsk", "canvasTeamSizeField", "canvasIncorporateYear", "canvasHeadquaters", "canvasWebsite"];
  canvasIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = "";
  });

  // 3. Clear inner HTML grids
  const gridIds = ["canvasPartnersGrid", "canvasBackedByGrid", "canvasFoundersGrid", "foundersFormList"];
  gridIds.forEach(id => {
    const g = document.getElementById(id);
    if (g) g.innerHTML = "";
  });

  // 4. Re-run populate and canvas engine
  populateFormFields();
  updateCanvasUI();

  showToast("🧹 Cleared all template data! Click Undo to restore.");
}

window.clearAllTemplateData = clearAllTemplateData;
window.undoCanvasChange = undoCanvasChange;

// Bind direct click event listeners to buttons
document.addEventListener("DOMContentLoaded", () => {
  const clearBtn = document.getElementById("clearAllDataBtn");
  if (clearBtn) {
    clearBtn.onclick = function(e) {
      if (e) e.preventDefault();
      clearAllTemplateData();
    };
  }

  const undoBtn = document.getElementById("undoCanvasBtn");
  if (undoBtn) {
    undoBtn.onclick = function(e) {
      if (e) e.preventDefault();
      undoCanvasChange();
    };
  }
});

function redoCanvasChange() {
  if (historyIndex < canvasHistory.length - 1) {
    historyIndex++;
    currentStartupData = JSON.parse(canvasHistory[historyIndex]);
    populateFormFields();
    updateCanvasUI();
    showToast("Redo applied");
  }
}

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 border border-indigo-500/50 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl z-50 flex items-center space-x-2 animate-bounce";
  toast.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i> <span>${msg}</span>`;
  document.body.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
