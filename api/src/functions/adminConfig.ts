import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getClientPrincipal, hasRole } from "../utils/auth";
import { iotRegistryClient } from "../utils/iotHub";

const defaultDeviceId = process.env.DEFAULT_DEVICE_ID || "esp32_device_01";

/**
 * GET /api/admin/config - Đọc cấu hình Device Twin (ngưỡng khoảng cách, chu kỳ telemetry)
 */
export async function getConfig(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!iotRegistryClient) {
    return { status: 500, jsonBody: { error: "IOT_HUB_REGISTRY_CONNECTION_STRING chưa được cấu hình." } };
  }

  const targetDeviceId = request.query.get("deviceId") || defaultDeviceId;

  const registry = iotRegistryClient;
  try {
    const twin: any = await new Promise((resolve, reject) => {
      registry.getTwin(targetDeviceId, (err, twin) => {
        if (err) reject(err);
        else resolve(twin);
      });
    });

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      jsonBody: {
        deviceId: targetDeviceId,
        desired: twin.properties?.desired || {},
        reported: twin.properties?.reported || {}
      }
    };
  } catch (err: any) {
    context.error("[getConfig] Lỗi khi đọc Device Twin:", err.message);
    return { status: 500, jsonBody: { error: err.message } };
  }
}

/**
 * PUT /api/admin/config - Cập nhật thông số ngưỡng vào Device Twin (Yêu cầu vai trò ADMIN)
 */
export async function updateConfig(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const principal = getClientPrincipal(request);
  if (!hasRole(principal, ["admin"])) {
    return {
      status: 403,
      jsonBody: { error: "Forbidden: Bạn cần vai trò 'admin' để cập nhật cấu hình hệ thống." }
    };
  }

  if (!iotRegistryClient) {
    return { status: 500, jsonBody: { error: "IOT_HUB_REGISTRY_CONNECTION_STRING chưa được cấu hình." } };
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return { status: 400, jsonBody: { error: "Định dạng JSON không hợp lệ." } };
  }

  const { thresholdCm, telemetryIntervalMs, deviceId } = body || {};
  const targetDeviceId = deviceId || defaultDeviceId;

  const patch: any = {
    properties: {
      desired: {}
    }
  };

  if (typeof thresholdCm === "number") {
    patch.properties.desired.thresholdCm = thresholdCm;
  }
  if (typeof telemetryIntervalMs === "number") {
    patch.properties.desired.telemetryIntervalMs = telemetryIntervalMs;
  }

  const registry = iotRegistryClient;
  try {
    const updatedTwin: any = await new Promise((resolve, reject) => {
      registry.getTwin(targetDeviceId, (err, twin) => {
        if (err || !twin) return reject(err || new Error("Không thể tìm thấy Twin của thiết bị."));
        twin.update(patch, (updateErr: any, resTwin: any) => {
          if (updateErr) reject(updateErr);
          else resolve(resTwin);
        });
      });
    });

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      jsonBody: {
        success: true,
        message: `Đã cập nhật cấu hình mong muốn (desired properties) cho thiết bị ${targetDeviceId}.`,
        desired: updatedTwin.properties?.desired
      }
    };
  } catch (err: any) {
    context.error("[updateConfig] Lỗi khi cập nhật Device Twin:", err.message);
    return { status: 500, jsonBody: { error: err.message } };
  }
}

app.http("getAdminConfig", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "admin/config",
  handler: getConfig
});

app.http("updateAdminConfig", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "admin/config",
  handler: updateConfig
});
