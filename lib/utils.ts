export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatTimeShort(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getBpmColor(bpm: number): "green" | "yellow" | "red" {
  if (bpm < 100) return "green";
  if (bpm < 120) return "yellow";
  return "red";
}

export function getBpmColorClass(bpm: number): string {
  const color = getBpmColor(bpm);
  switch (color) {
    case "green":
      return "text-safe-green glow-green";
    case "yellow":
      return "text-warning-yellow glow-yellow";
    case "red":
      return "text-alert-red glow-red";
  }
}

export function getSpo2Color(spo2: number): "green" | "yellow" | "red" | "gray" {
  if (spo2 === -1) return "gray";
  if (spo2 >= 95) return "green";
  if (spo2 === 94) return "yellow";
  return "red";
}

export function getSpo2ColorClass(spo2: number): string {
  const color = getSpo2Color(spo2);
  switch (color) {
    case "green":
      return "text-safe-green";
    case "yellow":
      return "text-warning-yellow";
    case "red":
      return "text-alert-red";
    case "gray":
      return "text-muted";
  }
}

export function getAlertTypeLabel(type: string): string {
  switch (type) {
    case "fall":
      return "Fall Detected";
    case "lowSpo2":
      return "Low SpO2";
    case "abnormalBpm":
      return "Abnormal BPM";
    default:
      return type;
  }
}

export function getAlertTypeEmoji(type: string): string {
  switch (type) {
    case "fall":
      return "⚠️";
    case "lowSpo2":
      return "🫁";
    case "abnormalBpm":
      return "❤️";
    default:
      return "🔔";
  }
}

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
