# 🛡️ DESIGN SYSTEM & UI SCREENS SPECIFICATION
**Project:** HeThongTrongTrom (Smart IoT Intrusion Detection System)  
**Cloud Ecosystem:** 100% Microsoft Azure (IoT Hub, Web PubSub, Table Storage, SWA, Logic Apps)  
**Hardware Actuators:** ESP32 Dual-Core, HC-SR04 Sonar, HC-SR501 PIR, SG90 Servo Lock, 5V Relay Power-Gating, LCD 1602 I2C  
**Target Platform:** Google Stitch / Web Dashboard / Mobile Companion / Presentation Slides  

---

## 1. DESIGN THEME & VISUAL FOUNDATIONS

### 1.1 Aesthetic Direction: Enterprise Cyber-Security Dark Glassmorphism
The visual interface reflects a mission-critical 24/7 industrial security monitoring station: ultra-clean, high-contrast, zero-distraction dark mode, with luminous neon indicators and frosted glass backdrops.

- **Color Mode:** `DARK`
- **Primary Seed Color:** `#06B6D4` (Cyan Accent / Sky Luminous)
- **Neutral Background:** `#090D16` (Deep Midnight Obsidian)
- **Surface Panels:** `rgba(18, 26, 43, 0.75)` with `12px` Backdrop Blur & `1px solid rgba(255, 255, 255, 0.08)`
- **Headline Typography:** `Inter` (Font weight 700 / 800)
- **Body Typography:** `Inter` (Font weight 400 / 500 / 600)
- **Data / Metrics Typography:** `JetBrains Mono` (Font weight 600 / 700)
- **Corner Roundness:** `ROUND_TWELVE` (12px – 16px radius for glass panels)
- **Color Palette Tokens:**
  - **Primary Accent (Cyan):** `#06B6D4` / Glow `rgba(6, 182, 212, 0.4)`
  - **Success / Armed (Emerald):** `#10B981` / Glow `rgba(16, 185, 129, 0.35)`
  - **Alarm / Breach (Rose / Crimson):** `#F43F5E` / Glow `rgba(244, 63, 94, 0.6)`
  - **Warning / Unlocked (Amber):** `#F59E0B` / Glow `rgba(245, 158, 11, 0.35)`
  - **Card Hover Border:** `rgba(255, 255, 255, 0.18)`

---

## 2. SLIDE & SCREEN ARCHITECTURE (CÁC MÀN HÌNH THIẾT KẾ)

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      CẤU TRÚC 6 MÀN HÌNH / SLIDES                      │
 ├────────────────────────────────┬───────────────────────────────────────┤
 │ Slide 1: Live Security Center  │ Màn hình giám sát tổng quan thời gian │
 │                                │ thực (Default Armed & Safe State)     │
 ├────────────────────────────────┼───────────────────────────────────────┤
 │ Slide 2: Intrusion Alert State │ Màn hình báo động đỏ khẩn cấp khi     │
 │                                │ phát hiện kẻ trộm (Crimson Emergency) │
 ├────────────────────────────────┼───────────────────────────────────────┤
 │ Slide 3: Analytics & History   │ Biểu đồ cự ly siêu âm & nhật ký sự cố │
 ├────────────────────────────────┼───────────────────────────────────────┤
 │ Slide 4: Device Twin & Config  │ Hộp thoại cấu hình ngưỡng cm & chu kỳ │
 ├────────────────────────────────┼───────────────────────────────────────┤
 │ Slide 5: Mobile Security App   │ Giao diện tối ưu màn hình cảm ứng     │
 ├────────────────────────────────┼───────────────────────────────────────┤
 │ Slide 6: Architecture Showcase │ Slide trình chiếu kiến trúc phần cứng │
 │                                │ và đám mây thuần Microsoft Azure      │
 └────────────────────────────────┴───────────────────────────────────────┘
