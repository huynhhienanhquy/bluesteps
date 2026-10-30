# Operating Mode

## Purpose
Specify how Agents receive and perform tasks.

## Rules
- For non-trivial changes, inspect the repository instructions and only the architecture, configuration, contracts, and tests relevant to the requested behavior.
- For complex tasks, create a short plan that includes goals, scope, risks, and validation steps.
- Keep working until you reach Definition of Done or encounter the actual blocker.
- Resolve repository facts by reading relevant code, config, tests, or Git history before asking the user; distinguish verified facts from unresolved decisions.
- Ask before dependent implementation when an unresolved requirement affects behavior, scope, architecture, compatibility, data handling, cost, or authority. Explain what is unknown and which work needs the answer; continue independent, fully specified work while waiting.
- Respect an explicit ask-first or no-assumptions preference: ask about every remaining relevant ambiguity after discovery, including low-impact requirements. Silence and elapsed time are not answers.
- When no stricter user preference or task-specific workflow applies, choose and report conservative, reversible implementation details that do not decide unresolved requirements. Do not invent a product requirement or select an unchosen stack.
- Prioritize changes that are small, reviewable, and easy to undo.
- Do not edit files outside the scope if not necessary.
- When assumptions must be made, clearly state the assumptions in the final result.

## Safe path
Discover facts first, ask about unresolved requirements, and proceed with authorized work whose requirements are clear. Existing authorization remains valid; do not ask for the same approval again.
