import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, exerciseName, accuracy, timestamp } = body;

    if (!patientId || !exerciseName || accuracy === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: patientId, exerciseName, accuracy" },
        { status: 400 }
      );
    }

    const acc = Math.max(0, Math.min(100, Math.round(accuracy)));

    let pointsEarned = 0;
    if (acc >= 80) pointsEarned = 10;
    else if (acc >= 60) pointsEarned = 5;

    const db = getAdminDb();

    // Write exercise session
    const exerciseRef = db
      .collection("patients")
      .doc(patientId)
      .collection("exercises");

    await exerciseRef.add({
      exerciseName,
      accuracy: acc,
      pointsEarned,
      timestamp: timestamp || Date.now(),
      serverTimestamp: Date.now(),
    });

    // Update total points on patient doc
    const patientRef = db.collection("patients").doc(patientId);
    await patientRef.update({
      totalPoints: FieldValue.increment(pointsEarned),
    });

    // Get updated total
    const patientSnap = await patientRef.get();
    const totalPoints = patientSnap.exists
      ? (patientSnap.data()?.totalPoints ?? pointsEarned)
      : pointsEarned;

    return NextResponse.json({
      success: true,
      pointsEarned,
      totalPoints,
      accuracy: acc,
    });
  } catch (error) {
    console.error("Exercise API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
