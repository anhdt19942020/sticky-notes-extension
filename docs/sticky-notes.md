# 📌 Tính Năng: Ghi Chú (Perfect Sticky)

Tính năng **Ghi Chú** (Sticky Notes) được thiết kế ngay trên Chrome Side Panel, giúp người dùng ghi lại mọi thông tin, ý tưởng hoặc đánh dấu mà không cần phải rời khỏi trang web hiện tại.

## 🚀 Các Chức Năng Cốt Lõi

### 1. Quản Lý Ghi Chú Nhanh Chóng

- **Tạo Mới:** Thêm ghi chú mới ngay lập tức qua một nút bấm.
- **Tự Động Lưu:** Viết đến đâu, lưu đến đó (auto-save). Không bao giờ lo mất dữ liệu.
- **Thùng Rác & Lưu Trữ:** Đưa ghi chú vào mục lưu trữ (Archive) khi không cần thiết, dọn dẹp không gian hiển thị nhưng vẫn có thể tìm lại bất kỳ lúc nào.

### 2. Tổ Chức & Phân Loại Dữ Liệu

- **Tabs Phân Loại (Filters):**
  - **All (Tất cả):** Xem toàn bộ ghi chú bạn đã từng ghi.
  - **This Page (Trang này):** Chỉ hiển thị các ghi chú được tạo riêng cho trang web (URL) bạn đang truy cập. Cực kỳ tiện lợi để tra cứu dữ liệu theo ngữ cảnh.
  - **Favorites (Yêu thích):** Danh sách các ghi chú được đánh dấu ⭐ quan trọng.
  - **Archive (Lưu trữ):** Kho chứa các ghi chú đã ẩn đi.
- **Bộ Chỉnh Màu Sắc (Color Labels):** Đánh dấu ghi chú bằng nhiều màu sắc khác nhau (Vàng, Xanh dương, Xanh lá, Đỏ, Tím, Xám) giúp phân loại trực quan.

### 3. Gắn Kết Ngữ Cảnh Tự Động

- Mỗi ghi chú được tạo sẽ tự động gắn kèm với **Tên miền (Domain)** và **URL** của trang web đang duyệt. Bấm vào tag domain trên ghi chú sẽ tự động mở lại trang web đó.
- Gắn thời gian (Timestamp) chính xác lúc ghi.

### 4. Tìm Kiếm Mạnh Mẽ

- **Tìm Kiếm Tức Thì (Real-time Search):** Lọc ghi chú tức thời theo nội dung keyword nằm trong title hoặc thân bài.

### 5. Cá Nhân Hóa UX/UI

- **Chế Độ Tối (Dark Mode):** Sẵn sàng để làm việc ban đêm mà không chói mắt.
- **Đa Ngôn Ngữ (I18n):** Chuyển đổi mượt mà giữa Tiếng Việt và Tiếng Anh chỉ với một nút bấm.

---

**📍 Nơi Dữ Liệu Lưu Trữ:**
Tất cả ghi chú được lưu bảo mật trong `chrome.storage.local` trên thiết bị cá nhân của bạn. Không ai có thể truy cập được dữ liệu này ngoại trừ bạn.
