---
name: ci-troubleshooting
description: Diagnose and fix CI failures. Use for pipeline-only failures, cache or dependency problems, flaky jobs, build matrices, or local/CI differences.
---

# CI Troubleshooting

## Workflow
1. Identify the first job, step, commit and failure; Distinguish root errors from chain errors.
2. Read workflow, exact command, environment, matrix, permissions, cache key and artifact inputs.
3. Compare CI with local in terms of runtime, OS, architecture, dependency lock, timezone, locale and parallelism.
4. Reproduce using command and environment as closely as possible; keep the original log/error as evidence.
5. Classify deterministic, flaky or infrastructure failure before patching.
6. Correct the smallest cause; Don't relax assertions or turn off checks just to keep the pipeline green.
7. Run targeted command, then dependent jobs; Check for cache misses and clean environment when relevant.

## Final report
- Root cause
- CI/local difference
- Fix
- Verified commands or jobs
- Flake/risk remaining

Before closing a multi-job or environment-specific incident, use the [CI checklist](references/checklist.md).

## Guardrails
Do not print secrets for debugging. Do not assume that a successful rerun is proof that the flaky test has been fixed.

## Definition of done
The first causal failure is identified, the CI-specific difference or defect is corrected, the relevant command or job passes with reproducible evidence, and remaining flake or infrastructure risk is documented.
