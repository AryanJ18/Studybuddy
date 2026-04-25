export function detectAttention(landmarks) {
  const nose = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const forehead = landmarks[10];
  const chin = landmarks[152];

  // YAW
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const yaw = nose.x - eyeCenterX;

  // PITCH
  const faceHeight = chin.y - forehead.y;
  const nosePosition = (nose.y - forehead.y) / faceHeight;

  if (yaw > 0.03) return "right";
  if (yaw < -0.03) return "left";
  if (nosePosition > 0.6) return "down";
  if (nosePosition < 0.4) return "up";

  return "focused";
}