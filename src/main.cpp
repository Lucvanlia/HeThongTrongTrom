#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>
#include <time.h>
#include "Config.h"
#include "secrets.h"

using namespace system_secrets;
using namespace Config;

// ============================================================================
// 1. DỮ LIỆU DÙNG CHUNG GIỮA 2 NHÂN (SHARED STATE & MUTEX)
// ============================================================================
struct SharedState {
    bool     armed = false;
    bool     alarm = false;
    bool     pir = false;
    bool     doorLocked = true;        // Mặc định cửa đóng
    float    distanceCm = -1.0f;
    uint32_t alarmSinceMs = 0;
    uint16_t thresholdCm = 12;         // Ngưỡng tiếp cận gần (12cm: <12cm là tay/người, 14cm là mặt bàn trống)
    uint32_t autoRelockAtMs = 0;       // Hẹn giờ tự động đóng chốt lại sau 2s
    uint32_t exitDelayUntilMs = 0;     // Hoãn báo động 10s khi người nhà ấn nút đi ra
    bool     autoDoorGuestActive = false; // Cờ báo cửa đang mở đón khách
};

struct AlertEvent {
    char  sensor[8];     // "PIR" | "SONAR"
    float distanceCm;
};

static SharedState        g;
static portMUX_TYPE       gMux = portMUX_INITIALIZER_UNLOCKED;
static QueueHandle_t      alertQueue;
static Preferences        prefs;
static volatile bool      reportPending = true;

// -----------------------------------------------------------------------------
// CẤU HÌNH CỰC TÍNH VÀ ÂM THANH
// -----------------------------------------------------------------------------
// Dãy LED qua Transistor A1015 (PNP): LOW = SÁNG, HIGH = TẮT
constexpr bool INVERT_LEDS = true;

// Bật/Tắt còi báo động (Nếu cần test im lặng không ồn thì đổi thành false)
constexpr bool ENABLE_BUZZER = true;

// Thiết bị ngoại vi I2C và Servo
static LiquidCrystal_I2C  lcd(Config::LCD_I2C_ADDR, Config::LCD_COLS, Config::LCD_ROWS);
static Servo              servoLock;

// Kết nối mạng TLS & MQTT Azure + HTTP Client Firebase
static WiFiClientSecure   tlsClient;

// Helper điều khiển LED theo cực tính transistor A1015
static inline void setLedAlarmPin(bool on) {
    digitalWrite(Config::PIN_LED_ALARM, INVERT_LEDS ? (on ? LOW : HIGH) : (on ? HIGH : LOW));
}

static inline void setLedArmedPin(bool on) {
    digitalWrite(Config::PIN_LED_ARMED, INVERT_LEDS ? (on ? LOW : HIGH) : (on ? HIGH : LOW));
}

// Lấy bản sao an toàn của SharedState (Snapshot)
static SharedState snapshot() {
    portENTER_CRITICAL(&gMux);
    SharedState s = g;
    portEXIT_CRITICAL(&gMux);
    return s;
}

// Lấy epoch timestamp UTC (ms)
static uint64_t getEpochMs() {
    struct timeval tv;
    gettimeofday(&tv, nullptr);
    if (tv.tv_sec < 1700000000L) return 0;
    return (uint64_t)tv.tv_sec * 1000ULL + (uint64_t)(tv.tv_usec / 1000);
}

