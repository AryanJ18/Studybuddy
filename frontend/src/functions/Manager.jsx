export function updateEvent(condition, ref, type, setEvents, minDuration = 500) {
  const now = Date.now();

  if (ref.current.active && ref.current.start === null) {
    ref.current.active = false;
  }

  // START
  if (condition === true) {
    if (!ref.current.active) {
      ref.current.active = true;
      ref.current.start = now;
    }
    return;
  }

  // END
  if (condition === false) {
    const startTimeSnapshot = ref.current.start;
    const wasActive = ref.current.active;

    // Always reset on false to avoid getting stuck in bad state.
    ref.current.active = false;
    ref.current.start = null;

    if (!wasActive || typeof startTimeSnapshot !== "number") return;

    const duration = now - startTimeSnapshot;
    if (!Number.isFinite(duration) || duration < minDuration) return;

    setEvents(prev => [
      ...prev,
      {
        type,
        startTime: startTimeSnapshot,
        endTime: now,
        duration
      }
    ]);
  }
}