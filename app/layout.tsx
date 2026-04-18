import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroPulse AI — Health Monitoring Dashboard",
  description:
    "Real-time IoT health monitoring dashboard powered by AI. Track heart rate, SpO2, activity, and fall detection from ESP32 wearable devices.",
  keywords: ["health monitoring", "IoT", "ESP32", "heart rate", "SpO2", "fall detection"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#0d0d1a",
              border: "1px solid #1a1a2e",
              color: "#e0e0e0",
            },
          }}
        />
      </body>
    </html>
  );
}
