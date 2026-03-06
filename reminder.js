/* ═══════════════════════════════════════════════
   PERFECT MOVE — STAND REMINDER UI (reminder.js)
   Requires: shared.js loaded first
   ═══════════════════════════════════════════════ */

"use strict";

// ── Constants ────────────────────────────────────
const CIRCLE_R = 54; // SVG circle radius
const CIRCLE_CIRCUM = 2 * Math.PI * CIRCLE_R; // ≈ 339.3
const POLL_MS = 1000; // UI refresh interval

// ── State ─────────────────────────────────────────
let _state = null; // reminder payload from background
let _prevState = null; // last rendered state (for change detection)
let _pollTimer = null;
let _isVisible = false;

// ── Send action to background ─────────────────────
function sendAction(action, value) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "REMINDER_ACTION", action, value },
      (resp) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        if (resp?.ok) {
          _state = resp.payload;
        }
        resolve(resp);
      },
    );
  });
}

// ── Format seconds as MM:SS ───────────────────────
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Elapsed + remaining ───────────────────────────
function getElapsedSec(state) {
  if (!state.activeStartTime) return 0;
  return Math.min(
    (Date.now() - state.activeStartTime) / 1000,
    state.intervalMinutes * 60,
  );
}

function getRemainingSec(state) {
  const total = state.intervalMinutes * 60;
  return Math.max(0, total - getElapsedSec(state));
}

// ── SVG circle helpers ────────────────────────────
function buildTimerSvg(progressFrac, remainSec, totalSec, cssClass) {
  const offset = CIRCLE_CIRCUM * (1 - progressFrac);
  const displayTime = fmtTime(remainSec);
  const displayTotal = fmtTime(totalSec);

  return `
    <svg class="timer-svg" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="timer-track" cx="60" cy="60" r="${CIRCLE_R}"
        fill="none" stroke-width="8"/>
      <circle class="timer-ring ${cssClass}" cx="60" cy="60" r="${CIRCLE_R}"
        fill="none" stroke-width="8"
        stroke-dasharray="${CIRCLE_CIRCUM}"
        stroke-dashoffset="${offset.toFixed(2)}"
        stroke-linecap="round"
        transform="rotate(-90 60 60)"/>
    </svg>
    <div class="timer-text">
      <span class="timer-current">${displayTime}</span>
      <span class="timer-total">/ ${displayTotal}</span>
    </div>
  `;
}

// ── Streak fire icon ──────────────────────────────
const FIRE_SVG = `<svg class="streak-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M12 2C8.5 7 10 10 8 13c-1.5 2-1 4 0 5.5C9 20 10.5 21 12 21s3-.9 4-2.5c1-1.5 1.5-3.5 0-5.5-2-3-.5-6-4-11z"/>
</svg>`;

const PERSON_SVG = `<svg class="stand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
  <circle cx="12" cy="4" r="2"/>
  <path d="M12 7v5m0 0-3 4m3-4 3 4" stroke-linecap="round"/>
  <path d="M9 11h6" stroke-linecap="round"/>
</svg>`;

// ── Settings options (1 = test mode) ─────────────
const INTERVAL_OPTS = [1, 15, 20, 25, 30, 45, 60]; // 🧪 1 min for testing
const IDLE_OPTS = [1, 3, 5, 10]; // 🧪 1 min for testing
const SNOOZE_OPTS = [1, 5, 10, 15]; // 🧪 1 min for testing

function buildSelect(opts, current, key) {
  return `<select class="reminder-select" data-key="${key}" aria-label="${key}">
    ${opts.map((v) => `<option value="${v}" ${v === current ? "selected" : ""}>${t("settings.min", { n: v })}</option>`).join("")}
  </select>`;
}

