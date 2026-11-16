import React, { useState, useMemo } from "react";
import { AlertItem, AuditLogItem } from "../types";
import { 
  ShieldAlert, 
  Clock, 
  AlertTriangle, 
  Download, 
  Filter, 
  BarChart3, 
  UserCheck, 
  Calendar,
  Lock,
  Unlock,
  Shield,
  ShieldOff,
  VolumeX,
  Sliders,
  CheckCircle2
} from "lucide-react";

interface AlertsListProps {
  alerts: AlertItem[];
  auditLogs: AuditLogItem[];
}

export const AlertsList: React.FC<AlertsListProps> = ({ alerts, auditLogs }) => {
  const [activeTab, setActiveTab] = useState<"alerts" | "audit">("alerts");
  const [filterSensor, setFilterSensor] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showStats, setShowStats] = useState<boolean>(true);

  // 1. Lọc danh sách cảnh báo theo cảm biến & khoảng ngày
  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      // Lọc theo cảm biến
      if (filterSensor !== "ALL") {
        const source = (item.alertSource || "").toUpperCase();
        if (filterSensor === "PIR+SONAR" && !source.includes("+")) return false;
        if (filterSensor === "PIR" && source !== "PIR") return false;
        if (filterSensor === "SONAR" && source !== "SONAR") return false;
      }

      // Lọc theo ngày
      const itemDate = new Date(item.timestamp);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }

      return true;
    });
  }, [alerts, filterSensor, startDate, endDate]);

  // 2. Tính toán thống kê theo khung giờ (0h - 23h) & Khung giờ cao điểm
  const { hourCounts, peakHour, peakCount, sensorStats } = useMemo(() => {
    const counts = new Array(24).fill(0);
    const stats = { pir: 0, sonar: 0, combo: 0 };

    alerts.forEach((a) => {
      const h = new Date(a.timestamp).getHours();
      counts[h]++;

      const s = (a.alertSource || "").toUpperCase();
      if (s.includes("+")) stats.combo++;
      else if (s === "PIR") stats.pir++;
      else if (s === "SONAR") stats.sonar++;
    });

    let maxH = 0;
    let maxC = 0;
    counts.forEach((c, h) => {
      if (c > maxC) {
        maxC = c;
        maxH = h;
      }
    });

    return {
      hourCounts: counts,
      peakHour: maxH,
      peakCount: maxC,
      sensorStats: stats
    };
  }, [alerts]);

  // 3. Xuất file CSV (Hỗ trợ chuẩn tiếng Việt UTF-8 BOM cho Excel)
  const handleExportCSV = () => {
    if (filteredAlerts.length === 0) return;

    const headers = ["Mã sự cố", "Thời gian (UTC+7)", "Loại cảm biến", "Cự ly (cm)", "Chốt cửa", "Thiết bị"];
    const rows = filteredAlerts.map((a) => [
      `"${a.id}"`,
      `"${new Date(a.timestamp).toLocaleString("vi-VN")}"`,
      `"${a.alertSource || "ĐỘT NHẬP"}"`,
      a.distanceCm,
      a.doorLocked ? "Đã khóa" : "Mở",
      `"${a.deviceId}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    link.href = url;
    link.setAttribute("download", `nhat_ky_dot_nhap_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const maxBarValue = Math.max(...hourCounts, 1);

  return (
    <div className="glass-panel" style={{ padding: "20px" }}>
      {/* Tab Switcher & Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "6px", background: "rgba(0, 0, 0, 0.3)", padding: "3px", borderRadius: "8px" }}>
          <button
            onClick={() => setActiveTab("alerts")}
            style={{
              padding: "6px 14px",
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              background: activeTab === "alerts" ? "var(--rose-accent)" : "transparent",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <ShieldAlert size={14} />
            <span>Sự Cố Đột Nhập ({alerts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            style={{
              padding: "6px 14px",
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              background: activeTab === "audit" ? "var(--cyan-accent)" : "transparent",
              color: activeTab === "audit" ? "#090d16" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <UserCheck size={14} />
            <span>Nhật Ký Thao Tác ({auditLogs.length})</span>
          </button>
        </div>

        {activeTab === "alerts" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setShowStats(!showStats)}
              className="btn btn-outline"
              style={{ padding: "5px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "5px" }}
              title="Bật/Tắt khung phân tích thống kê"
            >
              <BarChart3 size={13} color="var(--cyan-accent)" />
              <span>{showStats ? "Ẩn Thống Kê" : "Xem Thống Kê"}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredAlerts.length === 0}
              className="btn btn-outline"
              style={{ padding: "5px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "5px" }}
              title="Xuất file CSV báo cáo cho Excel"
            >
              <Download size={13} color="var(--emerald-accent)" />
              <span>Xuất CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SỰ CỐ ĐỘT NHẬP & PHÂN TÍCH THỐNG KÊ                     */}
      {/* ============================================================== */}
      {activeTab === "alerts" && (
        <>
          {/* KHỐI PHÂN TÍCH THỐNG KÊ (ANALYTICS) */}
          {showStats && alerts.length > 0 && (
            <div style={{
              padding: "14px",
              background: "rgba(0, 0, 0, 0.25)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              marginBottom: "16px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Phân Bố Sự Cố Theo 24 Khung Giờ (00:00 - 23:00)
                </span>
                {peakCount > 0 && (
                  <span className="badge badge-amber" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
                    Khung giờ cao điểm: <strong>{peakHour.toString().padStart(2, "0")}:00 - {(peakHour + 1).toString().padStart(2, "0")}:00</strong> ({peakCount} vụ)
                  </span>
                )}
              </div>

              {/* Biểu đồ cột SVG phân bố 24 giờ */}
              <div style={{ width: "100%", height: "54px", display: "flex", alignItems: "flex-end", gap: "3px", padding: "4px 0" }}>
                {hourCounts.map((count, hour) => {
                  const barHeight = count > 0 ? Math.max((count / maxBarValue) * 44, 4) : 2;
                  const isPeak = hour === peakHour && count > 0;
                  return (
                    <div
                      key={hour}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        height: "100%",
                        justifyContent: "flex-end"
                      }}
                      title={`Khung ${hour}h: ${count} vụ đột nhập`}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: `${barHeight}px`,
                          borderRadius: "2px",
                          background: isPeak 
                            ? "var(--rose-accent)" 
                            : count > 0 ? "rgba(56, 189, 248, 0.7)" : "rgba(255, 255, 255, 0.1)",
                          transition: "height 0.3s"
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>

              {/* Tóm tắt cảm biến */}
              <div style={{ display: "flex", gap: "12px", marginTop: "10px", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                <span>PIR: <strong style={{ color: "#ffffff" }}>{sensorStats.pir}</strong></span>
                <span>•</span>
                <span>Sonar: <strong style={{ color: "#ffffff" }}>{sensorStats.sonar}</strong></span>
                <span>•</span>
                <span>PIR+Sonar: <strong style={{ color: "var(--rose-accent)" }}>{sensorStats.combo}</strong></span>
              </div>
            </div>
          )}

          {/* BỘ LỌC TÌM KIẾM (FILTER BAR) */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
            padding: "10px 12px",
            background: "rgba(0, 0, 0, 0.15)",
            borderRadius: "8px",
            marginBottom: "14px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={13} color="var(--cyan-accent)" />
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Lọc:</span>
            </div>

            {/* Dropdown loại cảm biến */}
            <select
              value={filterSensor}
              onChange={(e) => setFilterSensor(e.target.value)}
              style={{
                padding: "4px 8px",
                fontSize: "0.75rem",
                borderRadius: "6px",
                background: "rgba(0, 0, 0, 0.4)",
                color: "#ffffff",
                border: "1px solid var(--border-color)",
                cursor: "pointer"
              }}
            >
              <option value="ALL">Tất cả cảm biến</option>
              <option value="PIR">Chỉ PIR</option>
              <option value="SONAR">Chỉ Sonar</option>
              <option value="PIR+SONAR">PIR + Sonar (Kết hợp)</option>
            </select>

            {/* Bộ chọn khoảng ngày */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <Calendar size={12} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: "3px 6px",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  background: "rgba(0, 0, 0, 0.4)",
                  color: "#ffffff",
                  border: "1px solid var(--border-color)"
                }}
              />
              <span>-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: "3px 6px",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  background: "rgba(0, 0, 0, 0.4)",
                  color: "#ffffff",
                  border: "1px solid var(--border-color)"
                }}
              />
            </div>

            {(filterSensor !== "ALL" || startDate || endDate) && (
              <button
                onClick={() => { setFilterSensor("ALL"); setStartDate(""); setEndDate(""); }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--rose-accent)",
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "2px 4px"
                }}
              >
                Đặt lại
              </button>
            )}

            <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Khớp {filteredAlerts.length} / {alerts.length} sự cố
            </span>
          </div>

          {/* DANH SÁCH BẢN GHI SỰ CỐ */}
          {filteredAlerts.length === 0 ? (
            <div style={{
              padding: "36px 16px",
              textAlign: "center",
              color: "var(--text-muted)",
              background: "rgba(0, 0, 0, 0.15)",
              borderRadius: "8px"
            }}>
              <AlertTriangle size={30} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
              <p style={{ fontSize: "0.85rem" }}>Không tìm thấy sự cố đột nhập nào phù hợp.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>
              {filteredAlerts.map((alert) => (
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
        </>
      )}

      {/* ============================================================== */}
      {/* TAB 2: NHẬT KÝ THAO TÁC NGƯỜI DÙNG (AUDIT LOGS)                */}
      {/* ============================================================== */}
      {activeTab === "audit" && (
        <div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "12px" }}>
            Lưu vết toàn bộ hành động điều khiển an ninh, đóng/mở chốt cửa và cấu hình ngưỡng của Quản trị viên.
          </p>

          {auditLogs.length === 0 ? (
            <div style={{
              padding: "36px 16px",
              textAlign: "center",
              color: "var(--text-muted)",
              background: "rgba(0, 0, 0, 0.15)",
              borderRadius: "8px"
            }}>
              <CheckCircle2 size={30} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
              <p style={{ fontSize: "0.85rem" }}>Chưa có thao tác điều khiển nào được ghi nhận.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
              {auditLogs.map((log) => {
                let badgeClass = "badge-slate";
                let IconComponent = Sliders;

                if (log.action === "ARM") {
                  badgeClass = "badge-green";
                  IconComponent = Shield;
                } else if (log.action === "DISARM") {
                  badgeClass = "badge-amber";
                  IconComponent = ShieldOff;
                } else if (log.action === "LOCK_DOOR") {
                  badgeClass = "badge-cyan";
                  IconComponent = Lock;
                } else if (log.action === "UNLOCK_DOOR") {
                  badgeClass = "badge-blue";
                  IconComponent = Unlock;
                } else if (log.action === "SILENCE_ALARM") {
                  badgeClass = "badge-red";
                  IconComponent = VolumeX;
                }

                return (
                  <div
                    key={log.id}
                    style={{
                      padding: "10px 14px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-color)",
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
                        <span className={`badge ${badgeClass}`} style={{ fontSize: "0.65rem", padding: "2px 6px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <IconComponent size={11} />
                          <span>{log.action}</span>
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 500 }}>
                          {log.detail}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                        <Clock size={11} />
                        <span>{new Date(log.timestamp).toLocaleString("vi-VN")}</span>
                        <span>•</span>
                        <span>Bởi: <strong>{log.userEmail}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
