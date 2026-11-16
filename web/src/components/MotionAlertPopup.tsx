import React, { useEffect, useState, useRef } from "react";
import { TelemetryData } from "../types";
import { UserCheck, ShieldAlert, X, Eye } from "lucide-react";

interface MotionAlertPopupProps {
  telemetry: TelemetryData | null;
  isMuted?: boolean;
}

interface PopupNotice {
  id: number;
  type: "PASSING_BY" | "INTRUSION";
  title: string;
  message: string;
  distanceCm: number;
}

// Hàm phát âm thanh Ding-Dong hoặc Báo động bằng Web Audio API thuần (không cần file mp3 ngoài)
function playTone(isAlarm: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    if (isAlarm) {
      // Âm cảnh báo khẩn cấp (Còi hú điện tử hai tầng)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Âm Ding-Dong êm ái khi có người đi ngang qua
      // 1. Nốt Ding (784Hz - G5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(784, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // 2. Nốt Dong (587Hz - D5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(587.33, now + 0.18);
      gain2.gain.setValueAtTime(0.12, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.65);
    }
  } catch (err) {
    // Trình duyệt có thể chặn âm thanh nếu chưa có tương tác chuột
  }
}

export const MotionAlertPopup: React.FC<MotionAlertPopupProps> = ({ telemetry, isMuted = false }) => {
  const [popup, setPopup] = useState<PopupNotice | null>(null);
  const lastPopupTimeRef = useRef<number>(0);
  const prevPirRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!telemetry) return;

    const now = Date.now();
    const hasAlarm = telemetry.alarm === true;
    const pirActive = telemetry.pirDetected === true;
    const isPassing = (pirActive && !prevPirRef.current) || (pirActive && now - lastPopupTimeRef.current > 7000);
    prevPirRef.current = pirActive;

    // 1. TRƯỜNG HỢP ĐỘT NHẬP NGUY HIỂM (ALARM)
    if (hasAlarm) {
      if (now - lastPopupTimeRef.current > 4000) {
        lastPopupTimeRef.current = now;
        if (!isMuted) playTone(true);

        setPopup({
          id: now,
          type: "INTRUSION",
          title: "🚨 PHÁT HIỆN ĐỘT NHẬP NGUY HIỂM!",
          message: `Vật thể áp sát cự ly ${telemetry.distanceCm > 0 ? telemetry.distanceCm + ' cm' : 'rất gần'} khi hệ thống đang BẬT BẢO VỆ!`,
          distanceCm: telemetry.distanceCm
        });

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setPopup(null), 6000);
      }
    } 
    // 2. TRƯỜNG HỢP NGƯỜI ĐI NGANG QUA (PASSING BY)
    else if (isPassing) {
      lastPopupTimeRef.current = now;
      if (!isMuted) playTone(false);

      const distText = telemetry.distanceCm > 0 ? `${telemetry.distanceCm} cm` : "trong tầm quét";
      setPopup({
        id: now,
        type: "PASSING_BY",
        title: "👀 PHÁT HIỆN CÓ NGƯỜI ĐI NGANG QUA",
        message: `Cảm biến vừa ghi nhận chuyển động ngang qua khu vực quan sát (Cự ly: ${distText}).`,
        distanceCm: telemetry.distanceCm
      });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPopup(null), 4500);
    }
  }, [telemetry, isMuted]);

  if (!popup) return null;

  const isIntrusion = popup.type === "INTRUSION";

  return (
    <div style={{
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: 10000,
      maxWidth: "380px",
      width: "calc(100% - 48px)",
      animation: "slideInRight 0.3s ease-out"
    }}>
      <div style={{
        padding: "16px",
        borderRadius: "12px",
        background: isIntrusion ? "rgba(225, 29, 72, 0.95)" : "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(12px)",
        border: `1.5px solid ${isIntrusion ? "var(--rose-accent)" : "rgba(245, 158, 11, 0.6)"}`,
        boxShadow: isIntrusion 
          ? "0 10px 30px rgba(225, 29, 72, 0.6), 0 0 20px rgba(244, 63, 94, 0.4)" 
          : "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(245, 158, 11, 0.25)",
        color: "#ffffff"
      }}>
        {/* Header Toast */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: isIntrusion ? "rgba(0, 0, 0, 0.3)" : "rgba(245, 158, 11, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isIntrusion ? "#ffffff" : "var(--amber-accent)"
            }}>
              {isIntrusion ? <ShieldAlert size={20} /> : <Eye size={20} />}
            </div>
            <div>
              <h4 style={{
                fontSize: "0.88rem",
                fontWeight: 700,
                color: isIntrusion ? "#ffffff" : "var(--amber-accent)",
                lineHeight: 1.2
              }}>
                {popup.title}
              </h4>
              <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>
                {new Date().toLocaleTimeString("vi-VN")}
              </span>
            </div>
          </div>

          <button
            onClick={() => setPopup(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.7)",
              cursor: "pointer",
              padding: "4px"
            }}
            title="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Toast */}
        <p style={{ fontSize: "0.8rem", marginTop: "8px", lineHeight: 1.4, color: isIntrusion ? "#ffe4e6" : "var(--text-secondary)" }}>
          {popup.message}
        </p>

        {/* Footer Badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", fontSize: "0.72rem" }}>
          <span style={{ opacity: 0.75 }}>
            {isIntrusion ? "⚠️ Còi hú kích hoạt" : "🔔 Thông báo chuyển động nhẹ"}
          </span>
          <span style={{
            padding: "2px 8px",
            borderRadius: "4px",
            background: "rgba(255, 255, 255, 0.1)",
            fontWeight: 600
          }}>
            {popup.distanceCm > 0 ? `${popup.distanceCm} cm` : "PIR Sensor"}
          </span>
        </div>
      </div>
    </div>
  );
};
