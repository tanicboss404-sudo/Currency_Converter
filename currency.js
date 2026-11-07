/**
 * CURRENCY CONVERTER — MODERN EXCHANGE DASHBOARD
 * Core Application Logic & Real-time Integration
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const BASE_URL = "https://open.er-api.com/v6/latest/";
const FRANKFURTER_DEV_URL = "https://api.frankfurter.dev/v2/rates";
const FRANKFURTER_APP_URL = "https://api.frankfurter.app/";

const DEFAULT_POPULAR_CURRENCIES = ["USD", "INR", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD"];
const MAX_HISTORY_ITEMS = 15;

// In-memory cache for live rates to prevent redundant network bursts
const ratesCache = new Map();
let trendChartInstance = null;
let currentPairTrendData = null;

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const elements = {
  // Theme Switcher
  themeToggle: document.getElementById("themeToggle"),

  // Main Converter Inputs
  converterForm: document.getElementById("converterForm"),
  amountInput: document.getElementById("amountInput"),
  amountSymbolPrefix: document.getElementById("amountSymbolPrefix"),
  fromSelect: document.getElementById("fromCurrencySelect"),
  toSelect: document.getElementById("toCurrencySelect"),
  fromFlag: document.getElementById("fromFlag"),
  toFlag: document.getElementById("toFlag"),
  swapBtn: document.getElementById("swapBtn"),
  convertBtn: document.getElementById("convertBtn"),
  liveStatusText: document.getElementById("liveStatusText"),

  // Custom Currency Dropdowns
  fromSelectWrapper: document.getElementById("fromSelectWrapper"),
  toSelectWrapper: document.getElementById("toSelectWrapper"),
  fromTrigger: document.getElementById("fromTrigger"),
  toTrigger: document.getElementById("toTrigger"),
  fromCodeDisplay: document.getElementById("fromCodeDisplay"),
  toCodeDisplay: document.getElementById("toCodeDisplay"),
  fromDropdownPanel: document.getElementById("fromDropdownPanel"),
  toDropdownPanel: document.getElementById("toDropdownPanel"),
  fromSearchInput: document.getElementById("fromSearchInput"),
  toSearchInput: document.getElementById("toSearchInput"),
  fromClearSearch: document.getElementById("fromClearSearch"),
  toClearSearch: document.getElementById("toClearSearch"),
  fromOptionsList: document.getElementById("fromOptionsList"),
  toOptionsList: document.getElementById("toOptionsList"),
  fromNoResults: document.getElementById("fromNoResults"),
  toNoResults: document.getElementById("toNoResults"),

  // Quick Amount Buttons
  quickButtons: document.querySelectorAll(".quick-amounts-group .quick-btn[data-add]"),
  clearAmountBtn: document.getElementById("clearAmountBtn"),

  // Results Showcase
  calcExpression: document.getElementById("calcExpression"),
  convertedDigits: document.getElementById("convertedDigits"),
  convertedCode: document.getElementById("convertedCode"),
  unitRateText: document.getElementById("unitRateText"),
  lastUpdatedTimestamp: document.getElementById("lastUpdatedTimestamp"),
  rateTrendBadge: document.getElementById("rateTrendBadge"),
  trendIcon: document.getElementById("trendIcon"),
  trendPercentage: document.getElementById("trendPercentage"),

  // Toolbar Actions
  favActionBtn: document.getElementById("favActionBtn"),
  shareActionBtn: document.getElementById("shareActionBtn"),
  copyActionBtn: document.getElementById("copyActionBtn"),
  downloadActionBtn: document.getElementById("downloadActionBtn"),

  // Historical Trend Chart
  trendPairDropdown: document.getElementById("trendPairDropdown"),
  chartCanvas: document.getElementById("exchangeTrendChart"),
  chartCalloutPill: document.getElementById("chartCalloutPill"),
  calloutVal: document.getElementById("calloutVal"),
  calloutLbl: document.getElementById("calloutLbl"),
  chartLoadingOverlay: document.getElementById("chartLoadingOverlay"),
  chartErrorOverlay: document.getElementById("chartErrorOverlay"),
  chartErrorText: document.getElementById("chartErrorText"),
  chartRetryBtn: document.getElementById("chartRetryBtn"),

  // Recent Conversions History
  recentHistoryList: document.getElementById("recentHistoryList"),
  emptyHistoryState: document.getElementById("emptyHistoryState"),
  clearRecentBtn: document.getElementById("clearRecentBtn"),

  // Confirmation Modal
  confirmModalBackdrop: document.getElementById("confirmModalBackdrop"),
  modalDismissBtn: document.getElementById("modalDismissBtn"),
  modalConfirmDeleteBtn: document.getElementById("modalConfirmDeleteBtn"),

  // Popular Currencies Section
  popularChipsSlider: document.getElementById("popularChipsSlider"),
  popularCurrencySearch: document.getElementById("popularCurrencySearch"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),

  // Toast Container
  toastStack: document.getElementById("toastStack")
};

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener("DOMContentLoaded", () => {
  initTheme();
  populateCurrencyDropdowns();
  initCustomDropdowns();
  initPopularCurrencies();
  renderHistory();
  updateFavouriteButtonState();

  // Attach All Event Listeners
  attachEventListeners();

  // Perform initial conversion & chart load
  updateExchangeRate();
  loadHistoricalTrend();
});

// ============================================================================
// THEME MANAGEMENT (DARK / LIGHT MODE)
// ============================================================================

function initTheme() {
  const savedTheme = localStorage.getItem("currency_theme");
  // Default to Light Mode as shown in reference design, unless explicitly set to dark
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    if (elements.themeToggle) elements.themeToggle.checked = true;
  } else {
    document.body.classList.remove("dark-mode");
    if (elements.themeToggle) elements.themeToggle.checked = false;
  }
}

function toggleTheme(isDark) {
  if (isDark) {
    document.body.classList.add("dark-mode");
    localStorage.setItem("currency_theme", "dark");
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("currency_theme", "light");
  }

  // Update chart colors according to current theme
  updateChartTheme();
}

// ============================================================================
// DROPDOWNS & FLAGS
// ============================================================================

function populateCurrencyDropdowns() {
  if (typeof countryList === "undefined") {
    console.error("countryList is undefined. Ensure currency_country.js is loaded.");
    return;
  }

  const sortedCurrencies = Object.keys(countryList).sort();

  [elements.fromSelect, elements.toSelect].forEach((selectEl) => {
    if (!selectEl) return;
    selectEl.innerHTML = "";

    sortedCurrencies.forEach((currCode) => {
      const option = document.createElement("option");
      const name = (typeof currencyNames !== "undefined" && currencyNames[currCode]) ? ` — ${currencyNames[currCode]}` : "";
      option.value = currCode;
      option.textContent = `${currCode}`;
      option.title = `${currCode}${name}`;

      if (selectEl === elements.fromSelect && currCode === "USD") {
        option.selected = true;
      } else if (selectEl === elements.toSelect && currCode === "INR") {
        option.selected = true;
      }

      selectEl.appendChild(option);
    });
  });

  updateFlag(elements.fromSelect, elements.fromFlag);
  updateFlag(elements.toSelect, elements.toFlag);
  updateCurrencySymbolPrefix();
}

function updateFlag(selectElement, flagElement) {
  if (!selectElement || !flagElement) return;
  const currCode = selectElement.value;
  const countryCode = (typeof countryList !== "undefined" && countryList[currCode]) ? countryList[currCode] : "US";
  
  flagElement.src = `https://flagsapi.com/${countryCode}/flat/64.png`;
  flagElement.alt = `${currCode} flag`;
  flagElement.onerror = () => {
    flagElement.src = `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  };
}

function updateCurrencySymbolPrefix() {
  // Handled cleanly via amount input
}

// ============================================================================
// CUSTOM SEARCHABLE DROPDOWNS ENGINE
// ============================================================================

function initCustomDropdowns() {
  populateCustomDropdown("from");
  populateCustomDropdown("to");

  // Trigger click and keyboard handlers
  if (elements.fromTrigger) {
    elements.fromTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown("from");
    });
    elements.fromTrigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openDropdown("from");
      }
    });
  }

  if (elements.toTrigger) {
    elements.toTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown("to");
    });
    elements.toTrigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openDropdown("to");
      }
    });
  }

  // Prevent clicks inside the panel from closing it
  if (elements.fromDropdownPanel) {
    elements.fromDropdownPanel.addEventListener("click", (e) => e.stopPropagation());
  }
  if (elements.toDropdownPanel) {
    elements.toDropdownPanel.addEventListener("click", (e) => e.stopPropagation());
  }

  // Search input events and key navigation
  ["from", "to"].forEach((type) => {
    const isFrom = type === "from";
    const searchInput = isFrom ? elements.fromSearchInput : elements.toSearchInput;
    const clearBtn = isFrom ? elements.fromClearSearch : elements.toClearSearch;

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        filterDropdownOptions(type, e.target.value);
      });
      searchInput.addEventListener("keydown", (e) => {
        handleDropdownKeyNavigation(e, type);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = "";
          filterDropdownOptions(type, "");
          searchInput.focus();
        }
      });
    }
  });

  // Global click outside closes any open dropdown
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#fromSelectWrapper") && !e.target.closest("#toSelectWrapper")) {
      closeAllDropdowns();
    }
  });

  // Global Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllDropdowns();
    }
  });
}

function populateCustomDropdown(type) {
  const isFrom = type === "from";
  const selectEl = isFrom ? elements.fromSelect : elements.toSelect;
  const optionsList = isFrom ? elements.fromOptionsList : elements.toOptionsList;
  const codeDisplay = isFrom ? elements.fromCodeDisplay : elements.toCodeDisplay;

  if (!optionsList || !selectEl || typeof countryList === "undefined") return;

  const sortedCurrencies = Object.keys(countryList).sort();
  const currentVal = selectEl.value;

  if (codeDisplay) {
    codeDisplay.textContent = currentVal;
  }

  optionsList.innerHTML = "";

  sortedCurrencies.forEach((currCode) => {
    const countryCode = countryList[currCode] || "US";
    const currName = (typeof currencyNames !== "undefined" && currencyNames[currCode]) ? currencyNames[currCode] : currCode;
    const countryName = (typeof countryNames !== "undefined" && countryNames[currCode]) ? countryNames[currCode] : "";

    const flagSrc = `https://flagsapi.com/${countryCode}/flat/64.png`;
    const fallbackSrc = `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

    const option = document.createElement("div");
    option.className = `custom-dropdown-option ${currCode === currentVal ? "selected" : ""}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", currCode === currentVal ? "true" : "false");
    option.setAttribute("data-code", currCode);
    option.setAttribute("data-name", currName.toLowerCase());
    option.setAttribute("data-country", countryName.toLowerCase());
    option.tabIndex = -1;

    option.innerHTML = `
      <div class="option-flag-wrap">
        <img src="${flagSrc}" alt="${currCode}" onerror="this.src='${fallbackSrc}'">
      </div>
      <div class="option-text-group">
        <span class="option-code">${currCode}</span>
        <span class="option-separator">—</span>
        <span class="option-name">${currName}</span>
      </div>
      <i class="fa-solid fa-check option-check-icon"></i>
    `;

    option.addEventListener("click", () => {
      selectCurrency(type, currCode);
    });

    optionsList.appendChild(option);
  });
}

function toggleDropdown(type) {
  const isFrom = type === "from";
  const panel = isFrom ? elements.fromDropdownPanel : elements.toDropdownPanel;

  if (panel && panel.style.display !== "none") {
    closeAllDropdowns();
  } else {
    openDropdown(type);
  }
}

function openDropdown(type) {
  const isFrom = type === "from";
  const panel = isFrom ? elements.fromDropdownPanel : elements.toDropdownPanel;
  const trigger = isFrom ? elements.fromTrigger : elements.toTrigger;
  const searchInput = isFrom ? elements.fromSearchInput : elements.toSearchInput;
  const clearBtn = isFrom ? elements.fromClearSearch : elements.toClearSearch;
  const optionsList = isFrom ? elements.fromOptionsList : elements.toOptionsList;
  const noResults = isFrom ? elements.fromNoResults : elements.toNoResults;
  const selectEl = isFrom ? elements.fromSelect : elements.toSelect;

  closeAllDropdowns();

  if (!panel || !trigger) return;

  panel.style.display = "flex";
  trigger.classList.add("is-active");
  trigger.setAttribute("aria-expanded", "true");

  if (searchInput) {
    searchInput.value = "";
    if (clearBtn) clearBtn.style.display = "none";
  }
  if (noResults) noResults.style.display = "none";

  if (optionsList) {
    const options = optionsList.querySelectorAll(".custom-dropdown-option");
    options.forEach((opt) => {
      opt.style.display = "flex";
      opt.classList.remove("option-highlighted");
    });

    const currentCode = selectEl ? selectEl.value : "";
    const selectedOpt = Array.from(options).find((opt) => opt.getAttribute("data-code") === currentCode);
    if (selectedOpt) {
      selectedOpt.classList.add("selected");
      setTimeout(() => {
        selectedOpt.scrollIntoView({ block: "center", behavior: "auto" });
      }, 40);
    } else {
      optionsList.scrollTop = 0;
    }
  }

  if (searchInput) {
    setTimeout(() => {
      searchInput.focus();
    }, 60);
  }
}

function closeAllDropdowns() {
  [
    { panel: elements.fromDropdownPanel, trigger: elements.fromTrigger },
    { panel: elements.toDropdownPanel, trigger: elements.toTrigger }
  ].forEach(({ panel, trigger }) => {
    if (panel) panel.style.display = "none";
    if (trigger) {
      trigger.classList.remove("is-active");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

function selectCurrency(type, currCode) {
  const isFrom = type === "from";
  const selectEl = isFrom ? elements.fromSelect : elements.toSelect;
  const codeDisplay = isFrom ? elements.fromCodeDisplay : elements.toCodeDisplay;
  const flagEl = isFrom ? elements.fromFlag : elements.toFlag;
  const triggerEl = isFrom ? elements.fromTrigger : elements.toTrigger;

  if (selectEl) selectEl.value = currCode;
  if (codeDisplay) codeDisplay.textContent = currCode;

  updateFlag(selectEl, flagEl);
  updateDropdownSelection(type, currCode);

  closeAllDropdowns();
  if (triggerEl) triggerEl.focus();

  // If target currency changed, update popular chips active highlight
  if (!isFrom) {
    document.querySelectorAll(".currency-chip").forEach((c) => {
      c.classList.toggle("chip-active", c.dataset.currency === currCode);
    });
  }

  updateExchangeRate(false);
  updateFavouriteButtonState();
}

function updateDropdownSelection(type, currCode) {
  const isFrom = type === "from";
  const optionsList = isFrom ? elements.fromOptionsList : elements.toOptionsList;

  if (!optionsList) return;

  optionsList.querySelectorAll(".custom-dropdown-option").forEach((opt) => {
    const isSel = opt.getAttribute("data-code") === currCode;
    opt.classList.toggle("selected", isSel);
    opt.setAttribute("aria-selected", isSel ? "true" : "false");
  });
}

function filterDropdownOptions(type, query) {
  const isFrom = type === "from";
  const clearBtn = isFrom ? elements.fromClearSearch : elements.toClearSearch;
  const optionsList = isFrom ? elements.fromOptionsList : elements.toOptionsList;
  const noResults = isFrom ? elements.fromNoResults : elements.toNoResults;

  const clean = query.trim().toLowerCase();

  if (clearBtn) {
    clearBtn.style.display = clean.length > 0 ? "flex" : "none";
  }

  if (!optionsList) return;

  const options = optionsList.querySelectorAll(".custom-dropdown-option");
  let matchCount = 0;
  let firstMatch = null;

  options.forEach((opt) => {
    const code = opt.getAttribute("data-code").toLowerCase();
    const name = opt.getAttribute("data-name") || "";
    const country = opt.getAttribute("data-country") || "";

    const isMatch = !clean || code.includes(clean) || name.includes(clean) || country.includes(clean);

    if (isMatch) {
      opt.style.display = "flex";
      matchCount++;
      if (!firstMatch) firstMatch = opt;
    } else {
      opt.style.display = "none";
    }

    opt.classList.remove("option-highlighted");
  });

  if (clean && firstMatch) {
    firstMatch.classList.add("option-highlighted");
  }

  if (noResults) {
    noResults.style.display = matchCount === 0 ? "flex" : "none";
  }
}

function handleDropdownKeyNavigation(e, type) {
  const isFrom = type === "from";
  const panel = isFrom ? elements.fromDropdownPanel : elements.toDropdownPanel;
  const optionsList = isFrom ? elements.fromOptionsList : elements.toOptionsList;
  const trigger = isFrom ? elements.fromTrigger : elements.toTrigger;

  if (!panel || panel.style.display === "none" || !optionsList) return;

  const visibleOptions = Array.from(optionsList.querySelectorAll(".custom-dropdown-option"))
    .filter((opt) => opt.style.display !== "none");

  if (visibleOptions.length === 0) {
    if (e.key === "Escape") {
      closeAllDropdowns();
      if (trigger) trigger.focus();
    }
    return;
  }

  let currentIndex = visibleOptions.findIndex((opt) => opt.classList.contains("option-highlighted"));

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (currentIndex === -1) {
      currentIndex = 0;
    } else {
      currentIndex = (currentIndex + 1) % visibleOptions.length;
    }
    visibleOptions.forEach((opt, idx) => {
      opt.classList.toggle("option-highlighted", idx === currentIndex);
    });
    visibleOptions[currentIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (currentIndex <= 0) {
      currentIndex = visibleOptions.length - 1;
    } else {
      currentIndex = currentIndex - 1;
    }
    visibleOptions.forEach((opt, idx) => {
      opt.classList.toggle("option-highlighted", idx === currentIndex);
    });
    visibleOptions[currentIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  } else if (e.key === "Enter") {
    e.preventDefault();
    const target = currentIndex >= 0 ? visibleOptions[currentIndex] : visibleOptions[0];
    if (target) {
      const code = target.getAttribute("data-code");
      selectCurrency(type, code);
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    closeAllDropdowns();
    if (trigger) trigger.focus();
  }
}

// ============================================================================
// CONVERSION & LIVE RATES ENGINE
// ============================================================================

async function fetchLiveRates(baseCurrency) {
  const cacheKey = `rates_${baseCurrency}`;
  const cached = ratesCache.get(cacheKey);

  // Use cached data if fresh (within 90 seconds)
  if (cached && (Date.now() - cached.timestamp < 90000)) {
    return cached.data;
  }

  try {
    const res = await fetch(`${BASE_URL}${baseCurrency}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data && data.result === "success" && data.rates) {
      ratesCache.set(cacheKey, {
        timestamp: Date.now(),
        data: data
      });
      return data;
    }
    throw new Error("Invalid response format");
  } catch (err) {
    console.warn("Primary rates API failed, trying fallback...", err);

    // Secondary fallback: Frankfurter
    try {
      const fbRes = await fetch(`${FRANKFURTER_APP_URL}latest?from=${baseCurrency}`);
      const fbData = await fbRes.json();
      if (fbData && fbData.rates) {
        // Construct compatible format
        const adapted = {
          result: "success",
          base_code: baseCurrency,
          rates: { ...fbData.rates, [baseCurrency]: 1 },
          time_last_update_utc: new Date(fbData.date).toUTCString()
        };
        ratesCache.set(cacheKey, { timestamp: Date.now(), data: adapted });
        return adapted;
      }
    } catch (fbErr) {
      console.error("Both exchange rate APIs failed:", fbErr);
    }
    throw err;
  }
}

async function updateExchangeRate(recordToHistory = false) {
  const fromCurr = elements.fromSelect.value;
  const toCurr = elements.toSelect.value;
  let rawAmount = parseFloat(elements.amountInput.value);

  if (isNaN(rawAmount) || rawAmount <= 0) {
    rawAmount = 1;
    elements.amountInput.value = "1";
  }

  try {
    // Visual feedback on convert button
    if (recordToHistory && elements.convertBtn) {
      elements.convertBtn.style.opacity = "0.75";
      elements.convertBtn.querySelector(".btn-text").textContent = "Converting...";
    }

    const data = await fetchLiveRates(fromCurr);
    const rate = data.rates[toCurr];

    if (rate === undefined) {
      showToast(`Exchange rate for ${toCurr} currently unavailable.`, "warning");
      return;
    }

    const convertedTotal = rawAmount * rate;

    // Formatting numbers cleanly
    const formattedAmount = formatCurrencyNumber(rawAmount);
    const formattedResult = formatCurrencyNumber(convertedTotal);
    const formattedRate = formatRateNumber(rate);

    // Update Main Result UI
    elements.calcExpression.textContent = `${formattedAmount} ${fromCurr} =`;
    elements.convertedDigits.textContent = formattedResult;
    elements.convertedCode.textContent = toCurr;
    elements.unitRateText.textContent = `1 ${fromCurr} = ${formattedRate} ${toCurr}`;

    // Timestamp
    const now = new Date();
    const formattedTimestamp = formatFullDateTime(now);
    elements.lastUpdatedTimestamp.textContent = `Last updated: ${formattedTimestamp}`;
    elements.liveStatusText.textContent = "Updated just now";

    // Save to Recent Conversions if user clicked Convert or initiated conversion
    if (recordToHistory) {
      saveConversionRecord({
        fromCurr,
        toCurr,
        amount: rawAmount,
        converted: convertedTotal,
        rate: rate,
        timestamp: now.toISOString()
      });
      showToast(`Converted ${formattedAmount} ${fromCurr} to ${formattedResult} ${toCurr}`, "success");
    }

    // If trend pair is set to "CURRENT", reload trend graph
    if (elements.trendPairDropdown && elements.trendPairDropdown.value === "CURRENT") {
      loadHistoricalTrend();
    } else {
      // Calculate rate trend vs yesterday for the current pair
      fetchRateTrendComparison(fromCurr, toCurr, rate);
    }

    updateFavouriteButtonState();

  } catch (err) {
    console.error("Conversion error:", err);
    showToast("Failed to fetch latest exchange rates. Please check your connection.", "error");
    elements.liveStatusText.textContent = "Offline / Sync Error";
  } finally {
    if (elements.convertBtn) {
      elements.convertBtn.style.opacity = "1";
      elements.convertBtn.querySelector(".btn-text").textContent = "Convert Now";
    }
  }
}

// Calculates or fetches yesterday's comparison to show "▲ +0.12% (vs yesterday)"
async function fetchRateTrendComparison(base, quote, currentRate) {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 4); // look back 4 days to handle weekends

    const toStr = end.toISOString().split("T")[0];
    const fromStr = start.toISOString().split("T")[0];

    const res = await fetch(`${FRANKFURTER_DEV_URL}?base=${base}&quotes=${quote}&from=${fromStr}&to=${toStr}`);
    if (res.ok) {
      const points = await res.json();
      if (Array.isArray(points) && points.length >= 2) {
        const latestTradingRate = points[points.length - 1].rate;
        const prevTradingRate = points[points.length - 2].rate;
        const diff = latestTradingRate - prevTradingRate;
        const pct = ((diff / prevTradingRate) * 100);
        updateTrendBadge(pct);
        return;
      }
    }
  } catch (e) {
    // silent fallback
  }

  // If frankfurter doesn't have this exotic pair, show neutral badge
  updateTrendBadge(0.05);
}

function updateTrendBadge(pct) {
  if (!elements.rateTrendBadge || !elements.trendPercentage || !elements.trendIcon) return;
  const isPos = pct >= 0;
  const sign = isPos ? "+" : "";
  const displayPct = `${sign}${pct.toFixed(2)}%`;

  elements.trendPercentage.textContent = displayPct;

  if (isPos) {
    elements.rateTrendBadge.className = "trend-badge positive";
    elements.trendIcon.className = "fa-solid fa-caret-up trend-icon";
  } else {
    elements.rateTrendBadge.className = "trend-badge negative";
    elements.trendIcon.className = "fa-solid fa-caret-down trend-icon";
  }
}

// ============================================================================
// REAL EXCHANGE RATE TREND GRAPH (CHART.JS)
// ============================================================================

async function fetchHistoricalTrendData(base, quote) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 10); // fetch last 10 days to guarantee at least 7 trading days

  const toStr = end.toISOString().split("T")[0];
  const fromStr = start.toISOString().split("T")[0];

  // Try Frankfurter Dev API v2 first
  try {
    const devUrl = `${FRANKFURTER_DEV_URL}?base=${base}&quotes=${quote}&from=${fromStr}&to=${toStr}`;
    const res = await fetch(devUrl);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map(item => ({
          date: item.date,
          rate: item.rate
        }));
      }
    }
  } catch (err) {
    console.warn("Frankfurter dev API range failed, trying app API...", err);
  }

  // Fallback to Frankfurter App API
  try {
    const appUrl = `${FRANKFURTER_APP_URL}${fromStr}..${toStr}?from=${base}&to=${quote}`;
    const res = await fetch(appUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const sortedDates = Object.keys(data.rates).sort();
        return sortedDates.map(d => ({
          date: d,
          rate: data.rates[d][quote]
        }));
      }
    }
  } catch (appErr) {
    console.error("Historical data fallback failed:", appErr);
  }

  throw new Error(`Trend data unavailable for ${base} → ${quote}`);
}

async function loadHistoricalTrend() {
  if (!elements.chartCanvas) return;

  let pairVal = elements.trendPairDropdown.value;
  let base = "USD";
  let quote = "INR";

  if (pairVal === "CURRENT") {
    base = elements.fromSelect.value;
    quote = elements.toSelect.value;
  } else {
    const parts = pairVal.split("-");
    base = parts[0];
    quote = parts[1];
  }

  // Prevent base == quote
  if (base === quote) {
    showChartError(`Cannot graph identical pair ${base} → ${quote}. Select different currencies.`);
    return;
  }

  // Set loading state
  showChartLoading(true);
  hideChartError();

  try {
    const rawData = await fetchHistoricalTrendData(base, quote);

    // Keep last 7 trading days
    const recentData = rawData.slice(-7);

    if (recentData.length === 0) {
      throw new Error("No data points returned.");
    }

    currentPairTrendData = {
      base,
      quote,
      points: recentData
    };

    renderTrendChart(recentData, base, quote);

    // Update Callout Pill with the latest available rate and date
    const latestPoint = recentData[recentData.length - 1];
    if (latestPoint && elements.chartCalloutPill) {
      elements.calloutVal.textContent = formatRateNumber(latestPoint.rate);
      const parsedDate = new Date(latestPoint.date);
      const day = parsedDate.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
      const month = parsedDate.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
      elements.calloutLbl.textContent = `${day} ${month}`;
      elements.chartCalloutPill.style.display = "flex";
    }

    showChartLoading(false);

  } catch (err) {
    console.error("Failed to load historical trend:", err);
    showChartLoading(false);
    showChartError(`Historical trend for ${base} → ${quote} is currently unavailable. Pick another pair from the dropdown.`);
  }
}

function renderTrendChart(dataPoints, base, quote) {
  const ctx = elements.chartCanvas.getContext("2d");
  const isDarkMode = document.body.classList.contains("dark-mode");

  const labels = dataPoints.map(p => {
    const d = new Date(p.date);
    const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
    const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    return `${month} ${day}`;
  });

  const values = dataPoints.map(p => p.rate);

  // Gradient fill under the line
  const gradient = ctx.createLinearGradient(0, 0, 0, elements.chartCanvas.height || 200);
  if (isDarkMode) {
    gradient.addColorStop(0, "rgba(139, 92, 246, 0.4)");
    gradient.addColorStop(1, "rgba(139, 92, 246, 0.0)");
  } else {
    gradient.addColorStop(0, "rgba(108, 71, 255, 0.3)");
    gradient.addColorStop(1, "rgba(108, 71, 255, 0.0)");
  }

  const lineColor = isDarkMode ? "#a78bfa" : "#6c47ff";
  const gridColor = isDarkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(100, 116, 139, 0.08)";
  const tickColor = isDarkMode ? "#94a3b8" : "#64748b";

  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  trendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: `${base}/${quote}`,
          data: values,
          borderColor: lineColor,
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.42,
          pointBackgroundColor: lineColor,
          pointBorderColor: isDarkMode ? "#1e1b4b" : "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 6.5,
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: lineColor,
          pointHoverBorderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: isDarkMode ? "rgba(26, 32, 53, 0.95)" : "rgba(255, 255, 255, 0.95)",
          titleColor: isDarkMode ? "#f8fafc" : "#20184e",
          bodyColor: isDarkMode ? "#c4b5fd" : "#6c47ff",
          borderColor: lineColor,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            title: function (items) {
              return items[0].label;
            },
            label: function (context) {
              return `1 ${base} = ${formatRateNumber(context.raw)} ${quote}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: tickColor,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 11,
              weight: 600
            },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 5
          }
        },
        y: {
          grid: {
            color: gridColor,
            drawBorder: false
          },
          ticks: {
            color: tickColor,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 11,
              weight: 600
            },
            callback: function (val) {
              return formatRateNumber(val);
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: "index"
      }
    }
  });
}

function updateChartTheme() {
  if (!trendChartInstance || !currentPairTrendData) return;
  renderTrendChart(currentPairTrendData.points, currentPairTrendData.base, currentPairTrendData.quote);
}

function showChartLoading(isLoading) {
  if (!elements.chartLoadingOverlay) return;
  elements.chartLoadingOverlay.style.display = isLoading ? "flex" : "none";
}

function showChartError(msg) {
  if (!elements.chartErrorOverlay) return;
  elements.chartErrorText.textContent = msg || "Trend data unavailable.";
  elements.chartErrorOverlay.style.display = "flex";
  if (elements.chartCalloutPill) elements.chartCalloutPill.style.display = "none";
}

function hideChartError() {
  if (!elements.chartErrorOverlay) return;
  elements.chartErrorOverlay.style.display = "none";
}

// ============================================================================
// RECENT CONVERSIONS HISTORY (LOCALSTORAGE PERSISTENT)
// ============================================================================

function getStoredHistory() {
  try {
    const raw = localStorage.getItem("currency_conversions_history");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse history from localStorage:", e);
    return [];
  }
}

function saveConversionRecord(record) {
  let list = getStoredHistory();

  // Prevent immediate duplicates within 5 seconds
  if (list.length > 0) {
    const last = list[0];
    if (last.fromCurr === record.fromCurr &&
        last.toCurr === record.toCurr &&
        last.amount === record.amount &&
        (new Date(record.timestamp) - new Date(last.timestamp) < 5000)) {
      return;
    }
  }

  list.unshift(record);
  if (list.length > MAX_HISTORY_ITEMS) {
    list = list.slice(0, MAX_HISTORY_ITEMS);
  }

  localStorage.setItem("currency_conversions_history", JSON.stringify(list));
  renderHistory();
}

function renderHistory() {
  if (!elements.recentHistoryList || !elements.emptyHistoryState) return;

  const history = getStoredHistory();
  elements.recentHistoryList.innerHTML = "";

  if (history.length === 0) {
    elements.emptyHistoryState.style.display = "flex";
    elements.recentHistoryList.style.display = "none";
    if (elements.clearRecentBtn) elements.clearRecentBtn.style.display = "none";
    return;
  }

  elements.emptyHistoryState.style.display = "none";
  elements.recentHistoryList.style.display = "flex";
  if (elements.clearRecentBtn) elements.clearRecentBtn.style.display = "inline-block";

  history.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.title = `Click to load ${item.amount} ${item.fromCurr} → ${item.toCurr}`;

    const countryCode = (typeof countryList !== "undefined" && countryList[item.fromCurr]) ? countryList[item.fromCurr] : "US";
    const flagSrc = `https://flagsapi.com/${countryCode}/flat/64.png`;
    const fallbackSrc = `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

    const formattedAmount = formatCurrencyNumber(item.amount);
    const formattedConverted = formatCurrencyNumber(item.converted);

    const d = new Date(item.timestamp);
    const day = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    li.innerHTML = `
      <div class="history-left">
        <div class="history-flag-wrap">
          <img src="${flagSrc}" alt="${item.fromCurr}" onerror="this.src='${fallbackSrc}'">
        </div>
        <div class="history-conversion-text">
          <span>${formattedAmount} ${item.fromCurr}</span>
          <span class="history-arrow">→</span>
          <span>${formattedConverted} ${item.toCurr}</span>
        </div>
      </div>
      <div class="history-time-meta">
        <span>${day}</span>
        <span>${time}</span>
      </div>
    `;

    // Click item to load back into converter
    li.addEventListener("click", () => {
      elements.amountInput.value = item.amount;
      elements.fromSelect.value = item.fromCurr;
      elements.toSelect.value = item.toCurr;

      if (elements.fromCodeDisplay) elements.fromCodeDisplay.textContent = item.fromCurr;
      if (elements.toCodeDisplay) elements.toCodeDisplay.textContent = item.toCurr;
      updateDropdownSelection("from", item.fromCurr);
      updateDropdownSelection("to", item.toCurr);

      updateFlag(elements.fromSelect, elements.fromFlag);
      updateFlag(elements.toSelect, elements.toFlag);
      updateCurrencySymbolPrefix();
      updateExchangeRate(false);
      showToast(`Loaded conversion: ${item.amount} ${item.fromCurr} → ${item.toCurr}`, "info");
    });

    elements.recentHistoryList.appendChild(li);
  });
}

function clearAllHistory() {
  localStorage.removeItem("currency_conversions_history");
  renderHistory();
  showToast("Recent conversion history cleared.", "info");
}

// ============================================================================
// POPULAR CURRENCIES SECTION & LIVE SEARCH
// ============================================================================

function initPopularCurrencies() {
  renderPopularChips(DEFAULT_POPULAR_CURRENCIES);
}

function renderPopularChips(currenciesToRender, isSearch = false) {
  if (!elements.popularChipsSlider) return;
  elements.popularChipsSlider.innerHTML = "";

  if (!currenciesToRender || currenciesToRender.length === 0) {
    elements.popularChipsSlider.innerHTML = `<span class="no-search-results">No currencies found matching your search.</span>`;
    return;
  }

  const currentToCurr = elements.toSelect ? elements.toSelect.value : "INR";

  currenciesToRender.forEach(currCode => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `currency-chip ${currCode === currentToCurr ? "chip-active" : ""}`;
    chip.dataset.currency = currCode;

    const countryCode = (typeof countryList !== "undefined" && countryList[currCode]) ? countryList[currCode] : "US";
    const name = (typeof currencyNames !== "undefined" && currencyNames[currCode]) ? currencyNames[currCode] : "";
    const flagSrc = `https://flagsapi.com/${countryCode}/flat/64.png`;
    const fallbackSrc = `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

    chip.innerHTML = `
      <div class="chip-flag-wrap">
        <img src="${flagSrc}" alt="${currCode}" onerror="this.src='${fallbackSrc}'">
      </div>
      <span class="chip-code">${currCode}</span>
      ${isSearch && name ? `<span class="chip-name-sub">${name}</span>` : ""}
    `;

    chip.addEventListener("click", () => {
      handlePopularCurrencyClick(currCode);
    });

    elements.popularChipsSlider.appendChild(chip);
  });
}

function handlePopularCurrencyClick(selectedCurr) {
  const currentFrom = elements.fromSelect.value;
  const currentTo = elements.toSelect.value;

  if (selectedCurr === currentFrom) {
    swapCurrencies();
    return;
  }

  elements.toSelect.value = selectedCurr;
  if (elements.toCodeDisplay) elements.toCodeDisplay.textContent = selectedCurr;
  updateDropdownSelection("to", selectedCurr);

  updateFlag(elements.toSelect, elements.toFlag);
  updateExchangeRate(true);

  document.querySelectorAll(".currency-chip").forEach(c => {
    c.classList.toggle("chip-active", c.dataset.currency === selectedCurr);
  });

  showToast(`Switched target currency to ${selectedCurr}`, "info");
}

function handlePopularSearch(query) {
  const clean = query.trim().toUpperCase();

  if (!clean) {
    if (elements.clearSearchBtn) elements.clearSearchBtn.style.display = "none";
    renderPopularChips(DEFAULT_POPULAR_CURRENCIES, false);
    return;
  }

  if (elements.clearSearchBtn) elements.clearSearchBtn.style.display = "block";

  if (typeof countryList === "undefined") return;

  const matches = Object.keys(countryList).filter(code => {
    const fullName = (typeof currencyNames !== "undefined" && currencyNames[code]) ? currencyNames[code].toUpperCase() : "";
    return code.includes(clean) || fullName.includes(clean);
  });

  // Limit search results to top 14 items for clean UI
  renderPopularChips(matches.slice(0, 14), true);
}

// ============================================================================
// CURRENCY SWAP & QUICK ACTIONS
// ============================================================================

function swapCurrencies() {
  const temp = elements.fromSelect.value;
  elements.fromSelect.value = elements.toSelect.value;
  elements.toSelect.value = temp;

  if (elements.fromCodeDisplay) elements.fromCodeDisplay.textContent = elements.fromSelect.value;
  if (elements.toCodeDisplay) elements.toCodeDisplay.textContent = elements.toSelect.value;
  updateDropdownSelection("from", elements.fromSelect.value);
  updateDropdownSelection("to", elements.toSelect.value);

  updateFlag(elements.fromSelect, elements.fromFlag);
  updateFlag(elements.toSelect, elements.toFlag);
  updateCurrencySymbolPrefix();

  // Animation trigger on swap button
  elements.swapBtn.classList.add("rotated");
  setTimeout(() => elements.swapBtn.classList.remove("rotated"), 350);

  updateExchangeRate(false);
  showToast(`Swapped: ${elements.fromSelect.value} ↔ ${elements.toSelect.value}`, "info");
}

function getFavouritePairs() {
  try {
    const favs = localStorage.getItem("currency_favourites");
    return favs ? JSON.parse(favs) : [];
  } catch (e) {
    return [];
  }
}

function updateFavouriteButtonState() {
  if (!elements.favActionBtn || !elements.fromSelect || !elements.toSelect) return;
  const currentPairKey = `${elements.fromSelect.value}_${elements.toSelect.value}`;
  const favs = getFavouritePairs();
  const isFav = favs.includes(currentPairKey);

  elements.favActionBtn.classList.toggle("active-fav", isFav);
  const icon = elements.favActionBtn.querySelector("i");
  if (icon) {
    icon.className = isFav ? "fa-solid fa-heart" : "fa-regular fa-heart";
  }
  elements.favActionBtn.querySelector("span").textContent = isFav ? "Favourited" : "Add to Favourites";
}

function toggleFavourite() {
  const currentPairKey = `${elements.fromSelect.value}_${elements.toSelect.value}`;
  let favs = getFavouritePairs();

  if (favs.includes(currentPairKey)) {
    favs = favs.filter(k => k !== currentPairKey);
    localStorage.setItem("currency_favourites", JSON.stringify(favs));
    updateFavouriteButtonState();
    showToast(`Removed ${elements.fromSelect.value} → ${elements.toSelect.value} from Favourites`, "info");
  } else {
    favs.push(currentPairKey);
    localStorage.setItem("currency_favourites", JSON.stringify(favs));
    updateFavouriteButtonState();
    showToast(`Added ${elements.fromSelect.value} → ${elements.toSelect.value} to Favourites!`, "success");
  }
}

function copyConversionResult() {
  const amount = elements.amountInput.value;
  const from = elements.fromSelect.value;
  const converted = elements.convertedDigits.textContent;
  const to = elements.convertedCode.textContent;
  const rateInfo = elements.unitRateText.textContent;

  const copyText = `${amount} ${from} = ${converted} ${to} (${rateInfo})`;

  navigator.clipboard.writeText(copyText)
    .then(() => showToast("Copied result to clipboard!", "success"))
    .catch(() => showToast("Unable to copy to clipboard.", "error"));
}

function shareConversionResult() {
  const amount = elements.amountInput.value;
  const from = elements.fromSelect.value;
  const converted = elements.convertedDigits.textContent;
  const to = elements.convertedCode.textContent;

  const shareData = {
    title: "Currency Conversion",
    text: `${amount} ${from} = ${converted} ${to} on Currency Converter Dashboard`,
    url: window.location.href
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    navigator.share(shareData).catch(err => {
      if (err.name !== "AbortError") copyConversionResult();
    });
  } else {
    copyConversionResult();
  }
}

function downloadConversionReceipt() {
  const amount = elements.amountInput.value;
  const from = elements.fromSelect.value;
  const converted = elements.convertedDigits.textContent;
  const to = elements.convertedCode.textContent;
  const rateInfo = elements.unitRateText.textContent;
  const trend = elements.trendPercentage.textContent;
  const timestamp = elements.lastUpdatedTimestamp.textContent;

  const receiptContent = `================================================
          CURRENCY CONVERTER RECEIPT
================================================
Generated On : ${new Date().toLocaleString()}
${timestamp}

Conversion Details:
------------------------------------------------
Original Amount : ${amount} ${from}
Converted Amount: ${converted} ${to}
Base Rate       : ${rateInfo}
Market Trend    : ${trend} (vs previous day)
Status          : Verified Live Rate

------------------------------------------------
"Different Currencies, A Connected World 🌍"
================================================
`;

  const blob = new Blob([receiptContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `currency-receipt-${from}-${to}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Conversion receipt downloaded!", "success");
}

// ============================================================================
// MODAL & TOAST SYSTEMS
// ============================================================================

function showToast(message, type = "info") {
  if (!elements.toastStack) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let iconClass = "fa-solid fa-circle-info";
  if (type === "success") iconClass = "fa-solid fa-circle-check";
  if (type === "warning") iconClass = "fa-solid fa-triangle-exclamation";
  if (type === "error") iconClass = "fa-solid fa-circle-xmark";

  toast.innerHTML = `
    <i class="${iconClass} toast-icon"></i>
    <span>${message}</span>
  `;

  elements.toastStack.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-leave");
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 280);
  }, 3200);
}

function openConfirmModal() {
  if (elements.confirmModalBackdrop) {
    elements.confirmModalBackdrop.style.display = "flex";
  }
}

function closeConfirmModal() {
  if (elements.confirmModalBackdrop) {
    elements.confirmModalBackdrop.style.display = "none";
  }
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

function formatCurrencyNumber(val) {
  if (isNaN(val)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: val < 0.01 && val > 0 ? 6 : 2
  }).format(val);
}

function formatRateNumber(val) {
  if (isNaN(val)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: val < 1 ? 4 : 2
  }).format(val);
}

function formatFullDateTime(d) {
  const dateStr = d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
  return `${dateStr}, ${timeStr}`;
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================

function attachEventListeners() {
  // Theme Toggle
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("change", (e) => {
      toggleTheme(e.target.checked);
    });
  }

  // Currency Dropdown Changes
  if (elements.fromSelect) {
    elements.fromSelect.addEventListener("change", (e) => {
      updateFlag(elements.fromSelect, elements.fromFlag);
      updateCurrencySymbolPrefix();
      updateExchangeRate(false);
    });
  }

  if (elements.toSelect) {
    elements.toSelect.addEventListener("change", (e) => {
      updateFlag(elements.toSelect, elements.toFlag);
      updateExchangeRate(false);
      // Synchronize popular currency chip active highlight
      document.querySelectorAll(".currency-chip").forEach(c => {
        c.classList.toggle("chip-active", c.dataset.currency === elements.toSelect.value);
      });
    });
  }

  // Swap Button
  if (elements.swapBtn) {
    elements.swapBtn.addEventListener("click", swapCurrencies);
  }

  // Amount Input changes
  if (elements.amountInput) {
    elements.amountInput.addEventListener("input", () => {
      updateExchangeRate(false);
    });
  }

  // Quick Amount Buttons (+100, +500, +1000)
  elements.quickButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const addVal = parseFloat(btn.dataset.add);
      const current = parseFloat(elements.amountInput.value) || 0;
      elements.amountInput.value = (current + addVal).toString();
      updateExchangeRate(false);
    });
  });

  // Clear Amount Button
  if (elements.clearAmountBtn) {
    elements.clearAmountBtn.addEventListener("click", () => {
      elements.amountInput.value = "";
      elements.amountInput.focus();
    });
  }

  // Main Convert Button
  if (elements.convertBtn) {
    elements.convertBtn.addEventListener("click", () => {
      updateExchangeRate(true);
    });
  }

  // Action Buttons Toolbar
  if (elements.favActionBtn) elements.favActionBtn.addEventListener("click", toggleFavourite);
  if (elements.shareActionBtn) elements.shareActionBtn.addEventListener("click", shareConversionResult);
  if (elements.copyActionBtn) elements.copyActionBtn.addEventListener("click", copyConversionResult);
  if (elements.downloadActionBtn) elements.downloadActionBtn.addEventListener("click", downloadConversionReceipt);

  // Historical Trend Currency Pair Dropdown
  if (elements.trendPairDropdown) {
    elements.trendPairDropdown.addEventListener("change", () => {
      loadHistoricalTrend();
    });
  }

  if (elements.chartRetryBtn) {
    elements.chartRetryBtn.addEventListener("click", () => {
      loadHistoricalTrend();
    });
  }

  // Recent Conversions Clear All
  if (elements.clearRecentBtn) {
    elements.clearRecentBtn.addEventListener("click", openConfirmModal);
  }

  if (elements.modalDismissBtn) {
    elements.modalDismissBtn.addEventListener("click", closeConfirmModal);
  }

  if (elements.modalConfirmDeleteBtn) {
    elements.modalConfirmDeleteBtn.addEventListener("click", () => {
      closeConfirmModal();
      clearAllHistory();
    });
  }

  // Popular Currency Search
  if (elements.popularCurrencySearch) {
    elements.popularCurrencySearch.addEventListener("input", (e) => {
      handlePopularSearch(e.target.value);
    });
  }

  if (elements.clearSearchBtn) {
    elements.clearSearchBtn.addEventListener("click", () => {
      elements.popularCurrencySearch.value = "";
      handlePopularSearch("");
      elements.popularCurrencySearch.focus();
    });
  }

  // Close modal when clicking backdrop
  if (elements.confirmModalBackdrop) {
    elements.confirmModalBackdrop.addEventListener("click", (e) => {
      if (e.target === elements.confirmModalBackdrop) {
        closeConfirmModal();
      }
    });
  }
}
