/**
 * Demo/fallback data — used when Firestore reads fail due to security rules.
 * This ensures the app works for demo purposes even without Firestore access.
 */

export interface DemoReading {
  bpm: number;
  spo2: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  accel: number;
  fall: boolean;
  activity: string;
  timestamp: number;
  serverTimestamp: number;
}

export interface DemoAlert {
  id: string;
  type: string;
  bpm?: number;
  spo2?: number;
  accel?: number;
  activity?: string;
  timestamp: number;
  status: "active" | "resolved";
}

export interface DemoUserProfile {
  name: string;
  role: string;
  phone: string;
  linkedPatients: string[];
}

export interface DemoPatient {
  id: string;
  name: string;
}

/** Derive the user role from their email address */
export function getRoleFromEmail(email: string): string | null {
  const lower = email.toLowerCase();
  if (lower.startsWith("patient")) return "patient";
  if (lower.startsWith("doctor")) return "doctor";
  if (lower.startsWith("caregiver")) return "caregiver";
  return null;
}

/** Get a demo user profile based on role */
export function getDemoUserProfile(role: string): DemoUserProfile {
  switch (role) {
    case "patient":
      return {
        name: "John Doe",
        role: "patient",
        phone: "+1234567890",
        linkedPatients: ["PATIENT_001"],
      };
    case "doctor":
      return {
        name: "Dr. Sarah Chen",
        role: "doctor",
        phone: "+1234567891",
        linkedPatients: ["PATIENT_001"],
      };
    case "caregiver":
      return {
        name: "Jane Doe",
        role: "caregiver",
        phone: "+1234567892",
        linkedPatients: ["PATIENT_001"],
      };
    default:
      return {
        name: "User",
        role: role,
        phone: "",
        linkedPatients: ["PATIENT_001"],
      };
  }
}

/** Get demo patient list */
export function getDemoPatients(): DemoPatient[] {
  return [{ id: "PATIENT_001", name: "John Doe" }];
}

/** Generate realistic demo readings for the last N hours */
export function generateDemoReadings(hours: number = 72): DemoReading[] {
  const now = Date.now();
  const intervalMs = 10 * 60 * 1000; // every 10 minutes
  const durationMs = hours * 60 * 60 * 1000;
  const readings: DemoReading[] = [];

  let bpm = 72;
  let spo2 = 97;

  for (let t = now - durationMs; t <= now; t += intervalMs) {
    const hourOfDay = new Date(t).getHours();
    const isNight = hourOfDay >= 22 || hourOfDay < 6;
    const isExercise =
      (hourOfDay >= 7 && hourOfDay < 8) ||
      (hourOfDay >= 17 && hourOfDay < 18);

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

    readings.push({
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

  return readings;
}

/** Get demo alerts */
export function getDemoAlerts(): DemoAlert[] {
  const now = Date.now();
  return [
    {
      id: "demo-alert-1",
      type: "abnormalBpm",
      bpm: 132,
      spo2: 96,
      accel: 2.4,
      activity: "exercising",
      timestamp: now - 2 * 60 * 60 * 1000,
      status: "active",
    },
    {
      id: "demo-alert-2",
      type: "lowSpo2",
      bpm: 78,
      spo2: 91,
      accel: 1.0,
      activity: "resting",
      timestamp: now - 5 * 60 * 60 * 1000,
      status: "active",
    },
    {
      id: "demo-alert-3",
      type: "fall",
      bpm: 88,
      spo2: 95,
      accel: 4.2,
      activity: "walking",
      timestamp: now - 12 * 60 * 60 * 1000,
      status: "resolved",
    },
    {
      id: "demo-alert-4",
      type: "abnormalBpm",
      bpm: 45,
      spo2: 97,
      accel: 0.98,
      activity: "resting",
      timestamp: now - 24 * 60 * 60 * 1000,
      status: "resolved",
    },
  ];
}
