import React, { useState } from "react";
import { X, Save, AlertCircle, CheckCircle2, Loader2, Settings } from "lucide-react";
import { AzureClient } from "../lib/azureClient";
import { DeviceConfig } from "../types";

interface AdminConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: DeviceConfig;
  onConfigSaved: (newConfig: DeviceConfig) => void;
}

export const AdminConfigModal: React.FC<AdminConfigModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onConfigSaved
}) => {
  if (!isOpen) return null;

  const [thresholdCm, setThresholdCm] = useState<number>(currentConfig.thresholdCm);
  const [telemetryIntervalMs, setTelemetryIntervalMs] = useState<number>(currentConfig.telemetryIntervalMs);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const res = await AzureClient.updateAdminConfig({
      thresholdCm: Number(thresholdCm),
      telemetryIntervalMs: Number(telemetryIntervalMs)
    });

    setIsSaving(false);
    if (res.success) {
      setMessage({ type: "success", text: "Đã cập nhật Device Twin thành công! ESP32 sẽ tự động nhận qua MQTT." });
      onConfigSaved({ thresholdCm: Number(thresholdCm), telemetryIntervalMs: Number(telemetryIntervalMs) });
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setMessage({ type: "error", text: res.message || "Cập nhật cấu hình thất bại." });
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
        maxWidth: "500px",
        width: "100%",
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
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Cấu Hình Device Twin (Admin)</h3>
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
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
              Khoảng Cách Ngưỡng Báo Động (cm):
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={thresholdCm}
              onChange={(e) => setThresholdCm(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.95rem"
              }}
              required
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Khi hệ thống ARMED, vật thể lại gần dưới khoảng cách này sẽ lập tức hú còi & gửi email.
            </p>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
              Chu Kỳ Gửi Telemetry (mili-giây):
            </label>
            <input
              type="number"
              min="5000"
              max="60000"
              step="1000"
              value={telemetryIntervalMs}
              onChange={(e) => setTelemetryIntervalMs(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "0.95rem"
              }}
              required
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Khuyến nghị 15000ms (15s) để tối ưu hạn mức 8.000 tin nhắn/ngày của Azure IoT Hub F1.
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

