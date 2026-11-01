#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>
#include <time.h>
#include <mbedtls/md.h>
#include <mbedtls/base64.h>
#include "Config.h"
#include "secrets.h"

using namespace system_secrets;

// ============================================================================
// 1. DỮ LIỆU DÙNG CHUNG GIỮA 2 NHÂN (SHARED STATE & MUTEX)
// ============================================================================
struct SharedState {
    bool     armed = false;
    bool     alarm = false;
    bool     pir = false;
    bool     doorLocked = false;
    float    distanceCm = -1.0f;
    uint32_t alarmSinceMs = 0;
    uint16_t thresholdCm = Config::DEFAULT_DISTANCE_THRESHOLD_CM;
    uint32_t autoRelockAtMs = 0;       // Hẹn giờ tự động khóa chốt lại sau 5s
    uint32_t exitDelayUntilMs = 0;     // Hoãn báo động 10s khi người nhà ấn nút đi ra
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

// Thiết bị ngoại vi I2C và Servo
static LiquidCrystal_I2C  lcd(Config::LCD_I2C_ADDR, Config::LCD_COLS, Config::LCD_ROWS);
static Servo              servoLock;

// Kết nối mạng TLS & MQTT
static WiFiClientSecure   tlsClient;
static PubSubClient       mqtt(tlsClient);
static time_t             sasExpiry = 0;

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
    if (tv.tv_sec < 1700000000L) return 0;   // Chưa đồng bộ NTP thành công
    return (uint64_t)tv.tv_sec * 1000ULL + (uint64_t)(tv.tv_usec / 1000);
}

// ============================================================================
// 2. CÁC HÀM XỬ LÝ LỆNH ĐIỀU KHIỂN CHẤP HÀNH (RELAY + SERVO, CÒI, TRẠNG THÁI)
// ============================================================================
static void setLockState(bool locked) {
    portENTER_CRITICAL(&gMux);
    g.doorLocked = locked;
    portEXIT_CRITICAL(&gMux);

    // KỸ THUẬT POWER-GATING:
    // 1. Kích Relay BẬT cấp nguồn 5V cho Servo
    digitalWrite(Config::PIN_RELAY_SERVO, Config::RELAY_SERVO_ON);
    vTaskDelay(pdMS_TO_TICKS(50)); // Chờ điện áp ổn định chống sụt áp

    // 2. Phát xung điều khiển góc quay Servo
    servoLock.write(locked ? Config::SERVO_LOCK_ANGLE : Config::SERVO_UNLOCK_ANGLE);
    vTaskDelay(pdMS_TO_TICKS(Config::SERVO_MOVE_TIME_MS)); // Chờ cánh tay cơ học gạt chốt xong (600ms)

    // 3. Kích Relay NGẮT hoàn toàn nguồn 5V vào Servo
    digitalWrite(Config::PIN_RELAY_SERVO, Config::RELAY_SERVO_OFF);

    reportPending = true;
    Serial.printf("[ACTUATOR] Relay da cap nguon -> Xoay Servo -> Ngat dien an toan. Chot: %s (%d do)\n",
                  locked ? "DONG KHOA" : "MO KHOA",
                  locked ? Config::SERVO_LOCK_ANGLE : Config::SERVO_UNLOCK_ANGLE);
}

static void setArmed(bool armed) {
    portENTER_CRITICAL(&gMux);
    g.armed = armed;
    if (!armed) {
        g.alarm = false;            // DISARM luôn lập tức ngắt còi hú
    }
    portEXIT_CRITICAL(&gMux);

    // Cơ chế an toàn tự động: BẬT bảo vệ -> Tự động đóng chốt cửa qua Relay + Servo
    setLockState(armed);

    prefs.putBool("armed", armed);  // Lưu vào Flash NVS chống mất điện
    reportPending = true;
    Serial.printf("[SYSTEM] Che do bao ve: %s\n", armed ? "ARMED (BAT)" : "DISARMED (TAT)");
}

