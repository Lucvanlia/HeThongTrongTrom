# HeThongTrongTrom - Hệ Thống Báo Động & Chống Trộm Thông Minh (ESP32 + Microsoft Azure IoT)

Dự án nghiên cứu và triển khai **Hệ thống IoT Giám sát, Báo động & Chống trộm thông minh** hoạt động theo thời gian thực (Realtime), kết hợp giữa phần cứng vi điều khiển **ESP32** và hệ sinh thái điện toán đám mây **Microsoft Azure**.

---

## 📌 Tổng Quan Hệ Thống

Hệ thống được thiết kế theo kiến trúc chuẩn Enterprise với tiêu chí: **Độ trễ cực thấp (< 50ms), hoạt động bền bỉ 24/7, bảo mật nhiều lớp và tối ưu chi phí vận hành**:
- **Tầng Thiết Bị (Edge / ESP32)**:
  - Vi điều khiển ESP32 2 nhân (FreeRTOS): Tách biệt luồng xử lý cảm biến/an toàn (Core 1) và luồng mạng/giao tiếp đám mây (Core 0).
  - Thu thập tín hiệu từ các cảm biến chống trộm (cảm biến chuyển động PIR, cảm biến từ cửa, cảm biến rung, còi hú báo động).
  - Kết nối bảo mật tới Azure IoT Hub qua MQTT / TLS.
- **Tầng Đám Mây (Cloud / Microsoft Azure)**:
  - **Azure IoT Hub**: Quản lý thiết bị hai chiều (Device-to-Cloud & Cloud-to-Device), đồng bộ cấu hình qua Device Twins.
  - **Azure Web PubSub**: Kênh WebSocket thời gian thực truyền dữ liệu tức thời tới Dashboard.
  - **Azure Functions (Serverless)**: Xử lý sự kiện cảnh báo và trung chuyển lệnh điều khiển.
  - **Azure Logic Apps**: Tự động kích hoạt thông báo khẩn cấp (Email / SMS / Webhook).
  - **Azure Blob Storage / Cosmos DB**: Lưu trữ lịch sử sự kiện và nhật ký hoạt động.
- **Tầng Giao Diện (Web Dashboard)**:
  - Xây dựng trên React 19 + TypeScript + Vite.
  - Triển khai trên **Azure Static Web Apps (SWA)** với CDN toàn cầu và phân quyền RBAC (Admin, Operator, Viewer).

---

## 📂 Cấu Trúc Thư Mục

```text
HeThongTrongTrom/
├── platformio.ini              # Cấu hình PlatformIO cho ESP32 DevKit
├── .gitignore                  # Bảo vệ mã nguồn và thông tin nhạy cảm
├── include/                    # Header C++ chia sẻ (Config, Secrets mẫu)
│   └── README
├── src/                        # Mã nguồn Firmware ESP32 C++ (FreeRTOS)
│   └── main.cpp
├── lib/                        # Thư viện dùng chung
├── test/                       # Mã kiểm thử
├── BOM_LinhKien.md             # Danh mục linh kiện phần cứng chi tiết
├── BANG_TONG_HOP_DON_HANG.md   # Dự toán ngân sách và đơn hàng linh kiện
├── HUONG_DAN_CHI_TIET.md       # Blueprint kiến trúc 100% Azure IoT Enterprise
├── RULE_PURE_AZURE_IOT.md      # Quy chuẩn kiến trúc Azure IoT
└── index.html                  # Tài liệu Wiki / Knowledge Base hệ thống
```

---

## 🚀 Hướng Dẫn Cài Đặt & Phát Triển

### 1. Chuẩn Bị Môi Trường
- Cài đặt [VS Code](https://code.visualstudio.com/)
- Cài đặt extension **PlatformIO IDE** trên VS Code
- Cài đặt [Git](https://git-scm.com/)

### 2. Mở & Biên Dịch Dự Án
```bash
# Clone repository
git clone https://github.com/Lucvanlia/HeThongTrongTrom.git
cd HeThongTrongTrom
```
- Mở thư mục dự án trong VS Code với PlatformIO.
- PlatformIO sẽ tự động tải toolchain và dependencies cho `esp32doit-devkit-v1`.
- Kết nối ESP32 qua cáp Micro-USB/Type-C và nhấn nút **Build** hoặc **Upload** trên thanh trạng thái PlatformIO.

---

## 🔒 Quy Chuẩn Bảo Mật
- Không bao giờ commit thông tin nhạy cảm (mật khẩu Wi-Fi, Azure Connection Strings, API Keys).
- Mọi bí mật được lưu trong `include/secrets.h` hoặc file môi trường `.env.local` đã được cấu hình trong `.gitignore`.

---

## 👥 Tác Giả & Bản Quyền
Dự án được phát triển bởi **Lucvanlia**. Mọi quyền được bảo lưu.