// ── Render: Idle / Disabled ───────────────────────
function renderIdle(container) {
  container.innerHTML = `
    <div class="reminder-card reminder-idle">
      <div class="reminder-illus idle-illus" aria-hidden="true">
        <svg viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="16" r="8" fill="currentColor" opacity=".3"/>
          <rect x="34" y="28" width="12" height="26" rx="6" fill="currentColor" opacity=".25"/>
          <rect x="18" y="34" width="12" height="8" rx="4" fill="currentColor" opacity=".2"/>
          <rect x="50" y="34" width="12" height="8" rx="4" fill="currentColor" opacity=".2"/>
          <rect x="30" y="56" width="8" height="18" rx="4" fill="currentColor" opacity=".2"/>
          <rect x="42" y="56" width="8" height="18" rx="4" fill="currentColor" opacity=".2"/>
        </svg>
      </div>
      <h2 class="reminder-heading">${t("move.title")}</h2>
      <p class="reminder-sub">${t("move.sub", { n: _state?.intervalMinutes ?? 30, idle: _state?.idleThresholdMinutes ?? 5 })}</p>

      <button id="btn-enable-reminder" class="btn-primary reminder-enable-btn" aria-label="${t("move.start")}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        ${t("move.start")}
      </button>

      <div class="reminder-settings">
        <h3 class="settings-label">${t("settings.label")}</h3>
        <div class="settings-row">
          <span>${t("settings.interval")}</span>
          ${buildSelect(INTERVAL_OPTS, _state?.intervalMinutes ?? 30, "intervalMinutes")}
        </div>
        <div class="settings-row">
          <span>${t("settings.idle")}</span>
          ${buildSelect(IDLE_OPTS, _state?.idleThresholdMinutes ?? 5, "idleThresholdMinutes")}
        </div>
        <div class="settings-row">
          <span>${t("settings.snooze")}</span>
          ${buildSelect(SNOOZE_OPTS, _state?.snoozeMinutes ?? 10, "snoozeMinutes")}
        </div>
      </div>
    </div>
  `;

  container
    .querySelector("#btn-enable-reminder")
    ?.addEventListener("click", async () => {
      await sendAction("enable");
      renderReminderView();
    });

  container.querySelectorAll(".reminder-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await sendAction("update_settings", {
        [sel.dataset.key]: Number(sel.value),
      });
    });
  });
}

// ── Render: Active (timer dashboard) ─────────────
function renderActive(container) {
  if (!_state) return;

  const totalSec = _state.intervalMinutes * 60;
  const elapsedSec = getElapsedSec(_state);
  const remainSec = getRemainingSec(_state);
  const progress = Math.min(elapsedSec / totalSec, 1);
  const todayStands = _state.stats?.todayStands ?? 0;
  const streak = _state.stats?.streak ?? 0;

  container.innerHTML = `
    <div class="reminder-card reminder-active">
      <div class="timer-wrap">
        ${buildTimerSvg(progress, remainSec, totalSec, "ring-green")}
      </div>
      <p class="timer-label">${
        remainSec <= 60
          ? t("timer.almost_stand")
          : remainSec <= 300
            ? t("timer.almost_there")
            : t("timer.stay_focused")
      }</p>

      <div class="reminder-stats">
        <div class="stat-chip">
          ${PERSON_SVG}
          <span>${t("stats.stands", { n: todayStands, s: todayStands !== 1 ? "s" : "" })}</span>
        </div>
        ${
          streak > 0
            ? `<div class="stat-chip stat-streak">
          ${FIRE_SVG}
          <span>${t("stats.streak", { n: streak })}</span>
        </div>`
            : ""
        }
      </div>

      <div class="reminder-settings settings-compact">
        <details>
          <summary class="settings-label settings-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            ${t("settings.label")}
          </summary>
          <div class="settings-rows">
            <div class="settings-row">
              <span>${t("settings.interval")}</span>
              ${buildSelect(INTERVAL_OPTS, _state.intervalMinutes, "intervalMinutes")}
            </div>
            <div class="settings-row">
              <span>${t("settings.idle")}</span>
              ${buildSelect(IDLE_OPTS, _state.idleThresholdMinutes, "idleThresholdMinutes")}
            </div>
            <div class="settings-row">
              <span>${t("settings.snooze")}</span>
              ${buildSelect(SNOOZE_OPTS, _state.snoozeMinutes, "snoozeMinutes")}
            </div>
          </div>
        </details>
      </div>

      <button id="btn-disable-reminder" class="btn-ghost-sm" aria-label="${t("move.stop")}">
        ${t("move.stop")}
      </button>
    </div>
  `;

  container.querySelectorAll(".reminder-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await sendAction("update_settings", {
        [sel.dataset.key]: Number(sel.value),
      });
    });
  });

  container
    .querySelector("#btn-disable-reminder")
    ?.addEventListener("click", async () => {
      await sendAction("disable");
      renderReminderView();
    });
}

