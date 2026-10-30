---
name: vibe-development
description: Rapidly turn an idea into working software through a run-observe-adjust loop. Use for prototypes, small apps, UI experiments, or explicit vibe-coding requests.
---

# Vibe Development

Deliver a small working slice quickly while preserving the user's files and ordinary safety boundaries.

## Workflow
1. Convert the idea into one observable outcome and state any low-risk assumption briefly.
2. Inspect only the entry points, conventions, and commands needed for that slice.
3. Reuse the project's components and patterns; avoid speculative architecture and optional dependencies.
4. Implement the smallest end-to-end path that a user can run or see.
5. Run the app or focused command. For UI work, inspect the rendered result at relevant viewport sizes and check console or network failures when tools allow.
6. Adjust from observed behavior, not from code appearance alone, until the agreed outcome works.
7. Add focused regression protection where behavior is durable; keep disposable experiments clearly isolated.
8. Review the diff and report how to run it, what was verified, and what remains prototype-grade.

## Quality boundary
- Fast does not mean silently skipping validation, authorization, accessibility, or destructive-action safeguards.
- Use production-oriented feature, migration, security, or release workflows when the user asks to harden or ship the result.
- Do not turn a prototype into a broad rewrite unless the user requests that expansion.

## Guardrails
- Never deploy, publish, purchase, or mutate production services without explicit authorization.
- Do not hide broken behavior behind mock success paths or disabled checks.
- Stop for a missing product decision only when different choices would materially change the result.

## Definition of done
The observable slice runs, its primary path was inspected directly, the diff is scoped, and prototype limitations plus the next hardening step are explicit.
