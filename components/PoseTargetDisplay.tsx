"use client";

import type { ExerciseTarget } from "@/lib/poseUtils";

interface PoseTargetDisplayProps {
  exercise: ExerciseTarget;
}

/** SVG silhouette showing the target pose */
export default function PoseTargetDisplay({ exercise }: PoseTargetDisplayProps) {
  const getPoseSVG = (name: string) => {
    switch (name) {
      case "Standing Straight":
        return (
          <g transform="translate(160, 40)">
            {/* Head */}
            <circle cx="0" cy="0" r="18" fill="none" stroke="#00f0ff" strokeWidth="2" />
            {/* Torso */}
            <line x1="0" y1="18" x2="0" y2="100" stroke="#00f0ff" strokeWidth="2" />
            {/* Left arm */}
            <line x1="0" y1="30" x2="-30" y2="50" stroke="#00f0ff" strokeWidth="2" />
            <line x1="-30" y1="50" x2="-32" y2="90" stroke="#00f0ff" strokeWidth="2" />
            {/* Right arm */}
            <line x1="0" y1="30" x2="30" y2="50" stroke="#00f0ff" strokeWidth="2" />
            <line x1="30" y1="50" x2="32" y2="90" stroke="#00f0ff" strokeWidth="2" />
            {/* Left leg */}
            <line x1="0" y1="100" x2="-20" y2="160" stroke="#00f0ff" strokeWidth="2" />
            <line x1="-20" y1="160" x2="-22" y2="220" stroke="#00f0ff" strokeWidth="2" />
            {/* Right leg */}
            <line x1="0" y1="100" x2="20" y2="160" stroke="#00f0ff" strokeWidth="2" />
            <line x1="20" y1="160" x2="22" y2="220" stroke="#00f0ff" strokeWidth="2" />
            {/* Joints */}
            {[[0, 30], [-30, 50], [30, 50], [-32, 90], [32, 90], [0, 100], [-20, 160], [20, 160], [-22, 220], [22, 220]].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="4" fill="#7b2fff" />
            ))}
          </g>
        );
      case "Shoulder Raise":
        return (
          <g transform="translate(160, 40)">
            <circle cx="0" cy="0" r="18" fill="none" stroke="#00f0ff" strokeWidth="2" />
            <line x1="0" y1="18" x2="0" y2="100" stroke="#00f0ff" strokeWidth="2" />
            {/* Arms raised to sides */}
            <line x1="0" y1="30" x2="-70" y2="30" stroke="#00f0ff" strokeWidth="2" />
            <line x1="-70" y1="30" x2="-120" y2="30" stroke="#00f0ff" strokeWidth="2" />
            <line x1="0" y1="30" x2="70" y2="30" stroke="#00f0ff" strokeWidth="2" />
            <line x1="70" y1="30" x2="120" y2="30" stroke="#00f0ff" strokeWidth="2" />
            <line x1="0" y1="100" x2="-20" y2="160" stroke="#00f0ff" strokeWidth="2" />
            <line x1="-20" y1="160" x2="-22" y2="220" stroke="#00f0ff" strokeWidth="2" />
            <line x1="0" y1="100" x2="20" y2="160" stroke="#00f0ff" strokeWidth="2" />
            <line x1="20" y1="160" x2="22" y2="220" stroke="#00f0ff" strokeWidth="2" />
            {[[-70, 30], [70, 30], [-120, 30], [120, 30], [0, 100], [-20, 160], [20, 160]].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="4" fill="#7b2fff" />
            ))}
          </g>
        );
      case "Arm Stretch":
        return (
          <g transform="translate(160, 60)">
            <circle cx="0" cy="0" r="18" fill="none" stroke="#00f0ff" strokeWidth="2" />
            <line x1="0" y1="18" x2="0" y2="100" stroke="#00f0ff" strokeWidth="2" />
            {/* Arms up */}
            <line x1="0" y1="30" x2="-20" y2="-20" stroke="#00f0ff" strokeWidth="2" />
            <line x1="-20" y1="-20" x2="-22" y2="-70" stroke="#00f0ff" strokeWidth="2" />
            <line x1="0" y1="30" x2="20" y2="-20" stroke="#00f0ff" strokeWidth="2" />
            <line x1="20" y1="-20" x2="22" y2="-70" stroke="#00f0ff" strokeWidth="2" />
            <line x1="0" y1="100" x2="-20" y2="160" stroke="#00f0ff" strokeWidth="2" />
            <line x1="-20" y1="160" x2="-22" y2="210" stroke="#00f0ff" strokeWidth="2" />
            <line x1="0" y1="100" x2="20" y2="160" stroke="#00f0ff" strokeWidth="2" />
            <line x1="20" y1="160" x2="22" y2="210" stroke="#00f0ff" strokeWidth="2" />
            {[[-20, -20], [20, -20], [-22, -70], [22, -70], [0, 100], [-20, 160], [20, 160]].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="4" fill="#7b2fff" />
            ))}
          </g>
        );
      case "Seated Forward Bend":
        return (
          <g transform="translate(160, 60)">
            <circle cx="-40" cy="0" r="18" fill="none" stroke="#00f0ff" strokeWidth="2" />
            {/* Bent torso */}
            <line x1="-26" y1="10" x2="20" y2="60" stroke="#00f0ff" strokeWidth="2" />
            {/* Arms reaching forward */}
            <line x1="-30" y1="12" x2="-80" y2="40" stroke="#00f0ff" strokeWidth="2" />
            <line x1="-80" y1="40" x2="-120" y2="80" stroke="#00f0ff" strokeWidth="2" />
            {/* Seated legs */}
            <line x1="20" y1="60" x2="80" y2="60" stroke="#00f0ff" strokeWidth="2" />
            <line x1="80" y1="60" x2="120" y2="80" stroke="#00f0ff" strokeWidth="2" />
            <line x1="20" y1="60" x2="80" y2="70" stroke="#00f0ff" strokeWidth="2" />
            <line x1="80" y1="70" x2="120" y2="90" stroke="#00f0ff" strokeWidth="2" />
            {[[-80, 40], [-120, 80], [20, 60], [80, 60], [80, 70]].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="4" fill="#7b2fff" />
            ))}
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative bg-background rounded-xl overflow-hidden border border-card-border aspect-[4/3] flex flex-col">
      <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-background/80 backdrop-blur text-xs text-violet-400 z-10">
        Target Pose
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <svg viewBox="0 0 320 300" className="w-full h-full max-h-64 opacity-80">
          {getPoseSVG(exercise.name)}
        </svg>
      </div>
      <div className="px-3 pb-3 text-center">
        <p className="text-sm font-medium text-primary">{exercise.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{exercise.description}</p>
      </div>
    </div>
  );
}
