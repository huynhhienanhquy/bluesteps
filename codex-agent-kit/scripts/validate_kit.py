import json
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / ".agents" / "skills"
RULES = ROOT / "rules"
AGENT_ROLES = ROOT / "agents"
WORKFLOWS = ROOT / "workflows"
EXAMPLES = ROOT / "examples"
TEMPLATES = ROOT / "templates"
sys.path.insert(0, str(ROOT / "scripts"))

from build_agents_md import build_manifest, check_generated, load_settings, resolve_profile
from validation_rules import validate_skill_file


errors: list[str] = []


for skill_dir in sorted(path for path in SKILLS.iterdir() if path.is_dir()):
    errors.extend(validate_skill_file(skill_dir))

required_skills = {
    "accessibility",
    "agent-orchestration",
    "api-design",
    "backend-api-workflow",
    "bug-investigation",
    "ci-troubleshooting",
    "code-review",
    "database-migration",
    "dependency-upgrade",
    "feature-implementation",
    "frontend-workflow",
    "llm-integration",
    "logging-monitoring",
    "performance-investigation",
    "performance-optimization",
    "refactoring",
    "release-readiness",
    "repository-onboarding",
    "security-audit",
    "task-planning",
    "test-engineering",
    "vibe-development",
}
skill_names = {path.name for path in SKILLS.iterdir() if path.is_dir()}
for missing_skill in sorted(required_skills - skill_names):
    errors.append(f"Missing required skill: {SKILLS / missing_skill}")

for rule_dir in sorted(path for path in RULES.iterdir() if path.is_dir()):
    if not (rule_dir / "RULE.md").exists():
        errors.append(f"Missing RULE.md: {rule_dir}")

required_rules = {
    "execution-safety",
    "reliability-observability",
    "rule-precedence",
    "llm-ai-integration",
}
rule_names = {path.name for path in RULES.iterdir() if path.is_dir()}
for missing_rule in sorted(required_rules - rule_names):
    errors.append(f"Missing required rule: {RULES / missing_rule / 'RULE.md'}")

all_rule_text = "\n".join(path.read_text(encoding="utf-8") for path in RULES.glob("*/RULE.md"))
known_regressions = (
    r"(?<!r)" + "m " + "-rf",
    r"(?<!n)" + "pm " + "publish",
    "limits can be increased " + "indefinitely",
)
for forbidden_pattern in known_regressions:
    if re.search(forbidden_pattern, all_rule_text, re.I):
        errors.append(f"Known safety-rule regression matched: {forbidden_pattern}")

try:
    settings = load_settings(ROOT)
    for profile_path in sorted((ROOT / "profiles").glob("*.json")):
        resolve_profile(ROOT, profile_path.stem)
    lean_rules = resolve_profile(ROOT, "lean")
    for critical_rule in ("scope-and-authority", "execution-safety", "security", "verification"):
        if critical_rule not in lean_rules:
            errors.append(f"Lean profile omits critical rule: {critical_rule}")
    errors.extend(check_generated(ROOT, settings))
except (OSError, ValueError, json.JSONDecodeError) as error:
    errors.append(f"Invalid profile or generated instructions: {error}")

required_role_sections = ("## Mission", "## Owns", "## Authority", "## Required handoff", "## Done when")
for role_dir in sorted(path for path in AGENT_ROLES.iterdir() if path.is_dir()):
    role_file = role_dir / "AGENT.md"
    if not role_file.exists():
        errors.append(f"Missing AGENT.md: {role_dir}")
        continue
    role_text = role_file.read_text(encoding="utf-8")
    for section in required_role_sections:
        if section not in role_text:
            errors.append(f"Missing role section {section}: {role_file}")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", role_dir.name):
        errors.append(f"Invalid role directory name: {role_dir}")

required_roles = {
    "planner",
    "developer",
    "reviewer",
    "tester",
    "security-reviewer",
    "documentation",
    "release",
    "devops",
}
role_names = {path.name for path in AGENT_ROLES.iterdir() if path.is_dir()}
for missing_role in sorted(required_roles - role_names):
    errors.append(f"Missing required role: {AGENT_ROLES / missing_role / 'AGENT.md'}")

