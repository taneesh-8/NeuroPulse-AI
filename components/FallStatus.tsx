"use client";

import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface FallStatusProps {
  fall: boolean;
  accel: number;
  loading?: boolean;
}

export default function FallStatus({ fall, accel, loading }: FallStatusProps) {
  if (loading) {
    return (
      <div className="np-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted font-medium uppercase tracking-wider">
            Fall Detection
          </span>
        </div>
        <div className="skeleton h-12 w-24 rounded-lg" />
      </div>
    );
  }

  return (
    <div className={cn("np-card", fall && "np-card-alert")}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">⚡</span>
        <span className="text-sm text-muted font-medium uppercase tracking-wider">
          Fall Detection
        </span>
      </div>

      <div className="flex items-center gap-3">
        {fall ? (
          <>
            <div className="p-3 rounded-xl bg-alert-red/10">
              <ShieldAlert className="w-8 h-8 text-alert-red animate-pulse" />
            </div>
            <div>
              <span className="text-2xl font-bold text-alert-red glow-red">
                ALERT
              </span>
              <p className="text-xs text-alert-red/70 mt-0.5">Fall detected!</p>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-xl bg-safe-green/10">
              <ShieldCheck className="w-8 h-8 text-safe-green" />
            </div>
            <div>
              <span className="text-2xl font-bold text-safe-green glow-green">
                OK
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">No falls detected</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-card-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Acceleration</span>
          <span className="live-value text-sm text-primary" key={accel}>
            {accel.toFixed(2)}g
          </span>
        </div>
        <div className="mt-2 h-1.5 bg-card-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min((accel / 5) * 100, 100)}%`,
              background: accel > 3 ? "#ff2d55" : accel > 2 ? "#ffd600" : "#00f0ff",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">0g</span>
          <span className="text-[10px] text-muted-foreground">Threshold: 3.0g</span>
          <span className="text-[10px] text-muted-foreground">5g</span>
        </div>
      </div>
    </div>
  );
}
