export const STATES = Object.freeze({
  UNKNOWN: "UNKNOWN",
  HEALTHY: "HEALTHY",
  PRESSURE: "PRESSURE",
  POSSIBLE_CONSTRAINT: "POSSIBLE_CONSTRAINT",
  STARVED: "STARVED",
  PLANNED_STOP: "PLANNED_STOP",
  UNPLANNED_STOP: "UNPLANNED_STOP",
  PLANNED_BUFFER: "PLANNED_BUFFER",
  CONFLICTED: "CONFLICTED"
});

export function assertNonNegative(value, field) {
  if (value == null) return;
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a non-negative finite number`);
}

export function validateObservation(o) {
  for (const field of ["goodOutput", "queueBefore", "plannedStopMinutes", "unplannedStopMinutes"]) {
    assertNonNegative(o[field], field);
  }
  if (!(o.intervalStart instanceof Date) || !(o.intervalEnd instanceof Date) || o.intervalEnd <= o.intervalStart) {
    throw new Error("intervalEnd must be after intervalStart");
  }
  const minutes = (o.intervalEnd - o.intervalStart) / 60000;
  const stopped = (o.plannedStopMinutes ?? 0) + (o.unplannedStopMinutes ?? 0);
  if (stopped > minutes) throw new Error("stop minutes cannot exceed interval duration");
  return true;
}

export function calendarRate(o) {
  validateObservation(o);
  if (o.goodOutput == null) return null;
  const hours = (o.intervalEnd - o.intervalStart) / 3600000;
  return o.goodOutput / hours;
}

export function runningRate(o) {
  validateObservation(o);
  if (o.goodOutput == null) return null;
  const total = (o.intervalEnd - o.intervalStart) / 60000;
  const productive = total - (o.plannedStopMinutes ?? 0) - (o.unplannedStopMinutes ?? 0);
  return productive === 0 ? null : o.goodOutput / (productive / 60);
}

export function requiredRate({ plannedQuantity, cumulativeGood, remainingProductiveHours }) {
  [plannedQuantity, cumulativeGood].forEach((v, i) => assertNonNegative(v, i ? "cumulativeGood" : "plannedQuantity"));
  assertNonNegative(remainingProductiveHours, "remainingProductiveHours");
  if (remainingProductiveHours === 0) return null;
  return Math.max(0, plannedQuantity - cumulativeGood) / remainingProductiveHours;
}

export function classifyInterval({ current, previous, required, minQueue = 1, conflicted = false, scheduled = true }) {
  if (conflicted) return { state: STATES.CONFLICTED, reasons: ["Conflicting observations require resolution"] };
  if (!scheduled) return { state: STATES.UNKNOWN, reasons: ["Operation not scheduled"] };
  validateObservation(current);
  if (current.goodOutput == null || current.queueBefore == null || required == null) {
    return { state: STATES.UNKNOWN, reasons: ["Required evidence is missing"] };
  }
  const duration = (current.intervalEnd - current.intervalStart) / 60000;
  if ((current.plannedStopMinutes ?? 0) === duration) return { state: STATES.PLANNED_STOP, reasons: ["Whole interval is a planned stop"] };
  if ((current.unplannedStopMinutes ?? 0) > 0 && current.goodOutput === 0) return { state: STATES.UNPLANNED_STOP, reasons: ["Unplanned stop with no output"] };
  if (current.intentionalBuffer === true) return { state: STATES.PLANNED_BUFFER, reasons: ["Queue is marked as an intentional production buffer; queue growth is not used as bottleneck evidence"] };

  const rate = calendarRate(current);
  if (current.queueBefore < minQueue && rate < required) {
    return { state: STATES.STARVED, reasons: ["Insufficient work available", "Observed rate is below required rate"] };
  }
  if (!previous || previous.queueBefore == null) {
    return rate < required
      ? { state: STATES.UNKNOWN, reasons: ["Rate deficit observed but queue trend is not yet available"] }
      : { state: STATES.HEALTHY, reasons: ["Observed rate meets current requirement"] };
  }
  const queueDelta = current.queueBefore - previous.queueBefore;
  if (rate < required && queueDelta > 0) {
    return { state: STATES.PRESSURE, reasons: ["Work is available", "Observed rate is below required rate", "Queue is increasing"], rate, queueDelta };
  }
  return { state: STATES.HEALTHY, reasons: ["No combined rate-deficit and queue-growth signal"], rate, queueDelta };
}

export function classifySeries({ observations, required, minQueue = 1, persistenceIntervals = 2 }) {
  if (!observations.length) return { state: STATES.UNKNOWN, reasons: ["No observations"] };
  const results = observations.map((current, i) => classifyInterval({ current, previous: observations[i - 1], required, minQueue }));
  const tail = results.slice(-persistenceIntervals);
  if (tail.length === persistenceIntervals && tail.every(r => r.state === STATES.PRESSURE)) {
    return { ...results.at(-1), state: STATES.POSSIBLE_CONSTRAINT, reasons: [...results.at(-1).reasons, `Pressure persisted for ${persistenceIntervals} valid intervals`] };
  }
  return results.at(-1);
}

export function planVariance(planned, actualGood) {
  assertNonNegative(planned, "planned");
  assertNonNegative(actualGood, "actualGood");
  return { signedVariance: actualGood - planned, shortfall: Math.max(0, planned - actualGood) };
}

export function unionIntervals(intervals) {
  if (!intervals.length) return { intervals: [], totalMinutes: 0 };
  const normalized = intervals.map(({ start, end }) => {
    const s = new Date(start); const e = new Date(end);
    if (!Number.isFinite(+s) || !Number.isFinite(+e) || e <= s) throw new Error("Invalid interval");
    return { start: s, end: e };
  }).sort((a, b) => a.start - b.start);
  const merged = [{ ...normalized[0] }];
  for (const next of normalized.slice(1)) {
    const cur = merged.at(-1);
    if (next.start <= cur.end) cur.end = new Date(Math.max(+cur.end, +next.end));
    else merged.push({ ...next });
  }
  return { intervals: merged, totalMinutes: merged.reduce((sum, x) => sum + (x.end - x.start) / 60000, 0) };
}

export function segmentEvents(events) {
  const clean = events.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) }));
  clean.forEach(e => { if (!Number.isFinite(+e.start) || !Number.isFinite(+e.end) || e.end <= e.start) throw new Error("Invalid event interval"); });
  const points = [...new Set(clean.flatMap(e => [+e.start, +e.end]))].sort((a, b) => a - b);
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = new Date(points[i]); const end = new Date(points[i + 1]);
    const active = clean.filter(e => e.start < end && e.end > start);
    if (active.length) segments.push({ start, end, minutes: (end - start) / 60000, eventIds: active.map(e => e.id), categories: active.map(e => e.category) });
  }
  return segments;
}

export function downtimePareto(events) {
  const segments = segmentEvents(events);
  const totals = new Map();
  for (const s of segments) {
    const unique = [...new Set(s.categories)];
    const key = unique.length === 1 ? unique[0] : "OVERLAP_UNRESOLVED";
    totals.set(key, (totals.get(key) ?? 0) + s.minutes);
  }
  return [...totals.entries()].map(([category, minutes]) => ({ category, minutes })).sort((a, b) => b.minutes - a.minutes);
}

export function scopedDowntimePareto(events, scopeField = "operation") {
  const groups = new Map();
  for (const event of events) {
    const scope = event[scopeField];
    if (!scope) throw new Error(`Every event needs ${scopeField} before scoped aggregation`);
    if (!groups.has(scope)) groups.set(scope, []);
    groups.get(scope).push(event);
  }
  return [...groups.entries()].flatMap(([scope, scopedEvents]) =>
    downtimePareto(scopedEvents).map(row => ({ ...row, scope }))
  ).sort((a,b)=>b.minutes-a.minutes);
}

export function qualityBalance({ failed, recovered = 0, rejected = 0, inRework = 0 }) {
  [failed, recovered, rejected, inRework].forEach((v, i) => assertNonNegative(v, ["failed", "recovered", "rejected", "inRework"][i]));
  const accounted = recovered + rejected + inRework;
  if (accounted !== failed) throw new Error(`Quality conservation failed: ${failed} failed but ${accounted} accounted`);
  return { failed, recovered, rejected, inRework, balanced: true };
}
