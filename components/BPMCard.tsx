"use client";

import { cn, getBpmColor } from "@/lib/utils";
import { Heart } from "lucide-react";

interface BPMCardProps {
  bpm: number;
  loading?: boolean;
}

export default function BPMCard({ bpm, loading }: BPMCardProps) {
  if (loading) {
    return (
      <div className="np-card">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-muted" />
          <span className="text-sm text-muted font-medium uppercase tracking-wider">Heart Rate</span>
        </div>
        <div className="skeleton h-16 w-32 mb-2" />
        <div className="skeleton h-4 w-20" />
      </div>
    );
  }

  const color = getBpmColor(bpm);
  const colorMap = {
    green: {
      text: "text-safe-green",
      glow: "glow-green",
      icon: "text-safe-green",
      bg: "rgba(0, 230, 118, 0.1)",
    },
    yellow: {
      text: "text-warning-yellow",
      glow: "glow-yellow",
      icon: "text-warning-yellow",
      bg: "rgba(255, 214, 0, 0.1)",
    },
    red: {
      text: "text-alert-red",
      glow: "glow-red",
      icon: "text-alert-red",
      bg: "rgba(255, 45, 85, 0.1)",
    },
  };

  const style = colorMap[color];
  const isAlert = color === "red";

  return (
    <div className={cn("np-card", isAlert && "np-card-alert")}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart
            className={cn("w-5 h-5", style.icon, isAlert && "animate-heartbeat")}
            fill="currentColor"
          />
          <span className="text-sm text-muted font-medium uppercase tracking-wider">
            Heart Rate
          </span>
        </div>
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: color === "green" ? "#00e676" : color === "yellow" ? "#ffd600" : "#ff2d55" }}
        />
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={cn("live-value text-6xl", style.text, style.glow, "animate-number")}
          key={bpm}
        >
          {Math.round(bpm)}
        </span>
        <span className="text-muted text-lg">BPM</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${Math.min((bpm / 200) * 100, 100)}%`,
            background: color === "green" ? "#00e676" : color === "yellow" ? "#ffd600" : "#ff2d55",
            boxShadow: `0 0 8px ${color === "green" ? "rgba(0,230,118,0.5)" : color === "yellow" ? "rgba(255,214,0,0.5)" : "rgba(255,45,85,0.5)"}`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">0</span>
        <span className="text-xs text-muted-foreground">200</span>
      </div>
    </div>
  );
}
