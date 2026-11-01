import axios from "axios";
import { DeviceStateEntity, TelemetryPayload } from "../types";
import { deviceStateTable } from "./storageService";

const ALARM_COOLDOWN_MS = 5 * 60 * 1000; // 5 phút chống spam email cảnh báo đột nhập

/**
 * Gửi email cảnh báo đột nhập qua Azure Logic Apps Webhook
 */
export async function sendAlarmEmailNotification(payload: TelemetryPayload, deviceState?: DeviceStateEntity): Promise<void> {
  const webhookUrl = process.env.LOGIC_APPS_ALARM_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.startsWith("http")) {
    return; // Chưa cấu hình webhook email
  }

  const now = Date.now();
  if (deviceState?.lastAlarmAlertTime) {
    const lastAlertTime = new Date(deviceState.lastAlarmAlertTime).getTime();
    if (now - lastAlertTime < ALARM_COOLDOWN_MS) {
      console.log(`[EmailService] Cảnh báo đang trong thời gian cooldown (${Math.round((ALARM_COOLDOWN_MS - (now - lastAlertTime)) / 1000)}s còn lại). Bỏ qua gửi email.`);
      return;
    }
  }

  try {
    const emailBody = {
      title: "🚨 [CẢNH BÁO ĐỘT NHẬP KHẨN CẤP] - Hệ Thống Chống Trộm IoT",
      deviceId: payload.deviceId,
      timestamp: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      alertSource: payload.alertSource || (payload.pirDetected ? "Cảm biến chuyển động PIR kích hoạt" : `Cảm biến siêu âm: Vật cản ${payload.distanceCm}cm`),
      distanceCm: payload.distanceCm,
      pirDetected: payload.pirDetected ? "PHÁT HIỆN CHUYỂN ĐỘNG" : "Không phát hiện",
      doorLocked: payload.doorLocked ? "ĐÃ KHÓA CHẶT" : "ĐANG MỞ",
      deviceIp: payload.ip || "N/A",
      rssi: `${payload.rssi ?? 0} dBm`,
      actionUrl: "https://portal.azure.com"
    };

    await axios.post(webhookUrl, emailBody, { timeout: 10000 });
    console.log(`[EmailService] Đã kích hoạt email cảnh báo đột nhập cho thiết bị ${payload.deviceId}`);

    // Cập nhật lại mốc thời gian đã gửi cảnh báo vào devicestate để giữ cooldown
    if (deviceStateTable) {
      await deviceStateTable.upsertEntity({
        partitionKey: "devices",
        rowKey: payload.deviceId,
        lastAlarmAlertTime: new Date(now).toISOString()
      }, "Merge");
    }
  } catch (err: any) {
    console.error("[EmailService] Lỗi khi gọi webhook Logic Apps gửi email đột nhập:", err.message);
  }
}

/**
 * Gửi email cảnh báo thiết bị ngắt kết nối (Offline > 5 phút)
 */
export async function sendOfflineEmailNotification(deviceId: string, lastSeen: string): Promise<void> {
  const webhookUrl = process.env.LOGIC_APPS_OFFLINE_WEBHOOK_URL || process.env.LOGIC_APPS_ALARM_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.startsWith("http")) {
    return;
  }

  try {
    const emailBody = {
      title: "⚠️ [MẤT KẾT NỐI THIẾT BỊ] - Hệ Thống Chống Trộm IoT",
      deviceId,
      lastSeen: new Date(lastSeen).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      detectedAt: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      message: `Thiết bị ${deviceId} đã không gửi tín hiệu về Azure IoT Hub trong hơn 5 phút. Vui lòng kiểm tra nguồn điện và mạng Wi-Fi tại hiện trường.`
    };

    await axios.post(webhookUrl, emailBody, { timeout: 10000 });
    console.log(`[EmailService] Đã gửi email cảnh báo thiết bị ${deviceId} offline.`);
  } catch (err: any) {
    console.error("[EmailService] Lỗi khi gọi webhook Logic Apps gửi email offline:", err.message);
  }
}

