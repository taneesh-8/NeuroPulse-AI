/**
 * Seed script — populates Firestore with test users and patient data
 * Run: node scripts/seed.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, addDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCqlZzyL8XUS5NgA-xTTvITB3LDMQUbDlY",
  authDomain: "neuropulse-ai-fa974.firebaseapp.com",
  projectId: "neuropulse-ai-fa974",
  appId: "1:850972130045:web:e9f485aecbdf691b9c9c94",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// UIDs from Firebase Auth (created manually)
const PATIENT_UID = "nnSimwHOUhf4zqS34v3yqBndQKF3";
const DOCTOR_UID = "1a9v5oChqqVJIOa7lHe6XUYgA2M2";
const CAREGIVER_UID = "KMUaMz9q75eutAVVeDAVD5MIoeb2";

async function seed() {
  console.log("🧠 NeuroPulse AI — Seeding Firestore...\n");

  // 1. Create user profiles
  console.log("📋 Creating user profiles...");

  await setDoc(doc(db, "users", PATIENT_UID), {
    name: "John Doe",
    role: "patient",
    phone: "+1234567890",
    linkedPatients: ["PATIENT_001"],
  });
  console.log("  ✅ Patient user: John Doe");

  await setDoc(doc(db, "users", DOCTOR_UID), {
    name: "Dr. Sarah Chen",
    role: "doctor",
    phone: "+1234567891",
    linkedPatients: ["PATIENT_001"],
  });
  console.log("  ✅ Doctor user: Dr. Sarah Chen");

  await setDoc(doc(db, "users", CAREGIVER_UID), {
    name: "Jane Doe",
    role: "caregiver",
    phone: "+1234567892",
    linkedPatients: ["PATIENT_001"],
  });
  console.log("  ✅ Caregiver user: Jane Doe");

  // 2. Create patient document
  console.log("\n🏥 Creating patient document...");

  await setDoc(doc(db, "patients", "PATIENT_001"), {
    name: "John Doe",
    age: 65,
    assignedDoctors: [DOCTOR_UID],
    assignedCaregivers: [CAREGIVER_UID],
  });
  console.log("  ✅ Patient: PATIENT_001 (John Doe, age 65)");

  // 3. Generate 24 hours of sample readings (one per minute = 1440 readings)
  console.log("\n📊 Generating 24h of sample readings (this may take a minute)...");

  const now = Date.now();
  const readingsRef = collection(db, "patients", "PATIENT_001", "readings");
  let count = 0;

  // Generate one reading every 5 minutes for 7 days = ~2016 readings
  // But keep it manageable: every 10 min for 3 days = ~432 readings
  const intervalMs = 10 * 60 * 1000; // 10 min
  const durationMs = 3 * 24 * 60 * 60 * 1000; // 3 days

  let bpm = 72;
  let spo2 = 97;

  const batch = [];

  for (let t = now - durationMs; t <= now; t += intervalMs) {
    const hourOfDay = new Date(t).getHours();
    const isNight = hourOfDay >= 22 || hourOfDay < 6;
    const isExercise = (hourOfDay >= 7 && hourOfDay < 8) || (hourOfDay >= 17 && hourOfDay < 18);

    // Simulate BPM with circadian rhythm
    if (isNight) {
      bpm += (Math.random() - 0.5) * 2;
      bpm = Math.max(55, Math.min(70, bpm));
    } else if (isExercise) {
      bpm += (Math.random() - 0.5) * 6;
      bpm = Math.max(95, Math.min(140, bpm));
    } else {
      bpm += (Math.random() - 0.5) * 3;
      bpm = Math.max(65, Math.min(90, bpm));
    }

    spo2 += (Math.random() - 0.5) * 0.6;
    spo2 = Math.max(94, Math.min(99, spo2));

    const ax = (Math.random() - 0.5) * 0.1;
    const ay = (Math.random() - 0.5) * 0.1;
    const az = 0.98 + (Math.random() - 0.5) * 0.1;
    const accel = Math.sqrt(ax ** 2 + ay ** 2 + az ** 2);

    let activity = "resting";
    if (isExercise) activity = "exercising";
    else if (!isNight && Math.random() > 0.7) activity = "walking";

    batch.push({
      bpm: Math.round(bpm),
      spo2: Math.round(spo2),
      ax: parseFloat(ax.toFixed(2)),
      ay: parseFloat(ay.toFixed(2)),
      az: parseFloat(az.toFixed(2)),
      gx: parseFloat((Math.random() * 0.1).toFixed(2)),
      gy: parseFloat((Math.random() * 0.1).toFixed(2)),
      gz: parseFloat((Math.random() * 0.1).toFixed(2)),
      accel: parseFloat(accel.toFixed(2)),
      fall: false,
      activity,
      timestamp: t,
      serverTimestamp: t,
    });
  }

  // Write in batches of 50
  for (let i = 0; i < batch.length; i++) {
    await addDoc(readingsRef, batch[i]);
    count++;
    if (count % 50 === 0) {
      process.stdout.write(`  📝 ${count}/${batch.length} readings written...\r`);
    }
  }
  console.log(`  ✅ ${count} readings written!                    `);

  // 4. Create sample alerts
  console.log("\n🚨 Creating sample alerts...");

  const alertsRef = collection(db, "patients", "PATIENT_001", "alerts");

  await addDoc(alertsRef, {
    type: "abnormalBpm",
    bpm: 132,
    spo2: 96,
    accel: 2.4,
    activity: "exercising",
    timestamp: now - 2 * 60 * 60 * 1000,
    status: "active",
  });
  console.log("  ✅ Alert: Abnormal BPM (132) — active");

  await addDoc(alertsRef, {
    type: "lowSpo2",
    bpm: 78,
    spo2: 91,
    accel: 1.0,
    activity: "resting",
    timestamp: now - 5 * 60 * 60 * 1000,
    status: "active",
  });
  console.log("  ✅ Alert: Low SpO2 (91%) — active");

  await addDoc(alertsRef, {
    type: "fall",
    bpm: 88,
    spo2: 95,
    accel: 4.2,
    activity: "walking",
    timestamp: now - 12 * 60 * 60 * 1000,
    status: "resolved",
  });
  console.log("  ✅ Alert: Fall detected — resolved");

  await addDoc(alertsRef, {
    type: "abnormalBpm",
    bpm: 45,
    spo2: 97,
    accel: 0.98,
    activity: "resting",
    timestamp: now - 24 * 60 * 60 * 1000,
    status: "resolved",
  });
  console.log("  ✅ Alert: Low BPM (45) — resolved");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Seeding complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nLogin credentials:");
  console.log("  Patient:   patient@neuropulse.ai / NeuroPulse123!");
  console.log("  Doctor:    doctor@neuropulse.ai / NeuroPulse123!");
  console.log("  Caregiver: caregiver@neuropulse.ai / NeuroPulse123!");
  console.log("");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
