# Pilot boundaries and interpretation

This document defines what the Leather Production Flow Pilot is allowed to claim from the evidence it records.

## Evidence contract

The prototype treats a blank value as unknown, not zero. Rate comparisons assume comparable transfer units, a stable WIP observation point and a required rate that belongs to the product/process being observed.

If these assumptions fail, the correct response is to repair the measurement contract rather than make the algorithm more confident.

## Radar interpretation

| State | Meaning | Not evidence of |
|---|---|---|
| HEALTHY | No combined below-rate and queue-growth signal in the supplied evidence | Optimal process |
| PRESSURE | Work is available, rate is below required and queue increased | Proven bottleneck |
| POSSIBLE_CONSTRAINT | Pressure persisted for the configured number of intervals | Root cause or worker blame |
| STARVED | Rate is below required while too little WIP is available | Downstream capacity shortage |
| PLANNED_STOP | The whole interval is marked as a planned stop | Poor performance |
| UNPLANNED_STOP | Unplanned stop is marked and good output is zero | Exact lost-unit quantity |
| PLANNED_BUFFER | Queue is explicitly intentional | Unplanned congestion |
| UNKNOWN | Required evidence is missing or a conclusion is not valid | Zero performance |
| CONFLICTED | Conflicting observations require resolution | A usable operational conclusion |

The current UI uses a minimum work-available queue threshold of 5 comparable transfer units and two consecutive PRESSURE classifications before POSSIBLE_CONSTRAINT. These are pilot settings, not universal leather-industry constants.

## Loss-accounting interpretation

The plan gap is:

```text
max(0, target - actual good output)
```

It is arithmetic. It is not an automatic allocation of lost units to recorded disturbances.

Blocking events provide time evidence. When multiple event categories overlap within the same operation, the shared segment is labelled `OVERLAP_UNRESOLVED`. Events belonging to different operations are scoped separately.

## Quality interpretation

The engine enforces:

```text
first-pass failures = recovered + final rejects + still in rework
```

Recovered units and final rejects are later states of first-pass failures. They must not be added to first-pass failures as if they were additional physical units.

## Attribution boundary

The event workflow begins with an observed condition.

Example:

- observation: required zip not at station
- possible attribution: supplier delivered late

The second statement needs evidence beyond the first. A category such as MATERIAL or MACHINE is not proof of organizational responsibility or root cause.

## Intervention boundary

The prototype can record that an action was taken and performance improved, did not materially change, worsened, or remains unknown afterward.

It does not implement a causal estimator. A before/after sequence alone cannot establish that the action caused a precise productivity improvement.

## Data and deployment boundary

This repository contains synthetic data only. It is not evidence of deployment at, endorsement by, or validation from Paradigm Leather Accessories or any other named company.

The current prototype does not implement:

- multi-user authorization
- enterprise identity or role controls
- server backup
- multi-device synchronization
- ERP integration
- real-factory configuration
- validated productivity uplift

A real pilot should begin only after company permission, a defined data-handling procedure, agreed measurement points, a baseline period and predefined pass/fail criteria.

