import React from "react";
import { ShieldCheck, ShieldOff, Lock, Unlock, Bell, BellRing, Eye, EyeOff, Radio, Cpu } from "lucide-react";
import { TelemetryData } from "../types";

interface KpiCardsProps {
  telemetry: TelemetryData | null;
  thresholdCm: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ telemetry, thresholdCm }) => {
  const armed = telemetry?.armed ?? false;
  const alarm = telemetry?.alarm ?? false;
  const doorLocked = telemetry?.doorLocked ?? false;
  const pirDetected = telemetry?.pirDetected ?? false;
  const distanceCm = telemetry?.distanceCm ?? 0;
  const isDistanceWarning = armed && distanceCm > 0 && distanceCm < thresholdCm;

  return (
    <div className="grid-kpi">
      {/* 1. Trạng Thái Hệ Thống */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
              Chế Độ An Ninh
            </span>
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: armed ? "var(--emerald-accent)" : "var(--text-muted)" }}>
                {armed ? "ARMED" : "DISARMED"}
              </h2>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {armed ? "Cảm biến sẵn sàng kích hoạt còi" : "Hệ thống tạm ngưng cảnh báo"}
            </p>
          </div>
          <div style={{
            padding: "10px",
            borderRadius: "10px",
            background: armed ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
            color: armed ? "var(--emerald-accent)" : "var(--text-muted)"
          }}>
            {armed ? <ShieldCheck size={26} /> : <ShieldOff size={26} />}
          </div>
        </div>
      </div>

      {/* 2. Khóa Cửa Thông Minh (Servo SG90 + 5V Relay) */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
              Chốt Khóa Cửa (Servo)
            </span>
            <div style={{ marginTop: "8px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: doorLocked ? "var(--cyan-accent)" : "var(--amber-accent)" }}>
                {doorLocked ? "ĐÃ KHÓA (90°)" : "ĐANG MỞ (0°)"}
              </h2>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Rơ-le 5V Power-Gating (GPIO 25)
            </p>
          </div>
          <div style={{
            padding: "10px",
            borderRadius: "10px",
            background: doorLocked ? "rgba(6, 182, 212, 0.15)" : "rgba(245, 158, 11, 0.15)",
            color: doorLocked ? "var(--cyan-accent)" : "var(--amber-accent)"
          }}>
            {doorLocked ? <Lock size={26} /> : <Unlock size={26} />}
          </div>
        </div>
      </div>

      {/* 3. Còi & Đèn Cảnh Báo (Alarm) */}
      <div className="glass-panel" style={{ padding: "20px", borderColor: alarm ? "var(--rose-accent)" : "var(--border-color)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
              Trạng Thái Báo Động
            </span>
            <div style={{ marginTop: "8px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: alarm ? "var(--rose-accent)" : "var(--text-primary)" }}>
                {alarm ? "🚨 ĐANG HÚ CÒI!" : "YÊN TĨNH"}
              </h2>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {alarm ? "Còi 23 & LED 2 nhấp nháy 2Hz" : "Không phát hiện xâm nhập"}
            </p>
          </div>
          <div style={{
            padding: "10px",
            borderRadius: "10px",
            background: alarm ? "rgba(244, 63, 94, 0.2)" : "rgba(255, 255, 255, 0.05)",
            color: alarm ? "var(--rose-accent)" : "var(--text-muted)"
          }}>
            {alarm ? <BellRing size={26} style={{ animation: "pulse-red 1s infinite" }} /> : <Bell size={26} />}
          </div>
        </div>
      </div>

      {/* 4. Cảm Biến Chuyển Động PIR */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
              Hồng Ngoại PIR (HC-SR501)
            </span>
            <div style={{ marginTop: "8px" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: pirDetected ? "var(--rose-accent)" : "var(--text-primary)" }}>
                {pirDetected ? "PHÁT HIỆN" : "BÌNH THƯỜNG"}
              </h2>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {pirDetected ? "Có thân nhiệt chuyển động trong vùng" : "Không có chuyển động"}
            </p>
          </div>
          <div style={{
            padding: "10px",
            borderRadius: "10px",
            background: pirDetected ? "rgba(244, 63, 94, 0.15)" : "rgba(255, 255, 255, 0.05)",
            color: pirDetected ? "var(--rose-accent)" : "var(--text-muted)"
          }}>
            {pirDetected ? <Eye size={26} color="var(--rose-accent)" /> : <EyeOff size={26} />}
          </div>
        </div>
      </div>

      {/* 5. Cảm Biến Siêu Âm HC-SR04 */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ width: "100%", marginRight: "12px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
              Cự Ly Siêu Âm (HC-SR04)
            </span>
            <div style={{ marginTop: "8px", display: "flex", alignItems: "baseline", gap: "6px" }}>
              <h2 className="font-mono" style={{ fontSize: "1.75rem", fontWeight: 700, color: isDistanceWarning ? "var(--rose-accent)" : "var(--cyan-accent)" }}>
                {distanceCm > 0 ? distanceCm : "--"}
              </h2>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>cm</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                Ngưỡng: &lt;{thresholdCm}cm
              </span>
            </div>
            
            {/* Thanh đo cự ly */}
            <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", marginTop: "10px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(Math.max((distanceCm / 200) * 100, 2), 100)}%`,
                background: isDistanceWarning 
                  ? "var(--rose-accent)" 
                  : "linear-gradient(90deg, var(--cyan-accent), var(--blue-accent))",
                transition: "width 0.3s ease, background 0.3s ease"
              }} />
            </div>
          </div>
          <div style={{
            padding: "10px",
            borderRadius: "10px",
            background: isDistanceWarning ? "rgba(244, 63, 94, 0.15)" : "rgba(6, 182, 212, 0.15)",
            color: isDistanceWarning ? "var(--rose-accent)" : "var(--cyan-accent)"
          }}>
            <Radio size={26} />
          </div>
        </div>
      </div>

      {/* 6. Phần Cứng & Mạng Wi-Fi */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
              Phần Cứng ESP32
            </span>
            <div style={{ marginTop: "8px" }}>
              <div className="font-mono" style={{ fontSize: "1rem", fontWeight: 600 }}>
                IP: {telemetry?.ip || "Chưa có IP"}
              </div>
              <div className="font-mono" style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Sóng: {telemetry?.rssi ? `${telemetry.rssi} dBm` : "-- dBm"}
              </div>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              ID: {telemetry?.deviceId || "esp32_device_01"}
            </p>
          </div>
          <div style={{
            padding: "10px",
            borderRadius: "10px",
            background: "rgba(255, 255, 255, 0.05)",
            color: "var(--text-secondary)"
          }}>
            <Cpu size={26} />
          </div>
        </div>
      </div>
    </div>
  );
};
