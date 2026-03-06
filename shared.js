/* ═══════════════════════════════════════════════
   PERFECT STICKY — SHARED UTILITIES
   Used by: side_panel.js, reminder.js
   ═══════════════════════════════════════════════ */

"use strict";

const STORAGE_KEY = "stickyNotes_v1";
const THEME_KEY = "stickyNotes_theme";
const FEATURE_KEY = "pp_activeFeature";
const REMINDER_KEY = "pp_reminder";
const LOCALE_KEY = "pp_locale";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const debounce = (fn, ms) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

const escapeHtml = (str) =>
  String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const stripHtml = (html) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
};

const formatDate = (ts) => {
  const d = new Date(ts);
  const today = new Date();
  const locale = _locale === "vi" ? "vi-VN" : "en-US";
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
};

let _locale = "vi";

const LOCALES = {
  vi: {
    "app.title": "Perfect Ping",
    "lang.toggle": "EN",
    "feat.notes": "Ghi Chú",
    "feat.move": "Di Chuyển",
    "btn.new": "Mới",
    "btn.theme": "Chuyển giao diện",
    "search.placeholder": "Tìm ghi chú…",
    "search.clear": "Xóa tìm kiếm",
    "tab.all": "Tất Cả",
    "tab.page": "Trang Này",
    "tab.favorites": "Yêu Thích",
    "tab.archive": "Lưu Trữ",
    "editor.title_ph": "Tiêu đề (tùy chọn)",
    "editor.content_ph": "Viết ghi chú của bạn…",
    "editor.save": "Lưu",
    "editor.close": "Đóng trình soạn thảo",
    "editor.delete": "Xóa ghi chú",
    "editor.archive": "Lưu trữ ghi chú",
    "editor.unarchive": "Bỏ lưu trữ",
    "editor.favorite": "Đánh dấu yêu thích",
    "editor.unfavorite": "Bỏ yêu thích",
    "empty.all.title": "Chưa có ghi chú",
    "empty.all.sub": "Nhấn <strong>Mới</strong> để tạo ghi chú đầu tiên",
    "empty.page.title": "Chưa có ghi chú cho trang này",
    "empty.page.sub": "Ghi chú gắn với trang này sẽ xuất hiện ở đây",
    "empty.fav.title": "Chưa có ghi chú yêu thích",
    "empty.fav.sub": "Đánh dấu ⭐ ghi chú để thêm vào Yêu Thích",
    "empty.arc.title": "Kho lưu trữ trống",
    "empty.arc.sub": "Ghi chú đã lưu trữ sẽ xuất hiện ở đây",
    "empty.search.title": "Không tìm thấy kết quả",
    "empty.search.sub": "Không có ghi chú nào khớp với",
    "toast.saved": "Đã lưu ghi chú ✓",
    "toast.updated": "Đã cập nhật ghi chú",
    "toast.deleted": "Đã xóa ghi chú",
    "toast.archived": "Đã lưu trữ ghi chú",
    "toast.unarchived": "Đã bỏ lưu trữ",
    "toast.write_first": "Hãy viết gì đó trước!",
    "toast.timer_reset": "Làm tốt lắm! Đặt lại bộ đếm 💪",
    "toast.skipped": "Đã bỏ qua — đặt lại bộ đếm",
    "toast.snoozed": "Đã tạm hoãn {n} phút",
    "move.title": "Nhắc Nhở Đứng Dậy",
    "move.sub": "Nhận nhắc nhở đứng dậy mỗi {n} phút.<br>Không hoạt động ≥ {idle} phút sẽ đặt lại bộ đếm.",
    "move.start": "Bắt Đầu",
    "move.stop": "Dừng Nhắc Nhở",
    "timer.almost_stand": "Gần đến giờ đứng dậy! 🚀",
    "timer.almost_there": "Gần xong rồi, cố lên!",
    "timer.stay_focused": "Tập trung thôi — sắp đến giờ nghỉ",
    "break.title": "Đến Lúc Đứng Dậy Rồi!",
    "break.sub": "Bạn đã ngồi <strong>{n} phút</strong> rồi.<br>Hãy vươn vai một chút nào!",
    "break.done": "Xong rồi",
    "break.snooze": "Hoãn {n}p",
    "break.skip": "Bỏ Qua",
    "break.stat": "Hôm nay: <strong>{n}</strong> lần đứng",
    "snoozed.label": "Đã Hoãn",
    "snoozed.sub": "Nhắc lại sau {n} phút",
    "stats.stands": "<strong>{n}</strong> lần đứng hôm nay",
    "stats.streak": "<strong>{n}</strong> ngày liên tiếp",
    "settings.label": "Cài Đặt",
    "settings.interval": "Khoảng thời gian",
    "settings.idle": "Nghỉ tự động",
    "settings.snooze": "Tạm hoãn",
    "settings.min": "{n} phút",
    "welcome_back": "Nghỉ ngơi tốt rồi! 💪 Đếm lại từ đầu nhé.",
    "welcome_back.absorbed": "Nghỉ ngơi tốt rồi! 💪 Đã ghi nhận 1 lần đứng.",
    "note.untitled": "Chưa có tiêu đề",
    "note.just_now": "Vừa xong",
    "note.fav_add": "Thêm vào yêu thích",
    "note.fav_remove": "Bỏ yêu thích",
    "note.archived": "đã lưu trữ",
  },
  en: {
    "app.title": "Perfect Ping",
    "lang.toggle": "VI",
    "feat.notes": "Notes",
    "feat.move": "Move",
    "btn.new": "New",
    "btn.theme": "Toggle theme",
    "search.placeholder": "Search notes…",
    "search.clear": "Clear search",
    "tab.all": "All",
    "tab.page": "This Page",
    "tab.favorites": "Favorites",
    "tab.archive": "Archive",
    "editor.title_ph": "Title (optional)",
    "editor.content_ph": "Write your note here…",
    "editor.save": "Save",
    "editor.close": "Close editor",
    "editor.delete": "Delete note",
    "editor.archive": "Archive note",
    "editor.unarchive": "Unarchive note",
    "editor.favorite": "Add to favorites",
    "editor.unfavorite": "Remove from favorites",
    "empty.all.title": "No notes yet",
    "empty.all.sub": "Click <strong>New</strong> to create your first sticky note",
    "empty.page.title": "No notes for this page",
    "empty.page.sub": "Notes tagged to this URL will appear here",
    "empty.fav.title": "No favorites yet",
    "empty.fav.sub": "Star a note to add it to Favorites",
    "empty.arc.title": "Archive is empty",
    "empty.arc.sub": "Archived notes will appear here",
    "empty.search.title": "No results found",
    "empty.search.sub": "No notes match",
    "toast.saved": "Note saved ✓",
    "toast.updated": "Note updated",
    "toast.deleted": "Note deleted",
    "toast.archived": "Note archived",
    "toast.unarchived": "Note unarchived",
    "toast.write_first": "Write something first!",
    "toast.timer_reset": "Great job! Timer reset 💪",
    "toast.skipped": "Skipped — timer reset",
    "toast.snoozed": "Snoozed for {n} min",
    "move.title": "Stand Reminder",
    "move.sub": "Get nudged to stand up every {n} minutes.<br>Idle ≥ {idle} min auto-resets the timer.",
    "move.start": "Start Reminder",
    "move.stop": "Stop Reminder",
    "timer.almost_stand": "Almost time to stand! 🚀",
    "timer.almost_there": "Almost there, keep going!",
    "timer.stay_focused": "Stay focused — break coming",
    "break.title": "Time to Stand Up!",
    "break.sub": "You've been sitting for <strong>{n} minutes</strong>.<br>Take a quick stretch break!",
    "break.done": "Done",
    "break.snooze": "Snooze {n}m",
    "break.skip": "Skip",
    "break.stat": "Today: <strong>{n}</strong> stands completed",
    "snoozed.label": "Snoozed",
    "snoozed.sub": "Reminder will repeat in {n} min",
    "stats.stands": "<strong>{n}</strong> stand{s} today",
    "stats.streak": "<strong>{n}</strong> day streak",
    "settings.label": "Settings",
    "settings.interval": "Work interval",
    "settings.idle": "Idle reset",
    "settings.snooze": "Snooze",
    "settings.min": "{n} min",
    "welcome_back": "Good break! 💪 Fresh cycle started.",
    "welcome_back.absorbed": "Good break! 💪 1 stand recorded.",
    "note.untitled": "Untitled",
    "note.just_now": "Just now",
    "note.fav_add": "Add to favorites",
    "note.fav_remove": "Remove from favorites",
    "note.archived": "archived",
  },
};

