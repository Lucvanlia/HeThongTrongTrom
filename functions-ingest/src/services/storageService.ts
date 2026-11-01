import { TableClient, TableEntity } from "@azure/data-tables";
import { DeviceStateEntity, HistoryEntity, AlertEntity, TelemetryPayload } from "../types";

const connString = process.env.AZURE_STORAGE_CONNECTION_STRING || "";

export const historyTable = connString ? TableClient.fromConnectionString(connString, "history") : null;
export const alertsTable = connString ? TableClient.fromConnectionString(connString, "alerts") : null;
export const deviceStateTable = connString ? TableClient.fromConnectionString(connString, "devicestate") : null;

/**
 * Lấy chuỗi ngày YYYYMMDD theo múi giờ Việt Nam (UTC+7)
 */
export function getUtc7DateKey(date = new Date()): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 7 * 3600000);
  const yyyy = vnTime.getFullYear();
  const mm = String(vnTime.getMonth() + 1).padStart(2, "0");
  const dd = String(vnTime.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/**
 * Sinh RowKey nghịch đảo (9999999999999 - timestamp) để khi query Table Storage
 * mặc định lấy ra các bản ghi mới nhất trước (Descending order).
 */
export function generateDescendingRowKey(date = new Date(), suffix = ""): string {
  const invertedTs = (9999999999999 - date.getTime()).toString().padStart(13, "0");
  return suffix ? `${invertedTs}_${suffix}` : invertedTs;
}

/**
 * Lưu bản ghi đo đạc vào bảng history
 */
export async function saveHistory(payload: TelemetryPayload): Promise<void> {
  if (!historyTable) return;
  const now = new Date();
  const dateKey = getUtc7DateKey(now);
  const rowKey = generateDescendingRowKey(now, payload.deviceId);

  const entity: TableEntity<HistoryEntity> = {
    partitionKey: dateKey,
    rowKey,
    deviceId: payload.deviceId,
    timestamp: now.toISOString(),
    distanceCm: payload.distanceCm,
    pirDetected: payload.pirDetected,
    armed: payload.armed,
    alarm: payload.alarm,
    doorLocked: payload.doorLocked,
    rssi: payload.rssi ?? 0
  };

  await historyTable.upsertEntity(entity, "Merge");
}

/**
 * Cập nhật trạng thái tức thời của thiết bị trong devicestate
 */
export async function updateDeviceState(payload: TelemetryPayload): Promise<DeviceStateEntity> {
  if (!deviceStateTable) throw new Error("Table devicestate not configured");
  const now = new Date();

  let existing: DeviceStateEntity | null = null;
  try {
    existing = await deviceStateTable.getEntity<DeviceStateEntity>("devices", payload.deviceId);
  } catch {
    // Entity chưa tồn tại
  }

  const entity: TableEntity<DeviceStateEntity> = {
    partitionKey: "devices",
    rowKey: payload.deviceId,
    lastSeen: now.toISOString(),
    status: "ONLINE",
    distanceCm: payload.distanceCm,
    pirDetected: payload.pirDetected,
    armed: payload.armed,
    alarm: payload.alarm,
    doorLocked: payload.doorLocked,
    ip: payload.ip || (existing?.ip ?? ""),
    rssi: payload.rssi ?? (existing?.rssi ?? 0),
    offlineAlertSent: false,
    lastAlarmAlertTime: existing?.lastAlarmAlertTime
  };

  await deviceStateTable.upsertEntity(entity, "Merge");
  return entity as DeviceStateEntity;
}

/**
 * Ghi nhận sự kiện báo động vào bảng alerts
 */
export async function saveAlert(payload: TelemetryPayload): Promise<void> {
  if (!alertsTable) return;
  const now = new Date();
  const dateKey = getUtc7DateKey(now);
  const rowKey = generateDescendingRowKey(now, payload.deviceId);

  const entity: TableEntity<AlertEntity> = {
    partitionKey: dateKey,
    rowKey,
    deviceId: payload.deviceId,
    timestamp: now.toISOString(),
    alertSource: payload.alertSource || (payload.pirDetected ? "PIR Motion Detected" : "Ultrasonic Distance Violation"),
    distanceCm: payload.distanceCm,
    pirDetected: payload.pirDetected,
    doorLocked: payload.doorLocked
  };

  await alertsTable.upsertEntity(entity, "Merge");
}

