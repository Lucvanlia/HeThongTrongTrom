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

8. **Triển khai Serverless Azure Backend (`functions-ingest/` & `api/`)**:
   - Viết script tự động hóa khởi tạo toàn bộ hạ tầng đám mây `scripts/provision-azure.ps1` (Resource Group, Storage Account Table, IoT Hub F1, Web PubSub F1, Static Web Apps, Flex Consumption Function App).
   - Xây dựng `functions-ingest/` (Node.js 20, v4 model):
     * `telemetryIngest.ts`: Nhận tin từ Event Hub endpoint của IoT Hub, lưu Table Storage `history` & `devicestate`, ghi nhận `alerts`, broadcast Web PubSub <50ms, gửi email qua Logic Apps (kèm cooldown 5 phút chống spam).
     * `offlineWatchdog.ts`: Timer trigger 1 phút, phát hiện thiết bị mất kết nối > 5 phút và gửi đúng 1 email cảnh báo.
   - Xây dựng SWA Managed APIs (`api/`):
     * `negotiate.ts` (`GET /api/realtime/negotiate`): Cấp token truy cập WebSocket Web PubSub.
     * `controlCommand.ts` (`POST /api/control/command`): Gửi C2D Direct Method (`setArm`, `setLock`, `silenceAlarm`) tới ESP32, kiểm soát phân quyền RBAC (`admin`, `operator`).
     * `history.ts` (`GET /api/history`, `GET /api/alerts`, `GET /api/state`): Truy vấn dữ liệu từ Azure Table Storage.
     * `adminConfig.ts` (`GET /api/admin/config`, `PUT /api/admin/config`): Đọc và cập nhật Device Twin (`thresholdCm`, `telemetryIntervalMs`).
   - Cả 2 project backend biên dịch TypeScript thành công 100%.

9. **Xây dựng Giao Diện Web Dashboard (React 19 + TypeScript + Vite)**:
   - Khởi tạo thư mục `web/` với React 19, TypeScript, Lucide Icons, và cấu hình Vite dev server proxy tới SWA functions.
   - Thiết kế `azureClient.ts` quản lý WebSocket tự động kết nối lại (exponential backoff) và các REST method.
   - Phát triển toàn bộ các component:
     * `Header.tsx`: Thanh điều hướng hiện đại, biểu tượng khiên báo động, trạng thái WebPubSub, ESP32 Online/Offline, Easy Auth login GitHub/logout.
     * `KpiCards.tsx`: 6 thẻ KPI hiển thị thời gian thực (Trạng thái Armed, Chốt cửa SG90, Còi cảnh báo, PIR HC-SR501, Thanh đo khoảng cách Sonar HC-SR04, IP & Sóng Wi-Fi).
     * `ControlPanel.tsx`: Điều khiển ARM/DISARM, Đóng/Mở chốt khóa, Tắt còi khẩn cấp, tích hợp **Khóa chống bấm lặp (Pending Lock Ref) 3.5s**.
     * `DistanceChart.tsx`: Biểu đồ SVG thuần Zero-Jitter chuẩn quy tắc kiến trúc (banner cố định `minHeight: 48px`, CLS = 0, đường ngưỡng đỏ nét đứt, tooltip hover mượt mà).
     * `AlertsList.tsx`: Nhật ký sự cố đột nhập thời gian thực.
     * `AdminConfigModal.tsx`: Hộp thoại điều chỉnh thông số ngưỡng Device Twin dành riêng cho Admin.
     * `staticwebapp.config.json`: Cấu hình định tuyến và phân quyền RBAC Azure Static Web Apps.
   - Biên dịch sản xuất `npm run build` thành công 100% trong 16.3s.

10. **Cập nhật Knowledge Graph `graphify` & Git**:
    - Kiến trúc đồ thị được cập nhật đạt 671 nodes, 1230 edges, 46 communities.
    - Sẵn sàng đồng bộ toàn bộ lên GitHub repository.



