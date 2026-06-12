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
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  getDemoUserProfile,
  generateDemoReadings,
  type DemoReading,
} from "@/lib/demoData";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import BPMCard from "@/components/BPMCard";
import SpO2Gauge from "@/components/SpO2Gauge";
import ActivityBadge from "@/components/ActivityBadge";
import FallStatus from "@/components/FallStatus";
import GyroReadout from "@/components/GyroReadout";
import ReadingsChart from "@/components/ReadingsChart";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

const WebcamPose = dynamic(() => import("@/components/WebcamPose"), {
  ssr: false,
  loading: () => <div className="np-card"><div className="skeleton h-96 rounded-xl" /></div>,
});

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

export default function PatientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [chartData, setChartData] = useState<Reading[]>([]);
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
        if (userDoc.exists() && userDoc.data().role === "patient") {
          userData = userDoc.data();
        }
      } catch (err) {
        console.warn("Firestore read failed, using demo data:", err);
      }

      if (userData) {
        setUserName(userData.name || user.email || "");
        const linkedPatients = userData.linkedPatients || [];
        const pId = linkedPatients[0] || user.uid;
        setPatientId(pId);
      } else {
        // Check localStorage role or email-based detection
        const storedRole = localStorage.getItem("np_user_role");
        if (storedRole !== "patient") {
          router.push("/login");
          return;
        }
        const demoProfile = getDemoUserProfile("patient");
        setUserName(demoProfile.name);
        setPatientId(demoProfile.linkedPatients[0] || user.uid);
        setUsingDemoData(true);

        // Load demo chart data
        const demoReadings = generateDemoReadings(24);
        setChartData(demoReadings as Reading[]);
        if (demoReadings.length > 0) {
          setLatestReading(demoReadings[demoReadings.length - 1] as Reading);
        }
      }

      setLoading(false);
    });

    return () => unsubAuth();
  }, [router]);

  useEffect(() => {
    if (!patientId || usingDemoData) return;

    const readingsRef = collection(db, "patients", patientId, "readings");

    let unsubLatest: (() => void) | null = null;
    let unsubChart: (() => void) | null = null;

    try {
      const latestQuery = query(readingsRef, orderBy("serverTimestamp", "desc"), limit(1));

      unsubLatest = onSnapshot(
        latestQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data() as Reading;
            setLatestReading(data);

            if (data.fall) {
              toast.error("Fall Detected!", {
                description: "A fall event has been triggered.",
              });
            }
          }
        },
        (err) => {
          console.warn("Firestore readings snapshot failed, loading demo data:", err);
          setUsingDemoData(true);
          const demoReadings = generateDemoReadings(24);
          setChartData(demoReadings as Reading[]);
          if (demoReadings.length > 0) {
            setLatestReading(demoReadings[demoReadings.length - 1] as Reading);
          }
        }
      );

      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const chartQuery = query(
        readingsRef,
        where("serverTimestamp", ">=", twentyFourHoursAgo),
        orderBy("serverTimestamp", "asc"),
        limit(2000)
      );

      unsubChart = onSnapshot(
        chartQuery,
        (snapshot) => {
          const readings = snapshot.docs.map((d) => d.data() as Reading);
          setChartData(readings);
        },
        (err) => {
          console.warn("Firestore chart snapshot failed:", err);
        }
      );
    } catch (err) {
      console.warn("Firestore query setup failed, using demo data:", err);
      setUsingDemoData(true);
      const demoReadings = generateDemoReadings(24);
      setChartData(demoReadings as Reading[]);
      if (demoReadings.length > 0) {
        setLatestReading(demoReadings[demoReadings.length - 1] as Reading);
      }
    }

    return () => {
      if (unsubLatest) unsubLatest();
      if (unsubChart) unsubChart();
    };
  }, [patientId, usingDemoData]);

  const r = latestReading;

  // Status badge logic
  const getStatus = () => {
    if (!r) return { label: "LOADING", color: "text-muted-foreground", bg: "bg-card-border/20", Icon: ShieldCheck };
    if (r.fall || (r.spo2 !== -1 && r.spo2 < 94) || r.bpm > 120 || r.bpm < 50)
      return { label: "CRITICAL", color: "text-alert-red", bg: "bg-alert-red/10 border-alert-red/20 glow-red", Icon: ShieldX };
    if (r.bpm > 100 || (r.spo2 !== -1 && r.spo2 < 95))
      return { label: "WARNING", color: "text-warning-yellow", bg: "bg-warning-yellow/10 border-warning-yellow/20 glow-yellow", Icon: ShieldAlert };
    return { label: "SAFE", color: "text-safe-green", bg: "bg-safe-green/10 border-safe-green/20 glow-green", Icon: ShieldCheck };
  };
  const status = getStatus();

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="patient" userName={userName} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-primary to-violet bg-clip-text text-transparent">
                {userName || "Patient"}
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Live health monitoring from your NeuroPulse wearable device
            </p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${status.bg}`}>
            <status.Icon className={`w-5 h-5 ${status.color}`} />
            <span className={`text-sm font-bold ${status.color}`}>{status.label}</span>
          </div>
        </div>

        {usingDemoData && (
          <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm animate-fade-in">
            📊 Showing demo data — Firestore connection unavailable
          </div>
        )}

        <div className="dashboard-grid mb-6">
          <div className="animate-slide-in" style={{ animationDelay: "0ms" }}>
            <BPMCard bpm={r?.bpm ?? 0} loading={loading} />
          </div>
          <div className="animate-slide-in" style={{ animationDelay: "50ms" }}>
            <SpO2Gauge spo2={r?.spo2 ?? -1} loading={loading} />
          </div>
          <div className="animate-slide-in" style={{ animationDelay: "100ms" }}>
            <ActivityBadge activity={r?.activity ?? "resting"} loading={loading} />
          </div>
          <div className="animate-slide-in" style={{ animationDelay: "150ms" }}>
            <FallStatus
              fall={r?.fall ?? false}
              accel={r?.accel ?? 0}
              loading={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="animate-slide-in" style={{ animationDelay: "200ms" }}>
            <GyroReadout
              gx={r?.gx ?? 0}
              gy={r?.gy ?? 0}
              gz={r?.gz ?? 0}
              ax={r?.ax ?? 0}
              ay={r?.ay ?? 0}
              az={r?.az ?? 0}
              loading={loading}
            />
          </div>
          <div className="np-card animate-slide-in" style={{ animationDelay: "250ms" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <span className="text-sm text-muted font-medium uppercase tracking-wider">
                Accel Magnitude
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-4">
              <span
                className="live-value text-5xl text-primary glow-cyan animate-number"
                key={r?.accel}
              >
                {r?.accel?.toFixed(2) ?? "0.00"}
              </span>
              <span className="text-muted text-lg">g</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {(r?.accel ?? 0) < 1.1
                ? "Low activity — resting state"
                : (r?.accel ?? 0) < 2.0
                ? "Moderate — walking detected"
                : "High — active movement"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="animate-slide-in" style={{ animationDelay: "300ms" }}>
            <ReadingsChart
              data={chartData}
              type="bpm"
              title="Heart Rate — Last 24 Hours"
              loading={loading}
              height={280}
            />
          </div>
          <div className="animate-slide-in" style={{ animationDelay: "350ms" }}>
            <ReadingsChart
              data={chartData}
              type="spo2"
              title="Blood Oxygen — Last 24 Hours"
              loading={loading}
              height={280}
            />
          </div>
        </div>

        {/* Webcam Pose Tracker */}
        {patientId && (
          <div className="animate-slide-in" style={{ animationDelay: "400ms" }}>
            <WebcamPose patientId={patientId} fallDetected={r?.fall} />
          </div>
        )}
      </main>
    </div>
  );
}
