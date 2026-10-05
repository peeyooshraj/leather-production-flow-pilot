# Flow Pilot user manual

This is the operating guide for the Leather Production Flow Pilot. It uses plain language, but the rules underneath are the rules implemented by the prototype.

## Before using real data

Learn with the synthetic demo first. Use real company production data only after the company has permitted the pilot and the data being collected.

The current prototype stores entries in one browser on one device. It has no backend, shared database, user accounts, multi-device synchronization or ERP connection.

## Four terms

| Term | Plain meaning | Operational meaning |
|---|---|---|
| Good output | Finished acceptable work | Acceptable completed transfer units for the observation interval |
| WIP | Work waiting | Comparable transfer units waiting before the selected operation at the agreed point |
| Required rate | How fast the step needs to move | Configured good transfer units per hour used by the Radar |
| Plan gap | How far actual is below target | `max(0, target - actual good output)`; arithmetic, not a cause |

## Three discipline rules

1. Blank means unknown. Do not type zero merely because you do not know.
2. Record what you saw before writing what you think caused it.
3. Keep units and observation points consistent.

## Use case 1: normal hourly observation

**Why:** The Radar needs comparable observations rather than memory or impressions.

**What:** At the end of an interval, record the operation, acceptable good output, comparable WIP waiting before it and the minutes represented.

**How:** Open Hourly Update, select the operation, enter the observed values, choose the stop context and save.

**Exact rule:** Negative or non-finite values are rejected. Missing Good output or WIP remains missing evidence. Calendar rate is good output divided by interval hours.

**Boundary:** Do not estimate an unknown WIP count. Do not count incomplete or unaccepted rework as good output.

## Use case 2: growing queue

**Why:** The biggest pile is not automatically the system constraint.

**What:** Work is available, observed rate is below the configured required rate and WIP is higher than in the previous valid observation.

**How:** Record another comparable interval before escalating the signal.

**Exact rule:** One qualifying interval is PRESSURE. With the current persistence setting, two consecutive PRESSURE classifications become POSSIBLE_CONSTRAINT.

**Boundary:** Possible constraint means investigate here. It does not prove root cause, lost units or responsible worker.

## Use case 3: starvation

**Why:** A station can be slow because it has too little work to process.

**What:** Rate is below requirement and WIP before the station is below the minimum work-available threshold.

**How:** Record the low output and low WIP honestly, then investigate upstream feed/release conditions.

**Exact rule:** With the current UI setting, queue below 5 plus rate below required becomes STARVED before queue-growth pressure is evaluated.

**Boundary:** Starvation does not itself explain why upstream work was unavailable.

## Use case 4: intentional batch or buffer

**Why:** Some processes deliberately accumulate work for batching, matching, inspection or movement.

**How:** Mark WIP as an intentional planned buffer/batch only when that condition is genuinely planned.

**Exact rule:** Intentional buffer classification occurs before queue growth can be used as constraint evidence.

**Boundary:** Do not use this flag to hide an unexpected queue.

## Use case 5: machine stoppage

**Why:** Memory is unreliable for exact start/end times.

**How:** In Loss Accounting choose the operation and Machine/equipment, write only the observed condition, start the issue timer when blocking begins and resolve it when the condition ends.

**Exact rule:** Event timestamps become time evidence. They are not automatically converted into lost output units.

**Contrast:** “Machine stopped” can be observed. “Motor failure caused the loss” is a deeper causal attribution.

## Use case 6: material shortage

**What:** A required component is unavailable at the operation and work is blocked.

**How:** Record the affected operation, Material/component, and an observation such as “required zip not at station”.

**Principle:** Location of a symptom is not proof of origin.

**Boundary:** The category MATERIAL is not proof that Procurement or a supplier caused the event.

## Use case 7: quality failure and rework

**Why:** First-pass failure and final rejection are different states of the same physical unit.

**How:** Record inspected quantity, first-pass failures and split each failed unit into recovered, final reject or still in rework.

**Exact rule:** `failed = recovered + rejected + inRework`.

**Example:** 100 inspected, 10 failed first pass, 8 recovered, 2 rejected, 0 pending. First-pass good is 90; final rejects are 2, not 12.

## Use case 8: correcting a wrong entry

**Why:** Silent overwrites destroy provenance.

**How:** Select the saved observation, enter corrected Good output/WIP and give a specific reason.

**Exact rule:** Previous values are retained in revision history and an audit entry is created.

**Boundary:** Correction is for a proven entry error, not for making an uncomfortable accurate result look better.

## Use case 9: closing and reopening a shift

**How:** Resolve open timed disturbances, update final good output, review the figures and close the shift.

**Exact rule:** A shift with an open disturbance cannot close. Normal operational entries are blocked after close. Reopening requires a reason and produces an audit record.

**Boundary:** The one-device audit trail is not equivalent to enterprise multi-user access control.

## Use case 10: recording an intervention

**How:** Choose a resolved issue, record the action actually taken and select the observed outcome: Not known yet, Improved afterward, No material change or Worsened afterward.

**Exact rule:** The prototype stores the action, outcome category and timestamp. It does not calculate a causal effect.

**Principle:** After is not the same as because of.

## Use case 11: target 500, actual 427

**What:** Plan gap is 73 good units.

**Exact rule:** `max(0, 500 - 427) = 73`.

**How:** Use timed disturbances, quality genealogy and flow observations as separate evidence when investigating the gap.

**Boundary:** A 30-minute machine event cannot automatically be relabelled as 30 of the 73 missing units.

## Use case 12: overlapping disturbances

**Why:** Two recorded conditions can be active during the same clock minute.

**How:** Record each real event with its own timestamps and let the engine segment the timeline.

**Exact rule:** A segment with one unique category is credited to that category. A same-operation segment containing multiple categories becomes `OVERLAP_UNRESOLVED`.

**Example:** Machine 10:10–10:40 plus Material 10:25–10:55 covers 45 unique minutes. The shared 15 minutes are not counted once under each cause.

## Shift-end checklist

- final/current good output updated
- all issue timers resolved
- quality cohorts balanced
- known entry errors corrected with reasons
- interventions described as observed outcomes, not automatic causal proof
- local backup exported if the pilot procedure requires one
- shift closed

## Final operating principle

If evidence is incomplete, Unknown is a valid result. If causes overlap, Overlap unresolved is a valid result. The tool is useful only if its confidence never exceeds the evidence supplied.

