import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const patientId = url.searchParams.get("patientId");
    const days = parseInt(url.searchParams.get("days") || "7", 10);

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "Missing patientId" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const readingsSnap = await db
      .collection("patients")
      .doc(patientId)
      .collection("readings")
      .where("serverTimestamp", ">=", cutoff)
      .orderBy("serverTimestamp", "asc")
      .limit(10000)
      .get();

    const readings = readingsSnap.docs.map((doc) => {
      const d = doc.data();

      // Clinical flags
      const flags: string[] = [];
      if (d.bpm > 100) flags.push("Tachycardia");
      if (d.bpm > 0 && d.bpm < 60) flags.push("Bradycardia");
      if (d.spo2 !== -1 && d.spo2 < 94) flags.push("Hypoxia");
      if (d.fall === true) flags.push("Fall Event");

      return {
        ...d,
        clinicalFlags: flags.length > 0 ? flags.join(", ") : "Normal",
      };
    });

    return NextResponse.json({ success: true, readings, count: readings.length });
  } catch (error) {
    console.error("Readings API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
