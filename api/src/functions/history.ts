import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

const connString = process.env.AZURE_STORAGE_CONNECTION_STRING || "";
const defaultDeviceId = process.env.DEFAULT_DEVICE_ID || "esp32_device_01";

const historyTable = connString ? TableClient.fromConnectionString(connString, "history") : null;
const alertsTable = connString ? TableClient.fromConnectionString(connString, "alerts") : null;
const deviceStateTable = connString ? TableClient.fromConnectionString(connString, "devicestate") : null;

/**
 * Lấy chuỗi ngày YYYYMMDD theo múi giờ Việt Nam (UTC+7)
 */
function getUtc7DateKey(date = new Date()): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 7 * 3600000);
  const yyyy = vnTime.getFullYear();
  const mm = String(vnTime.getMonth() + 1).padStart(2, "0");
  const dd = String(vnTime.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/**
 * GET /api/history - Lấy danh sách đo đạc cảm biến để vẽ biểu đồ SVG
 */
export async function getHistory(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!historyTable) {
    return { status: 500, jsonBody: { error: "AZURE_STORAGE_CONNECTION_STRING chưa được cấu hình." } };
  }

  const dateParam = request.query.get("date") || getUtc7DateKey();
  const limitParam = parseInt(request.query.get("limit") || "100", 10);
  const limit = Math.min(Math.max(limitParam, 10), 500);

  try {
    const items: any[] = [];
    const iterator = historyTable.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${dateParam}'`
      }
    });

    for await (const entity of iterator) {
      items.push({
        timestamp: entity.timestamp,
        distanceCm: entity.distanceCm,
        pirDetected: entity.pirDetected,
        armed: entity.armed,
        alarm: entity.alarm,
        doorLocked: entity.doorLocked,
        rssi: entity.rssi
      });
      if (items.length >= limit) break;
    }

    // Vì RowKey được sinh dạng nghịch đảo (mới nhất trước), ta đảo ngược lại mảng để hiển thị từ cũ sang mới trên biểu đồ thời gian
    items.reverse();

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      jsonBody: { date: dateParam, count: items.length, data: items }
    };
  } catch (err: any) {
    context.error("[getHistory] Lỗi khi truy vấn Table Storage:", err.message);
    return { status: 500, jsonBody: { error: err.message } };
  }
}

/**
 * GET /api/alerts - Lấy lịch sử các sự cố đột nhập đã ghi nhận
 */
export async function getAlerts(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!alertsTable) {
    return { status: 500, jsonBody: { error: "AZURE_STORAGE_CONNECTION_STRING chưa được cấu hình." } };
  }

  const limitParam = parseInt(request.query.get("limit") || "50", 10);
  const limit = Math.min(Math.max(limitParam, 5), 200);

  try {
    const items: any[] = [];
    const iterator = alertsTable.listEntities();

    for await (const entity of iterator) {
      items.push({
        id: entity.rowKey,
        deviceId: entity.deviceId,
        timestamp: entity.timestamp,
        alertSource: entity.alertSource,
        distanceCm: entity.distanceCm,
        pirDetected: entity.pirDetected,
        doorLocked: entity.doorLocked
      });
      if (items.length >= limit) break;
    }

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      jsonBody: { count: items.length, data: items }
    };
  } catch (err: any) {
    context.error("[getAlerts] Lỗi khi truy vấn alerts:", err.message);
    return { status: 500, jsonBody: { error: err.message } };
  }
}

/**
 * GET /api/state - Lấy trạng thái tức thời mới nhất của thiết bị
 */
export async function getDeviceState(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!deviceStateTable) {
    return { status: 500, jsonBody: { error: "AZURE_STORAGE_CONNECTION_STRING chưa được cấu hình." } };
  }

  const targetDeviceId = request.query.get("deviceId") || defaultDeviceId;

  try {
    const state = await deviceStateTable.getEntity("devices", targetDeviceId);
    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      jsonBody: state
    };
  } catch (err: any) {
    return {
      status: 404,
      jsonBody: { error: `Không tìm thấy trạng thái thiết bị '${targetDeviceId}'.` }
    };
  }
}

app.http("getHistory", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "history",
  handler: getHistory
});

app.http("getAlerts", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "alerts",
  handler: getAlerts
});

app.http("getDeviceState", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "state",
  handler: getDeviceState
});
