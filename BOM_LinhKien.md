# DANH SÁCH LINH KIỆN HỆ THỐNG CẢNH BÁO CHỐNG TRỘM IOT (MQTT)

## 1. Yêu cầu hệ thống
- **Vi điều khiển IoT:** Kết nối Wi-Fi, gửi/nhận dữ liệu giao thức MQTT.
- **Cảm biến phát hiện xâm nhập:**
  - Cảm biến PIR (hồng ngoại chuyển động thân nhiệt).
  - Cảm biến hồng ngoại tránh vật cản (bẫy quang/cửa).
  - Cảm biến siêu âm Sonar (quét khoảng cách).
- **Cảnh báo tại chỗ:** Còi Buzzer + LED báo trạng thái.
- **Tính năng điều khiển:** Bật/Tắt chế độ bảo vệ từ xa (Arm/Disarm) qua MQTT.
- **Tính năng cảnh báo:** Bắn gói tin MQTT khi có đột nhập.

---

## 2. DANH SÁCH LINH KIỆN MUA ĐỦ CHUẨN 10 ĐIỂM (BÁM SÁT RUBRIC)

Theo yêu cầu môn học:
- **Bắt buộc dùng ESP32** (không dùng ESP8266 để đạt tối đa điểm).
- **Có ít nhất 2 cảm biến thực:** Chọn **PIR HC-SR501** (chuyển động) + **HC-SR04** (khoảng cách Sonar để vẽ biểu đồ lịch sử lên Dashboard).
- **Tối thiểu 2 thiết bị ra:** **Còi Buzzer** + **Hệ thống LED (Đỏ/Xanh)**.
- Khớp 100% với thư viện linh kiện của **Wokwi trên VS Code** (đạt 8đ mô phỏng và 10đ mạch thật).

---

### BẢNG LINH KIỆN CẦN MUA (Tra cứu trên icdayroi.com)

| STT | Từ khóa gõ tìm kiếm trên icdayroi | Model chuẩn | SL | Giá tham khảo | Tương ứng tiêu chí đề bài |
|:---:|:---|:---|:---:|:---:|:---|
| **1** | **Kit ESP32 NodeMCU 30 chân** (hoặc 38 chân Type-C) | ESP32-WROOM-32 | 1 kit | ~85.000₫ | **Bộ xử lý trung tâm**: Bắt buộc ESP32 theo rubric, kết nối Wi-Fi/MQTT |
| **2** | **Cảm biến chuyển động PIR HC-SR501** | HC-SR501 | 1 cái | ~25.000₫ | **Cảm biến thực 1**: Báo trạng thái phát hiện người (Wokwi có sẵn) |
| **3** | **Cảm biến siêu âm HC-SR04** | HC-SR04 | 1 cái | ~20.000₫ | **Cảm biến thực 2**: Đo khoảng cách vẽ biểu đồ lịch sử lên Dashboard (Wokwi có sẵn) |
| **4** | **Còi chip 5V** (hoặc Module còi buzzer 5V) | Active Buzzer 5V | 1 cái | ~5.000₫ | **Thiết bị ra 1**: Phát âm thanh cảnh báo đột nhập |
| **5** | **LED phi 5 đỏ** + **LED phi 5 xanh lá** | LED 5mm | 2 con | ~1.000₫ | **Thiết bị ra 2**: Đèn báo động và đèn trạng thái ARM/DISARM |
| **6** | **Điện trở 220R** + **Điện trở 1k, 2k** (1/4W) | 220Ω, 1kΩ, 2kΩ | Vài con | ~2.000₫ | Hạn dòng bảo vệ LED và chia áp chân Echo HC-SR04 vào ESP32 |
| **7** | **Đế test board 400 lỗ** (hoặc 830 lỗ) | Breadboard MB-102 | 1 cái | ~16.000₫ | Cắm mạch thực nghiệm không cần hàn |
| **8** | **Dây cắm testboard đực cái 20cm** | Dupont M-F 20cm | 1 tép (40s) | ~15.000₫ | Cắm nối cảm biến và còi vào ESP32 |
| **9** | **Cáp nạp Type-C** (hoặc Micro USB tùy Kit ESP32) | Cáp nạp dữ liệu | 1 sợi | 0₫ *(có sẵn)* | Cấp nguồn và nạp code (tận dụng cáp sạc điện thoại ở nhà) |

👉 **TỔNG CHI PHÍ THỰC TẾ: ~169.000₫** *(Đầy đủ 100% tiêu chí lấy điểm 10)*

---

## 3. Sơ đồ phân bố chân kết nối (Pinout ESP8266 - Phương án tối ưu)

