import { app, InvocationContext, Timer } from "@azure/functions";
import { deviceStateTable } from "../services/storageService";
import { DeviceStateEntity } from "../types";
import { broadcastToWebClients } from "../services/pubSubService";
import { sendOfflineEmailNotification } from "../services/emailService";

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 phút không có tín hiệu = OFFLINE

export async function offlineWatchdog(myTimer: Timer, context: InvocationContext): Promise<void> {
  if (!deviceStateTable) {
    context.warn("[offlineWatchdog] deviceStateTable chưa được kết nối.");
    return;
  }

  const now = Date.now();

  try {
    const iterator = deviceStateTable.listEntities<DeviceStateEntity>({
      queryOptions: { filter: "PartitionKey eq 'devices'" }
    });

    for await (const device of iterator) {
      if (!device.lastSeen) continue;

      const lastSeenTime = new Date(device.lastSeen).getTime();
      const elapsedMs = now - lastSeenTime;

      // Nếu quá 5 phút mà chưa ghi nhận offline hoặc chưa gửi email
      if (elapsedMs > OFFLINE_THRESHOLD_MS && device.status !== "OFFLINE") {
        context.warn(`⚠️ [OFFLINE DETECTED] Thiết bị ${device.rowKey} mất kết nối hơn ${Math.round(elapsedMs / 1000)}s!`);

        // Cập nhật trạng thái
        await deviceStateTable.upsertEntity({
          partitionKey: device.partitionKey,
          rowKey: device.rowKey,
          status: "OFFLINE",
          offlineAlertSent: true
        }, "Merge");

        // Gửi email cảnh báo mất kết nối
        await sendOfflineEmailNotification(device.rowKey, device.lastSeen);

        // Phát sóng WebSocket báo cho Web Dashboard chuyển màu xám/offline
        await broadcastToWebClients("device_offline", {
          deviceId: device.rowKey,
          lastSeen: device.lastSeen,
          status: "OFFLINE"
        });
      }
    }
  } catch (err: any) {
    context.error("[offlineWatchdog] Lỗi khi quét danh sách thiết bị:", err.message);
  }
}

app.timer("offlineWatchdog", {
  schedule: "0 */1 * * * *", // Quét mỗi 1 phút
  handler: offlineWatchdog
});
