import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { WebPubSubServiceClient } from "@azure/web-pubsub";

const connString = process.env.WEB_PUBSUB_CONNECTION_STRING || "";
const hubName = process.env.WEB_PUBSUB_HUB_NAME || "iot";

export async function negotiate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!connString) {
    return {
      status: 500,
      jsonBody: { error: "WEB_PUBSUB_CONNECTION_STRING chưa được cấu hình." }
    };
  }

  try {
    const serviceClient = new WebPubSubServiceClient(connString, hubName);
    // Cấp token kết nối WebSocket thời hạn 24 giờ cho Web Dashboard
    const token = await serviceClient.getClientAccessToken({
      roles: ["webpubsub.joinLeaveGroup"]
    });

    return {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      },
      jsonBody: {
        url: token.url
      }
    };
  } catch (err: any) {
    context.error("[negotiate] Lỗi sinh token Web PubSub:", err.message);
    return {
      status: 500,
      jsonBody: { error: err.message }
    };
  }
}

app.http("negotiate", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "realtime/negotiate",
  handler: negotiate
});
