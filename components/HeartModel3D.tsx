"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface HeartMeshProps {
  bpm: number;
  spo2?: number;
}

function AnatomicalHeart({ bpm, spo2 = 98 }: HeartMeshProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const mainMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const targetColor = useRef(new THREE.Color("#00e676"));

  const heartGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.5);
    shape.bezierCurveTo(0, 0.8, -0.1, 1.1, -0.5, 1.1);
    shape.bezierCurveTo(-1.0, 1.1, -1.0, 0.5, -1.0, 0.5);
    shape.bezierCurveTo(-1.0, 0.0, -0.5, -0.5, 0, -1.0);
    shape.bezierCurveTo(0.5, -0.5, 1.0, 0.0, 1.0, 0.5);
    shape.bezierCurveTo(1.0, 0.5, 1.0, 1.1, 0.5, 1.1);
    shape.bezierCurveTo(0.1, 1.1, 0, 0.8, 0, 0.5);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.7, bevelEnabled: true, bevelSegments: 16,
      steps: 3, bevelSize: 0.25, bevelThickness: 0.15,
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, []);

  const leftVentricle = useMemo(() => new THREE.SphereGeometry(0.42, 24, 24), []);
  const rightVentricle = useMemo(() => new THREE.SphereGeometry(0.36, 24, 24), []);
  const leftAtrium = useMemo(() => new THREE.SphereGeometry(0.28, 20, 20), []);
  const rightAtrium = useMemo(() => new THREE.SphereGeometry(0.25, 20, 20), []);
  const aortaGeo = useMemo(() => new THREE.CylinderGeometry(0.1, 0.18, 1.2, 16), []);
  const aortaArchGeo = useMemo(() => new THREE.TorusGeometry(0.25, 0.09, 12, 16, Math.PI * 0.7), []);
  const pulmonaryGeo = useMemo(() => new THREE.CylinderGeometry(0.07, 0.14, 0.9, 12), []);
  const svcGeo = useMemo(() => new THREE.CylinderGeometry(0.09, 0.12, 0.8, 10), []);
  const ivcGeo = useMemo(() => new THREE.CylinderGeometry(0.1, 0.13, 0.7, 10), []);

  const coronaryPath = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.3, 0.1, 0.5), new THREE.Vector3(-0.1, -0.2, 0.55),
      new THREE.Vector3(0.15, -0.4, 0.5), new THREE.Vector3(0.35, -0.1, 0.45),
      new THREE.Vector3(0.2, 0.2, 0.5),
    ]);
    return new THREE.TubeGeometry(c, 32, 0.02, 6, false);
  }, []);

  const coronaryPath2 = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, 0.3, 0.5), new THREE.Vector3(-0.15, 0.0, 0.55),
      new THREE.Vector3(-0.3, -0.3, 0.5), new THREE.Vector3(-0.1, -0.5, 0.45),
    ]);
    return new THREE.TubeGeometry(c, 24, 0.015, 6, false);
  }, []);

  useFrame((state) => {
    if (!groupRef.current || !mainMatRef.current) return;
    const t = state.clock.elapsedTime;

    const beatInterval = 60 / Math.max(bpm, 30);
    const phase = (t % beatInterval) / beatInterval;
    const systole = Math.sin(phase * Math.PI * 2);
    const beatScale = 1.0 + 0.08 * Math.max(0, systole);
    groupRef.current.scale.setScalar(beatScale);
    groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.08;
    groupRef.current.rotation.x = Math.sin(t * 0.15) * 0.03;

    let newColor: THREE.Color;
    if (bpm < 60) newColor = new THREE.Color("#1565c0");
    else if (bpm <= 100) newColor = new THREE.Color("#00e676");
    else if (bpm <= 120) newColor = new THREE.Color("#ffd600");
    else newColor = new THREE.Color("#ff1744");
    targetColor.current.lerp(newColor, 0.04);
    mainMatRef.current.color.copy(targetColor.current);

    if (bpm > 120) {
      const p = Math.sin(t * 6) * 0.4 + 0.4;
      mainMatRef.current.emissive.setRGB(p * 0.8, 0, 0);
      mainMatRef.current.emissiveIntensity = 1.2;
    } else if (bpm < 60) {
      const p = Math.sin(t * 2) * 0.2 + 0.2;
      mainMatRef.current.emissive.setRGB(0, 0, p * 0.5);
      mainMatRef.current.emissiveIntensity = 0.8;
    } else if (bpm <= 100) {
      const p = Math.sin(t * 3) * 0.15 + 0.15;
      mainMatRef.current.emissive.setRGB(0, p * 0.4, p * 0.1);
      mainMatRef.current.emissiveIntensity = 0.6;
    } else {
      mainMatRef.current.emissive.lerp(new THREE.Color(0, 0, 0), 0.05);
      mainMatRef.current.emissiveIntensity = 0.3;
    }

    let tgt = 1.0;
    if (spo2 !== undefined && spo2 !== -1) {
      if (spo2 >= 95) tgt = 1.0;
      else if (spo2 >= 90) tgt = 0.75;
      else tgt = 0.5;
    }
    mainMatRef.current.opacity += (tgt - mainMatRef.current.opacity) * 0.03;
  });

  return (
    <group ref={groupRef} rotation={[0, 0, Math.PI]} position={[0, -0.1, 0]}>
      <mesh geometry={heartGeo} castShadow>
        <meshStandardMaterial ref={mainMatRef} color="#00e676" roughness={0.35} metalness={0.15} transparent opacity={1} />
      </mesh>
      <mesh geometry={leftVentricle} position={[-0.35, 0.15, 0.12]} castShadow>
        <meshStandardMaterial color="#00c853" roughness={0.4} metalness={0.1} transparent opacity={0.85} />
      </mesh>
      <mesh geometry={rightVentricle} position={[0.32, 0.1, 0.1]} castShadow>
        <meshStandardMaterial color="#00c853" roughness={0.4} metalness={0.1} transparent opacity={0.85} />
      </mesh>
      <mesh geometry={leftAtrium} position={[-0.35, -0.45, 0.05]} castShadow>
        <meshStandardMaterial color="#1b5e20" roughness={0.45} metalness={0.1} transparent opacity={0.8} />
      </mesh>
      <mesh geometry={rightAtrium} position={[0.3, -0.4, 0.05]} castShadow>
        <meshStandardMaterial color="#1b5e20" roughness={0.45} metalness={0.1} transparent opacity={0.8} />
      </mesh>
      <mesh geometry={aortaGeo} position={[-0.15, -0.95, 0]} rotation={[0, 0, -0.15]} castShadow>
        <meshStandardMaterial color="#8b0000" roughness={0.3} metalness={0.2} transparent opacity={0.9} />
      </mesh>
      <mesh geometry={aortaArchGeo} position={[0.05, -1.5, 0]} rotation={[Math.PI / 2, 0, Math.PI * 0.3]} castShadow>
        <meshStandardMaterial color="#8b0000" roughness={0.3} metalness={0.2} transparent opacity={0.9} />
      </mesh>
      <mesh geometry={pulmonaryGeo} position={[0.2, -0.9, 0.15]} rotation={[0, 0, 0.25]} castShadow>
        <meshStandardMaterial color="#8b0000" roughness={0.35} metalness={0.15} transparent opacity={0.9} />
      </mesh>
      <mesh geometry={svcGeo} position={[0.35, -0.8, -0.1]} rotation={[0, 0, 0.1]} castShadow>
        <meshStandardMaterial color="#1a237e" roughness={0.4} metalness={0.1} transparent opacity={0.85} />
      </mesh>
      <mesh geometry={ivcGeo} position={[0.25, 0.55, -0.1]} rotation={[0, 0, -0.05]} castShadow>
        <meshStandardMaterial color="#1a237e" roughness={0.4} metalness={0.1} transparent opacity={0.85} />
      </mesh>
      <mesh geometry={coronaryPath} castShadow>
        <meshStandardMaterial color="#ff6f00" roughness={0.3} metalness={0.3} />
      </mesh>
      <mesh geometry={coronaryPath2} castShadow>
        <meshStandardMaterial color="#ff6f00" roughness={0.3} metalness={0.3} />
      </mesh>
    </group>
  );
}

