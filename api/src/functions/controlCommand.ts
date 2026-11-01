import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getClientPrincipal, hasRole } from "../utils/auth";
import { iotServiceClient } from "../utils/iotHub";

const defaultDeviceId = process.env.DEFAULT_DEVICE_ID || "esp32_device_01";

export async function controlCommand(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  // 1. Kiểm tra xác thực và phân quyền RBAC (yêu cầu role: admin hoặc operator)
  const principal = getClientPrincipal(request);
  if (!hasRole(principal, ["admin", "operator"])) {
    return {
      status: 403,
      jsonBody: {
        error: "Forbidden: Bạn cần vai trò 'admin' hoặc 'operator' để thực hiện thao tác này."
      }
    };
  }

  // 2. Parse body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return {
      status: 400,
      jsonBody: { error: "Yêu cầu định dạng JSON không hợp lệ." }
    };
  }

  const { command, payload, deviceId } = body || {};
  const targetDeviceId = deviceId || defaultDeviceId;

  if (!command || !["setArm", "setLock", "silenceAlarm"].includes(command)) {
    return {
      status: 400,
      jsonBody: {
        error: "Tham số 'command' không hợp lệ. Cho phép: 'setArm', 'setLock', 'silenceAlarm'."
      }
    };
  }

  if (!iotServiceClient) {
    return {
      status: 500,
      jsonBody: { error: "IOT_HUB_SERVICE_CONNECTION_STRING chưa được cấu hình." }
    };
  }

  // 3. Gọi Direct Method qua Azure IoT Hub tới ESP32
  try {
    context.log(`[controlCommand] Gửi Direct Method '${command}' tới thiết bị '${targetDeviceId}' bởi user '${principal?.userDetails}'...`);

    const methodParams = {
      methodName: command,
      payload: payload || {},
      responseTimeoutInSeconds: 10,
      connectTimeoutInSeconds: 10
    };

    const response = await iotServiceClient.invokeDeviceMethod(targetDeviceId, methodParams);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      jsonBody: {
        success: response.result.status === 200,
        status: response.result.status,
        payload: response.result.payload,
        message: `Đã thực thi lệnh '${command}' thành công trên thiết bị ${targetDeviceId}.`
      }
    };
  } catch (err: any) {
    context.error(`[controlCommand] Lỗi khi gọi Direct Method '${command}':`, err.message);
    return {
      status: 502,
      jsonBody: {
        error: `Không thể kết nối tới thiết bị '${targetDeviceId}' (có thể thiết bị đang Offline): ${err.message}`
      }
    };
  }
}

app.http("controlCommand", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "control/command",
  handler: controlCommand
});

