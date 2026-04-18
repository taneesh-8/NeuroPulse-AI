"use client";

import { Phone, PhoneCall, MessageCircle, MapPin } from "lucide-react";

interface QuickActionsProps {
  doctorPhone?: string;
}

export default function QuickActions({ doctorPhone }: QuickActionsProps) {
  const emergencyNumber = "112"; // India universal emergency

  return (
    <div className="np-card">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        ⚡ Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {/* Call Emergency */}
        <a
          href={`tel:${emergencyNumber}`}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-alert-red/10 border border-alert-red/20 hover:bg-alert-red/20 transition-all active:scale-95 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-alert-red/20 flex items-center justify-center">
            <PhoneCall className="w-6 h-6 text-alert-red" />
          </div>
          <span className="text-sm font-semibold text-alert-red">Call Emergency</span>
          <span className="text-xs text-muted-foreground">{emergencyNumber}</span>
        </a>

        {/* Call Doctor */}
        <a
          href={`tel:${doctorPhone || "+1234567891"}`}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all active:scale-95 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Phone className="w-6 h-6 text-primary" />
          </div>
          <span className="text-sm font-semibold text-primary">Call Doctor</span>
          <span className="text-xs text-muted-foreground">Dr. Sarah Chen</span>
        </a>

        {/* WhatsApp Doctor */}
        <a
          href={`https://wa.me/${(doctorPhone || "+1234567891").replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-safe-green/10 border border-safe-green/20 hover:bg-safe-green/20 transition-all active:scale-95 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-safe-green/20 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-safe-green" />
          </div>
          <span className="text-sm font-semibold text-safe-green">Full Support</span>
          <span className="text-xs text-muted-foreground">WhatsApp Doctor</span>
        </a>

        {/* Hospital Near Me */}
        <a
          href="https://www.google.com/maps/search/hospitals+near+me"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-warning-yellow/10 border border-warning-yellow/20 hover:bg-warning-yellow/20 transition-all active:scale-95 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-warning-yellow/20 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-warning-yellow" />
          </div>
          <span className="text-sm font-semibold text-warning-yellow">Hospital Near Me</span>
          <span className="text-xs text-muted-foreground">Google Maps</span>
        </a>
      </div>
    </div>
  );
}
