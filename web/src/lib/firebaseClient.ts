import { ref, onValue, update, query, orderByChild, limitToLast } from "firebase/database";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../firebase";
import { TelemetryData, AlertItem, DeviceConfig } from "../types";

export interface FirebaseControlState {
  armed: boolean;
  doorLocked: boolean;
  silenceAlarm: boolean;
  cmdId?: number;
  lastUpdated?: number;
}

export class FirebaseClient {
  /**
   * Lắng nghe trạng thái đăng nhập Firebase Authentication
   */
  public static onAuthChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Đăng nhập Admin qua Email / Password
   */
  public static async login(email: string, pass: string): Promise<User> {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return res.user;
  }

  /**
   * Đăng xuất khỏi hệ thống
   */
  public static async logout(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Lắng nghe telemetry thời gian thực từ Firebase (/security/telemetry)
   */
  public static subscribeTelemetry(callback: (data: TelemetryData) => void): () => void {
    const telemetryRef = ref(db, "security/telemetry");
    return onValue(telemetryRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        callback({
          deviceId: val.deviceId || "esp32-chongtrom-01",
          timestamp: val.ts ? new Date(val.ts).toISOString() : (val.timestamp || new Date().toISOString()),
          distanceCm: typeof val.distanceCm === "number" ? val.distanceCm : -1,
          pirDetected: Boolean(val.pirDetected ?? val.pir),
          armed: Boolean(val.armed),
          alarm: Boolean(val.alarm),
          doorLocked: Boolean(val.doorLocked),
          ip: val.ip,
          rssi: val.rssi,
          status: "ONLINE"
        });
      }
    });
  }

  /**
   * Lắng nghe trạng thái Online/Offline của thiết bị (/security/status)
   */
  public static subscribeStatus(callback: (online: boolean, lastHeartbeat?: number) => void): () => void {
    const statusRef = ref(db, "security/status");
    return onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const isOnline = Boolean(val.online);
        callback(isOnline, val.lastHeartbeat);
      } else {
        callback(false);
      }
    });
  }

  /**
   * Lắng nghe danh sách cảnh báo đột nhập (/security/alerts) với limitToLast(50)
   */
  public static subscribeAlerts(callback: (alerts: AlertItem[]) => void): () => void {
    const alertsQuery = query(ref(db, "security/alerts"), orderByChild("timestamp"), limitToLast(50));
    return onValue(alertsQuery, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const items: AlertItem[] = [];
        Object.keys(val).forEach((key) => {
          const a = val[key];
          items.push({
            id: key,
            deviceId: a.deviceId || "esp32-chongtrom-01",
            timestamp: typeof a.timestamp === "number" ? new Date(a.timestamp).toISOString() : (a.timestamp || new Date().toISOString()),
            alertSource: a.sensor || a.alertSource || "PIR",
            distanceCm: a.distanceCm || 0,
            pirDetected: Boolean(a.pirDetected ?? a.pir),
            doorLocked: Boolean(a.doorLocked)
          });
        });
        // Sắp xếp mới nhất lên đầu
        items.sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime());
        callback(items);
      } else {
        callback([]);
      }
    });
  }

  /**
   * Lắng nghe cấu hình thiết bị (/security/config)
   */
  public static subscribeConfig(callback: (config: DeviceConfig) => void): () => void {
    const configRef = ref(db, "security/config");
    return onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        callback({
          thresholdCm: val.thresholdCm ?? 12,
          telemetryIntervalMs: val.telemetryIntervalMs ?? 1000
        });
      }
    });
  }

  /**
   * Gửi lệnh ARM / DISARM (kèm cmdId chống xung đột)
   */
  public static async setArmed(armed: boolean): Promise<void> {
    const controlRef = ref(db, "security/control");
    await update(controlRef, {
      armed,
      doorLocked: armed, // Khóa chốt khi ARM, mở khi DISARM
      cmdId: Date.now(),
      lastUpdated: Date.now()
    });
  }

  /**
   * Gửi lệnh Đóng / Mở khóa cửa (Servo 0° / 160°) (kèm cmdId chống xung đột)
   */
  public static async setLock(locked: boolean): Promise<void> {
    const controlRef = ref(db, "security/control");
    await update(controlRef, {
      doorLocked: locked,
      cmdId: Date.now(),
      lastUpdated: Date.now()
    });
  }

  /**
   * Gửi lệnh Tắt còi báo động khẩn cấp
   */
  public static async silenceAlarm(): Promise<void> {
    const controlRef = ref(db, "security/control");
    await update(controlRef, {
      silenceAlarm: true,
      lastUpdated: Date.now()
    });
  }

  /**
   * Cập nhật cấu hình ngưỡng an ninh
   */
  public static async updateConfig(thresholdCm: number, telemetryIntervalMs: number): Promise<void> {
    const configRef = ref(db, "security/config");
    await update(configRef, {
      thresholdCm,
      telemetryIntervalMs,
      lastUpdated: Date.now()
    });
  }
}

