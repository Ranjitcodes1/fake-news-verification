// Veritas Chrome Extension - Popup Controller

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const currentTabTitle = document.getElementById("current-tab-title");
  const verifyTabBtn = document.getElementById("verify-tab-btn");
  const headlineInput = document.getElementById("headline-input");
  const contentInput = document.getElementById("content-input");
  const verifyTextBtn = document.getElementById("verify-text-btn");
  const loadingSpinner = document.getElementById("loading-spinner");
  const errorAlert = document.getElementById("error-alert");
  const resultCard = document.getElementById("result-card");
  const resultBadge = document.getElementById("result-badge");
  const confidenceVal = document.getElementById("confidence-val");
  const meterFill = document.getElementById("meter-fill");
  const resultNarrative = document.getElementById("result-narrative");
  const topClaimText = document.getElementById("top-claim-text");
  const viewFullDossierBtn = document.getElementById("view-full-dossier-btn");

  // Settings elements
  const settingsBtn = document.getElementById("settings-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const mainPanel = document.getElementById("main-panel");
  const apiUrlInput = document.getElementById("api-url-input");
  const webUrlInput = document.getElementById("web-url-input");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const closeSettingsBtn = document.getElementById("close-settings-btn");

  // Load config
  let { apiUrl = "http://localhost:8000/api/v1", webUrl = "http://localhost:5173" } =
    await chrome.storage.sync.get(["apiUrl", "webUrl"]);

  apiUrlInput.value = apiUrl;
  webUrlInput.value = webUrl;

  // Query Active Tab
  let activeTab = null;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      activeTab = tabs[0];
      currentTabTitle.textContent = activeTab.title || activeTab.url || "Active Tab";
    }
  } catch (err) {
    currentTabTitle.textContent = "Unable to read current tab";
  }

  // Toggle Settings
  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
    mainPanel.classList.toggle("hidden");
  });

  closeSettingsBtn.addEventListener("click", () => {
    settingsPanel.classList.add("hidden");
    mainPanel.classList.remove("hidden");
  });

  saveSettingsBtn.addEventListener("click", async () => {
    apiUrl = apiUrlInput.value.trim().replace(/\/$/, "");
    webUrl = webUrlInput.value.trim().replace(/\/$/, "");
    await chrome.storage.sync.set({ apiUrl, webUrl });
    settingsPanel.classList.add("hidden");
    mainPanel.classList.remove("hidden");
  });

  // Verify Current Tab Handler
  verifyTabBtn.addEventListener("click", async () => {
    if (!activeTab || !activeTab.url) {
      showError("No active page URL found.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/analyze-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: activeTab.url,
          headline: activeTab.title || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const result = await response.json();
      displayResult(result);
    } catch (err) {
      showError(err.message || "Failed to analyze URL.");
    } finally {
      setLoading(false);
    }
  });

  // Verify Manual Text Handler
  verifyTextBtn.addEventListener("click", async () => {
    const headline = headlineInput.value.trim();
    const content = contentInput.value.trim();

    if (!headline && !content) {
      showError("Please enter a headline or article text to verify.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: headline || content.slice(0, 60),
          content: content || headline
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const result = await response.json();
      displayResult(result);
    } catch (err) {
      showError(err.message || "Failed to verify text.");
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    errorAlert.classList.add("hidden");
    if (isLoading) {
      loadingSpinner.classList.remove("hidden");
      resultCard.classList.add("hidden");
    } else {
      loadingSpinner.classList.add("hidden");
    }
  }

  function showError(msg) {
    errorAlert.textContent = msg;
    errorAlert.classList.remove("hidden");
    resultCard.classList.add("hidden");
  }

  function displayResult(data) {
    resultCard.classList.remove("hidden");

    const prediction = data.prediction || "UNCERTAIN";
    const confidence = Math.round((data.confidence || 0.5) * 100);

    // Badge styling
    resultBadge.className = "badge";
    if (prediction === "LIKELY_REAL") {
      resultBadge.textContent = "Likely Real";
      resultBadge.classList.add("badge-real");
      meterFill.style.backgroundColor = "var(--real-color)";
    } else if (prediction === "LIKELY_FAKE") {
      resultBadge.textContent = "Likely Fake";
      resultBadge.classList.add("badge-fake");
      meterFill.style.backgroundColor = "var(--fake-color)";
    } else {
      resultBadge.textContent = "Uncertain";
      resultBadge.classList.add("badge-uncertain");
      meterFill.style.backgroundColor = "var(--uncertain-color)";
    }

    confidenceVal.textContent = `${confidence}%`;
    meterFill.style.width = `${confidence}%`;

    // Narrative
    resultNarrative.textContent = data.narrative || "Assessment generated using multi-layer NLP model.";

    // Claims preview
    if (data.claims && data.claims.length > 0) {
      topClaimText.textContent = `"${data.claims[0].text}"`;
      document.getElementById("evidence-preview").classList.remove("hidden");
    } else {
      document.getElementById("evidence-preview").classList.add("hidden");
    }

    // Link to full web dossier
    if (data.id) {
      viewFullDossierBtn.href = `${webUrl}/results/${data.id}`;
      viewFullDossierBtn.classList.remove("hidden");
    } else {
      viewFullDossierBtn.classList.add("hidden");
    }
  }
});
