#pragma once
#include <Arduino.h>

namespace Config {
    // =========================================================================
    // 1. SƠ ĐỒ CHÂN PHẦN CỨNG (PINOUT GPIO)
    // =========================================================================
    constexpr uint8_t PIN_PIR         = 13;   // Cảm biến chuyển động PIR HC-SR501 (OUT mức 3.3V)
    constexpr uint8_t PIN_US_TRIG     = 5;    // Cảm biến siêu âm HC-SR04 Trigger (xuất xung 10µs)
    constexpr uint8_t PIN_US_ECHO     = 18;   // Cảm biến siêu âm HC-SR04 Echo (qua cầu chia áp 1kΩ/2kΩ)
    constexpr uint8_t PIN_BUZZER      = 23;   // Active Buzzer 3V (CẤM dùng GPIO 12 strapping pin)
    constexpr uint8_t PIN_LED_ALARM   = 2;    // LED Vàng cảnh báo (nhấp nháy 2Hz khi có trộm)
    constexpr uint8_t PIN_LED_ARMED   = 4;    // LED Xanh trạng thái (sáng khi ARMED, tắt khi DISARMED)

    // Cơ cấu chấp hành & hiển thị:
    constexpr uint8_t PIN_SERVO       = 19;   // Động cơ Servo SG90 (xung PWM điều khiển góc chốt cửa)
    constexpr uint8_t PIN_RELAY_SERVO = 25;   // Module Relay 5V cấp/ngắt nguồn cho Servo (Power-Gating)
    constexpr uint8_t PIN_BUTTON_EXIT = 27;   // Nút nhấn mở cửa Exit Button trong nhà (kéo LOW khi bấm)
    constexpr uint8_t PIN_I2C_SDA     = 21;   // Chân I2C SDA cho màn hình LCD 16x2
    constexpr uint8_t PIN_I2C_SCL     = 22;   // Chân I2C SCL cho màn hình LCD 16x2

    // =========================================================================
    // 2. LOGIC ĐIỀU KHIỂN RELAY CẤP NGUỒN SERVO
    // Module relay 5V Arduino thông dụng kích mức LOW (Active-LOW)
    // =========================================================================
    constexpr uint8_t RELAY_SERVO_ON  = LOW;  // Mức kích bật tiếp điểm Relay đóng mạch cấp 5V
    constexpr uint8_t RELAY_SERVO_OFF = HIGH; // Mức ngắt tiếp điểm Relay cắt 5V hoàn toàn

    // =========================================================================
    // 3. THAM SỐ GÓC XOAY SERVO (CHỐT CỬA TỰ ĐỘNG)
    // =========================================================================
    constexpr int SERVO_UNLOCK_ANGLE  = 0;    // Góc mở chốt cửa (DISARMED)
    constexpr int SERVO_LOCK_ANGLE    = 90;   // Góc đóng chốt an toàn (ARMED)
    constexpr uint32_t SERVO_MOVE_TIME_MS = 600; // Thời gian chờ servo quay xong trước khi ngắt điện

    // =========================================================================
    // 4. THAM SỐ MÀN HÌNH LCD 1602 I2C
    // =========================================================================
    constexpr uint8_t LCD_I2C_ADDR    = 0x27; // Địa chỉ I2C phổ biến của module PCF8574
    constexpr uint8_t LCD_COLS        = 16;   // 16 ký tự mỗi dòng
    constexpr uint8_t LCD_ROWS        = 2;    // 2 dòng hiển thị

    // =========================================================================
    // 5. THAM SỐ NGƯỠNG & ĐO ĐẠC
    // =========================================================================
    constexpr uint16_t DEFAULT_DISTANCE_THRESHOLD_CM = 50;  // Ngưỡng mặc định: < 50cm tính là đột nhập
    constexpr uint16_t MIN_THRESHOLD_CM              = 5;   // Giới hạn cấu hình tối thiểu (cm)
    constexpr uint16_t MAX_THRESHOLD_CM              = 400; // Giới hạn cấu hình tối đa (cm)

    // =========================================================================
    // 6. THỜI GIAN & CHU KỲ (MILLISECONDS)
    // =========================================================================
    constexpr uint32_t PIR_WARMUP_MS         = 30000;   // Bỏ qua 30s đầu để PIR ổn định nhiệt
    constexpr uint32_t ALARM_AUTO_SILENCE_MS = 60000;   // Tự tắt còi hú sau 60s nếu không ai can thiệp
    constexpr uint32_t AUTO_RELOCK_DELAY_MS  = 5000;    // Tự động đóng chốt khóa sau 5 giây mở cửa
    constexpr uint32_t EXIT_DELAY_MS         = 10000;   // Trễ 10s hoãn báo động khi người nhà ấn nút đi ra
    constexpr uint32_t BUTTON_DEBOUNCE_MS    = 50;      // Thời gian chống dội phím (debounce)
    constexpr uint32_t SENSOR_INTERVAL_MS    = 200;     // Chu kỳ đọc cảm biến Core 1 (200ms non-blocking)
    constexpr uint32_t LCD_REFRESH_MS        = 500;     // Chu kỳ cập nhật màn hình LCD (500ms)
    constexpr uint32_t TELEMETRY_INTERVAL_MS = 15000;   // Chu kỳ gửi telemetry (15s = 5760 tin/ngày gói F1)
    constexpr uint32_t WIFI_RETRY_MS         = 15000;   // Thử lại kết nối Wi-Fi mỗi 15s
    constexpr uint32_t MQTT_RETRY_MS         = 10000;   // Thử lại kết nối MQTT mỗi 10s
    constexpr uint32_t SAS_TTL_S             = 3600;    // Thời hạn SAS Token: 3600 giây (60 phút)

    // =========================================================================
    // 7. PHIÊN BẢN HỆ THỐNG
    // =========================================================================
    constexpr const char* FIRMWARE_VERSION   = "2.3.0";
}
