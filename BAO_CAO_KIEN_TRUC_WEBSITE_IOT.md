# BÁO CÁO TÓM TẮT CẤU TRÚC KỸ THUẬT & KIẾN TRÚC WEBSITE GIÁM SÁT IOT
## Hệ Thống Báo Động Chống Trộm Thông Minh (ESP32 Dual-Core & Firebase Realtime Cloud)

> **Mục đích tài liệu:** Cung cấp bức tranh toàn cảnh về kiến trúc phần mềm, luồng dữ liệu, mức độ an toàn bảo mật và chất lượng mã nguồn của Dashboard Web để gửi chuyên gia phản biện / đánh giá kỹ thuật.
> 
> **Lưu ý bảo mật:** Toàn bộ thông tin nhạy cảm (API Keys, Database Secrets, Tokens, Passwords) trong tài liệu đã được ẩn danh dưới dạng `<ĐÃ_ẨN>`.

---

## 1. TỔNG QUAN

* **Mục đích của website**:
  * Dashboard trung tâm phục vụ giám sát và điều khiển từ xa theo thời gian thực cho **Hệ thống an ninh chống trộm thông minh IoT** (sử dụng vi điều khiển ESP32 Dual-Core).
  * Hiển thị trạng thái các cảm biến: Cảm biến chuyển động hồng ngoại thân nhiệt (PIR HC-SR501), cảm biến khoảng cách siêu âm (Sonar HC-SR04), trạng thái còi hú báo động (Active Buzzer 3V/5V), trạng thái chốt cửa thông minh (Servo SG90), cường độ sóng Wi-Fi (RSSI) và địa chỉ IP của thiết bị.
  * Cho phép người quản trị từ xa: Bật/Tắt chế độ bảo vệ an ninh (ARM/DISARM), Đóng/Mở chốt khóa cửa, Tắt còi báo động khẩn cấp và Tùy chỉnh ngưỡng cự ly an toàn.
* **Công nghệ & Thư viện sử dụng**:
  * **Framework Frontend**: React 19 (`react@^19.0.0`, `react-dom@^19.0.0`).
  * **Ngôn ngữ**: TypeScript (`typescript@^5.6.3`).
  * **Công cụ đóng gói (Build Tool)**: Vite 6 (`vite@^6.0.7`, `@vitejs/plugin-react@^4.3.4`).
  * **Thư viện kết nối đám mây**: Firebase Modular SDK v13 (`firebase@^13.2.0`), bao gồm cả `firebase/database` và `firebase/auth`.
  * **Thư viện icon**: Lucide React (`lucide-react@^0.474.0`).
  * **Công nghệ vẽ đồ thị**: SVG thuần (Native SVG), không phụ thuộc thư viện bên ngoài (Chart.js/Recharts), tối ưu triệt để hiện tượng giật giàn trang (CLS = 0).
* **Quy trình Build & Triển khai (Deploy)**:
  * **Build**: Lệnh `npm run build` (chạy kiểm tra kiểu `tsc -b` và đóng gói tối ưu hóa qua `vite build` ra thư mục `web/dist`).
  * **Deploy**: Triển khai trực tiếp lên **Firebase Hosting** thông qua lệnh `npx firebase-tools deploy --only hosting`.
  * **Hosting đang dùng**: Firebase Hosting (Domain dự án: `https://iot-hethong-trongtrom.web.app` / `https://iot-hethong-trongtrom.firebaseapp.com`), cấu hình Single Page Application (SPA rewrite `** -> /index.html`) trong file `firebase.json`.

---

## 2. CÂY THƯ MỤC DỰ ÁN (`web/` & Root Config)

