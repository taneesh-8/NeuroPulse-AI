/**
 * Pose angle calculation utilities for MediaPipe Pose landmarks
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** Calculate angle between three landmarks (in degrees) */
export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

/** MediaPipe landmark indices */
export const LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  NOSE: 0,
} as const;

export interface ExerciseTarget {
  name: string;
  description: string;
  targetAngles: {
    leftShoulder: number;
    rightShoulder: number;
    leftElbow: number;
    rightElbow: number;
    leftHip: number;
    rightHip: number;
    leftKnee: number;
    rightKnee: number;
  };
  tolerance: number; // degrees of acceptable deviation
}

export const EXERCISES: ExerciseTarget[] = [
  {
    name: "Standing Straight",
    description: "Stand upright with arms at your sides, feet shoulder-width apart",
    targetAngles: {
      leftShoulder: 10,
      rightShoulder: 10,
      leftElbow: 170,
      rightElbow: 170,
      leftHip: 175,
      rightHip: 175,
      leftKnee: 175,
      rightKnee: 175,
    },
    tolerance: 20,
  },
  {
    name: "Shoulder Raise",
    description: "Raise both arms straight out to the sides at shoulder height",
    targetAngles: {
      leftShoulder: 90,
      rightShoulder: 90,
      leftElbow: 170,
      rightElbow: 170,
      leftHip: 175,
      rightHip: 175,
      leftKnee: 175,
      rightKnee: 175,
    },
    tolerance: 20,
  },
  {
    name: "Arm Stretch",
    description: "Raise both arms straight above your head",
    targetAngles: {
      leftShoulder: 170,
      rightShoulder: 170,
      leftElbow: 170,
      rightElbow: 170,
      leftHip: 175,
      rightHip: 175,
      leftKnee: 175,
      rightKnee: 175,
    },
    tolerance: 20,
  },
  {
    name: "Seated Forward Bend",
    description: "Sit with legs straight and reach toward your toes",
    targetAngles: {
      leftShoulder: 90,
      rightShoulder: 90,
      leftElbow: 170,
      rightElbow: 170,
      leftHip: 70,
      rightHip: 70,
      leftKnee: 170,
      rightKnee: 170,
    },
    tolerance: 25,
  },
];

export interface JointAnalysis {
  joint: string;
  currentAngle: number;
  targetAngle: number;
  deviation: number;
  isGood: boolean;
  tip: string;
}

