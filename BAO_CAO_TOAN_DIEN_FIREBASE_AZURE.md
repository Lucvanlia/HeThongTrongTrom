# BÁO CÁO TOÀN DIỆN KIẾN TRÚC HỆ THỐNG IOT HYBRID CLOUD
## Hệ Thống Báo Động Chống Trộm Thông Minh (ESP32 Dual-Core • Firebase Realtime • Microsoft Azure)

> **Mục đích tài liệu:** Báo cáo chi tiết toàn diện từ cấu hình, cách vận hành API, luồng dữ liệu, phân quyền bảo mật đến quy trình triển khai của bộ đôi nền tảng **Google Firebase** (Hot Path & Web Dashboard) và **Microsoft Azure** (Cold Storage & Automated Nightly Backup qua GitHub Actions).
>
> **Quy chuẩn bảo mật:** Toàn bộ các mã khóa bí mật, API Key, Token và chuỗi kết nối trong tài liệu được chuẩn hóa dưới dạng `<key (tên key)>` theo đúng yêu cầu bảo mật thông tin.

---

## 1. TỔNG QUAN KIẾN TRÚC HYBRID CLOUD

Dự án áp dụng mô hình **Hybrid Cloud (Đám mây lai đa nền tảng)** nhằm duy trì chi phí vận hành trong gói miễn phí (\$0/tháng), tối ưu băng thông TLS và đảm bảo an toàn khóa bí mật tuyệt đối:

```
                      +------------------------------------------+
                      |         ESP32 DUAL-CORE FIRMWARE         |
                      |  Core 0: Network Task (HTTP Keep-Alive)  |
                      |  Core 1: Sensor & Alarm Actuator Task    |
                      +--------------------+---------------------+
                                           |
        HTTP REST Keep-Alive (PUT Telemetry biến động + 5s Heartbeat / GET Control)
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                         GOOGLE FIREBASE CLOUD (HOT PATH - REALTIME)                     |
|                                                                                         |
|  1. Firebase Realtime Database (WebSocket Push Stream):                                 |
|     - /security/telemetry : Luồng cảm biến thời gian thực (PIR, Sonar, Trạng thái)      |
|     - /security/control   : Kênh điều khiển 2 chiều đóng vòng lặp (kèm cmdId & validate)|
|     - /security/alerts    : Nhật ký các sự cố đột nhập (truy vấn limitToLast 50)        |
|     - /security/config    : Cấu hình ngưỡng khoảng cách an ninh (5cm - 100cm)           |
|                                                                                         |
|  2. Firebase Authentication:                                                            |
|     - Xác thực tài khoản Quản trị viên duy nhất qua Email / Password (tắt Sign-up)      |
|                                                                                         |
|  3. Firebase Hosting:                                                                   |
|     - Phục vụ Web Dashboard (React 19 + TypeScript + Vite) toàn cầu qua CDN HTTPS       |
+---------------------+---------------------------------------------------+---------------+
                      |                                                   |
         WebSocket onValue() (Chỉ mở sau khi Login)          GitHub Actions Cron (01:00 UTC+7)
                      |                                      GET /security/alerts.json (Server-to-Server)
                      v                                                   v
+------------------------------------------+    +-----------------------------------------+
|       WEB DASHBOARD (REACT 19 + VITE)    |    |     MICROSOFT AZURE CLOUD (COLD PATH)   |
|   - UI Dark Glassmorphism, Zero-Jitter   |    |  - Storage Account: storagetuocayhkp    |
|   - Điều khiển đóng vòng lặp Telemetry   |    |  - Container: chongtrom-backups (Private|
|   - Heartbeat Ticker (Ngưỡng Offline 15s)|    |  - Lưu trữ: backup_YYYYMMDD_HHmmss.json |
|   - KHÔNG chứa SAS Token phía Client     |    |  - Bảo mật: SAS Token lưu trong GitHub  |
+------------------------------------------+    |    Secrets, không lộ ra trình duyệt     |
                                                +-----------------------------------------+
```

