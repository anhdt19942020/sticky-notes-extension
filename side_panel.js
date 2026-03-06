/* ═══════════════════════════════════════════════
   PERFECT STICKY — NOTES FEATURE (side_panel.js)
   Requires: shared.js loaded first
   ═══════════════════════════════════════════════ */

"use strict";

// ── Note color strip map ──────────────────────────
const COLOR_STRIP_MAP = {
  yellow: "#FDE68A",
  pink: "#FECDD3",
  green: "#BBF7D0",
  blue: "#BFDBFE",
  purple: "#DDD6FE",
  white: "#E2E8F0",
};

// ── Notes state ───────────────────────────────────
let notes = [];
let activeTab = "all";
let searchQuery = "";
let editingNoteId = null;
let currentUrl = "";
let isDirty = false;

// ── Notes DOM refs ────────────────────────────────
const els = {
  container: $("#notes-container"),
  emptyState: $("#empty-state"),
  emptyTitle: $("#empty-title"),
  emptySubtitle: $("#empty-subtitle"),
  searchInput: $("#search-input"),
  clearSearch: $("#btn-clear-search"),
  btnNew: $("#btn-new"),
  fab: $("#fab"),
  tabs: $$(".tab"),
  // Editor
  overlay: $("#editor-overlay"),
  editorStrip: $("#editor-strip"),
  editorTitle: $("#editor-title"),
  editorContent: $("#editor-content"),
  btnClose: $("#btn-close-editor"),
  btnSave: $("#btn-save"),
  btnDelete: $("#btn-delete"),
  btnArchive: $("#btn-archive"),
  btnFavorite: $("#btn-toggle-favorite"),
  starIcon: $("#star-icon"),
  urlTag: $("#url-tag"),
  urlTagText: $("#url-tag-text"),
  colorDots: $$(".color-dot"),
  toolBtns: $$(".tool-btn"),
};

// ── Current URL ───────────────────────────────────
async function getCurrentUrl() {
  if (typeof chrome !== "undefined" && chrome.tabs) {
    return new Promise((res) => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        res(tab?.url || "");
      });
    });
  }
  return window.location.href;
}

function formatUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 30);
  }
}

// ── Render Notes ──────────────────────────────────
function getFilteredNotes() {
  let filtered = [...notes];
  if (activeTab === "page")
    filtered = filtered.filter((n) => !n.archived && n.url === currentUrl);
  else if (activeTab === "favorites")
    filtered = filtered.filter((n) => !n.archived && n.favorite);
  else if (activeTab === "archive")
    filtered = filtered.filter((n) => n.archived);
  else filtered = filtered.filter((n) => !n.archived);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        stripHtml(n.content).toLowerCase().includes(q),
    );
  }
  return filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function renderNotes() {
  const filtered = getFilteredNotes();
  els.container.innerHTML = "";

  if (!filtered.length) {
    els.container.style.display = "none";
    els.emptyState.hidden = false;
    setEmptyText();
    return;
  }

  els.container.style.display = "flex";
  els.emptyState.hidden = true;
  filtered.forEach((note, i) =>
    els.container.appendChild(createNoteCard(note, i)),
  );
}

function setEmptyText() {
  if (searchQuery) {
    els.emptyTitle.textContent = t("empty.search.title");
    els.emptySubtitle.innerHTML = `${t("empty.search.sub")} "<strong>${escapeHtml(searchQuery)}</strong>"`;
    return;
  }
  const keyMap = {
    all: ["empty.all.title", "empty.all.sub"],
    page: ["empty.page.title", "empty.page.sub"],
    favorites: ["empty.fav.title", "empty.fav.sub"],
    archive: ["empty.arc.title", "empty.arc.sub"],
  };
  const [titleKey, subKey] = keyMap[activeTab] || keyMap.all;
  els.emptyTitle.innerHTML = t(titleKey);
  els.emptySubtitle.innerHTML = t(subKey);
}