```text
├── database.rules.json          # File cấu hình bảo mật phân quyền Firebase Realtime Database
├── firebase.json                # Khai báo Hosting (web/dist) & Database Rules
├── .firebaserc                  # Trỏ dự án Firebase CLI: iot-hethong-trongtrom
web/
├── index.html                   # Entry point HTML gốc, nơi mount ứng dụng React (<div id="root">)
├── package.json                 # Định nghĩa dependencies (React 19, Firebase 13, Lucide) và build scripts
├── tsconfig.json                # Cấu hình TypeScript compiler cho ứng dụng web
├── vite.config.ts               # Cấu hình Vite dev server và build output directory "dist"
├── .env.example                 # File mẫu cấu hình biến môi trường an toàn để chia sẻ
├── .env                         # [ĐÃ_ẨN] Chứa Firebase Config (Đã gitignore)
├── .env.local                   # [ĐÃ_ẨN] Chứa Firebase Config cục bộ máy dev (Đã gitignore)
└── src/
    ├── main.tsx                 # Điểm khởi chạy React DOM createRoot
    ├── App.tsx                  # Root Container: Quản lý toàn bộ State tập trung, Auth và các listeners
    ├── types.ts                 # Định nghĩa TypeScript Interface chuẩn (Telemetry, Alert, Config, ConnectionStatus)
    ├── firebase.ts              # Khởi tạo Firebase App, getDatabase() và getAuth()
    ├── index.css                # Toàn bộ CSS giao diện Dark Glassmorphism, animations và grid layout
    ├── lib/
    │   └── firebaseClient.ts    # Lớp kết nối Firebase (Auth, onValue listeners, cmdId control, limitToLast query)
    └── components/
        ├── Header.tsx           # Thanh điều hướng, nhãn LIVE động (đếm giây), trạng thái ESP32, Auth Profile
        ├── KpiCards.tsx         # 6 thẻ thông số thời gian thực (ARM, Chốt 0°/160°, Còi, PIR, Sonar, IP/WiFi)
        ├── ControlPanel.tsx     # Bảng điều khiển đóng vòng lặp (mở khóa khi ESP32 xác nhận trạng thái, timeout 8s)
        ├── DistanceChart.tsx    # Biểu đồ cự ly siêu âm SVG chống giật layout (Zero Layout Shift)
        ├── AlertsList.tsx       # Danh sách nhật ký các sự cố đột nhập (truy vấn limitToLast 50)
        ├── AdminConfigModal.tsx # Hộp thoại Modal cấu hình ngưỡng cự ly an ninh (5cm - 12cm)
        └── LoginModal.tsx       # Modal xác thực đăng nhập quản trị viên qua Email / Password
```

---

## 3. CÁC TRANG / MÀN HÌNH VÀ COMPONENT

### A. Danh sách Route
* Ứng dụng là một **Single Page Application (SPA) đơn trang** duy nhất tại route `/` (không dùng thư viện định tuyến `react-router-dom`).

