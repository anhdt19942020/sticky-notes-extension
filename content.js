/* ═══════════════════════════════════════════════
   PERFECT PING — CONTENT SCRIPT
   Injects a small floating badge on the active tab
   when a stand reminder is due (break_due/snoozed).
   ═══════════════════════════════════════════════ */

"use strict";

const BADGE_ID = "pp-break-badge";

function createBadge() {
  if (document.getElementById(BADGE_ID)) return;

  const badge = document.createElement("div");
  badge.id = BADGE_ID;
  badge.setAttribute("role", "status");
  badge.setAttribute("aria-label", "Stand reminder");

  /* Inline styles — avoids needing a separate CSS file and
     prevents host-page stylesheets from interfering. */
  Object.assign(badge.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #4f46e5, #0ea5e9)",
    boxShadow: "0 4px 16px rgba(79,70,229,0.45), 0 0 0 0 rgba(79,70,229,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: "2147483647",
    transition: "opacity 0.3s, transform 0.3s",
    opacity: "0",
    transform: "scale(0.6)",
    animation: "pp-pulse 2s infinite",
  });

  badge.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
    <circle cx="12" cy="4" r="2"/>
    <path d="M12 7v5m0 0-3 4m3-4 3 4"/>
    <path d="M9 11h6"/>
  </svg>`;

  // Inject keyframes once
  if (!document.getElementById("pp-badge-styles")) {
    const style = document.createElement("style");
    style.id = "pp-badge-styles";
    style.textContent = `
      @keyframes pp-pulse {
        0% { box-shadow: 0 4px 16px rgba(79,70,229,0.45), 0 0 0 0 rgba(79,70,229,0.4); }
        70% { box-shadow: 0 4px 16px rgba(79,70,229,0.45), 0 0 0 12px rgba(79,70,229,0); }
        100% { box-shadow: 0 4px 16px rgba(79,70,229,0.45), 0 0 0 0 rgba(79,70,229,0); }
      }
    `;
    document.head.appendChild(style);
  }

  // Click opens side panel (by sending message to background)
  badge.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
  });

  document.body.appendChild(badge);

  // Animate in
  requestAnimationFrame(() => {
    badge.style.opacity = "1";
    badge.style.transform = "scale(1)";
  });
}

function removeBadge() {
  const badge = document.getElementById(BADGE_ID);
  if (!badge) return;
  badge.style.opacity = "0";
  badge.style.transform = "scale(0.6)";
  setTimeout(() => badge.remove(), 300);
}

// ── Listen for background messages ────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PP_SHOW_BADGE") createBadge();
  if (msg.type === "PP_HIDE_BADGE") removeBadge();
});
