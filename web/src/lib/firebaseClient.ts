import { db, auth } from "../firebase";
import { 
  ref, 
  onValue, 
  update, 
  push, 
  query, 
  orderByChild, 
  orderByKey,
  startAt,
  endAt,
  limitToLast, 
  runTransaction,
  get
} from "firebase/database";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { 
  TelemetryData, 
  AlertItem, 
  DeviceConfig, 
  AuditLogItem, 
  ScheduleConfig,
  DailyStatsMap,
  DailyStatNode
} from "../types";

export function getVietnamDateKey(ts: number | Date = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(typeof ts === "number" ? new Date(ts) : ts);
}

export function getVietnamHourKey(ts: number | Date = Date.now()): string {
  const dateObj = typeof ts === "number" ? new Date(ts) : ts;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "numeric",
    hourCycle: "h23"
  }).formatToParts(dateObj);
  const hourPart = parts.find((p) => p.type === "hour");
  const h = hourPart ? parseInt(hourPart.value, 10) : dateObj.getHours();
  return String(h).padStart(2, "0");
}

export class FirebaseClient {
  /**
   * Lắng nghe trạng thái đăng nhập Authentication
   */
  public static onAuthChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Đăng nhập Admin qua Email / Password
   */
  public static async login(email: string, pass: string): Promise<User> {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    await this.logAudit(email, "UPDATE_CONFIG", "Quản trị viên đăng nhập hệ thống");
    return res.user;
  }

  /**
   * Đăng xuất khỏi hệ thống
   */
  public static async logout(): Promise<void> {
    const currentUser = auth.currentUser?.email || "Admin";
    await this.logAudit(currentUser, "UPDATE_CONFIG", "Quản trị viên đăng xuất hệ thống");
    await signOut(auth);
  }

