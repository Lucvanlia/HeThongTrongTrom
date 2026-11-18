import React, { useState, useMemo, useEffect } from "react";
import { AlertItem, AuditLogItem, DailyStatsMap, DailyStatNode } from "../types";
import { FirebaseClient } from "../lib/firebaseClient";
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
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Printer,
  Trash2,
  Activity,
  Layers,
  ArrowUpDown,
  Eye,
  Info
} from "lucide-react";

interface AlertsListProps {
  alerts: AlertItem[];
  auditLogs: AuditLogItem[];
  userEmail?: string | null;
}

// Hàm tiện ích xử lý ngày UTC chuẩn YYYY-MM-DD
function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const newY = date.getUTCFullYear();
  const newM = String(date.getUTCMonth() + 1).padStart(2, "0");
  const newD = String(date.getUTCDate()).padStart(2, "0");
  return `${newY}-${newM}-${newD}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getDaysList(start: string, end: string): string[] {
  const arr: string[] = [];
  let curr = start;
  // Giới hạn an toàn tối đa 90 ngày
  let count = 0;
  while (curr <= end && count < 90) {
    arr.push(curr);
    curr = addDaysToDateStr(curr, 1);
    count++;
  }
  return arr;
}

export const AlertsList: React.FC<AlertsListProps> = ({ alerts, auditLogs, userEmail }) => {
  const [activeTab, setActiveTab] = useState<"alerts" | "daily_reports" | "audit">("alerts");

  // ==============================================================
  // TAB 1: SỰ CỐ ĐỘT NHẬP & BỘ LỌC CŨ (ĐÃ FIX LỖI VALIDATE DATE)
  // ==============================================================
  const [filterSensor, setFilterSensor] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showStats, setShowStats] = useState<boolean>(true);

  // Chuẩn hóa khoảng ngày để không bao giờ bị lỗi startDate > endDate
  const effectiveFilterStart = useMemo(() => {
    if (startDate && endDate && startDate > endDate) return endDate;
    return startDate;
  }, [startDate, endDate]);

  const effectiveFilterEnd = useMemo(() => {
    if (startDate && endDate && startDate > endDate) return startDate;
    return endDate;
  }, [startDate, endDate]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      if (filterSensor !== "ALL") {
        const source = (item.alertSource || "").toUpperCase();
        if (filterSensor === "PIR+SONAR" && !source.includes("+")) return false;
        if (filterSensor === "PIR" && source !== "PIR") return false;
        if (filterSensor === "SONAR" && source !== "SONAR") return false;
      }

      const itemDate = new Date(item.timestamp);
      if (effectiveFilterStart) {
        const start = new Date(effectiveFilterStart);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }
      if (effectiveFilterEnd) {
        const end = new Date(effectiveFilterEnd);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }

      return true;
    });
  }, [alerts, filterSensor, effectiveFilterStart, effectiveFilterEnd]);

  // Thống kê phân bố 24 giờ cho Tab 1
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

  // ==============================================================
  // TAB 2: BÁO CÁO THEO NGÀY (DAILY TRAFFIC REPORT & HEATMAP)
  // ==============================================================
  const todayStr = useMemo(() => getTodayDateStr(), []);
  const [reportStart, setReportStart] = useState<string>(() => addDaysToDateStr(getTodayDateStr(), -6));
  const [reportEnd, setReportEnd] = useState<string>(() => getTodayDateStr());
  const [activePreset, setActivePreset] = useState<"today" | "7d" | "30d" | "month" | "custom">("7d");
  const [dailyStats, setDailyStats] = useState<DailyStatsMap>({});
  const [prevStats, setPrevStats] = useState<DailyStatsMap>({});
  const [loadingDaily, setLoadingDaily] = useState<boolean>(true);
  const [sortField, setSortField] = useState<"date" | "total" | "passby" | "alert">("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredHeatCell, setHoveredHeatCell] = useState<{ date: string; hour: number; passby: number; alert: number } | null>(null);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);

  // Chuẩn hóa khoảng ngày Báo Cáo
  const effectiveReportStart = useMemo(() => {
    if (reportStart && reportEnd && reportStart > reportEnd) return reportEnd;
    return reportStart;
  }, [reportStart, reportEnd]);

  const effectiveReportEnd = useMemo(() => {
    if (reportStart && reportEnd && reportStart > reportEnd) return reportStart;
    return reportEnd;
  }, [reportStart, reportEnd]);

  // Áp dụng Preset ngày nhanh
  const handleApplyPreset = (preset: "today" | "7d" | "30d" | "month") => {
    setActivePreset(preset);
    const today = getTodayDateStr();
    if (preset === "today") {
      setReportStart(today);
      setReportEnd(today);
    } else if (preset === "7d") {
      setReportStart(addDaysToDateStr(today, -6));
      setReportEnd(today);
    } else if (preset === "30d") {
      setReportStart(addDaysToDateStr(today, -29));
      setReportEnd(today);
    } else if (preset === "month") {
      const parts = today.split("-");
      setReportStart(`${parts[0]}-${parts[1]}-01`);
      setReportEnd(today);
    }
  };

  // Lắng nghe dữ liệu khoảng ngày hiện tại (chỉ tải đúng các node bằng orderByKey().startAt().endAt())
  useEffect(() => {
    setLoadingDaily(true);
    const unsub = FirebaseClient.subscribeDailyStatsRange(
      effectiveReportStart,
      effectiveReportEnd,
      (data) => {
        setDailyStats(data);
        setLoadingDaily(false);
      }
    );

    // Tính toán kỳ trước để so sánh %
    const daysList = getDaysList(effectiveReportStart, effectiveReportEnd);
    const n = Math.max(daysList.length, 1);
    const prevStart = addDaysToDateStr(effectiveReportStart, -n);
    const prevEnd = addDaysToDateStr(effectiveReportStart, -1);

    const unsubPrev = FirebaseClient.subscribeDailyStatsRange(prevStart, prevEnd, (pData) => {
      setPrevStats(pData);
    });

    return () => {
      unsub();
      unsubPrev();
    };
  }, [effectiveReportStart, effectiveReportEnd]);

  // Danh sách các ngày trong khoảng
  const reportDays = useMemo(() => {
    return getDaysList(effectiveReportStart, effectiveReportEnd);
  }, [effectiveReportStart, effectiveReportEnd]);

  // Tổng hợp chỉ số KPI Báo Cáo
  const dailyReportMetrics = useMemo(() => {
    let totalPassby = 0;
    let totalAlert = 0;
    let peakDay = "";
    let peakDayCount = 0;
    const hourTraffic = new Array(24).fill(0);

    const dayRows = reportDays.map((d) => {
      const item: DailyStatNode | undefined = dailyStats[d];
      const p = item?.total?.passby || 0;
      const a = item?.total?.alert || 0;
      const t = p + a;
      const pir = item?.total?.pir || 0;
      const sonar = item?.total?.sonar || 0;
      const both = item?.total?.both || 0;

      totalPassby += p;
      totalAlert += a;

      if (t > peakDayCount) {
        peakDayCount = t;
        peakDay = d;
      }

      // Tổng hợp theo giờ trong ngày
      let dayPeakHour = -1;
      let dayPeakHourCount = 0;
      if (item?.hours) {
        for (let h = 0; h < 24; h++) {
          const hk = String(h).padStart(2, "0");
          const hTraffic = (item.hours[hk]?.passby || 0) + (item.hours[hk]?.alert || 0);
          hourTraffic[h] += hTraffic;
          if (hTraffic > dayPeakHourCount) {
            dayPeakHourCount = hTraffic;
            dayPeakHour = h;
          }
        }
      }

      return {
        date: d,
        total: t,
        passby: p,
        alert: a,
        pir,
        sonar,
        both,
        peakHour: dayPeakHour,
        peakHourCount: dayPeakHourCount,
        alertRate: t > 0 ? Math.round((a / t) * 100) : 0
      };
    });

    const grandTotal = totalPassby + totalAlert;
    const avgDaily = reportDays.length > 0 ? (grandTotal / reportDays.length).toFixed(1) : "0";

    // Khung giờ cao điểm toàn kỳ
    let peakHourPeriod = 0;
    let peakHourTrafficPeriod = 0;
    hourTraffic.forEach((c, h) => {
      if (c > peakHourTrafficPeriod) {
        peakHourTrafficPeriod = c;
        peakHourPeriod = h;
      }
    });

    // Tính kỳ trước để so sánh
    let prevTotal = 0;
    Object.values(prevStats).forEach((pNode) => {
      prevTotal += (pNode.total?.passby || 0) + (pNode.total?.alert || 0);
    });

    let diffPercent = 0;
    if (prevTotal > 0) {
      diffPercent = Math.round(((grandTotal - prevTotal) / prevTotal) * 100);
    } else if (grandTotal > 0) {
      diffPercent = 100;
    }

    return {
      grandTotal,
      totalPassby,
      totalAlert,
      avgDaily,
      peakDay,
      peakDayCount,
      peakHourPeriod,
      peakHourTrafficPeriod,
      prevTotal,
      diffPercent,
      dayRows
    };
  }, [reportDays, dailyStats, prevStats]);

  // Sắp xếp bảng chi tiết
  const sortedDayRows = useMemo(() => {
    return [...dailyReportMetrics.dayRows].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [dailyReportMetrics.dayRows, sortField, sortAsc]);

  const handleSort = (field: "date" | "total" | "passby" | "alert") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Xuất file CSV Báo Cáo Ngày
  const handleExportDailyReportCSV = () => {
    if (dailyReportMetrics.dayRows.length === 0) return;

    const headers = [
      "Ngày (YYYY-MM-DD)",
      "Tổng lượt phát hiện",
      "Người đi ngang (Passby)",
      "Cảnh báo đột nhập (Alert)",
      "Tỷ lệ cảnh báo (%)",
      "Cảm biến PIR",
      "Cảm biến Sonar",
      "Cả hai (PIR+Sonar)",
      "Khung giờ cao điểm",
      "Lượt giờ cao điểm"
    ];

    const rows = dailyReportMetrics.dayRows.map((r) => [
      `"${r.date}"`,
      r.total,
      r.passby,
      r.alert,
      `${r.alertRate}%`,
      r.pir,
      r.sonar,
      r.both,
      r.peakHour >= 0 ? `"${String(r.peakHour).padStart(2, "0")}:00 - ${String(r.peakHour + 1).padStart(2, "0")}:00"` : `"Không có"`,
      r.peakHourCount
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bao_cao_ngay_${effectiveReportStart}_den_${effectiveReportEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // In / Xuất PDF
  const handlePrintPDF = () => {
    window.print();
  };

  // Dọn dẹp log chi tiết cũ hơn 30 ngày (giữ lại stats/daily)
  const handlePurgeOldLogs = async () => {
    const confirmed = window.confirm(
      "XÁC NHẬN DỌN DẸP DỮ LIỆU:\n\nBạn có chắc chắn muốn xóa các bản ghi sự cố chi tiết cũ hơn 30 ngày trong /security/alerts để tối ưu bộ nhớ?\n\nLưu ý: Dữ liệu báo cáo thống kê theo ngày (stats/daily) và nhật ký thao tác sẽ được BẢO TỒN HOÀN TOÀN."
    );
    if (!confirmed) return;

    setIsPurging(true);
    setPurgeFeedback(null);
    try {
      const count = await FirebaseClient.purgeOldAlerts(30, userEmail || undefined);
      setPurgeFeedback(`Đã dọn dẹp thành công ${count} bản ghi sự cố cũ (>30 ngày).`);
      setTimeout(() => setPurgeFeedback(null), 6000);
    } catch (err: any) {
      setPurgeFeedback(`Lỗi khi dọn dẹp: ${err?.message || "Không xác định"}`);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="glass-panel print-report-container" style={{ padding: "20px" }}>
      {/* Tab Switcher & Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "6px", background: "rgba(0, 0, 0, 0.3)", padding: "3px", borderRadius: "8px", flexWrap: "wrap" }}>
          {/* TAB 1 */}
          <button
            onClick={() => setActiveTab("alerts")}
            style={{
              padding: "6px 12px",
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

          {/* TAB 2: MỚI - BÁO CÁO THEO NGÀY */}
          <button
            onClick={() => setActiveTab("daily_reports")}
            style={{
              padding: "6px 12px",
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              background: activeTab === "daily_reports" ? "var(--amber-accent)" : "transparent",
              color: activeTab === "daily_reports" ? "#090d16" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
          >
            <Activity size={14} />
            <span>Báo Cáo Theo Ngày</span>
          </button>

          {/* TAB 3 */}
          <button
            onClick={() => setActiveTab("audit")}
            style={{
              padding: "6px 12px",
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

        {/* Nút hành động phụ cho từng Tab */}
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

        {activeTab === "daily_reports" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={handleExportDailyReportCSV}
              disabled={dailyReportMetrics.dayRows.length === 0}
              className="btn btn-outline"
              style={{ padding: "5px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "5px" }}
              title="Xuất file CSV tổng hợp ngày cho Excel"
            >
              <Download size={13} color="var(--emerald-accent)" />
              <span>Xuất CSV</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="btn btn-outline"
              style={{ padding: "5px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "5px" }}
              title="In hoặc lưu file PDF báo cáo"
            >
              <Printer size={13} color="var(--cyan-accent)" />
              <span>In / PDF</span>
            </button>

            <button
              onClick={handlePurgeOldLogs}
              disabled={isPurging}
              className="btn btn-outline"
              style={{
                padding: "5px 10px",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                borderColor: "rgba(244, 63, 94, 0.4)",
                color: "var(--rose-accent)"
              }}
              title="Dọn dẹp các log chi tiết cũ hơn 30 ngày (giữ lại báo cáo ngày)"
            >
              <Trash2 size={13} />
              <span>{isPurging ? "Đang dọn..." : "Dọn Log Cũ"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Thông báo kết quả dọn dẹp nếu có */}
      {purgeFeedback && (
        <div style={{
          padding: "8px 12px",
          background: "rgba(16, 185, 129, 0.15)",
          border: "1px solid rgba(16, 185, 129, 0.4)",
          borderRadius: "6px",
          fontSize: "0.75rem",
          color: "var(--emerald-accent)",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}>
          <CheckCircle2 size={14} />
          <span>{purgeFeedback}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: SỰ CỐ ĐỘT NHẬP (CHI TIẾT 100 SỰ CỐ & PHÂN BỐ 24H)       */}
      {/* ============================================================== */}
      {activeTab === "alerts" && (
        <>
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

              <div style={{ display: "flex", gap: "12px", marginTop: "10px", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                <span>PIR: <strong style={{ color: "#ffffff" }}>{sensorStats.pir}</strong></span>
                <span>•</span>
                <span>Sonar: <strong style={{ color: "#ffffff" }}>{sensorStats.sonar}</strong></span>
                <span>•</span>
                <span>PIR+Sonar: <strong style={{ color: "var(--rose-accent)" }}>{sensorStats.combo}</strong></span>
              </div>
            </div>
          )}

          {/* BỘ LỌC TÌM KIẾM ĐÃ ĐƯỢC CHUẨN HÓA VÀ FIX LỖI VALIDATE NGÀY */}
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

            {/* Input ngày với auto-adjust để không bị đảo ngày */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <Calendar size={12} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(val);
                  if (endDate && val > endDate) {
                    setEndDate(val);
                  }
                }}
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
                onChange={(e) => {
                  const val = e.target.value;
                  setEndDate(val);
                  if (startDate && val < startDate) {
                    setStartDate(val);
                  }
                }}
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
      {/* TAB 2: BÁO CÁO THEO NGÀY (LƯU LƯỢNG CHUYỂN ĐỘNG & HEATMAP)       */}
      {/* ============================================================== */}
      {activeTab === "daily_reports" && (
        <div>
          {/* THANH BỘ CHỌN KHOẢNG NGÀY & PRESETS */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
            padding: "12px 14px",
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "10px",
            marginBottom: "16px",
            border: "1px solid rgba(255, 255, 255, 0.06)"
          }}>
            {/* Presets */}
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              <button
                onClick={() => handleApplyPreset("today")}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.72rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                  background: activePreset === "today" ? "rgba(245, 158, 11, 0.2)" : "rgba(0, 0, 0, 0.3)",
                  color: activePreset === "today" ? "var(--amber-accent)" : "var(--text-muted)",
                  fontWeight: activePreset === "today" ? 700 : 500
                }}
              >
                Hôm nay
              </button>
              <button
                onClick={() => handleApplyPreset("7d")}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.72rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                  background: activePreset === "7d" ? "rgba(245, 158, 11, 0.2)" : "rgba(0, 0, 0, 0.3)",
                  color: activePreset === "7d" ? "var(--amber-accent)" : "var(--text-muted)",
                  fontWeight: activePreset === "7d" ? 700 : 500
                }}
              >
                7 ngày
              </button>
              <button
                onClick={() => handleApplyPreset("30d")}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.72rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                  background: activePreset === "30d" ? "rgba(245, 158, 11, 0.2)" : "rgba(0, 0, 0, 0.3)",
                  color: activePreset === "30d" ? "var(--amber-accent)" : "var(--text-muted)",
                  fontWeight: activePreset === "30d" ? 700 : 500
                }}
              >
                30 ngày
              </button>
              <button
                onClick={() => handleApplyPreset("month")}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.72rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                  background: activePreset === "month" ? "rgba(245, 158, 11, 0.2)" : "rgba(0, 0, 0, 0.3)",
                  color: activePreset === "month" ? "var(--amber-accent)" : "var(--text-muted)",
                  fontWeight: activePreset === "month" ? 700 : 500
                }}
              >
                Tháng này
              </button>
            </div>

            {/* Date Pickers with auto-validation */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "auto" }}>
              <Calendar size={13} color="var(--amber-accent)" />
              <span>Từ:</span>
              <input
                type="date"
                value={reportStart}
                onChange={(e) => {
                  const val = e.target.value;
                  setReportStart(val);
                  setActivePreset("custom");
                  if (reportEnd && val > reportEnd) {
                    setReportEnd(val);
                  }
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  background: "rgba(0, 0, 0, 0.5)",
                  color: "#ffffff",
                  border: "1px solid var(--border-color)"
                }}
              />
              <span>Đến:</span>
              <input
                type="date"
                value={reportEnd}
                onChange={(e) => {
                  const val = e.target.value;
                  setReportEnd(val);
                  setActivePreset("custom");
                  if (reportStart && val < reportStart) {
                    setReportStart(val);
                  }
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  background: "rgba(0, 0, 0, 0.5)",
                  color: "#ffffff",
                  border: "1px solid var(--border-color)"
                }}
              />
            </div>
          </div>

          {/* 1. THẺ TỔNG QUAN (KPI CARDS - 6 CHỈ SỐ) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "10px",
            marginBottom: "18px"
          }}>
            {/* KPI 1: Tổng phát hiện */}
            <div style={{ padding: "12px", background: "rgba(0, 0, 0, 0.25)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Eye size={12} color="var(--cyan-accent)" />
                <span>Tổng Phát Hiện</span>
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ffffff", marginTop: "4px" }}>
                {dailyReportMetrics.grandTotal.toLocaleString("vi-VN")}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Đi ngang: <strong>{dailyReportMetrics.totalPassby}</strong>
              </div>
            </div>

            {/* KPI 2: Tổng cảnh báo */}
            <div style={{ padding: "12px", background: "rgba(0, 0, 0, 0.25)", borderRadius: "8px", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--rose-accent)", display: "flex", alignItems: "center", gap: "4px" }}>
                <ShieldAlert size={12} />
                <span>Tổng Cảnh Báo</span>
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--rose-accent)", marginTop: "4px" }}>
                {dailyReportMetrics.totalAlert.toLocaleString("vi-VN")}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Sự cố đột nhập
              </div>
            </div>

            {/* KPI 3: Trung bình / ngày */}
            <div style={{ padding: "12px", background: "rgba(0, 0, 0, 0.25)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Activity size={12} color="var(--emerald-accent)" />
                <span>Trung Bình / Ngày</span>
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--emerald-accent)", marginTop: "4px" }}>
                {dailyReportMetrics.avgDaily}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Lượt / ngày ({reportDays.length} ngày)
              </div>
            </div>

            {/* KPI 4: Ngày cao nhất */}
            <div style={{ padding: "12px", background: "rgba(0, 0, 0, 0.25)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Calendar size={12} color="var(--amber-accent)" />
                <span>Ngày Cao Nhất</span>
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--amber-accent)", marginTop: "6px" }}>
                {dailyReportMetrics.peakDay ? formatDateDisplay(dailyReportMetrics.peakDay) : "Chưa có"}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Đỉnh: <strong>{dailyReportMetrics.peakDayCount}</strong> lượt
              </div>
            </div>

            {/* KPI 5: Khung giờ cao điểm */}
            <div style={{ padding: "12px", background: "rgba(0, 0, 0, 0.25)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={12} color="var(--cyan-accent)" />
                <span>Giờ Cao Điểm</span>
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff", marginTop: "6px" }}>
                {dailyReportMetrics.peakHourTrafficPeriod > 0
                  ? `${String(dailyReportMetrics.peakHourPeriod).padStart(2, "0")}:00 - ${String(dailyReportMetrics.peakHourPeriod + 1).padStart(2, "0")}:00`
                  : "Chưa có"}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Lưu lượng: <strong>{dailyReportMetrics.peakHourTrafficPeriod}</strong> lượt
              </div>
            </div>

            {/* KPI 6: So sánh với kỳ trước */}
            <div style={{ padding: "12px", background: "rgba(0, 0, 0, 0.25)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                {dailyReportMetrics.diffPercent >= 0 ? (
                  <TrendingUp size={12} color="var(--rose-accent)" />
                ) : (
                  <TrendingDown size={12} color="var(--emerald-accent)" />
                )}
                <span>So Với Kỳ Trước</span>
              </div>
              <div style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: dailyReportMetrics.diffPercent > 0 ? "var(--rose-accent)" : dailyReportMetrics.diffPercent < 0 ? "var(--emerald-accent)" : "var(--text-muted)",
                marginTop: "4px"
              }}>
                {dailyReportMetrics.diffPercent > 0 ? `+${dailyReportMetrics.diffPercent}%` : `${dailyReportMetrics.diffPercent}%`}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Kỳ trước: <strong>{dailyReportMetrics.prevTotal}</strong> lượt
              </div>
            </div>
          </div>

          {loadingDaily ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ margin: "0 auto 10px auto" }} />
              <p style={{ fontSize: "0.8rem" }}>Đang tải báo cáo tổng hợp theo ngày...</p>
            </div>
          ) : dailyReportMetrics.grandTotal === 0 ? (
            <div style={{
              padding: "36px 16px",
              textAlign: "center",
              color: "var(--text-muted)",
              background: "rgba(0, 0, 0, 0.15)",
              borderRadius: "8px",
              marginBottom: "16px"
            }}>
              <Info size={30} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
              <p style={{ fontSize: "0.85rem" }}>Chưa có dữ liệu lưu lượng trong khoảng ngày đã chọn.</p>
              <p style={{ fontSize: "0.72rem", marginTop: "4px", opacity: 0.7 }}>
                Hãy thử chọn khoảng "7 ngày" hoặc "30 ngày" để xem dữ liệu lịch sử.
              </p>
            </div>
          ) : (
            <>
              {/* 2. BIỂU ĐỒ CỘT PHÂN TÁCH & ĐƯỜNG XU HƯỚNG THEO NGÀY (ZERO-JITTER SVG) */}
              <div style={{
                padding: "16px",
                background: "rgba(0, 0, 0, 0.25)",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <BarChart3 size={14} color="var(--amber-accent)" />
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                      Biểu Đồ Lưu Lượng & Đường Xu Hướng Theo Ngày
                    </span>
                  </div>

                  {/* Chú thích màu */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--cyan-accent)" }} />
                      <span>Đi ngang ({dailyReportMetrics.totalPassby})</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--rose-accent)" }} />
                      <span>Cảnh báo ({dailyReportMetrics.totalAlert})</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: "14px", height: "2px", background: "#f59e0b" }} />
                      <span>Đường xu hướng</span>
                    </div>
                  </div>
                </div>

                {/* Khung cố định cho Banner Tooltip Hover (Chống giật chuột CLS = 0) */}
                <div style={{
                  minHeight: "26px",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                  padding: "2px 8px",
                  background: hoveredBarIndex !== null ? "rgba(255, 255, 255, 0.05)" : "transparent",
                  borderRadius: "4px"
                }}>
                  {hoveredBarIndex !== null && dailyReportMetrics.dayRows[hoveredBarIndex] ? (
                    (() => {
                      const row = dailyReportMetrics.dayRows[hoveredBarIndex];
                      return (
                        <>
                          <span>Ngày: <strong style={{ color: "#ffffff" }}>{formatDateDisplay(row.date)}</strong></span>
                          <span>•</span>
                          <span>Tổng: <strong style={{ color: "var(--amber-accent)" }}>{row.total} lượt</strong></span>
                          <span>•</span>
                          <span>Đi ngang: <strong>{row.passby}</strong></span>
                          <span>•</span>
                          <span>Cảnh báo: <strong style={{ color: "var(--rose-accent)" }}>{row.alert}</strong></span>
                          {row.peakHour >= 0 && (
                            <>
                              <span>•</span>
                              <span>Đỉnh: <strong>{String(row.peakHour).padStart(2, "0")}:00</strong> ({row.peakHourCount} lượt)</span>
                            </>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                      Rê chuột vào các cột để xem phân tích chi tiết từng ngày...
                    </span>
                  )}
                </div>

                {/* SVG Biểu Đồ Cột Stacked + Đường Trend */}
                {(() => {
                  const rows = dailyReportMetrics.dayRows;
                  const maxVal = Math.max(...rows.map((r) => r.total), 1);
                  const chartW = 700;
                  const chartH = 140;
                  const padBottom = 22;
                  const padTop = 10;
                  const usableH = chartH - padBottom - padTop;
                  const colW = chartW / Math.max(rows.length, 1);
                  const barW = Math.min(Math.max(colW * 0.55, 8), 36);

                  // Tạo đường xu hướng polyline
                  const points = rows.map((r, i) => {
                    const cx = i * colW + colW / 2;
                    const cy = chartH - padBottom - (r.total / maxVal) * usableH;
                    return `${cx},${cy}`;
                  }).join(" ");

                  return (
                    <div style={{ width: "100%", overflowX: "auto" }}>
                      <svg
                        viewBox={`0 0 ${chartW} ${chartH}`}
                        style={{ width: "100%", height: "160px", display: "block" }}
                        preserveAspectRatio="none"
                      >
                        {/* Lưới ngang tham chiếu */}
                        {[0, 0.5, 1].map((pct, idx) => {
                          const y = chartH - padBottom - pct * usableH;
                          return (
                            <g key={idx}>
                              <line
                                x1={0}
                                y1={y}
                                x2={chartW}
                                y2={y}
                                stroke="rgba(255, 255, 255, 0.07)"
                                strokeDasharray="3 3"
                                pointerEvents="none"
                              />
                              <text
                                x={4}
                                y={y - 3}
                                fill="var(--text-muted)"
                                fontSize="9"
                                pointerEvents="none"
                              >
                                {Math.round(pct * maxVal)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Cột Stacked từng ngày */}
                        {rows.map((r, i) => {
                          const cx = i * colW + colW / 2;
                          const bx = cx - barW / 2;
                          const totalH = r.total > 0 ? (r.total / maxVal) * usableH : 2;
                          const passbyH = r.total > 0 ? (r.passby / maxVal) * usableH : 0;
                          const alertH = r.total > 0 ? (r.alert / maxVal) * usableH : 0;

                          const isHovered = hoveredBarIndex === i;

                          return (
                            <g
                              key={r.date}
                              onMouseEnter={() => setHoveredBarIndex(i)}
                              onMouseLeave={() => setHoveredBarIndex(null)}
                              style={{ cursor: "pointer" }}
                            >
                              {/* Cột Đi ngang (Dưới) */}
                              {passbyH > 0 && (
                                <rect
                                  x={bx}
                                  y={chartH - padBottom - passbyH}
                                  width={barW}
                                  height={passbyH}
                                  fill="rgba(56, 189, 248, 0.75)"
                                  rx={alertH === 0 ? 3 : 0}
                                  opacity={isHovered ? 1 : 0.85}
                                />
                              )}

                              {/* Cột Cảnh báo (Trên) */}
                              {alertH > 0 && (
                                <rect
                                  x={bx}
                                  y={chartH - padBottom - passbyH - alertH}
                                  width={barW}
                                  height={alertH}
                                  fill="var(--rose-accent)"
                                  rx={3}
                                  opacity={isHovered ? 1 : 0.85}
                                />
                              )}

                              {/* Nếu r.total == 0 hiển thị thanh nhỏ nền */}
                              {r.total === 0 && (
                                <rect
                                  x={bx}
                                  y={chartH - padBottom - 2}
                                  width={barW}
                                  height={2}
                                  fill="rgba(255, 255, 255, 0.15)"
                                  rx={1}
                                />
                              )}

                              {/* Nhãn ngày dưới trục X */}
                              <text
                                x={cx}
                                y={chartH - 4}
                                textAnchor="middle"
                                fill={isHovered ? "#ffffff" : "var(--text-muted)"}
                                fontSize="9"
                                fontWeight={isHovered ? 700 : 400}
                                pointerEvents="none"
                              >
                                {r.date.slice(5).replace("-", "/")}
                              </text>

                              {/* Vùng bắt chuột mượt mà */}
                              <rect
                                x={i * colW}
                                y={0}
                                width={colW}
                                height={chartH}
                                fill="transparent"
                              />
                            </g>
                          );
                        })}

                        {/* Đường polyline biểu diễn xu hướng */}
                        {rows.length > 1 && (
                          <polyline
                            points={points}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            pointerEvents="none"
                          />
                        )}

                        {/* Nốt tròn tại các đỉnh */}
                        {rows.map((r, i) => {
                          const cx = i * colW + colW / 2;
                          const cy = chartH - padBottom - (r.total / maxVal) * usableH;
                          const isHovered = hoveredBarIndex === i;
                          return (
                            <circle
                              key={`dot-${i}`}
                              cx={cx}
                              cy={cy}
                              r={isHovered ? 4.5 : 2.5}
                              fill="#f59e0b"
                              stroke="#090d16"
                              strokeWidth="1.5"
                              pointerEvents="none"
                            />
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>

              {/* 3. HEATMAP MATRIX: NGÀY × 24 GIỜ (LƯU LƯỢNG NGƯỜI THEO GIỜ) */}
              <div style={{
                padding: "16px",
                background: "rgba(0, 0, 0, 0.25)",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: "18px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Layers size={14} color="var(--cyan-accent)" />
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                      Bản Đồ Nhiệt Lưu Lượng (Heatmap Ngày × 24 Giờ)
                    </span>
                  </div>

                  {/* Chú giải độ đậm nhạt */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    <span>Ít</span>
                    <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "rgba(255, 255, 255, 0.05)" }} title="0 lượt" />
                    <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "rgba(56, 189, 248, 0.35)" }} title="1 - 2 lượt" />
                    <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "rgba(245, 158, 11, 0.55)" }} title="3 - 10 lượt" />
                    <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "rgba(244, 63, 94, 0.85)" }} title="> 10 lượt" />
                    <span>Nhiều</span>
                  </div>
                </div>

                {/* Banner hiển thị chi tiết khi rê vào ô Heatmap */}
                <div style={{
                  minHeight: "24px",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                  padding: "2px 8px",
                  background: hoveredHeatCell ? "rgba(255, 255, 255, 0.05)" : "transparent",
                  borderRadius: "4px"
                }}>
                  {hoveredHeatCell ? (
                    <>
                      <span>Ngày: <strong style={{ color: "#ffffff" }}>{formatDateDisplay(hoveredHeatCell.date)}</strong></span>
                      <span>•</span>
                      <span>Khung giờ: <strong style={{ color: "var(--cyan-accent)" }}>{String(hoveredHeatCell.hour).padStart(2, "0")}:00 - {String(hoveredHeatCell.hour + 1).padStart(2, "0")}:00</strong></span>
                      <span>•</span>
                      <span>Tổng: <strong style={{ color: "var(--amber-accent)" }}>{hoveredHeatCell.passby + hoveredHeatCell.alert} lượt</strong></span>
                      <span>(Đi ngang: {hoveredHeatCell.passby}, Cảnh báo: {hoveredHeatCell.alert})</span>
                    </>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                      Rê chuột vào các ô vuông để xem số lượt người và cảnh báo theo từng khung giờ...
                    </span>
                  )}
                </div>

                {/* Grid Heatmap cuộn ngang mượt mà trên mobile */}
                <div style={{ overflowX: "auto", paddingBottom: "6px" }}>
                  <div style={{ minWidth: "560px" }}>
                    {/* Header: 24 Cột Giờ (00 -> 23) */}
                    <div style={{ display: "flex", gap: "2px", marginBottom: "4px", paddingLeft: "52px" }}>
                      {Array.from({ length: 24 }).map((_, h) => (
                        <div
                          key={h}
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontSize: "0.62rem",
                            color: h % 3 === 0 ? "var(--text-secondary)" : "rgba(255, 255, 255, 0.25)",
                            fontWeight: h % 6 === 0 ? 700 : 400
                          }}
                        >
                          {h % 3 === 0 ? `${h}h` : "•"}
                        </div>
                      ))}
                    </div>

                    {/* Các hàng ngày */}
                    {reportDays.map((dateStr) => {
                      const dayNode = dailyStats[dateStr];
                      return (
                        <div key={dateStr} style={{ display: "flex", alignItems: "center", gap: "2px", marginBottom: "3px" }}>
                          {/* Nhãn Ngày bên trái */}
                          <div style={{
                            width: "50px",
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                            textAlign: "right",
                            paddingRight: "6px",
                            flexShrink: 0
                          }}>
                            {dateStr.slice(5).replace("-", "/")}
                          </div>

                          {/* 24 ô giờ */}
                          {Array.from({ length: 24 }).map((_, h) => {
                            const hk = String(h).padStart(2, "0");
                            const p = dayNode?.hours?.[hk]?.passby || 0;
                            const a = dayNode?.hours?.[hk]?.alert || 0;
                            const totalH = p + a;

                            let bg = "rgba(255, 255, 255, 0.04)";
                            if (totalH > 10) bg = "rgba(244, 63, 94, 0.85)";
                            else if (totalH >= 3) bg = "rgba(245, 158, 11, 0.55)";
                            else if (totalH >= 1) bg = "rgba(56, 189, 248, 0.35)";

                            const isSelected = hoveredHeatCell?.date === dateStr && hoveredHeatCell?.hour === h;

                            return (
                              <div
                                key={h}
                                onMouseEnter={() => setHoveredHeatCell({ date: dateStr, hour: h, passby: p, alert: a })}
                                onMouseLeave={() => setHoveredHeatCell(null)}
                                style={{
                                  flex: 1,
                                  height: "18px",
                                  borderRadius: "2px",
                                  background: bg,
                                  cursor: "pointer",
                                  outline: isSelected ? "1.5px solid #ffffff" : "none",
                                  transition: "outline 0.1s"
                                }}
                                title={`${formatDateDisplay(dateStr)} ${hk}:00 - Tổng: ${totalH} (Đi ngang: ${p}, Cảnh báo: ${a})`}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. BẢNG CHI TIẾT TỪNG NGÀY (HỖ TRỢ SẮP XẾP CỘT) */}
              <div style={{
                background: "rgba(0, 0, 0, 0.2)",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                overflow: "hidden"
              }}>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Bảng Thống Kê Chi Tiết Theo Ngày
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    Hiển thị {sortedDayRows.length} ngày
                  </span>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "rgba(0, 0, 0, 0.3)", color: "var(--text-muted)" }}>
                        <th
                          onClick={() => handleSort("date")}
                          style={{ padding: "8px 12px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span>Ngày</span>
                            <ArrowUpDown size={11} color={sortField === "date" ? "var(--amber-accent)" : "currentColor"} />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("total")}
                          style={{ padding: "8px 12px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span>Lượt Phát Hiện</span>
                            <ArrowUpDown size={11} color={sortField === "total" ? "var(--amber-accent)" : "currentColor"} />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("passby")}
                          style={{ padding: "8px 12px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span>Đi Ngang</span>
                            <ArrowUpDown size={11} color={sortField === "passby" ? "var(--amber-accent)" : "currentColor"} />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("alert")}
                          style={{ padding: "8px 12px", cursor: "pointer", userSelect: "none" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span>Cảnh Báo</span>
                            <ArrowUpDown size={11} color={sortField === "alert" ? "var(--amber-accent)" : "currentColor"} />
                          </div>
                        </th>
                        <th style={{ padding: "8px 12px" }}>Tỷ Lệ Báo Động</th>
                        <th style={{ padding: "8px 12px" }}>Cảm Biến (PIR / Sonar / Cả 2)</th>
                        <th style={{ padding: "8px 12px" }}>Giờ Cao Điểm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDayRows.map((r, idx) => (
                        <tr
                          key={r.date}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                            background: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.02)"
                          }}
                        >
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "#ffffff" }}>
                            {formatDateDisplay(r.date)}
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--amber-accent)" }}>
                            {r.total}
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--cyan-accent)" }}>
                            {r.passby}
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--rose-accent)", fontWeight: 600 }}>
                            {r.alert}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <div style={{ width: "40px", height: "5px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "2px", overflow: "hidden" }}>
                                <div style={{ width: `${r.alertRate}%`, height: "100%", background: "var(--rose-accent)" }} />
                              </div>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{r.alertRate}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            PIR: <strong style={{ color: "#ffffff" }}>{r.pir}</strong> • Sonar: <strong style={{ color: "#ffffff" }}>{r.sonar}</strong> • Cả 2: <strong style={{ color: "var(--rose-accent)" }}>{r.both}</strong>
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: "0.72rem" }}>
                            {r.peakHour >= 0 ? (
                              <span className="badge badge-amber" style={{ padding: "2px 6px" }}>
                                {String(r.peakHour).padStart(2, "0")}:00 ({r.peakHourCount} lượt)
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: NHẬT KÝ THAO TÁC NGƯỜI DÙNG (AUDIT LOGS)                */}
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
