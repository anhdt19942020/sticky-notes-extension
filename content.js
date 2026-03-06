/* ═══════════════════════════════════════════════
   PERFECT PING — CONTENT SCRIPT
   Multi-layer notification on active page:
   ① Tab title flash (locale-aware)
   ② Top banner bar with action buttons (locale-aware)
   ═══════════════════════════════════════════════ */

"use strict";

const PP_BANNER_ID = "pp-break-banner";
const PP_STYLES_ID = "pp-content-styles";
let _originalTitle = null;
let _titleFlashTimer = null;
let _isFlashing = false;

function getLocale() {
  return new Promise((resolve) => {
    chrome.storage.local.get("pp_locale", (data) => {
      resolve(data["pp_locale"] || "vi");
    });
  });
}

function injectStyles() {
  if (document.getElementById(PP_STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = PP_STYLES_ID;
  style.textContent = `
    @keyframes pp-slide-in {
      from { transform: translateY(-100%); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }
    @keyframes pp-slide-out {
      from { transform: translateY(0); opacity: 1; }
      to   { transform: translateY(-100%); opacity: 0; }
    }
    @keyframes pp-pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    #${PP_BANNER_ID} {
      position: fixed; top: 0; left: 0; right: 0;
      z-index: 2147483647;
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 10px 16px;
      background: linear-gradient(135deg, #312e81 0%, #1e3a5f 50%, #0c4a6e 100%);
      box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset;
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      animation: pp-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    #${PP_BANNER_ID}.pp-hiding { animation: pp-slide-out 0.35s ease-in forwards; }
    #${PP_BANNER_ID} .pp-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;
      animation: pp-pulse-dot 1.2s ease-in-out infinite; flex-shrink: 0;
    }
    #${PP_BANNER_ID} .pp-icon { flex-shrink: 0; }
    #${PP_BANNER_ID} .pp-text {
      color: #f1f5f9; font-size: 13px; font-weight: 500;
      letter-spacing: -0.2px; white-space: nowrap;
    }
    #${PP_BANNER_ID} .pp-actions { display: flex; gap: 8px; margin-left: 8px; }
    #${PP_BANNER_ID} .pp-btn {
      border: none; border-radius: 6px; padding: 5px 14px;
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all 0.15s ease; font-family: inherit; white-space: nowrap;
    }
    #${PP_BANNER_ID} .pp-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }
    #${PP_BANNER_ID} .pp-btn:active { transform: translateY(0); }
    #${PP_BANNER_ID} .pp-btn-done {
      background: linear-gradient(135deg, #16a34a, #15803d); color: white;
      box-shadow: 0 2px 8px rgba(22,163,74,0.35);
    }
    #${PP_BANNER_ID} .pp-btn-snooze {
      background: rgba(255,255,255,0.1); color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.15);
    }
    #${PP_BANNER_ID} .pp-btn-snooze:hover { background: rgba(255,255,255,0.18); }
  `;
  document.head.appendChild(style);
}

async function startTitleFlash() {
  if (_isFlashing) return;
  _isFlashing = true;
  _originalTitle = document.title;
  const locale = await getLocale();
  const flashText = locale === "vi" ? "🔔 Đứng dậy!" : "🔔 Stand up!";
  let toggle = false;
  _titleFlashTimer = setInterval(() => {
    document.title = toggle ? _originalTitle : flashText;
    toggle = !toggle;
  }, 1500);
}

function stopTitleFlash() {
  if (!_isFlashing) return;
  _isFlashing = false;
  clearInterval(_titleFlashTimer);
  _titleFlashTimer = null;
  if (_originalTitle !== null) { document.title = _originalTitle; _originalTitle = null; }
}

async function showBanner() {
  if (document.getElementById(PP_BANNER_ID)) return;
  injectStyles();
  const locale = await getLocale();
  const isVi = locale === "vi";
  const banner = document.createElement("div");
  banner.id = PP_BANNER_ID;
  banner.setAttribute("role", "alert");
  banner.innerHTML = `
    <span class="pp-dot"></span>
    <svg class="pp-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="4" r="2"/><path d="M12 7v5m0 0-3 4m3-4 3 4"/><path d="M9 11h6"/>
    </svg>
    <span class="pp-text">${isVi ? "Đến lúc đứng dậy rồi!" : "Time to stand up!"}</span>
    <div class="pp-actions">
      <button class="pp-btn pp-btn-done" data-action="done">${isVi ? "✓ Xong" : "✓ Done"}</button>
      <button class="pp-btn pp-btn-snooze" data-action="snooze">${isVi ? "⏸ Hoãn" : "⏸ Snooze"}</button>
    </div>
  `;
  banner.querySelectorAll(".pp-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: "REMINDER_ACTION", action: btn.dataset.action });
      hideBanner();
      stopTitleFlash();
    });
  });
  document.body.appendChild(banner);
}

function hideBanner() {
  const banner = document.getElementById(PP_BANNER_ID);
  if (!banner) return;
  banner.classList.add("pp-hiding");
  setTimeout(() => banner.remove(), 350);
}

function showBreakAlert() { startTitleFlash(); showBanner(); }
function hideBreakAlert() { stopTitleFlash(); hideBanner(); }

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PP_SHOW_BADGE") showBreakAlert();
  if (msg.type === "PP_HIDE_BADGE") hideBreakAlert();
});
