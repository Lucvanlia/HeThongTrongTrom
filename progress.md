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

5. **Hiện thực hóa Firmware Dual-Core & Mô phỏng Wokwi (Phase 2 & 3)**:
   - Cập nhật `platformio.ini`: Tích hợp thư viện `PubSubClient@^2.8` và `ArduinoJson@^7.0.0`, cấu hình tốc độ nạp `921600` và baud rate `115200`.
   - Tạo file `include/Config.h`: Định nghĩa chân GPIO chuẩn (PIR GPIO 13, HC-SR04 TRIG 5 / ECHO 18, Buzzer GPIO 23, LED Vàng GPIO 2, LED Xanh GPIO 4).
   - Tạo file `src/main.cpp`: Lập trình FreeRTOS dual-core hoàn chỉnh (Core 0 mạng & Azure IoT Hub TLS 8883, Core 1 cảm biến & còi hú báo động).
   - Biên dịch thành công 100% với PlatformIO (`pio.exe run`): RAM 14.1% (46.2KB), Flash 70.3% (920KB).
   - Thiết lập mô phỏng Wokwi: Tạo `wokwi.toml` và `diagram.json` mô phỏng đầy đủ mạch phần cứng, sẵn sàng chạy ngay trên VS Code.