// ============================================================================
// 2. ĐIỀU KHIỂN CHẤP HÀNH (RELAY + SERVO CHỐT CỬA)
// ============================================================================
static void setLockState(bool locked) {
    portENTER_CRITICAL(&gMux);
    g.doorLocked = locked;
    portEXIT_CRITICAL(&gMux);

    // KỸ THUẬT POWER-GATING TRIỆT ĐỂ (CHỐNG RUNG GIẬT, CHỐNG DÒNG RÒ KÝ SINH):
    // 1. Kích Rơ-le ĐÓNG cấp điện 5V cho Servo
    digitalWrite(Config::PIN_RELAY_SERVO, Config::RELAY_SERVO_ON);
    vTaskDelay(pdMS_TO_TICKS(50)); // Chờ điện áp 5V ổn định nhanh (50ms)

    // 2. Gắn chân PWM và phát xung điều khiển góc quay (600µs - 2400µs an toàn)
    servoLock.attach(Config::PIN_SERVO, Config::SERVO_MIN_US, Config::SERVO_MAX_US);
    servoLock.write(locked ? Config::SERVO_LOCK_ANGLE : Config::SERVO_UNLOCK_ANGLE);
    vTaskDelay(pdMS_TO_TICKS(Config::SERVO_MOVE_TIME_MS)); // Chờ servo quay dứt khoát (450ms)

    // 3. NGẮT XUNG PWM (DETACH) VÀ KÉO CHÂN TÍN HIỆU VỀ 0V
    // Triệt tiêu 100% dòng rò ký sinh qua diode ESD của servo (chống rung giật tại chỗ)
    servoLock.detach();
    pinMode(Config::PIN_SERVO, OUTPUT);
    digitalWrite(Config::PIN_SERVO, LOW);
    vTaskDelay(pdMS_TO_TICKS(20));

    // 4. Kích Rơ-le NGẮT điện 5V cách ly hoàn toàn
    digitalWrite(Config::PIN_RELAY_SERVO, Config::RELAY_SERVO_OFF);

    reportPending = true;
    Serial.printf("[ACTUATOR] Chot cua: %s (%d do)\n",
                  locked ? "DONG KHOA" : "MO CHOT",
                  locked ? Config::SERVO_LOCK_ANGLE : Config::SERVO_UNLOCK_ANGLE);
}

static void setArmed(bool armed) {
    portENTER_CRITICAL(&gMux);
    g.armed = armed;
    if (!armed) {
        g.alarm = false;            // DISARM lập tức ngắt còi hú và tắt báo động
        g.autoDoorGuestActive = false;
    }
    portEXIT_CRITICAL(&gMux);

    // Khi chuyển chế độ: luôn đưa chốt về trạng thái đóng an toàn ban đầu
    setLockState(true);

    prefs.putBool("armed", armed);
    reportPending = true;
    Serial.printf("[SYSTEM] Che do he thong: %s\n", armed ? "ARMED (BAT BAO VE)" : "DISARMED (CUA TU DONG THONG MINH)");
}

static void silenceAlarm() {
    portENTER_CRITICAL(&gMux);
    g.alarm = false;
    portEXIT_CRITICAL(&gMux);
    reportPending = true;
    Serial.println("[SYSTEM] Da tat coi bao dong");
}

static void setThreshold(int cm) {
    cm = constrain(cm, Config::MIN_THRESHOLD_CM, Config::MAX_THRESHOLD_CM);
    portENTER_CRITICAL(&gMux);
    g.thresholdCm = (uint16_t)cm;
    portEXIT_CRITICAL(&gMux);
    prefs.putUShort("thr", (uint16_t)cm);
    reportPending = true;
    Serial.printf("[SYSTEM] Da cap nhat nguong Sonar: %d cm\n", cm);
}

