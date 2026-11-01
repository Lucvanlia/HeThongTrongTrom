import React, { useState } from "react";
import { HistoryPoint } from "../types";
import { Activity } from "lucide-react";

interface DistanceChartProps {
  data: HistoryPoint[];
  thresholdCm: number;
}

export const DistanceChart: React.FC<DistanceChartProps> = ({ data, thresholdCm }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Kích thước chuẩn khung vẽ SVG
  const width = 800;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Tính giá trị Max Y (khoảng cách tối đa để vẽ tỷ lệ trục)
  const maxDistance = Math.max(
    thresholdCm + 50,
    ...data.map((d) => d.distanceCm || 0),
    150
  );

  // Hàm chuyển đổi điểm dữ liệu sang toạ độ SVG
  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (data.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.min(Math.max(val, 0), maxDistance);
    return padding.top + plotHeight - (clamped / maxDistance) * plotHeight;
  };

  // Tính chuỗi điểm d cho polyline và path diện tích
  const points = data.map((d, i) => `${getX(i)},${getY(d.distanceCm)}`).join(" ");

  const areaPath = data.length > 0
    ? `M ${getX(0)},${getY(data[0].distanceCm)} ` +
      data.map((d, i) => `L ${getX(i)},${getY(d.distanceCm)}`).join(" ") +
      ` L ${getX(data.length - 1)},${padding.top + plotHeight} L ${getX(0)},${padding.top + plotHeight} Z`
    : "";

  const thresholdY = getY(thresholdCm);

  // Xử lý chuột di chuyển trên lớp overlay trong suốt
  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.min(Math.max((clientX - padding.left) / plotWidth, 0), 1);
    const index = Math.round(ratio * (data.length - 1));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoveredPoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  return (
    <div className="glass-panel" style={{ padding: "20px" }}>
      {/* 1. Header & Banner Thông Số Cố Định (Zero Layout Shift - CLS = 0) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Activity size={18} color="var(--cyan-accent)" />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Biểu Đồ Cự Ly Siêu Âm Theo Thời Gian</h3>
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          {data.length} điểm đo gần nhất
        </span>
      </div>

      {/* Banner cố định minHeight 48px hiển thị điểm đang rê chuột */}
      <div style={{
        minHeight: "48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0, 0, 0, 0.25)",
        borderRadius: "8px",
        padding: "8px 16px",
        marginBottom: "12px",
        border: "1px solid rgba(255, 255, 255, 0.05)"
      }}>
        {hoveredPoint ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="font-mono" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Mốc: {new Date(hoveredPoint.timestamp).toLocaleTimeString("vi-VN")}
              </span>
              <span className="font-mono" style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: hoveredPoint.distanceCm < thresholdCm ? "var(--rose-accent)" : "var(--cyan-accent)"
              }}>
                Cự ly: {hoveredPoint.distanceCm} cm
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {hoveredPoint.pirDetected && (
                <span className="badge badge-red" style={{ fontSize: "0.65rem" }}>PIR Kích Hoạt</span>
              )}
              {hoveredPoint.alarm && (
                <span className="badge badge-red" style={{ fontSize: "0.65rem" }}>Báo Động</span>
              )}
              {hoveredPoint.armed && (
                <span className="badge badge-green" style={{ fontSize: "0.65rem" }}>Armed</span>
              )}
            </div>
          </>
        ) : (
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
            Di chuyển chuột trên biểu đồ để xem chi tiết thời gian và cự ly đo đạc.
          </span>
        )}
      </div>

      {/* 2. Khung vẽ SVG Thuần Zero-Jitter */}
      <div style={{ width: "100%", overflow: "hidden" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <defs>
            {/* Gradient cho dải màu diện tích */}
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Lưới toạ độ Y & nhãn (pointerEvents="none") */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + plotHeight * (1 - ratio);
            const val = Math.round(maxDistance * ratio);
            return (
              <g key={ratio} pointerEvents="none">
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily="JetBrains Mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Đường giới hạn ngưỡng báo động (Threshold dotted line) */}
          <g pointerEvents="none">
            <line
              x1={padding.left}
              y1={thresholdY}
              x2={padding.left + plotWidth}
              y2={thresholdY}
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <text
              x={padding.left + plotWidth - 4}
              y={thresholdY - 6}
              fill="#fb7185"
              fontSize="11"
              textAnchor="end"
              fontFamily="JetBrains Mono"
              fontWeight="600"
            >
              Ngưỡng &lt;{thresholdCm}cm
            </text>
          </g>

          {/* Dải diện tích (Area Fill) */}
          {areaPath && (
            <path d={areaPath} fill="url(#areaGradient)" pointerEvents="none" />
          )}

          {/* Đường cong dữ liệu (Polyline) */}
          {points && (
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              pointerEvents="none"
            />
          )}

          {/* Điểm hover đang chọn */}
          {hoveredPoint && hoverIndex !== null && (
            <g pointerEvents="none">
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + plotHeight}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="3 3"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(hoveredPoint.distanceCm)}
                r="5"
                fill={hoveredPoint.distanceCm < thresholdCm ? "#f43f5e" : "#06b6d4"}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Nhãn mốc thời gian trục X */}
          {data.length > 0 && (
            <g pointerEvents="none" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">
              <text x={padding.left} y={height - 10} textAnchor="start">
                {new Date(data[0].timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </text>
              <text x={padding.left + plotWidth} y={height - 10} textAnchor="end">
                {new Date(data[data.length - 1].timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </text>
            </g>
          )}

          {/* Lớp bắt sự kiện chuột trong suốt duy nhất (Single top-level rect pointerEvents="all") */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            pointerEvents="all"
            style={{ cursor: "crosshair" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </svg>
      </div>
    </div>
  );
};

