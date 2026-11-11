import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Đọc cấu hình từ file .env / .env.local thông qua Vite
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyABQw0fDXaB8bmmyreH1ylDM5qiCzHUUhc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "iot-hethong-trongtrom.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://iot-hethong-trongtrom-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "iot-hethong-trongtrom",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "iot-hethong-trongtrom.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "453170623377",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:453170623377:web:d34c469acd8ba3c4a2a030",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-CWYF73J8K0"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