// ============================================================================
// 3. CORE 1: TÁC VỤ CẢM BIẾN & LOGIC CỬA TỰ ĐỘNG / BÁO ĐỘNG (Priority 2)
// ============================================================================
static float readDistanceCm() {
    digitalWrite(Config::PIN_US_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(Config::PIN_US_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(Config::PIN_US_TRIG, LOW);

    // Timeout 25000µs (~4 mét)
    const unsigned long durationUs = pulseIn(Config::PIN_US_ECHO, HIGH, 25000UL);
    if (durationUs == 0) return -1.0f;
    return (float)durationUs * 0.0343f / 2.0f;
}

static void sensorTask(void* pvParameters) {
    TickType_t lastWakeTime = xTaskGetTickCount();
    static bool lastBtnState = HIGH;
    static unsigned long lastBtnDebounceMs = 0;
    static bool lastSwitchState = HIGH;
    static unsigned long lastSwitchDebounceMs = 0;
    static unsigned long lastIntruderSeenMs = 0;

    for (;;) {
        const unsigned long now = millis();

        // 1. ĐỌC CÔNG TẮC GẠT 3 CHÂN (Chân D26 - Ưu tiên điều khiển tại chỗ)
        const bool curSwitch = digitalRead(Config::PIN_SWITCH_ARM);
        if (curSwitch != lastSwitchState && (now - lastSwitchDebounceMs > 250)) {
            lastSwitchDebounceMs = now;
            lastSwitchState = curSwitch;
            // Gạt sang chân nối GND (LOW) = ARMED (Bật bảo vệ)
            // Gạt sang chân hở (HIGH) = DISARM (Cửa tự động đón khách)
            const bool newArmed = (curSwitch == LOW);
            Serial.printf("[SWITCH D26] Cong tac gat -> %s\n", newArmed ? "ARMED (BAT BAO VE)" : "DISARMED (CUA TU DONG)");
            setArmed(newArmed);
        }

        // 2. ĐỌC NÚT NHẤN EXIT (Chân D27 - Mở cửa thoát hiểm & Tắt báo động)
        const bool curBtn = digitalRead(Config::PIN_BUTTON_EXIT);
        if (curBtn != lastBtnState && (now - lastBtnDebounceMs > Config::BUTTON_DEBOUNCE_MS)) {
            lastBtnDebounceMs = now;
            lastBtnState = curBtn;
            if (curBtn == LOW) {
                Serial.println("[BUTTON D27] Nguoi nha an nut Exit -> Mo chot cua & Tat bao dong!");
                silenceAlarm();      // Tắt còi ngay lập tức nếu đang hú
                setLockState(false); // Mở toang chốt cửa 160 độ

                portENTER_CRITICAL(&gMux);
                g.autoRelockAtMs = now + Config::AUTO_RELOCK_DELAY_MS; // Tự động khóa lại sau 2s
                if (g.armed) {
                    g.exitDelayUntilMs = now + Config::EXIT_DELAY_MS; // Hoãn báo động 10s để bước ra
                }
                portEXIT_CRITICAL(&gMux);
            }
        }

        // 3. TỰ ĐỘNG ĐÓNG CHỐT CỬA (AUTO-RELOCK) SAU 2 GIÂY MỞ
        bool triggerRelock = false;
        portENTER_CRITICAL(&gMux);
        if (g.autoRelockAtMs > 0 && now >= g.autoRelockAtMs) {
            g.autoRelockAtMs = 0;
            g.autoDoorGuestActive = false;
            triggerRelock = true;
        }
        portEXIT_CRITICAL(&gMux);

        if (triggerRelock) {
            Serial.println("[ACTUATOR] Het 2 giay mo cua -> Tu dong dong chot khoa an toan (Auto-Relock)!");
            setLockState(true); // Khóa chốt an toàn 0 độ
        }

        // 4. ĐỌC CẢM BIẾN SIÊU ÂM & CẢM BIẾN PIR
        const bool  pirVal     = (digitalRead(Config::PIN_PIR) == HIGH);
        const float distVal    = readDistanceCm();
        const bool  warmupDone = (now > Config::PIR_WARMUP_MS);
        const char* alertSource = nullptr;

        portENTER_CRITICAL(&gMux);
        g.pir = pirVal;
        g.distanceCm = distVal;

        // BỘ LỌC CHỐNG BÁO GIẢ KHOẢNG CÁCH 3CM (BỊ MÉP THÙNG CARTON CHẮN):
        // HC-SR04 chỉ nhận diện người khi khoảng cách từ 5cm trở lên và <= ngưỡng (12cm)
        // Khoảng cách < 5cm xem là mép vỏ hộp/nhiễu vật lý -> BỎ QUA để không bị hú còi oan!
        const bool objectDetected = (distVal >= 5.0f && distVal <= (float)g.thresholdCm);

        // ---------------------------------------------------------------------
        // KỊCH BẢN 1: KHI TẮT BẢO VỆ (DISARM) -> CHẾ ĐỘ CỬA TỰ ĐỘNG ĐÓN KHÁCH
        // Điều kiện: Khi có khách đến gần cửa (đáp ứng đồng thời PIR + Sonar)
        // ---------------------------------------------------------------------
        if (!g.armed) {
            if (objectDetected && pirVal) {
                // Khách đến gần: tự động mở cửa nếu cửa đang đóng!
                if (g.doorLocked) {
                    Serial.printf("[SMART-DOOR] Phat hien khach (PIR + Sonar %.1f cm) -> Tu dong mo cua!\n", distVal);
                    portEXIT_CRITICAL(&gMux);
                    setLockState(false); // Mở chốt cửa 160 độ
                    portENTER_CRITICAL(&gMux);
                }
                // Gia hạn thời gian mở cửa 2 giây tính từ lần phát hiện cuối
                g.autoRelockAtMs = now + Config::AUTO_RELOCK_DELAY_MS;
                g.autoDoorGuestActive = true;
            }
        } 
        // ---------------------------------------------------------------------
        // KỊCH BẢN 2: KHI BẬT BẢO VỆ (ARMED) -> BÁO ĐỘNG CHỐNG TRỘM
        // QUY CHUẨN KÉP BẮT BUỘC: ĐỦ CẢ 2 CẢM BIẾN (PIR CÓ NGƯỜI VÀ SONAR ĐO TRONG VÙNG)
        // ---------------------------------------------------------------------
        else {
            const bool exitDelayActive = (now < g.exitDelayUntilMs);
            const bool intruderDetected = (pirVal && objectDetected); // BẮT BUỘC ĐỦ CẢ 2 ĐIỀU KIỆN!

            if (!g.alarm && warmupDone && !exitDelayActive && intruderDetected) {
                alertSource = "PIR+SONAR";
                g.alarm = true;
                g.alarmSinceMs = now;
                lastIntruderSeenMs = now;
            }

            if (g.alarm) {
                if (intruderDetected) {
                    // Nếu vẫn còn trộm / bàn tay trong vùng tiếp cận: Cập nhật mốc thời gian
                    lastIntruderSeenMs = now;
                } else {
                    // KHI ĐÃ RÚT TAY / NGƯỜI RỜI ĐI:
                    // Sau 2 giây không còn người -> TỰ ĐỘNG NGẮT CÒI & HẾT BÁO ĐỘNG (Auto-Clear)!
                    if (now - lastIntruderSeenMs >= 2000) {
                        g.alarm = false;
                        reportPending = true;
                        Serial.println("[ALARM] Nguoi da roi khoi vung quet -> Tu dong tat bao dong (Auto-Clear)!");
                    }
                }

                // Tối đa ngắt sau 10s nếu kẹt
                if (now - g.alarmSinceMs >= Config::ALARM_AUTO_SILENCE_MS) {
                    g.alarm = false;
                }
            }
        }
        portEXIT_CRITICAL(&gMux);

        // Đẩy sự kiện đột nhập vào hàng đợi gửi tin lên Cloud
        if (alertSource != nullptr) {
            AlertEvent ev{};
            strlcpy(ev.sensor, alertSource, sizeof(ev.sensor));
            ev.distanceCm = distVal;
            xQueueSend(alertQueue, &ev, 0);
            Serial.printf("[ALERT] Phat hien dot nhap boi %s! Khoang cach: %.1f cm\n", alertSource, distVal);
        }

        vTaskDelayUntil(&lastWakeTime, pdMS_TO_TICKS(Config::SENSOR_INTERVAL_MS));
    }
}

// ============================================================================
// 4. CORE 1: TÁC VỤ CÒI HÚ, ĐÈN BÁO & HIỂN THỊ LCD 16X2 (Priority 3)
// ============================================================================
static void updateLcdDisplay(const SharedState& s) {
    static unsigned long lastLcdUpdate = 0;
    const unsigned long now = millis();

    if (now - lastLcdUpdate < Config::LCD_REFRESH_MS) return;
    lastLcdUpdate = now;

    char line1[17];
    char line2[17];

    if (s.alarm) {
        // Màn hình khi có trộm: Nhấp nháy cảnh báo khẩn cấp rõ ràng
        const bool blink = ((now / 350) % 2 == 0);
        if (blink) {
            snprintf(line1, sizeof(line1), "!! CANH BAO !!  ");
            snprintf(line2, sizeof(line2), "CO TROM TIEP CAN");
        } else {
            snprintf(line1, sizeof(line1), ">> PHAT HIEN << ");
            if (s.distanceCm >= 0.0f) {
                snprintf(line2, sizeof(line2), "K/CACH: %2dcm PIR", (int)s.distanceCm);
            } else {
                snprintf(line2, sizeof(line2), "K/CACH: --cm PIR");
            }
        }
    } else if (!s.armed && s.autoDoorGuestActive) {
        // Màn hình khi cửa tự động mở đón khách
        snprintf(line1, sizeof(line1), "CUA TU DONG MO  ");
        snprintf(line2, sizeof(line2), "XIN CHAO KHACH! ");
    } else if (s.autoRelockAtMs > 0 && now < s.autoRelockAtMs) {
        // Màn hình khi người nhà ấn nút Exit Button mở cửa (Đếm ngược tự khóa)
        const int secLeft = (int)((s.autoRelockAtMs - now + 999) / 1000);
        snprintf(line1, sizeof(line1), "MO CUA THOAT    ");
        snprintf(line2, sizeof(line2), "TU KHOA SAU: %ds ", secLeft);
    } else {
        // Dòng 1: Trạng thái hệ thống + Chốt khóa Servo
        if (s.armed) {
            snprintf(line1, sizeof(line1), "ARMED  |KHOA CUA");
        } else {
            snprintf(line1, sizeof(line1), "DISARM |DONG CUA");
        }

        // Dòng 2: Chỉ số cảm biến (Khoảng cách + PIR)
        if (s.armed && s.pir) {
            // Khi phát hiện có người từ xa (Demo cấp 1)
            snprintf(line2, sizeof(line2), "D:%2dcm|CO NGUOI", (int)s.distanceCm);
        } else if (s.distanceCm >= 0.0f) {
            snprintf(line2, sizeof(line2), "D:%3dcm|PIR:%s",
                     (int)s.distanceCm, s.pir ? "CO " : "KO ");
        } else {
            snprintf(line2, sizeof(line2), "D: --- |PIR:%s",
                     s.pir ? "CO " : "KO ");
        }
    }

    lcd.setCursor(0, 0);
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);
}

static void alarmOutputTask(void* pvParameters) {
    for (;;) {
        const SharedState s = snapshot();
        const unsigned long now = millis();

        // 1. ĐIỀU KHIỂN DÃY LED XANH (D33):
        // Sáng LÊN KHI VÀ CHỈ KHI CỬA MỞ (khi ấn nút Exit mở cửa hoặc Cửa tự động mở đón khách)!
        // Khi cửa đóng khóa lại: TẮT HẲN!
        setLedArmedPin(!s.doorLocked);

        // 2. ĐIỀU KHIỂN DÃY LED ĐỎ (D32) & CÒI HÚ (D23) - 3 CẤP ĐỘ DEMO CHUẨN:
        if (s.alarm) {
            // CẤP ĐỘ 2: TIẾP CẬN GẦN NGUY HIỂM -> LED ĐỎ NHẤP NHÁY 2Hz + CÒI BÍP BÍP DỒN DẬP!
            const bool toggleLed = ((now / 250) % 2 == 0);
            setLedAlarmPin(toggleLed);

            // Còi thông minh nhịp đôi: BÍP 80ms - NGHỈ 100ms - BÍP 80ms - NGHỈ 740ms
            if (ENABLE_BUZZER) {
                const uint32_t cycleMs = now % 1000;
                const bool beepNow = (cycleMs < 80) || (cycleMs >= 180 && cycleMs < 260);
                digitalWrite(Config::PIN_BUZZER, beepNow ? HIGH : LOW);
            } else {
                digitalWrite(Config::PIN_BUZZER, LOW);
            }
        } 
        else if (s.armed && s.pir) {
            // CẤP ĐỘ 1: PHÁT HIỆN CÓ NGƯỜI TỪ XA (PIR BÁO) -> LED ĐỎ SÁNG ĐỨNG YÊN, CÒI IM LẶNG!
            setLedAlarmPin(true);
            digitalWrite(Config::PIN_BUZZER, LOW);
        } 
        else {
            // TRẠNG THÁI BÌNH THƯỜNG: TẮT HẲN LED ĐỎ VÀ CÒI
            setLedAlarmPin(false);
            digitalWrite(Config::PIN_BUZZER, LOW);
        }

        // 3. Cập nhật màn hình LCD 16x2
        updateLcdDisplay(s);

        // Nhường CPU 20ms
        vTaskDelay(pdMS_TO_TICKS(20));
    }
}

// ============================================================================
// 5. CORE 0: MẠNG WI-FI, FIREBASE REALTIME DATABASE (Priority 1)
// ============================================================================
static void sendFirebaseTelemetry(const SharedState& s, uint32_t now) {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    const String url = String("https://") + FIREBASE_HOST + FB_PATH_TELEMETRY + "?auth=" + FIREBASE_AUTH;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    JsonDocument doc;
    doc["armed"]       = s.armed;
    doc["doorLocked"]  = s.doorLocked;
    doc["alarm"]       = s.alarm;
    doc["pir"]         = s.pir;
    doc["distanceCm"]  = (s.distanceCm < 0) ? -1.0f : roundf(s.distanceCm * 10) / 10.0f;
    doc["thresholdCm"] = s.thresholdCm;
    doc["rssi"]        = WiFi.RSSI();
    doc["uptimeS"]     = now / 1000;
    doc["ts"]          = getEpochMs();

    String body;
    serializeJson(doc, body);
    http.PUT(body);
    http.end();
}

static void pollFirebaseControl() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    const String url = String("https://") + FIREBASE_HOST + FB_PATH_CONTROL + "?auth=" + FIREBASE_AUTH;
    http.begin(url);
    int httpCode = http.GET();

    if (httpCode == 200) {
        String payload = http.getString();
        if (payload != "null" && payload.length() > 5) {
            JsonDocument doc;
            DeserializationError err = deserializeJson(doc, payload);
            if (!err) {
                // Nhận lệnh tắt còi từ Web
                if (doc["silenceAlarm"] == true) {
                    silenceAlarm();
                    HTTPClient resetHttp;
                    String patchUrl = String("https://") + FIREBASE_HOST + FB_PATH_CONTROL + "?auth=" + FIREBASE_AUTH;
                    resetHttp.begin(patchUrl);
                    resetHttp.PATCH("{\"silenceAlarm\":false}");
                    resetHttp.end();
                }
            }
        }
    }
    http.end();
}

