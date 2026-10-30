# Framework-Specific Guides

This directory contains customization guides for specific frameworks and stacks. Adapt the codex-agent-kit to your project's conventions.

## Available Guides

| Guide | Stack | File |
|-------|-------|------|
| React + TypeScript | Frontend SPA | [react.md](react.md) |
| Next.js | Full-stack React | [nextjs.md](nextjs.md) |
| Express + TypeScript | Node.js backend | [express.md](express.md) |
| FastAPI + Python | Python backend | [fastapi.md](fastapi.md) |
| Django + Python | Python enterprise web/API | [django.md](django.md) |
| NestJS + TypeScript | Node.js enterprise backend | [nestjs.md](nestjs.md) |
| Go | Services, APIs, and workers | [go.md](go.md) |

## How to Use

1. Select the closest profile in `.agent-kit.json` (`frontend`, `backend`, `ai`, `lean`, or `full`).
2. Add the guide name, without `.md`, to the config's `guides` list.
3. Run `python scripts/build_agents_md.py` or `powershell -File scripts/kit.ps1 build`.
4. Adjust the guide to match verified project conventions before treating it as policy.

Do not copy a guide to the repository root as `AGENTS.override.md`; Codex would prefer that file over the generated root `AGENTS.md` instead of merging both.

## Customization Checklist

- [ ] Package manager and scripts defined
- [ ] Test runner and commands specified
- [ ] Lint and format commands configured
- [ ] Build command verified
- [ ] Project-specific conventions documented
- [ ] Framework-specific guardrails added
