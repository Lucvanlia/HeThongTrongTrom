import { app, InvocationContext } from "@azure/functions";
import { TelemetryPayload } from "../types";
import { saveHistory, updateDeviceState, saveAlert } from "../services/storageService";
import { broadcastToWebClients } from "../services/pubSubService";
import { sendAlarmEmailNotification } from "../services/emailService";

export async function telemetryIngest(messages: unknown, context: InvocationContext): Promise<void> {
  const msgList = Array.isArray(messages) ? messages : [messages];

  for (const rawMsg of msgList) {
    try {
      let payload: TelemetryPayload;
      if (typeof rawMsg === "string") {
        payload = JSON.parse(rawMsg);
      } else if (Buffer.isBuffer(rawMsg)) {
        payload = JSON.parse(rawMsg.toString("utf-8"));
      } else {
        payload = rawMsg as TelemetryPayload;
      }

      if (!payload || !payload.deviceId) {
        context.warn("[telemetryIngest] Nhận message không có deviceId hợp lệ, bỏ qua:", rawMsg);
        continue;
      }

      // 1. Cập nhật trạng thái tức thời của thiết bị
      const updatedState = await updateDeviceState(payload);

      // 2. Lưu vào bảng lịch sử đo đạc
      await saveHistory(payload);

      // 3. Xử lý khi có báo động đột nhập
      const isAlarm = payload.alarm === true || payload.type === "alert";
      if (isAlarm) {
        context.warn(`🚨 [BÁO ĐỘNG] Thiết bị ${payload.deviceId} phát hiện đột nhập! Nguồn: ${payload.alertSource || "PIR/Sonar"}`);
        await saveAlert(payload);
        await sendAlarmEmailNotification(payload, updatedState);
        await broadcastToWebClients("alert", {
          ...payload,
          alertTime: new Date().toISOString()
        });
      }

      // 4. Phát sóng thời gian thực cho Web Dashboard (WebSocket)
      await broadcastToWebClients("telemetry", payload);

    } catch (err: any) {
      context.error("[telemetryIngest] Lỗi khi xử lý message từ IoT Hub:", err.message);
    }
  }
}

app.eventHub("telemetryIngest", {
  connection: "IOT_HUB_EVENT_HUB_CONNECTION",
  eventHubName: "", // Để trống khi dùng chuỗi kết nối Event Hub-compatible endpoint của IoT Hub
  cardinality: "many",
  handler: telemetryIngest
});
