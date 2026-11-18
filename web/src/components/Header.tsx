import React from "react";
import { Shield, ShieldAlert, Wifi, WifiOff, LogIn, LogOut, User, Activity, Bell, BellOff } from "lucide-react";
import { ConnectionStatus } from "../types";

interface HeaderProps {
  wsStatus: ConnectionStatus;
  deviceOnline: boolean;
  userEmail: string | null;
  hasAlarm: boolean;
  secondsSinceLastHeartbeat: number | null;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  wsStatus,
  deviceOnline,
  userEmail,
  hasAlarm,
  secondsSinceLastHeartbeat,
  isMuted = false,
  onToggleMute,
  onOpenLogin,
  onLogout
}) => {
  return (
    <header className="glass-panel" style={{ padding: "16px 24px", marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        
        {/* Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: hasAlarm 
              ? "linear-gradient(135deg, #e11d48, #9f1239)" 
              : "linear-gradient(135deg, #0284c7, #0369a1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: hasAlarm 
              ? "0 0 20px rgba(244, 63, 94, 0.6)" 
              : "0 0 20px rgba(14, 165, 233, 0.4)"
          }}>
            {hasAlarm ? (
              <ShieldAlert size={28} color="#ffffff" style={{ animation: "pulse-red 1s infinite" }} />
            ) : (
              <Shield size={28} color="#ffffff" />
            )}
          </div>

          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              HỆ THỐNG AN NINH & BÁO ĐỘNG ĐỘT NHẬP
            </h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Giám Sát An Ninh Trực Tuyến • Chốt Khóa Tự Động • Báo Động Đa Tầng
            </p>
          </div>
        </div>

        {/* Status Indicators & Auth */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Mute / Unmute Chime Sound */}
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              className="btn btn-outline"
              style={{ padding: "6px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}
              title={isMuted ? "Đang tắt chuông báo (Bấm để bật)" : "Đang bật chuông báo (Bấm để tắt)"}
            >
              {isMuted ? <BellOff size={15} color="var(--rose-accent)" /> : <Bell size={15} color="var(--emerald-accent)" />}
              <span>{isMuted ? "Tắt Chuông" : "Bật Chuông"}</span>
            </button>
          )}

          {/* Live Status Badge */}
          <div className={`badge ${!deviceOnline ? "badge-slate" : (wsStatus === "CONNECTED" ? "badge-green" : wsStatus === "CONNECTING" ? "badge-amber" : "badge-red")}`}>
            <Activity size={14} />
            <span>
              {!deviceOnline
                ? (secondsSinceLastHeartbeat !== null ? `MẤT TÍN HIỆU (${secondsSinceLastHeartbeat}s trước)` : "OFFLINE")
                : (secondsSinceLastHeartbeat !== null ? `LIVE (${secondsSinceLastHeartbeat}s trước)` : "LIVE")}
            </span>
          </div>

          {/* Device Online/Offline Status */}
          <div className={`badge ${deviceOnline ? "badge-green" : "badge-slate"}`}>
            {deviceOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>THIẾT BỊ: {deviceOnline ? "ONLINE" : "OFFLINE"}</span>
          </div>

          {/* User Profile / Auth State */}
          {userEmail ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "8px", borderLeft: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <User size={16} color="var(--cyan-accent)" />
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{userEmail}</span>
                <span className="badge badge-cyan" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                  ADMIN
                </span>
              </div>
              <button onClick={onLogout} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: "0.75rem" }} title="Đăng xuất">
                <LogOut size={14} />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <button onClick={onOpenLogin} className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "0.8rem" }}>
              <LogIn size={15} />
              <span>Đăng nhập Admin</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