static void silenceAlarm() {
    portENTER_CRITICAL(&gMux);
    g.alarm = false;
    portEXIT_CRITICAL(&gMux);
    reportPending = true;
    Serial.println("[SYSTEM] Da tat coi bao dong (Giu nguyen trang thai ARM)");
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
// 3. CORE 1: TÁC VỤ CẢM BIẾN & LOGIC BÁO ĐỘNG (Priority 2)
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

    for (;;) {
        const unsigned long now = millis();

        // 1. Đọc nút nhấn mở cửa bên trong nhà (Exit Button - Active LOW)
        const bool curBtn = digitalRead(Config::PIN_BUTTON_EXIT);
        if (curBtn != lastBtnState && (now - lastBtnDebounceMs > Config::BUTTON_DEBOUNCE_MS)) {
            lastBtnDebounceMs = now;
            lastBtnState = curBtn;
            if (curBtn == LOW) {
                // Người nhà ấn nút mở cửa thoát hiểm!
                Serial.println("[BUTTON] Nguoi nha an nut Exit Button -> Mo chot cua!");
                setLockState(false); // Mở chốt cửa 0 độ qua Rơ-le

                portENTER_CRITICAL(&gMux);
                g.autoRelockAtMs = now + Config::AUTO_RELOCK_DELAY_MS; // Tự động khóa lại sau 5s
                if (g.armed) {
                    g.exitDelayUntilMs = now + Config::EXIT_DELAY_MS; // Tạm hoãn báo động 10s để bước ra
                    Serial.println("[SYSTEM] Kich hoat Exit Delay: Hoan bao dong 10s de nguoi buoc ra.");
                }
                portEXIT_CRITICAL(&gMux);
            }
        }

        // 2. Tự động đóng chốt khóa cửa (Auto-Relock) sau khi hết 5 giây
        bool triggerRelock = false;
        portENTER_CRITICAL(&gMux);
        if (g.autoRelockAtMs > 0 && now >= g.autoRelockAtMs) {
            g.autoRelockAtMs = 0;
            triggerRelock = true;
        }
        portEXIT_CRITICAL(&gMux);

        if (triggerRelock) {
            Serial.println("[ACTUATOR] Het 5 giay mo cua -> Tu dong dong chot khoa an toan (Auto-Relock)!");
            setLockState(true); // Khóa chốt 90 độ qua Rơ-le
        }

        // 3. Đọc dữ liệu cảm biến
        const bool  pirVal     = (digitalRead(Config::PIN_PIR) == HIGH);
        const float distVal    = readDistanceCm();
        const bool  warmupDone = (now > Config::PIR_WARMUP_MS);
        const char* alertSource = nullptr;

        portENTER_CRITICAL(&gMux);
        g.pir = pirVal;
        g.distanceCm = distVal;

        // Kiểm tra điều kiện kích hoạt báo động:
        // Đang ARM, chưa ALARM, đã qua thời gian khởi động nhiệt PIR VÀ không trong thời gian hoãn Exit Delay
        const bool exitDelayActive = (now < g.exitDelayUntilMs);
        if (g.armed && !g.alarm && warmupDone && !exitDelayActive) {
            if (pirVal) {
                alertSource = "PIR";
            } else if (distVal > 0.0f && distVal < (float)g.thresholdCm) {
                alertSource = "SONAR";
            }

            if (alertSource != nullptr) {
                g.alarm = true;
                g.alarmSinceMs = now;
            }
        }

        // Tự động ngắt còi hú sau 60 giây nếu không có người tắt
        if (g.alarm && (now - g.alarmSinceMs >= Config::ALARM_AUTO_SILENCE_MS)) {
            g.alarm = false;
        }
        portEXIT_CRITICAL(&gMux);

        // Đẩy sự kiện đột nhập vào hàng đợi gửi tin lên Azure IoT Hub
        if (alertSource != nullptr) {
            AlertEvent ev{};
            strlcpy(ev.sensor, alertSource, sizeof(ev.sensor));
            ev.distanceCm = distVal;
            xQueueSend(alertQueue, &ev, 0); // Non-blocking nếu queue đầy
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
        // Màn hình khi có trộm: Nhấp nháy cảnh báo khẩn cấp
        const bool blink = ((now / 300) % 2 == 0);
        if (blink) {
            snprintf(line1, sizeof(line1), "!! CANH BAO !!  ");
            snprintf(line2, sizeof(line2), "PHAT HIEN TROM! ");
        } else {
            snprintf(line1, sizeof(line1), ">> ALARM ACTIVE ");
            if (s.pir) {
                snprintf(line2, sizeof(line2), "NGUON: PIR CHUYEN");
            } else {
                snprintf(line2, sizeof(line2), "NGUON: SONAR %dcm", (int)s.distanceCm);
            }
        }
    } else if (s.autoRelockAtMs > 0 && now < s.autoRelockAtMs) {
        // Màn hình khi người nhà ấn nút Exit Button mở cửa (Đếm ngược tự khóa)
        const int secLeft = (int)((s.autoRelockAtMs - now + 999) / 1000);
        snprintf(line1, sizeof(line1), "MO CUA (THOAT)  ");
        snprintf(line2, sizeof(line2), "TU KHOA SAU: %ds ", secLeft);
    } else {
        // Dòng 1: Trạng thái hệ thống + Chốt khóa Servo
        if (s.armed) {
            snprintf(line1, sizeof(line1), "ARMED  |KHOA CUA");
        } else {
            snprintf(line1, sizeof(line1), "DISARM | MO CUA ");
        }

        // Dòng 2: Chỉ số cảm biến (Khoảng cách + PIR)
        if (s.distanceCm >= 0.0f) {
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

        // 1. Đèn trạng thái ARMED (LED Xanh)
        digitalWrite(Config::PIN_LED_ARMED, s.armed ? HIGH : LOW);

        // 2. Còi hú và Đèn cảnh báo (LED Vàng) chớp 2Hz khi ALARM
        if (s.alarm) {
            const bool toggle = ((millis() / 250) % 2 == 0);
            digitalWrite(Config::PIN_LED_ALARM, toggle ? HIGH : LOW);
            digitalWrite(Config::PIN_BUZZER, toggle ? HIGH : LOW);
        } else {
            digitalWrite(Config::PIN_LED_ALARM, LOW);
            digitalWrite(Config::PIN_BUZZER, LOW);
        }

        // 3. Cập nhật màn hình LCD 16x2
        updateLcdDisplay(s);

        // BẮT BUỘC nhường CPU 20ms cho task khác và reset Watchdog Timer
        vTaskDelay(pdMS_TO_TICKS(20));
    }
}

// ============================================================================
// 5. CORE 0: MẠNG WI-FI, NTP, SAS TOKEN & AZURE IOT HUB MQTT (Priority 1)
// ============================================================================
static String urlEncode(const String& s) {
    static const char* hex = "0123456789ABCDEF";
    String out;
    for (size_t i = 0; i < s.length(); i++) {
        const char c = s[i];
        if (isalnum((unsigned char)c) || c == '-' || c == '_' || c == '.' || c == '~') {
            out += c;
        } else {
            out += '%';
            out += hex[(c >> 4) & 0xF];
            out += hex[c & 0xF];
        }
    }
    return out;
}

// Sinh SAS Token chuẩn Azure IoT Hub bằng HMAC-SHA256 trên mbedtls
static String generateSasToken(time_t expiry) {
    const String resourceUri = urlEncode(String(IOTHUB_HOST) + "/devices/" + DEVICE_ID);
    const String toSign = resourceUri + "\n" + String((long)expiry);

    unsigned char decodedKey[64];
    size_t keyLen = 0;
    if (mbedtls_base64_decode(decodedKey, sizeof(decodedKey), &keyLen,
            (const unsigned char*)DEVICE_KEY, strlen(DEVICE_KEY)) != 0) {
        return "";
    }

    unsigned char hmac[32];
    mbedtls_md_hmac(mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), decodedKey, keyLen,
                    (const unsigned char*)toSign.c_str(), toSign.length(), hmac);

    unsigned char b64Hmac[64];
    size_t b64Len = 0;
    mbedtls_base64_encode(b64Hmac, sizeof(b64Hmac) - 1, &b64Len, hmac, sizeof(hmac));
    b64Hmac[b64Len] = '\0';

    return "SharedAccessSignature sr=" + resourceUri +
           "&sig=" + urlEncode(String((char*)b64Hmac)) +
           "&se=" + String((long)expiry);
}

// Báo cáo trạng thái reported twin lên Azure
static void publishReportedTwin() {
    const SharedState s = snapshot();
    JsonDocument doc;
    doc["armed"]               = s.armed;
    doc["doorLocked"]          = s.doorLocked;
    doc["distanceThresholdCm"] = s.thresholdCm;
    doc["fw"]                  = Config::FIRMWARE_VERSION;

    String body;
    serializeJson(doc, body);

    static uint32_t rid = 0;
    const String topic = "$iothub/twin/PATCH/properties/reported/?$rid=" + String(++rid);
    if (mqtt.publish(topic.c_str(), body.c_str())) {
        reportPending = false;
        Serial.println("[AZURE-CORE0] Cap nhat Reported Twin thanh cong");
    }
}

// Xử lý gói tin MQTT nhận từ Azure IoT Hub (Direct Method & Twin)
static void onMqttMessage(char* topic, byte* payload, unsigned int length) {
    const String t(topic);

    // 1. Nhận Direct Method: $iothub/methods/POST/{method}/?$rid={rid}
    if (t.startsWith("$iothub/methods/POST/")) {
        const int nameStart = 21;
        const String method = t.substring(nameStart, t.indexOf('/', nameStart));
        const String rid    = t.substring(t.indexOf("$rid=") + 5);

        JsonDocument req;
        deserializeJson(req, payload, length);

        JsonDocument res;
        int status = 200;

        if (method == "setArm") {
            const bool armValue = req["value"] | false;
            setArmed(armValue);
            res["armed"]      = armValue;
            res["doorLocked"] = armValue;
        } else if (method == "setLock") {
            const bool lockValue = req["value"] | false;
            setLockState(lockValue);
            res["doorLocked"] = lockValue;
        } else if (method == "silenceAlarm") {
            silenceAlarm();
            res["alarm"] = false;
        } else {
            status = 404;
            res["error"] = "Method khong ton tai";
        }

        String body;
        serializeJson(res, body);

        const String responseTopic = "$iothub/methods/res/" + String(status) + "/?$rid=" + rid;
        mqtt.publish(responseTopic.c_str(), body.c_str());
        Serial.printf("[AZURE-CORE0] Direct Method '%s' tra ve status: %d\n", method.c_str(), status);
        return;
    }

    // 2. Nhận cấu hình Twin Desired từ Cloud
    if (t.startsWith("$iothub/twin/PATCH/properties/desired/")) {
        JsonDocument d;
        if (!deserializeJson(d, payload, length) && d["distanceThresholdCm"].is<int>()) {
            setThreshold(d["distanceThresholdCm"].as<int>());
        }
    }
}

// Kết nối MQTT TLS 8883 vào Azure IoT Hub
static bool connectIoTHub() {
    const String username = String(IOTHUB_HOST) + "/" + DEVICE_ID + "/?api-version=2021-04-12";
    sasExpiry = time(nullptr) + Config::SAS_TTL_S;
    const String password = generateSasToken(sasExpiry);

    if (password.isEmpty()) {
        Serial.println("[AZURE-CORE0] LOI: DEVICE_KEY khong dung dinh dang Base64");
        return false;
    }

    Serial.print("[AZURE-CORE0] Dang ket noi Azure IoT Hub (Port 8883)... ");
    if (!mqtt.connect(DEVICE_ID, username.c_str(), password.c_str())) {
        Serial.printf("THAT BAI (State: %d)\n", mqtt.state());
        return false;
    }

    Serial.println("THANH CONG!");
    mqtt.subscribe("$iothub/methods/POST/#");
    mqtt.subscribe("$iothub/twin/PATCH/properties/desired/#");
    mqtt.subscribe("$iothub/twin/res/#");

    reportPending = true;
    return true;
}

// Gửi tin D2C (Telemetry / Alert)
static void publishD2C(const char* type, JsonDocument& doc) {
    doc["deviceId"] = DEVICE_ID;
    doc["type"]     = type;
    doc["ts"]       = getEpochMs();

    String body;
    serializeJson(doc, body);

    const String topic = String("devices/") + DEVICE_ID +
                         "/messages/events/type=" + type +
                         "&$.ct=application%2Fjson&$.ce=utf-8";
    mqtt.publish(topic.c_str(), body.c_str());
}

static void networkTask(void* pvParameters) {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    tlsClient.setInsecure(); // Tiết kiệm RAM cho môi trường học tập
    mqtt.setServer(IOTHUB_HOST, 8883);
    mqtt.setBufferSize(1024);
    mqtt.setKeepAlive(60);
    mqtt.setCallback(onMqttMessage);

    // Đồng bộ NTP múi giờ GMT+7 (Việt Nam)
    configTime(7 * 3600, 0, "pool.ntp.org", "time.google.com");

    uint32_t lastWifiRetry  = 0;
    uint32_t lastMqttRetry  = 0;
    uint32_t lastTelemetry  = 0;

    for (;;) {
        const uint32_t now = millis();

        // 1. Quản lý kết nối Wi-Fi
        if (WiFi.status() != WL_CONNECTED) {
            if (now - lastWifiRetry >= Config::WIFI_RETRY_MS) {
                lastWifiRetry = now;
                Serial.println("[AZURE-CORE0] Dang thu ket noi lai Wi-Fi...");
                WiFi.reconnect();
            }
            vTaskDelay(pdMS_TO_TICKS(100));
            continue;
        }

        // 2. Đợi NTP có giờ hợp lệ trước khi sinh SAS Token
        if (getEpochMs() == 0) {
            vTaskDelay(pdMS_TO_TICKS(200));
            continue;
        }

        // 3. Tự động ngắt kết nối để gia hạn SAS Token trước 5 phút
        if (mqtt.connected() && time(nullptr) > sasExpiry - 300) {
            Serial.println("[AZURE-CORE0] SAS Token sap het han, ngat ket noi de tao token moi...");
            mqtt.disconnect();
        }

        // 4. Kết nối lại MQTT nếu bị rớt
        if (!mqtt.connected()) {
            if (now - lastMqttRetry >= Config::MQTT_RETRY_MS) {
                lastMqttRetry = now;
                connectIoTHub();
            }
            vTaskDelay(pdMS_TO_TICKS(100));
            continue;
        }

        mqtt.loop();

        // 5. Gửi sự kiện cảnh báo khẩn cấp từ Core 1 ngay lập tức
        AlertEvent ev;
        while (xQueueReceive(alertQueue, &ev, 0) == pdTRUE) {
            JsonDocument doc;
            doc["event"]      = "INTRUSION_DETECTED";
            doc["sensor"]     = ev.sensor;
            doc["distanceCm"] = ev.distanceCm;
            publishD2C("alert", doc);
            reportPending = true;
            Serial.printf("[AZURE-CORE0] Da gui canh bao dot nhap [%s] len IoT Hub\n", ev.sensor);
        }

        // 6. Định kỳ gửi Telemetry (15 giây) để vẽ biểu đồ Web
        if (now - lastTelemetry >= Config::TELEMETRY_INTERVAL_MS) {
            lastTelemetry = now;
            const SharedState s = snapshot();

            JsonDocument doc;
            doc["armed"]       = s.armed;
            doc["doorLocked"]  = s.doorLocked;
            doc["alarm"]       = s.alarm;
            doc["pir"]         = s.pir;
            doc["distanceCm"]  = (s.distanceCm < 0) ? -1.0f : roundf(s.distanceCm * 10) / 10.0f;
            doc["thresholdCm"] = s.thresholdCm;
            doc["rssi"]        = WiFi.RSSI();
            doc["uptimeS"]     = now / 1000;

            publishD2C("telemetry", doc);
            Serial.printf("[AZURE-CORE0] Telemetry -> Sonar: %.1f cm, PIR: %d, ARM: %d, Lock: %d\n",
                          doc["distanceCm"].as<float>(), s.pir, s.armed, s.doorLocked);
        }

        // 7. Gửi cập nhật Reported Twin khi có thay đổi trạng thái
        if (reportPending) {
            publishReportedTwin();
        }

        vTaskDelay(pdMS_TO_TICKS(20));
    }
}

// ============================================================================
// 6. SETUP & MAIN ENTRY
// ============================================================================
void setup() {
    Serial.begin(115200);
    Serial.println("\n=======================================================");
    Serial.println("  HE THONG CANH BAO CHONG TROM IOT (ESP32 - AZURE)");
    Serial.printf("  Firmware: v%s | Power-Gating Relay + Servo + LCD\n", Config::FIRMWARE_VERSION);
    Serial.println("=======================================================");

    // Khởi tạo các chân GPIO cảm biến, còi, nút nhấn và Relay
    pinMode(Config::PIN_PIR, INPUT);
    pinMode(Config::PIN_US_TRIG, OUTPUT);
    pinMode(Config::PIN_US_ECHO, INPUT);
    pinMode(Config::PIN_BUZZER, OUTPUT);
    pinMode(Config::PIN_LED_ALARM, OUTPUT);
    pinMode(Config::PIN_LED_ARMED, OUTPUT);
    pinMode(Config::PIN_RELAY_SERVO, OUTPUT);
    pinMode(Config::PIN_BUTTON_EXIT, INPUT_PULLUP); // Nút nhấn Exit Button mở cửa (trở kéo lên nội bộ)

    digitalWrite(Config::PIN_US_TRIG, LOW);
    digitalWrite(Config::PIN_BUZZER, LOW);
    digitalWrite(Config::PIN_LED_ALARM, LOW);
    digitalWrite(Config::PIN_LED_ARMED, LOW);
    // Ban đầu ngắt Relay để bảo vệ nguồn Servo
    digitalWrite(Config::PIN_RELAY_SERVO, Config::RELAY_SERVO_OFF);

    // Khởi tạo giao tiếp I2C và Màn hình LCD 16x2
    Wire.begin(Config::PIN_I2C_SDA, Config::PIN_I2C_SCL);
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("  HE THONG IOT  ");
    lcd.setCursor(0, 1);
    lcd.print(" CHONG TROM v2.3");

    // Khởi tạo Động cơ Servo SG90 (chốt cửa)
    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    ESP32PWM::allocateTimer(2);
    ESP32PWM::allocateTimer(3);
    servoLock.setPeriodHertz(50); // Tiêu chuẩn 50Hz cho Servo SG90
    servoLock.attach(Config::PIN_SERVO, 500, 2400);

    // Đọc trạng thái lưu trữ NVS
    prefs.begin("chongtrom", false);
    g.armed       = prefs.getBool("armed", false);
    g.doorLocked  = g.armed; // Mặc định khóa nếu đang armed
    g.thresholdCm = prefs.getUShort("thr", Config::DEFAULT_DISTANCE_THRESHOLD_CM);

    // Đặt vị trí ban đầu của Servo chốt cửa qua Relay Power-Gating
    digitalWrite(Config::PIN_RELAY_SERVO, Config::RELAY_SERVO_ON);
    delay(50);
    servoLock.write(g.doorLocked ? Config::SERVO_LOCK_ANGLE : Config::SERVO_UNLOCK_ANGLE);
    delay(Config::SERVO_MOVE_TIME_MS);
    digitalWrite(Config::PIN_RELAY_SERVO, Config::RELAY_SERVO_OFF);

    delay(800); // Giữ màn hình khởi động
    lcd.clear();

    // Khởi tạo hàng đợi cảnh báo FreeRTOS (tối đa 8 sự kiện)
    alertQueue = xQueueCreate(8, sizeof(AlertEvent));

    // Khởi tạo và ghim các Task vào 2 nhân độc lập:
    // Core 0: Mạng & Azure IoT Hub (Priority 1)
    xTaskCreatePinnedToCore(networkTask, "azureNetworkTask", 10240, nullptr, 1, nullptr, 0);

    // Core 1: Đọc cảm biến non-blocking (Priority 2)
    xTaskCreatePinnedToCore(sensorTask, "sensorTask", 4096, nullptr, 2, nullptr, 1);

    // Core 1: Phát còi, LED cảnh báo & Màn hình LCD (Priority 3 - Ưu tiên cao nhất)
    xTaskCreatePinnedToCore(alarmOutputTask, "alarmOutputTask", 3072, nullptr, 3, nullptr, 1);
}

void loop() {
    // Xóa task loop mặc định để giải phóng RAM vì toàn bộ logic đã chạy trong 3 FreeRTOS tasks
    vTaskDelete(nullptr);
}
