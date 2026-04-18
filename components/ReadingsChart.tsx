"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { formatTimeShort } from "@/lib/utils";

interface DataPoint {
  serverTimestamp?: number;
  timestamp?: number;
  bpm?: number;
  spo2?: number;
}

interface ReadingsChartProps {
  data: DataPoint[];
  type: "bpm" | "spo2" | "both";
  title?: string;
  loading?: boolean;
  height?: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-card-border rounded-xl p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">
        {label ? formatTimeShort(label) : ""}
      </p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value === -1 ? "No reading" : p.value}
          {p.name === "SpO2" && p.value !== -1 ? "%" : ""}
        </p>
      ))}
    </div>
  );
}

export default function ReadingsChart({
  data,
  type,
  title,
  loading,
  height = 300,
}: ReadingsChartProps) {
  if (loading) {
    return (
      <div className="np-card">
        {title && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted font-medium uppercase tracking-wider">
              {title}
            </span>
          </div>
        )}
        <div className="skeleton" style={{ height }} />
      </div>
    );
  }

  const chartData = data
    .filter((d) => {
      const ts = d.serverTimestamp || d.timestamp || 0;
      return ts > 0;
    })
    .map((d) => ({
      time: d.serverTimestamp || d.timestamp || 0,
      bpm: d.bpm || 0,
      spo2: d.spo2 === -1 ? null : d.spo2,
    }))
    .sort((a, b) => a.time - b.time);

  return (
    <div className="np-card">
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">{type === "bpm" ? "❤️" : type === "spo2" ? "🫁" : "📈"}</span>
          <span className="text-sm text-muted font-medium uppercase tracking-wider">
            {title}
          </span>
        </div>
      )}

      {chartData.length === 0 ? (
        <div
          className="flex items-center justify-center text-muted-foreground text-sm"
          style={{ height }}
        >
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="bpmGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff2d55" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff2d55" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="spo2Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
            <XAxis
              dataKey="time"
              tickFormatter={(t) => formatTimeShort(t)}
              stroke="#4a4a5a"
              tick={{ fill: "#6a6a7a", fontSize: 11 }}
              axisLine={{ stroke: "#1a1a2e" }}
            />
            <YAxis
              stroke="#4a4a5a"
              tick={{ fill: "#6a6a7a", fontSize: 11 }}
              axisLine={{ stroke: "#1a1a2e" }}
            />
            <Tooltip content={<CustomTooltip />} />

            {(type === "bpm" || type === "both") && (
              <Area
                type="monotone"
                dataKey="bpm"
                name="BPM"
                stroke="#ff2d55"
                strokeWidth={2}
                fill="url(#bpmGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#ff2d55", strokeWidth: 0 }}
              />
            )}
            {(type === "spo2" || type === "both") && (
              <Area
                type="monotone"
                dataKey="spo2"
                name="SpO2"
                stroke="#00f0ff"
                strokeWidth={2}
                fill="url(#spo2Gradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#00f0ff", strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
