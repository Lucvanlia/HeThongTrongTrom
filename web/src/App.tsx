import React, { useEffect, useState, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { KpiCards } from "./components/KpiCards";
import { ControlPanel } from "./components/ControlPanel";
import { DistanceChart } from "./components/DistanceChart";
import { AlertsList } from "./components/AlertsList";
import { AdminConfigModal } from "./components/AdminConfigModal";
import { AzureClient, ConnectionStatus } from "./lib/azureClient";
import { TelemetryData, HistoryPoint, AlertItem, DeviceConfig, UserPrincipal } from "./types";

export const App: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>("CONNECTING");
  const [user, setUser] = useState<UserPrincipal | null>(null);
  const [config, setConfig] = useState<DeviceConfig>({ thresholdCm: 50, telemetryIntervalMs: 15000 });
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  const clientRef = useRef<AzureClient | null>(null);

  // Load ban đầu từ REST APIs
  const loadInitialData = useCallback(async () => {
    // 1. Trạng thái thiết bị tức thời
    const state = await AzureClient.fetchDeviceState();
    if (state) {
      setTelemetry((prev) => ({ ...prev, ...state }));
    }

    // 2. Lịch sử đo đạc để vẽ biểu đồ
    const hist = await AzureClient.fetchHistory();
    if (hist && hist.length > 0) {
      setHistory(hist);
    }

    // 3. Danh sách cảnh báo đã ghi nhận
    const alertList = await AzureClient.fetchAlerts();
    if (alertList && alertList.length > 0) {
      setAlerts(alertList);
    }

    // 4. Cấu hình Device Twin
    const adminCfg = await AzureClient.fetchAdminConfig();
    if (adminCfg) {
      setConfig(adminCfg);
    }

    // 5. Thông tin phân quyền Easy Auth
    const userInfo = await AzureClient.fetchUserPrincipal();
    if (userInfo) {
      setUser(userInfo);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Khởi tạo WebSocket kết nối Azure Web PubSub
    const client = new AzureClient({
      onTelemetry: (newData) => {
        setTelemetry((prev) => ({ ...prev, ...newData, status: "ONLINE" }));
        setHistory((prev) => {
          const newPoint: HistoryPoint = {
            timestamp: new Date().toISOString(),
            distanceCm: newData.distanceCm,
            pirDetected: newData.pirDetected,
            armed: newData.armed,
            alarm: newData.alarm,
            doorLocked: newData.doorLocked,
            rssi: newData.rssi ?? 0
          };
          const next = [...prev, newPoint];
          return next.slice(-100); // Giữ tối đa 100 điểm gần nhất
        });
      },
      onAlert: (alertData) => {
        setTelemetry((prev) => (prev ? { ...prev, alarm: true } : null));
        setAlerts((prev) => [
          {
            id: alertData.alertTime || Date.now().toString(),
            deviceId: alertData.deviceId || "esp32_device_01",
            timestamp: alertData.alertTime || new Date().toISOString(),
            alertSource: alertData.alertSource || "Báo Động",
            distanceCm: alertData.distanceCm ?? 0,
            pirDetected: alertData.pirDetected ?? false,
            doorLocked: alertData.doorLocked ?? false
          },
          ...prev
        ]);
      },
      onDeviceOffline: (offlineData) => {
        setTelemetry((prev) => prev ? { ...prev, status: "OFFLINE" } : null);
      },
      onStatusChange: (status) => {
        setWsStatus(status);
      }
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
    };
  }, [loadInitialData]);

  const deviceOnline = telemetry?.status !== "OFFLINE";
  const hasAlarm = telemetry?.alarm === true;

  return (
    <div className="container">
      {/* 1. Header & Hệ thống trạng thái */}
      <Header
        wsStatus={wsStatus}
        deviceOnline={deviceOnline}
        user={user}
        hasAlarm={hasAlarm}
      />

      {/* 2. Thẻ KPI đo đạc cảm biến thời gian thực */}
      <KpiCards
        telemetry={telemetry}
        thresholdCm={config.thresholdCm}
      />

      {/* 3. Bảng điều khiển Direct Method C2D (Khóa chống bấm lặp 3.5s) */}
      <ControlPanel
        telemetry={telemetry}
        onRefresh={loadInitialData}
        onOpenSettings={() => setIsConfigOpen(true)}
      />

      {/* 4. Khối biểu đồ Zero-Jitter và danh sách cảnh báo */}
      <div className="grid-main">
        <DistanceChart
          data={history}
          thresholdCm={config.thresholdCm}
        />
        <AlertsList
          alerts={alerts}
        />
      </div>

      {/* 5. Modal cài đặt Device Twin cho Admin */}
      <AdminConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentConfig={config}
        onConfigSaved={(newCfg) => setConfig(newCfg)}
      />

      {/* Footer */}
      <footer style={{ marginTop: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", paddingBottom: "20px" }}>
        <p>Hệ Thống Báo Động Chống Trộm IoT • Kiến Trúc Thuần 100% Microsoft Azure • Dual-Core ESP32 FreeRTOS</p>
      </footer>
    </div>
  );
};

