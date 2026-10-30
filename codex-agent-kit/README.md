# Codex Agent Kit

A portable rule, skill, role, and workflow kit for fast AI-assisted development without giving up safety or verification.

The default `lean` profile keeps root instructions small enough to load reliably. Add domain profiles and framework guides only when the repository needs them; task-specific skills are discovered progressively.

## What makes it useful for vibe coding

- `vibe-development` provides a short build-run-observe-adjust loop for exploratory work.
- Production changes still pass scope, safety, security, and verification gates.
- Profiles prevent every project from loading every rule.
- Framework guides are selected explicitly instead of replacing root instructions.
- Shared instructions support Claude Code, Codex, and Antigravity, with generated adapters for Cursor, Cline, and GitHub Copilot.
- Executable behavioral evals score routing, safety decisions, and progressive disclosure with offline fixtures or an explicitly selected live model.

## Install

From this kit directory, install into a different repository:

```bash
./scripts/install.sh --target <your-repo>
```

```powershell
.\scripts\install.ps1 -Target <your-repo>
```

Existing files are preserved. Use `--sync` / `-Sync` to replace matching kit files without deleting unrelated files. Regeneration is explicit because it replaces generated instruction files:

```bash
./scripts/install.sh --target <your-repo> --sync --build --profile frontend --guide nextjs
```

```powershell
.\scripts\install.ps1 -Target <your-repo> -Sync -Build -Profile frontend -Guide nextjs
```

## Configure instruction scope

Edit `.agent-kit.json`:

```json
{
  "profile": "lean",
  "guides": [],
  "max_agents_bytes": 32768
}
```

| Profile | Adds to the safety baseline | Recommended for |
| --- | --- | --- |
| `lean` | Core operating and quality rules | Most repositories and fast iteration |
| `frontend` | Accessibility, UI, state, structure, testing | React and component-based web apps |
| `backend` | API, errors, migrations, reliability | Services and APIs |
| `ai` | LLM boundaries, errors, reliability | AI-enabled products and agents |
| `full` | Every rule | Audits or projects that truly need the complete policy |

Available guides are `react`, `nextjs`, `express`, `fastapi`, `django`, `nestjs`, and `go`. Prefer the nearest nested `AGENTS.md` for subtree-specific instructions.
The default budget matches Codex's standard 32 KiB project-document limit. If `full` exceeds it, intentionally raise the budget with `--max-agents-bytes` / `-MaxAgentsBytes` only after confirming the consuming client can load more.

```bash
python -B scripts/build_agents_md.py --profile frontend --guide nextjs
python -B scripts/build_agents_md.py --check
```

On Windows without Python:

```powershell
.\scripts\kit.ps1 build -Profile frontend -Guide nextjs
.\scripts\kit.ps1 check
.\scripts\kit.ps1 validate
```

## Use across coding tools

| Tool | Instruction entry point | Task-specific context |
| --- | --- | --- |
| Codex | Generated `AGENTS.md` | Discover `.agents/skills/` or invoke a matching skill |
| Claude Code | Generated `CLAUDE.md` imports `AGENTS.md` | Open the relevant `.agents/skills/<name>/SKILL.md` explicitly if it is not discovered |
| Antigravity | Generated `AGENTS.md` | Use available skill discovery or open the matching skill file explicitly |
| Cursor, Cline, Copilot | Generated `.cursorrules`, `.clinerules`, `.github/copilot-instructions.md` | Open only the skill and guide relevant to the task |

