"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trophy, Medal, Star, Flame, Target, Zap } from "lucide-react";

interface ExerciseSession {
  id: string;
  exerciseName: string;
  accuracy: number;
  pointsEarned: number;
  timestamp: number;
}

interface GamificationPanelProps {
  patientId: string;
}

const BADGES = [
  { id: "first_exercise", name: "First Exercise", icon: Star, threshold: (sessions: ExerciseSession[]) => sessions.length >= 1, color: "text-primary" },
  { id: "7_day_streak", name: "7-Day Streak", icon: Flame, threshold: (_sessions: ExerciseSession[]) => {
    // Simplified: check if there are exercises on 7 different days
    const days = new Set(_sessions.map(s => new Date(s.timestamp).toDateString()));
    return days.size >= 7;
  }, color: "text-warning-yellow" },
  { id: "perfect_form", name: "Perfect Form", icon: Target, threshold: (sessions: ExerciseSession[]) => sessions.some(s => s.accuracy === 100), color: "text-safe-green" },
  { id: "100_points", name: "100 Points", icon: Zap, threshold: (_s: ExerciseSession[], total: number) => total >= 100, color: "text-violet-400" },
];

function getMilestone(points: number): { name: string; min: number; max: number; color: string } {
  if (points <= 100) return { name: "Bronze", min: 0, max: 100, color: "text-amber-600" };
  if (points <= 300) return { name: "Silver", min: 101, max: 300, color: "text-gray-300" };
  return { name: "Gold", min: 301, max: 500, color: "text-yellow-400" };
}

export default function GamificationPanel({ patientId }: GamificationPanelProps) {
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;

    // Listen to exercises
    const exRef = collection(db, "patients", patientId, "exercises");
    const exQ = query(exRef, orderBy("timestamp", "desc"), limit(50));
    const unsubEx = onSnapshot(exQ, (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExerciseSession)));
      setLoading(false);
    });

    // Listen to totalPoints
    const patRef = doc(db, "patients", patientId);
    const unsubPat = onSnapshot(patRef, (snap) => {
      if (snap.exists()) {
        setTotalPoints(snap.data().totalPoints ?? 0);
      }
    });

    return () => { unsubEx(); unsubPat(); };
  }, [patientId]);

  const milestone = getMilestone(totalPoints);
  const progress = Math.min(100, ((totalPoints - (milestone.min > 0 ? milestone.min - 1 : 0)) / (milestone.max - (milestone.min > 0 ? milestone.min - 1 : 0))) * 100);

  const earnedBadges = BADGES.filter(b => b.threshold(sessions, totalPoints));

  if (loading) {
    return (
      <div className="np-card">
        <div className="skeleton h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Points & milestone */}
      <div className="np-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning-yellow" />
            Gamification
          </h3>
          <div className="flex items-center gap-2">
            <Medal className={`w-5 h-5 ${milestone.color}`} />
            <span className={`text-sm font-bold ${milestone.color}`}>{milestone.name}</span>
          </div>
        </div>

        {/* Total points */}
        <div className="text-center mb-4">
          <p className="text-4xl font-bold font-mono text-primary">{totalPoints}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Points</p>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{milestone.name} Tier</span>
            <span>{totalPoints} / {milestone.max} pts</span>
          </div>
          <div className="h-2.5 bg-card-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-violet rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Badges */}
        <div className="mt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Badges</p>
          <div className="flex flex-wrap gap-2">
            {BADGES.map((badge) => {
              const earned = earnedBadges.some(b => b.id === badge.id);
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    earned
                      ? `${badge.color} bg-card border-current/20`
                      : "text-muted-foreground/40 bg-card-border/30 border-card-border"
                  }`}
                  title={earned ? `Earned: ${badge.name}` : `Locked: ${badge.name}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {badge.name}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Exercise history */}
      {sessions.length > 0 && (
        <div className="np-card">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Exercise History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase border-b border-card-border">
                  <th className="text-left py-2 pr-2">#</th>
                  <th className="text-left py-2 pr-2">Exercise</th>
                  <th className="text-right py-2 pr-2">Accuracy</th>
                  <th className="text-right py-2 pr-2">Points</th>
                  <th className="text-right py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 10).map((s, i) => (
                  <tr key={s.id} className="border-b border-card-border/50 last:border-0">
                    <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-2 font-medium">{s.exerciseName}</td>
                    <td className="py-2 pr-2 text-right">
                      <span className={`font-mono ${
                        s.accuracy >= 80 ? "text-safe-green" : s.accuracy >= 60 ? "text-warning-yellow" : "text-alert-red"
                      }`}>
                        {s.accuracy}%
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-right text-primary font-mono">+{s.pointsEarned}</td>
                    <td className="py-2 text-right text-xs text-muted-foreground">
                      {new Date(s.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
