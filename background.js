/* ═══════════════════════════════════════════════
   PERFECT STICKY — BACKGROUND SERVICE WORKER
   Handles: sidePanel, Stand Reminder state machine
   ═══════════════════════════════════════════════ */

"use strict";

// ── Side Panel Setup ──────────────────────────────
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await chrome.sidePanel.setOptions({
    tabId,
    path: "side_panel.html",
    enabled: true,
  });
});

chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status === "complete") {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "side_panel.html",
      enabled: true,
    });
  }
});

// ── Constants ────────────────────────────────────
const REMINDER_KEY = "pp_reminder";
const ALARM_CHECK = "pp_stand_check";
const ALARM_SNOOZE = "pp_snooze_end";
const IDLE_INTERVAL_SEC = 60; // chrome.idle detection granularity

// ── Default Reminder State ────────────────────────
const DEFAULT_REMINDER = {
  enabled: false,
  intervalMinutes: 1, // 🧪 TEST: change back to 30 for production
  idleThresholdMinutes: 1, // 🧪 TEST: change back to 5 for production
  snoozeMinutes: 1, // 🧪 TEST: change back to 10 for production
  state: "idle", // idle | active | break_due | snoozed
  activeStartTime: null, // timestamp when current active session began
  idleStartTime: null, // timestamp when idle started
  stats: {
    totalStands: 0,
    todayStands: 0,
    todayDate: "",
    streak: 0,
    lastStandDate: "",
  },
};

// ── In-memory state (also persisted to storage) ──
let _reminder = { ...DEFAULT_REMINDER };

// ── Storage helpers ───────────────────────────────
async function loadReminder() {
  const data = await chrome.storage.local.get(REMINDER_KEY);
  _reminder = Object.assign({}, DEFAULT_REMINDER, data[REMINDER_KEY] || {});
  _reminder.stats = Object.assign(
    {},
    DEFAULT_REMINDER.stats,
    _reminder.stats || {},
  );
  return _reminder;
}

async function saveReminder() {
  await chrome.storage.local.set({ [REMINDER_KEY]: _reminder });
}

// ── Utility ───────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function elapsedMs() {
  if (!_reminder.activeStartTime) return 0;
  return Date.now() - _reminder.activeStartTime;
}

function elapsedMinutes() {
  return elapsedMs() / 60000;
}

// ── Stats: record a stand ─────────────────────────
function recordStand() {
  const today = todayStr();
  const stats = _reminder.stats;

  stats.totalStands++;

  if (stats.todayDate !== today) {
    stats.todayStands = 0;
    stats.todayDate = today;
  }
  stats.todayStands++;

  // Streak: consecutive days
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  if (stats.lastStandDate === yStr || stats.lastStandDate === today) {
    if (stats.lastStandDate !== today) stats.streak++;
  } else {
    stats.streak = 1;
  }
  stats.lastStandDate = today;
}

// ── Alarm management ─────────────────────────────
async function startCheckAlarm() {
  await chrome.alarms.clear(ALARM_CHECK);
  chrome.alarms.create(ALARM_CHECK, { periodInMinutes: 1 });
}

async function stopCheckAlarm() {
  await chrome.alarms.clear(ALARM_CHECK);
}

async function startSnoozeAlarm(minutes) {
  await chrome.alarms.clear(ALARM_SNOOZE);
  chrome.alarms.create(ALARM_SNOOZE, { delayInMinutes: minutes });
}

async function clearAllAlarms() {
  await chrome.alarms.clear(ALARM_CHECK);
  await chrome.alarms.clear(ALARM_SNOOZE);
}

// ── Notification ──────────────────────────────────
function fireBreakNotification() {
  chrome.notifications.create("pp_break", {
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "Time to Stand Up! 🧍",
    message: `You've been sitting for ${_reminder.intervalMinutes} minutes. Take a break!`,
    buttons: [
      { title: "✅  Done — I stood up!" },
      { title: `⏸  Snooze ${_reminder.snoozeMinutes}m` },
    ],
    requireInteraction: true,
    priority: 2,
  });
}

function clearNotification() {
  chrome.notifications.clear("pp_break");
}

