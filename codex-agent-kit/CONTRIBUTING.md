# Contributing to Codex Agent Kit

Keep changes small, portable, progressively disclosed, and testable.

## Source of truth

- Edit rules under `rules/<name>/RULE.md`; do not edit generated instruction files.
- Edit task routing under `.agents/skills/<name>/SKILL.md`.
- Edit rule selection under `profiles/*.json` and project selection in `.agent-kit.json`.
- Use guides for optional framework context and nested `AGENTS.md` files for repository subtrees.
- Treat workflows as human-readable playbooks and skills as runtime task routing.
- Keep Python and PowerShell generation equivalent, including the generated `CLAUDE.md` import. Antigravity consumes the shared `AGENTS.md`; avoid adding duplicate always-active policy copies.

## Add or change a skill

1. Copy `templates/skill-template/` to `.agents/skills/<skill-name>/`.
2. Use a concise description that clearly says when the skill applies and when it does not.
3. Keep the main workflow in `SKILL.md`; link every supporting file under `references/` or `assets/`.
4. Remove generic checklists that merely repeat global rules.
5. Add positive and negative routing cases to `evals/behavior-cases.json` when behavior changes.

When adding an eval behavior, define its stable ID in `evals/behavior-catalog.json`, reference it from a case, and update `evals/fixtures/perfect-responses.json`. Keep free-text rationale out of automated scoring.

## Add or change a rule

1. Copy `templates/rule-template/` to `rules/<rule-name>/`.
2. Define purpose, enforceable rules, a safe path, and genuine exceptions.
3. Add the rule only to profiles that need it. Keep `lean` focused on universal safety and delivery behavior.
4. Rebuild generated files and confirm the configured byte budget.

## Add a role, workflow, guide, example, or template

- Roles require `Mission`, `Owns`, `Authority`, `Required handoff`, and `Done when` sections.
- Workflows require `Use when`, `Workflow`, `Decision gates`, and `Done when` sections with at least five ordered steps.
- Guides must add framework-specific value without duplicating root policy.
- Examples must demonstrate a boundary or decision; do not present insecure placeholders as recommended code.
- Templates should be usable without granting deployment, publication, or destructive authority.

Update the README inventory when adding a skill, role, or workflow.

## Validate

Python is canonical in CI:

```bash
python -B scripts/build_agents_md.py
python -B scripts/build_agents_md.py --check
python -B scripts/validate_kit.py
python -B -m unittest discover -s scripts/tests -v
node --test scripts/tests/*.test.mjs
node scripts/run_behavior_evals.mjs --responses evals/fixtures/perfect-responses.json --threshold 1
```

Windows fallback:

```powershell
.\scripts\kit.ps1 build
.\scripts\kit.ps1 check
.\scripts\kit.ps1 validate
```

Before opening a pull request, review `git diff`, confirm generated files are current, state any checks you could not run, and avoid mixing unrelated policy changes.