```

---

### SLIDE / SCREEN 1: TRUNG TÂM GIÁM SÁT AN NINH THỜI GIAN THỰC (LIVE DASHBOARD)
> **Mục tiêu:** Màn hình chính của hệ thống khi hoạt động bình thường, hiển thị tình trạng bảo vệ, chốt cửa an toàn và dữ liệu cảm biến trực tiếp qua WebSocket (<50ms).

#### 1. Header Bar (Thanh điều hướng trên cùng)
- **Logo:** Biểu tượng khiên bảo vệ phát sáng xanh Cyan neon (`#06B6D4`), tên hệ thống: `HỆ THỐNG AN NINH & BÁO ĐỘNG ĐỘT NHẬP (100% AZURE CLOUD)`.
- **System Tags:** Dual-Core ESP32 • IoT Hub MQTT TLS • Web PubSub • Static Web Apps.
- **Connection Badges:**
  - `WebPubSub: CONNECTED` (Chấm xanh lá nhấp nháy).
  - `ESP32: ONLINE` (Biểu tượng Wi-Fi sóng mạnh, kèm địa chỉ IP).
  - `Role: ADMIN / OPERATOR` (Easy Auth user avatar + email).

#### 2. Thẻ KPI Cảm Biến & Chấp Hành (6 Real-time Cards)
1. **Chế Độ An Ninh (Security Mode):**
   - Trạng thái: `ARMED (ĐANG BẢO VỆ)`
   - Mã màu: Xanh ngọc lục bảo (`#10B981`), biểu tượng khiên tích hợp dấu check.
   - Chú thích: "Cảm biến sẵn sàng kích hoạt còi khi phát hiện người".
2. **Chốt Khóa Cửa Thông Minh (Smart Door Lock):**
   - Trạng thái: `LOCKED - ĐÃ KHÓA (90°)`
   - Mã màu: Xanh Cyan (`#06B6D4`), biểu tượng ổ khóa đóng.
   - Chú thích: "Rơ-le 5V Power-Gating cách ly nguồn chống rung".
3. **Trạng Thái Báo Động (Alarm Status):**
   - Trạng thái: `YÊN TĨNH (BÌNH THƯỜNG)`
   - Mã màu: Slate trung tính, biểu tượng chuông đứng yên.
4. **Cảm Biến Hồng Ngoại PIR (HC-SR501):**
   - Trạng thái: `BÌNH THƯỜNG (KHÔNG CÓ NGƯỜI)`
   - Mã màu: Slate, biểu tượng con mắt yên tĩnh.
5. **Cự Ly Siêu Âm HC-SR04 (Ultrasonic Sonar):**
   - Giá trị lớn: `128 cm` (Font `JetBrains Mono` 32px Cyan).
   - Thanh tiến trình ngang (Distance Bar) hiển thị tỷ lệ trực quan, vạch ngưỡng đỏ nét đứt tại mốc `<50cm`.
6. **Mạng & Phần Cứng ESP32:**
   - IP: `192.168.1.45`, RSSI: `-58 dBm` (Sóng khỏe), Uptime: `24h 15m`.

#### 3. Bảng Điều Khiển Nhanh (Control Action Bar)
- Nút bấm `HỦY BẢO VỆ (DISARM)` (Màu đỏ Rose) / `KÍCH HOẠT BẢO VỆ (ARM)` (Màu xanh Emerald).
- Nút bấm `MỞ KHÓA CỬA (0°)` / `KHÓA CHỐT CỬA (90°)`.
- Nút bấm `LÀM MỚI` & `CẤU HÌNH THIẾT BỊ`.
- **Hiệu ứng khóa 3.5s (Pending Lock Ref):** Nút chuyển sang trạng thái loading xoay tròn trong 3.5s khi bấm để chống spam lệnh và tránh xung đột trạng thái thiết bị.