/** Analyze current pose against target exercise */
export function analyzePose(
  landmarks: Landmark[],
  exercise: ExerciseTarget
): { accuracy: number; joints: JointAnalysis[]; flags: string[] } {
  const lm = landmarks;
  const target = exercise.targetAngles;
  const tol = exercise.tolerance;

  const joints: JointAnalysis[] = [];
  const flags: string[] = [];

  // Left shoulder angle (hip-shoulder-elbow)
  const leftShoulderAngle = calculateAngle(
    lm[LANDMARKS.LEFT_HIP], lm[LANDMARKS.LEFT_SHOULDER], lm[LANDMARKS.LEFT_ELBOW]
  );
  const leftShoulderDev = Math.abs(leftShoulderAngle - target.leftShoulder);
  joints.push({
    joint: "Left Shoulder",
    currentAngle: leftShoulderAngle,
    targetAngle: target.leftShoulder,
    deviation: leftShoulderDev,
    isGood: leftShoulderDev <= tol,
    tip: leftShoulderDev > tol
      ? leftShoulderAngle < target.leftShoulder ? "Raise your left arm higher" : "Lower your left arm"
      : "Left shoulder aligned",
  });
  if (leftShoulderDev > tol) flags.push("Left shoulder misaligned");

  // Right shoulder angle
  const rightShoulderAngle = calculateAngle(
    lm[LANDMARKS.RIGHT_HIP], lm[LANDMARKS.RIGHT_SHOULDER], lm[LANDMARKS.RIGHT_ELBOW]
  );
  const rightShoulderDev = Math.abs(rightShoulderAngle - target.rightShoulder);
  joints.push({
    joint: "Right Shoulder",
    currentAngle: rightShoulderAngle,
    targetAngle: target.rightShoulder,
    deviation: rightShoulderDev,
    isGood: rightShoulderDev <= tol,
    tip: rightShoulderDev > tol
      ? rightShoulderAngle < target.rightShoulder ? "Raise your right arm higher" : "Lower your right arm"
      : "Right shoulder aligned",
  });
  if (rightShoulderDev > tol) flags.push("Right shoulder misaligned");

  // Left elbow angle (shoulder-elbow-wrist)
  const leftElbowAngle = calculateAngle(
    lm[LANDMARKS.LEFT_SHOULDER], lm[LANDMARKS.LEFT_ELBOW], lm[LANDMARKS.LEFT_WRIST]
  );
  const leftElbowDev = Math.abs(leftElbowAngle - target.leftElbow);
  joints.push({
    joint: "Left Elbow",
    currentAngle: leftElbowAngle,
    targetAngle: target.leftElbow,
    deviation: leftElbowDev,
    isGood: leftElbowDev <= tol,
    tip: leftElbowDev > tol
      ? leftElbowAngle < target.leftElbow ? "Straighten your left arm" : "Bend your left elbow slightly"
      : "Left elbow aligned",
  });
  if (leftElbowDev > tol) flags.push("Left elbow misaligned");

  // Right elbow angle
  const rightElbowAngle = calculateAngle(
    lm[LANDMARKS.RIGHT_SHOULDER], lm[LANDMARKS.RIGHT_ELBOW], lm[LANDMARKS.RIGHT_WRIST]
  );
  const rightElbowDev = Math.abs(rightElbowAngle - target.rightElbow);
  joints.push({
    joint: "Right Elbow",
    currentAngle: rightElbowAngle,
    targetAngle: target.rightElbow,
    deviation: rightElbowDev,
    isGood: rightElbowDev <= tol,
    tip: rightElbowDev > tol
      ? rightElbowAngle < target.rightElbow ? "Straighten your right arm" : "Bend your right elbow slightly"
      : "Right elbow aligned",
  });
  if (rightElbowDev > tol) flags.push("Right elbow misaligned");

  // Left hip angle (shoulder-hip-knee)
  const leftHipAngle = calculateAngle(
    lm[LANDMARKS.LEFT_SHOULDER], lm[LANDMARKS.LEFT_HIP], lm[LANDMARKS.LEFT_KNEE]
  );
  const leftHipDev = Math.abs(leftHipAngle - target.leftHip);
  joints.push({
    joint: "Left Hip",
    currentAngle: leftHipAngle,
    targetAngle: target.leftHip,
    deviation: leftHipDev,
    isGood: leftHipDev <= tol,
    tip: leftHipDev > tol
      ? leftHipAngle < target.leftHip ? "Straighten your back" : "Bend forward more"
      : "Left hip aligned",
  });
  if (leftHipDev > tol) flags.push("Spine bent");

  // Right hip angle
  const rightHipAngle = calculateAngle(
    lm[LANDMARKS.RIGHT_SHOULDER], lm[LANDMARKS.RIGHT_HIP], lm[LANDMARKS.RIGHT_KNEE]
  );
  const rightHipDev = Math.abs(rightHipAngle - target.rightHip);
  joints.push({
    joint: "Right Hip",
    currentAngle: rightHipAngle,
    targetAngle: target.rightHip,
    deviation: rightHipDev,
    isGood: rightHipDev <= tol,
    tip: rightHipDev > tol
      ? rightHipAngle < target.rightHip ? "Straighten your torso" : "Lean forward slightly"
      : "Right hip aligned",
  });

  // Left knee angle (hip-knee-ankle)
  const leftKneeAngle = calculateAngle(
    lm[LANDMARKS.LEFT_HIP], lm[LANDMARKS.LEFT_KNEE], lm[LANDMARKS.LEFT_ANKLE]
  );
  const leftKneeDev = Math.abs(leftKneeAngle - target.leftKnee);
  joints.push({
    joint: "Left Knee",
    currentAngle: leftKneeAngle,
    targetAngle: target.leftKnee,
    deviation: leftKneeDev,
    isGood: leftKneeDev <= tol,
    tip: leftKneeDev > tol
      ? leftKneeAngle < target.leftKnee ? "Straighten your left leg" : "Bend your left knee slightly"
      : "Left knee aligned",
  });
  if (leftKneeDev > tol) flags.push("Left knee misaligned");

  // Right knee angle
  const rightKneeAngle = calculateAngle(
    lm[LANDMARKS.RIGHT_HIP], lm[LANDMARKS.RIGHT_KNEE], lm[LANDMARKS.RIGHT_ANKLE]
  );
  const rightKneeDev = Math.abs(rightKneeAngle - target.rightKnee);
  joints.push({
    joint: "Right Knee",
    currentAngle: rightKneeAngle,
    targetAngle: target.rightKnee,
    deviation: rightKneeDev,
    isGood: rightKneeDev <= tol,
    tip: rightKneeDev > tol
      ? rightKneeAngle < target.rightKnee ? "Straighten your right leg" : "Bend your right knee slightly"
      : "Right knee aligned",
  });
  if (rightKneeDev > tol) flags.push("Right knee misaligned");

  // Calculate overall accuracy
  const maxDev = 90; // max deviation for 0% score
  const deviations = joints.map((j) => Math.min(j.deviation, maxDev));
  const avgDev = deviations.reduce((s, d) => s + d, 0) / deviations.length;
  const accuracy = Math.max(0, Math.round(100 - (avgDev / maxDev) * 100));

  return { accuracy, joints, flags: [...new Set(flags)] };
}

/** Get voice feedback based on accuracy */
export function getVoiceFeedback(accuracy: number, joints: JointAnalysis[]): string {
  if (accuracy >= 80) {
    return "Great job! Keep it up!";
  }
  if (accuracy >= 60) {
    const worstJoint = joints.reduce((a, b) => (a.deviation > b.deviation ? a : b));
    return `Almost there. ${worstJoint.tip}.`;
  }
  return "Let's reset. Follow the target pose carefully.";
}
