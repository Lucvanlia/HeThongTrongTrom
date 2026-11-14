/**
 * @file test_servo.cpp
 * @brief Chương trình kiểm tra toàn diện động cơ Servo SG90 (Test độc lập 100%)
 * 
 * Hỗ trợ cả 2 cách đấu nối:
 * - Cách 1: Nối trực tiếp Servo vào 5V/GND/D19 (Không qua Rơ-le)
 * - Cách 2: Nối Servo qua Module Rơ-le 5V (D25) để ngắt nguồn chống giật
 */

#include <Arduino.h>
#include <ESP32Servo.h>

#define PIN_SERVO       19   // Dây Cam (PWM tín hiệu) của Servo cắm chân D19
#define PIN_RELAY_SERVO 25   // Chân IN của module Rơ-le 5V cắm chân D25 (nếu có dùng Rơ-le)

// Logic Rơ-le 5V: LOW = BẬT tiếp điểm (Active-LOW)
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

static Servo myServo;

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n=======================================================");
    Serial.println("     CHUONG TRINH TEST TOAN DIEN SERVO SG90 (ESP32)");
    Serial.printf("     - Chan PWM Servo  : D%d (GPIO %d)\n", PIN_SERVO, PIN_SERVO);
    Serial.printf("     - Chan Relay IN   : D%d (GPIO %d)\n", PIN_RELAY_SERVO, PIN_RELAY_SERVO);
    Serial.println("=======================================================");

    // 1. Kích hoạt chân Rơ-le luôn BẬT trong suốt quá trình test để cấp điện liên tục
    pinMode(PIN_RELAY_SERVO, OUTPUT);
    digitalWrite(PIN_RELAY_SERVO, RELAY_ON);
    Serial.println("[RELAY] Da bat Relay D25 (LOW) cap nguon 5V cho Servo.");

    // 2. Cấu hình Timer PWM cho Servo
    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    ESP32PWM::allocateTimer(2);
    ESP32PWM::allocateTimer(3);
    myServo.setPeriodHertz(50); // Tần số chuẩn 50Hz cho servo

    // Dải xung chuẩn 500µs - 2400µs cho SG90
    myServo.attach(PIN_SERVO, 500, 2400);

    Serial.println("\n>>> HUONG DAN XEM SERVO:");
    Serial.println("1. Servo se quay qua lai giua 3 moc: 0 DO -> 90 DO -> 160 DO");
    Serial.println("2. Moi vi tri se dung yen 2 giay de ban quan sat.");
    Serial.println("=======================================================\n");
}

void loop() {
    // Vị trí 1: 0 độ (Đóng chốt khóa)
    Serial.println(">>> [1] Quay ve: 0 DO (KHOA CHOT) - Dung 2 giay...");
    myServo.write(0);
    delay(2000);

    // Vị trí 2: 90 độ (Góc vuông trung gian)
    Serial.println(">>> [2] Quay sang: 90 DO (TRUNG GIAN) - Dung 2 giay...");
    myServo.write(90);
    delay(2000);

    // Vị trí 3: 160 độ (Mở toang cửa dứt khoát)
    Serial.println(">>> [3] Quay sang: 160 DO (MO TOANG CUA) - Dung 2 giay...");
    myServo.write(160);
    delay(2000);
}