function t(key, vars = {}) {
  const dict = LOCALES[_locale] || LOCALES["vi"];
  let str = dict[key] ?? LOCALES["vi"][key] ?? key;
  str = str.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : "");
  if (_locale === "en" && vars.n !== undefined) {
    str = str.replace(/\{s\}/g, vars.n !== 1 ? "s" : "");
  } else { str = str.replace(/\{s\}/g, ""); }
  return str;
}

function applyI18n() {
  $$("[data-i18n]").forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach((el) => {
    const val = t(el.dataset.i18nPh);
    el.setAttribute("placeholder", val);
    if (el.hasAttribute("data-placeholder")) el.setAttribute("data-placeholder", val);
  });
  $$("[data-i18n-label]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nLabel)); });
  $$("[data-i18n-title]").forEach((el) => { el.setAttribute("title", t(el.dataset.i18nTitle)); });
  const langBtn = $("#btn-lang");
  if (langBtn) langBtn.textContent = t("lang.toggle");
  document.documentElement.lang = _locale;
}

async function loadLocale() {
  const data = await storageGet(LOCALE_KEY);
  _locale = data[LOCALE_KEY] || "vi";
  applyI18n();
}

function setLocale(lang) {
  _locale = lang;
  storageSet({ [LOCALE_KEY]: lang });
  applyI18n();
  if (typeof window.initReminderView === "function") {
    const section = $("#reminder-section");
    if (section && !section.hidden) window.initReminderView();
  }
  if (typeof window.renderNotesForLocale === "function") window.renderNotesForLocale();
}

function toggleLocale() { setLocale(_locale === "vi" ? "en" : "vi"); }

function storageGet(keys) {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(keys, resolve);
    } else {
      const result = {};
      const list = Array.isArray(keys) ? keys : [keys];
      list.forEach((k) => {
        const raw = localStorage.getItem(k);
        try { result[k] = raw ? JSON.parse(raw) : undefined; } catch { result[k] = raw; }
      });
      resolve(result);
    }
  });
}

