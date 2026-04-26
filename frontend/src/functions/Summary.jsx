export function generateSummary(sessionData) {
  const { events, start, end } = sessionData;

  let eyesClosedCount = 0;
  let phoneCount = 0;
  let distractionCount = 0;

  let totalWastedTime = 0;

  events.forEach((event) => {
    totalWastedTime += event.duration;

    if (event.type === "eyes_closed") eyesClosedCount++;
    if (event.type === "phone") phoneCount++;
    if (event.type === "looking_away") distractionCount++;
  });

  const totalTime = end - start;
  const focusedTime = totalTime - totalWastedTime;

  return {
    totalTime,
    focusedTime,
    totalWastedTime,
    eyesClosedCount,
    phoneCount,
    distractionCount
  };
}