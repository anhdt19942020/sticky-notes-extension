# 📌 Sticky Notes — Chrome Extension

Sticky notes trong Chrome Side Panel — luôn ở bên, không bao giờ cản trở.

## ✨ Tính Năng

- **Side Panel** — Không chiếm không gian trang web, không conflict CSS
- **5 màu notes** — Vàng, Hồng, Xanh lá, Xanh dương, Tím
- **Rich text editor** — Bold, Italic, Underline, Strikethrough, Bullet list
- **Filter tabs** — All / This Page / Favorites / Archive
- **URL-aware** — Notes tự động gắn với trang web hiện tại
- **Search realtime** — Tìm kiếm notes tức thì
- **Favorites** — Đánh dấu sao notes quan trọng
- **Dark/Light mode** — Toggle theme
- **Auto-save** — Tự động lưu với `chrome.storage.local`
- **Keyboard shortcuts** — `Ctrl+S` lưu, `Escape` đóng

## 🚀 Cài Extension

1. Mở Chrome → `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. Nhấn **Load unpacked**
4. Chọn thư mục `sticky-notes-extension`
5. Click icon 📌 trên toolbar → Side Panel mở ra

## 📁 Cấu trúc

```
sticky-notes-extension/
├── manifest.json        # MV3 config
├── background.js        # Service Worker
├── side_panel.html      # UI
├── side_panel.css       # Design System
├── side_panel.js        # Logic
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## 💡 Tech Stack

- **Vanilla HTML/CSS/JS** — Không framework, không build step
- **Chrome Side Panel API** (Chrome 114+)
- **chrome.storage.local** — Lưu trữ offline
- **execCommand** — Rich text formatting

## ⌨️ Shortcuts

| Shortcut | Hành động   |
| -------- | ----------- |
| `Ctrl+S` | Lưu note    |
| `Escape` | Đóng editor |
| `Ctrl+B` | **Bold**    |
| `Ctrl+I` | _Italic_    |
| `Ctrl+U` | Underline   |

## 📝 Ghi Chú

- Yêu cầu Chrome 114+ (Side Panel API)
- Dữ liệu lưu local, không sync cloud
- Để sync dùng `chrome.storage.sync` (giới hạn 100KB)
