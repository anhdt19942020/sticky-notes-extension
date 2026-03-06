/* ═══════════════════════════════════════════════
   PERFECT STICKY — SHARED UTILITIES
   Used by: side_panel.js, reminder.js
   ═══════════════════════════════════════════════ */

"use strict";

// ── Constants ────────────────────────────────────
const STORAGE_KEY = "stickyNotes_v1";
const THEME_KEY = "stickyNotes_theme";
const FEATURE_KEY = "pp_activeFeature";
const REMINDER_KEY = "pp_reminder";

// ── DOM Helpers ──────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── Utilities ────────────────────────────────────
const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const debounce = (fn, ms) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const stripHtml = (html) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
};

const formatDate = (ts) => {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ── Storage Abstraction ──────────────────────────
function storageGet(keys) {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(keys, resolve);
    } else {
      const result = {};
      const list = Array.isArray(keys) ? keys : [keys];
      list.forEach((k) => {
        const raw = localStorage.getItem(k);
        try {
          result[k] = raw ? JSON.parse(raw) : undefined;
        } catch {
          result[k] = raw;
        }
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
      Object.entries(data).forEach(([k, v]) =>
        localStorage.setItem(k, JSON.stringify(v)),
      );
      resolve();
    }
  });
}

async function loadNotes() {
  const data = await storageGet(STORAGE_KEY);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

async function saveNotes(notes) {
  await storageSet({ [STORAGE_KEY]: notes });
}

// ── Theme ────────────────────────────────────────
function applyTheme(mode) {
  document.body.classList.toggle("dark", mode === "dark");
  document.body.classList.toggle("light", mode !== "dark");

  const sun = $("#icon-sun");
  const moon = $("#icon-moon");
  if (sun) sun.style.display = mode === "dark" ? "none" : "block";
  if (moon) moon.style.display = mode === "dark" ? "block" : "none";

  storageSet({ [THEME_KEY]: mode });
}

async function loadTheme() {
  const data = await storageGet(THEME_KEY);
  const mode = data[THEME_KEY];
  if (mode === "dark" || mode === "light") applyTheme(mode);
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark");
  applyTheme(isDark ? "light" : "dark");
}

// ── Toast ────────────────────────────────────────
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
    setTimeout(() => {
      toast.hidden = true;
    }, 200);
  }, 2200);
}

// ── Feature Router ───────────────────────────────
const FEATURES = ["notes", "move"];

async function loadActiveFeature() {
  const data = await storageGet(FEATURE_KEY);
  return data[FEATURE_KEY] || "notes";
}

function setActiveFeature(feature) {
  storageSet({ [FEATURE_KEY]: feature });

  // Update switcher buttons
  $$(".feat-btn").forEach((btn) => {
    const isActive = btn.dataset.feature === feature;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });

  // Show/hide feature sections
  const notesSection = $("#notes-section");
  const reminderSection = $("#reminder-section");
  if (notesSection) notesSection.hidden = feature !== "notes";
  if (reminderSection) reminderSection.hidden = feature !== "move";

  // Notify feature modules
  if (feature === "move" && typeof window.initReminderView === "function") {
    window.initReminderView();
  }
}
