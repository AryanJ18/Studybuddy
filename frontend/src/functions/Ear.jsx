
function distance(p1, p2) {
  return Math.sqrt(
    (p1.x - p2.x) ** 2 +(p1.y - p2.y) ** 2
  );

}

export function calculateEAR(eyePoints) {
  const A = distance(eyePoints[1], eyePoints[5]);

  const B = distance(eyePoints[2], eyePoints[4]);

  const C = distance(eyePoints[0], eyePoints[3]);

  return (A + B) / (2 * C);

}

