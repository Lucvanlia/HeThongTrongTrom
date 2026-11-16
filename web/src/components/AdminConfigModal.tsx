import React, { useState } from "react";
import { X, Save, AlertCircle, CheckCircle2, Loader2, Settings, Clock, ShieldCheck } from "lucide-react";
import { FirebaseClient } from "../lib/firebaseClient";
import { DeviceConfig, ScheduleConfig } from "../types";

interface AdminConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: DeviceConfig;
  currentSchedule: ScheduleConfig;
  userEmail?: string | null;
  onConfigSaved: (newConfig: DeviceConfig) => void;
  onScheduleSaved: (newSchedule: ScheduleConfig) => void;
}

export const AdminConfigModal: React.FC<AdminConfigModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  currentSchedule,
  userEmail,
  onConfigSaved,
  onScheduleSaved
}) => {
  if (!isOpen) return null;

  const [thresholdCm, setThresholdCm] = useState<number>(currentConfig.thresholdCm);
  const [telemetryIntervalMs, setTelemetryIntervalMs] = useState<number>(currentConfig.telemetryIntervalMs);
  
  // Hẹn giờ tự động
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(currentSchedule.enabled);
  const [armTime, setArmTime] = useState<string>(currentSchedule.armTime || "22:00");
  const [disarmTime, setDisarmTime] = useState<string>(currentSchedule.disarmTime || "06:00");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const actor = userEmail || "Quản trị viên";

    try {
      // 1. Cập nhật cấu hình ngưỡng an ninh
      await FirebaseClient.updateConfig(Number(thresholdCm), Number(telemetryIntervalMs), actor);
      onConfigSaved({ thresholdCm: Number(thresholdCm), telemetryIntervalMs: Number(telemetryIntervalMs) });

      // 2. Cập nhật lịch trình tự động ARM / DISARM
      const newSchedule: ScheduleConfig = {
        enabled: scheduleEnabled,
        armTime,
        disarmTime,
        lastUpdated: Date.now()
      };
      await FirebaseClient.updateSchedule(newSchedule, actor);
      onScheduleSaved(newSchedule);

      setMessage({ type: "success", text: "Đã cập nhật cấu hình và lịch trình hẹn giờ thành công!" });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Cập nhật cấu hình thất bại." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "16px"
    }}>
      <div className="glass-panel" style={{
        maxWidth: "520px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "24px",
        background: "#0d1527",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "16px",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Settings size={22} color="var(--cyan-accent)" />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Cấu Hình Hệ Thống & Hẹn Giờ</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div style={{
            padding: "10px 14px",
            borderRadius: "8px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.85rem",
            background: message.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
            color: message.type === "success" ? "var(--emerald-accent)" : "var(--rose-accent)",
            border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`
          }}>
            {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* PHẦN 1: CẤU HÌNH CẢM BIẾN */}
          <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", color: "var(--cyan-accent)" }}>
              <ShieldCheck size={16} />
              <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Thông Số Cảm Biến An Ninh</span>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                Khoảng Cách Ngưỡng Báo Động (cm):
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={thresholdCm}
                onChange={(e) => setThresholdCm(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.95rem"
                }}
                required
              />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Khi hệ thống ARMED, vật thể tiếp cận dưới khoảng cách này sẽ lập tức hú còi và ghi nhận vi phạm.
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                Chu Kỳ Gửi Telemetry (mili-giây):
              </label>
              <input
                type="number"
                min="500"
                max="60000"
                step="500"
                value={telemetryIntervalMs}
                onChange={(e) => setTelemetryIntervalMs(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.95rem"
                }}
                required
              />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Khuyến nghị 1000ms để đảm bảo độ nhạy tức thời khi phát hiện sự cố.
              </p>
            </div>
          </div>

          {/* PHẦN 2: HẸN GIỜ TỰ ĐỘNG ARM / DISARM */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--emerald-accent)" }}>
                <Clock size={16} />
                <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Hẹn Giờ Tự Động Arm / Disarm</span>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "var(--cyan-accent)" }}
                />
                <span style={{ fontWeight: 600 }}>{scheduleEnabled ? "Đang Bật" : "Đang Tắt"}</span>
              </label>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              opacity: scheduleEnabled ? 1 : 0.45,
              pointerEvents: scheduleEnabled ? "auto" : "none",
              transition: "opacity 0.2s"
            }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Bật bảo vệ (ARM) lúc:
                </label>
                <input
                  type="time"
                  value={armTime}
                  onChange={(e) => setArmTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.9rem"
                  }}
                  required={scheduleEnabled}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Tắt bảo vệ (DISARM) lúc:
                </label>
                <input
                  type="time"
                  value={disarmTime}
                  onChange={(e) => setDisarmTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "0.9rem"
                  }}
                  required={scheduleEnabled}
                />
              </div>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
              Ví dụ: Tự động kích hoạt chế độ bảo vệ ban đêm từ 22:00 đến 06:00 sáng hôm sau.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Lưu Cấu Hình</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