#### 4. Khu Vực Biểu Đồ & Nhật Ký
- **Bên trái (66% chiều rộng):** Biểu đồ cự ly siêu âm SVG Zero-Jitter chuẩn không giật chuột. Banner cố định 48px trên đỉnh hiển thị tọa độ thời gian thực khi rê chuột.
- **Bên phải (34% chiều rộng):** Danh sách 5 sự kiện cảnh báo gần nhất dạng thẻ bo tròn.

---

### SLIDE / SCREEN 2: BÁO ĐỘNG ĐỘT NHẬP KHẨN CẤP (INTRUSION BREACH STATE)
> **Mục tiêu:** Màn hình kích hoạt khi có kẻ trộm đột nhập (PIR phát hiện chuyển động hoặc khoảng cách Sonar vi phạm ngưỡng <50cm).

#### 1. Header & Viền Màn Hình (Emergency Aura)
- Viền màn hình chớp hiệu ứng nhịp thở màu đỏ rực (`box-shadow: 0 0 40px rgba(244, 63, 94, 0.7)`).
- Biểu tượng khiên chuyển sang màu đỏ rực kèm dấu chấm than chớp nhấp nháy 1Hz.
- Banner cảnh báo khẩn cấp toàn màn hình:
  `🚨 [PHÁT HIỆN ĐỘT NHẬP] - CÒI BÁO ĐỘNG ĐANG HÚ & ĐÃ GỬI EMAIL KHẨN CẤP!`

#### 2. Chi Tiết Sự Cố Đột Nhập
- **Nguồn Kích Hoạt (Breach Source):** Thẻ đỏ nổi bật `PIR MOTION SENSOR (GPIO 13)` hoặc `SONAR VIOLATION: 28 CM (< 50 CM)`.
- **Mốc Thời Gian:** `10:45:12 - 01/11/2026` (Múi giờ UTC+7).
- **Trạng Thái Chốt Cửa:** `ĐÃ KHÓA CHẶT (90°)` (Hệ thống tự động kích hoạt chốt khóa Servo qua rơ-le để ngăn kẻ trộm đẩy cửa).
- **Trạng Thái Thông Báo Cloud:**
  - `Azure Logic Apps: EMAIL ĐÃ GỬI TỚI phatola123@gmail.com`
  - `Azure Table Storage: ĐÃ GHI NHẬN VÀO BẢNG alerts`
  - `Màn hình LCD 1602: HIỂN THỊ "!! CANH BAO !! PHAT HIEN TROM"`

#### 3. Bảng Xử Lý Sự Cố Khẩn Cấp
- Nút bấm to màu đỏ phát sáng rực rỡ: `TẮT CÒI BÁO ĐỘNG NGAY (SILENCE SIREN)`.
- Nút bấm phụ: `XÁC NHẬN AN TOÀN & RESET HỆ THỐNG`.

---

### SLIDE / SCREEN 3: PHÂN TÍCH LỊCH SỬ & DỮ LIỆU ĐO ĐẠC (ANALYTICS & HISTORY)
> **Mục tiêu:** Cho phép người dùng và quản trị viên tra cứu toàn bộ lịch sử đo đạc cảm biến theo ngày, tuần, xuất báo cáo an ninh.

#### 1. Bộ Lọc Thời Gian
- Chọn ngày xem dữ liệu (Định dạng PartitionKey: `YYYYMMDD` theo chuẩn Azure Table Storage).
- Nút chọn nhanh: `1 Giờ Qua`, `6 Giờ Qua`, `Hôm Nay`, `7 Ngày Qua`.
- Nút `XUẤT DỮ LIỆU EXCEL / CSV`.

#### 2. Biểu Đồ Toàn Cảnh 24 Giờ (Zero-Jitter SVG Extended Chart)
- Trục X: 24 mốc giờ trong ngày.
- Trục Y: Khoảng cách cảm biến từ 0cm đến 300cm.
- Dải màu Gradient xanh Cyan thể hiện sự dịch chuyển bình thường của môi trường.
- Các vạch đỏ đánh dấu sự cố (Incident Markers) tại những thời điểm xảy ra báo động đột nhập.
- Đường đỏ nét đứt thể hiện ngưỡng báo động cố định (`Threshold: 50cm`).