  /**
   * Lắng nghe telemetry thời gian thực (/security/telemetry)
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
   * Lắng nghe danh sách cảnh báo đột nhập (/security/alerts) với limitToLast(100)
   */
  public static subscribeAlerts(callback: (alerts: AlertItem[]) => void): () => void {
    const alertsQuery = query(ref(db, "security/alerts"), orderByChild("timestamp"), limitToLast(100));
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
   * Lắng nghe lịch tự động Bật/Tắt bảo vệ (/security/schedule)
   */
  public static subscribeSchedule(callback: (schedule: ScheduleConfig) => void): () => void {
    const scheduleRef = ref(db, "security/schedule");
    return onValue(scheduleRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        callback({
          enabled: Boolean(val.enabled),
          armTime: val.armTime || "22:00",
          disarmTime: val.disarmTime || "06:00",
          lastUpdated: val.lastUpdated
        });
      } else {
        callback({ enabled: false, armTime: "22:00", disarmTime: "06:00" });
      }
    });
  }

  /**
   * Cập nhật lịch trình hẹn giờ tự động
   */
  public static async updateSchedule(schedule: ScheduleConfig, userEmail?: string): Promise<void> {
    const scheduleRef = ref(db, "security/schedule");
    await update(scheduleRef, {
      ...schedule,
      lastUpdated: Date.now()
    });
    if (userEmail) {
      await this.logAudit(userEmail, "UPDATE_SCHEDULE", `Cập nhật lịch tự động: ${schedule.enabled ? "BẬT" : "TẮT"} (${schedule.armTime} - ${schedule.disarmTime})`);
    }
  }

  /**
   * Ghi nhật ký thao tác người dùng (/security/auditLogs)
   */
  public static async logAudit(userEmail: string, action: AuditLogItem["action"], detail: string): Promise<void> {
    try {
      const auditRef = ref(db, "security/auditLogs");
      await push(auditRef, {
        timestamp: Date.now(),
        userEmail,
        action,
        detail
      });
    } catch (e) {
      console.warn("Ghi nhật ký audit thất bại:", e);
    }
  }

  /**
   * Lắng nghe danh sách nhật ký thao tác (/security/auditLogs)
   */
  public static subscribeAuditLogs(callback: (logs: AuditLogItem[]) => void): () => void {
    const auditQuery = query(ref(db, "security/auditLogs"), orderByChild("timestamp"), limitToLast(50));
    return onValue(auditQuery, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const items: AuditLogItem[] = [];
        Object.keys(val).forEach((key) => {
          const item = val[key];
          items.push({
            id: key,
            timestamp: typeof item.timestamp === "number" ? new Date(item.timestamp).toISOString() : (item.timestamp || new Date().toISOString()),
            userEmail: item.userEmail || "Hệ thống",
            action: item.action,
            detail: item.detail || ""
          });
        });
        items.sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime());
        callback(items);
      } else {
        callback([]);
      }
    });
  }

  /**
   * Gửi lệnh ARM / DISARM (kèm cmdId chống xung đột & ghi Audit Log)
   */
  public static async setArmed(armed: boolean, userEmail?: string): Promise<void> {
    const controlRef = ref(db, "security/control");
    await update(controlRef, {
      armed,
      doorLocked: armed,
      cmdId: Date.now(),
      lastUpdated: Date.now()
    });
    if (userEmail) {
      await this.logAudit(userEmail, armed ? "ARM" : "DISARM", armed ? "Kích hoạt bảo vệ an ninh (ARM)" : "Giải trừ an ninh (DISARM)");
    }
  }

  /**
   * Gửi lệnh Đóng / Mở khóa cửa (Servo 0° / 160°) (kèm cmdId chống xung đột & ghi Audit Log)
   */
  public static async setLock(locked: boolean, userEmail?: string): Promise<void> {
    const controlRef = ref(db, "security/control");
    await update(controlRef, {
      doorLocked: locked,
      cmdId: Date.now(),
      lastUpdated: Date.now()
    });
    if (userEmail) {
      await this.logAudit(userEmail, locked ? "LOCK_DOOR" : "UNLOCK_DOOR", locked ? "Khóa chốt cửa an toàn (0°)" : "Mở chốt cửa thoát hiểm (160°)");
    }
  }

  /**
   * Gửi lệnh Tắt còi báo động khẩn cấp
   */
  public static async silenceAlarm(userEmail?: string): Promise<void> {
    const controlRef = ref(db, "security/control");
    await update(controlRef, {
      silenceAlarm: true,
      lastUpdated: Date.now()
    });
    if (userEmail) {
      await this.logAudit(userEmail, "SILENCE_ALARM", "Tắt còi báo động khẩn cấp");
    }
  }

  /**
   * Cập nhật cấu hình ngưỡng an ninh
   */
  public static async updateConfig(thresholdCm: number, telemetryIntervalMs: number, userEmail?: string): Promise<void> {
    const configRef = ref(db, "security/config");
    await update(configRef, {
      thresholdCm,
      telemetryIntervalMs,
      lastUpdated: Date.now()
    });
    if (userEmail) {
      await this.logAudit(userEmail, "UPDATE_CONFIG", `Cập nhật ngưỡng cự ly an ninh: ${thresholdCm} cm`);
    }
  }

  /**
   * Tăng bộ đếm tổng hợp theo ngày/giờ bằng transaction()
   * stats/daily/{YYYY-MM-DD}/total: { passby, alert, pir, sonar, both }
   * stats/daily/{YYYY-MM-DD}/hours/{00..23}: { passby, alert }
   */
  public static async recordDailyEvent(
    type: "passby" | "alert",
    sensor: "PIR" | "SONAR" | "BOTH" = "PIR",
    timestamp: number = Date.now()
  ): Promise<void> {
    const dateKey = getVietnamDateKey(timestamp);
    const hourKey = getVietnamHourKey(timestamp);
    const statRef = ref(db, `stats/daily/${dateKey}`);

    try {
      await runTransaction(statRef, (currentData) => {
        const data: DailyStatNode = currentData || {
          total: { passby: 0, alert: 0, pir: 0, sonar: 0, both: 0 },
          hours: {}
        };

        if (!data.total) {
          data.total = { passby: 0, alert: 0, pir: 0, sonar: 0, both: 0 };
        }
        if (!data.hours) {
          data.hours = {};
        }
        if (!data.hours[hourKey]) {
          data.hours[hourKey] = { passby: 0, alert: 0 };
        }

        if (type === "passby") {
          data.total.passby = (data.total.passby || 0) + 1;
          data.hours[hourKey].passby = (data.hours[hourKey].passby || 0) + 1;
        } else {
          data.total.alert = (data.total.alert || 0) + 1;
          data.hours[hourKey].alert = (data.hours[hourKey].alert || 0) + 1;
        }

        if (sensor === "PIR") {
          data.total.pir = (data.total.pir || 0) + 1;
        } else if (sensor === "SONAR") {
          data.total.sonar = (data.total.sonar || 0) + 1;
        } else if (sensor === "BOTH") {
          data.total.both = (data.total.both || 0) + 1;
        }

        return data;
      });
    } catch (e) {
      console.warn("Lỗi cập nhật stats transaction:", e);
    }
  }

  /**
   * Lắng nghe dữ liệu thống kê theo khoảng ngày bằng orderByKey().startAt().endAt()
   * Chỉ tải đúng các node ngày trong khoảng chọn, không tải toàn bộ database.
   */
  public static subscribeDailyStatsRange(
    startKey: string,
    endKey: string,
    callback: (data: DailyStatsMap) => void
  ): () => void {
    const statsQuery = query(
      ref(db, "stats/daily"),
      orderByKey(),
      startAt(startKey),
      endAt(endKey)
    );
    return onValue(statsQuery, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as DailyStatsMap);
      } else {
        callback({});
      }
    });
  }

  /**
   * Tùy chọn tự động dọn dẹp các log chi tiết trong /security/alerts cũ hơn X ngày
   * Lưu ý: Giữ nguyên /stats/daily để không mất dữ liệu báo cáo lịch sử.
   */
  public static async purgeOldAlerts(daysOlderThan: number = 30, userEmail?: string): Promise<number> {
    const cutoffTime = Date.now() - daysOlderThan * 24 * 60 * 60 * 1000;
    const alertsQuery = query(ref(db, "security/alerts"), orderByChild("timestamp"));
    const snapshot = await get(alertsQuery);
    if (!snapshot.exists()) return 0;

    const val = snapshot.val();
    let deletedCount = 0;
    const updates: Record<string, null> = {};
    for (const key of Object.keys(val)) {
      if (val[key].timestamp && val[key].timestamp < cutoffTime) {
        updates[`security/alerts/${key}`] = null;
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      await update(ref(db), updates);
      if (userEmail) {
        await this.logAudit(userEmail, "UPDATE_CONFIG", `Dọn dẹp ${deletedCount} nhật ký chi tiết cũ hơn ${daysOlderThan} ngày`);
      }
    }
    return deletedCount;
  }
}
