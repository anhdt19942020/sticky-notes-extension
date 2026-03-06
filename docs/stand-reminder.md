# 🚶‍♂️ Tính Năng: Nhắc Trưởng Đứng (Perfect Move)

Tính năng **Nhắc Nhở Đứng Lên** (Stand Reminder) hoạt động như một cỗ máy đếm thời gian sức khỏe, chăm sóc người dùng khi ngồi làm việc máy tính lâu, mà không gây phiền toái.

## 🚀 Các Chức Năng Cốt Lõi

### 1. Chu Kỳ Nhắc Nhở Linh Hoạt

- Mặc định sau mỗi ~30 phút người dùng hoạt động liên tục (active), Chrome Alarm sẽ chuyển trạng thái và gửi Notification thông báo nhắc người dùng phải đứng dậy vươn vai.
- Cài đặt tùy chỉnh, người dùng có thể tự thay đổi `Khoảnh Cách Đứng` (Interval), `Thời Gian Rời Máy` (Idle Detection), và `Thời Gian Hẹn Lại` (Snooze time).

### 2. Phát Hiện Trạng Thái AFK (Idle Detection & Reset)

Đây là một **State Machine cực kỳ thông minh** giải quyết nỗi đau của các app đếm giờ truyền thống:

- Nếu bạn tự động đứng lên lấy nước và rơi vào trạng thái `Idle` (không đụng chuột phím >= 5 phút), hệ thống sẽ ngầm ghi nhận bạn đã có một "khoảng nghỉ tự nhiên".
- Thay vì gửi nhắc nhở vô duyên lúc bạn vừa ngồi xuống, vòng lặp nhắc nhở sẽ **reset đếm lại từ đầu** ngay khi bạn `Active` lại.
- Mọi cảnh báo treo (Break Due Notification) hay Pending Snooze bị dư thừa sẽ được dọn dẹp sạch sẽ.

### 3. Tương Tác Hành Động Ngay Tại Thông Báo

Khi thông báo bật lên `(Time to Stand Up!)`, bạn có thể thực hiện thẳng tác vụ:

- **✅ Done:** Khai báo bạn đã đứng và tiếp tục làm việc để ghi điểm quá trình vươn vai (Stat).
- **⏸ Snooze:** Bận họp? Không sao! Bấm Snooze để trì hoãn nhắc lại sau 10 phút.

### 4. Bảng Theo Dõi Thành Tích Sức Khỏe (Stats Tracker)

Phản hồi trực quan trong Settings Panel, hiển thị đầy đủ các thông số:

- 🤸‍♂️ **Total Stands:** Tổng số lần bạn đã đứng lên nhờ tiện ích này.
- 📅 **Today's Stands:** Mục tiêu đứng lên trong ngày hiện tại.
- 🔥 **Streak (Chuỗi ngày liên tiếp):** Khuyến khích thói quen tốt bằng cách ghi nhận số ngày bạn kiên trì giữ mục tiêu này mà không bị ngắt quãng.

### 5. Cảnh Báo "Mù" Thân Thiện (Visual/Silent badge)

- Giai đoạn đầu, nhắc nhở sẽ không có âm thanh làm ồn, tránh ảnh hưởng môi trường văn phòng.
- Nếu lỡ Notification (Thông báo đẩy do Windows/MacOS bị Focus mode che), app sẽ hiển thị huy hiệu `(!)` màu cam chói **dưới Icon Extension**. Trực quan nhưng rất tinh tế.

---

**📍 Hệ Thống Vận Hành:**
Dựa hoàn toàn vào Background Worker tiết kiệm pin và Web API của Chrome (idle, storage, alarms, notifications). Extension không làm tiêu tốn RAM trình duyệt ngay cả khi đóng.