required_workflows = {
    "api-design.md",
    "bug-fix.md",
    "code-review.md",
    "data-migration.md",
    "feature-development.md",
    "incident-response.md",
    "performance-optimization.md",
    "release.md",
}
workflow_files = {path.name for path in WORKFLOWS.glob("*.md")}
for missing_workflow in sorted(required_workflows - workflow_files):
    errors.append(f"Missing workflow: {WORKFLOWS / missing_workflow}")
for workflow_file in sorted(WORKFLOWS.glob("*.md")):
    workflow_text = workflow_file.read_text(encoding="utf-8")
    for section in ("## Use when", "## Workflow", "## Decision gates", "## Done when"):
        if section not in workflow_text:
            errors.append(f"Missing workflow section {section}: {workflow_file}")
    if len(re.findall(r"^\d+\.\s+", workflow_text, re.M)) < 5:
        errors.append(f"Workflow must contain at least five ordered steps: {workflow_file}")

dod_file = ROOT / "definition-of-done.md"
if not dod_file.exists():
    errors.append(f"Missing shared Definition of Done: {dod_file}")
else:
    dod_text = dod_file.read_text(encoding="utf-8")
    for section in (
        "## Requirements and scope",
        "## Correctness and compatibility",
        "## Tests and verification",
        "## Change quality",
        "## Documentation and operations",
        "## Final report",
    ):
        if section not in dod_text:
            errors.append(f"Missing Definition of Done section {section}: {dod_file}")

required_examples = {
    "good-component.tsx",
    "good-hook.ts",
    "good-api-handler.ts",
    "good-unit-test.test.ts",
    "commit-message-example.md",
    "pull-request-example.md",
    "anti-patterns.md",
    "bad-examples.md",
    "good-error-handler.ts",
    "good-llm-boundary.ts",
}
example_files = {path.name for path in EXAMPLES.iterdir() if path.is_file() and path.stat().st_size > 0}
for missing_example in sorted(required_examples - example_files):
    errors.append(f"Missing example: {EXAMPLES / missing_example}")

error_handler_example = EXAMPLES / "good-error-handler.ts"
if error_handler_example.exists():
    error_handler_text = error_handler_example.read_text(encoding="utf-8")
    if re.search(r"\bconsole\.(?:error|warn|log)\b", error_handler_text):
        errors.append(f"Good error-handler example must use an injected structured logger: {error_handler_example}")
    if "interface StructuredLogger" not in error_handler_text:
        errors.append(f"Good error-handler example must define its logger contract: {error_handler_example}")

bad_examples_file = EXAMPLES / "bad-examples.md"
if bad_examples_file.exists():
    bad_examples_text = bad_examples_file.read_text(encoding="utf-8").lower()
    for security_topic in ("sql injection", "hardcoded secret", "prompt injection"):
        if security_topic not in bad_examples_text:
            errors.append(f"Bad examples must cover {security_topic}: {bad_examples_file}")

required_templates = {
    "implementation-plan.md",
    "bug-report.md",
    "code-review.md",
    "pull-request.md",
    "architecture-decision-record.md",
    "release-checklist.md",
    "api-design.md",
}
template_files = {path.name for path in TEMPLATES.iterdir() if path.is_file()} if TEMPLATES.exists() else set()
for missing_template in sorted(required_templates - template_files):
    errors.append(f"Missing template: {TEMPLATES / missing_template}")

guides_readme = (ROOT / "guides" / "README.md").read_text(encoding="utf-8")
if "Copy the relevant guide to your repo root as `AGENTS.override.md`" in guides_readme:
    errors.append("Framework guide instructions would replace the root AGENTS.md")

readme_text = (ROOT / "README.md").read_text(encoding="utf-8")
for item_type, names in (("skill", skill_names), ("role", role_names), ("workflow", {path.stem for path in WORKFLOWS.glob("*.md")})):
    for name in sorted(names):
        if name not in readme_text:
            errors.append(f"README inventory omits {item_type}: {name}")

eval_file = ROOT / "evals" / "behavior-cases.json"
behavior_catalog_file = ROOT / "evals" / "behavior-catalog.json"
golden_responses_file = ROOT / "evals" / "fixtures" / "perfect-responses.json"
eval_runner_file = ROOT / "scripts" / "run_behavior_evals.mjs"
for required_eval_file in (eval_file, behavior_catalog_file, golden_responses_file, eval_runner_file):
    if not required_eval_file.exists():
        errors.append(f"Missing behavioral evaluation artifact: {required_eval_file}")

