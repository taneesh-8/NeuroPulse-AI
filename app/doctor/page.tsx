"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  getDemoUserProfile,
  getDemoPatients,
  generateDemoReadings,
  getDemoAlerts,
  type DemoReading,
  type DemoAlert,
} from "@/lib/demoData";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import PatientSelector from "@/components/PatientSelector";
import BPMCard from "@/components/BPMCard";
import SpO2Gauge from "@/components/SpO2Gauge";
import ReadingsChart from "@/components/ReadingsChart";
import AlertsList from "@/components/AlertsList";
import { Download, TrendingUp, Heart, Wind, AlertTriangle, FileText } from "lucide-react";
import GamificationPanel from "@/components/GamificationPanel";

const HeartModel3D = dynamic(() => import("@/components/HeartModel3D"), {
  ssr: false,
  loading: () => (
    <div className="np-card">
      <div className="skeleton h-72 rounded-xl" />
    </div>
  ),
});

interface Patient {
  id: string;
  name: string;
}

interface Reading {
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

interface Alert {
  id: string;
  type: string;
  bpm?: number;
  spo2?: number;
  accel?: number;
  activity?: string;
  timestamp: number;
  status: "active" | "resolved";
}

export default function DoctorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [chartData, setChartData] = useState<Reading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({ avgBpm: 0, avgSpo2: 0, fallCount: 0 });
  const [exporting, setExporting] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [usingDemoData, setUsingDemoData] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      // Try Firestore first, fallback to demo data
      let userData = null;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "doctor") {
          userData = userDoc.data();
        }
      } catch (err) {
        console.warn("Firestore read failed, using demo data:", err);
      }

      if (userData) {
        setUserName(userData.name || user.email || "");
        const linkedPatients: string[] = userData.linkedPatients || [];

        const patientList: Patient[] = [];
        for (const pId of linkedPatients) {
          try {
            const pDoc = await getDoc(doc(db, "patients", pId));
            if (pDoc.exists()) {
              patientList.push({ id: pId, name: pDoc.data().name || pId });
            } else {
              patientList.push({ id: pId, name: pId });
            }
          } catch {
            patientList.push({ id: pId, name: pId });
          }
        }

        setPatients(patientList);
        if (patientList.length > 0) {
          setSelectedPatientId(patientList[0].id);
        }
      } else {
        // Check localStorage role
        const storedRole = localStorage.getItem("np_user_role");
        if (storedRole !== "doctor") {
          router.push("/login");
          return;
        }
        const demoProfile = getDemoUserProfile("doctor");
        setUserName(demoProfile.name);
        const demoPatients = getDemoPatients();
        setPatients(demoPatients);
        if (demoPatients.length > 0) {
          setSelectedPatientId(demoPatients[0].id);
        }
        setUsingDemoData(true);

        // Load demo data
        const demoReadings = generateDemoReadings(168); // 7 days
        setChartData(demoReadings as Reading[]);
        if (demoReadings.length > 0) {
          setLatestReading(demoReadings[demoReadings.length - 1] as Reading);
          const validBpm = demoReadings.filter((r) => r.bpm > 0);
          const validSpo2 = demoReadings.filter((r) => r.spo2 !== -1 && r.spo2 > 0);
          setStats({
            avgBpm: validBpm.length > 0
              ? Math.round(validBpm.reduce((s, r) => s + r.bpm, 0) / validBpm.length)
              : 0,
            avgSpo2: validSpo2.length > 0
              ? Math.round(validSpo2.reduce((s, r) => s + r.spo2, 0) / validSpo2.length)
              : 0,
            fallCount: demoReadings.filter((r) => r.fall).length,
          });
        }
        setAlerts(getDemoAlerts() as Alert[]);
      }

      setLoading(false);
    });

    return () => unsubAuth();
  }, [router]);

  useEffect(() => {
    if (!selectedPatientId || usingDemoData) return;

    const readingsRef = collection(db, "patients", selectedPatientId, "readings");

    let unsubLatest: (() => void) | null = null;
    let unsubChart: (() => void) | null = null;
    let unsubAlerts: (() => void) | null = null;

    try {
      const latestQ = query(readingsRef, orderBy("serverTimestamp", "desc"), limit(1));

      unsubLatest = onSnapshot(
        latestQ,
        (snap) => {
          if (!snap.empty) {
            setLatestReading(snap.docs[0].data() as Reading);
          }
        },
        (err) => {
          console.warn("Firestore latest reading failed, loading demo data:", err);
          loadDemoFallback();
        }
      );

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const chartQ = query(
        readingsRef,
        where("serverTimestamp", ">=", sevenDaysAgo),
        orderBy("serverTimestamp", "asc"),
        limit(5000)
      );

      unsubChart = onSnapshot(
        chartQ,
        (snap) => {
          const readings = snap.docs.map((d) => d.data() as Reading);
          setChartData(readings);

          if (readings.length > 0) {
            const validBpm = readings.filter((r) => r.bpm > 0);
            const validSpo2 = readings.filter((r) => r.spo2 !== -1 && r.spo2 > 0);
            const fallsThisWeek = readings.filter((r) => r.fall === true);

            setStats({
              avgBpm:
                validBpm.length > 0
                  ? Math.round(validBpm.reduce((s, r) => s + r.bpm, 0) / validBpm.length)
                  : 0,
              avgSpo2:
                validSpo2.length > 0
                  ? Math.round(validSpo2.reduce((s, r) => s + r.spo2, 0) / validSpo2.length)
                  : 0,
              fallCount: fallsThisWeek.length,
            });
          }
        },
        (err) => {
          console.warn("Firestore chart snapshot failed:", err);
        }
      );

      const alertsRef = collection(db, "patients", selectedPatientId, "alerts");
      const alertsQ = query(alertsRef, orderBy("timestamp", "desc"), limit(50));

      unsubAlerts = onSnapshot(
        alertsQ,
        (snap) => {
          setAlerts(
            snap.docs.map((d) => ({ id: d.id, ...d.data() } as Alert))
          );
        },
        (err) => {
          console.warn("Firestore alerts snapshot failed:", err);
          setAlerts(getDemoAlerts() as Alert[]);
        }
      );
    } catch (err) {
      console.warn("Firestore query setup failed:", err);
      loadDemoFallback();
    }

    return () => {
      if (unsubLatest) unsubLatest();
      if (unsubChart) unsubChart();
      if (unsubAlerts) unsubAlerts();
    };
  }, [selectedPatientId, usingDemoData]);

  function loadDemoFallback() {
    setUsingDemoData(true);
    const demoReadings = generateDemoReadings(168);
    setChartData(demoReadings as Reading[]);
    if (demoReadings.length > 0) {
      setLatestReading(demoReadings[demoReadings.length - 1] as Reading);
      const validBpm = demoReadings.filter((r) => r.bpm > 0);
      const validSpo2 = demoReadings.filter((r) => r.spo2 !== -1 && r.spo2 > 0);
      setStats({
        avgBpm: validBpm.length > 0
          ? Math.round(validBpm.reduce((s, r) => s + r.bpm, 0) / validBpm.length)
          : 0,
        avgSpo2: validSpo2.length > 0
          ? Math.round(validSpo2.reduce((s, r) => s + r.spo2, 0) / validSpo2.length)
          : 0,
        fallCount: demoReadings.filter((r) => r.fall).length,
      });
    }
    setAlerts(getDemoAlerts() as Alert[]);
  }

  const handleExportReport = useCallback(async () => {
    if (!selectedPatientId || chartData.length === 0) return;
    setExporting(true);
    try {
      const patient = patients.find(p => p.id === selectedPatientId);
      const now = new Date();

      // Clinical flags
      const flagReading = (r: Reading) => {
        const flags: string[] = [];
        if (r.bpm > 100) flags.push("Tachycardia");
        if (r.bpm > 0 && r.bpm < 60) flags.push("Bradycardia");
        if (r.spo2 !== -1 && r.spo2 < 94) flags.push("Hypoxia");
        if (r.fall === true) flags.push("Fall Event");
        return flags.length > 0 ? flags.join(", ") : "Normal";
      };

      // Stats
      const validBpm = chartData.filter(r => r.bpm > 0);
      const validSpo2 = chartData.filter(r => r.spo2 !== -1);
      const avgBpm = validBpm.length ? Math.round(validBpm.reduce((s, r) => s + r.bpm, 0) / validBpm.length) : 0;
      const avgSpo2 = validSpo2.length ? Math.round(validSpo2.reduce((s, r) => s + r.spo2, 0) / validSpo2.length) : 0;
      const maxBpm = validBpm.length ? Math.max(...validBpm.map(r => r.bpm)) : 0;
      const minBpm = validBpm.length ? Math.min(...validBpm.map(r => r.bpm)) : 0;
      const minSpo2 = validSpo2.length ? Math.min(...validSpo2.map(r => r.spo2)) : 0;
      const fallCount = chartData.filter(r => r.fall).length;
      const tachyCount = chartData.filter(r => r.bpm > 100).length;
      const bradyCount = chartData.filter(r => r.bpm > 0 && r.bpm < 60).length;
      const hypoxiaCount = chartData.filter(r => r.spo2 !== -1 && r.spo2 < 94).length;

      // Build report text
      let report = "";
      report += "═══════════════════════════════════════════════════════\n";
      report += "          🧠 NeuroPulse AI — Clinical Report\n";
      report += "═══════════════════════════════════════════════════════\n\n";
      report += `Report Generated: ${now.toLocaleString()}\n`;
      report += `Doctor: ${userName}\n`;
      report += `Patient: ${patient?.name || selectedPatientId}\n`;
      report += `Period: Last 7 Days (${chartData.length} readings)\n\n`;

      report += "───────────────────────────────────────────────────────\n";
      report += "  SUMMARY STATISTICS\n";
      report += "───────────────────────────────────────────────────────\n\n";
      report += `  Average Heart Rate:    ${avgBpm} BPM\n`;
      report += `  Heart Rate Range:      ${minBpm} — ${maxBpm} BPM\n`;
      report += `  Average SpO2:          ${avgSpo2}%\n`;
      report += `  Lowest SpO2:           ${minSpo2}%\n\n`;

      report += "───────────────────────────────────────────────────────\n";
      report += "  CLINICAL FLAGS SUMMARY\n";
      report += "───────────────────────────────────────────────────────\n\n";
      report += `  Tachycardia Events (BPM > 100):  ${tachyCount}\n`;
      report += `  Bradycardia Events (BPM < 60):   ${bradyCount}\n`;
      report += `  Hypoxia Events (SpO2 < 94%):     ${hypoxiaCount}\n`;
      report += `  Fall Events:                     ${fallCount}\n\n`;

      if (tachyCount > 0 || bradyCount > 0 || hypoxiaCount > 0 || fallCount > 0) {
        report += "  ⚠️  ATTENTION: Clinical anomalies detected.\n";
        report += "  Review flagged readings below.\n\n";
      } else {
        report += "  ✅  No clinical anomalies detected in this period.\n\n";
      }

      report += "───────────────────────────────────────────────────────\n";
      report += "  DETAILED READINGS (CSV)\n";
      report += "───────────────────────────────────────────────────────\n\n";
      report += "Timestamp,BPM,SpO2(%),Activity,Accel(g),Fall,Clinical Flag\n";

      chartData.forEach(r => {
        const ts = new Date(r.serverTimestamp || r.timestamp).toLocaleString();
        const spo2Val = r.spo2 === -1 ? "N/A" : String(r.spo2);
        report += `${ts},${r.bpm},${spo2Val},${r.activity},${r.accel?.toFixed(2) || "0"},${r.fall},${flagReading(r)}\n`;
      });

      report += "\n═══════════════════════════════════════════════════════\n";
      report += "  Report by NeuroPulse AI — Real-time Health Monitoring\n";
      report += "═══════════════════════════════════════════════════════\n";

      // Download
      const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NeuroPulse_Clinical_Report_${patient?.name?.replace(/\s/g, "_") || selectedPatientId}_${now.toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Clinical report downloaded!");
    } catch (err) {
      console.error("Report generation failed:", err);
      toast.error("Failed to generate report");
    } finally {
      setExporting(false);
    }
  }, [selectedPatientId, chartData, patients, userName]);

  const r = latestReading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="doctor" userName={userName} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Doctor{" "}
              <span className="bg-gradient-to-r from-violet to-primary bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor your patients in real-time
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PatientSelector
              patients={patients}
              selectedId={selectedPatientId}
              onSelect={setSelectedPatientId}
            />
            <button
              onClick={handleExportReport}
              disabled={exporting}
              className="np-button np-button-outline"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Generating..." : "Clinical Report"}
            </button>
          </div>
        </div>

        {usingDemoData && (
          <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm animate-fade-in">
            📊 Showing demo data — Firestore connection unavailable
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="np-card flex items-center gap-4 animate-slide-in">
            <div className="p-3 rounded-xl bg-alert-red/10">
              <Heart className="w-6 h-6 text-alert-red" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Avg BPM (7d)
              </p>
              <p className="live-value text-2xl text-foreground">{stats.avgBpm || "—"}</p>
            </div>
          </div>
          <div className="np-card flex items-center gap-4 animate-slide-in" style={{ animationDelay: "50ms" }}>
            <div className="p-3 rounded-xl bg-primary/10">
              <Wind className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Avg SpO2 (7d)
              </p>
              <p className="live-value text-2xl text-foreground">
                {stats.avgSpo2 ? `${stats.avgSpo2}%` : "—"}
              </p>
            </div>
          </div>
          <div className="np-card flex items-center gap-4 animate-slide-in" style={{ animationDelay: "100ms" }}>
            <div className="p-3 rounded-xl bg-warning-yellow/10">
              <AlertTriangle className="w-6 h-6 text-warning-yellow" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Falls (7d)
              </p>
              <p className="live-value text-2xl text-foreground">{stats.fallCount}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="animate-slide-in" style={{ animationDelay: "150ms" }}>
            <HeartModel3D bpm={r?.bpm ?? 72} spo2={r?.spo2} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="animate-slide-in" style={{ animationDelay: "200ms" }}>
              <BPMCard bpm={r?.bpm ?? 0} loading={loading} />
            </div>
            <div className="animate-slide-in" style={{ animationDelay: "250ms" }}>
              <SpO2Gauge spo2={r?.spo2 ?? -1} loading={loading} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="animate-slide-in" style={{ animationDelay: "300ms" }}>
            <ReadingsChart
              data={chartData}
              type="bpm"
              title="Heart Rate — Last 7 Days"
              loading={loading}
              height={280}
            />
          </div>
          <div className="animate-slide-in" style={{ animationDelay: "350ms" }}>
            <ReadingsChart
              data={chartData}
              type="spo2"
              title="Blood Oxygen — Last 7 Days"
              loading={loading}
              height={280}
            />
          </div>
        </div>

        <div className="animate-slide-in" style={{ animationDelay: "400ms" }}>
          <AlertsList alerts={alerts} loading={loading} />
        </div>

        {/* Gamification + Doctor Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="animate-slide-in" style={{ animationDelay: "450ms" }}>
            {selectedPatientId && <GamificationPanel patientId={selectedPatientId} />}
          </div>
          <div className="animate-slide-in" style={{ animationDelay: "500ms" }}>
            <div className="np-card">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Doctor Notes
              </h3>
              <textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Write clinical notes for this patient..."
                className="np-input w-full h-40 resize-none text-sm"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={async () => {
                    if (!selectedPatientId) return;
                    setSavingNotes(true);
                    try {
                      const { doc: firestoreDoc, setDoc } = await import("firebase/firestore");
                      const { db: fireDb } = await import("@/lib/firebase");
                      await setDoc(
                        firestoreDoc(fireDb, "patients", selectedPatientId, "doctorNotes", "latest"),
                        { content: doctorNotes, updatedAt: Date.now() },
                        { merge: true }
                      );
                      const { toast } = await import("sonner");
                      toast.success("Notes saved");
                    } catch {
                      // In demo mode, just show success
                      if (usingDemoData) {
                        toast.success("Notes saved (demo mode)");
                      } else {
                        toast.error("Failed to save notes");
                      }
                    } finally {
                      setSavingNotes(false);
                    }
                  }}
                  disabled={savingNotes}
                  className="np-button np-button-primary text-sm"
                >
                  {savingNotes ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
