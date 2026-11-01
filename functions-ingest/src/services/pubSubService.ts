import { WebPubSubServiceClient } from "@azure/web-pubsub";

const connString = process.env.WEB_PUBSUB_CONNECTION_STRING || "";
const hubName = process.env.WEB_PUBSUB_HUB_NAME || "iot";

export const pubSubClient = connString ? new WebPubSubServiceClient(connString, hubName) : null;

/**
 * Phát broadcast dữ liệu thời gian thực tới tất cả các trình duyệt Web đang mở qua WebSocket
 */
export async function broadcastToWebClients(eventName: string, data: any): Promise<void> {
  if (!pubSubClient) {
    return;
  }

  try {
    const message = {
      event: eventName,
      data,
      timestamp: new Date().toISOString()
    };
    await pubSubClient.sendToAll(JSON.stringify(message));
  } catch (err: any) {
    console.error(`[WebPubSub] Lỗi khi gửi broadcast '${eventName}':`, err.message);
  }
}