function createNoteCard(note, index) {
  const card = document.createElement("article");
  card.className = `note-card ${note.color || "yellow"}`;
  card.tabIndex = 0;
  card.setAttribute(
    "aria-label",
    `${t("feat.notes")}: ${note.title || t("note.untitled")}`,
  );
  card.style.animationDelay = `${index * 30}ms`;

  const preview = stripHtml(note.content).slice(0, 120);
  const urlLabel = note.url ? formatUrl(note.url) : "";

  card.innerHTML = `
    <div class="note-strip" aria-hidden="true"></div>
    <div class="note-body">
      <div class="note-header">
        <span class="note-title">${escapeHtml(note.title || "Untitled")}</span>
        <button class="note-fav-btn ${note.favorite ? "favorited" : ""}"
          aria-label="${note.favorite ? t("note.fav_remove") : t("note.fav_add")}"
          data-id="${note.id}">
          <svg viewBox="0 0 24 24" fill="${note.favorite ? "currentColor" : "none"}"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      </div>
      ${preview ? `<p class="note-preview">${escapeHtml(preview)}</p>` : ""}
      <div class="note-meta">
        <span class="note-date">${note.updatedAt ? formatDate(note.updatedAt) : "Just now"}</span>
        ${
          urlLabel
            ? `
        <span class="note-url-chip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          ${escapeHtml(urlLabel)}
        </span>`
            : ""
        }
        ${note.archived ? `<span class="note-archived-badge">${t("note.archived")}</span>` : ""}
      </div>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (e.target.closest(".note-fav-btn")) return;
    openEditor(note.id);
  });
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openEditor(note.id);
    }
  });
  card.querySelector(".note-fav-btn").addEventListener("click", async (e) => {
    e.stopPropagation();
    await toggleFavorite(note.id);
  });

  return card;
}

// ── Editor ────────────────────────────────────────
async function openEditor(noteId) {
  const note = noteId ? notes.find((n) => n.id === noteId) : null;
  editingNoteId = noteId || null;
  isDirty = false;

  els.editorTitle.value = note?.title || "";
  els.editorContent.innerHTML = note?.content || "";

  const color = note?.color || "yellow";
  setEditorColor(color);
  syncFavoriteBtn(note?.favorite || false);

  const url = note?.url || currentUrl;
  els.urlTag.hidden = !url;
  if (url) {
    els.urlTagText.textContent = formatUrl(url);
    els.urlTagText.title = url;
  }

  els.btnDelete.style.display = noteId ? "flex" : "none";
  els.btnArchive.style.display = noteId ? "flex" : "none";
  syncArchiveBtn(note?.archived || false);

  els.overlay.hidden = false;
  requestAnimationFrame(() => els.editorTitle.focus());
}

function closeEditor() {
  if (isDirty) autoSave();
  els.overlay.hidden = true;
  editingNoteId = null;
  isDirty = false;
}

function setEditorColor(color) {
  els.editorStrip.style.background =
    COLOR_STRIP_MAP[color] || COLOR_STRIP_MAP.yellow;
  els.colorDots.forEach((dot) => {
    const isActive = dot.dataset.color === color;
    dot.classList.toggle("active", isActive);
    dot.setAttribute("aria-pressed", String(isActive));
  });
  els.overlay.dataset.color = color;
}

function syncFavoriteBtn(fav) {
  els.btnFavorite.classList.toggle("favorited", fav);
  els.starIcon.setAttribute("fill", fav ? "currentColor" : "none");
  els.btnFavorite.setAttribute(
    "aria-label",
    fav ? "Remove from favorites" : "Add to favorites",
  );
}

function syncArchiveBtn(archived) {
  els.btnArchive.setAttribute("title", archived ? "Unarchive" : "Archive");
  els.btnArchive.setAttribute(
    "aria-label",
    archived ? "Unarchive note" : "Archive note",
  );
}

// ── CRUD ──────────────────────────────────────────
async function saveNote() {
  const title = els.editorTitle.value.trim();
  const content = els.editorContent.innerHTML.trim();
  const color = els.overlay.dataset.color || "yellow";
  const favorite = els.btnFavorite.classList.contains("favorited");
  const archived = editingNoteId
    ? notes.find((n) => n.id === editingNoteId)?.archived || false
    : false;

  if (!title && !stripHtml(content)) {
    showToast(t("toast.write_first"));
    els.editorContent.focus();
    return;
  }

  if (editingNoteId) {
    const idx = notes.findIndex((n) => n.id === editingNoteId);
    if (idx !== -1)
      notes[idx] = {
        ...notes[idx],
        title,
        content,
        color,
        favorite,
        archived,
        updatedAt: Date.now(),
      };
  } else {
    notes.unshift({
      id: genId(),
      title,
      content,
      color,
      favorite,
      archived: false,
      url: currentUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  await saveNotes(notes);
  isDirty = false;
  closeEditor();
  renderNotes();
  showToast(editingNoteId ? t("toast.updated") : t("toast.saved"));
}

async function autoSave() {
  if (
    !els.editorTitle.value.trim() &&
    !stripHtml(els.editorContent.innerHTML.trim())
  )
    return;
  await saveNote();
}

async function deleteNote() {
  if (!editingNoteId) return;
  notes = notes.filter((n) => n.id !== editingNoteId);
  await saveNotes(notes);
  closeEditor();
  renderNotes();
  showToast(t("toast.deleted"));
}

async function toggleFavorite(noteId) {
  const idx = notes.findIndex((n) => n.id === noteId);
  if (idx === -1) return;
  notes[idx].favorite = !notes[idx].favorite;
  await saveNotes(notes);
  renderNotes();
}

async function toggleArchive() {
  if (!editingNoteId) return;
  const idx = notes.findIndex((n) => n.id === editingNoteId);
  if (idx === -1) return;
  notes[idx].archived = !notes[idx].archived;
  await saveNotes(notes);
  isDirty = false;
  closeEditor();
  renderNotes();
  showToast(notes[idx].archived ? t("toast.archived") : t("toast.unarchived"));
}

// ── Rich Text ─────────────────────────────────────
function handleToolBtn(cmd) {
  document.execCommand(cmd, false, null);
  els.editorContent.focus();
  updateToolbarState();
}

function updateToolbarState() {
  els.toolBtns.forEach((btn) => {
    const cmd = btn.dataset.cmd;
    if (!cmd || cmd === "insertUnorderedList") return;
    try {
      btn.classList.toggle("active", document.queryCommandState(cmd));
    } catch {}
  });
}

// ── Search ────────────────────────────────────────
const debouncedSearch = debounce(() => {
  searchQuery = els.searchInput.value.trim();
  els.clearSearch.style.display = searchQuery ? "flex" : "none";
  renderNotes();
}, 200);

// ── Event Bindings ────────────────────────────────
function bindNotesEvents() {
  els.btnNew.addEventListener("click", () => openEditor(null));
  els.fab.addEventListener("click", () => openEditor(null));

  els.searchInput.addEventListener("input", debouncedSearch);
  els.clearSearch.addEventListener("click", () => {
    els.searchInput.value = "";
    searchQuery = "";
    els.clearSearch.style.display = "none";
    renderNotes();
    els.searchInput.focus();
  });

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      els.tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      renderNotes();
    });
  });

  els.btnClose.addEventListener("click", closeEditor);
  els.overlay.addEventListener("click", (e) => {
    if (e.target === els.overlay) closeEditor();
  });
  els.btnSave.addEventListener("click", saveNote);
  els.btnDelete.addEventListener("click", deleteNote);
  els.btnArchive.addEventListener("click", toggleArchive);
  els.btnFavorite.addEventListener("click", () => {
    const fav = !els.btnFavorite.classList.contains("favorited");
    syncFavoriteBtn(fav);
    isDirty = true;
  });

  els.colorDots.forEach((dot) =>
    dot.addEventListener("click", () => setEditorColor(dot.dataset.color)),
  );
  els.toolBtns.forEach((btn) =>
    btn.addEventListener("click", () => handleToolBtn(btn.dataset.cmd)),
  );

  els.editorContent.addEventListener("input", () => {
    isDirty = true;
    updateToolbarState();
  });
  els.editorContent.addEventListener("keyup", updateToolbarState);
  els.editorContent.addEventListener("mouseup", updateToolbarState);
  els.editorTitle.addEventListener("input", () => {
    isDirty = true;
  });

  document.addEventListener("keydown", (e) => {
    if (els.overlay.hidden) return;
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveNote();
    }
    if (e.key === "Escape") closeEditor();
  });

  els.editorContent.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
    }
  });
}

// ── Theme & Feature Switcher & Lang bindings ──────
function bindGlobalEvents() {
  $("#btn-theme")?.addEventListener("click", toggleTheme);
  $("#btn-lang")?.addEventListener("click", toggleLocale);

  $$(".feat-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveFeature(btn.dataset.feature));
  });
}

// ── Init ──────────────────────────────────────────
async function initNotes() {
  [notes, currentUrl] = await Promise.all([loadNotes(), getCurrentUrl()]);
  renderNotes();
}

async function init() {
  await Promise.all([loadTheme(), loadLocale()]);
  bindGlobalEvents();
  bindNotesEvents();

  // Expose re-render hook for locale changes
  window.renderNotesForLocale = renderNotes;

  const activeFeature = await loadActiveFeature();
  setActiveFeature(activeFeature);

  await initNotes();
}

init();
