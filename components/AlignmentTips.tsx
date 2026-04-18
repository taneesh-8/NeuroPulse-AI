"use client";

import type { JointAnalysis } from "@/lib/poseUtils";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface AlignmentTipsProps {
  joints: JointAnalysis[];
}

export default function AlignmentTips({ joints }: AlignmentTipsProps) {
  const badJoints = joints.filter((j) => !j.isGood);
  const goodJoints = joints.filter((j) => j.isGood);

  return (
    <div className="np-card">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        🎯 Alignment Tips
      </h3>

      {badJoints.length === 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-safe-green/10 border border-safe-green/20">
          <CheckCircle2 className="w-5 h-5 text-safe-green flex-shrink-0" />
          <p className="text-sm text-safe-green font-medium">
            Perfect alignment! All joints matched.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {badJoints.map((j, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-alert-red/5 border border-alert-red/10"
            >
              <AlertCircle className="w-4 h-4 text-alert-red flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {j.joint}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {Math.round(j.currentAngle)}° / {j.targetAngle}°
                  </span>
                </div>
                <p className="text-xs text-alert-red mt-0.5">{j.tip}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Good joints summary */}
      {goodJoints.length > 0 && badJoints.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {goodJoints.map((j, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-safe-green/10 text-safe-green border border-safe-green/20"
            >
              <CheckCircle2 className="w-3 h-3" />
              {j.joint}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
