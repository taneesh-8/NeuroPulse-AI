"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface VitalGuideProps {
  bpm: number;
  spo2: number;
  activity: string;
}

interface GuideRow {
  range: string;
  emoji: string;
  label: string;
  description: string;
  color: string;
  bgActive: string;
  borderActive: string;
}

const bpmRows: GuideRow[] = [
  {
    range: "< 50",
    emoji: "🔴",
    label: "Too Low (Bradycardia)",
    description: "Heart beating too slowly. Patient may feel dizzy or faint. Act immediately.",
    color: "text-alert-red",
    bgActive: "bg-alert-red/15",
    borderActive: "border-alert-red/40",
  },
  {
    range: "50 – 60",
    emoji: "🟡",
    label: "Slightly Low",
    description: "Monitor closely. Ask patient how they feel.",
    color: "text-warning-yellow",
    bgActive: "bg-warning-yellow/15",
    borderActive: "border-warning-yellow/40",
  },
  {
    range: "60 – 100",
    emoji: "🟢",
    label: "Normal Range",
    description: "Patient is doing well. No action needed.",
    color: "text-safe-green",
    bgActive: "bg-safe-green/15",
    borderActive: "border-safe-green/40",
  },
  {
    range: "100 – 120",
    emoji: "🟡",
    label: "Slightly High",
    description: "May be due to activity or mild stress. Keep watching.",
    color: "text-warning-yellow",
    bgActive: "bg-warning-yellow/15",
    borderActive: "border-warning-yellow/40",
  },
  {
    range: "> 120",
    emoji: "🔴",
    label: "Too High (Tachycardia)",
    description: "Heart beating too fast. Ask patient to sit and rest. Call doctor if it persists.",
    color: "text-alert-red",
    bgActive: "bg-alert-red/15",
    borderActive: "border-alert-red/40",
  },
];

const spo2Rows: GuideRow[] = [
  {
    range: "95 – 100%",
    emoji: "🟢",
    label: "Normal",
    description: "Oxygen levels are healthy. No action needed.",
    color: "text-safe-green",
    bgActive: "bg-safe-green/15",
    borderActive: "border-safe-green/40",
  },
  {
    range: "90 – 94%",
    emoji: "🟡",
    label: "Low — Take Action",
    description: "Ask patient to breathe slowly and deeply. Sit them upright. Watch closely.",
    color: "text-warning-yellow",
    bgActive: "bg-warning-yellow/15",
    borderActive: "border-warning-yellow/40",
  },
  {
    range: "< 90%",
    emoji: "🔴",
    label: "Dangerously Low",
    description: "Call emergency immediately. Give fresh air, keep calm.",
    color: "text-alert-red",
    bgActive: "bg-alert-red/15",
    borderActive: "border-alert-red/40",
  },
  {
    range: "No reading",
    emoji: "⚪",
    label: "Finger not on sensor",
    description: "Ask patient to wear the device properly.",
    color: "text-muted-foreground",
    bgActive: "bg-card-border/30",
    borderActive: "border-card-border/50",
  },
];

const activityRows: GuideRow[] = [
  {
    range: "Resting",
    emoji: "🟢",
    label: "Patient is still or resting",
    description: "Normal when sitting, lying down, or sleeping.",
    color: "text-safe-green",
    bgActive: "bg-safe-green/15",
    borderActive: "border-safe-green/40",
  },
  {
    range: "Walking",
    emoji: "🟢",
    label: "Normal movement detected",
    description: "Patient is moving normally.",
    color: "text-safe-green",
    bgActive: "bg-safe-green/15",
    borderActive: "border-safe-green/40",
  },
  {
    range: "Exercising",
    emoji: "🟡",
    label: "Active movement",
    description: "Normal if patient is doing physiotherapy exercises.",
    color: "text-warning-yellow",
    bgActive: "bg-warning-yellow/15",
    borderActive: "border-warning-yellow/40",
  },
];

function getBpmActiveIndex(bpm: number): number {
  if (bpm <= 0) return -1;
  if (bpm < 50) return 0;
  if (bpm < 60) return 1;
  if (bpm <= 100) return 2;
  if (bpm <= 120) return 3;
  return 4;
}

function getSpo2ActiveIndex(spo2: number): number {
  if (spo2 === -1) return 3;
  if (spo2 >= 95) return 0;
  if (spo2 >= 90) return 1;
  return 2;
}

function getActivityActiveIndex(activity: string): number {
  const a = activity.toLowerCase();
  if (a === "resting" || a === "sleeping") return 0;
  if (a === "walking") return 1;
  if (a === "exercising" || a === "jogging" || a === "running") return 2;
  return 0;
}

function GuideSection({
  title,
  icon,
  rows,
  activeIndex,
}: {
  title: string;
  icon: string;
  rows: GuideRow[];
  activeIndex: number;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h4>
      <div className="space-y-1.5">
        {rows.map((row, i) => {
          const isActive = i === activeIndex;
          return (
            <div
              key={row.range}
              className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all duration-500 ${
                isActive
                  ? `${row.bgActive} ${row.borderActive} shadow-sm`
                  : "bg-transparent border-transparent opacity-60"
              }`}
            >
              <div className="flex-shrink-0 w-[72px]">
                <span className={`text-xs font-mono font-bold ${isActive ? row.color : "text-muted-foreground"}`}>
                  {row.emoji} {row.range}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-tight ${isActive ? row.color : "text-muted-foreground"}`}>
                  {row.label}
                </p>
                <p className={`text-xs mt-0.5 leading-snug ${isActive ? "text-foreground/80" : "text-muted-foreground/60"}`}>
                  {row.description}
                </p>
              </div>
              {isActive && (
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 animate-pulse ${
                  row.color.includes("red") ? "bg-alert-red" :
                  row.color.includes("yellow") ? "bg-warning-yellow" :
                  row.color.includes("green") ? "bg-safe-green" : "bg-muted"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VitalGuide({ bpm, spo2, activity }: VitalGuideProps) {
  const [expanded, setExpanded] = useState(false);

  // Expanded by default on desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setExpanded(mq.matches);
    const handler = (e: MediaQueryListEvent) => setExpanded(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const bpmActive = getBpmActiveIndex(bpm);
  const spo2Active = getSpo2ActiveIndex(spo2);
  const activityActive = getActivityActiveIndex(activity);

  return (
    <div className="np-card animate-slide-in" style={{ animationDelay: "75ms" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between group"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <span className="text-base">📖</span> Understanding Vitals
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
            {expanded ? "Collapse" : "Expand"}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <GuideSection
            title="Heart Rate (BPM) — What it means"
            icon="❤️"
            rows={bpmRows}
            activeIndex={bpmActive}
          />
          <GuideSection
            title="Oxygen Level (SpO2) — What it means"
            icon="🫁"
            rows={spo2Rows}
            activeIndex={spo2Active}
          />
          <GuideSection
            title="Movement Level — What it means"
            icon="📊"
            rows={activityRows}
            activeIndex={activityActive}
          />
        </div>
      )}
    </div>
  );
}
