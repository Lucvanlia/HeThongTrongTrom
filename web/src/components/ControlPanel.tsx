import React, { useState, useEffect } from "react";
import { Shield, ShieldOff, Lock, Unlock, VolumeX, Settings, RefreshCw, Loader2 } from "lucide-react";
import { FirebaseClient } from "../lib/firebaseClient";
import { TelemetryData } from "../types";

interface ControlPanelProps {
  telemetry: TelemetryData | null;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

interface PendingCommand {
  type: "setArm" | "setLock" | "silenceAlarm";
  targetValue?: boolean;
  sentAt: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ telemetry, onRefresh, onOpenSettings }) => {
  const armed = telemetry?.armed ?? false;
  const doorLocked = telemetry?.doorLocked ?? false;
  const alarm = telemetry?.alarm ?? false;

  const [pendingCmd, setPendingCmd] = useState<PendingCommand | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Tự động mở khóa nút bấm khi Telemetry từ ESP32 xác nhận đã đổi trạng thái thành công
  useEffect(() => {
    if (!pendingCmd) return;

    let satisfied = false;
    if (pendingCmd.type === "setArm" && telemetry?.armed === pendingCmd.targetValue) {
      satisfied = true;
    } else if (pendingCmd.type === "setLock" && telemetry?.doorLocked === pendingCmd.targetValue) {
      satisfied = true;
    } else if (pendingCmd.type === "silenceAlarm" && telemetry?.alarm === false) {
      satisfied = true;
    }

    if (satisfied) {
      const elapsed = ((Date.now() - pendingCmd.sentAt) / 1000).toFixed(1);
      setStatusMessage(`ESP32 đã thực thi thành công (${elapsed}s)!`);
      setPendingCmd(null);
    }
  }, [telemetry, pendingCmd]);

  // Timeout an toàn 8s: Nếu quá 8s chưa thấy ESP32 phản hồi thì giải phóng nút và báo cảnh báo
  useEffect(() => {
    if (!pendingCmd) return;
    const timer = setTimeout(() => {
      setStatusMessage("Cảnh báo: Quá 8s thiết bị chưa phản hồi (hãy kiểm tra nguồn/Wi-Fi ESP32)!");
      setPendingCmd(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [pendingCmd]);

  const isPending = pendingCmd !== null;

  const handleCommand = async (command: "setArm" | "setLock" | "silenceAlarm", payload?: any) => {
    if (isPending) return;

    const target = payload?.armed ?? payload?.locked;
    setPendingCmd({ type: command, targetValue: target, sentAt: Date.now() });
    setStatusMessage("Đang gửi lệnh tới ESP32 qua Firebase...");

    try {
      if (command === "setArm") {
        await FirebaseClient.setArmed(target ?? true);
      } else if (command === "setLock") {
        await FirebaseClient.setLock(target ?? true);
      } else if (command === "silenceAlarm") {
        await FirebaseClient.silenceAlarm();
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi: ${err.message}`);
      setPendingCmd(null);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: "20px", marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Bảng Điều Khiển Thiết Bị</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Điều khiển Realtime (Đóng vòng lặp: Tự động mở khóa khi ESP32 xác nhận trạng thái)
          </p>
        </div>

        {statusMessage && (
          <span style={{ fontSize: "0.8rem", color: "var(--cyan-accent)", fontStyle: "italic" }}>
            {statusMessage}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        {/* Nút Bật/Tắt ARMED */}
        <button
          className={`btn ${armed ? "btn-danger" : "btn-success"}`}
          onClick={() => handleCommand("setArm", { armed: !armed })}
          disabled={isPending}
        >
          {isPending && pendingCmd?.type === "setArm" ? <Loader2 size={18} className="animate-spin" /> : armed ? <ShieldOff size={18} /> : <Shield size={18} />}
          <span>{armed ? "HỦY BẢO VỆ (DISARM)" : "KÍCH HOẠT BẢO VỆ (ARM)"}</span>
        </button>

        {/* Nút Đóng/Mở Chốt Cửa (Servo SG90 0° / 160°) */}
        <button
          className={`btn ${doorLocked ? "btn-outline" : "btn-primary"}`}
          onClick={() => handleCommand("setLock", { locked: !doorLocked })}
          disabled={isPending}
        >
          {isPending && pendingCmd?.type === "setLock" ? <Loader2 size={18} className="animate-spin" /> : doorLocked ? <Unlock size={18} /> : <Lock size={18} />}
          <span>{doorLocked ? "MỞ KHÓA CỬA (160°)" : "KHÓA CHỐT CỬA (0°)"}</span>
        </button>

        {/* Nút Tắt Còi Báo Động (Chỉ sáng khi còi đang hú) */}
        {alarm && (
          <button
            className="btn btn-danger"
            onClick={() => handleCommand("silenceAlarm", {})}
            disabled={isPending}
          >
            {isPending && pendingCmd?.type === "silenceAlarm" ? <Loader2 size={18} className="animate-spin" /> : <VolumeX size={18} />}
            <span>TẮT CÒI NGAY</span>
          </button>
        )}

        {/* Nút Làm Mới */}
        <button
          className="btn btn-outline"
          onClick={onRefresh}
          disabled={isPending}
          style={{ marginLeft: "auto" }}
          title="Làm mới trạng thái và lịch sử"
        >
          <RefreshCw size={16} />
          <span>Làm Mới</span>
        </button>

        {/* Nút Mở Cài Đặt Ngưỡng */}
        <button
          className="btn btn-outline"
          onClick={onOpenSettings}
          disabled={isPending}
          title="Cấu hình ngưỡng khoảng cách an ninh"
        >
          <Settings size={16} />
          <span>Cấu Hình</span>
        </button>
      </div>
    </div>
  );
};