function ParticleField() {
  const meshRef = useRef<THREE.Points>(null!);
  useEffect(() => {
    if (!meshRef.current) return;
    const count = 300;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    meshRef.current.geometry = geo;
  }, []);
  useFrame((s) => { if (meshRef.current) meshRef.current.rotation.y = s.clock.elapsedTime * 0.015; });
  return (
    <points ref={meshRef}>
      <bufferGeometry />
      <pointsMaterial size={0.03} color="#00f0ff" transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

/**
 * Sketchfab embedded heart — all UI hidden via CSS overlay masking.
 * The iframe is scaled up and positioned so only the 3D model is visible.
 */
function SketchfabHeart() {
  return (
    <div className="sketchfab-clean">
      <iframe
        title="Animated Human Heart"
        src="https://sketchfab.com/models/775d6629622740de8a5ed61a959c7506/embed?autostart=1&transparent=0&ui_theme=dark&dnt=1&ui_infos=0&ui_controls=0&ui_stop=0&ui_inspector=0&ui_watermark=0&ui_watermark_link=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&ui_hint=0&ui_ar=0&preload=1&camera=0&scrollwheel=0"
        className="sketchfab-iframe"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
      />
      {/* Cover strips to hide Sketchfab UI elements */}
      <div className="skf-cover skf-cover-top" />
      <div className="skf-cover skf-cover-bottom" />
      <div className="skf-cover skf-cover-top-left" />
    </div>
  );
}

interface HeartModel3DProps {
  bpm: number;
  spo2?: number;
  showControls?: boolean;
}

export default function HeartModel3D({ bpm, spo2, showControls = true }: HeartModel3DProps) {
  const [viewMode, setViewMode] = useState<"sketchfab" | "reactive">("sketchfab");

  let statusLabel: string, statusColor: string, statusBg: string;
  if (bpm < 60) {
    statusLabel = "Bradycardia"; statusColor = "text-blue-400"; statusBg = "bg-blue-400";
  } else if (bpm <= 100) {
    statusLabel = "Normal"; statusColor = "text-safe-green"; statusBg = "bg-safe-green";
  } else if (bpm <= 120) {
    statusLabel = "Elevated"; statusColor = "text-warning-yellow"; statusBg = "bg-warning-yellow";
  } else {
    statusLabel = "DANGER"; statusColor = "text-alert-red"; statusBg = "bg-alert-red";
  }

  return (
    <div className="np-card relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          💓 3D Heart Digital Twin
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-card-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("sketchfab")}
              className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${viewMode === "sketchfab" ? "bg-primary text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              Anatomy
            </button>
            <button
              onClick={() => setViewMode("reactive")}
              className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${viewMode === "reactive" ? "bg-primary text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              Reactive
            </button>
          </div>
          <span className={`text-xs font-mono font-bold ${statusColor}`}>
            {bpm > 0 ? `${Math.round(bpm)} BPM` : "—"}
          </span>
          <span className={`w-2 h-2 rounded-full animate-pulse ${statusBg}`} />
        </div>
      </div>

      <div className="h-80 rounded-xl overflow-hidden bg-[#030308] border border-card-border relative">
        {viewMode === "sketchfab" ? (
          <SketchfabHeart />
        ) : (
          <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} shadows>
            <ambientLight intensity={0.3} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
            <pointLight position={[-3, -3, 3]} intensity={0.6} color="#ff4444" />
            <pointLight position={[0, 3, -2]} intensity={0.3} color="#00f0ff" />
            <spotLight position={[0, -5, 3]} intensity={0.5} angle={0.5} />
            <AnatomicalHeart bpm={bpm} spo2={spo2} />
            <ParticleField />
            {showControls && <OrbitControls enablePan={false} minDistance={2.5} maxDistance={8} autoRotate autoRotateSpeed={0.5} />}
          </Canvas>
        )}

        {/* BPM overlay on Sketchfab view */}
        {viewMode === "sketchfab" && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
            <div className={`px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur border border-card-border ${statusColor}`}>
              <span className="text-lg font-bold font-mono">{Math.round(bpm)}</span>
              <span className="text-xs ml-1">BPM</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur border border-card-border ${statusColor}`}>
              <span className="text-sm font-bold">{statusLabel}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> &lt;60</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-safe-green inline-block" /> 60-100</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning-yellow inline-block" /> 100-120</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-alert-red inline-block" /> &gt;120</span>
        </div>
        <span className={`text-xs font-bold ${statusColor}`}>{statusLabel}</span>
      </div>
    </div>
  );
}