`AGENTS.md` is the shared policy. The Claude import avoids maintaining a second policy copy; Antigravity uses `AGENTS.md` directly. See the official documentation for [Codex instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Claude imports](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools), and [Antigravity rule locations](https://antigravity.google/docs/rules/). Client versions and settings can affect discovery; verify loaded instructions in the consuming client after installation. Generation and installer tests do not prove live client behavior.

Installation copies portable Markdown instructions. It does not provision plugins, MCP servers, credentials, native skill registrations, or executable subagents. Roles are handoff contracts, not automatically running agents. If an existing `CLAUDE.md` is preserved during install, merge an `@AGENTS.md` import into it yourself; run a build only after reviewing generated files that it will replace.

## Adapt to each project

The reusable kit intentionally stays on `lean` with `guides: []`. First inspect a concrete project's configuration, conventions, and tests; then select a profile and matching guides when needed. An unknown stack is a question for the project, not a reason to hardcode a framework in this kit.

Read repository facts before asking. Ask about unresolved requirements before dependent implementation, continue independent work, and honor explicit ask-first or no-assumptions preferences. Conservative choices are limited to reversible implementation details when no stricter preference or workflow applies. Do not invent requirements, treat silence as an answer, or request the same authorization again.

Skills are available independently of the selected profile. For occasional LLM work under `lean`, load `rules/llm-ai-integration/RULE.md` and `.agents/skills/llm-integration/SKILL.md` for that task. Use profile `ai` when the project needs those rules persistently. Merely using Claude Code, Codex, or Antigravity does not require an LLM API in the application. Live model calls and evaluations still require applicable data and cost authorization.

## Daily workflow

For an exploratory request, invoke `$vibe-development`, establish one observable acceptance signal, make the smallest coherent slice, run it, inspect the result, and repeat. Switch to `$feature-implementation` when the work becomes durable product behavior that needs full regression coverage and release readiness.

```bash
python -B scripts/build_agents_md.py
python -B scripts/validate_kit.py
python -B -m unittest discover -s scripts/tests -v
node --test scripts/tests/*.test.mjs
node scripts/run_behavior_evals.mjs --responses evals/fixtures/perfect-responses.json --threshold 1
```

Install the fail-closed pre-commit hook with `bash scripts/hooks/install_hooks.sh` or `.\scripts\hooks\install_hooks.ps1`. CI runs generation freshness, structural validation, behavioral contract tests, and installer tests on Linux and Windows.

## Behavioral evals

Run `node scripts/run_behavior_evals.mjs` for a no-cost dry run. To compare a real model, pass `--live --model <approved-model-id>` and set `OPENAI_API_KEY`; the runner uses the Responses API with strict structured output, `store: false`, and explicit limits for request count, input bytes, concurrency, timeouts, retries, and output tokens. It records the requested and returned model, prompt version, latency, token usage, assertion scores, and critical safety failures without storing API keys or raw provider responses.

The live suite is intentionally separate from CI so ordinary pull requests do not incur cost or depend on network access. See [`evals/README.md`](evals/README.md) for repetitions, thresholds, case selection, and sanitized reports.

## Skills

Codex selects skills from their descriptions or you can invoke one explicitly, for example `$bug-investigation Investigate duplicate requests`.

- Fast loop: `vibe-development`.
- Discovery and coordination: `repository-onboarding`, `task-planning`, `agent-orchestration`.
- Before coding: `project-prompt-planning` writes a detailed project brief and a reusable AI coding prompt, with scope, acceptance criteria, questions, and milestones. Unclear details require answers; the skill does not guess or adopt defaults.
- Implementation: `feature-implementation`, `frontend-workflow`, `backend-api-workflow`, `refactoring`.
- Diagnosis and quality: `bug-investigation`, `test-engineering`, `code-review`, `security-audit`.
- Architecture and data: `api-design`, `database-migration`, `llm-integration`.
- Performance and operations: `performance-investigation`, `performance-optimization`, `dependency-upgrade`, `ci-troubleshooting`, `logging-monitoring`, `release-readiness`.
- Product quality: `accessibility`.

Skill bodies remain concise. Specialized checklists and templates are linked from each `SKILL.md` and loaded only when relevant.

For example: `$project-prompt-planning Viết detail project và prompt cho AI code ứng dụng quản lý công việc, làm rõ MVP và tiêu chí nghiệm thu trước khi code.` A planning-only request produces documents; a request that also authorizes implementation continues after the necessary decisions are resolved.

## Roles and workflows

Roles narrow ownership; they never grant extra authority: `planner`, `developer`, `reviewer`, `tester`, `security-reviewer`, `documentation`, `devops`, and `release`.

Human-readable playbooks are provided for `feature-development`, `bug-fix`, `code-review`, `api-design`, `data-migration`, `performance-optimization`, `incident-response`, and `release`. Skills are the runtime routing layer; workflows explain the end-to-end handoffs and decision gates.

## Repository layout

```text
.agent-kit.json                 selected profile, guides, and byte budget
.agents/skills/<name>/SKILL.md task-specific runtime instructions
agents/<role>/AGENT.md         role and handoff contracts
rules/<name>/RULE.md           composable policy sources
profiles/*.json                ordered rule sets
guides/*.md                    optional framework context
workflows/*.md                 human-readable playbooks
evals/                         behavioral routing fixtures
scripts/                       build, validation, install, hooks, tests
templates/ and examples/       reusable artifacts and boundary examples
```

`definition-of-done.md` is the shared completion gate for applicable implementation work. Generated `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.clinerules`, and Copilot instructions should never be edited directly.

See [CONTRIBUTING.md](CONTRIBUTING.md) for extension and validation rules.
