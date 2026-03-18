# ADR-003: Statistical Process Control for Anomaly Detection

## Status

Accepted

## Context

Fixed thresholds for runaway detection (e.g., "alert if >100 tool calls") cause false positives on legitimately intensive workloads and miss gradual drift. A more adaptive approach is needed.

## Decision

Use Statistical Process Control (Shewhart control charts with Western Electric rules) to model "normal" behavior and detect deviations. The system builds a baseline from observed behavior and alerts when the process leaves its characteristic pattern.

## Consequences

- More sophisticated than threshold-based detection. Catches gradual drift that fixed thresholds miss.
- Requires a warmup period (configurable `spcMinSamples`, default 10) before analysis activates.
- The SPC monitor adds ~200 lines of code and O(n) recalculation per interval (acceptable at n<=100 samples).
- Four Western Electric rules are implemented: beyond UCL, 2-of-3 beyond 2-sigma, 4-of-5 beyond 1-sigma, 8 consecutive on one side.
