# Context Discovery

## Purpose
Make sure the Agent understands the project before editing.

## Rules
- Discover the package manager, framework, and relevant scripts from configuration when the task depends on them; do not inventory unrelated tooling for a local edit.
- Find a similar implementation before creating a new pattern when the repository is large enough to have established conventions.
- Read the affected types, interfaces, contracts, and tests before changing behavior.
- Check current `git status` and diff to avoid overwriting user changes.
- Do not speculate on file names, commands or architecture when you can check directly.
- Treat this kit as stack-neutral. Keep `lean` and an empty guide list for a reusable kit or a project whose stack is not yet confirmed; an empty list is not a readiness failure.
- In a concrete project, verify its stack and read the matching `guides/<name>.md` only when relevant. Select a domain profile and persist guides only within an authorized configuration change; do not choose a framework for the user.

## Task-specific context
- Profiles select compiled rules, not which skills are available. Read only the matching `.agents/skills/<name>/SKILL.md` and its needed resources; if the client does not discover that directory, open the file explicitly. Do not assume kit installation enables native tools, plugins, credentials, or subagents.
- For project briefs and coding handoffs, use `project-prompt-planning`; resolve its unanswered questions before dependent implementation.
- When a task implements or reviews LLM calls, prompts, retrieval, model outputs, or model-driven tools, read `rules/llm-ai-integration/RULE.md` and `.agents/skills/llm-integration/SKILL.md` even under `lean`. The `ai` profile is appropriate when this context is needed throughout the project.
- Running this kit with an AI coding assistant does not by itself mean the application integrates an LLM. Do not add provider SDKs, API calls, or live evaluations unless the task requires them and existing authority covers their data and cost.

## Required output
Before major changes, Agents must have a mental model of the affected entry points, data flow, dependencies, and test locations.
