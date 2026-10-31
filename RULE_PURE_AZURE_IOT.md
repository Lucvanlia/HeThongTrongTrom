---
trigger: always_on
description: Quy chuẩn kiến trúc dự án IoT 100% trên nền tảng Microsoft Azure (ESP32/MCU + Azure IoT Hub + Azure Web PubSub + Cosmos DB/Table Storage + Static Web Apps + Logic Apps) với ngân sách tối ưu dưới 10$/tháng.
---

# QUY CHUẨN KIẾN TRÚC DỰ ÁN IOT (100% PURE MICROSOFT AZURE STANDARD)
*(Dành cho dự án mới: Copy file này vào `.agents/rules/iot-enterprise-architecture.md` của dự án mới)*

Toàn bộ hệ thống chạy **100% trên hệ sinh thái Microsoft Azure**, loại bỏ hoàn toàn các dịch vụ bên ngoài (như Firebase), được tối ưu chi phí vận hành ở mức tối thiểu (**$0.20 - $1.50 / tháng**, nằm gọn trong ngân sách $10/tháng của nhóm).

---

## 1. CẤU TRÚC THƯ MỤC MONOREPO CHUẨN (AZURE IOT ENTERPRISE)

```text
<project-root>/
├── platformio.ini              # Cấu hình PlatformIO (board: esp32dev, framework: arduino, lib_deps, upload/monitor speed)
├── staticwebapp.config.json    # Cấu hình Azure Static Web Apps (Routing, RBAC Auth, Security Headers)
├── include/                    # Header C++ chia sẻ
│   ├── Config.h                # Chân GPIO, ngưỡng cảnh báo mặc định, chu kỳ timers non-blocking
│   ├── secrets.h               # Thông tin bí mật (Wi-Fi, Azure IoT Hub Key, Connection Strings) - [BẮT BUỘC .gitignore]
│   └── secrets.h.example       # File mẫu chứa placeholder, an toàn để push lên GitHub
├── src/                        # Mã nguồn Firmware C++ (ESP32 / MCU)
│   ├── main.cpp                # Firmware chính: FreeRTOS 2 nhân (Core 0: Azure IoT Hub & Cloud, Core 1: Control & Safety)
│   └── ...
├── api/                        # Azure Functions Backend (Node.js/TypeScript Serverless APIs)
│   ├── host.json               # Cấu hình Function App runtime
│   ├── package.json
│   ├── TelemetryIngest/        # Event Grid / IoT Hub Trigger nhận dữ liệu cảm biến
│   ├── SendDeviceCommand/      # HTTP Trigger gửi C2D Method / Device Twin tới ESP32
│   └── WebPubSubNegotiate/     # Cung cấp Client Token WebSocket cho Web Dashboard
├── web/                        # Ứng dụng Web Dashboard (React 19 + TypeScript + Vite)
│   ├── package.json
│   ├── vite.config.ts
│   ├── .env.local              # Biến môi trường cục bộ (Azure URLs, Keys) - [BẮT BUỘC .gitignore]
│   ├── .env.example            # File mẫu môi trường cho Git
│   └── src/
│       ├── types.ts            # Data models chuẩn (TelemetryData, LogEntry, AlertItem, ThresholdConfig, AppUser)
│       ├── azureClient.ts      # Azure Web PubSub WebSocket Client & REST API handlers
│       ├── lib/
│       │   ├── azureAlert.ts   # Webhook trigger cảnh báo sự cố qua Azure Logic Apps
│       │   └── timeRange.ts    # Xử lý múi giờ UTC+7 và dải lọc lịch sử biểu đồ
│       └── components/
│           ├── Header.tsx      # Thanh điều hướng, trạng thái kết nối Azure và tài khoản
│           ├── KpiCards.tsx    # Các thẻ chỉ số cảm biến thời gian thực kèm mã màu cảnh báo
│           ├── ControlPanel.tsx# Điều khiển chế độ AUTO/MANUAL, công tắc tải và nút dừng khẩn cấp (E-Stop)
│           ├── TelemetryChart.tsx # Biểu đồ SVG thuần cố định khung, hover badge mượt, chống giật chuột 100%
│           ├── AlertsList.tsx  # Trung tâm cảnh báo Cloud (3 kịch bản test + nhật ký an toàn)
│           ├── DeviceSettings.tsx # Cài đặt ngưỡng tham số đồng bộ 2 chiều qua Azure Device Twins
│           ├── UserRoleManagement.tsx # Phân quyền 3 vai trò (ADMIN, OPERATOR, VIEWER)
│           └── LoginModal.tsx  # Modal đăng nhập bảo mật (Microsoft Entra ID / Google qua Azure SWA Auth)
├── scripts/                    # Scripts tiện ích PowerShell / Python (tự động hóa build, test, báo cáo)
├── .github/workflows/          # CI/CD tự động hóa
│   └── azure-static-web-apps.yml # Tự động build và deploy lên Azure Static Web Apps khi git push
├── .agents/                    # Customizations cho AI Agent
│   ├── rules/
│   │   └── iot-enterprise-architecture.md # Quy chuẩn kiến trúc Azure này
│   └── workflows/
├── .gitignore                  # Bảo vệ tuyệt đối thông tin nhạy cảm
└── README.md                   # Tài liệu hướng dẫn cài đặt và vận hành hệ thống
```

