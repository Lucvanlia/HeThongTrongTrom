export interface TelemetryData {
  deviceId: string;
  timestamp: string;
  distanceCm: number;
  pirDetected: boolean;
  armed: boolean;
  alarm: boolean;
  doorLocked: boolean;
  ip?: string;
  rssi?: number;
  status?: "ONLINE" | "OFFLINE";
}

export interface AlertItem {
  id: string;
  deviceId: string;
  timestamp: string;
  alertSource: string;
  distanceCm: number;
  pirDetected: boolean;
  doorLocked: boolean;
}

export interface HistoryPoint {
  timestamp: string;
  distanceCm: number;
  pirDetected: boolean;
  armed: boolean;
  alarm: boolean;
  doorLocked: boolean;
  rssi: number;
}

export interface DeviceConfig {
  thresholdCm: number;
  telemetryIntervalMs: number;
}

export interface ScheduleConfig {
  enabled: boolean;
  armTime: string;      // ví dụ "22:00"
  disarmTime: string;   // ví dụ "06:00"
  lastUpdated?: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userEmail: string;
  action: "ARM" | "DISARM" | "LOCK_DOOR" | "UNLOCK_DOOR" | "SILENCE_ALARM" | "UPDATE_CONFIG" | "UPDATE_SCHEDULE";
  detail: string;
}

export interface DailyTotal {
  passby: number;
  alert: number;
  pir: number;
  sonar: number;
  both: number;
}

export interface HourlyCount {
  passby: number;
  alert: number;
}

export interface DailyStatNode {
  total: DailyTotal;
  hours?: Record<string, HourlyCount>;
}

export type DailyStatsMap = Record<string, DailyStatNode>;

export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

export interface UserPrincipal {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
}
