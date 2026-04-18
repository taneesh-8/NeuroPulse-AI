"use client";

interface GyroReadoutProps {
  gx: number;
  gy: number;
  gz: number;
  ax: number;
  ay: number;
  az: number;
  loading?: boolean;
}

export default function GyroReadout({ gx, gy, gz, ax, ay, az, loading }: GyroReadoutProps) {
  if (loading) {
    return (
      <div className="np-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔄</span>
          <span className="text-sm text-muted font-medium uppercase tracking-wider">
            Motion Sensors
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const gyroAxes = [
    { label: "X", value: gx, color: "#ff6b6b" },
    { label: "Y", value: gy, color: "#51cf66" },
    { label: "Z", value: gz, color: "#339af0" },
  ];

  const accelAxes = [
    { label: "X", value: ax, color: "#ff6b6b" },
    { label: "Y", value: ay, color: "#51cf66" },
    { label: "Z", value: az, color: "#339af0" },
  ];

  return (
    <div className="np-card">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔄</span>
        <span className="text-sm text-muted font-medium uppercase tracking-wider">
          Motion Sensors
        </span>
      </div>

      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
          Gyroscope (rad/s)
        </p>
        <div className="grid grid-cols-3 gap-3">
          {gyroAxes.map((axis) => (
            <div
              key={`gyro-${axis.label}`}
              className="bg-background/50 rounded-xl p-3 text-center border border-card-border"
            >
              <span
                className="text-xs font-bold block mb-1"
                style={{ color: axis.color }}
              >
                {axis.label}
              </span>
              <span
                className="live-value text-lg block animate-number"
                style={{ color: axis.color }}
                key={axis.value}
              >
                {axis.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
          Accelerometer (g)
        </p>
        <div className="grid grid-cols-3 gap-3">
          {accelAxes.map((axis) => (
            <div
              key={`accel-${axis.label}`}
              className="bg-background/50 rounded-xl p-3 text-center border border-card-border"
            >
              <span
                className="text-xs font-bold block mb-1"
                style={{ color: axis.color }}
              >
                {axis.label}
              </span>
              <span
                className="live-value text-lg block animate-number"
                style={{ color: axis.color }}
                key={axis.value}
              >
                {axis.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
