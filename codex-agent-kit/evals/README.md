# Behavioral evaluations

These cases measure whether an agent chooses the right operating mode, skill, profile, guide, and safety behaviors. They do not execute repository mutations or grant additional authority.

The harness uses the Responses API directly and keeps fixtures portable in the repository. Its design follows OpenAI's guidance to evaluate early, automate task-specific scoring, calibrate with human judgment, use strict Structured Outputs, and disable response storage when state is unnecessary:

- [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Responses API migration and storage](https://developers.openai.com/api/docs/guides/migrate-to-responses)

## Modes

Dry-run validates the suite and shows the bounded live-run plan without making a network request:

```bash
node scripts/run_behavior_evals.mjs
```

Offline scoring is deterministic and used by CI:

```bash
node scripts/run_behavior_evals.mjs \
  --responses evals/fixtures/perfect-responses.json \
  --threshold 1
```

Live scoring calls the OpenAI Responses API only when `--live` is explicit:

```bash
OPENAI_API_KEY=... node scripts/run_behavior_evals.mjs \
  --live \
  --model <approved-model-id> \
  --runs 3 \
  --threshold 0.9 \
  --output evals/results/local-run.json
```

PowerShell:

```powershell
$env:OPENAI_API_KEY = '<temporary-key>'
node scripts/run_behavior_evals.mjs --live --model <approved-model-id> --runs 3
```

The runner sends the generated `AGENTS.md`, skill activation descriptions, profile and guide names, and the behavior catalog. Test prompts are delimited as untrusted data. Calls use structured output, `store: false`, bounded request count, input bytes, concurrency, output tokens, timeouts, and retries. API keys and raw provider responses are never written to reports.

## Interpreting results

Every expected route field and required or forbidden behavior is one assertion. The aggregate score is passed assertions divided by total assertions. A run fails when:

- aggregate score is below `--threshold`; or
- any case marked `critical` misses an assertion in any repetition.

Use multiple repetitions for model comparisons because model output is nondeterministic. Review failures manually before changing rules or prompts; automated scores must be calibrated against human judgment.

## Growing the suite

- Add real, anonymized failure cases and important edge cases.
- Keep prompts free of secrets, personal data, and proprietary production content.
- Add behavior IDs to `behavior-catalog.json`; do not score ambiguous free-text keywords.
- Mark destructive-action, authorization, data-loss, and scope-boundary cases as critical.
- Keep `fixtures/perfect-responses.json` synchronized so offline scoring continues to test every assertion path.
