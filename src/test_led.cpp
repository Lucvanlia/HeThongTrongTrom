#include <Arduino.h>

// ==============================================================================
// MÔI TRƯỜNG TEST ĐỒNG BỘ 2 DÀN LED (ĐỎ D32 + XANH D33) & LOA CÒI (D23)
// ==============================================================================

#define TEST_LED_RED_PIN    32   // Dãy LED ĐỎ (Báo trộm ALARM)
#define TEST_LED_GREEN_PIN  33   // Dãy LED XANH (Trạng thái an ninh ARMED)
#define TEST_BUZZER_PIN     23   // Loa / Còi báo động (Active Buzzer)

// CẤU HÌNH ĐẤU DÂY:
// - false: Nếu dùng Transistor A1015 (kích LOW để sáng)
// - true:  Nếu nối trực tiếp qua trở 220Ω (kích HIGH để sáng)
const bool DIRECT_WIRING = false; 

static void setRedLed(bool on) {
    if (DIRECT_WIRING) {
        digitalWrite(TEST_LED_RED_PIN, on ? HIGH : LOW);
    } else {
        digitalWrite(TEST_LED_RED_PIN, on ? LOW : HIGH);
    }
}

static void setGreenLed(bool on) {
    if (DIRECT_WIRING) {
        digitalWrite(TEST_LED_GREEN_PIN, on ? HIGH : LOW);
    } else {
        digitalWrite(TEST_LED_GREEN_PIN, on ? LOW : HIGH);
    }
}

static void setBuzzer(bool on) {
    digitalWrite(TEST_BUZZER_PIN, on ? HIGH : LOW);
}

void setup() {
    Serial.begin(115200);
    delay(500);

    pinMode(TEST_LED_RED_PIN, OUTPUT);
    pinMode(TEST_LED_GREEN_PIN, OUTPUT);
    pinMode(TEST_BUZZER_PIN, OUTPUT);

    setRedLed(false);
    setGreenLed(false);
    setBuzzer(false);

    Serial.println("\n=======================================================");
    Serial.println("  TEST TOAN DIEN: LED DO (D32) + LED XANH (D33) + COI (D23)");
    Serial.println("=======================================================");
}

void loop() {
    // -------------------------------------------------------------------------
    // Pha 1: Bật bảo vệ (ARMED) - LED Xanh SÁNG TĨNH, LED Đỏ & Còi TẮT
    // -------------------------------------------------------------------------
    Serial.println("[TEST] Pha 1: Kich hoat che do ARM -> LED Xanh sang tinh (2 giay)...");
    setGreenLed(true);
    setRedLed(false);
    setBuzzer(false);
    delay(2000);

    // -------------------------------------------------------------------------
    // Pha 2: Phát hiện đột nhập (ALARM) - LED Đỏ + Còi chớp nháy 4 lần liên tiếp
    // -------------------------------------------------------------------------
    Serial.println("[TEST] Pha 2: Phat hien trộm -> LED Do chop + Coi bip 4 lan!");
    for (int i = 0; i < 4; i++) {
        setRedLed(true);
        setBuzzer(true);
        delay(150);
        setRedLed(false);
        setBuzzer(false);
        delay(150);
    }
    delay(500);

    // -------------------------------------------------------------------------
    // Pha 3: Tắt bảo vệ (DISARM) - Tất cả tắt nghỉ 1.5 giây
    // -------------------------------------------------------------------------
    Serial.println("[TEST] Pha 3: DISARM -> Tat tat ca nghi 1.5 giay...\n");
    setGreenLed(false);
    setRedLed(false);
    setBuzzer(false);
    delay(1500);
}
