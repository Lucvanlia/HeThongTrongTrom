/**
 * Migration Script: Tính ngược dữ liệu cũ từ /security/alerts vào /stats/daily
 * Chuẩn múi giờ: Asia/Ho_Chi_Minh (UTC+7)
 */

const FIREBASE_HOST = "iot-hethong-trongtrom-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIREBASE_AUTH = "VjXkN2srwm35UgNbYMpur7A7vo5vYIbPDjOs4aHJ";

function getVietnamDateKey(ts) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(ts));
}

function getVietnamHourKey(ts) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "numeric",
    hourCycle: "h23"
  }).formatToParts(new Date(ts));
  const hourPart = parts.find((p) => p.type === "hour");
  const h = hourPart ? parseInt(hourPart.value, 10) : new Date(ts).getHours();
  return String(h).padStart(2, "0");
}

async function runMigration() {
  console.log("=== BẮT ĐẦU MIGRATION DỮ LIỆU CŨ VÀO STATS/DAILY ===");

  // 1. Tải toàn bộ alerts hiện có
  const alertsUrl = `https://${FIREBASE_HOST}/security/alerts.json?auth=${FIREBASE_AUTH}`;
  console.log(`Đang tải dữ liệu từ: ${alertsUrl.replace(FIREBASE_AUTH, "<HIDDEN>")}`);
  const res = await fetch(alertsUrl);
  if (!res.ok) {
    throw new Error(`Tải alerts thất bại: HTTP ${res.status}`);
  }
  const alertsData = await res.json();
  if (!alertsData) {
    console.log("Không có alert nào để migrate.");
    return;
  }

  const alertKeys = Object.keys(alertsData);
  console.log(`Tìm thấy ${alertKeys.length} bản ghi cảnh báo.`);

  // 2. Gom nhóm theo ngày và giờ theo chuẩn Asia/Ho_Chi_Minh
  const dailyStats = {};

  for (const key of alertKeys) {
    const alert = alertsData[key];
    const ts = alert.timestamp || Date.now();
    const dateKey = getVietnamDateKey(ts);
    const hourKey = getVietnamHourKey(ts);

    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = {
        total: { passby: 0, alert: 0, pir: 0, sonar: 0, both: 0 },
        hours: {}
      };
      // Khởi tạo sẵn 24 khung giờ 00..23
      for (let i = 0; i < 24; i++) {
        const hStr = String(i).padStart(2, "0");
        dailyStats[dateKey].hours[hStr] = { passby: 0, alert: 0 };
      }
    }

    // Tăng đếm tổng
    dailyStats[dateKey].total.alert += 1;
    dailyStats[dateKey].hours[hourKey].alert += 1;

    // Phân loại cảm biến
    const sensor = (alert.sensor || alert.alertSource || "").toUpperCase();
    if (sensor.includes("+")) {
      dailyStats[dateKey].total.both += 1;
    } else if (sensor === "PIR") {
      dailyStats[dateKey].total.pir += 1;
    } else if (sensor === "SONAR") {
      dailyStats[dateKey].total.sonar += 1;
    } else {
      dailyStats[dateKey].total.pir += 1;
    }
  }

  console.log("Thống kê đã gom nhóm theo các ngày:");
  console.table(
    Object.keys(dailyStats).map((d) => ({
      Ngay: d,
      TongAlert: dailyStats[d].total.alert,
      PIR: dailyStats[d].total.pir,
      Sonar: dailyStats[d].total.sonar,
      Both: dailyStats[d].total.both
    }))
  );

  // 3. Đẩy lên Firebase RTDB node /stats/daily
  const statsUrl = `https://${FIREBASE_HOST}/stats/daily.json?auth=${FIREBASE_AUTH}`;
  console.log("Đang ghi vào /stats/daily...");
  const patchRes = await fetch(statsUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dailyStats)
  });

  if (!patchRes.ok) {
    throw new Error(`Ghi /stats/daily thất bại: HTTP ${patchRes.status}`);
  }

  console.log("=== MIGRATION THÀNH CÔNG RỰC RỠ! ===");
}

runMigration().catch((err) => {
  console.error("Lỗi migration:", err);
  process.exit(1);
});