| Thiết bị / Module | Chân trên Module | Chân kết nối trên NodeMCU ESP8266 | Ghi chú & Mức điện áp |
|:---|:---|:---|:---|
| **Cảm biến PIR HC-SR501** | VCC <br> GND <br> OUT | **VIN (5V)** <br> **G** (GND) <br> **D1** (GPIO 5) | Ngõ ra OUT ở mức 3.3V, cắm trực tiếp an toàn |
| **Cảm biến siêu âm HC-SR04** | VCC <br> GND <br> TRIG <br> ECHO | **VIN (5V)** <br> **G** (GND) <br> **D2** (GPIO 4) <br> **D5** (GPIO 14) | Chân Echo (5V) qua trở 1k/2k xuống 3.3V vào D5 |
| **Cảm biến tránh vật cản IR** | VCC <br> GND <br> OUT | **3V3** (hoặc VIN) <br> **G** (GND) <br> **D6** (GPIO 12) | Tín hiệu Digital Input |
| **Còi chip Buzzer 5V** | Cực dương (+) <br> Cực âm (-) | **D7** (GPIO 13) <br> **G** (GND) | Kích HIGH còi kêu, kích LOW còi tắt |
| **LED Đỏ (Báo động)** | Anode (+) <br> Cathode (-) | **D8** (GPIO 15, qua trở 220Ω) <br> **G** (GND) | Chớp liên tục khi phát hiện có đột nhập |
| **LED Xanh (Trạng thái ARM)** | Anode (+) <br> Cathode (-) | **D0** (GPIO 16, qua trở 220Ω) <br> **G** (GND) | Sáng khi bật bảo vệ, tắt khi disarmed |

---

## 4. Sơ đồ phân bố chân nối (Dành cho ESP32 nếu dùng ESP32)

| Thiết bị / Module | Chân trên Module | Chân kết nối trên ESP32 | Ghi chú nguồn & Logic |
|:---|:---|:---|:---|
| **Cảm biến PIR HC-SR501** | VCC <br> GND <br> OUT | VIN (5V) <br> GND <br> **GPIO 13** | Ngõ ra OUT ở mức 3.3V, an toàn cho ESP32 |
| **Cảm biến siêu âm HC-SR04** | VCC <br> GND <br> TRIG <br> ECHO | VIN (5V) <br> GND <br> **GPIO 5** <br> **GPIO 18** | Chân Echo (5V) nên qua cầu chia trở 1k/2k xuống ~3.3V vào GPIO 18 |
| **Cảm biến tránh vật cản IR** | VCC <br> GND <br> OUT | 3V3 (hoặc 5V) <br> GND <br> **GPIO 19** | Digital Output |
| **Module Còi Buzzer 5V** | VCC <br> GND <br> I/O | VIN (5V) hoặc 3V3 <br> GND <br> **GPIO 12** | Tùy module kích mức HIGH hay LOW |
| **LED Đỏ (Cảnh báo)** | Anode (+) <br> Cathode (-) | **GPIO 2** (qua trở 220Ω) <br> GND | Sáng nhấp nháy khi bị kích hoạt báo động |
| **LED Xanh (Trạng thái ARM)** | Anode (+) <br> Cathode (-) | **GPIO 4** (qua trở 220Ω) <br> GND | Sáng liên tục khi ĐANG BẬT BẢO VỆ, Tắt khi TẮT |

---

## 4. Cơ chế điều khiển MQTT & Gửi cảnh báo

- **MQTT Broker gợi ý:** HiveMQ Cloud (Free), EMQX Cloud, hoặc broker công cộng `broker.hivemq.com` / `test.mosquitto.org`.
- **Topic điều khiển từ xa (ESP32 Subscribe):**
  - Topic: `home/security/alarm/set_mode`
  - Payload:
    - `"ARM"`: Kích hoạt chế độ tuần tra bảo vệ (LED Xanh BẬT).
    - `"DISARM"`: Tắt chế độ bảo vệ, ngắt còi, tắt LED Đỏ (LED Xanh TẮT).
- **Topic gửi cảnh báo xâm nhập (ESP32 Publish):**
  - Topic: `home/security/alarm/alert`
  - Payload JSON:
    ```json
    {
      "event": "INTRUSION_DETECTED",
      "sensor": "PIR_HC_SR501", 
      "message": "Phat hien co nguoi di chuyen!",
      "timestamp": 12345678
    }
    ```
## 5. BẢNG TỔNG HỢP SẢN PHẨM ĐÃ CHỐN MUA (KÈM LINK ICDAYROI)

> **Lưu ý:** Bạn đã có sẵn điện trở và dây cắm phụ ở nhà.

### Danh sách chi tiết giỏ hàng:

