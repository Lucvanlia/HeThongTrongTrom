import React, { useRef, useState } from "react";
import { Shield, ShieldOff, Lock, Unlock, VolumeX, Settings, RefreshCw, Loader2 } from "lucide-react";
import { AzureClient } from "../lib/azureClient";
import { TelemetryData } from "../types";

interface ControlPanelProps {
  telemetry: TelemetryData | null;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ telemetry, onRefresh, onOpenSettings }) => {
  const armed = telemetry?.armed ?? false;
  const doorLocked = telemetry?.doorLocked ?? false;
  const alarm = telemetry?.alarm ?? false;

  // 3.5s Pending Lock Ref chống bấm lặp (debounce & race condition protection)
  const pendingLockRef = useRef<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const handleCommand = async (command: "setArm" | "setLock" | "silenceAlarm", payload?: any) => {
    if (pendingLockRef.current) {
      console.warn("[ControlPanel] Đang trong thời gian khóa 3.5s chống bấm lặp.");
      return;
    }

    pendingLockRef.current = true;
    setIsPending(true);
    setStatusMessage("Đang gửi lệnh Direct Method tới ESP32...");

    try {
      const res = await AzureClient.sendCommand(command, payload);
      if (res.success) {
        setStatusMessage(res.message || "Đã gửi lệnh thành công.");
      } else {
        setStatusMessage(`Lỗi: ${res.message}`);
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi: ${err.message}`);
    } finally {
      // Giữ trạng thái khóa 3.5s trước khi mở khóa cho người dùng bấm tiếp
      setTimeout(() => {
        pendingLockRef.current = false;
        setIsPending(false);
      }, 3500);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: "20px", marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Bảng Điều Khiển Thiết Bị</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Thực thi C2D Direct Method qua Azure IoT Hub (Khóa chống bấm lặp 3.5s)
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
          {isPending ? <Loader2 size={18} className="animate-spin" /> : armed ? <ShieldOff size={18} /> : <Shield size={18} />}
          <span>{armed ? "HỦY BẢO VỆ (DISARM)" : "KÍCH HOẠT BẢO VỆ (ARM)"}</span>
        </button>

        {/* Nút Đóng/Mở Chốt Cửa (Servo SG90) */}
        <button
          className={`btn ${doorLocked ? "btn-outline" : "btn-primary"}`}
          onClick={() => handleCommand("setLock", { locked: !doorLocked })}
          disabled={isPending}
        >
          {isPending ? <Loader2 size={18} className="animate-spin" /> : doorLocked ? <Unlock size={18} /> : <Lock size={18} />}
          <span>{doorLocked ? "MỞ KHÓA CỬA (0°)" : "KHÓA CHỐT CỬA (90°)"}</span>
        </button>

        {/* Nút Tắt Còi Báo Động (Chỉ sáng khi còi đang hú) */}
        {alarm && (
          <button
            className="btn btn-danger"
            onClick={() => handleCommand("silenceAlarm", {})}
            disabled={isPending}
          >
            {isPending ? <Loader2 size={18} className="animate-spin" /> : <VolumeX size={18} />}
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
          title="Cấu hình thông số Device Twin"
        >
          <Settings size={16} />
          <span>Cấu Hình</span>
        </button>
      </div>
    </div>
  );
};