function storageSet(data) {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set(data, resolve);
    } else {
      Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
      resolve();
    }
  });
}

async function loadNotes() {
  const data = await storageGet(STORAGE_KEY);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

async function saveNotes(notes) { await storageSet({ [STORAGE_KEY]: notes }); }

function applyTheme(mode) {
  document.body.classList.toggle("dark", mode === "dark");
  document.body.classList.toggle("light", mode !== "dark");
  const sun = $("#icon-sun"); const moon = $("#icon-moon");
  if (sun) sun.style.display = mode === "dark" ? "none" : "block";
  if (moon) moon.style.display = mode === "dark" ? "block" : "none";
  storageSet({ [THEME_KEY]: mode });
}

async function loadTheme() {
  const data = await storageGet(THEME_KEY);
  const mode = data[THEME_KEY];
  if (mode === "dark" || mode === "light") applyTheme(mode);
}

function toggleTheme() { applyTheme(document.body.classList.contains("dark") ? "light" : "dark"); }

let _toastTimer;
function showToast(msg) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  toast.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => { toast.hidden = true; }, 200);
  }, 2200);
}

async function loadActiveFeature() {
  const data = await storageGet(FEATURE_KEY);
  return data[FEATURE_KEY] || "notes";
}

function setActiveFeature(feature) {
  storageSet({ [FEATURE_KEY]: feature });
  $$(".feat-btn").forEach((btn) => {
    const isActive = btn.dataset.feature === feature;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
  const notesSection = $("#notes-section");
  const reminderSection = $("#reminder-section");
  if (notesSection) notesSection.hidden = feature !== "notes";
  if (reminderSection) reminderSection.hidden = feature !== "move";
  if (feature === "move" && typeof window.initReminderView === "function") window.initReminderView();
}
