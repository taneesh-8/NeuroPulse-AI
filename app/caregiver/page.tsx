"use client";

import { useEffect, useState } from "react";
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
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import PatientSelector from "@/components/PatientSelector";
import AlertsList from "@/components/AlertsList";
import QuickActions from "@/components/QuickActions";
import ReadingsChart from "@/components/ReadingsChart";
import VitalGuide from "@/components/VitalGuide";
import FallFirstAid from "@/components/FallFirstAid";
import { Send, Loader2, Phone, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

const HeartModel3D = dynamic(() => import("@/components/HeartModel3D"), {
  ssr: false,
  loading: () => <div className="np-card"><div className="skeleton h-72 rounded-xl" /></div>,
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

export default function CaregiverDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [recentReadings, setRecentReadings] = useState<Reading[]>([]);
  const [doctorPhone, setDoctorPhone] = useState("");

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "caregiver") {
        router.push("/login");
        return;
      }

      const userData = userDoc.data();
      setUserName(userData.name || user.email || "");
      const linkedPatients: string[] = userData.linkedPatients || [];

      const patientList: Patient[] = [];
      for (const pId of linkedPatients) {
        const pDoc = await getDoc(doc(db, "patients", pId));
        if (pDoc.exists()) {
          patientList.push({ id: pId, name: pDoc.data().name || pId });
          // Get doctor phone
          const doctorIds = pDoc.data().assignedDoctors || [];
          if (doctorIds.length > 0) {
            const docDoc = await getDoc(doc(db, "users", doctorIds[0]));
            if (docDoc.exists()) {
              setDoctorPhone(docDoc.data().phone || "");
            }
          }
        } else {
          patientList.push({ id: pId, name: pId });
        }
      }

      setPatients(patientList);
      if (patientList.length > 0) {
        setSelectedPatientId(patientList[0].id);
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, [router]);

  useEffect(() => {
    if (!selectedPatientId) return;

    const readingsRef = collection(db, "patients", selectedPatientId, "readings");
    const latestQ = query(readingsRef, orderBy("serverTimestamp", "desc"), limit(1));

    const unsubLatest = onSnapshot(latestQ, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data() as Reading;
        setLatestReading(data);

        if (data.fall) {
          toast.error("⚠️ Fall Detected!", {
            description: "Your patient may need immediate assistance.",
          });
        }
      }
    });

    // 30-minute chart data
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const recentQ = query(
      readingsRef,
      where("serverTimestamp", ">=", thirtyMinAgo),
      orderBy("serverTimestamp", "asc"),
      limit(500)
    );

    const unsubRecent = onSnapshot(recentQ, (snap) => {
      setRecentReadings(snap.docs.map(d => d.data() as Reading));
    });

    const alertsRef = collection(db, "patients", selectedPatientId, "alerts");
    const alertsQ = query(alertsRef, orderBy("timestamp", "desc"), limit(10));

    const unsubAlerts = onSnapshot(alertsQ, (snap) => {
      const newAlerts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Alert));
      setAlerts(newAlerts);
    });

    return () => {
      unsubLatest();
      unsubRecent();
      unsubAlerts();
    };
  }, [selectedPatientId]);

  const handleResolveAlert = async (alertId: string) => {
    if (!selectedPatientId) return;
    try {
      const alertRef = doc(db, "patients", selectedPatientId, "alerts", alertId);
      await updateDoc(alertRef, { status: "resolved" });
      toast.success("Alert marked as resolved");
    } catch (error) {
      console.error("Resolve alert error:", error);
      toast.error("Failed to resolve alert");
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selectedPatientId || !latestReading) return;
    setSendingWhatsApp(true);

    try {
      const res = await fetch("/api/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          type: "abnormalBpm",
          bpm: latestReading.bpm,
          spo2: latestReading.spo2,
          accel: latestReading.accel,
          activity: latestReading.activity,
          timestamp: Date.now(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (json.twilioSent) {
          toast.success("WhatsApp alert sent via Twilio!");
        } else if (json.whatsappUrl) {
          window.open(json.whatsappUrl, "_blank");
          toast.success("Opening WhatsApp with alert message...");
        }
      } else {
        toast.error("Failed to send WhatsApp alert");
      }
    } catch (error) {
      console.error("WhatsApp send error:", error);
      toast.error("Failed to send WhatsApp alert");
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const r = latestReading;
  const activeAlerts = alerts.filter((a) => a.status === "active");
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // Status badge
  const getStatus = () => {
    if (!r) return { label: "LOADING", color: "text-muted-foreground", bg: "bg-card-border/20", Icon: ShieldCheck };
    if (r.fall || (r.spo2 !== -1 && r.spo2 < 94) || r.bpm > 120 || r.bpm < 50)
      return { label: "CRITICAL", color: "text-alert-red", bg: "bg-alert-red/10 border-alert-red/20", Icon: ShieldX };
    if (r.bpm > 100 || (r.spo2 !== -1 && r.spo2 < 95))
      return { label: "WARNING", color: "text-warning-yellow", bg: "bg-warning-yellow/10 border-warning-yellow/20", Icon: ShieldAlert };
    return { label: "SAFE", color: "text-safe-green", bg: "bg-safe-green/10 border-safe-green/20", Icon: ShieldCheck };
  };
  const status = getStatus();

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="caregiver" userName={userName} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Caregiver{" "}
              <span className="bg-gradient-to-r from-safe-green to-primary bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Real-time patient monitoring & alert management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${status.bg}`}>
              <status.Icon className={`w-4 h-4 ${status.color}`} />
              <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
            </div>
            <PatientSelector
              patients={patients}
              selectedId={selectedPatientId}
              onSelect={setSelectedPatientId}
            />
          </div>
        </div>

        {/* Fall First Aid Panel — only visible when fall detected */}
        <FallFirstAid
          visible={r?.fall === true}
          patientName={selectedPatient?.name || "Patient"}
          bpm={r?.bpm ?? 0}
          spo2={r?.spo2 ?? -1}
          onResolve={() => {
            const fallAlert = alerts.find(a => a.type === "fall" && a.status === "active");
            if (fallAlert) handleResolveAlert(fallAlert.id);
          }}
        />

        {/* Live status card */}
        <div className="np-card mb-6 animate-slide-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedPatient?.name || "Patient"} — Live Status
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-safe-green animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  Connected • Live data
                </span>
              </div>
            </div>
            <button
              onClick={handleSendWhatsApp}
              disabled={sendingWhatsApp || !latestReading}
              className="np-button np-button-primary disabled:opacity-50"
            >
              {sendingWhatsApp ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                <><Phone className="w-4 h-4" /> Send WhatsApp</>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-background/50 rounded-xl p-4 border border-card-border text-center">
              <p className="text-xs text-muted-foreground mb-1">❤️ BPM</p>
              <p className={`live-value text-3xl ${
                (r?.bpm ?? 0) >= 120 ? "text-alert-red glow-red"
                : (r?.bpm ?? 0) >= 100 ? "text-warning-yellow glow-yellow"
                : "text-safe-green glow-green"
              }`} key={r?.bpm}>
                {r?.bpm ?? "—"}
              </p>
            </div>
            <div className="bg-background/50 rounded-xl p-4 border border-card-border text-center">
              <p className="text-xs text-muted-foreground mb-1">🫁 SpO2</p>
              <p className={`live-value text-3xl ${
                (r?.spo2 ?? -1) === -1 ? "text-muted"
                : (r?.spo2 ?? 0) < 94 ? "text-alert-red glow-red"
                : "text-safe-green glow-green"
              }`} key={r?.spo2}>
                {r?.spo2 === -1 ? "N/A" : r?.spo2 ?? "—"}
                {r?.spo2 !== undefined && r?.spo2 !== -1 ? "%" : ""}
              </p>
            </div>
            <div className="bg-background/50 rounded-xl p-4 border border-card-border text-center">
              <p className="text-xs text-muted-foreground mb-1">📊 Activity</p>
              <p className="text-lg font-semibold text-primary capitalize mt-1">
                {r?.activity ?? "—"}
              </p>
            </div>
            <div className="bg-background/50 rounded-xl p-4 border border-card-border text-center">
              <p className="text-xs text-muted-foreground mb-1">⚡ Fall</p>
              <p className={`text-lg font-bold mt-1 ${
                r?.fall ? "text-alert-red glow-red" : "text-safe-green glow-green"
              }`}>
                {r?.fall ? "ALERT" : "OK"}
              </p>
            </div>
          </div>
        </div>

        {/* Vital Signs Reference Guide */}
        <div className="mb-6">
          <VitalGuide
            bpm={r?.bpm ?? 0}
            spo2={r?.spo2 ?? -1}
            activity={r?.activity ?? "resting"}
          />
        </div>

        {/* 3D Heart + 30-min charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="animate-slide-in" style={{ animationDelay: "50ms" }}>
            <HeartModel3D bpm={r?.bpm ?? 72} spo2={r?.spo2} showControls={false} />
          </div>
          <div className="space-y-4">
            <div className="animate-slide-in" style={{ animationDelay: "100ms" }}>
              <ReadingsChart
                data={recentReadings}
                type="bpm"
                title="BPM — Last 30 Minutes"
                loading={loading}
                height={180}
              />
            </div>
            <div className="animate-slide-in" style={{ animationDelay: "150ms" }}>
              <ReadingsChart
                data={recentReadings}
                type="spo2"
                title="SpO2 — Last 30 Minutes"
                loading={loading}
                height={180}
              />
            </div>
          </div>
        </div>

        {/* Active alerts banner */}
        {activeAlerts.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-alert-red/10 border border-alert-red/20 flex items-center gap-3 animate-fade-in">
            <span className="text-xl">🚨</span>
            <p className="text-sm text-alert-red font-medium">
              {activeAlerts.length} active alert{activeAlerts.length > 1 ? "s" : ""} require
              your attention
            </p>
          </div>
        )}

        {/* Alerts list */}
        <div className="mb-6 animate-slide-in" style={{ animationDelay: "200ms" }}>
          <AlertsList
            alerts={alerts}
            loading={loading}
            onResolve={handleResolveAlert}
            showResolveButton={true}
          />
        </div>

        {/* Quick Actions */}
        <div className="animate-slide-in" style={{ animationDelay: "250ms" }}>
          <QuickActions doctorPhone={doctorPhone} />
        </div>
      </main>
    </div>
  );
}
