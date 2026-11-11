import React, { useEffect, useState, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { KpiCards } from "./components/KpiCards";
import { ControlPanel } from "./components/ControlPanel";
import { DistanceChart } from "./components/DistanceChart";
import { AlertsList } from "./components/AlertsList";
import { AdminConfigModal } from "./components/AdminConfigModal";
import { AzureClient, ConnectionStatus } from "./lib/azureClient";
import { FirebaseClient } from "./lib/firebaseClient";
import { TelemetryData, HistoryPoint, AlertItem, DeviceConfig, UserPrincipal } from "./types";

export const App: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>("CONNECTING");
  const [user, setUser] = useState<UserPrincipal | null>(null);
  const [config, setConfig] = useState<DeviceConfig>({ thresholdCm: 50, telemetryIntervalMs: 15000 });
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Load ban đầu từ REST APIs / Azure Cold Storage
  const loadInitialData = useCallback(async () => {
    try {
      // 1. Lịch sử đo đạc từ Azure Table Storage
      const hist = await AzureClient.fetchHistory();
      if (hist && hist.length > 0) {
        setHistory(hist);
      }

      // 2. Danh sách cảnh báo đã ghi nhận từ Azure
      const alertList = await AzureClient.fetchAlerts();
      if (alertList && alertList.length > 0) {
        setAlerts(alertList);
      }

      // 3. Thông tin phân quyền Easy Auth
      const userInfo = await AzureClient.fetchUserPrincipal();
      if (userInfo) {
        setUser(userInfo);
      }
    } catch (e) {
      console.warn("[App] Azure initial load notice:", e);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // 1. Lắng nghe HOT PATH: Firebase Realtime Database (<50ms)
    const unsubTelemetry = FirebaseClient.subscribeTelemetry((newData) => {
      setTelemetry((prev) => ({ ...prev, ...newData, status: "ONLINE" }));
      setWsStatus("CONNECTED");
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
    });

    // 2. Lắng nghe trạng thái thiết bị từ Firebase
    const unsubStatus = FirebaseClient.subscribeStatus((online) => {
      setTelemetry((prev) => prev ? { ...prev, status: online ? "ONLINE" : "OFFLINE" } : null);
    });

    // 3. Lắng nghe danh sách cảnh báo đột nhập từ Firebase
    const unsubAlerts = FirebaseClient.subscribeAlerts((items) => {
      if (items.length > 0) {
        setAlerts(items);
      }
    });

    // 4. Lắng nghe cấu hình Device Config từ Firebase
    const unsubConfig = FirebaseClient.subscribeConfig((newCfg) => {
      setConfig(newCfg);
    });

    // 5. Fallback: Kết nối song song với Azure Web PubSub nếu cần
    const azureClient = new AzureClient({
      onTelemetry: (newData) => {
        setTelemetry((prev) => ({ ...prev, ...newData, status: "ONLINE" }));
      },
      onAlert: (alertData) => {
        setTelemetry((prev) => (prev ? { ...prev, alarm: true } : null));
      },
      onDeviceOffline: () => {
        setTelemetry((prev) => prev ? { ...prev, status: "OFFLINE" } : null);
      },
      onStatusChange: (status) => {
        // Chỉ cập nhật nếu Firebase chưa kết nối
        if (wsStatus !== "CONNECTED") {
          setWsStatus(status);
        }
      }
    });
    azureClient.connect();

    return () => {
      unsubTelemetry();
      unsubStatus();
      unsubAlerts();
      unsubConfig();
      azureClient.disconnect();
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

      {/* 3. Bảng điều khiển Hybrid Cloud (Khóa chống bấm lặp 3.5s) */}
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

      {/* 5. Modal cài đặt Device Config */}
      <AdminConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentConfig={config}
        onConfigSaved={(newCfg) => setConfig(newCfg)}
      />

      {/* Footer */}
      <footer style={{ marginTop: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", paddingBottom: "20px" }}>
        <p>Hệ Thống Báo Động Chống Trộm IoT • Hybrid Cloud: Firebase Realtime Database & Microsoft Azure • Dual-Core ESP32</p>
      </footer>
    </div>
  );
};