static void sendFirebaseAlert(const AlertEvent& ev) {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    const String url = String("https://") + FIREBASE_HOST + FB_PATH_ALERTS + "?auth=" + FIREBASE_AUTH;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    JsonDocument doc;
    doc["timestamp"]  = getEpochMs();
    doc["type"]       = "INTRUSION_DETECTED";
    doc["sensor"]     = ev.sensor;
    doc["distanceCm"] = ev.distanceCm;
    doc["message"]    = String("Phat hien dot nhap boi ") + ev.sensor;

    String body;
    serializeJson(doc, body);
    http.POST(body);
    http.end();
}

static void networkTask(void* pvParameters) {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    tlsClient.setInsecure(); // Tiết kiệm RAM
    configTime(7 * 3600, 0, "pool.ntp.org", "time.google.com");

    uint32_t lastWifiRetry      = 0;
    uint32_t lastFbTelemetry    = 0;
    uint32_t lastFbPollControl  = 0;

    for (;;) {
        const uint32_t now = millis();

        // 1. Quản lý kết nối Wi-Fi
        if (WiFi.status() != WL_CONNECTED) {
            if (now - lastWifiRetry >= Config::WIFI_RETRY_MS) {
                lastWifiRetry = now;
                Serial.println("[WIFI-CORE0] Dang thu ket noi lai Wi-Fi...");
                WiFi.reconnect();
            }
            vTaskDelay(pdMS_TO_TICKS(100));
            continue;
        }

        // 2. Gửi sự kiện cảnh báo khẩn cấp từ Core 1 lên Firebase ngay lập tức
        AlertEvent ev;
        while (xQueueReceive(alertQueue, &ev, 0) == pdTRUE) {
            sendFirebaseAlert(ev);
            Serial.printf("[FIREBASE-CORE0] Da gui canh bao dot nhap [%s] len Cloud Realtime!\n", ev.sensor);
        }

        // 3. Đẩy Telemetry lên Firebase Realtime Database mỗi 1 giây (Hot Path <50ms)
        if (now - lastFbTelemetry >= Config::FB_STREAM_INTERVAL_MS) {
            lastFbTelemetry = now;
            const SharedState s = snapshot();
            sendFirebaseTelemetry(s, now);
        }

        // 4. Đọc lệnh điều khiển từ Web qua Firebase mỗi 500ms
        if (now - lastFbPollControl >= Config::FB_POLL_CONTROL_MS) {
            lastFbPollControl = now;
            pollFirebaseControl();
        }

        vTaskDelay(pdMS_TO_TICKS(50));
    }
}

