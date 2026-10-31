# Findings & Architecture Decisions

## 1. Giới hạn & Điểm lưu ý trên Microsoft Azure
- **Azure IoT Hub F1**: Giới hạn 8.000 tin nhắn/ngày (mỗi tin tính theo khối 0.5 KB). Để không bị vượt hạn mức, telemetry được gửi mỗi **15 giây** (5.760 tin/ngày).
- **MQTT vs HTTPS**: Thiết bị sử dụng giao thức **MQTT TLS (Port 8883)** qua thư viện `PubSubClient`, giúp nhận Direct Method (`setArm`, `silenceAlarm`) tức thì (<1s), khắc phục nhược điểm của HTTPS REST (không nhận được Direct Method).
- **SAS Token Authentication**: Firmware ESP32 tự động tính HMAC-SHA256 trên chuỗi resource URI + thời hạn bằng thư viện `mbedtls`, sau đó mã hóa Base64 và URL-encode. Tự động ngắt và gia hạn trước khi hết hạn 5 phút.
- **SWA Managed Functions**: Gói Static Web Apps Free chỉ hỗ trợ HTTP trigger. Vì vậy, các trigger IoT Hub (Event Hub endpoint) và Timer trigger được tách riêng vào một Function App Flex Consumption (`functions-ingest/`).
- **Web PubSub Free F1**: Tối đa 20 kết nối đồng thời. Token cấp cho client chỉ mang quyền đọc (nhận broadcast), không cấp quyền gửi tin tùy tiện.

## 2. Phần cứng & Điện áp ESP32
- **Cấm dùng GPIO 12 cho còi**: GPIO 12 là strapping pin (`MTDI`). Nếu bị kéo lên mức cao lúc khởi động, ESP32 sẽ chọn sai điện áp flash nội bộ (1.8V thay vì 3.3V) dẫn đến treo bootloader. Còi chuyển sang **GPIO 23**.
- **Cảm biến siêu âm HC-SR04**: Chân ECHO xuất mức logic 5V. ESP32 chỉ chịu tối đa 3.3V trên GPIO. Bắt buộc sử dụng cầu phân áp gồm trở $R_1 = 1\text{ k}\Omega$ và $R_2 = 2\text{ k}\Omega$ để hạ điện áp:
  $$V_{\text{ECHO}} = 5\text{V} \times \frac{2\text{k}\Omega}{1\text{k}\Omega + 2\text{k}\Omega} \approx 3.33\text{V}$$
- **PIR HC-SR501**: Cần 30–60 giây sau khi cấp điện để ổn định cảm biến nhiệt. Firmware cần bỏ qua ngõ ra trong 30 giây đầu tiên. Jumper chọn chế độ: Gạt về vị trí **H** (Repeat Trigger - liên tục kích hoạt khi người còn trong vùng quét). Biến trở nhạy: xoay theo chiều kim đồng hồ để tăng tầm xa (tối đa 7m).
- **LED Indicators & Điện trở hạn dòng**: LED đục 3mm có điện áp rơi $V_f \approx 2.0\text{V} - 2.2\text{V}$, dòng định mức an toàn 5–10mA. Nối tiếp điện trở $R = 220\Omega$ từ GPIO (3.3V) xuống dòng an toàn $I = (3.3 - 2.1)/220 \approx 5.5\text{ mA}$, bảo vệ cả LED và cổng GPIO của ESP32.
- **Đế mở rộng ESP32 30 chân**: Cung cấp cọc nguồn 5V/3.3V/GND riêng biệt và cổng ốc vặn domino. Giúp cố định dây cắm, chống rung lắc và tuột dây khi mang sản phẩm đi chấm điểm thực tế.

## 3. Kiến trúc Đồ thị & Công cụ Agent
- **`graphify`**: Đã phân tích AST của mã nguồn và xuất mạng đồ thị tại `graphify-out/graph.html` và `graph.json`.
- **`planning-with-files`**: Đã cài đặt toàn cục và trong workspace `.agents/skills/planning-with-files/` để duy trì bộ nhớ công việc qua các file markdown.