if eval_file.exists() and behavior_catalog_file.exists() and golden_responses_file.exists():
    try:
        cases = json.loads(eval_file.read_text(encoding="utf-8"))
        behavior_catalog = json.loads(behavior_catalog_file.read_text(encoding="utf-8"))
        golden_responses = json.loads(golden_responses_file.read_text(encoding="utf-8"))
        if not isinstance(behavior_catalog, dict) or not behavior_catalog or not all(
            isinstance(name, str) and isinstance(description, str) and description
            for name, description in behavior_catalog.items()
        ):
            errors.append(f"Behavior catalog must be a non-empty string map: {behavior_catalog_file}")
            behavior_names = set()
        else:
            behavior_names = set(behavior_catalog)
        if not isinstance(cases, list) or not cases:
            errors.append(f"Behavioral evaluation fixtures must be a non-empty list: {eval_file}")
            cases = []
        case_ids = []
        allowed_expected_keys = {"mode", "skill", "profile", "guide", "required_behaviors", "forbidden_behaviors"}
        allowed_modes = {"direct", "skill", "approval-required"}
        profile_names = {path.stem for path in (ROOT / "profiles").glob("*.json")}
        guide_names = {path.stem for path in (ROOT / "guides").glob("*.md")} - {"README"}
        for case in cases:
            if not isinstance(case, dict) or not all(case.get(key) for key in ("id", "prompt", "expected")):
                errors.append(f"Invalid behavioral evaluation case: {case!r}")
                continue
            case_ids.append(case["id"])
            expected = case["expected"]
            if not isinstance(expected, dict) or not expected or set(expected) - allowed_expected_keys:
                errors.append(f"Invalid expected fields in behavioral case: {case['id']}")
                continue
            if expected.get("mode") and expected["mode"] not in allowed_modes:
                errors.append(f"Unknown mode in behavioral case: {case['id']}")
            if expected.get("skill") and expected["skill"] not in skill_names:
                errors.append(f"Unknown skill in behavioral case: {case['id']}")
            if expected.get("profile") and expected["profile"] not in profile_names:
                errors.append(f"Unknown profile in behavioral case: {case['id']}")
            if expected.get("guide") and expected["guide"] not in guide_names:
                errors.append(f"Unknown guide in behavioral case: {case['id']}")
            required_behaviors = expected.get("required_behaviors", [])
            forbidden_behaviors = expected.get("forbidden_behaviors", [])
            for key, values in (("required_behaviors", required_behaviors), ("forbidden_behaviors", forbidden_behaviors)):
                if not isinstance(values, list) or len(values) != len(set(values)) or not set(values) <= behavior_names:
                    errors.append(f"Invalid {key} in behavioral case: {case['id']}")
            if set(required_behaviors) & set(forbidden_behaviors):
                errors.append(f"Behavior is both required and forbidden: {case['id']}")
        if len(case_ids) != len(set(case_ids)):
            errors.append(f"Duplicate behavioral evaluation IDs: {eval_file}")
        if not isinstance(golden_responses, list):
            errors.append(f"Golden responses must be a list: {golden_responses_file}")
        else:
            valid_responses = [
                item for item in golden_responses
                if isinstance(item, dict) and isinstance(item.get("id"), str) and isinstance(item.get("output"), dict)
            ]
            response_ids = [item["id"] for item in valid_responses]
            if len(valid_responses) != len(golden_responses) or sorted(response_ids) != sorted(case_ids):
                errors.append(f"Golden responses must cover every behavior case exactly once: {golden_responses_file}")
    except json.JSONDecodeError as error:
        errors.append(f"Invalid behavioral evaluation JSON: {error}")

manifest_file = ROOT / "MANIFEST.txt"
if not manifest_file.exists() or manifest_file.read_text(encoding="utf-8") != build_manifest(ROOT):
    errors.append("MANIFEST.txt is stale; run: python scripts/build_agents_md.py")

if errors:
    print("Validation failed:")
    for error in errors:
        print(f"- {error}")
    raise SystemExit(1)

print(
    f"OK: {len(skill_names)} skills, {len(rule_names)} rules, {len(role_names)} agent roles, "
    f"{len(workflow_files)} workflows, profile budget, routing resources, behavioral fixtures, "
    "generated instructions, and manifest validated."
)