---

## 2. BẢNG DỰ TOÁN CHI PHÍ HÀNG THÁNG (NGÂN SÁCH $10)

| Tầng Kiến Trúc | Dịch Vụ Azure Chuẩn | Gói Dịch Vụ (Tier) | Hạn Mức Miễn Phí & Tính Năng | Chi Phí Ước Tính |
| :--- | :--- | :--- | :--- | :---: |
| **IoT Gateway** | **Azure IoT Hub** | **Free F1** *(hoặc B1)* | 8.000 tin nhắn/ngày (hoặc 400.000 tin nếu B1 $10/tháng), hỗ trợ MQTT/HTTPS, Device Twins, Direct Methods | **$0.00** *(F1)* |
| **Realtime Stream**| **Azure Web PubSub** | **Free F1** | 20.000 tin nhắn/ngày, 1.000 kết nối đồng thời WebSocket W3C siêu tốc (< 50ms) | **$0.00** |
| **Serverless API** | **Azure Functions** | **Consumption Plan** | **1.000.000 lượt gọi miễn phí mỗi tháng** | **$0.00** |
| **Web Hosting** | **Azure Static Web Apps**| **Free Plan** | 100 GB băng thông/tháng, Global Anycast CDN, SSL tự động, tích hợp CI/CD GitHub Actions | **$0.00** |
| **Database (Hot)** | **Azure Cosmos DB** *(hoặc Azure Table Storage)*| **Free Tier** *(1000 RU/s + 25GB)* | 1.000 RU/s throughput và 25 GB lưu trữ miễn phí trọn đời (hoặc Table Storage siêu rẻ ~$0.05/tháng) | **$0.00 - $0.10** |
| **Cold Storage** | **Azure Blob Storage** | **Standard LRS (Hot/Cool)** | Message Routing tự động từ IoT Hub lưu file JSON lịch sử theo `{YYYY}/{MM}/{DD}/{HH}` | **~$0.10 - $0.30** |
| **Email Alerting**| **Azure Logic Apps** | **Consumption Plan** | Kích hoạt webhook gửi email qua connector `Outlook.com` về Gmail (~$0.000025/lần) | **~$0.02 - $0.05** |
| **Bảo mật Auth** | **Azure SWA Easy Auth** | **Built-in Free** | Xác thực Microsoft Entra ID / Google / GitHub, phân quyền qua file `staticwebapp.config.json` | **$0.00** |
| **TỔNG CHI PHÍ THỰC TẾ** | **Hệ thống Full-Stack Azure** | **Sẵn sàng chịu tải Enterprise** | **Vận hành liên tục 24/7** | **~$0.20 - $0.50 / tháng** |

---

## 3. NGUYÊN LÝ HOẠT ĐỘNG CHUẨN AZURE

1. **Firmware ESP32**:
   - FreeRTOS Core 0: Giao tiếp Azure IoT Hub qua MQTT TLS (Port 8883) hoặc HTTPS REST, đồng bộ NTP GMT+7, gửi Telemetry D2C, nhận lệnh C2D/Direct Methods, gọi Logic Apps Webhook khi có sự cố.
   - FreeRTOS Core 1: Đọc cảm biến chu kỳ non-blocking bằng `millis()`, E-Stop ngắt khẩn cấp Priority 3 có `vTaskDelay(20ms)` nhường CPU, lưu cấu hình vào Flash NVS (`Preferences`).
2. **Kênh Realtime & Backend**:
   - `Azure IoT Hub` nhận tin -> `Azure Functions` xử lý -> phát qua `Azure Web PubSub` tới Web Dashboard bằng chuẩn W3C WebSocket (< 50ms).
   - Lệnh điều khiển từ Web -> gọi `POST /api/control` (Azure Functions) -> kích hoạt Direct Method / Device Twin tới ESP32.
   - IoT Hub bật Message Routing định tuyến tự động vào Azure Blob Storage lưu lịch sử JSON vĩnh viễn.
3. **Web Dashboard**:
   - React 19 + TypeScript + SVG Chart chống giật chuột (Zero-Jitter, fixed minHeight, pointerEvents="none").
   - Pending action lock ref chống giật UI.
   - Tự động phát hiện offline > 5 phút gửi đúng 1 email duy nhất (chống spam).

---

## 4. SKILLS & PLUGINS CẦN THIẾT

- **`graphify`**: Knowledge Graph codebase.
- **`azure` / `az-cli`**: Quản lý tài nguyên Azure từ CLI.
- **`chrome-devtools`**: Debug giao diện, WebSocket, memory.
- **`modern-web-guidance`**: Chuẩn React 19, CSS hiện đại.
- **`gemini-api-dev`**: Tích hợp AI phân tích dữ liệu.