// ── Badge update ──────────────────────────────────
function updateBadge() {
  if (_reminder.state === "break_due" || _reminder.state === "snoozed") {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// ── Broadcast to side panel ───────────────────────
function broadcastState() {
  chrome.runtime
    .sendMessage({ type: "REMINDER_STATE", payload: _reminder })
    .catch(() => {}); // side panel may not be open
}

// ── State Machine Transitions ─────────────────────

async function transitionTo(newState) {
  const prev = _reminder.state;
  _reminder.state = newState;

  switch (newState) {
    case "active":
      _reminder.activeStartTime = Date.now();
      _reminder.idleStartTime = null;
      await startCheckAlarm();
      clearNotification();
      break;

    case "break_due":
      await stopCheckAlarm();
      fireBreakNotification();
      break;

    case "snoozed":
      clearNotification();
      await startSnoozeAlarm(_reminder.snoozeMinutes);
      break;

    case "idle":
      _reminder.activeStartTime = null;
      _reminder.idleStartTime = null;
      await clearAllAlarms();
      clearNotification();
      break;
  }

  updateBadge();
  await saveReminder();
  broadcastState();
}

// ── Reminder enable/disable ───────────────────────
async function enableReminder() {
  if (_reminder.state !== "idle") return;
  _reminder.enabled = true;
  await transitionTo("active");
}

async function disableReminder() {
  _reminder.enabled = false;
  await transitionTo("idle");
}

// ── Alarm handler ─────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  await loadReminder();

  if (alarm.name === ALARM_CHECK && _reminder.state === "active") {
    if (elapsedMinutes() >= _reminder.intervalMinutes) {
      await transitionTo("break_due");
    }
  }

  if (alarm.name === ALARM_SNOOZE && _reminder.state === "snoozed") {
    _reminder.state = "active"; // temp reset so transitionTo fires correctly
    await transitionTo("break_due");
  }
});

// ── Idle state handler ────────────────────────────
chrome.idle.setDetectionInterval(IDLE_INTERVAL_SEC);

chrome.idle.onStateChanged.addListener(async (idleState) => {
  await loadReminder();
  if (!_reminder.enabled) return;

  if (idleState === "idle" || idleState === "locked") {
    if (_reminder.state === "active") {
      _reminder.idleStartTime = Date.now();
      await saveReminder();
    }
  } else if (idleState === "active") {
    if (_reminder.state === "active" && _reminder.idleStartTime) {
      const idleMinutes = (Date.now() - _reminder.idleStartTime) / 60000;
      if (idleMinutes >= _reminder.idleThresholdMinutes) {
        // Long idle → reset timer
        _reminder.idleStartTime = null;
        await transitionTo("active"); // resets activeStartTime
      } else {
        // Short idle → resume, subtract idle time from active
        _reminder.activeStartTime += Date.now() - _reminder.idleStartTime;
        _reminder.idleStartTime = null;
        await saveReminder();
      }
    }
  }
});

// ── Notification button clicks ────────────────────
chrome.notifications.onButtonClicked.addListener(async (notifId, btnIdx) => {
  if (notifId !== "pp_break") return;
  await loadReminder();

  if (btnIdx === 0) {
    // Done
    recordStand();
    await transitionTo("active");
    broadcastState();
  } else if (btnIdx === 1) {
    // Snooze
    await transitionTo("snoozed");
  }
});

// ── Message handler (from side panel) ────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "REMINDER_ACTION") return false;

  (async () => {
    await loadReminder();
    const { action, value } = msg;

    switch (action) {
      case "get_state":
        sendResponse({ ok: true, payload: _reminder });
        return;

      case "enable":
        await enableReminder();
        break;

      case "disable":
        await disableReminder();
        break;

      case "done":
        if (_reminder.state === "break_due" || _reminder.state === "snoozed") {
          recordStand();
          await transitionTo("active");
        }
        break;

      case "snooze":
        if (_reminder.state === "break_due") {
          await transitionTo("snoozed");
        }
        break;

      case "skip":
        if (_reminder.state === "break_due" || _reminder.state === "snoozed") {
          await transitionTo("active");
        }
        break;

      case "update_settings":
        // value: { intervalMinutes?, idleThresholdMinutes?, snoozeMinutes? }
        Object.assign(_reminder, value);
        await saveReminder();
        // Restart timer if active so new interval applies
        if (_reminder.state === "active") {
          await transitionTo("active");
        }
        break;
    }

    sendResponse({ ok: true, payload: _reminder });
  })();

  return true; // keep channel open for async
});

// ── Init: restore state on SW startup ────────────
(async () => {
  await loadReminder();

  // If was active/break_due when SW died → restart alarm
  if (_reminder.enabled && _reminder.state === "active") {
    await startCheckAlarm();
  }
  updateBadge();
})();
