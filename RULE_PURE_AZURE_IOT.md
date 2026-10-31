---
trigger: always_on
description: Quy chuẩn kiến trúc dự án Hệ thống cảnh báo chống trộm IoT chạy 100% trên Microsoft Azure (ESP32 + Azure IoT Hub MQTT + Azure Functions + Web PubSub + Table Storage + Static Web Apps + Logic Apps), React 19 + TypeScript + Vite, ngân sách < $10/tháng.
---

# QUY CHUẨN KIẾN TRÚC: HỆ THỐNG CẢNH BÁO CHỐNG TRỘM IOT (100% MICROSOFT AZURE)
*(Copy file này vào `.agents/rules/iot-enterprise-architecture.md`. Chi tiết code xem `HUONG_DAN_CHI_TIET.md`.)*

Toàn bộ hệ thống chạy trên **Microsoft Azure**, không dùng Firebase, HiveMQ hay broker bên ngoài. Chi phí ước tính **~$0.10 – $0.50/tháng**.

---

## 1. PHẦN CỨNG & SƠ ĐỒ CHÂN (BẮT BUỘC TUÂN THỦ)

| Thiết bị | Chân ESP32 | Quy tắc |
| :--- | :--- | :--- |
| PIR HC-SR501 OUT | GPIO 13 | Bỏ qua tín hiệu 30 giây đầu (warm-up) |
| HC-SR04 TRIG / ECHO | GPIO 5 / GPIO 18 | ECHO qua cầu chia áp 1k/2k; `pulseIn` timeout ≤ 25 ms |
| Buzzer 3V | GPIO 23 | **Cấm dùng GPIO 12** (strapping) |
| LED Vàng (báo động) | GPIO 2 (qua 220Ω) | Nhấp nháy khi ALARM |
| LED Xanh (ARMED) | GPIO 4 (qua 220Ω) | Sáng khi ARMED |

Board PlatformIO: `esp32doit-devkit-v1`. Thư viện: `knolleary/PubSubClient`, `bblanchon/ArduinoJson@^7`.

---

## 2. CẤU TRÚC THƯ MỤC

```text
<project-root>/
├── platformio.ini
├── wokwi.toml, diagram.json         # Mô phỏng Wokwi
├── include/
│   ├── Config.h                     # GPIO, ngưỡng, chu kỳ timer
│   ├── secrets.h                    # Wi-Fi + IoT Hub device key  [BẮT BUỘC .gitignore]
│   └── secrets.h.example
├── src/main.cpp                     # Firmware FreeRTOS 2 nhân
├── functions-ingest/                # Function App riêng (Flex Consumption)
│   └── src/functions/
│       ├── telemetryIngest.ts       # Trigger IoT Hub (Event Hub-compatible endpoint)
│       └── offlineWatchdog.ts       # Timer mỗi 1 phút
├── api/                             # SWA Managed Functions (CHỈ HTTP)
│   └── src/
│       ├── lib/auth.ts              # x-ms-client-principal + kiểm tra role
│       └── functions/               # negotiate, controlCommand, history, adminConfig
├── web/                             # React 19 + TypeScript + Vite
│   ├── staticwebapp.config.json     # Routing, RBAC, security headers
│   ├── .env.local                   # [BẮT BUỘC .gitignore]
│   └── src/
│       ├── types.ts                 # Telemetry, AlertItem, HistoryPoint, RealtimeMessage, UserInfo
│       ├── azureClient.ts           # Web PubSub WebSocket + REST
│       ├── lib/auth.ts, lib/timeRange.ts
│       └── components/              # Header, KpiCards, ControlPanel, DistanceChart,
│                                    # AlertsList, DeviceSettings, UserRoleInfo
├── scripts/provision-azure.ps1      # az CLI tạo tài nguyên
├── .github/workflows/               # azure-static-web-apps.yml, functions-ingest.yml
├── .gitignore
└── README.md
```

---

## 3. DỊCH VỤ AZURE & GIỚI HẠN

| Tầng | Dịch vụ | Gói | Giới hạn cần nhớ |
| :--- | :--- | :--- | :--- |
| IoT Gateway | Azure IoT Hub | **F1** (nâng cấp lên **S1**, **không dùng B1**) | 8.000 tin/ngày; B1 không có Direct Method/Twin/C2D |
| Realtime | Azure Web PubSub | Free F1 | 20 kết nối đồng thời, 20.000 tin/ngày |
| Xử lý sự kiện | Azure Functions | Flex Consumption | Chứa trigger IoT Hub + Timer |
| Web + API | Azure Static Web Apps | Free | Managed API **chỉ hỗ trợ HTTP trigger**; đăng nhập bằng Entra ID / GitHub |
| Dữ liệu | Azure Table Storage | Standard LRS | Bảng `history`, `alerts`, `devicestate`; PartitionKey = ngày UTC+7 `yyyyMMdd` |
| Lưu trữ thô | Azure Blob Storage | Standard LRS | Message Routing `{YYYY}/{MM}/{DD}/{HH}` |
| Email | Azure Logic Apps | Consumption | HTTP trigger → Outlook.com → `phatola123@gmail.com` |

---

## 4. NGUYÊN LÝ HOẠT ĐỘNG