// ============================================================================
// 6. SETUP & MAIN ENTRY
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n=======================================================");
    Serial.println("  HE THONG IOT CANH BAO CHONG TROM & CUA TU DONG v2.4");
    Serial.println("=======================================================");

    // Khởi tạo các chân GPIO cảm biến, còi, nút nhấn, công tắc và Relay
    pinMode(Config::PIN_PIR, INPUT);
    pinMode(Config::PIN_US_TRIG, OUTPUT);
    pinMode(Config::PIN_US_ECHO, INPUT);
    pinMode(Config::PIN_BUZZER, OUTPUT);
    pinMode(Config::PIN_LED_ALARM, OUTPUT);
    pinMode(Config::PIN_LED_ARMED, OUTPUT);
    pinMode(Config::PIN_RELAY_SERVO, OUTPUT);
    pinMode(Config::PIN_BUTTON_EXIT, INPUT_PULLUP);
    pinMode(Config::PIN_SWITCH_ARM, INPUT_PULLUP); // Công tắc gạt 3 chân

    digitalWrite(Config::PIN_US_TRIG, LOW);
    digitalWrite(Config::PIN_BUZZER, LOW);
    // Khởi tạo LED tắt hẳn theo cực tính A1015
    setLedAlarmPin(false);
    setLedArmedPin(false);
    // Ngắt Rơ-le để bảo vệ nguồn Servo
    digitalWrite(Config::PIN_RELAY_SERVO, Config::RELAY_SERVO_OFF);

    // Khởi tạo giao tiếp I2C và Màn hình LCD 16x2
    Wire.begin(Config::PIN_I2C_SDA, Config::PIN_I2C_SCL);
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("  HE THONG IOT  ");
    lcd.setCursor(0, 1);
    lcd.print(" CHONG TROM v2.4");

    // Khởi tạo Động cơ Servo SG90 (chốt cửa)
    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    ESP32PWM::allocateTimer(2);
    ESP32PWM::allocateTimer(3);
    servoLock.setPeriodHertz(50);
    pinMode(Config::PIN_SERVO, OUTPUT);
    digitalWrite(Config::PIN_SERVO, LOW);

    // Đọc trạng thái từ Flash NVS
    prefs.begin("chongtrom", false);
    g.thresholdCm = prefs.getUShort("thr", 12); // Mặc định 12cm cho mô hình thùng bia
    if (g.thresholdCm > 12) {
        g.thresholdCm = 12; // Cố định 12cm để tránh mặt bàn 14cm kích hoạt báo động giả
        prefs.putUShort("thr", 12);
    }

    // ĐỌC VỊ TRÍ CÔNG TẮC GẠT D26 LÚC BOOT:
    // Chân D26 gạt sang GND (LOW) = ARMED (Bật bảo vệ)
    // Chân D26 hở (HIGH) = DISARM (Cửa tự động đón khách)
    const bool switchBoot = (digitalRead(Config::PIN_SWITCH_ARM) == LOW);
    g.armed = switchBoot;
    g.doorLocked = true; // Luôn đóng chốt ban đầu

    // Đặt vị trí ban đầu & Self-Test Servo: Quay 160 độ (Mở) -> 0 độ (Khóa)
    // Kỹ thuật Power-Gating triệt để: Kích rơ-le -> Gắn PWM -> Quay -> Detach -> Ngắt rơ-le
    digitalWrite(Config::PIN_RELAY_SERVO, Config::RELAY_SERVO_ON);
    delay(50);
    servoLock.attach(Config::PIN_SERVO, Config::SERVO_MIN_US, Config::SERVO_MAX_US);
    servoLock.write(Config::SERVO_UNLOCK_ANGLE); // Quay về 160 độ (Mở)
    delay(450);
    servoLock.write(Config::SERVO_LOCK_ANGLE);   // Quay về 0 độ (Khóa lại)
    delay(Config::SERVO_MOVE_TIME_MS);
    servoLock.detach();
    pinMode(Config::PIN_SERVO, OUTPUT);
    digitalWrite(Config::PIN_SERVO, LOW);
    digitalWrite(Config::PIN_RELAY_SERVO, Config::RELAY_SERVO_OFF);

    // Boot Self-Test: Chớp LED và bíp còi 1 tiếng ngắn 60ms rất êm
    setLedArmedPin(true);
    setLedAlarmPin(true);
    if (ENABLE_BUZZER) {
        digitalWrite(Config::PIN_BUZZER, HIGH);
        delay(60);
        digitalWrite(Config::PIN_BUZZER, LOW);
    }
    setLedArmedPin(false);
    setLedAlarmPin(false);

    delay(600);
    lcd.clear();

    // Khởi tạo hàng đợi cảnh báo FreeRTOS (8 sự kiện)
    alertQueue = xQueueCreate(8, sizeof(AlertEvent));

    // Khởi tạo và ghim các Task vào 2 nhân độc lập:
    // Core 0: Mạng & Firebase Cloud Realtime Stream (Priority 1)
    xTaskCreatePinnedToCore(networkTask, "firebaseNetTask", 10240, nullptr, 1, nullptr, 0);

    // Core 1: Đọc cảm biến non-blocking & Cửa tự động (Priority 2)
    xTaskCreatePinnedToCore(sensorTask, "sensorTask", 4096, nullptr, 2, nullptr, 1);

    // Core 1: Phát còi, LED cảnh báo & Màn hình LCD (Priority 3 - Ưu tiên cao nhất)
    xTaskCreatePinnedToCore(alarmOutputTask, "alarmOutputTask", 3072, nullptr, 3, nullptr, 1);
}

void loop() {
    vTaskDelete(nullptr);
}
