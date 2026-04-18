"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { analyzePose, getVoiceFeedback, EXERCISES, type JointAnalysis, type Landmark } from "@/lib/poseUtils";
import PoseTargetDisplay from "./PoseTargetDisplay";
import AlignmentTips from "./AlignmentTips";
import { toast } from "sonner";
import { Camera, CameraOff, Mic, MicOff, Send, Loader2, Trophy } from "lucide-react";

/* global MediaPipe types */
declare global {
  interface Window {
    Pose: new (config: Record<string, unknown>) => {
      setOptions: (opts: Record<string, unknown>) => void;
      onResults: (cb: (results: PoseResults) => void) => void;
      send: (input: { image: HTMLVideoElement }) => Promise<void>;
    };
    Camera: new (video: HTMLVideoElement, config: { onFrame: () => Promise<void>; width: number; height: number }) => {
      start: () => Promise<void>;
      stop: () => void;
    };
    drawConnectors: (ctx: CanvasRenderingContext2D, landmarks: Landmark[], connections: number[][], style: Record<string, unknown>) => void;
    drawLandmarks: (ctx: CanvasRenderingContext2D, landmarks: Landmark[], style: Record<string, unknown>) => void;
    POSE_CONNECTIONS: number[][];
  }
}

interface PoseResults {
  poseLandmarks?: Landmark[];
  image: HTMLCanvasElement;
}

interface WebcamPoseProps {
  patientId: string;
  fallDetected?: boolean;
}

export default function WebcamPose({ patientId, fallDetected }: WebcamPoseProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<{ stop: () => void } | null>(null);
  const lastSpeechRef = useRef(0);

  const [selectedExercise, setSelectedExercise] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [joints, setJoints] = useState<JointAnalysis[]>([]);
  const [flags, setFlags] = useState<string[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load MediaPipe scripts from CDN
  useEffect(() => {
    const scripts = [
      "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
      "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
      "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js",
    ];

    let loaded = 0;
    scripts.forEach((src) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        loaded++;
        if (loaded === scripts.length) setScriptsLoaded(true);
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.crossOrigin = "anonymous";
      script.onload = () => {
        loaded++;
        if (loaded === scripts.length) setScriptsLoaded(true);
      };
      document.head.appendChild(script);
    });
  }, []);

  // AI Voice feedback
  const speak = useCallback((text: string) => {
    if (!voiceOn || typeof window === "undefined") return;
    if (Date.now() - lastSpeechRef.current < 10000) return; // 10s cooldown
    lastSpeechRef.current = Date.now();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [voiceOn]);

  // Fall detection voice alert
  useEffect(() => {
    if (fallDetected) {
      speak("Warning! Fall detected. Please check on the patient immediately.");
    }
  }, [fallDetected, speak]);

  // Start/stop camera
  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      cameraRef.current?.stop();
      cameraRef.current = null;
      setCameraOn(false);
      return;
    }

    if (!scriptsLoaded || !window.Pose) {
      toast.error("MediaPipe is still loading. Please wait.");
      return;
    }

    setLoading(true);

    try {
      const pose = new window.Pose({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results: PoseResults) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.poseLandmarks && window.drawConnectors && window.drawLandmarks) {
          window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
            color: "#00f0ff",
            lineWidth: 2,
          });
          window.drawLandmarks(ctx, results.poseLandmarks, {
            color: "#7b2fff",
            lineWidth: 1,
            radius: 3,
          });

          // Analyze pose
          const exercise = EXERCISES[selectedExercise];
          const analysis = analyzePose(results.poseLandmarks, exercise);
          setAccuracy(analysis.accuracy);
          setJoints(analysis.joints);
          setFlags(analysis.flags);

          // Voice feedback
          const feedback = getVoiceFeedback(analysis.accuracy, analysis.joints);
          speak(feedback);
        }

        ctx.restore();
      });

      if (videoRef.current) {
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await pose.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        await camera.start();
        cameraRef.current = camera;
        setCameraOn(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Failed to start camera. Check permissions.");
    } finally {
      setLoading(false);
    }
  }, [cameraOn, scriptsLoaded, selectedExercise, speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cameraRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleSubmit = async () => {
    if (accuracy === 0) {
      toast.error("Start the camera and match the pose first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          exerciseName: EXERCISES[selectedExercise].name,
          accuracy,
          timestamp: Date.now(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          `Session saved! +${json.pointsEarned} points (Total: ${json.totalPoints})`,
          { icon: "🏆" }
        );
      } else {
        toast.error("Failed to save session");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const accColor = accuracy >= 80 ? "text-safe-green" : accuracy >= 60 ? "text-warning-yellow" : "text-alert-red";
  const accBarColor = accuracy >= 80 ? "bg-safe-green" : accuracy >= 60 ? "bg-warning-yellow" : "bg-alert-red";

  return (
    <div className="space-y-4">
      {/* Exercise selection + controls */}
      <div className="np-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-xl">🏋️</span>
            Exercise Tracker
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(Number(e.target.value))}
              className="np-input text-sm py-1.5"
            >
              {EXERCISES.map((ex, i) => (
                <option key={i} value={i}>{ex.name}</option>
              ))}
            </select>
            <button
              onClick={() => setVoiceOn(!voiceOn)}
              className={`p-2 rounded-lg transition-colors ${voiceOn ? "bg-primary/20 text-primary" : "bg-card-border text-muted-foreground"}`}
              title={voiceOn ? "Mute voice" : "Enable voice"}
            >
              {voiceOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleCamera}
              disabled={loading}
              className={`np-button ${cameraOn ? "bg-alert-red/20 text-alert-red border-alert-red/30" : "np-button-primary"}`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : cameraOn ? (
                <CameraOff className="w-4 h-4" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              {loading ? "Loading..." : cameraOn ? "Stop" : "Start Camera"}
            </button>
          </div>
        </div>

        {/* Accuracy bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Accuracy</span>
            <span className={`text-lg font-bold font-mono ${accColor}`}>{accuracy}%</span>
          </div>
          <div className="h-2 bg-card-border rounded-full overflow-hidden">
            <div
              className={`h-full ${accBarColor} transition-all duration-500 rounded-full`}
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        {/* Split screen: Target + Webcam */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PoseTargetDisplay exercise={EXERCISES[selectedExercise]} />
          <div className="relative bg-background rounded-xl overflow-hidden border border-card-border aspect-[4/3]">
            <video ref={videoRef} className="hidden" playsInline />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="w-full h-full object-cover"
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Click "Start Camera"</p>
                  <p className="text-xs mt-1">to begin pose tracking</p>
                </div>
              </div>
            )}
            <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-background/80 backdrop-blur text-xs text-primary">
              Your Pose
            </div>
          </div>
        </div>

        {/* Flags */}
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {flags.map((flag, i) => (
              <span key={i} className="px-2 py-1 text-xs rounded-full bg-alert-red/15 text-alert-red border border-alert-red/20">
                {flag}
              </span>
            ))}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || accuracy === 0}
            className="np-button np-button-primary disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="w-4 h-4" /> Submit Session</>
            )}
          </button>
        </div>
      </div>

      {/* Alignment tips panel */}
      {joints.length > 0 && <AlignmentTips joints={joints} />}
    </div>
  );
}
