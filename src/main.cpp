#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
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
// 1. DỮ LIỆU DÙNG CHUNG GIỮA CÁC NHÂN (SHARED STATE & MUTEX)
// ============================================================================
struct SharedState {
    bool     armed = false;
    bool     alarm = false;
    bool     pir = false;
    bool     doorLocked = true;           // Mặc định cửa đóng
    float    distanceCm = -1.0f;
    uint32_t alarmSinceMs = 0;
    uint16_t thresholdCm = 12;            // Ngưỡng tiếp cận gần (12cm: <12cm là người/tay, 14cm mặt bàn trống)
    uint32_t autoRelockAtMs = 0;          // Hẹn giờ tự động đóng chốt lại sau 2s
    uint32_t exitDelayUntilMs = 0;        // Hoãn báo động 10s khi người nhà ấn nút đi ra
    bool     autoDoorGuestActive = false; // Cờ báo cửa đang mở đón khách
};

struct AlertEvent {
    char  sensor[16];                     // Đủ dung lượng chứa "PIR+SONAR" (10 bytes) không bị cắt ngắn
    float distanceCm;
};

static SharedState        g;
static portMUX_TYPE       gMux = portMUX_INITIALIZER_UNLOCKED;
static QueueHandle_t      alertQueue;
static QueueHandle_t      doorQueue;      // Hàng đợi điều khiển Servo bất đồng bộ (Non-blocking)
static Preferences        prefs;

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

// Kết nối mạng TLS Client dùng chung
static WiFiClientSecure   tlsClient;

// Helper điều khiển LED theo cực tính transistor A1015
static inline void setLedAlarmPin(bool on) {
    digitalWrite(Config::PIN_LED_ALARM, INVERT_LEDS ? (on ? LOW : HIGH) : (on ? HIGH : LOW));
}

static inline void setLedArmedPin(bool on) {
    digitalWrite(Config::PIN_LED_ARMED, INVERT_LEDS ? (on ? LOW : HIGH) : (on ? HIGH : LOW));
}

// Lấy bản sao an toàn của SharedState (Snapshot với spinlock ngắn gọn)
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
// 2. ĐIỀU KHIỂN CHẤP HÀNH BẤT ĐỒNG BỘ (DOOR TASK & SERVO POWER-GATING)
// Tách điều khiển servo ra task riêng giúp sensorTask không bị block 520ms!
// ============================================================================
static void requestLockState(bool locked) {
    portENTER_CRITICAL(&gMux);
    g.doorLocked = locked;
    portEXIT_CRITICAL(&gMux);

    if (doorQueue != nullptr) {
        xQueueOverwrite(doorQueue, &locked); // Gửi lệnh ngay lập tức, không chặn
    }
}

static void doorTask(void* pvParameters) {
    bool targetLocked = true;
    for (;;) {
        if (xQueueReceive(doorQueue, &targetLocked, portMAX_DELAY) == pdTRUE) {
            // ĐIỀU KHIỂN SERVO TRỰC TIẾP TỪ NGUỒN HẠ ÁP 5V:
            // 1. Gắn chân PWM và phát xung điều khiển góc quay (600µs - 2400µs an toàn)
            servoLock.attach(Config::PIN_SERVO, Config::SERVO_MIN_US, Config::SERVO_MAX_US);
            servoLock.write(targetLocked ? Config::SERVO_LOCK_ANGLE : Config::SERVO_UNLOCK_ANGLE);
            vTaskDelay(pdMS_TO_TICKS(Config::SERVO_MOVE_TIME_MS));

            // 2. NGẮT XUNG PWM (DETACH) VÀ KÉO CHÂN TÍN HIỆU VỀ 0V
            // Tự động ngủ: triệt tiêu 100% rung giật, không nóng motor, không cần Rơ-le!
            servoLock.detach();
            pinMode(Config::PIN_SERVO, OUTPUT);
            digitalWrite(Config::PIN_SERVO, LOW);

            portENTER_CRITICAL(&gMux);
            g.doorLocked = targetLocked;
            portEXIT_CRITICAL(&gMux);

            Serial.printf("[ACTUATOR] Chot cua: %s (%d do)\n",
                          targetLocked ? "DONG KHOA" : "MO CHOT",
                          targetLocked ? Config::SERVO_LOCK_ANGLE : Config::SERVO_UNLOCK_ANGLE);
        }
    }
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
    requestLockState(true);
    Serial.printf("[SYSTEM] Che do he thong: %s\n", armed ? "ARMED (BAT BAO VE)" : "DISARMED (CUA TU DONG THONG MINH)");
}

