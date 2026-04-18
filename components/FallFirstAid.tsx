"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, CheckCircle2, AlertTriangle } from "lucide-react";

interface FallFirstAidProps {
  visible: boolean;
  patientName: string;
  bpm: number;
  spo2: number;
  onResolve: () => void;
}

const FIRST_AID_STEPS = [
  {
    step: 1,
    title: "Do not move the patient yet",
    body: "Check if they are conscious. Call their name. If unconscious: call emergency immediately.",
  },
  {
    step: 2,
    title: "Check for injuries",
    body: "Look for bleeding, unusual limb positions, or complaints of pain before moving them.",
  },
  {
    step: 3,
    title: "Help them up safely (if conscious)",
    body: "Bring a sturdy chair next to them. Ask them to roll to their side, push up slowly, and sit on the chair. Do not pull by the arms.",
  },
  {
    step: 4,
    title: "Monitor vitals",
    body: "Watch the BPM and SpO2 readings above. If BPM > 120 or SpO2 < 90 after the fall: call emergency services immediately.",
  },
  {
    step: 5,
    title: "Report the fall",
    body: 'Press "Mark Resolved" below once the patient is safe. This notifies the doctor.',
  },
];

export default function FallFirstAid({
  visible,
  patientName,
  bpm,
  spo2,
  onResolve,
}: FallFirstAidProps) {
  const [dismissed, setDismissed] = useState(false);
  const spokenRef = useRef(false);

  // Speak alert when panel first appears
  useEffect(() => {
    if (visible && !spokenRef.current) {
      spokenRef.current = true;
      try {
        const synth = window.speechSynthesis;
        if (synth) {
          synth.cancel();
          const utterance = new SpeechSynthesisUtterance(
            "Alert. Fall detected. Please check the patient immediately and follow the first aid steps."
          );
          utterance.rate = 0.9;
          utterance.pitch = 0.8;
          utterance.volume = 1;
          synth.speak(utterance);
        }
      } catch {
        // Speech API not available
      }
    }
    if (!visible) {
      spokenRef.current = false;
      setDismissed(false);
    }
  }, [visible]);

  if (!visible || dismissed) return null;

  const handleResolve = () => {
    onResolve();
    setDismissed(true);
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
  };

  const vitalsWarning = bpm > 120 || (spo2 !== -1 && spo2 < 90);

  return (
    <div className="fall-first-aid-panel mb-6 animate-fade-in">
      <div className="fall-first-aid-inner">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="fall-alert-icon">
            <AlertTriangle className="w-6 h-6 text-alert-red" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-alert-red">
              🚨 FALL DETECTED — Immediate Action Required
            </h2>
            <p className="text-sm text-foreground/70 mt-0.5">
              {patientName} may need your help right now
            </p>
          </div>
        </div>

        {/* Vitals warning */}
        {vitalsWarning && (
          <div className="mb-4 p-3 rounded-lg bg-alert-red/20 border border-alert-red/40">
            <p className="text-sm font-bold text-alert-red">
              ⚠️ CRITICAL VITALS — BPM: {bpm} | SpO2: {spo2 === -1 ? "N/A" : `${spo2}%`}
              {" "} — Call emergency now!
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="mb-5">
          <p className="text-sm text-foreground/80 font-medium mb-3">
            Follow these steps right now:
          </p>
          <div className="space-y-3">
            {FIRST_AID_STEPS.map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-alert-red/20 border border-alert-red/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-alert-red">{s.step}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {s.title}
                  </p>
                  <p className="text-xs text-foreground/60 mt-0.5 leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="tel:112"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-alert-red text-white font-bold text-sm hover:bg-alert-red/90 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call Emergency (112)
          </a>
          <button
            onClick={handleResolve}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-safe-green/20 border border-safe-green/30 text-safe-green font-bold text-sm hover:bg-safe-green/30 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark as Resolved
          </button>
        </div>
      </div>
    </div>
  );
}