### Phân Định Trách Nhiệm & Độ Trễ Thực Tế
1. **Google Firebase (Hot Path & Giao diện)**:
   * Chịu trách nhiệm đồng bộ dữ liệu cảm biến và truyền nhận lệnh điều khiển (Bật/Tắt bảo vệ ARM, Đóng/Mở chốt khóa Servo 0°/160°, Tắt còi khẩn cấp).
   * **Độ trễ thực tế toàn trình (End-to-End Latency)**:
     * Chặng Firebase $\rightarrow$ Trình duyệt (WebSocket): $< 100\text{ms}$.
     * Chặng Cảm biến ESP32 $\rightarrow$ Màn hình Web: **1 – 2 giây** (ESP32 kiểm tra thay đổi trạng thái mỗi 1 giây và gửi nhịp tim mỗi 5 giây khi đứng yên).
     * Chặng Lệnh điều khiển Web $\rightarrow$ Chấp hành Servo/Còi: **0.5 – 1.5 giây** (do ESP32 poll `/security/control.json` mỗi 500ms trên kết nối HTTP Keep-Alive tái sử dụng).
2. **Microsoft Azure + GitHub Actions (Cold Path & Sao lưu tự động Server-to-Server)**:
   * Thay vì nhúng SAS Token vào mã nguồn trình duyệt (gây nguy cơ lộ token trong gói bundle JS `VITE_`), tác vụ sao lưu được thực thi hoàn toàn phía Server bằng **GitHub Actions** (`.github/workflows/backup-alerts.yml`).
   * Đúng **01:00 sáng mỗi đêm (giờ Việt Nam UTC+7)** hoặc khi kích hoạt thủ công (`workflow_dispatch`), GitHub Runner tự động trích xuất `/security/alerts.json` từ Firebase và đẩy bản chụp `backup_YYYYMMDD_HHmmss.json` lên container `chongtrom-backups` của Azure Blob Storage.

---

## 2. CÂY THƯ MỤC DỰ ÁN & DANH MỤC FILE

```text
HeThongTrongTrom-src/
├── .github/
│   └── workflows/
│       └── backup-alerts.yml   # GitHub Actions tự động sao lưu Firebase -> Azure mỗi đêm (01:00 UTC+7)
├── platformio.ini              # Cấu hình biên dịch PlatformIO (tách biệt main.cpp và các env test bằng build_src_filter)
├── database.rules.json          # Quy tắc bảo mật Firebase RTDB (chặn đọc/ghi trái phép + .validate kiểu dữ liệu)
├── firebase.json               # Cấu hình Firebase Hosting (web/dist) và Database Rules
├── .firebaserc                 # Định danh dự án Firebase CLI: iot-hethong-trongtrom
├── include/
│   ├── Config.h                # Header định nghĩa chân GPIO, ngưỡng cảnh báo, góc Servo (0°/160°) và Timer
│   ├── secrets.h               # [GITIGNORED] Chứa Wi-Fi SSID, Pass và Database Secret của Firebase
│   └── secrets.h.example       # File mẫu chứa placeholder an toàn cho GitHub
├── src/
│   ├── main.cpp                # Firmware ESP32 Dual-Core (HTTP Keep-Alive setReuse, đồng bộ biến động + 5s Heartbeat)
│   ├── test_led.cpp            # Môi trường [env:test_led] kiểm tra LED độc lập
│   ├── test_servo.cpp          # Môi trường [env:test_servo] kiểm tra góc quay Servo (0° và 160°)
│   └── test_lcd.cpp            # Môi trường [env:test_lcd] quét I2C Scanner và test màn hình LCD 1602
└── web/                        # Mã nguồn ứng dụng Web Dashboard (React 19 + TypeScript + Vite)
    ├── package.json            # Khai báo dependency (React 19, Firebase SDK 13, Lucide Icons)
    ├── vite.config.ts          # Cấu hình build Vite, đóng gói ra thư mục dist
    ├── tsconfig.json           # Cấu hình TypeScript compiler
    ├── index.html              # Entry HTML gốc
    ├── .env                    # [GITIGNORED] Biến môi trường thật chứa Firebase Public Config
    ├── .env.local              # [GITIGNORED] Biến môi trường cục bộ máy lập trình viên
    ├── .env.example            # File mẫu biến môi trường an toàn để chia sẻ
    └── src/
        ├── main.tsx            # Điểm khởi chạy React DOM
        ├── App.tsx             # Container trung tâm: Quản lý Auth, chỉ mở Listeners sau khi Login, Offline 15s
        ├── types.ts            # Định nghĩa Interface dữ liệu TypeScript
        ├── firebase.ts         # Khởi tạo Firebase App, Database và Auth
        ├── index.css           # Toàn bộ CSS giao diện Dark Glassmorphism, animations và grid
        ├── lib/
        │   └── firebaseClient.ts   # Client giao tiếp Firebase (Auth, onValue, cmdId control, limitToLast 50)
        └── components/
            ├── Header.tsx          # Thanh điều hướng, nhãn LIVE động, nhịp tim thiết bị
            ├── KpiCards.tsx        # 6 thẻ KPI thông số tức thời (ARM, Khóa 0°/160°, Còi, PIR, Sonar, IP)
            ├── ControlPanel.tsx    # Bảng điều khiển đóng vòng lặp (mở khóa khi ESP32 xác nhận, timeout 8s)
            ├── DistanceChart.tsx   # Biểu đồ cự ly siêu âm SVG chống giật layout (Zero-Jitter)
            ├── AlertsList.tsx      # Danh sách cảnh báo đột nhập + Huy hiệu trạng thái Auto-Backup Azure 01:00
            ├── AdminConfigModal.tsx# Hộp thoại Modal cấu hình ngưỡng cự ly an ninh
            └── LoginModal.tsx      # Modal xác thực đăng nhập Quản trị viên Email / Password
```

