import React from "react";
import { AlertItem } from "../types";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";

interface AlertsListProps {
  alerts: AlertItem[];
}

export const AlertsList: React.FC<AlertsListProps> = ({ alerts }) => {
  return (
    <div className="glass-panel" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldAlert size={18} color="var(--rose-accent)" />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Nhật Ký Cảnh Báo Đột Nhập</h3>
        </div>
        <span className="badge badge-red" style={{ fontSize: "0.7rem" }}>
          {alerts.length} Sự Cố
        </span>
      </div>

      {alerts.length === 0 ? (
        <div style={{
          padding: "36px 16px",
          textAlign: "center",
          color: "var(--text-muted)",
          background: "rgba(0, 0, 0, 0.15)",
          borderRadius: "8px"
        }}>
          <AlertTriangle size={32} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
          <p style={{ fontSize: "0.85rem" }}>Chưa ghi nhận sự cố đột nhập nào.</p>
          <p style={{ fontSize: "0.75rem", marginTop: "4px" }}>Hệ thống đang bảo vệ an toàn 24/7.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: "12px 14px",
                background: "rgba(244, 63, 94, 0.05)",
                border: "1px solid rgba(244, 63, 94, 0.2)",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="badge badge-red" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                    {alert.alertSource || "ĐỘT NHẬP"}
                  </span>
                  <span className="font-mono" style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 600 }}>
                    Cự ly: {alert.distanceCm} cm
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  <Clock size={12} />
                  <span>{new Date(alert.timestamp).toLocaleString("vi-VN")}</span>
                  <span>•</span>
                  <span>Chốt cửa: {alert.doorLocked ? "Đã khóa" : "Mở"}</span>
                </div>
              </div>

              <div className="badge badge-slate" style={{ fontSize: "0.65rem" }}>
                {alert.deviceId}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