// ── Render: Break Due ─────────────────────────────
function renderBreakDue(container) {
  const todayStands = (_state?.stats?.todayStands ?? 0) + 1; // +1 for "about to"

  container.innerHTML = `
    <div class="reminder-card reminder-break">
      <div class="break-glow" aria-hidden="true"></div>
      <div class="reminder-illus stand-illus" aria-hidden="true">
        <svg viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="10" r="7" fill="#f59e0b" opacity=".9"/>
          <rect x="36" y="20" width="8" height="22" rx="4" fill="#f59e0b" opacity=".7"/>
          <rect x="20" y="28" width="16" height="6" rx="3" fill="#f59e0b" opacity=".5"/>
          <rect x="44" y="28" width="16" height="6" rx="3" fill="#f59e0b" opacity=".5"/>
          <rect x="34" y="44" width="6" height="20" rx="3" fill="#f59e0b" opacity=".6"/>
          <rect x="42" y="44" width="6" height="20" rx="3" fill="#f59e0b" opacity=".6"/>
        </svg>
      </div>

      <h2 class="reminder-heading break-heading">${t("break.title")}</h2>
      <p class="reminder-sub">${t("break.sub", { n: _state?.intervalMinutes ?? 30 })}</p>

      <div class="break-actions">
        <button id="btn-move-done" class="break-btn btn-done" aria-label="${t("break.done")}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          ${t("break.done")}
        </button>
        <button id="btn-move-snooze" class="break-btn btn-snooze" aria-label="${t("break.snooze", { n: _state?.snoozeMinutes ?? 10 })}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
          ${t("break.snooze", { n: _state?.snoozeMinutes ?? 10 })}
        </button>
        <button id="btn-move-skip" class="break-btn btn-skip" aria-label="${t("break.skip")}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14">
            <polyline points="5 4 15 12 5 20"/>
            <line x1="19" y1="5" x2="19" y2="19"/>
          </svg>
          ${t("break.skip")}
        </button>
      </div>

      <p class="break-stat">${t("break.stat", { n: _state?.stats?.todayStands ?? 0 })}</p>
    </div>
  `;

  container
    .querySelector("#btn-move-done")
    ?.addEventListener("click", async () => {
      await sendAction("done");
      showToast("Great job! Timer reset 💪");
      renderReminderView();
    });
  container
    .querySelector("#btn-move-snooze")
    ?.addEventListener("click", async () => {
      await sendAction("snooze");
      showToast(`Snoozed for ${_state?.snoozeMinutes ?? 10} min`);
      renderReminderView();
    });
  container
    .querySelector("#btn-move-skip")
    ?.addEventListener("click", async () => {
      await sendAction("skip");
      showToast("Skipped — timer reset");
      renderReminderView();
    });
}

// ── Render: Snoozed ───────────────────────────────
function renderSnoozed(container) {
  container.innerHTML = `
    <div class="reminder-card reminder-snoozed">
      <div class="timer-wrap">
        <svg class="timer-svg" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="timer-track" cx="60" cy="60" r="${CIRCLE_R}" fill="none" stroke-width="8"/>
          <circle class="timer-ring ring-amber" cx="60" cy="60" r="${CIRCLE_R}"
            fill="none" stroke-width="8"
            stroke-dasharray="${CIRCLE_CIRCUM}"
            stroke-dashoffset="${(CIRCLE_CIRCUM * 0.5).toFixed(2)}"
            stroke-linecap="round"
            transform="rotate(-90 60 60)"/>
        </svg>
        <div class="timer-text">
          <span class="timer-current snoozed-label">${t("snoozed.label")}</span>
          <span class="timer-total">${t("settings.min", { n: _state?.snoozeMinutes ?? 10 })}</span>
        </div>
      </div>
      <p class="timer-label">${t("snoozed.sub", { n: _state?.snoozeMinutes ?? 10 })}</p>

      <div class="break-actions">
        <button id="btn-snoozed-done" class="break-btn btn-done" aria-label="${t("break.done")}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="16" height="16">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          ${t("break.done")}
        </button>
        <button id="btn-snoozed-skip" class="break-btn btn-skip" aria-label="${t("break.skip")}">
          ${t("break.skip")}
        </button>
      </div>
    </div>
  `;

  container
    .querySelector("#btn-snoozed-done")
    ?.addEventListener("click", async () => {
      await sendAction("done");
      showToast(t("toast.timer_reset"));
      renderReminderView();
    });
  container
    .querySelector("#btn-snoozed-skip")
    ?.addEventListener("click", async () => {
      await sendAction("skip");
      showToast(t("toast.skipped"));
      renderReminderView();
    });
}

