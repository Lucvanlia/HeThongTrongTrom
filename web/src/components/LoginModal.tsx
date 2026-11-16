import React, { useState } from "react";
import { Lock, Mail, KeyRound, AlertCircle, Loader2, X, ShieldCheck } from "lucide-react";
import { FirebaseClient } from "../lib/firebaseClient";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  if (!isOpen) return null;

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await FirebaseClient.login(email.trim(), password);
      onLoginSuccess(user.email || email);
      onClose();
    } catch (err: any) {
      console.error("[Login] Auth error:", err);
      let msg = "Đăng nhập thất bại. Vui lòng kiểm tra lại Email và Mật khẩu!";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        msg = "Email hoặc Mật khẩu không chính xác.";
      } else if (err.code === "auth/user-not-found") {
        msg = "Tài khoản không tồn tại trên hệ thống.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Quá nhiều lần thử thất bại. Vui lòng thử lại sau ít phút.";
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.8)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px"
    }}>
      <div className="glass-panel" style={{
        maxWidth: "420px",
        width: "100%",
        padding: "28px",
        position: "relative",
        border: "1px solid rgba(255, 255, 255, 0.15)"
      }}>
        {/* Nút đóng */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer"
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #0284c7, #0369a1)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "12px",
            boxShadow: "0 0 20px var(--cyan-glow)"
          }}>
            <Lock size={26} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Đăng Nhập Quản Trị Viên</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Xác thực Quản trị viên để mở khóa quyền giám sát và điều khiển
          </p>
        </div>

        {error && (
          <div style={{
            padding: "10px 14px",
            borderRadius: "8px",
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            color: "var(--rose-accent)",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px"
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Email Quản Trị
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@security.local"
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 38px",
                  borderRadius: "8px",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Mật Khẩu
            </label>
            <div style={{ position: "relative" }}>
              <KeyRound size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 38px",
                  borderRadius: "8px",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: "100%", marginTop: "8px", padding: "12px" }}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            <span>{isLoading ? "Đang xác thực..." : "ĐĂNG NHẬP HỆ THỐNG"}</span>
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "16px" }}>
          Tài khoản được phân quyền bởi hệ thống quản trị an ninh trung tâm
        </p>
      </div>
    </div>
  );
};
