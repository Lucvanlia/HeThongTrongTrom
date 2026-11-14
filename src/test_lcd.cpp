/**
 * @file test_lcd.cpp
 * @brief Chương trình kiểm tra toàn diện màn hình LCD 1602 I2C (I2C Scanner + LCD Test)
 * 
 * Chức năng:
 * 1. Tự động quét toàn bộ địa chỉ I2C trên 2 chân SDA (GPIO 21) & SCL (GPIO 22).
 * 2. Báo cáo chính xác qua Serial xem ESP32 có nhận diện được module LCD không (thường là 0x27 hoặc 0x3F).
 * 3. Nhấp nháy đèn nền LCD 3 lần để người dùng xác nhận phần cứng và nguồn điện.
 * 4. Hiển thị chữ mẫu và bộ đếm thời gian thực để kiểm tra hiển thị.
 */

#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22

// Khởi tạo con trỏ LCD động sau khi quét xong địa chỉ I2C
LiquidCrystal_I2C *lcd = nullptr;
uint8_t foundAddress = 0;

void scanI2C() {
    Serial.println("\n==================================================");
    Serial.println(">>> DANG QUET TOAN BO CAC THIET BI I2C (SCANNER)...");
    Serial.printf(">>> Chân SDA: GPIO %d | Chân SCL: GPIO %d\n", I2C_SDA_PIN, I2C_SCL_PIN);
    Serial.println("==================================================");

    byte error, address;
    int nDevices = 0;

    for (address = 1; address < 127; address++) {
        Wire.beginTransmission(address);
        error = Wire.endTransmission();

        if (error == 0) {
            Serial.printf("[OK] Tim thay thiet bi I2C tai dia chi: 0x%02X", address);
            if (address == 0x27 || address == 0x3F) {
                Serial.println("  <--- DAY LA MAN HINH LCD 1602 CUA BAN!");
                foundAddress = address;
            } else {
                Serial.println();
            }
            nDevices++;
        } else if (error == 4) {
            Serial.printf("[LOI] Loi khong xac dinh tai dia chi: 0x%02X\n", address);
        }
    }

    if (nDevices == 0) {
        Serial.println("\n[CANH BAO NGUY HIEM]: KHONG TIM THAY BAT KY THIET BI I2C NAO!");
        Serial.println(">>> NGUYEN NHAN & HUONG DAN KHAC PHUC:");
        Serial.println("1. Kiem tra nguon: Do xem VCC va GND cua LCD da co dien 5V chua.");
        Serial.println("2. Kiem tra chan cam:");
        Serial.printf("   - SDA LCD phai vao D%d (GPIO %d)\n", I2C_SDA_PIN, I2C_SDA_PIN);
        Serial.printf("   - SCL LCD phai vao D%d (GPIO %d)\n", I2C_SCL_PIN, I2C_SCL_PIN);
        Serial.println("3. Day cam breadboard bi long hoac dut ngam -> Thu doi sang 2 soi day khac.");
        Serial.println("==================================================\n");
    } else {
        Serial.printf("\n>>> QUET HOAN TAT: Phat hien %d thiet bi.\n", nDevices);
    }
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n==================================================");
    Serial.println("   CHUONG TRINH TEST TOAN DIEN LCD 1602 I2C");
    Serial.println("==================================================");

    // 1. Khoi dong I2C bus voi chan SDA 21 va SCL 22
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

    // 2. Quet I2C Scanner
    scanI2C();

    // 3. Neu tim thay dia chi (hoac fallback ve 0x27 mac dinh de thu)
    if (foundAddress == 0) {
        Serial.println(">>> [Thu nghiem tiep] Thu khoi tao LCD o dia chi mac dinh 0x27...");
        foundAddress = 0x27;
    }

    lcd = new LiquidCrystal_I2C(foundAddress, 16, 2);
    lcd->init();
    lcd->backlight();

    Serial.println("\n>>> [TEST DEN NEN]: Nhap nhay den nen 3 lan...");
    for (int i = 0; i < 3; i++) {
        lcd->noBacklight();
        delay(300);
        lcd->backlight();
        delay(300);
    }

    // 4. In thong diep len LCD
    lcd->clear();
    lcd->setCursor(0, 0);
    lcd->print("TEST LCD 1602 OK");
    lcd->setCursor(0, 1);
    lcd->printf("I2C: 0x%02X D21/D22", foundAddress);

    Serial.println(">>> [DA IN LEN LCD]:");
    Serial.println("    Dong 1: TEST LCD 1602 OK");
    Serial.printf("    Dong 2: I2C: 0x%02X D21/D22\n", foundAddress);
    Serial.println(">>> LUU Y: Neu den nen sang nhung CHUA THAY CHU:");
    Serial.println("    Hay dung tua-vit van BIEN TRO VI CHINH MAU XANH o lung LCD");
    Serial.println("    cho den khi chu noi ro len!");
    Serial.println("==================================================\n");
}

void loop() {
    static unsigned long lastUpdate = 0;
    static int counter = 0;

    if (millis() - lastUpdate >= 1000) {
        lastUpdate = millis();
        counter++;

        if (lcd != nullptr) {
            lcd->setCursor(0, 1);
            char buf[17];
            snprintf(buf, sizeof(buf), "0x%02X  Dem: %-4d", foundAddress, counter);
            lcd->print(buf);
        }

        Serial.printf("[RUNNING] ESP32 dang gui du lieu len LCD... Giay thu: %d\n", counter);
    }
}

