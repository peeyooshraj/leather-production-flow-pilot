import test from "node:test";
import assert from "node:assert/strict";
import { STATES, classifySeries, planVariance, unionIntervals, downtimePareto, scopedDowntimePareto, qualityBalance } from "../src/engines.js";

const obs = (hour, good, queue, extra = {}) => ({
  intervalStart: new Date(`2026-10-05T${String(hour).padStart(2,"0")}:00:00Z`),
  intervalEnd: new Date(`2026-10-05T${String(hour + 1).padStart(2,"0")}:00:00Z`),
  goodOutput: good, queueBefore: queue, plannedStopMinutes: 0, unplannedStopMinutes: 0, ...extra
});

test("persistent rate deficit plus growing queue becomes possible constraint", () => {
  const r = classifySeries({ observations: [obs(9,65,30),obs(10,48,50),obs(11,46,78)], required: 60 });
  assert.equal(r.state, STATES.POSSIBLE_CONSTRAINT);
});

test("low output without work is starvation, not a constraint", () => {
  const r = classifySeries({ observations: [obs(9,30,0),obs(10,20,0)], required: 60, minQueue: 5 });
  assert.equal(r.state, STATES.STARVED);
});

test("missing evidence remains unknown, never zero", () => {
  const r = classifySeries({ observations: [obs(9,null,null)], required: 60 });
  assert.equal(r.state, STATES.UNKNOWN);
});

test("plan variance cannot create negative loss", () => {
  assert.deepEqual(planVariance(500,520), { signedVariance: 20, shortfall: 0 });
  assert.deepEqual(planVariance(500,427), { signedVariance: -73, shortfall: 73 });
});

test("overlapping downtime is unioned without double counting", () => {
  const r = unionIntervals([
    { start:"2026-10-05T10:10:00Z", end:"2026-10-05T10:40:00Z" },
    { start:"2026-10-05T10:25:00Z", end:"2026-10-05T10:55:00Z" }
  ]);
  assert.equal(r.totalMinutes,45);
});

test("nested downtime remains the outer interval", () => {
  const r = unionIntervals([
    { start:"2026-10-05T10:00:00Z", end:"2026-10-05T11:00:00Z" },
    { start:"2026-10-05T10:20:00Z", end:"2026-10-05T10:30:00Z" }
  ]);
  assert.equal(r.totalMinutes,60);
});

test("pareto exposes overlapping causes rather than inventing allocation", () => {
  const r = downtimePareto([
    { id:"M", category:"MACHINE", start:"2026-10-05T10:10:00Z", end:"2026-10-05T10:40:00Z" },
    { id:"A", category:"MATERIAL", start:"2026-10-05T10:25:00Z", end:"2026-10-05T10:55:00Z" }
  ]);
  assert.deepEqual(Object.fromEntries(r.map(x=>[x.category,x.minutes])), { MACHINE:15, OVERLAP_UNRESOLVED:15, MATERIAL:15 });
});

test("quality genealogy conserves physical units", () => {
  assert.equal(qualityBalance({ failed:10,recovered:8,rejected:2,inRework:0 }).balanced,true);
  assert.throws(() => qualityBalance({ failed:10,recovered:8,rejected:5,inRework:0 }), /conservation failed/);
});

test("planned full-interval stop is not classified as poor performance", () => {
  const r = classifySeries({ observations: [obs(9,0,50,{plannedStopMinutes:60})], required:60 });
  assert.equal(r.state, STATES.PLANNED_STOP);
});

test("invalid stop duration fails fast", () => {
  assert.throws(() => classifySeries({ observations:[obs(9,0,10,{plannedStopMinutes:61})], required:60 }), /cannot exceed/);
});

test("adjacent intervals do not double count time", () => {
  const r = unionIntervals([
    { start:"2026-10-05T10:00:00Z", end:"2026-10-05T10:30:00Z" },
    { start:"2026-10-05T10:30:00Z", end:"2026-10-05T11:00:00Z" }
  ]);
  assert.equal(r.totalMinutes,60);
});

test("cross-midnight interval has correct duration", () => {
  const r = unionIntervals([{ start:"2026-10-05T23:50:00Z", end:"2026-10-06T00:20:00Z" }]);
  assert.equal(r.totalMinutes,30);
});

test("events from different operations are never collapsed into one downtime timeline", () => {
  const r = scopedDowntimePareto([
    { id:"C", operation:"Cutting", category:"MACHINE", start:"2026-10-05T10:00:00Z", end:"2026-10-05T10:30:00Z" },
    { id:"S", operation:"Stitching", category:"MACHINE", start:"2026-10-05T10:00:00Z", end:"2026-10-05T10:30:00Z" }
  ]);
  assert.equal(r.length,2);
  assert.deepEqual(r.map(x=>[x.scope,x.minutes]).sort(),[["Cutting",30],["Stitching",30]]);
});

test("intentional batch buffer cannot be mislabelled as a constraint from queue growth", () => {
  const r = classifySeries({ observations:[obs(9,48,40),obs(10,45,90,{intentionalBuffer:true})], required:60, minQueue:5 });
  assert.equal(r.state, STATES.PLANNED_BUFFER);
});

test("a high queue with adequate rate is not automatically a constraint", () => {
  const r = classifySeries({ observations:[obs(9,65,100),obs(10,66,140)], required:60, minQueue:5 });
  assert.equal(r.state, STATES.HEALTHY);
});

test("one bad interval is pressure, not yet a persistent constraint", () => {
  const r = classifySeries({ observations:[obs(9,65,20),obs(10,45,60)], required:60, minQueue:5, persistenceIntervals:2 });
  assert.equal(r.state, STATES.PRESSURE);
});

test("a quality cohort may remain legitimately in rework", () => {
  assert.equal(qualityBalance({failed:10,recovered:4,rejected:1,inRework:5}).balanced,true);
});

test("triple overlap is segmented without inventing a primary cause", () => {
  const r = downtimePareto([
    {id:"1",category:"MACHINE",start:"2026-10-05T10:00:00Z",end:"2026-10-05T11:00:00Z"},
    {id:"2",category:"MATERIAL",start:"2026-10-05T10:15:00Z",end:"2026-10-05T10:45:00Z"},
    {id:"3",category:"QUALITY",start:"2026-10-05T10:30:00Z",end:"2026-10-05T10:40:00Z"}
  ]);
  const totals=Object.fromEntries(r.map(x=>[x.category,x.minutes]));
  assert.equal(totals.MACHINE,30);
  assert.equal(totals.OVERLAP_UNRESOLVED,30);
});

test("unknown category remains visible instead of disappearing from pareto", () => {
  const r=downtimePareto([{id:"U",category:"UNKNOWN",start:"2026-10-05T10:00:00Z",end:"2026-10-05T10:12:00Z"}]);
  assert.deepEqual(r,[{category:"UNKNOWN",minutes:12}]);
});

test("negative production is rejected rather than normalized", () => {
  assert.throws(()=>planVariance(500,-1),/non-negative/);
});
