export interface TelemetryPayload {
  deviceId: string;
  timestamp: string | number;
  distanceCm: number;
  pirDetected: boolean;
  armed: boolean;
  alarm: boolean;
  doorLocked: boolean;
  ip?: string;
  rssi?: number;
  type?: "telemetry" | "alert";
  alertSource?: string;
}

export interface DeviceStateEntity {
  partitionKey: string; // "devices"
  rowKey: string;       // deviceId e.g. "esp32_device_01"
  lastSeen: string;     // ISO timestamp
  status: "ONLINE" | "OFFLINE";
  distanceCm: number;
  pirDetected: boolean;
  armed: boolean;
  alarm: boolean;
  doorLocked: boolean;
  ip: string;
  rssi: number;
  offlineAlertSent: boolean;
  lastAlarmAlertTime?: string;
}

export interface HistoryEntity {
  partitionKey: string; // yyyyMMdd (UTC+7)
  rowKey: string;       // inverted timestamp for desc sorting
  deviceId: string;
  timestamp: string;
  distanceCm: number;
  pirDetected: boolean;
  armed: boolean;
  alarm: boolean;
  doorLocked: boolean;
  rssi: number;
}

export interface AlertEntity {
  partitionKey: string; // yyyyMMdd (UTC+7)
  rowKey: string;       // inverted timestamp
  deviceId: string;
  timestamp: string;
  alertSource: string;
  distanceCm: number;
  pirDetected: boolean;
  doorLocked: boolean;
}