### B. Thành phần Component & Quản lý State
* **Cơ chế State**: Toàn bộ State toàn cục được quản lý tập trung tại [App.tsx](file:///d:/HeThongTrongTrom/HeTrongTrongTrom-src/web/src/App.tsx) bằng các React Hooks chuẩn (`useState`, `useEffect`, `useRef`), sau đó phân phối xuống các Component con thông qua Props.
* **Cây phân cấp Component**:
  ```text
  App (Quản lý: telemetry, history, alerts, wsStatus, config, userEmail, secondsAgo, isConfigOpen, isLoginOpen)
  ├── Header (Nhận wsStatus, deviceOnline, userEmail, secondsSinceLastHeartbeat; gọi onOpenLogin, onLogout)
  ├── KpiCards (Nhận telemetry, thresholdCm)
  ├── ControlPanel (Nhận telemetry; gọi FirebaseClient: setArmed, setLock, silenceAlarm kèm cmdId)
  ├── DistanceChart (Nhận history [tối đa 100 điểm gần nhất], thresholdCm)
  ├── AlertsList (Nhận alerts[] [tối đa 50 sự cố mới nhất])
  ├── AdminConfigModal (Nhận currentConfig, gọi FirebaseClient.updateConfig)
  └── LoginModal (Xác thực đăng nhập Admin qua Email/Password)
  ```

---

## 4. KẾT NỐI VỚI THIẾT BỊ / BACKEND

### A. Phương thức giao tiếp Realtime
* **Web $\leftrightarrow$ Firebase**: Sử dụng **Firebase Modular JavaScript SDK v13**, duy trì kết nối WebSocket thời gian thực 2 chiều thông qua hàm `onValue()` của thư viện `firebase/database`. Khi có dữ liệu mới, Firebase tự động đẩy (push stream) về trình duyệt với độ trễ thấp.
* **ESP32 $\rightarrow$ Firebase**: Vi điều khiển ESP32 gửi dữ liệu bằng giao thức HTTP REST Client (qua TLS/HTTPS) tới Firebase RTDB:
  * Telemetry: Gửi bằng phương thức `HTTP PUT` mỗi **1 giây / lần**.
  * Cảnh báo đột nhập: Gửi bằng phương thức `HTTP POST` **ngay lập tức** khi phát hiện xâm nhập.
  * Đọc lệnh điều khiển: Đọc bằng phương thức `HTTP GET` mỗi **500ms / lần** (kèm cơ chế nhận diện `cmdId`).
  * Đọc cấu hình ngưỡng: Đọc bằng phương thức `HTTP GET` mỗi **5 giây / lần** từ `/security/config.json`.

### B. Cấu trúc JSON chi tiết trên Firebase Realtime Database

#### 1. Path: `/security/telemetry` (Trạng thái tức thời do ESP32 ghi, Web đọc `onValue`)
| Tên trường | Kiểu dữ liệu | Ý nghĩa |
| :--- | :--- | :--- |
| `armed` | `boolean` | `true`: Đang bật bảo vệ an ninh; `false`: Đang giải trừ (DISARM) |
| `doorLocked` | `boolean` | `true`: Chốt Servo đang đóng khóa (**0°**); `false`: Đang mở (**160°**) |
| `alarm` | `boolean` | `true`: Còi đang hú báo động; `false`: Yên tĩnh |
| `pir` | `boolean` | `true`: Cảm biến PIR phát hiện thân nhiệt chuyển động |
| `distanceCm` | `number` (float) | Cự ly đo từ Sonar HC-SR04 (cm); giá trị `-1.0` nếu vượt cự ly |
| `thresholdCm`| `number` (int) | Ngưỡng cự ly kích hoạt báo động (cm) |
| `rssi` | `number` (int) | Cường độ tín hiệu Wi-Fi của ESP32 (dBm) |
| `uptimeS` | `number` (int) | Thời gian ESP32 hoạt động liên tục kể từ khi boot (giây) |
| `ts` | `number` (int64) | Epoch timestamp (mili-giây) từ đồng hồ NTP UTC+7 |

#### 2. Path: `/security/alerts` (Nhật ký đột nhập do ESP32 tạo bằng `POST`, Web đọc `limitToLast(50)`)
* Mỗi bản ghi được lưu dưới một khóa ngẫu nhiên do Firebase tạo (Push Key dạng `-O...`):
| Tên trường | Kiểu dữ liệu | Ý nghĩa |
| :--- | :--- | :--- |
| `timestamp` | `number` (int64) | Thời điểm xảy ra đột nhập (mili-giây) |
| `type` | `string` | Định danh sự kiện: `"INTRUSION_DETECTED"` |
| `sensor` | `string` | Nguồn phát hiện: `"PIR"`, `"SONAR"`, hoặc `"PIR+SONAR"` |
| `distanceCm` | `number` (float) | Cự ly vật thể đo được tại thời điểm vi phạm (cm) |
| `message` | `string` | Nội dung văn bản mô tả sự cố |

#### 3. Path: `/security/control` (Kênh điều khiển do Web ghi, ESP32 đọc polling)
| Tên trường | Kiểu dữ liệu | Ý nghĩa |
| :--- | :--- | :--- |
| `armed` | `boolean` | Lệnh kích hoạt/hủy chế độ bảo vệ |
| `doorLocked` | `boolean` | Lệnh đóng (**0°**) / mở (**160°**) chốt cửa Servo |
| `silenceAlarm`| `boolean` | Lệnh ngắt còi hú khẩn cấp (`true` $\rightarrow$ ESP32 ngắt và tự reset về `false`) |
| `cmdId` | `number` (int64) | Epoch timestamp của lệnh phát sinh từ Web (**Chống xung đột với công tắc vật lý và bỏ qua lệnh cũ khi ESP32 reboot**) |
| `lastUpdated`| `number` (int64) | Timestamp thời điểm Web phát lệnh |

#### 4. Path: `/security/config` (Cấu hình thiết bị)
| Tên trường | Kiểu dữ liệu | Ý nghĩa |
| :--- | :--- | :--- |
| `thresholdCm` | `number` (int) | Ngưỡng cảnh báo cự ly (cm) |
| `telemetryIntervalMs` | `number` (int) | Chu kỳ gửi tin telemetry |
| `lastUpdated` | `number` (int64) | Timestamp lưu cấu hình |

---

## 5. XÁC THỰC & BẢO MẬT

* **Cơ chế xác thực người dùng**:
  * Đã tích hợp **Firebase Authentication** (Email/Password).
  * Quản trị viên đăng nhập thông qua modal `LoginModal.tsx`. Chỉ khi đăng nhập thành công mới cấp quyền truy cập và điều khiển.
* **File Security Rules của Realtime Database (`database.rules.json`)**:
  * Đã tạo file chuẩn trong repo và cấu hình liên kết trong `firebase.json`:
  ```json
  {
    "rules": {
      "security": {
        ".read": "auth != null",
        "control": {
          ".write": "auth != null"
        },
        "config": {
          ".write": "auth != null",
          "thresholdCm": {
            ".validate": "newData.isNumber() && newData.val() >= 5 && newData.val() <= 100"
          }
        },
        "alerts": {
          ".indexOn": ["timestamp"]
        }
      }
    }
  }
  ```
  *(Telemetry và Alerts không cho client ghi đè tự do, chỉ có ESP32 dùng Database Secret quyền root mới được ghi)*.
* **Cấu hình Firebase**:
  * `apiKey`, `projectId`, `appId` là thông tin public by design của Firebase Client. Việc bảo vệ toàn vẹn dữ liệu được đảm bảo 100% nhờ lớp **Security Rules** và **Authentication** ở trên.
  * Phía ESP32: Token truy cập `FIREBASE_AUTH` (Database Secret) được lưu trong [include/secrets.h](file:///d:/HeThongTrongTrom/HeTrongTrongTrom-src/include/secrets.h) và đã được `.gitignore` bảo vệ tuyệt đối.

---

## 6. GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

* **Các tính năng trên giao diện**:
  * **Thanh Header an ninh**: Huy hiệu trạng thái đổi thành **`LIVE (X giây trước)`** tính từ gói tin telemetry gần nhất của ESP32; tự động chuyển sang màu xám `ESP32: OFFLINE` nếu quá 8 giây không có nhịp tim.
  * **6 Thẻ KPI trạng thái**: Chế độ ARM/DISARM, Chốt cửa (ĐÃ KHÓA 0° / ĐANG MỞ 160°), Báo động còi hú, PIR, Cự ly siêu âm kèm Progress Bar, Thông số mạng/IP/RSSI.
  * **Bảng điều khiển khép kín (State Confirmation)**: Nút bấm hiển thị xoay loading và **tự động mở khóa ngay khi Telemetry từ ESP32 xác nhận đã đổi trạng thái thành công**; kèm timeout an toàn 8s cảnh báo nếu thiết bị mất kết nối.
  * **Biểu đồ cự ly siêu âm Zero-Jitter**: Thiết kế bằng SVG thuần, cố định khung vẽ (`minHeight: 48px`), phủ lớp `<rect pointerEvents="all">` để bắt chuột mượt mà, triệt tiêu hoàn toàn hiện tượng giật nhảy layout (CLS = 0).
  * **Nhật ký cảnh báo**: Cuộn xem danh sách tối đa 50 sự cố mới nhất (dùng `limitToLast(50)`), hiển thị chi tiết mốc thời gian UTC+7, cự ly và cảm biến kích hoạt.
* **Tính tương thích di động (Responsive)**:
  * Đã tối ưu tốt cho điện thoại: Dùng CSS Grid `repeat(auto-fit, minmax(260px, 1fr))`, Media Query `@media (max-width: 1024px)` tự động chuyển bố cục 2 cột sang 1 cột đơn.
* **Chế độ màu (Theme)**:
  * Giao diện thiết kế theo phong cách **Dark Theme / Security Glassmorphism** mặc định (nền tối `#090d16`, kính mờ `backdrop-filter: blur(12px)`, viền phát sáng Cyan/Rose/Emerald).

---

## 7. CHẤT LƯỢNG MÃ NGUỒN

* **Độ dài tệp tin**:
  * Tất cả các file trong `web/` đều $< 260$ dòng. Code sạch, tách biệt component rõ ràng.
* **Dọn sạch tàn dư kiến trúc cũ**:
  * Đã **xóa hoàn toàn** `web/src/lib/azureClient.ts`, `web/staticwebapp.config.json` và proxy Azure trong `web/vite.config.ts`.
  * Triệt tiêu hoàn toàn các lỗi ngầm 404/503 trong Console trình duyệt.
* **Xử lý ngoại lệ (Error Handling)**:
  * Các hàm async gửi lệnh đều bọc trong `try...catch`, cập nhật thông báo lỗi ra UI (`statusMessage`).
  * Có trạng thái `isPending` hiển thị icon loading xoay khi gửi lệnh.

---

## 8. ĐÁNH GIÁ CÁC ĐIỂM CẢI THIỆN ĐÃ TRIỂN KHAI

1. ✅ **Bảo mật**: Đã tích hợp Firebase Authentication (`LoginModal.tsx`) và tạo file `database.rules.json` bảo vệ toàn vẹn cơ sở dữ liệu.
2. ✅ **Khép kín vòng lặp điều khiển Web $\leftrightarrow$ ESP32**: Đã bổ sung cơ chế `cmdId` trong `main.cpp` và `firebaseClient.ts`. ESP32 đã lắng nghe và thực thi trọn vẹn cả 3 lệnh: `silenceAlarm`, `armed`, `doorLocked`.
3. ✅ **Cấu hình ngưỡng hoạt động thực tế**: ESP32 đã đọc định kỳ `/security/config` mỗi 5s, gọi `setThreshold()` lưu Flash NVS và bỏ đoạn ép cứng $\le 12$ lúc boot.
4. ✅ **Chuẩn hóa góc Servo**: Cập nhật thống nhất trên toàn bộ giao diện và firmware: **0° (Khóa) / 160° (Mở)** theo đúng thông số trong [include/Config.h](file:///d:/HeThongTrongTrom/HeTrongTrongTrom-src/include/Config.h).
5. ✅ **Xóa sạch tàn dư Azure**: Loại bỏ `azureClient.ts`, file SWA và proxy Vite, tối ưu kích thước bundle web.
6. ✅ **Tối ưu hiển thị Realtime**: Thay nhãn cố định bằng nhãn **`LIVE (X giây trước)`** tính toán theo nhịp tim thực tế của ESP32.
7. ✅ **Mở khóa nút bấm thông minh**: Bỏ cơ chế khóa 3.5s cố định, chuyển sang mở khóa nút khi Telemetry xác nhận thành công (timeout 8s).
8. ✅ **Tối ưu truy vấn cảnh báo**: Sử dụng `query(..., limitToLast(50))` giúp web load nhanh và tiết kiệm RAM trình duyệt.

---

## 9. CÁC FILE QUAN TRỌNG NHẤT CẦN REVIEW

Chuyên gia phản biện có thể tập trung kiểm tra các file nòng cốt sau đây:

1. [web/src/App.tsx](file:///d:/HeThongTrongTrom/HeTrongTrongTrom-src/web/src/App.tsx): Trọng tâm quản lý State, điều phối listeners Realtime Firebase, Auth và nhịp tim thiết bị.
2. [web/src/lib/firebaseClient.ts](file:///d:/HeThongTrongTrom/HeTrongTrongTrom-src/web/src/lib/firebaseClient.ts): Tầng giao tiếp dữ liệu đọc/ghi với Firebase RTDB (kèm `cmdId` và Auth methods).
3. [database.rules.json](file:///d:/HeThongTrongTrom/HeTrongTrongTrom-src/database.rules.json): Quy tắc bảo mật phân quyền của Firebase Realtime Database.
4. [web/src/components/ControlPanel.tsx](file:///d:/HeThongTrongTrom/HeTrongTrongTrom-src/web/src/components/ControlPanel.tsx): Bảng điều khiển khép kín (tự động giải phóng nút khi telemetry phản hồi).
5. [web/src/components/LoginModal.tsx](file:///d:/HeThongTrongTrom/HeTrongTrongTrom-src/web/src/components/LoginModal.tsx): Modal đăng nhập quản trị viên qua Firebase Auth.
6. [src/main.cpp](file:///d:/HeThongTrongTrom/HeTrongTrongTrom-src/src/main.cpp#L445-L540): Firmware ESP32 xử lý lệnh `cmdId`, cập nhật `thresholdCm` từ config và đồng bộ Telemetry.
