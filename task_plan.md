# Task Plan: Hệ Thống Cảnh Báo Chống Trộm IoT (ESP32 + 100% Microsoft Azure)

## Master Roadmap & Progress

- [x] **Phase 1: Chuẩn hóa Tài liệu & Kiến trúc Hệ thống**
  - [x] Rà soát giỏ hàng linh kiện chuẩn 10 điểm (`BOM_LinhKien.md`, `BANG_TONG_HOP_DON_HANG.md`)
  - [x] Phân tích đặc tính kỹ thuật 11 thiết bị đã mua & bẫy phần cứng
  - [x] Viết lại toàn diện kiến trúc 100% Azure chống trộm (`HUONG_DAN_CHI_TIET.md`, `RULE_PURE_AZURE_IOT.md`)
  - [x] Cài đặt kỹ năng quy chuẩn: `planning-with-files`, `graphify`, `GEMINI.md`
  - [x] Khởi tạo Git repo và đồng bộ mã nguồn lên GitHub (`Lucvanlia/HeThongTrongTrom`)

- [x] **Phase 2: Lập trình Firmware ESP32 Dual-Core C++**
  - [x] Khởi tạo `include/Config.h` với các chân GPIO và chu kỳ timer non-blocking
  - [x] Hoàn thiện `include/secrets.h` & `include/secrets.h.example` cho Azure IoT Hub
  - [x] Viết `src/main.cpp` chạy FreeRTOS 2 nhân (Core 0: MQTT TLS 8883 + SAS Token; Core 1: Sensor & Alarm)
  - [x] Cập nhật `platformio.ini` với thư viện `PubSubClient`, `ArduinoJson` và cờ biên dịch
  - [x] Biên dịch thành công 100% bằng PlatformIO (`RAM: 14.1%`, `Flash: 70.3%`)

- [x] **Phase 3: Thiết lập Mô phỏng Wokwi trên VS Code**
  - [x] Tạo file cấu hình `wokwi.toml` liên kết firmware ELF/BIN
  - [x] Thiết lập sơ đồ chân `diagram.json` (ESP32 DevKit, PIR, HC-SR04, Buzzer, LED Vàng, LED Xanh, cầu chia áp, Servo SG90, Relay 5V, LCD 1602 I2C)
  - [x] Sẵn sàng bấm Play mô phỏng trực quan trên VS Code Wokwi extension

- [x] **Phase 4: Triển khai Hạ tầng Serverless Azure Backend**
  - [x] Tạo script PowerShell tự động hóa khởi tạo tài nguyên (`scripts/provision-azure.ps1`)
  - [x] Xây dựng Function App Ingestion (`functions-ingest/`): `telemetryIngest` (Event Hub) + `offlineWatchdog` (Timer 1 min)
  - [x] Xây dựng SWA Managed APIs (`api/`): `negotiate`, `controlCommand`, `history`, `adminConfig`
  - [x] Kiểm tra build TypeScript cho cả `functions-ingest/` và `api/` (thành công 100%)

- [x] **Phase 5: Xây dựng Giao diện Web Dashboard (React 19 + SWA)**
  - [x] Khởi tạo dự án Vite + React 19 + TypeScript trong thư mục `web/`
  - [x] Tích hợp WebSocket client kết nối Azure Web PubSub (`azureClient.ts`)
  - [x] Xây dựng các component: `Header`, `KpiCards`, `ControlPanel` (khóa 3.5s), `DistanceChart` (SVG zero-jitter), `AlertsList`, `AdminConfigModal`
  - [x] Cấu hình routing & phân quyền Easy Auth RBAC (`web/staticwebapp.config.json`)
  - [x] Biên dịch sản xuất Vite thành công 100% (`dist/` ready)

- [/] **Phase 6: Lắp ráp Mạch thật & Kiểm thử Thực tế**
  - [ ] Lắp ráp linh kiện lên đế mở rộng 30 chân và testboard
  - [ ] Kiểm tra cầu chia áp 1kΩ/2kΩ cho chân ECHO cảm biến HC-SR04
  - [ ] Nạp firmware thực tế, kiểm tra kết nối Wi-Fi & gửi nhận dữ liệu lên Azure
  - [ ] Kiểm thử kịch bản báo động khẩn cấp và gửi email qua Azure Logic Apps

