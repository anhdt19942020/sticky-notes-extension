/* ═══════════════════════════════════════════════
   PERFECT STICKY — BACKGROUND SERVICE WORKER
   Handles: sidePanel, Stand Reminder state machine
   ═══════════════════════════════════════════════ */

"use strict";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await chrome.sidePanel.setOptions({ tabId, path: "side_panel.html", enabled: true });
  // Re-broadcast break badge to newly focused tab
  await loadReminder();
  if (_reminder.state === "break_due") {
    chrome.tabs.sendMessage(tabId, { type: "PP_SHOW_BADGE" }).catch(() => {});
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status === "complete") {
    await chrome.sidePanel.setOptions({ tabId, path: "side_panel.html", enabled: true });
  }
});

const REMINDER_KEY = "pp_reminder";
const ALARM_CHECK = "pp_stand_check";
const ALARM_SNOOZE = "pp_snooze_end";
const IDLE_INTERVAL_SEC = 60;

const DEFAULT_REMINDER = {
  enabled: false,
  intervalMinutes: 1,
  idleThresholdMinutes: 1,
  snoozeMinutes: 1,
  state: "idle",
  activeStartTime: null,
  idleStartTime: null,
  stats: { totalStands: 0, todayStands: 0, todayDate: "", streak: 0, lastStandDate: "" },
};

let _reminder = { ...DEFAULT_REMINDER };

async function loadReminder() {
  const data = await chrome.storage.local.get(REMINDER_KEY);
  _reminder = Object.assign({}, DEFAULT_REMINDER, data[REMINDER_KEY] || {});
  _reminder.stats = Object.assign({}, DEFAULT_REMINDER.stats, _reminder.stats || {});
  return _reminder;
}

async function saveReminder() {
  await chrome.storage.local.set({ [REMINDER_KEY]: _reminder });
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function elapsedMs() { return _reminder.activeStartTime ? Date.now() - _reminder.activeStartTime : 0; }
function elapsedMinutes() { return elapsedMs() / 60000; }

function recordStand() {
  const today = todayStr();
  const stats = _reminder.stats;
  stats.totalStands++;
  if (stats.todayDate !== today) { stats.todayStands = 0; stats.todayDate = today; }
  stats.todayStands++;
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  if (stats.lastStandDate === yStr || stats.lastStandDate === today) {
    if (stats.lastStandDate !== today) stats.streak++;
  } else { stats.streak = 1; }
  stats.lastStandDate = today;
}

async function startCheckAlarm() { await chrome.alarms.clear(ALARM_CHECK); chrome.alarms.create(ALARM_CHECK, { periodInMinutes: 1 }); }
async function stopCheckAlarm() { await chrome.alarms.clear(ALARM_CHECK); }
async function startSnoozeAlarm(m) { await chrome.alarms.clear(ALARM_SNOOZE); chrome.alarms.create(ALARM_SNOOZE, { delayInMinutes: m }); }
async function clearAllAlarms() { await chrome.alarms.clear(ALARM_CHECK); await chrome.alarms.clear(ALARM_SNOOZE); }

async function getLocale() {
  const data = await chrome.storage.local.get("pp_locale");
  return data["pp_locale"] || "vi";
}

async function fireBreakNotification() {
  const locale = await getLocale();
  const isVi = locale === "vi";
  chrome.notifications.create("pp_break", {
    type: "basic", iconUrl: "icons/icon-128.png",
    title: isVi ? "Đến lúc đứng dậy! 🧍" : "Time to stand! 🧍",
    message: isVi
      ? `Bạn đã ngồi ${_reminder.intervalMinutes} phút rồi. Vươn vai một chút nhé!`
      : `You've been sitting for ${_reminder.intervalMinutes} min. Quick stretch break!`,
    buttons: [
      { title: isVi ? "✅ Xong rồi!" : "✅ Done — I stood up!" },
      { title: isVi ? `⏸ Hoãn ${_reminder.snoozeMinutes}p` : `⏸ Snooze ${_reminder.snoozeMinutes}m` },
    ],
    requireInteraction: true, priority: 2,
  });
}

function clearNotification() { chrome.notifications.clear("pp_break"); }

function updateBadge() {
  switch (_reminder.state) {
    case "break_due":
      chrome.action.setBadgeText({ text: "🧍" });
      chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
      break;
    case "snoozed":
      chrome.action.setBadgeText({ text: "⏸" });
      chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
      break;
    default:
      chrome.action.setBadgeText({ text: "" });
  }
}

function broadcastState() {
  chrome.runtime.sendMessage({ type: "REMINDER_STATE", payload: _reminder }).catch(() => {});
}

async function broadcastBadge(show) {
  const type = show ? "PP_SHOW_BADGE" : "PP_HIDE_BADGE";
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith("chrome")) {
        chrome.tabs.sendMessage(tab.id, { type }).catch(() => {});
      }
    }
  } catch (_) {}
}

