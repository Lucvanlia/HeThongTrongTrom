import React, { useEffect, useState, useRef } from "react";
import { Header } from "./components/Header";
import { KpiCards } from "./components/KpiCards";
import { ControlPanel } from "./components/ControlPanel";
import { DistanceChart } from "./components/DistanceChart";
import { AlertsList } from "./components/AlertsList";
import { AdminConfigModal } from "./components/AdminConfigModal";
import { LoginModal } from "./components/LoginModal";
import { FirebaseClient } from "./lib/firebaseClient";
import { TelemetryData, HistoryPoint, AlertItem, AuditLogItem, DeviceConfig, ScheduleConfig, ConnectionStatus } from "./types";
import { Lock } from "lucide-react";

const OFFLINE_TIMEOUT_S = 15; // Ngưỡng phát hiện mất kết nối 15 giây (chống báo OFFLINE giả khi mạng trễ)

export const App: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>("CONNECTING");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [config, setConfig] = useState<DeviceConfig>({ thresholdCm: 12, telemetryIntervalMs: 1000 });
  const [schedule, setSchedule] = useState<ScheduleConfig>({ enabled: false, armTime: "22:00", disarmTime: "06:00" });
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  // Mốc thời gian nhận gói tin telemetry gần nhất (dùng để phát hiện Offline chính xác)
  const lastArrivalRef = useRef<number>(Date.now());
  const lastScheduledMinuteRef = useRef<string>("");

  // 1. Lắng nghe trạng thái đăng nhập
  useEffect(() => {
    const unsubAuth = FirebaseClient.onAuthChanged((user) => {
      if (user) {
        setUserEmail(user.email);
        setIsLoginOpen(false);
      } else {
        setUserEmail(null);
        setWsStatus("DISCONNECTED");
      }
    });

    return () => unsubAuth();
  }, []);

  // 2. Chỉ mở kết nối lắng nghe dữ liệu khi Admin đã xác thực
  useEffect(() => {
    if (!userEmail) {
      setTelemetry(null);
      setAlerts([]);
      setAuditLogs([]);
      setSecondsAgo(null);
      return;
    }

    setWsStatus("CONNECTING");

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

    // C. Lắng nghe nhật ký sự cố đột nhập (limitToLast 100)
    const unsubAlerts = FirebaseClient.subscribeAlerts((items) => {
      setAlerts(items);
    });

    // D. Lắng nghe cấu hình thiết bị
    const unsubConfig = FirebaseClient.subscribeConfig((newCfg) => {
      setConfig(newCfg);
    });

    // E. Lắng nghe lịch trình hẹn giờ ARM / DISARM
    const unsubSchedule = FirebaseClient.subscribeSchedule((newSch) => {
      setSchedule(newSch);
    });

    // F. Lắng nghe nhật ký thao tác người dùng (Audit Logs)
    const unsubAudit = FirebaseClient.subscribeAuditLogs((logs) => {
      setAuditLogs(logs);
    });

    return () => {
      unsubTelemetry();
      unsubStatus();
      unsubAlerts();
      unsubConfig();
      unsubSchedule();
      unsubAudit();
    };
  }, [userEmail]);

  // 3. Bộ đếm nhịp tim (Heartbeat Ticker): Đếm số giây kể từ lần cuối nhận telemetry
  useEffect(() => {
    if (!userEmail) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastArrivalRef.current) / 1000);
      setSecondsAgo(elapsed);

      // Nếu quá 15 giây không có tin mới từ ESP32 -> đánh dấu OFFLINE
      if (elapsed > OFFLINE_TIMEOUT_S) {
        setTelemetry((prev) => prev ? { ...prev, status: "OFFLINE" } : null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userEmail]);

  // 4. Bộ kiểm tra lịch trình tự động ARM / DISARM theo giờ
  useEffect(() => {
    if (!schedule.enabled || !userEmail) return;

    const scheduleInterval = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      if (currentHHMM === lastScheduledMinuteRef.current) return;

      if (currentHHMM === schedule.armTime && telemetry && !telemetry.armed) {
        lastScheduledMinuteRef.current = currentHHMM;
        FirebaseClient.setArmed(true, "Lịch trình tự động");
      } else if (currentHHMM === schedule.disarmTime && telemetry && telemetry.armed) {
        lastScheduledMinuteRef.current = currentHHMM;
        FirebaseClient.setArmed(false, "Lịch trình tự động");
      }
    }, 10000);

    return () => clearInterval(scheduleInterval);
  }, [schedule, telemetry, userEmail]);

  const handleLogout = async () => {
    await FirebaseClient.logout();
    setUserEmail(null);
  };

  const deviceOnline = Boolean(
    userEmail &&
    telemetry &&
    telemetry.status !== "OFFLINE" &&
    (secondsAgo === null || secondsAgo <= OFFLINE_TIMEOUT_S)
  );
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

      {/* Thông báo yêu cầu đăng nhập nếu chưa xác thực */}
      {!userEmail && (
        <div
          className="glass-panel"
          style={{
            padding: "16px 20px",
            marginBottom: "24px",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            background: "rgba(56, 189, 248, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Lock size={18} color="var(--cyan-accent)" />
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
              Hệ thống được bảo vệ an ninh đa lớp. Vui lòng đăng nhập tài khoản Quản trị viên để xem luồng cảm biến và điều khiển.
            </span>
          </div>
          <button
            onClick={() => setIsLoginOpen(true)}
            className="btn btn-primary"
            style={{ padding: "8px 16px", fontSize: "0.85rem" }}
          >
            Đăng Nhập Ngay
          </button>
        </div>
      )}

      {/* 2. Thẻ KPI đo đạc cảm biến thời gian thực */}
      <KpiCards
        telemetry={telemetry}
        thresholdCm={config.thresholdCm}
      />

      {/* 3. Bảng điều khiển Realtime (Đóng vòng lặp điều khiển) */}
      <ControlPanel
        telemetry={telemetry}
        userEmail={userEmail}
        onRefresh={() => { lastArrivalRef.current = Date.now(); setSecondsAgo(0); }}
        onOpenSettings={() => setIsConfigOpen(true)}
      />

      {/* 4. Khối biểu đồ Zero-Jitter và danh sách cảnh báo / audit */}
      <div className="grid-main">
        <DistanceChart
          data={history}
          thresholdCm={config.thresholdCm}
        />
        <AlertsList
          alerts={alerts}
          auditLogs={auditLogs}
        />
      </div>

      {/* 5. Modal cài đặt Device Config & Hẹn giờ */}
      <AdminConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentConfig={config}
        currentSchedule={schedule}
        userEmail={userEmail}
        onConfigSaved={(newCfg) => setConfig(newCfg)}
        onScheduleSaved={(newSch) => setSchedule(newSch)}
      />

      {/* 6. Modal Đăng nhập Quản trị viên */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(email) => setUserEmail(email)}
      />

      {/* Footer */}
      <footer style={{ marginTop: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", paddingBottom: "20px" }}>
        <p>Hệ Thống Báo Động Chống Trộm IoT • Giám Sát & Điều Khiển An Ninh Trực Tuyến 24/7</p>
      </footer>
    </div>
  );
};
