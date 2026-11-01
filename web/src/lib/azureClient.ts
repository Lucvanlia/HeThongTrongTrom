import { TelemetryData, AlertItem, HistoryPoint, DeviceConfig, UserPrincipal } from "../types";

export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

export interface PubSubListeners {
  onTelemetry?: (data: TelemetryData) => void;
  onAlert?: (data: any) => void;
  onDeviceOffline?: (data: any) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export class AzureClient {
  private ws: WebSocket | null = null;
  private listeners: PubSubListeners = {};
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private isExplicitlyClosed = false;

  constructor(listeners: PubSubListeners = {}) {
    this.listeners = listeners;
  }

  public setListeners(listeners: PubSubListeners) {
    this.listeners = { ...this.listeners, ...listeners };
  }

  /**
   * Kết nối tới Azure Web PubSub qua endpoint đàm phán negotiate
   */
  public async connect(): Promise<void> {
    this.isExplicitlyClosed = false;
    this.updateStatus("CONNECTING");

    try {
      const res = await fetch("/api/realtime/negotiate");
      if (!res.ok) {
        throw new Error(`Negotiate failed with status ${res.status}`);
      }

      const { url } = await res.json();
      if (!url) {
        throw new Error("No WebSocket URL received from negotiate endpoint");
      }

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateStatus("CONNECTED");
        console.log("[Azure WebPubSub] WebSocket kết nối thành công!");
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          // Định dạng gói tin từ functions-ingest: { event: "...", data: {...}, timestamp: "..." }
          const eventType = raw.event;
          const payload = raw.data;

          if (eventType === "telemetry" && this.listeners.onTelemetry) {
            this.listeners.onTelemetry(payload);
          } else if (eventType === "alert" && this.listeners.onAlert) {
            this.listeners.onAlert(payload);
          } else if (eventType === "device_offline" && this.listeners.onDeviceOffline) {
            this.listeners.onDeviceOffline(payload);
          }
        } catch (e) {
          console.error("[Azure WebPubSub] Lỗi parse message:", e);
        }
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed) {
          this.updateStatus("DISCONNECTED");
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error("[Azure WebPubSub] WebSocket error:", err);
        this.updateStatus("ERROR");
      };

    } catch (err: any) {
      console.warn("[Azure WebPubSub] Lỗi khởi tạo WebSocket:", err.message);
      this.updateStatus("DISCONNECTED");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      console.log(`[Azure WebPubSub] Đang thử kết nối lại (lần ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus("DISCONNECTED");
  }

  private updateStatus(status: ConnectionStatus): void {
    if (this.listeners.onStatusChange) {
      this.listeners.onStatusChange(status);
    }
  }

  // ================= REST API METHODS ================= //

  public static async fetchDeviceState(): Promise<TelemetryData | null> {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public static async fetchHistory(date?: string, limit = 100): Promise<HistoryPoint[]> {
    try {
      const url = date ? `/api/history?date=${date}&limit=${limit}` : `/api/history?limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  public static async fetchAlerts(limit = 50): Promise<AlertItem[]> {
    try {
      const res = await fetch(`/api/alerts?limit=${limit}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  public static async sendCommand(command: "setArm" | "setLock" | "silenceAlarm", payload?: any): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch("/api/control/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, payload })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Command failed with status ${res.status}`);
      }
      return { success: data.success, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  public static async fetchAdminConfig(): Promise<DeviceConfig | null> {
    try {
      const res = await fetch("/api/admin/config");
      if (!res.ok) return null;
      const data = await res.json();
      return {
        thresholdCm: data.desired?.thresholdCm ?? 50,
        telemetryIntervalMs: data.desired?.telemetryIntervalMs ?? 15000
      };
    } catch {
      return null;
    }
  }

  public static async updateAdminConfig(config: Partial<DeviceConfig>): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update config failed");
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  public static async fetchUserPrincipal(): Promise<UserPrincipal | null> {
    try {
      const res = await fetch("/.auth/me");
      if (!res.ok) return null;
      const data = await res.json();
      const clientPrincipal = data?.clientPrincipal;
      if (!clientPrincipal) return null;
      return {
        userId: clientPrincipal.userId,
        userDetails: clientPrincipal.userDetails,
        identityProvider: clientPrincipal.identityProvider,
        userRoles: clientPrincipal.userRoles || []
      };
    } catch {
      return null;
    }
  }
}