---

## 3. CẤU HÌNH & CÁCH VẬN HÀNH GOOGLE FIREBASE

### A. Firebase Hosting
* **Cấu hình file `firebase.json`**:
  ```json
  {
    "database": {
      "rules": "database.rules.json"
    },
    "hosting": {
      "public": "web/dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  }
  ```

### B. Xác Thực Tài Khoản Quản Trị Viên Duy Nhất (Single-Admin Authentication)
* **Phương thức kích hoạt**: Email / Password trên Firebase Authentication.
* **Khóa đăng ký tài khoản mới (Disable Sign-up)**:
  * Trên Firebase Console $\rightarrow$ **Authentication** $\rightarrow$ **Settings** $\rightarrow$ **User actions** $\rightarrow$ Bỏ chọn **"Enable create (sign-up)"**. Khi tắt tính năng tự đăng ký, không ai bên ngoài có thể dùng Firebase Client SDK để tự tạo tài khoản mới; chỉ duy nhất tài khoản Quản trị viên được tạo sẵn trong Console mới có thể đăng nhập.
* **Cách vận hành đồng bộ với Security Rules**:
  1. Khi người dùng mở Dashboard mà chưa đăng nhập (`userEmail === null`), `App.tsx` **không mở kết nối `onValue` tới Realtime Database** (tránh lỗi Permission Denied) và hiển thị băng rôn yêu cầu xác thực Quản trị viên, toàn bộ nút bấm điều khiển bị vô hiệu hóa.
  2. Khi quản trị viên đăng nhập qua [LoginModal.tsx](file:///d:/HeThongTrongTrom/HeTrongTrongTrom-src/web/src/components/LoginModal.tsx) (`signInWithEmailAndPassword`), `App.tsx` mới kích hoạt các luồng `subscribeTelemetry`, `subscribeStatus`, `subscribeAlerts` và `subscribeConfig`.

### C. Quy Tắc Bảo Mật Realtime Database (`database.rules.json`)
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
> **Tùy chọn khóa cứng theo UID:** Có thể thay `"auth != null"` bằng `"auth != null && auth.uid === '<key ADMIN_UID>'"` để khóa cứng tuyệt đối cho 1 UID duy nhất ngay cả khi quên tắt tính năng Sign-up.
* **Kiểm tra hợp lệ dữ liệu (`.validate`)**:
  * Mọi trường trong `/security/control` (`armed`, `doorLocked`, `silenceAlarm` kiểu boolean; `cmdId`, `lastUpdated` kiểu number) và `/security/config` (`thresholdCm` từ 5 đến 100) đều được kiểm tra kiểu nghiêm ngặt trước khi cho phép ghi.
  * Nhánh `/security/telemetry` và `/security/alerts` không có quyền `.write` cho client Web — chỉ ESP32 mới được phép ghi.

### D. Đặc Tả Chi Tiết Các Endpoint Realtime Database & Tối Ưu Băng Thông ESP32

#### 1. Tối Ưu Hóa Băng Thông TLS Phía ESP32 (Đảm bảo gói miễn phí Spark 10GB/tháng)
* **Tái sử dụng kết nối (HTTP Keep-Alive)**: Trong `src/main.cpp`, Core 0 khởi tạo một đối tượng `HTTPClient fbHttp` duy nhất với `fbHttp.setReuse(true)` và `fbHttp.setTimeout(3000)`. Thay vì bắt tay TLS (handshake 3–5 KB chứng chỉ) lại từ đầu cho mỗi chu kỳ 500ms/1s, kết nối TLS được giữ sống và tái sử dụng xuyên suốt các lệnh `GET`/`PUT`/`POST`.
* **Gửi Telemetry thông minh theo biến động**:
  * ESP32 kiểm tra trạng thái cảm biến mỗi **1 giây** (`FB_STREAM_INTERVAL_MS = 1000`).
  * Nếu có bất kỳ thay đổi nào (`armed`, `doorLocked`, `alarm`, `pir`, `thresholdCm`, hoặc độ lệch khoảng cách `|distanceCm - lastSentDist| >= 1.0cm`), ESP32 đẩy gói tin `PUT` ngay lập tức (độ trễ hiển thị $\le 1\text{s}$).
  * Nếu hệ thống đứng yên không có biến động, ESP32 chỉ gửi gói tin nhịp tim định kỳ mỗi **5 giây** (`FB_HEARTBEAT_MS = 5000`), giúp tiết kiệm hơn 80% băng thông hàng tháng.

#### 2. Endpoint: `/security/telemetry.json`
* **Cấu trúc dữ liệu**:
  ```json
  {
    "armed": true,
    "doorLocked": true,
    "alarm": false,
    "pir": false,
    "distanceCm": 8.4,
    "thresholdCm": 12,
    "rssi": -58,
    "uptimeS": 3600,
    "ts": 1731657600000
  }
  ```
* **Ý nghĩa từng trường**:
  * `armed` (`boolean`): Chế độ an ninh (`true`: Đang bật bảo vệ; `false`: Đang giải trừ).
  * `doorLocked` (`boolean`): Trạng thái chốt cửa thông minh (`true`: Đóng khóa 0°; `false`: Mở chốt 160°).
  * `alarm` (`boolean`): Trạng thái báo động (`true`: Còi hú và đèn đỏ nhấp nháy **2.5Hz** — chu kỳ 200ms ON / 200ms OFF trong `alarmOutputTask`; `false`: Yên tĩnh).
  * `pir` (`boolean`): Trạng thái cảm biến hồng ngoại (`true`: Có thân nhiệt chuyển động).
  * `distanceCm` (`number`): Khoảng cách đo từ HC-SR04 (cm), giá trị `-1.0` nếu ngoài phạm vi.
  * `thresholdCm` (`number`): Ngưỡng kích hoạt báo động hiện tại (cm).
  * `rssi` (`number`): Cường độ sóng Wi-Fi của ESP32 (dBm).
  * `uptimeS` (`number`): Thời gian hoạt động liên tục từ lúc khởi động (giây).
  * `ts` (`number`): **Unix Epoch UTC (mili-giây)** lấy từ hàm `gettimeofday()` sau khi đồng bộ NTP (`configTime` chỉ đặt múi giờ UTC+7 cho hàm hiển thị giờ địa phương, còn epoch timestamp luôn chuẩn UTC quốc tế).

#### 3. Endpoint: `/security/control.json`
* **Giao thức**: Web gửi `HTTP PATCH/update()`; ESP32 đọc bằng `HTTP GET` chu kỳ 500ms qua kết nối Keep-Alive.
* **Cấu trúc dữ liệu**:
  ```json
  {
    "armed": true,
    "doorLocked": true,
    "silenceAlarm": false,
    "cmdId": 1731657612345,
    "lastUpdated": 1731657612345
  }
  ```
* **Cơ chế chống xung đột `cmdId`**:
  * Mỗi khi Web phát lệnh, trường `cmdId` được gán bằng `Date.now()`.
  * Khi mới khởi động, ESP32 đọc `cmdId` hiện tại và gán vào `lastCmdId` (`cmdInit = true`) để **bỏ qua lệnh cũ tồn đọng**, giữ nguyên trạng thái công tắc vật lý. Chỉ khi nhận `cmdId != lastCmdId`, ESP32 mới thực thi lệnh mới.

#### 4. Endpoint: `/security/alerts.json` & `/security/config.json`
* `/security/alerts.json`: ESP32 gửi `HTTP POST` ngay khi phát hiện đột nhập; Web đọc 50 bản ghi mới nhất qua `query(ref, orderByChild('timestamp'), limitToLast(50))`.
* `/security/config.json`: ESP32 đọc mỗi 5 giây (`pollFirebaseConfig`), cập nhật `thresholdCm` và lưu vào bộ nhớ Flash NVS (`Preferences`).

---

## 4. CẤU HÌNH & VẬN HÀNH MICROSOFT AZURE BLOB STORAGE (TỰ ĐỘNG QUA GITHUB ACTIONS)

### A. Tài Nguyên Lưu Trữ Lạnh (Cold Storage)
* **Storage Account**: `storagetuocayhkp`
* **Blob Container**: `chongtrom-backups` (Mức độ truy cập: **Private**).

### B. Kiến Trúc Sao Lưu Tự Động Server-to-Server (Không lộ SAS Token ra Client)
Để khắc phục triệt để rủi ro lộ SAS Token nếu nhúng vào biến `VITE_` phía trình duyệt:
1. **Thu hồi SAS Token cũ và tạo SAS Token tối thiểu quyền**:
   * Trên Azure Portal, xoay (rotate) Account Key hoặc dùng **Stored Access Policy** để thu hồi token cũ đã tạo lúc thử nghiệm.
   * Tạo SAS Token mới chỉ cấp quyền **Create / Write (`sp=cw`)**, giao thức `HTTPS only`, và lưu hoàn toàn trong **GitHub Actions Secrets** (không bao giờ xuất hiện trong mã nguồn Web hay trình duyệt).
2. **Quy trình tự động hóa (`.github/workflows/backup-alerts.yml`)**:
   ```yaml
   name: backup-alerts

   on:
     schedule:
       - cron: "0 18 * * *" # Chay tu dong luc 01:00 sang gio Viet Nam (UTC+7) moi dem
     workflow_dispatch:     # Cho phep bam chay thu cong tren giao dien GitHub Actions

   jobs:
     backup:
       runs-on: ubuntu-latest
       steps:
         - name: Fetch alerts from Firebase & Upload to Azure Blob Storage
           run: |
             curl -sf "https://${{ secrets.FIREBASE_HOST }}/security/alerts.json?auth=${{ secrets.FIREBASE_AUTH }}" -o alerts.json
             F="backup_$(date -u +%Y%m%d_%H%M%S).json"
             curl -sf -X PUT \
               -H "x-ms-blob-type: BlockBlob" \
               -H "Content-Type: application/json" \
               --data-binary @alerts.json \
               "${{ secrets.AZURE_BLOB_URL }}/$F?${{ secrets.AZURE_SAS }}"
   ```
3. **Ưu điểm vượt trội**:
   * **Bảo mật 100%**: Khóa `FIREBASE_AUTH` và `AZURE_SAS` nằm kín trên máy chủ GitHub Secrets.
   * **Tự động hóa hoàn toàn**: Tự động sao lưu định kỳ mỗi đêm mà không cần người quản trị phải mở trình duyệt bấm nút thủ công, đồng thời sao lưu **toàn bộ nhật ký cảnh báo** trực tiếp từ cơ sở dữ liệu gốc thay vì chỉ 50 bản ghi trên trình duyệt.

---

## 5. DANH SÁCH BIẾN MÔI TRƯỜNG & KHÓA BẢO MẬT (SECRET KEYS)

| Vị trí lưu trữ | Tên biến / Định danh | Giá trị quy ước tài liệu | Phân loại & Chức năng |
| :--- | :--- | :--- | :--- |
| `web/.env` | `VITE_FIREBASE_API_KEY` | `<key VITE_FIREBASE_API_KEY>` | Public Config định danh Firebase Web App |
| `web/.env` | `VITE_FIREBASE_AUTH_DOMAIN` | `<key VITE_FIREBASE_AUTH_DOMAIN>` | Domain xử lý xác thực Firebase Auth |
| `web/.env` | `VITE_FIREBASE_DATABASE_URL`| `<key VITE_FIREBASE_DATABASE_URL>`| URL cơ sở dữ liệu Realtime Database |
| `web/.env` | `VITE_FIREBASE_PROJECT_ID`  | `<key VITE_FIREBASE_PROJECT_ID>`  | ID dự án trên Google Cloud Platform |
| `web/.env` | `VITE_FIREBASE_STORAGE_BUCKET`| `<key VITE_FIREBASE_STORAGE_BUCKET>`| Bucket lưu trữ Cloud Storage |
| `web/.env` | `VITE_FIREBASE_MESSAGING_SENDER_ID`| `<key VITE_FIREBASE_MESSAGING_SENDER_ID>`| Mã định danh Sender ID |
| `web/.env` | `VITE_FIREBASE_APP_ID`      | `<key VITE_FIREBASE_APP_ID>`      | App ID ứng dụng Web |
| `include/secrets.h` | `FIREBASE_HOST`    | `<key FIREBASE_HOST>`    | [BÍ MẬT] Hostname của Firebase RTDB cho ESP32 |
| `include/secrets.h` | `FIREBASE_AUTH`    | `<key FIREBASE_AUTH>`    | [BÍ MẬT] Database Secret cho ESP32 |
| `include/secrets.h` | `WIFI_SSID`        | `<key WIFI_SSID>`        | [BÍ MẬT] Tên mạng Wi-Fi phát sóng |
| `include/secrets.h` | `WIFI_PASS`        | `<key WIFI_PASS>`        | [BÍ MẬT] Mật khẩu mạng Wi-Fi |
| `GitHub Secrets` | `AZURE_BLOB_URL`      | `<key AZURE_BLOB_URL>`   | [BÍ MẬT SERVER] URL Container `chongtrom-backups` |
| `GitHub Secrets` | `AZURE_SAS`           | `<key AZURE_SAS>`        | [BÍ MẬT SERVER] SAS Token chỉ ghi từ GitHub Actions |

---

## 6. THIẾT KẾ GIAO DIỆN & TỐI ƯU TRẢI NGHIỆM (UI/UX)

1. **Chuẩn Zero-Jitter SVG Distance Chart**:
   * Khung vẽ SVG cố định chiều cao banner `minHeight: 48px` để triệt tiêu hoàn toàn hiện tượng nhảy bố cục (CLS = 0).
   * Lớp phủ `<rect fill="transparent" pointerEvents="all">` bắt tọa độ chuột mượt mà 100%.
2. **Khóa Đóng Vòng Lặp Telemetry (State Confirmation)**:
   * Nút bấm chuyển sang trạng thái xoay loading và **chờ Telemetry từ ESP32 xác nhận đã đổi trạng thái** mới tự động mở khóa, kèm timeout bảo vệ 8 giây.
3. **Phát Hiện Thiết Bị Offline Chính Xác (Ngưỡng 15 Giây)**:
   * Để tương thích với cơ chế gửi nhịp tim 5 giây của ESP32 và tránh báo `OFFLINE` giả khi có một request HTTP bị trễ mạng (timeout 3s), ngưỡng phát hiện mất kết nối trên Web (`OFFLINE_TIMEOUT_S`) được thiết lập ở mức **15 giây** (tương đương bỏ lỡ 3 nhịp tim liên tiếp).
4. **Chuẩn Hóa Góc Xoay Servo SG90**:
   * Khóa an toàn: **0°** (Chốt đóng chặt).
   * Mở chốt cửa: **160°** (Chốt mở toang dứt khoát).

---

## 7. QUY TRÌNH BIÊN DỊCH & TRIỂN KHAI VẬN HÀNH

### A. Nạp Firmware ESP32 (Tách biệt môi trường bằng `build_src_filter`)
Trong `platformio.ini`, môi trường chính `esp32doit-devkit-v1` đã được cấu hình `build_src_filter = +<main.cpp> -<test_led.cpp> -<test_servo.cpp> -<test_lcd.cpp>` để không bao giờ xung đột hàm `setup()/loop()` với các file test phần cứng:
```powershell
# 1. Biên dịch kiểm tra mã nguồn C++
& "$env:USERPROFILE\.platformio\penv\Scripts\pio.exe" run -e esp32doit-devkit-v1

# 2. Nạp vào board ESP32 kết nối cổng COM
& "$env:USERPROFILE\.platformio\penv\Scripts\pio.exe" run -e esp32doit-devkit-v1 -t upload
```

### B. Đóng Gói & Triển Khai Production Lên Firebase
```powershell
# 1. Đóng gói kiểm tra kiểu TypeScript và build Vite
cd web
npm run build

# 2. Triển khai Hosting và Database Rules lên đám mây
cd ..
npx firebase-tools deploy --only database,hosting
```
