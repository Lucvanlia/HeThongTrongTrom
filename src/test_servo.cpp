#include <Arduino.h>
#include <ESP32Servo.h>

// ==============================================================================
// TEST SERVO SG90 CHỐNG RUNG GIẬT 100% (0 ĐỘ <-> 90 ĐỘ)
// ==============================================================================

#define PIN_SERVO       19   // Dây Cam (PWM tín hiệu) của Servo cắm chân D19
#define PIN_RELAY_SERVO 25   // Chân IN của module Rơ-le 5V cắm chân D25

// Logic Rơ-le 5V: LOW = BẬT cấp nguồn 5V cho Servo
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// Góc xoay chuẩn của cơ cấu chốt cửa (0 độ đóng <-> 160 độ mở toang dứt khoát):
#define ANGLE_LOCK   0    // 0 độ: Đóng chốt khóa an toàn
#define ANGLE_UNLOCK 160  // 160 độ: Mở toang chốt cửa dứt khoát

// Giới hạn xung an toàn cho SG90 (600µs tránh cấn ngàm cơ khí bên trong):
#define SERVO_MIN_US 600
#define SERVO_MAX_US 2400

static Servo servoLock;

// Hàm quay mượt mà, chống rung giật & chống nóng 100%:
static void moveToAngle(int angle) {
    // 1. Kích Rơ-le ĐÓNG cấp điện 5V
    digitalWrite(PIN_RELAY_SERVO, RELAY_ON);
    delay(50); // Chờ điện áp 5V ổn định

    // 2. Gắn chân PWM và phát xung điều khiển góc
    servoLock.attach(PIN_SERVO, SERVO_MIN_US, SERVO_MAX_US);
    servoLock.write(angle);
    delay(450); // Chờ servo quay dứt khoát tới đích (450ms)

    // 3. TẮT XUNG PWM (DETACH) VÀ KÉO CHÂN TÍN HIỆU VỀ LOW
    // Đây là bí quyết: Ngắt xung PWM khi servo đã tới góc để servo nghỉ hoàn toàn!
    servoLock.detach();
    pinMode(PIN_SERVO, OUTPUT);
    digitalWrite(PIN_SERVO, LOW);
    delay(20);

    // 4. Ngắt Rơ-le cách ly nguồn (Power-Gating triệt để)
    digitalWrite(PIN_RELAY_SERVO, RELAY_OFF);
}

void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n=======================================================");
    Serial.println("  TEST SERVO SG90 DỨT KHOÁT (0 ĐỘ KHÓA <-> 160 ĐỘ MỞ)");
    Serial.printf("  Chân PWM Servo: D%d | Chân Relay 5V: D%d\n", PIN_SERVO, PIN_RELAY_SERVO);
    Serial.println("=======================================================");

    pinMode(PIN_RELAY_SERVO, OUTPUT);
    digitalWrite(PIN_RELAY_SERVO, RELAY_OFF);
    pinMode(PIN_SERVO, OUTPUT);
    digitalWrite(PIN_SERVO, LOW);

    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    ESP32PWM::allocateTimer(2);
    ESP32PWM::allocateTimer(3);
    servoLock.setPeriodHertz(50);

    // Khởi đầu: Đưa về 0 độ (Đóng chốt) trước
    Serial.println("[KHOI DONG] Dua Servo ve 0 DO (Khoa chot)...");
    moveToAngle(ANGLE_LOCK);
    delay(1000);

    Serial.println("[BAT DAU] Chu trinh vong lap tu dong (0 do <-> 160 do)!\n");
}

void loop() {
    // BƯỚC 1: QUAY SANG 160 ĐỘ (MỞ TOANG CỬA DỨT KHOÁT)
    Serial.println(">>> [MO CUA]   Quay sang: 160 DO (Mo toang cua)...");
    moveToAngle(ANGLE_UNLOCK);
    delay(2000); // Giữ mở trong 2s

    // BƯỚC 2: QUAY TRỞ VỀ 0 ĐỘ (ĐÓNG KHÓA CỬA)
    Serial.println("<<< [KHOA CUA] Quay tro ve: 0 DO (Dong chot an toan)...\n");
    moveToAngle(ANGLE_LOCK);
    delay(2000); // Giữ khóa trong 2s
}
