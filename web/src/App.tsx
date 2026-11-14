import React, { useEffect, useState, useRef } from "react";
import { Header } from "./components/Header";
import { KpiCards } from "./components/KpiCards";
import { ControlPanel } from "./components/ControlPanel";
import { DistanceChart } from "./components/DistanceChart";
import { AlertsList } from "./components/AlertsList";
import { AdminConfigModal } from "./components/AdminConfigModal";
import { LoginModal } from "./components/LoginModal";
import { FirebaseClient } from "./lib/firebaseClient";
import { TelemetryData, HistoryPoint, AlertItem, DeviceConfig, ConnectionStatus } from "./types";

export const App: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>("CONNECTING");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [config, setConfig] = useState<DeviceConfig>({ thresholdCm: 12, telemetryIntervalMs: 1000 });
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  // Mốc thời gian nhận gói tin telemetry gần nhất (dùng để phát hiện Offline chính xác)
  const lastArrivalRef = useRef<number>(Date.now());

  // 1. Lắng nghe trạng thái đăng nhập Firebase Authentication
  useEffect(() => {
    const unsubAuth = FirebaseClient.onAuthChanged((user) => {
      if (user) {
        setUserEmail(user.email);
        setIsLoginOpen(false);
      } else {
        setUserEmail(null);
      }
    });

    return () => unsubAuth();
  }, []);

  // 2. Lắng nghe dữ liệu Realtime từ Firebase Realtime Database
  useEffect(() => {
    // A. Lắng nghe luồng Telemetry
    const unsubTelemetry = FirebaseClient.subscribeTelemetry((newData) => {
      lastArrivalRef.current = Date.now();
      setTelemetry({ ...newData, status: "ONLINE" });
      setWsStatus("CONNECTED");
      setSecondsAgo(0);

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

    // B. Lắng nghe trạng thái thiết bị
    const unsubStatus = FirebaseClient.subscribeStatus((online) => {
      setTelemetry((prev) => prev ? { ...prev, status: online ? "ONLINE" : "OFFLINE" } : null);
    });

    // C. Lắng nghe nhật ký sự cố đột nhập (limitToLast 50)
    const unsubAlerts = FirebaseClient.subscribeAlerts((items) => {
      setAlerts(items);
    });

    // D. Lắng nghe cấu hình thiết bị
    const unsubConfig = FirebaseClient.subscribeConfig((newCfg) => {
      setConfig(newCfg);
    });

    return () => {
      unsubTelemetry();
      unsubStatus();
      unsubAlerts();
      unsubConfig();
    };
  }, []);

  // 3. Bộ đếm nhịp tim (Heartbeat Ticker): Đếm số giây kể từ lần cuối nhận telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastArrivalRef.current) / 1000);
      setSecondsAgo(elapsed);

      // Nếu quá 8 giây không có tin mới từ ESP32 -> đánh dấu OFFLINE
      if (elapsed > 8) {
        setTelemetry((prev) => prev ? { ...prev, status: "OFFLINE" } : null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await FirebaseClient.logout();
    setUserEmail(null);
  };

  const deviceOnline = telemetry?.status !== "OFFLINE" && (secondsAgo === null || secondsAgo <= 8);
  const hasAlarm = telemetry?.alarm === true;

  return (
    <div className="container">
      {/* 1. Header & Hệ thống trạng thái */}
      <Header
        wsStatus={wsStatus}
        deviceOnline={deviceOnline}
        userEmail={userEmail}
        hasAlarm={hasAlarm}
        secondsSinceLastHeartbeat={secondsAgo}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. Thẻ KPI đo đạc cảm biến thời gian thực */}
      <KpiCards
        telemetry={telemetry}
        thresholdCm={config.thresholdCm}
      />

      {/* 3. Bảng điều khiển Realtime (Đóng vòng lặp điều khiển) */}
      <ControlPanel
        telemetry={telemetry}
        onRefresh={() => { lastArrivalRef.current = Date.now(); setSecondsAgo(0); }}
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

      {/* 6. Modal Đăng nhập Quản trị viên (Firebase Auth) */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(email) => setUserEmail(email)}
      />

      {/* Footer */}
      <footer style={{ marginTop: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", paddingBottom: "20px" }}>
        <p>Hệ Thống Báo Động Chống Trộm IoT • Firebase Realtime Cloud & Dual-Core ESP32 • Chuẩn An Ninh</p>
      </footer>
    </div>
  );
};
