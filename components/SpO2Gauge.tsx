"use client";

import { getSpo2Color } from "@/lib/utils";

interface SpO2GaugeProps {
  spo2: number;
  loading?: boolean;
}

export default function SpO2Gauge({ spo2, loading }: SpO2GaugeProps) {
  if (loading) {
    return (
      <div className="np-card flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4 self-start">
          <span className="text-lg">🫁</span>
          <span className="text-sm text-muted font-medium uppercase tracking-wider">
            SpO2
          </span>
        </div>
        <div className="skeleton w-36 h-36 rounded-full" />
      </div>
    );
  }

  const color = getSpo2Color(spo2);
  const isNoReading = spo2 === -1;
  const isAlert = color === "red";

  const colorValues = {
    green: "#00e676",
    yellow: "#ffd600",
    red: "#ff2d55",
    gray: "#6a6a7a",
  };

  const strokeColor = colorValues[color];
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const displayValue = isNoReading ? 0 : spo2;
  const progress = isNoReading ? 0 : ((spo2 - 80) / 20) * 100;
  const dashOffset = circumference - (Math.max(0, Math.min(100, progress)) / 100) * circumference;

  return (
    <div className={`np-card flex flex-col items-center ${isAlert ? "np-card-alert" : ""}`}>
      <div className="flex items-center gap-2 mb-4 self-start w-full justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🫁</span>
          <span className="text-sm text-muted font-medium uppercase tracking-wider">
            Blood Oxygen
          </span>
        </div>
        {!isNoReading && (
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: strokeColor }}
          />
        )}
      </div>

      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="8"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="gauge-ring"
            style={{
              filter: `drop-shadow(0 0 6px ${strokeColor})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isNoReading ? (
            <>
              <span className="text-muted text-sm">No reading</span>
              <span className="text-muted-foreground text-xs mt-1">
                Place finger on sensor
              </span>
            </>
          ) : (
            <>
              <span
                className="live-value text-4xl animate-number"
                style={{
                  color: strokeColor,
                  textShadow: `0 0 10px ${strokeColor}50`,
                }}
                key={spo2}
              >
                {displayValue}
              </span>
              <span className="text-muted text-sm mt-1">%SpO2</span>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-between w-full mt-3 px-2">
        <span className="text-xs text-muted-foreground">80%</span>
        <span className="text-xs text-safe-green font-medium">
          {isNoReading ? "—" : spo2 >= 95 ? "Normal" : spo2 >= 90 ? "Low" : "Critical"}
        </span>
        <span className="text-xs text-muted-foreground">100%</span>
      </div>
    </div>
  );
}