#### 3. Bảng Nhật Ký Cảnh Báo Toàn Diện (Full Alerts Table)
- Các cột dữ liệu:
  - `Thời Gian` (Ngày giờ chi tiết).
  - `Thiết Bị` (`esp32_device_01`).
  - `Cảm Biến Kích Hoạt` (PIR / Siêu âm Sonar).
  - `Khoảng Cách Lúc Đột Nhập` (`xx cm`).
  - `Trạng Thái Cửa` (Đã khóa / Mở).
  - `Hành Động Khắc Phục` (Tự động tắt sau 60s / Chủ nhà bấm tắt trên Web).

---

### SLIDE / SCREEN 4: HỘP THOẠI CẤU HÌNH DEVICE TWIN (ADMIN SETTINGS MODAL)
> **Mục tiêu:** Giao diện chuyên biệt dành cho tài khoản Admin để hiệu chỉnh các thông số hoạt động của ESP32 thông qua Azure IoT Hub Device Twin.

#### 1. Giao Diện Modal Nổi (Glassmorphism Modal)
- Nền mờ tối (`backdrop-filter: blur(8px)`), khung viền phát sáng nhẹ.
- Tiêu đề: `Cấu Hình Thiết Bị & Ngưỡng An Ninh (Device Twin)`.

#### 2. Các Trường Cấu Hình
1. **Khoảng Cách Ngưỡng Báo Động (Distance Threshold):**
   - Ô nhập số kèm thanh trượt (Slider): từ `10 cm` đến `300 cm`.
   - Giá trị đề xuất mặc định: `50 cm`.
   - Mô tả hướng dẫn: "Khi hệ thống ở trạng thái Armed, nếu phát hiện vật cản lại gần dưới khoảng cách này, còi sẽ lập tức hú và gửi email".
2. **Chu Kỳ Gửi Telemetry (Telemetry Frequency):**
   - Lựa chọn: `10 giây`, `15 giây (Khuyến nghị)`, `30 giây`, `60 giây`.
   - Chú thích tối ưu: "15 giây là mốc tối ưu nhất cho gói Azure IoT Hub Free F1 (đảm bảo $\le$ 5.760 / 8.000 tin nhắn mỗi ngày)".
3. **Đồng Bộ Hai Chiều (Desired vs Reported State):**
   - Bảng nhỏ hiển thị thông số Desired (Cloud yêu cầu) và Reported (ESP32 đã áp dụng).

#### 3. Nút Thao Tác
- `HỦY BỎ`.
- `LƯU VÀ ĐỒNG BỘ TỚI ESP32` (Kèm hiệu ứng loading khi gọi API SWA Managed).

---

### SLIDE / SCREEN 5: GIAO DIỆN ĐIỀU KHIỂN TRÊN ĐIỆN THOẠI (MOBILE COMPANION VIEW)
> **Mục tiêu:** Thiết kế giao diện dọc (Mobile Portrait 390x844px) dành cho chủ nhà kiểm soát an ninh từ xa bằng điện thoại thông minh.

#### 1. Header Rút Gọn
- Tên thiết bị `ESP32 Nhà Riêng` kèm chấm xanh Online.
- Nút chuông thông báo (kèm số badge đỏ khi có báo động).

#### 2. Khối Trạng Thái Trọng Tâm (Hero Status Card)
- Vòng tròn lớn hiển thị trực quan:
  - Khi ARMED: Vòng tròn màu xanh lá dạ quang, biểu tượng ổ khóa đóng `HỆ THỐNG AN TOÀN`.
  - Khi BÁO ĐỘNG: Vòng tròn nhấp nháy đỏ chớp giật `CẢNH BÁO XÂM NHẬP!`.

