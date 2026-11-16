# BÁO CÁO TÓM TẮT CẤU TRÚC KỸ THUẬT & KIẾN TRÚC WEBSITE GIÁM SÁT IOT
## Hệ Thống Báo Động Chống Trộm Thông Minh (ESP32 Dual-Core • Firebase Realtime • Azure Cold Backup)

> **Mục đích tài liệu:** Cung cấp bức tranh toàn cảnh về kiến trúc phần mềm, luồng dữ liệu, mức độ an toàn bảo mật và chất lượng mã nguồn của Dashboard Web và Firmware sau khi đã rà soát, khắc phục toàn bộ các điểm bảo mật và tối ưu băng thông.
> 
> **Lưu ý bảo mật:** Toàn bộ thông tin nhạy cảm (API Keys, Database Secrets, Tokens, Passwords) trong tài liệu đã được ẩn danh dưới dạng `<key (tên key)>`.

---

## 1. TỔNG QUAN

* **Mục đích của hệ thống**:
  * Dashboard trung tâm phục vụ giám sát và điều khiển từ xa cho **Hệ thống an ninh chống trộm thông minh IoT** (sử dụng vi điều khiển ESP32 Dual-Core).
  * Hiển thị trạng thái các cảm biến: Cảm biến chuyển động hồng ngoại thân nhiệt (PIR HC-SR501), cảm biến khoảng cách siêu âm (Sonar HC-SR04), trạng thái còi hú báo động (Active Buzzer 3V/5V nhấp nháy **2.5Hz**), trạng thái chốt cửa thông minh (Servo SG90 góc **0° Khóa / 160° Mở**) và cường độ sóng Wi-Fi (RSSI).
  * Cho phép Quản trị viên duy nhất đã xác thực: Bật/Tắt chế độ bảo vệ an ninh (ARM/DISARM), Đóng/Mở chốt khóa cửa, Tắt còi báo động khẩn cấp và Tùy chỉnh ngưỡng cự ly an toàn.
* **Công nghệ & Thư viện sử dụng**:
  * **Framework Frontend**: React 19 (`react@^19.0.0`, `react-dom@^19.0.0`) + TypeScript (`typescript@^5.6.3`) + Vite 6 (`vite@^6.0.7`).
  * **Thư viện kết nối đám mây**: Firebase Modular SDK v13 (`firebase@^13.2.0`), bao gồm `firebase/database` và `firebase/auth`.
  * **Sao lưu dự phòng (Cold Backup)**: Tự động hóa phía Server bằng **GitHub Actions** (`.github/workflows/backup-alerts.yml`) đẩy bản sao lưu hàng đêm lên **Microsoft Azure Blob Storage** (`storagetuocayhkp/chongtrom-backups`) mà không để lộ bất kỳ SAS Token nào ra trình duyệt.
  * **Công nghệ vẽ đồ thị**: SVG thuần (Native SVG), tối ưu triệt để hiện tượng giật dàn trang (CLS = 0).

---

## 2. CÂY THƯ MỤC DỰ ÁN (`web/` & Root Config)