// ── Main Render ───────────────────────────────────
async function renderReminderView() {
  const container = $("#reminder-section");
  if (!container || container.hidden) return;

  // Fetch latest state from background
  const resp = await sendAction("get_state");
  if (resp?.ok) _state = resp.payload;

  const view =
    !_state || !_state.enabled || _state.state === "idle"
      ? "idle"
      : _state.state === "break_due"
        ? "break_due"
        : _state.state === "snoozed"
          ? "snoozed"
          : "active";

  // Track rendered state so poll loop won't re-render unnecessarily
  _prevState = _state?.state ?? "idle";

  if (view === "idle") renderIdle(container);
  else if (view === "break_due") renderBreakDue(container);
  else if (view === "snoozed") renderSnoozed(container);
  else renderActive(container);
}

// ── Live polling (1s tick while visible) ─────────
function startPoll() {
  if (_pollTimer) return;
  _pollTimer = setInterval(async () => {
    const section = $("#reminder-section");
    if (!section || section.hidden) return;

    const resp = await sendAction("get_state");
    if (!resp?.ok) return;

    const incoming = resp.payload;
    const stateChanged = incoming.state !== _prevState;

    _state = incoming;

    if (incoming.state === "active") {
      if (stateChanged) {
        // Transitioned INTO active → full re-render once to build the timer DOM
        _prevState = incoming.state;
        renderReminderView();
      } else {
        // Already active → lightweight tick only, no DOM re-render
        updateTimerDisplay();
      }
    } else if (stateChanged) {
      // State changed (e.g. active → break_due) → re-render
      _prevState = incoming.state;
      renderReminderView();
    }
    // Same non-active state → do nothing (idle/break_due/snoozed UIs are static)
  }, POLL_MS);
}

// ── Lightweight timer-only update ─────────────────
let _breakCheckSent = false; // prevent duplicate check_break messages

function updateTimerDisplay() {
  if (!_state) return;
  const totalSec = _state.intervalMinutes * 60;
  const elapsedSec = getElapsedSec(_state);
  const remainSec = getRemainingSec(_state);
  const progress = Math.min(elapsedSec / totalSec, 1);
  const offset = CIRCLE_CIRCUM * (1 - progress);

  const ring = $(".timer-ring");
  const current = $(".timer-current");
  const label = $(".timer-label");

  if (ring) ring.setAttribute("stroke-dashoffset", offset.toFixed(2));
  if (current) current.textContent = fmtTime(remainSec);
  if (label)
    label.textContent =
      remainSec <= 60
        ? t("timer.almost_stand")
        : remainSec <= 300
          ? t("timer.almost_there")
          : t("timer.stay_focused");

  // Proactive break trigger — don't wait for imprecise chrome.alarms
  if (remainSec <= 0 && !_breakCheckSent) {
    _breakCheckSent = true;
    sendAction("check_break");
  } else if (remainSec > 0) {
    _breakCheckSent = false;
  }
}

// ── Background push listener ──────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "REMINDER_STATE") return;
  const section = $("#reminder-section");
  if (!section || section.hidden) return;

  const incoming = msg.payload;
  const stateChanged = incoming.state !== _prevState;
  _state = incoming;

  // Only re-render on actual state transitions pushed from background
  if (stateChanged) {
    _prevState = incoming.state;
    renderReminderView();
  }
});

// ── Public init (called by feature router) ────────
window.initReminderView = async function () {
  await renderReminderView();
  startPoll();
};