#### 3. Thẻ Chỉ Số Vuốt Ngang (Horizontal Scroll Cards)
- Thẻ Sonar: `Khoảng cách hiện tại: 125cm`.
- Thẻ PIR: `Chuyển động: Yên tĩnh`.
- Thẻ Chốt cửa: `Khóa Servo 90°`.

#### 4. Thanh Điều Khiển Ngón Cái (Bottom Thumb Action Bar)
- Thanh cố định ở đáy màn hình điện thoại gồm 2 nút bấm to dễ thao tác bằng 1 tay:
  - Nút 1: `BẬT / TẮT BẢO VỆ (ARM/DISARM)`.
  - Nút 2: `ĐÓNG / MỞ CHỐT KHÓA CỬA`.

---

### SLIDE / SCREEN 6: SƠ ĐỒ TRÌNH DIỄN KIẾN TRÚC KỸ THUẬT (TECH SHOWCASE SLIDE)
> **Mục tiêu:** Slide trình chiếu đồ họa (presentation slide) để chấm điểm dự án hoặc giới thiệu giải pháp công nghệ cho hội đồng / khách hàng.

#### 1. Tầng Phần Cứng (Hardware Layer - ESP32 Dual-Core)
- **Core 0:** Wi-Fi STA $\rightarrow$ MQTT TLS 8883 $\rightarrow$ SAS Token HMAC-SHA256 Base64 $\rightarrow$ NTP UTC+7.
- **Core 1:** 
  - PIR HC-SR501 (GPIO 13, warm-up 30s).
  - Sonar HC-SR04 (Trig GPIO 5, Echo GPIO 18 qua cầu chia áp 1kΩ/2kΩ).
  - Còi Buzzer 3V (GPIO 23) & LED Vàng 2Hz (GPIO 2) & LED Xanh Armed (GPIO 4).
  - Chốt cửa SG90 (GPIO 19) qua Rơ-le 5V Power-Gating (GPIO 25).
  - Màn hình LCD 1602 I2C (SDA 21, SCL 22, 0x27).

#### 2. Tầng Đám Mây Microsoft Azure (100% Serverless Cloud)
- **Azure IoT Hub (Free F1):** Cổng kết nối D2C Telemetry & C2D Direct Method.
- **Azure Functions (Flex Consumption Node.js v4):** Xử lý Ingest & Watchdog giám sát mất mạng > 5 phút.
- **Azure Web PubSub (Free F1):** WebSocket phát sóng dữ liệu trực tiếp < 50ms.
- **Azure Table Storage:** Lưu trữ `history`, `alerts`, `devicestate`.
- **Azure Logic Apps:** Gửi email khẩn cấp tới `phatola123@gmail.com`.

#### 3. Tầng Giao Diện Web (React 19 + TypeScript + Vite)
- Lưu trữ trên **Azure Static Web Apps (Free)** với Easy Auth RBAC.
- Biểu đồ SVG Zero-Jitter chuẩn không Cumulative Layout Shift.
- Khóa chống bấm lặp 3.5s an toàn thiết bị.

---

## 3. THÔNG SỐ TOKENS CHO STITCH MCP (STITCH IMPORT READY)

```json
{
  "theme": {
    "displayName": "HeThongTrongTrom Dark Security",
    "colorMode": "DARK",
    "customColor": "#06b6d4",
    "headlineFont": "INTER",
    "bodyFont": "INTER",
    "labelFont": "JETBRAINS_MONO",
    "roundness": "ROUND_TWELVE",
    "colorVariant": "VIBRANT",
    "overridePrimaryColor": "#06b6d4",
    "overrideSecondaryColor": "#10b981",
    "overrideTertiaryColor": "#f43f5e",
    "overrideNeutralColor": "#090d16"
  }
}
```

