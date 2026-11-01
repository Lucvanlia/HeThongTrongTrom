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

export interface UserPrincipal {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
}