```text
├── .github/workflows/
│   └── backup-alerts.yml        # Cronjob 01:00 sáng mỗi đêm sao lưu alerts từ Firebase sang Azure Blob
├── platformio.ini               # Cấu hình PlatformIO (có build_src_filter tách biệt main.cpp và các bài test)
├── database.rules.json          # Quy tắc bảo mật Firebase RTDB kèm .validate cho từng trường dữ liệu
├── firebase.json                # Khai báo Hosting (web/dist) & Database Rules
├── .firebaserc                  # Trỏ dự án Firebase CLI: iot-hethong-trongtrom
web/
├── index.html                   # Entry point HTML gốc (<div id="root">)
├── package.json                 # Định nghĩa dependencies (React 19, Firebase 13, Lucide)
├── tsconfig.json                # Cấu hình TypeScript compiler
├── vite.config.ts               # Cấu hình Vite build output directory "dist"
├── .env.example                 # File mẫu cấu hình biến môi trường (Không chứa SAS Token)
├── .env                         # [GITIGNORED] Chứa Firebase Public Config
├── .env.local                   # [GITIGNORED] Chứa Firebase Public Config cục bộ
└── src/
    ├── main.tsx                 # Điểm khởi chạy React DOM createRoot
    ├── App.tsx                  # Root Container: Quản lý State, chỉ mở Listeners khi đã Login, Offline 15s
    ├── types.ts                 # Định nghĩa TypeScript Interface chuẩn
    ├── firebase.ts              # Khởi tạo Firebase App, getDatabase() và getAuth()
    ├── index.css                # Toàn bộ CSS giao diện Dark Glassmorphism
    ├── lib/
    │   └── firebaseClient.ts    # Lớp kết nối Firebase (Auth, onValue listeners, cmdId control, limitToLast 50)
    └── components/
        ├── Header.tsx           # Thanh điều hướng, nhãn LIVE động (đếm giây), trạng thái ESP32, Auth Profile
        ├── KpiCards.tsx         # 6 thẻ thông số thời gian thực (ARM, Chốt 0°/160°, Còi, PIR, Sonar, RSSI)
        ├── ControlPanel.tsx     # Bảng điều khiển đóng vòng lặp (mở khóa khi ESP32 xác nhận trạng thái, timeout 8s)
        ├── DistanceChart.tsx    # Biểu đồ cự ly siêu âm SVG chống giật layout (Zero Layout Shift)
        ├── AlertsList.tsx       # Danh sách tối đa 50 sự cố mới nhất + Huy hiệu Auto-Backup Azure 01:00
        ├── AdminConfigModal.tsx # Hộp thoại Modal cấu hình ngưỡng cự ly an ninh (5cm - 100cm)
        └── LoginModal.tsx       # Modal xác thực đăng nhập Quản trị viên qua Email / Password
```

---

## 3. LUỒNG KẾT NỐI, BĂNG THÔNG & ĐỘ TRỄ THỰC TẾ

### A. Tối ưu băng thông TLS và tần suất gửi trên ESP32
* **Tái sử dụng kết nối HTTP Keep-Alive**:
  * Trong `src/main.cpp`, tác vụ mạng Core 0 sử dụng một đối tượng `HTTPClient fbHttp` duy nhất với `fbHttp.setReuse(true)` và `fbHttp.setTimeout(3000)`. Kết nối TLS được giữ mở giữa các lần gọi `GET`/`PUT`/`POST`, triệt tiêu chi phí tải lại chứng chỉ TLS (3–5 KB/lần) và giữ tổng dung lượng truyền tải nằm gọn trong hạn mức miễn phí của gói Firebase Spark (10 GB/tháng).
* **Cơ chế đẩy Telemetry theo biến động kèm Heartbeat 5s**:
  * ESP32 kiểm tra trạng thái mỗi **1 giây**. Nếu có thay đổi (`armed`, `doorLocked`, `alarm`, `pir`, `thresholdCm`, hoặc khoảng cách thay đổi $\ge 1.0\text{cm}$), ESP32 gửi `HTTP PUT` ngay lập tức.
  * Khi trạng thái hoàn toàn đứng yên, ESP32 chỉ gửi gói tin nhịp tim định kỳ mỗi **5 giây** (`FB_HEARTBEAT_MS = 5000`).
* **Độ trễ thực tế (End-to-End)**:
  * Chặng Firebase RTDB $\rightarrow$ Trình duyệt qua WebSocket: $< 100\text{ms}$.
  * Chặng Cảm biến ESP32 $\rightarrow$ Giao diện Web: **1 – 2 giây**.
  * Chặng Lệnh điều khiển từ Web $\rightarrow$ Servo/Còi trên ESP32: **0.5 – 1.5 giây** (chu kỳ poll `/security/control.json` mỗi 500ms).

