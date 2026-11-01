---
trigger: always_on
description: Quy chuẩn kiến trúc dự án Hệ thống cảnh báo chống trộm IoT chạy 100% trên Microsoft Azure (ESP32 + Azure IoT Hub MQTT + Azure Functions + Web PubSub + Table Storage + Static Web Apps + Logic Apps), React 19 + TypeScript + Vite.
---

# QUY CHUẨN KIẾN TRÚC: HỆ THỐNG CẢNH BÁO CHỐNG TRỘM IOT (100% MICROSOFT AZURE)

Toàn bộ hệ thống chạy trên **Microsoft Azure**, không dùng Firebase, HiveMQ hay broker bên ngoài. Chi phí ước tính **~$0.10 – $0.50/tháng**.

## 1. PHẦN CỨNG & SƠ ĐỒ CHÂN
- **PIR HC-SR501 OUT**: GPIO 13 (bỏ qua 30s warm-up khi boot)
- **HC-SR04**: TRIG GPIO 5, ECHO GPIO 18 (qua cầu chia áp 1k/2k xuống 3.3V)
- **Buzzer 3V**: GPIO 23 (**CẤM DÙNG GPIO 12** vì là strapping pin gây lỗi boot)
- **LED Vàng (Cảnh báo)**: GPIO 2 (qua trở 220Ω, chớp nháy 2Hz khi ALARM)
- **LED Xanh (ARM)**: GPIO 4 (qua trở 220Ω, sáng liên tục khi ARMED)
- **Servo SG90 (Chốt Cửa Khóa Thông Minh)**: PWM GPIO 19, điều khiển góc 0° (Mở) / 90° (Khóa)
- **Rơ-le 5V (Power-Gating Servo)**: IN GPIO 25 (Active LOW), cách ly nguồn 5V khi servo không chuyển động
- **Nút Nhấn Mở Cửa Thoát Hiểm (Exit Button)**: GPIO 27 (Active-LOW, INPUT_PULLUP), tự động đóng chốt sau 5s, hoãn báo động 10s khi người ra
- **LCD 1602 I2C**: SDA GPIO 21, SCL GPIO 22, Địa chỉ 0x27 (Nguồn 5V)

## 2. NGUYÊN LÝ DUAL-CORE FREERTOS
- **Core 0 (`networkTask` - Priority 1)**:
  - Wi-Fi STA, tự động reconnect non-blocking.
  - NTP sync GMT+7 một lần duy nhất lúc khởi động.
  - Kết nối Azure IoT Hub qua **MQTT TLS port 8883** (PubSubClient).
  - Tự động sinh SAS token bằng `mbedtls` HMAC-SHA256 và tự động gia hạn trước 5 phút.
  - Gửi Telemetry mỗi 15s (đảm bảo không vượt 8.000 tin/ngày gói F1).
  - Gửi Alert ngay lập tức khi phát hiện đột nhập từ Queue.
  - Lắng nghe Direct Method `setArm`, `silenceAlarm` và Device Twin desired.
- **Core 1 (`sensorTask` - Priority 2 & `alarmOutputTask` - Priority 3)**:
  - Đọc cảm biến chu kỳ 200ms non-blocking.
  - Task còi hú & LED ưu tiên cao nhất (Priority 3) luôn có `vTaskDelay(pdMS_TO_TICKS(20))` nhường CPU.
  - Hoạt động độc lập: mất kết nối Wi-Fi/Azure thì hệ thống vẫn báo động tại chỗ bình thường.
  - Dữ liệu chia sẻ giữa 2 nhân bảo vệ bằng `portENTER_CRITICAL(&gMux)` / `portEXIT_CRITICAL(&gMux)`.

## 3. NỀN TẢNG CLOUD & WEB DASHBOARD
- **Azure IoT Hub F1**: Cổng giao tiếp MQTT D2C và C2D Direct Method.
- **Azure Functions (Node.js v4 model)**:
  - `telemetryIngest`: Nhận tin từ IoT Hub built-in endpoint, lưu Table Storage, broadcast qua Web PubSub.
  - `offlineWatchdog`: Timer trigger mỗi 1 phút quét trạng thái thiết bị, nếu offline > 5 phút gửi đúng 1 email cảnh báo.
  - `controlCommand`: POST `/api/control/command` gửi Direct Method tới ESP32 (yêu cầu role admin hoặc operator).
- **Azure Web PubSub F1**: Kênh WebSocket thời gian thực (< 50ms) tới Web Dashboard.
- **Azure Table Storage**: Bảng `history`, `alerts`, `devicestate`.
- **Azure Logic Apps**: Webhook gửi email cảnh báo đột nhập và offline về Gmail.
- **Web Dashboard (React 19 + TypeScript + Vite)**:
  - Triển khai trên **Azure Static Web Apps (Free)** với Easy Auth RBAC.
  - Biểu đồ SVG thuần Zero-Jitter: banner cố định `minHeight: 48px`, `pointerEvents="none"`, overlay transparent rect `pointerEvents="all"`.
  - Khóa chống bấm lặp (Pending Lock Ref) 3.5s.

