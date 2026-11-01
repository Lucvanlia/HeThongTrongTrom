# Progress & Operations Log

## Session 2026-10-31: Cài đặt Bộ Công Cụ & Chuẩn hóa Tài liệu

### Các công việc đã hoàn thành:
1. **Cài đặt kỹ năng `planning-with-files`**:
   - Tải và cài đặt thành công package từ `OthmanAdi/planning-with-files`.
   - Thiết lập kỹ năng tại `~/.agents/skills/planning-with-files` và nhân bản vào workspace `.agents/skills/planning-with-files` cùng cấu hình toàn cục `~/.gemini/config/skills/planning-with-files`.
   - Khởi tạo 3 file theo dõi tiến độ trên đĩa: `task_plan.md`, `findings.md`, `progress.md`.

2. **Cài đặt & Xây dựng Website Kiến trúc `graphify`**:
   - Sử dụng công cụ `graphify 0.9.99` quét toàn bộ mã nguồn (`graphify . --code-only`).
   - Tạo thành công cấu trúc đồ thị tương tác tại `graphify-out/`:
     - `graphify-out/graph.html`: Giao diện web trực quan hóa mạng liên kết mã nguồn.
     - `graphify-out/graph.json`: Dữ liệu đồ thị 377 nodes, 751 edges, 29 communities.
     - `graphify-out/GRAPH_REPORT.md`: Báo cáo chi tiết các cụm liên kết.
   - Thêm quy tắc hướng dẫn truy vấn đồ thị: `.agents/rules/graphify.md`.

3. **Xây dựng `GEMINI.md` theo chuẩn Google Gemini CLI**:
   - Tạo file [GEMINI.md](file:///d:/HeThongTrongTrom/HeTrongTrongTrom-src/GEMINI.md) tại thư mục gốc dự án theo cấu trúc chuẩn của repository `google-gemini/gemini-cli`.
   - Định nghĩa chi tiết: Project Overview, Hardware Pinout, Building & Testing, Development & Safety Guidelines, Planning Protocol, và Knowledge Graph Protocol.

4. **Đồng bộ Quy tắc Kiến trúc Dự án**:
   - Cập nhật `.agents/rules/iot-enterprise-architecture.md` chuẩn 100% Microsoft Azure.
   - Cập nhật `.gitignore` loại trừ các thư mục cache `.pio`, `graphify-out/cache/`, secrets và env local.

6. **Tích hợp Chốt Cửa Thông Minh (Servo SG90) & Màn Hình LCD 1602 I2C**:
   - Cập nhật `platformio.ini`: Thêm thư viện `marcoschwartz/LiquidCrystal_I2C@^1.1.4` và `madhephaestus/ESP32Servo@^3.0.5`.
   - Cập nhật `include/Config.h`: Thêm chân Servo (`GPIO 19`), I2C SDA (`GPIO 21`), SCL (`GPIO 22`), góc khóa 90° và mở 0°.
   - Nâng cấp `src/main.cpp`: Tích hợp tự động đóng mở chốt khóa cửa theo trạng thái ARMED/DISARMED, hỗ trợ Direct Method `setLock` từ xa, hiển thị màn hình LCD đa thông tin theo thời gian thực.
   - Nâng cấp `diagram.json`: Bổ sung linh kiện `wokwi-servo` và `wokwi-lcd1602` sẵn sàng mô phỏng.

7. **Tích hợp Module Rơ-le 5V Power-Gating cho Servo SG90**:
   - Cấu hình chân Rơ-le điều khiển nguồn Servo: `GPIO 25` (Active LOW).
   - Thiết kế hàm `moveServoWithPowerGating(int targetAngle)`:
     * Kích hoạt rơ-le đóng mạch cấp nguồn 5V cho Servo.
     * Trễ 50ms ổn định đường ray nguồn điện áp.
     * Kích hoạt `servo.attach()`, phát tín hiệu xung PWM xoay góc chỉ định (0° hoặc 90°).
     * Trễ 600ms đảm bảo chốt cơ học hoàn tất hành trình xoay.
     * Ngắt xung `servo.detach()` và ngắt rơ-le cách ly hoàn toàn nguồn servo.
   - Bổ sung linh kiện Rơ-le 5V vào sơ đồ mạch mô phỏng `diagram.json`.
   - Biên dịch thành công 100% PlatformIO: RAM 14.3% (46.8KB), Flash 72.8% (954KB). Firmware version 2.2.0.