### A. Firmware ESP32 (FreeRTOS)
- **Core 0 — `networkTask` (Priority 1):**
  - Wi-Fi STA, kết nối lại sau mỗi 15 giây; NTP `configTime(7*3600, 0, ...)` gọi **một lần**.
  - Kết nối IoT Hub bằng **MQTT TLS port 8883** (không dùng HTTPS REST): username `{host}/{deviceId}/?api-version=2021-04-12`, password là **SAS token tự sinh** (HMAC-SHA256 bằng mbedtls), tự gia hạn trước khi hết hạn 5 phút.
  - `WiFiClientSecure::setInsecure()` được phép trong môi trường học tập; production dùng `setCACert` (DigiCert Global Root G2).
  - D2C topic: `devices/{id}/messages/events/type={telemetry|alert}&$.ct=application%2Fjson&$.ce=utf-8`.
  - Telemetry mỗi **15 giây** (không nhanh hơn); cảnh báo gửi ngay khi có sự kiện.
  - Nhận Direct Method `setArm {value:bool}`, `silenceAlarm`; nhận Twin desired `distanceThresholdCm`; gửi Twin reported `armed`, `distanceThresholdCm`, `fw`.
- **Core 1 — `sensorTask` (Priority 2) + `alarmOutputTask` (Priority 3):**
  - Đọc cảm biến theo chu kỳ 200 ms bằng `vTaskDelayUntil`/`millis()`. **Cấm dùng `delay()` dài.**
  - Logic: `ARMED && (PIR || 0 < distance < threshold)` → ALARM; tự tắt còi sau 60 giây; DISARM luôn tắt còi.
  - `alarmOutputTask` điều khiển còi và LED, luôn gọi `vTaskDelay(pdMS_TO_TICKS(20))`. **Báo động tại chỗ phải hoạt động cả khi mất mạng.**
- Biến dùng chung giữa 2 nhân **bắt buộc** đặt trong `portENTER_CRITICAL`/`portEXIT_CRITICAL`; cảnh báo truyền từ Core 1 sang Core 0 qua `QueueHandle_t`.
- Lưu `armed` và `thr` vào NVS (`Preferences`, namespace `chongtrom`).
- **ESP32 chỉ được giữ Wi-Fi và device key.** Không lưu URL Logic Apps hay connection string service trên thiết bị.

### B. Cloud
1. IoT Hub → (route `events`) → `telemetryIngest`: ghi Table Storage, cập nhật `devicestate.lastSeen`, `sendToAll` qua Web PubSub dạng `{kind, data}`, gửi email đột nhập (cooldown 5 phút).
2. Message Routing: khi tạo route Storage **bắt buộc thêm route `events` → built-in endpoint**, nếu không Function sẽ ngừng nhận dữ liệu.
3. `offlineWatchdog` (Timer mỗi phút): `lastSeen` > 5 phút và chưa báo → gửi **đúng 1 email**, đặt `offlineNotified=true`; cờ được reset khi có tin nhắn mới.
4. Lệnh từ Web: `POST /api/control/command` → kiểm tra role → `invokeDeviceMethod` (dùng `await`, timeout 10 giây, lỗi 504 khi thiết bị offline). Chỉ cho phép lệnh `setArm` và `silenceAlarm`. `deviceId` lấy từ App Setting.
5. Đổi ngưỡng: `PUT /api/admin/config` → `registry.updateTwin` (desired).
6. Functions viết bằng **Node.js v4 programming model** (`app.http`, `app.eventHub`, `app.timer`), TypeScript.

### C. Web Dashboard (React 19 + TypeScript + Vite)
1. **Realtime:** `GET /api/realtime/negotiate` cấp token Web PubSub **chỉ nhận** (không có role gửi), gắn `userId`, hết hạn sau 60 phút; client kết nối lại theo exponential backoff 1s → 30s.
2. **Biểu đồ SVG zero-jitter:** banner `minHeight: 48px`; mọi đường vẽ đặt `pointerEvents="none"`; một `<rect fill="transparent" pointerEvents="all">` bắt chuột; chỉ số hover = `round(ratio × (n−1))`; vẽ đường ngưỡng và điểm báo động. Giờ hiển thị dùng `Asia/Ho_Chi_Minh`.
3. **Pending lock:** khóa nút 3,5 giây sau khi gửi lệnh (dùng `useRef`).
4. **RBAC qua SWA:**

| Vai trò | Cấp qua | Quyền |
| :--- | :--- | :--- |
| `admin` | Role management → Invite | Toàn quyền + đổi ngưỡng |
| `operator` | Role management → Invite | ARM/DISARM, tắt còi |
| Viewer (`authenticated`) | Đăng nhập | Chỉ xem |

   - Route: `/api/admin/*` → `admin`; `/api/control/*` → `admin`, `operator`; `/api/*` và `/*` → `authenticated`.
   - API **luôn kiểm tra lại role** từ header `x-ms-client-principal` (phòng thủ nhiều lớp). Ẩn nút trên UI không phải là cơ chế bảo mật.
   - **Không** hard-code mật khẩu hay tài khoản trong code. Google login cần gói Standard nên không dùng trên Free.
5. Security headers: CSP (`connect-src 'self' wss://*.webpubsub.azure.com`), `X-Content-Type-Options`, `Referrer-Policy`.

---

## 5. QUY TẮC BẢO MẬT & GIT
- `.gitignore` bắt buộc chứa: `include/secrets.h`, `**/.env.local`, `**/local.settings.json`, `.pio`, `node_modules`, `dist`.
- Connection string chỉ nằm trong **App Settings** của Function App / SWA hoặc GitHub Secrets.
- Mỗi lần commit phải kiểm tra không có key nào trong diff.

---

## 6. SKILLS & CÔNG CỤ
- **`graphify`**: Knowledge Graph codebase (`graphify update .` sau khi sửa code).
- **Azure CLI** (`az`, extension `azure-iot`, `webpubsub`), **Azure Functions Core Tools**, **SWA CLI** (`swa start` để chạy thử local).
- **`chrome-devtools`**: Debug giao diện, WebSocket.
- **`modern-web-guidance`**: Chuẩn React 19, CSS hiện đại.
- **Wokwi for VS Code**: Mô phỏng mạch.