| STT | Tên sản phẩm | Link sản phẩm | Đơn giá | SL | Thành tiền | Vai trò trong hệ thống |
|:---:|:---|:---:|:---:|:---:|:---:|:---|
| 1 | **Kít RF thu phát Wifi BLE ESP32 NodeMCU LuaNode32 Type-C** | [Xem sản phẩm](https://icdayroi.com/kit-rf-thu-phat-wifi-ble-esp32-nodemcu-luanode32-type-c) | 155.000₫ | 1 | 155.000₫ | **Vi điều khiển trung tâm**: Kết nối Wi-Fi, chạy MQTT, xử lý logic báo trộm |
| 2 | **Cảm biến chuyển động PIR HC-SR501** | [Xem sản phẩm](https://icdayroi.com/cam-bien-chuyen-dong-pir-hc-sr501) | 25.000₫ | 1 | 25.000₫ | **Cảm biến 1**: Quét chuyển động thân nhiệt người góc rộng |
| 3 | **Gá mica cảm biến chuyển động PIR HC-SR501** | [Xem sản phẩm](https://icdayroi.com/ga-mica-cam-bien-chuyen-dong-pir-hc-sr501) | 5.000₫ | 1 | 5.000₫ | **Phụ kiện**: Giữ cố định cảm biến PIR đứng thẳng thẩm mỹ |
| 4 | **Cảm biến siêu âm HC-SR04** | [Xem sản phẩm](https://icdayroi.com/cam-bien-sieu-am-hc-sr04) | 22.000₫ | 1 | 22.000₫ | **Cảm biến 2**: Đo cự ly Sonar lấy số liệu vẽ biểu đồ lên Dashboard |
| 5 | **Gá cảm biến siêu âm HC-SR04, HC-SR05** | [Xem sản phẩm](https://icdayroi.com/ga-cam-bien-sieu-am-hc-sr04-hc-sr05) | 6.000₫ | 1 | 6.000₫ | **Phụ kiện**: Giữ cố định 2 mắt siêu âm trên mô hình |
| 6 | **Led đục màu vàng 3MM (gói 10 con)** | [Xem sản phẩm](https://icdayroi.com/led-duc-mau-xanh-vang-3mm-goi-10-con) | 2.500₫ | 1 | 2.500₫ | **Thiết bị ra 1**: Đèn nhấp nháy cảnh báo khi phát hiện đột nhập |
| 7 | **Led đục màu xanh lá 3MM (gói 10 con)** | [Xem sản phẩm](https://icdayroi.com/led-duc-mau-xanh-la-3mm-goi-10-con) | 2.500₫ | 1 | 2.500₫ | **Thiết bị ra 2**: Đèn hiển thị trạng thái ARM / DISARM |
| 8 | **Đế test board, bread board GL-12 175x67x9mm** | [Xem sản phẩm](https://icdayroi.com/de-test-board-bread-board-gl-12-175x67x9mm) | 35.000₫ | 1 | 35.000₫ | **Bo mạch cắm**: Bo test lớn để cắm thử nghiệm LED và điện trở |
| 9 | **Đế mở rộng esp32 30 chân** | [Xem sản phẩm](https://icdayroi.com/de-mo-rong-esp32-30-chan) | 39.000₫ | **2** | **78.000₫** | **Đế ra chân**: Có sẵn cọc nguồn 5V/GND và domino bắt vít cố định *(giảm về 1 nếu bấm nhầm)* |
| 10 | **Dây bus, dây bẹ 2 đầu cái 15cm (10 sợi)** | [Xem sản phẩm](https://icdayroi.com/day-bus-day-be-2-dau-cai-15cm-soi) | 5.000₫ | 1 | 5.000₫ | **Dây cắm**: Nối từ đế mở rộng sang các cảm biến và còi |
| 11 | **Buzzer 3V ra dây sẵn** | [Xem sản phẩm](https://icdayroi.com/buzzer-3v-ra-day-san) | 5.000₫ | 1 | 5.000₫ | **Thiết bị ra 3**: Còi hú báo động âm thanh (3V chuẩn logic ESP32) |

---

### 💰 Tổng kết chi phí:
- **Nếu giữ nguyên số lượng 2 chiếc Đế mở rộng:** **341.000₫**
- **Nếu chỉnh số lượng Đế mở rộng về 1 chiếc:** **302.000₫** *(Tiết kiệm được 39.000₫)*

### 🎯 Đánh giá tính khả thi theo Rubric môn học:
- **Chuẩn phần cứng:** Đạt 100% (Đúng ESP32, đủ 2 cảm biến thực, đủ còi + LED, có bo và đế cắm thẩm mỹ).
- **Mô phỏng Wokwi VS Code:** Khớp 100% với các component trong Wokwi (`board-esp32-devkit-c-v4`, `wokwi-pir-motion-sensor`, `wokwi-hc-sr04`, `wokwi-buzzer`, `wokwi-led`).
- **Dashboard & MQTT:** Đã sẵn sàng kết nối MQTT (HiveMQ/EMQX) đẩy trạng thái và vẽ biểu đồ lịch sử khoảng cách trên Blynk IoT / Node-RED. 