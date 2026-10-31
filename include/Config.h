#pragma once
#include <Arduino.h>

namespace Config {
    // =========================================================================
    // 1. SƠ ĐỒ CHÂN PHẦN CỨNG (PINOUT GPIO)
    // =========================================================================
    constexpr uint8_t PIN_PIR       = 13;   // Cảm biến chuyển động PIR HC-SR501 (OUT mức 3.3V)
    constexpr uint8_t PIN_US_TRIG   = 5;    // Cảm biến siêu âm HC-SR04 Trigger (xuất xung 10µs)
    constexpr uint8_t PIN_US_ECHO   = 18;   // Cảm biến siêu âm HC-SR04 Echo (qua cầu chia áp 1kΩ/2kΩ)
    constexpr uint8_t PIN_BUZZER    = 23;   // Active Buzzer 3V (CẤM dùng GPIO 12 strapping pin)
    constexpr uint8_t PIN_LED_ALARM = 2;    // LED Vàng cảnh báo (nhấp nháy 2Hz khi có trộm)
    constexpr uint8_t PIN_LED_ARMED = 4;    // LED Xanh trạng thái (sáng khi ARMED, tắt khi DISARMED)

    // =========================================================================
    // 2. THAM SỐ NGƯỠNG & ĐO ĐẠC
    // =========================================================================
    constexpr uint16_t DEFAULT_DISTANCE_THRESHOLD_CM = 50;  // Ngưỡng mặc định: < 50cm tính là đột nhập
    constexpr uint16_t MIN_THRESHOLD_CM              = 5;   // Giới hạn cấu hình tối thiểu (cm)
    constexpr uint16_t MAX_THRESHOLD_CM              = 400; // Giới hạn cấu hình tối đa (cm)

    // =========================================================================
    // 3. THỜI GIAN & CHU KỲ (MILLISECONDS)
    // =========================================================================
    constexpr uint32_t PIR_WARMUP_MS         = 30000;   // Bỏ qua 30s đầu để PIR ổn định nhiệt
    constexpr uint32_t ALARM_AUTO_SILENCE_MS = 60000;   // Tự tắt còi hú sau 60s nếu không ai can thiệp
    constexpr uint32_t SENSOR_INTERVAL_MS    = 200;     // Chu kỳ đọc cảm biến Core 1 (200ms non-blocking)
    constexpr uint32_t TELEMETRY_INTERVAL_MS = 15000;   // Chu kỳ gửi telemetry (15s = 5760 tin/ngày gói F1)
    constexpr uint32_t WIFI_RETRY_MS         = 15000;   // Thử lại kết nối Wi-Fi mỗi 15s
    constexpr uint32_t MQTT_RETRY_MS         = 10000;   // Thử lại kết nối MQTT mỗi 10s
    constexpr uint32_t SAS_TTL_S             = 3600;    // Thời hạn SAS Token: 3600 giây (60 phút)

    // =========================================================================
    // 4. PHIÊN BẢN HỆ THỐNG
    // =========================================================================
    constexpr const char* FIRMWARE_VERSION   = "2.0.0";
}
