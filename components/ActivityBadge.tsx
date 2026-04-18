"use client";

import { cn } from "@/lib/utils";
import { Moon, Footprints, Flame } from "lucide-react";

interface ActivityBadgeProps {
  activity: string;
  loading?: boolean;
}

export default function ActivityBadge({ activity, loading }: ActivityBadgeProps) {
  if (loading) {
    return (
      <div className="np-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted font-medium uppercase tracking-wider">
            Activity
          </span>
        </div>
        <div className="skeleton h-10 w-32 rounded-full" />
      </div>
    );
  }

  const activityConfig = {
    resting: {
      icon: Moon,
      label: "Resting",
      class: "badge-resting",
      desc: "Patient is at rest",
    },
    walking: {
      icon: Footprints,
      label: "Walking",
      class: "badge-walking",
      desc: "Light activity detected",
    },
    exercising: {
      icon: Flame,
      label: "Exercising",
      class: "badge-exercising",
      desc: "High activity detected",
    },
  };

  const config = activityConfig[activity as keyof typeof activityConfig] || activityConfig.resting;
  const Icon = config.icon;

  return (
    <div className="np-card">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <span className="text-sm text-muted font-medium uppercase tracking-wider">
          Activity
        </span>
      </div>

      <div className={cn("badge text-base", config.class)}>
        <Icon className="w-4 h-4" />
        {config.label}
      </div>

      <p className="text-xs text-muted-foreground mt-3">{config.desc}</p>
    </div>
  );
}
