"use client";

import { getAlertTypeLabel, getAlertTypeEmoji, formatTimestamp, cn } from "@/lib/utils";

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

interface AlertsListProps {
  alerts: Alert[];
  loading?: boolean;
  onResolve?: (alertId: string) => void;
  showResolveButton?: boolean;
}

export default function AlertsList({
  alerts,
  loading,
  onResolve,
  showResolveButton = false,
}: AlertsListProps) {
  if (loading) {
    return (
      <div className="np-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔔</span>
          <span className="text-sm text-muted font-medium uppercase tracking-wider">
            Alerts
          </span>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="np-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <span className="text-sm text-muted font-medium uppercase tracking-wider">
            Alerts
          </span>
        </div>
        {alerts.length > 0 && (
          <span className="bg-alert-red/20 text-alert-red text-xs font-bold px-2.5 py-1 rounded-full">
            {alerts.filter((a) => a.status === "active").length} active
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">No alerts</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {alerts.map((alert, idx) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all animate-slide-in",
                alert.status === "active"
                  ? "bg-alert-red/5 border-alert-red/20"
                  : "bg-card border-card-border opacity-60"
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{getAlertTypeEmoji(alert.type)}</span>
                <div>
                  <p className="text-sm font-semibold">
                    {getAlertTypeLabel(alert.type)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(alert.timestamp)}
                  </p>
                  <div className="flex gap-3 mt-1">
                    {alert.bpm !== undefined && (
                      <span className="text-[10px] text-muted">
                        ❤️ {alert.bpm} BPM
                      </span>
                    )}
                    {alert.spo2 !== undefined && (
                      <span className="text-[10px] text-muted">
                        🫁 {alert.spo2 === -1 ? "N/A" : `${alert.spo2}%`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                    alert.status === "active"
                      ? "bg-alert-red/20 text-alert-red"
                      : "bg-safe-green/20 text-safe-green"
                  )}
                >
                  {alert.status}
                </span>
                {showResolveButton && alert.status === "active" && onResolve && (
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="np-button text-xs py-1.5 px-3 bg-safe-green/10 text-safe-green border border-safe-green/30 hover:bg-safe-green/20"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