async function transitionTo(newState) {
  _reminder.state = newState;
  switch (newState) {
    case "active":
      _reminder.activeStartTime = Date.now(); _reminder.idleStartTime = null;
      await startCheckAlarm(); clearNotification(); await broadcastBadge(false); break;
    case "break_due":
      await stopCheckAlarm(); await fireBreakNotification(); await broadcastBadge(true); break;
    case "snoozed":
      clearNotification(); await broadcastBadge(false); await startSnoozeAlarm(_reminder.snoozeMinutes); break;
    case "idle":
      _reminder.activeStartTime = null; _reminder.idleStartTime = null;
      await clearAllAlarms(); clearNotification(); await broadcastBadge(false); break;
  }
  updateBadge(); await saveReminder(); broadcastState();
}

async function enableReminder() { if (_reminder.state !== "idle") return; _reminder.enabled = true; await transitionTo("active"); }
async function disableReminder() { _reminder.enabled = false; await transitionTo("idle"); }

chrome.alarms.onAlarm.addListener(async (alarm) => {
  await loadReminder();
  if (alarm.name === ALARM_CHECK && _reminder.state === "active" && elapsedMinutes() >= _reminder.intervalMinutes) await transitionTo("break_due");
  if (alarm.name === ALARM_SNOOZE && _reminder.state === "snoozed") { _reminder.state = "active"; await transitionTo("break_due"); }
});

chrome.idle.setDetectionInterval(IDLE_INTERVAL_SEC);
chrome.idle.onStateChanged.addListener(async (idleState) => {
  await loadReminder();
  if (!_reminder.enabled) return;
  const activeStates = ["active", "break_due", "snoozed"];
  if (idleState === "idle" || idleState === "locked") {
    if (activeStates.includes(_reminder.state) && !_reminder.idleStartTime) {
      _reminder.idleStartTime = Date.now(); await saveReminder();
    }
  } else if (idleState === "active") {
    if (_reminder.state === "idle" && _reminder.enabled) { await transitionTo("active"); return; }
    if (!_reminder.idleStartTime) return;
    const idleMinutes = (Date.now() - _reminder.idleStartTime) / 60000;
    _reminder.idleStartTime = null;
    if (idleMinutes >= _reminder.idleThresholdMinutes) {
      const prevState = _reminder.state;
      if (prevState === "break_due" || prevState === "snoozed") recordStand();
      await transitionTo("idle"); await transitionTo("active");
      chrome.runtime.sendMessage({ type: "WELCOME_BACK", absorbed: prevState === "break_due" || prevState === "snoozed" }).catch(() => {});
    } else if (_reminder.state === "active") {
      _reminder.activeStartTime += idleMinutes * 60000; await saveReminder();
    }
  }
});

chrome.notifications.onButtonClicked.addListener(async (notifId, btnIdx) => {
  if (notifId !== "pp_break") return;
  await loadReminder();
  if (btnIdx === 0) { recordStand(); await transitionTo("active"); broadcastState(); }
  else if (btnIdx === 1) { await transitionTo("snoozed"); }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_SIDE_PANEL") {
    if (sender.tab?.id) chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
    return false;
  }
  if (msg.type !== "REMINDER_ACTION") return false;
  (async () => {
    await loadReminder();
    const { action, value } = msg;
    switch (action) {
      case "get_state": sendResponse({ ok: true, payload: _reminder }); return;
      case "enable": await enableReminder(); break;
      case "disable": await disableReminder(); break;
      case "done":
        if (_reminder.state === "break_due" || _reminder.state === "snoozed") { recordStand(); await transitionTo("active"); } break;
      case "snooze": if (_reminder.state === "break_due") await transitionTo("snoozed"); break;
      case "skip":
        if (_reminder.state === "break_due" || _reminder.state === "snoozed") await transitionTo("active"); break;
      case "check_break":
        if (_reminder.state === "active" && elapsedMinutes() >= _reminder.intervalMinutes) await transitionTo("break_due"); break;
      case "update_settings":
        Object.assign(_reminder, value); await saveReminder();
        if (_reminder.state === "active") await transitionTo("active"); break;
    }
    try { sendResponse({ ok: true, payload: _reminder }); } catch (_) {}
  })();
  return true;
});

(async () => {
  await loadReminder();
  if (_reminder.enabled) {
    if (_reminder.idleStartTime) {
      const idleMinutes = (Date.now() - _reminder.idleStartTime) / 60000;
      if (idleMinutes >= _reminder.idleThresholdMinutes) {
        _reminder.idleStartTime = null; await transitionTo("idle"); await transitionTo("active"); return;
      }
    }
    if (_reminder.state === "active") await startCheckAlarm();
  }
  updateBadge();
})();
