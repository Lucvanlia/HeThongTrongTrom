# Project: HeThongTrongTrom (IoT Intrusion Alarm System - ESP32 & 100% Microsoft Azure)

## 1. Project Overview

`HeThongTrongTrom` is an enterprise-grade IoT intrusion detection and security alarm system designed with a dual-core ESP32 micro-controller and a 100% Microsoft Azure cloud ecosystem, managed via a high-performance React 19 web dashboard.

### Core Architecture & Tech Stack:
- **Embedded Firmware**: ESP32 C++ (Arduino Framework, FreeRTOS Dual-Core, PlatformIO).
  - Core 0: Azure Network Task (Priority 1) — Wi-Fi STA, NTP UTC+7, MQTT TLS (port 8883) via `PubSubClient`, local HMAC-SHA256 SAS Token generator via `mbedtls`.
  - Core 1: Sensor Reading Task (Priority 2) & Local Alarm Output Task (Priority 3) — PIR HC-SR501, Ultrasonic Sonar HC-SR04, Active Buzzer, LED indicators.
- **Cloud Backend (Serverless)**: Microsoft Azure Functions (Node.js 20, v4 programming model, TypeScript).
  - Ingestion & Event Processing (`functions-ingest`): Event Hub trigger receiving IoT Hub D2C events, batch saving to Azure Table Storage, broadcasting to Azure Web PubSub, and trigger Logic Apps emails.
  - Heartbeat & Offline Watchdog (`offlineWatchdog`): 1-minute timer trigger monitoring device status (>5 min offline = 1 email alert).
  - Managed APIs (`api`): HTTP triggers hosted on Azure Static Web Apps (`/api/realtime/negotiate`, `/api/control/command`, `/api/history`, `/api/admin/config`).
- **Cloud Gateway & Storage**:
  - **Azure IoT Hub (Free F1)**: D2C telemetry and C2D Direct Methods (`setArm`, `silenceAlarm`).
  - **Azure Web PubSub (Free F1)**: Low-latency (<50ms) W3C WebSocket broadcast stream.
  - **Azure Table Storage**: Entities for `history` (PartitionKey: `yyyyMMdd`), `alerts`, and `devicestate`.
  - **Azure Logic Apps**: Webhook-based emergency email notifications via `Outlook.com` connector.
- **Frontend Dashboard**: React 19 + TypeScript + Vite deployed on **Azure Static Web Apps (Free)**.
  - Easy Auth RBAC (`admin`, `operator`, `authenticated`).
  - Zero-Jitter SVG distance telemetry chart with fixed banner height and unified mouse-tracking overlay.
  - 3.5s pending lock ref preventing UI bouncing during device method execution.

---

## 2. Hardware Pinout & Physical Connections

| Component | Module Pin | ESP32 Pin | Logic & Safety Requirement |
| :--- | :--- | :--- | :--- |
| **PIR HC-SR501** | OUT | **GPIO 13** | 3.3V safe; discard data during first 30s warmup. |
| **HC-SR04 (Sonar)**| TRIG / ECHO | **GPIO 5** / **GPIO 18** | **ECHO (5V) MUST pass through 1kΩ/2kΩ resistor divider** to 3.3V. |
| **Buzzer (3V/5V)** | Positive (+) | **GPIO 23** | **STRICTLY FORBIDDEN to use GPIO 12** (ESP32 strapping pin causing boot fails). |
| **LED Vàng (Alarm)**| Anode (+) | **GPIO 2** | Via 220Ω resistor. Flashes at 2Hz when intrusion detected. |
| **LED Xanh (Armed)**| Anode (+) | **GPIO 4** | Via 220Ω resistor. Solid ON when system is ARMED, OFF when DISARMED. |
| **Servo SG90** | PWM (Orange) | **GPIO 19** | Smart door lock. 0° (Unlocked), 90° (Locked). VCC via 5V Relay. |
| **Relay 5V Module**| IN | **GPIO 25** | Power-gating for servo (Active-LOW). Isolates servo power when idle. |
| **Nút Nhấn Exit** | 2 Chân | **GPIO 27** | Nút mở cửa trong nhà (Active-LOW, INPUT_PULLUP, Auto-Relock 5s, Exit Delay 10s). |
| **LCD 1602 I2C** | SDA / SCL | **GPIO 21** / **GPIO 22** | Hardware I2C (Address 0x27). 5V VCC. Dual-line live status display. |

---

## 3. Building, Simulation, and Testing Guidelines

### Firmware (ESP32 & PlatformIO)
```powershell
# Build ESP32 firmware
pio run

# Flash to connected ESP32 board
pio run -t upload

# Monitor serial output (115200 baud)
pio run -t monitor
```

### Wokwi Simulation (VS Code Extension)
- Run simulated circuits directly using `wokwi.toml` and `diagram.json` without physical hardware.

### Cloud Backend & Functions
```powershell
# Ingestion Functions (Flex Consumption)
cd functions-ingest
npm install
npm run build
func start

# SWA Managed API
cd ../api
npm install
npm run build
```

### Web Dashboard
```powershell
cd web
npm install
npm run dev      # Local Vite dev server
npm run build    # Production build for Azure SWA
```

---

## 4. Development Guidelines & Safety Conventions

1. **Dual-Core FreeRTOS Safety**:
   - Variables shared across cores (`armed`, `alarm`, `distanceCm`, `thresholdCm`) MUST be protected using `portENTER_CRITICAL(&gMux)` and `portEXIT_CRITICAL(&gMux)`.
   - Highest-priority task (`alarmOutputTask` Priority 3) MUST call `vTaskDelay(pdMS_TO_TICKS(20))` every cycle to yield CPU time.
   - Sensor loop uses non-blocking intervals. Long blocking `delay()` is forbidden.
   - Local alarm execution is 100% resilient and operates autonomously even if Wi-Fi or Azure is disconnected.

2. **Zero-Jitter SVG Chart Standard**:
   - Fixed banner height container (`minHeight: 48px`) to prevent Cumulative Layout Shift (CLS = 0).
   - Coordinate lines, curves, and grid elements must set `pointerEvents="none"`.
   - A single top-level `<rect fill="transparent" pointerEvents="all" />` captures mouse events.
   - Hover index calculation: `Math.round(ratio * (data.length - 1))`.

3. **Security & Secrets Protocol**:
   - NEVER commit credentials to Git. `include/secrets.h`, `.env.local`, and `local.settings.json` are strictly `.gitignore`'d.
   - Use `include/secrets.h.example` as a template for local credentials.
   - Device keys and connection strings reside exclusively in Azure App Settings and GitHub Secrets.

---

## 5. Agent Planning Protocol (`planning-with-files`)

This repository follows the **Planning with Files** methodology to ensure long-running task persistence and context rot prevention:
- **`task_plan.md`**: The master roadmap detailing current goals, broken-down phases, and checklist tasks (`- [ ]`, `- [/]`, `- [x]`).
- **`findings.md`**: Central repository for discovered system constraints, API endpoints, error signatures, and architecture decisions.
- **`progress.md`**: Chronological log of operations performed, unit test validations, and current sprint status.

Whenever executing complex multi-step refactoring or major milestones, update `task_plan.md` and log outcomes in `progress.md`.

---

## 6. Knowledge Graph Guidelines (`graphify`)

The project's architectural knowledge graph is maintained by `graphify`:
- Visual Interactive Graph: `graphify-out/graph.html` (Web viewer for code dependencies and community clusters).
- Graph Data & Reports: `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md`.
- Updating the Knowledge Graph:
  ```powershell
  graphify . --code-only
  graphify cluster-only .
  ```

