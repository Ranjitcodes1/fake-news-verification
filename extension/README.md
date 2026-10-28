# Veritas AI News Verifier — Chrome Extension (Manifest V3)

The Veritas browser extension allows users to verify claims and news articles directly from any website or social media feed with a single click.

---

## Features

1. **1-Click Current Page Verification**:
   - Analyzes the article on your active browser tab using the backend's SSRF-safe URL scraper and evidence pipeline.
2. **Intelligent Anti-Bot DOM Extraction Fallback**:
   - If a news portal blocks automated server scraping (e.g. Akamai or Cloudflare 403 on outlets like NDTV), the extension automatically extracts the article directly from the active tab's rendered DOM via `chrome.scripting`, ensuring uninterrupted verification.
3. **Right-Click Context Menu**:
   - Highlight any text or claim on Twitter/X, Reddit, or news sites, right-click, and select `"Verify selection with Veritas"` to open an instant verification dossier.
4. **Quick In-Popup Analysis**:
   - Paste any headline or snippet into the extension popup for instant evaluation.
5. **Configurable Endpoint**:
   - Point to local backend (`http://localhost:8000/api/v1`) or your live cloud deployment (`https://your-domain.onrender.com/api/v1`).

---

## Installation in Chrome / Brave / Edge / Arc

1. Open your browser and navigate to:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
2. Enable **Developer mode** toggle in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left.
4. Select the directory:
   ```
   d:/fake-news-verification/extension
   ```
5. The **Veritas** extension icon will now appear in your browser toolbar!

---

## Usage

1. Ensure the Veritas backend API is running:
   ```powershell
   $env:PYTHONPATH = "backend;."
   .venv\Scripts\uvicorn.exe app.main:app --reload --app-dir backend
   ```
2. Click the Veritas shield icon in your browser toolbar to verify the current web page or analyze copied text.
3. Right-click on any highlighted text on the web and select `"Verify selection with Veritas"`.
