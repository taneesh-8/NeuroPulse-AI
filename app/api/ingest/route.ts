import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Try to get Admin Firestore, fallback to REST API if not configured
function getDb() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    if (getApps().length === 0) {
      initializeApp({ credential: cert(JSON.parse(json)) });
    }
    return getFirestore();
  }
  return null;
}

interface ReadingPayload {
  patientId: string;
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
}

function validatePayload(body: unknown): body is ReadingPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.patientId === "string" &&
    typeof b.bpm === "number" &&
    typeof b.spo2 === "number" &&
    typeof b.ax === "number" &&
    typeof b.ay === "number" &&
    typeof b.az === "number" &&
    typeof b.gx === "number" &&
    typeof b.gy === "number" &&
    typeof b.gz === "number" &&
    typeof b.accel === "number" &&
    typeof b.fall === "boolean" &&
    typeof b.activity === "string" &&
    typeof b.timestamp === "number"
  );
}

// Write to Firestore via REST API (no Admin SDK needed)
async function writeToFirestoreREST(
  projectId: string,
  collectionPath: string,
  data: Record<string, unknown>
) {
  // Convert JS values to Firestore REST format
  function toFirestoreValue(val: unknown): Record<string, unknown> {
    if (typeof val === "string") return { stringValue: val };
    if (typeof val === "number") {
      if (Number.isInteger(val)) return { integerValue: String(val) };
      return { doubleValue: val };
    }
    if (typeof val === "boolean") return { booleanValue: val };
    if (val === null || val === undefined) return { nullValue: null };
    return { stringValue: String(val) };
  }

  const fields: Record<string, Record<string, unknown>> = {};
  for (const [key, val] of Object.entries(data)) {
    fields[key] = toFirestoreValue(val);
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionPath}`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore REST write failed: ${res.status} ${err}`);
  }
  return await res.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!validatePayload(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload - missing or invalid fields" },
        { status: 400 }
      );
    }

    const {
      patientId, bpm, spo2, ax, ay, az, gx, gy, gz, accel, fall, activity, timestamp,
    } = body;

    const serverTimestamp = Date.now();

    const readingData = {
      bpm, spo2, ax, ay, az, gx, gy, gz, accel, fall, activity, timestamp, serverTimestamp,
    };

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "neuropulse-ai-fa974";
    const db = getDb();

    // Write reading to Firestore
    if (db) {
      // Use Admin SDK
      await db.collection("patients").doc(patientId).collection("readings").add(readingData);
    } else {
      // Use REST API (no Admin SDK)
      await writeToFirestoreREST(projectId, `patients/${patientId}/readings`, readingData);
    }

    // Check for alerts
    let alertTriggered = false;
    const alerts: { type: string; data: Record<string, unknown> }[] = [];

    if (fall === true) {
      alerts.push({
        type: "fall",
        data: { bpm, spo2, accel, activity, timestamp: serverTimestamp },
      });
    }

    if (spo2 < 94 && spo2 !== -1) {
      alerts.push({
        type: "lowSpo2",
        data: { bpm, spo2, accel, activity, timestamp: serverTimestamp },
      });
    }

    if (bpm < 50 || bpm > 120) {
      // Skip alert if bpm is 0 (no finger on sensor)
      if (bpm > 0) {
        alerts.push({
          type: "abnormalBpm",
          data: { bpm, spo2, accel, activity, timestamp: serverTimestamp },
        });
      }
    }

    if (alerts.length > 0) {
      alertTriggered = true;

      for (const alert of alerts) {
        // Write alert to Firestore
        const alertData = { type: alert.type, ...alert.data, status: "active" };
        if (db) {
          await db.collection("patients").doc(patientId).collection("alerts").add(alertData);
        } else {
          await writeToFirestoreREST(projectId, `patients/${patientId}/alerts`, alertData);
        }

        // Send WhatsApp notification
        try {
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : `http://localhost:3000`;

          await fetch(`${baseUrl}/api/alert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientId,
              patientName: "John Doe",
              type: alert.type,
              ...alert.data,
            }),
          });
        } catch (alertError) {
          console.error("Failed to send alert notification:", alertError);
        }
      }
    }

    return NextResponse.json({ success: true, alertTriggered });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