static void silenceAlarm() {
    portENTER_CRITICAL(&gMux);
    g.alarm = false;
    portEXIT_CRITICAL(&gMux);
    Serial.println("[SYSTEM] Da tat coi bao dong");
}

static void setThreshold(uint16_t thr) {
    if (thr < Config::MIN_THRESHOLD_CM) thr = Config::MIN_THRESHOLD_CM;
    if (thr > Config::MAX_THRESHOLD_CM) thr = Config::MAX_THRESHOLD_CM;

    portENTER_CRITICAL(&gMux);
    g.thresholdCm = thr;
    portEXIT_CRITICAL(&gMux);

    prefs.putUShort("thr", thr);
    Serial.printf("[CONFIG] Da cap nhat nguong cu ly moi: %u cm (da luu Flash NVS)\n", thr);
}

// ============================================================================
// 3. CORE 1: TÁC VỤ CẢM BIẾN & LOGIC CỬA TỰ ĐỘNG / BÁO ĐỘNG (Priority 2)
// Hoạt động 100% NON-BLOCKING theo chu kỳ 200ms
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
    
    // Khởi tạo trạng thái công tắc gạt bằng giá trị vật lý thực tế lúc boot (tránh kích hoạt lặp)
    static bool lastSwitchState = (digitalRead(Config::PIN_SWITCH_ARM) == LOW);
    static unsigned long lastSwitchDebounceMs = 0;
    static unsigned long lastIntruderSeenMs = 0;
    static uint8_t sonarHitCount = 0; // Bộ lọc xác nhận 2 lần liên tiếp chống nhiễu xung đơn lẻ

    for (;;) {
        const unsigned long now = millis();

        // 1. ĐỌC CÔNG TẮC GẠT 3 CHÂN (Chân D26 - Ưu tiên điều khiển tại chỗ)
        const bool curSwitch = (digitalRead(Config::PIN_SWITCH_ARM) == LOW);
        if (curSwitch != lastSwitchState && (now - lastSwitchDebounceMs > 250)) {
            lastSwitchDebounceMs = now;
            lastSwitchState = curSwitch;
            Serial.printf("[SWITCH D26] Cong tac gat -> %s\n", curSwitch ? "ARMED (BAT BAO VE)" : "DISARMED (CUA TU DONG)");
            setArmed(curSwitch);
        }

        // 2. ĐỌC NÚT NHẤN EXIT (Chân D27 - Mở cửa thoát hiểm & Tắt báo động)
        const bool curBtn = digitalRead(Config::PIN_BUTTON_EXIT);
        if (curBtn != lastBtnState && (now - lastBtnDebounceMs > Config::BUTTON_DEBOUNCE_MS)) {
            lastBtnDebounceMs = now;
            lastBtnState = curBtn;
            if (curBtn == LOW) {
                Serial.println("[BUTTON D27] Nguoi nha an nut Exit -> Mo chot cua & Tat bao dong!");
                silenceAlarm();          // Tắt còi ngay lập tức nếu đang hú
                requestLockState(false); // Mở toang chốt cửa 160 độ (Non-blocking)

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
            requestLockState(true); // Khóa chốt an toàn 0 độ (Non-blocking)
        }

        // 4. ĐỌC CẢM BIẾN SIÊU ÂM & CẢM BIẾN PIR
        const bool  pirVal     = (digitalRead(Config::PIN_PIR) == HIGH);
        const float distVal    = readDistanceCm();
        const bool  warmupDone = (now > Config::PIR_WARMUP_MS);
        const char* alertSource = nullptr;

        // NHẬN DIỆN KHOẢNG CÁCH TIẾP CẬN (1.5cm đến 12cm):
        // Chấp nhận mọi khoảng cách từ 1.5cm trở lên để khi đưa tay sát (2cm - 3cm như trên LCD) hệ thống nhận diện tức thì!
        // Mặt bàn trống (14cm) hoặc không có vật cản (>12cm hoặc -1) sẽ bị loại bỏ.
        const bool objectDetected = (distVal >= 1.5f && distVal <= (float)g.thresholdCm);

        bool triggerGuestOpen = false;
        bool triggerAutoClearLog = false;

        portENTER_CRITICAL(&gMux);
        g.pir = pirVal;
        g.distanceCm = distVal;

        // ---------------------------------------------------------------------
        // KỊCH BẢN 1: KHI TẮT BẢO VỆ (DISARM) -> CHẾ ĐỘ CỬA TỰ ĐỘNG ĐÓN KHÁCH
        // ---------------------------------------------------------------------
        if (!g.armed) {
            if (objectDetected && pirVal) {
                if (g.doorLocked) {
                    triggerGuestOpen = true;
                }
                g.autoRelockAtMs = now + Config::AUTO_RELOCK_DELAY_MS;
                g.autoDoorGuestActive = true;
            }
        } 
        // ---------------------------------------------------------------------
        // KỊCH BẢN 2: KHI BẬT BẢO VỆ (ARMED) -> BÁO ĐỘNG CHỐNG TRỘM
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
                    lastIntruderSeenMs = now;
                } else {
                    // Sau 2 giây không còn người -> TỰ ĐỘNG NGẮT CÒI (Auto-Clear)
                    if (now - lastIntruderSeenMs >= 2000) {
                        g.alarm = false;
                        triggerAutoClearLog = true;
                    }
                }

                // Tối đa ngắt sau 10s nếu kẹt
                if (now - g.alarmSinceMs >= Config::ALARM_AUTO_SILENCE_MS) {
                    g.alarm = false;
                }
            }
        }
        portEXIT_CRITICAL(&gMux);

        // THỰC HIỆN CÁC THAO TÁC IN VÀ GỬI LỆNH NGOÀI VÙNG CRITICAL SECTION (An toàn 100%):
        if (triggerGuestOpen) {
            Serial.printf("[SMART-DOOR] Phat hien khach (PIR + Sonar %.1f cm) -> Tu dong mo cua!\n", distVal);
            requestLockState(false);
        }

        if (triggerAutoClearLog) {
            Serial.println("[ALARM] Nguoi da roi khoi vung quet -> Tu dong tat bao dong (Auto-Clear)!");
        }

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
        snprintf(line1, sizeof(line1), "CUA TU DONG MO  ");
        snprintf(line2, sizeof(line2), "XIN CHAO KHACH! ");
    } else if (s.autoRelockAtMs > 0 && now < s.autoRelockAtMs) {
        const int secLeft = (int)((s.autoRelockAtMs - now + 999) / 1000);
        snprintf(line1, sizeof(line1), "MO CUA THOAT    ");
        snprintf(line2, sizeof(line2), "TU KHOA SAU: %ds ", secLeft);
    } else {
        // Dòng 1: Trạng thái hệ thống + Chốt khóa Servo (Chuẩn 16 ký tự)
        if (s.armed) {
            snprintf(line1, sizeof(line1), "ARMED  |KHOA CUA");
        } else {
            snprintf(line1, sizeof(line1), "DISARM |DONG CUA");
        }

        // Dòng 2: Chỉ số cảm biến (Căn chỉnh chính xác 16 ký tự loại bỏ ký tự rác)
        if (s.armed && s.pir) {
            snprintf(line2, sizeof(line2), "D:%2dcm|CO NGUOI ", (int)s.distanceCm);
        } else if (s.distanceCm >= 0.0f) {
            snprintf(line2, sizeof(line2), "D:%3dcm |PIR:%-3s", (int)s.distanceCm, s.pir ? "CO" : "KO");
        } else {
            snprintf(line2, sizeof(line2), "D: ---  |PIR:%-3s", s.pir ? "CO" : "KO");
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

        // 1. ĐIỀU KHIỂN DÃY LED XANH (D33): Sáng khi cửa mở, tắt khi cửa đóng
        setLedArmedPin(!s.doorLocked);

        // 2. ĐIỀU KHIỂN DÃY LED ĐỎ (D32) & CÒI HÚ (D23) - 3 CẤP ĐỘ DEMO CHUẨN:
        if (s.alarm) {
            // CẤP ĐỘ 2: TIẾP CẬN GẦN NGUY HIỂM -> CÒI BÁO ĐỘNG & LED ĐỎ NHẤP NHÁY DỒN DẬP ĐỒNG BỘ
            // Nhịp chớp 200ms BẬT - 200ms TẮT: Còi kêu "TÍT... TÍT... TÍT..." dồn dập chuẩn hệ thống báo trộm
            const bool alarmPulse = ((now / 200) % 2 == 0);
            setLedAlarmPin(alarmPulse);

            if (ENABLE_BUZZER) {
                digitalWrite(Config::PIN_BUZZER, alarmPulse ? HIGH : LOW);
            } else {
                digitalWrite(Config::PIN_BUZZER, LOW);
            }
        } 
        else if (s.armed && s.pir) {
            // CẤP ĐỘ 1: PHÁT HIỆN CÓ NGƯỜI TỪ XA (PIR BÁO) -> LED ĐỎ SÁNG ĐỨNG YÊN, CÒI IM LẶNG
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
// Quản lý TLS an toàn, chống cạn kiệt Heap RAM
// ============================================================================
static void sendFirebaseTelemetry(const SharedState& s, uint32_t now) {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    http.setTimeout(2500); // Đặt timeout 2.5s chống nghẽn mạng
    const String url = String("https://") + FIREBASE_HOST + FB_PATH_TELEMETRY + "?auth=" + FIREBASE_AUTH;
    http.begin(tlsClient, url);
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
    http.end(); // Giải phóng socket ngay lập tức
}

static void pollFirebaseControl() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    http.setTimeout(2500);
    const String url = String("https://") + FIREBASE_HOST + FB_PATH_CONTROL + "?auth=" + FIREBASE_AUTH;
    http.begin(tlsClient, url);
    int httpCode = http.GET();

    bool needSilence = false;
    if (httpCode == 200) {
        String payload = http.getString();
        if (payload != "null" && payload.length() > 5) {
            JsonDocument doc;
            DeserializationError err = deserializeJson(doc, payload);
            if (!err) {
                // 1. Xử lý lệnh ngắt còi hú tức thì
                if (doc["silenceAlarm"] == true) {
                    needSilence = true;
                }

                // 2. Xử lý lệnh có cmdId (chống xung đột với công tắc vật lý & không chạy lại lệnh cũ khi boot)
                if (doc["cmdId"].is<uint64_t>()) {
                    static uint64_t lastCmdId = 0;
                    static bool     cmdInit   = false;
                    const uint64_t  cmdId     = doc["cmdId"].as<uint64_t>();

                    if (!cmdInit) {
                        lastCmdId = cmdId; // Bỏ qua lệnh cũ tồn đọng từ trước khi ESP32 khởi động
                        cmdInit   = true;
                    } else if (cmdId != lastCmdId) {
                        lastCmdId = cmdId;
                        Serial.printf("[FIREBASE-CMD] Nhan lenh dieu khien moi cmdId: %llu\n", cmdId);

                        if (doc["armed"].is<bool>()) {
                            setArmed(doc["armed"].as<bool>());
                        }
                        if (doc["doorLocked"].is<bool>()) {
                            requestLockState(doc["doorLocked"].as<bool>());
                        }
                    }
                }
            }
        }
    }
    http.end(); // BẮT BUỘC ĐÓNG KẾT NỐI GET TRƯỚC KHI MỞ KẾT NỐI PATCH (Tránh mở 2 kết nối TLS cùng lúc ngốn RAM)

    if (needSilence) {
        silenceAlarm();
        HTTPClient patchHttp;
        patchHttp.setTimeout(2500);
        const String patchUrl = String("https://") + FIREBASE_HOST + FB_PATH_CONTROL + "?auth=" + FIREBASE_AUTH;
        patchHttp.begin(tlsClient, patchUrl);
        patchHttp.PATCH("{\"silenceAlarm\":false}");
        patchHttp.end();
    }
}

static void pollFirebaseConfig() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    http.setTimeout(2500);
    const String url = String("https://") + FIREBASE_HOST + FB_PATH_CONFIG + "?auth=" + FIREBASE_AUTH;
    http.begin(tlsClient, url);
    int httpCode = http.GET();

    if (httpCode == 200) {
        String payload = http.getString();
        if (payload != "null" && payload.length() > 5) {
            JsonDocument doc;
            DeserializationError err = deserializeJson(doc, payload);
            if (!err && doc["thresholdCm"].is<uint16_t>()) {
                const uint16_t newThr = doc["thresholdCm"].as<uint16_t>();
                if (newThr != g.thresholdCm) {
                    setThreshold(newThr);
                }
            }
        }
    }
    http.end();
}

static void sendFirebaseAlert(const AlertEvent& ev) {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    http.setTimeout(2500);
    const String url = String("https://") + FIREBASE_HOST + FB_PATH_ALERTS + "?auth=" + FIREBASE_AUTH;
    http.begin(tlsClient, url);
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
    uint32_t lastFbPollConfig   = 0;

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

        // 3. Đẩy Telemetry lên Firebase Realtime Database mỗi 1 giây
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

        // 5. Đồng bộ cấu hình ngưỡng từ Web mỗi 5 giây
        if (now - lastFbPollConfig >= Config::FB_POLL_CONFIG_MS) {
            lastFbPollConfig = now;
            pollFirebaseConfig();
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
    Serial.println("  HE THONG IOT CANH BAO CHONG TROM & CUA TU DONG v2.4.4");
    Serial.println("=======================================================");

    // Khởi tạo các chân GPIO cảm biến, còi, nút nhấn, công tắc và Relay
    pinMode(Config::PIN_PIR, INPUT);
    pinMode(Config::PIN_US_TRIG, OUTPUT);
    pinMode(Config::PIN_US_ECHO, INPUT);
    pinMode(Config::PIN_BUZZER, OUTPUT);
    pinMode(Config::PIN_LED_ALARM, OUTPUT);
    pinMode(Config::PIN_LED_ARMED, OUTPUT);
    pinMode(Config::PIN_BUTTON_EXIT, INPUT_PULLUP);
    pinMode(Config::PIN_SWITCH_ARM, INPUT_PULLUP);

    digitalWrite(Config::PIN_US_TRIG, LOW);
    digitalWrite(Config::PIN_BUZZER, LOW);
    setLedAlarmPin(false);
    setLedArmedPin(false);

    // Khởi tạo giao tiếp I2C và Màn hình LCD 16x2 với timeout chống treo bus
    Wire.begin(Config::PIN_I2C_SDA, Config::PIN_I2C_SCL);
    Wire.setTimeOut(30); // 30ms timeout chống treo hệ thống nếu lỏng dây LCD
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("  HE THONG IOT  ");
    lcd.setCursor(0, 1);
    lcd.print(" CHONG TROM v2.4");

    // Khởi tạo Động cơ Servo SG90
    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    ESP32PWM::allocateTimer(2);
    ESP32PWM::allocateTimer(3);
    servoLock.setPeriodHertz(50);
    pinMode(Config::PIN_SERVO, OUTPUT);
    digitalWrite(Config::PIN_SERVO, LOW);

    // Đọc trạng thái từ Flash NVS
    prefs.begin("chongtrom", false);
    g.thresholdCm = prefs.getUShort("thr", 12);
    if (g.thresholdCm < Config::MIN_THRESHOLD_CM || g.thresholdCm > Config::MAX_THRESHOLD_CM) {
        g.thresholdCm = 12;
        prefs.putUShort("thr", 12);
    }

    // ĐỌC VỊ TRÍ CÔNG TẮC GẠT D26 LÚC BOOT:
    const bool switchBoot = (digitalRead(Config::PIN_SWITCH_ARM) == LOW);
    g.armed = switchBoot;
    g.doorLocked = true; // Luôn đóng chốt ban đầu

    // Khởi tạo hàng đợi FreeRTOS
    alertQueue = xQueueCreate(8, sizeof(AlertEvent));
    doorQueue  = xQueueCreate(1, sizeof(bool)); // Hàng đợi 1 phần tử cho Servo điều khiển chốt cửa

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

    // Khởi tạo và ghim các Task vào 2 nhân độc lập:
    // Core 0: Mạng & Firebase Cloud Realtime Stream (Priority 1)
    xTaskCreatePinnedToCore(networkTask, "firebaseNetTask", 10240, nullptr, 1, nullptr, 0);

    // Core 1: Đọc cảm biến non-blocking & Cửa tự động (Priority 2)
    xTaskCreatePinnedToCore(sensorTask, "sensorTask", 4096, nullptr, 2, nullptr, 1);

    // Core 1: Điều khiển chốt cửa Servo bất đồng bộ (Priority 2)
    xTaskCreatePinnedToCore(doorTask, "doorTask", 2048, nullptr, 2, nullptr, 1);

    // Core 1: Phát còi, LED cảnh báo & Màn hình LCD (Priority 3 - Ưu tiên cao nhất)
    xTaskCreatePinnedToCore(alarmOutputTask, "alarmOutputTask", 3072, nullptr, 3, nullptr, 1);
}

void loop() {
    vTaskDelete(nullptr);
}