### B. Cấu trúc JSON chi tiết trên Firebase Realtime Database
1. **`/security/telemetry`**:
   * `armed` (`boolean`), `doorLocked` (`boolean`: `true` = Khóa 0°, `false` = Mở 160°), `alarm` (`boolean`), `pir` (`boolean`), `distanceCm` (`float`), `thresholdCm` (`int`), `rssi` (`int`), `uptimeS` (`int`), và `ts` (`int64`: **Unix Epoch UTC tính bằng mili-giây** từ `gettimeofday()`).
2. **`/security/control`**:
   * `armed` (`boolean`), `doorLocked` (`boolean`), `silenceAlarm` (`boolean`), `cmdId` (`int64`), `lastUpdated` (`int64`).
3. **`/security/config`**:
   * `thresholdCm` (`int`: 5–100 cm), `telemetryIntervalMs` (`int`), `lastUpdated` (`int64`).
4. **`/security/alerts`**:
   * Lưu các bản ghi đột nhập, có đánh chỉ mục `.indexOn: ["timestamp"]` và truy vấn bằng `limitToLast(50)`.

---

## 4. XÁC THỰC & BẢO MẬT ĐÃ CỦNG CỐ

1. **Loại bỏ hoàn toàn SAS Token khỏi Client Bundle**:
   * Đã xóa `web/src/lib/azureBlobBackup.ts` và biến `VITE_AZURE_BLOB_SAS_URL` khỏi `.env` / `.env.example`. Không còn bất kỳ khóa bí mật Azure nào nằm trong mã JavaScript tải về trình duyệt.
   * Chuyển sang cơ chế sao lưu tự động Server-to-Server qua **GitHub Actions** (`.github/workflows/backup-alerts.yml`), chạy định kỳ mỗi đêm lúc 01:00 sáng (UTC+7) với khóa bảo mật cất giữ trong **GitHub Secrets**.
2. **Xác thực một tài khoản Quản trị viên duy nhất (Single-Admin Authentication)**:
   * Tắt tính năng tự đăng ký tài khoản mới (Disable Sign-up) trên Firebase Console để ngăn người lạ tự tạo tài khoản qua SDK.
   * Trên `web/src/App.tsx`, các listener `onValue` chỉ được đăng ký **sau khi người dùng đã đăng nhập thành công** (`if (!userEmail) return;`), đồng nhất 100% với quy tắc `.read: "auth != null"` trong `database.rules.json`.
3. **Kiểm tra hợp lệ kiểu dữ liệu (`.validate`) trong `database.rules.json`**:
   ```json
   {
     "rules": {
       "security": {
         ".read": "auth != null",
         "control": {
           ".write": "auth != null",
           "armed": { ".validate": "newData.isBoolean()" },
           "doorLocked": { ".validate": "newData.isBoolean()" },
           "silenceAlarm": { ".validate": "newData.isBoolean()" },
           "cmdId": { ".validate": "newData.isNumber()" },
           "lastUpdated": { ".validate": "newData.isNumber()" }
         },
         "config": {
           ".write": "auth != null",
           "thresholdCm": {
             ".validate": "newData.isNumber() && newData.val() >= 5 && newData.val() <= 100"
           },
           "telemetryIntervalMs": {
             ".validate": "newData.isNumber() && newData.val() >= 500 && newData.val() <= 60000"
           },
           "lastUpdated": { ".validate": "newData.isNumber()" }
         },
         "alerts": {
           ".indexOn": ["timestamp"]
         }
       }
     }
   }
   ```
4. **Ngưỡng phát hiện Offline chống báo giả (15 giây)**:
   * Nâng ngưỡng `OFFLINE_TIMEOUT_S` trên Web từ `8s` lên **`15s`** kết hợp giảm timeout HTTP phía ESP32 xuống **`3000ms`**, đảm bảo một nhịp mạng chậm hoặc nhịp tim 5s khi đứng yên không bao giờ làm giao diện báo `OFFLINE` oan.
