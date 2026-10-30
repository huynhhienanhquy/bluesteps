import json
import sys
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]
KIT = SCRIPTS.parent
sys.path.insert(0, str(SCRIPTS))

from build_agents_md import generated_outputs, load_settings, resolve_profile
from validation_rules import validate_skill_file


class ProfileContractTests(unittest.TestCase):
    def test_default_profile_stays_within_context_budget(self):
        settings = load_settings(KIT)
        content = generated_outputs(KIT, settings)[KIT / "AGENTS.md"]
        self.assertLessEqual(len(content.encode("utf-8")), settings["max_agents_bytes"])

    def test_lean_profile_keeps_critical_rules(self):
        rules = resolve_profile(KIT, "lean")
        for rule in ("scope-and-authority", "execution-safety", "security", "verification"):
            self.assertIn(rule, rules)

    def test_full_profile_contains_every_rule(self):
        expected = sorted(path.parent.name for path in (KIT / "rules").glob("*/RULE.md"))
        self.assertEqual(expected, resolve_profile(KIT, "full"))


class SkillRoutingTests(unittest.TestCase):
    def test_all_skill_resources_are_routed(self):
        for skill_dir in sorted(path for path in (KIT / ".agents" / "skills").iterdir() if path.is_dir()):
            with self.subTest(skill=skill_dir.name):
                self.assertEqual([], validate_skill_file(skill_dir))

    def test_behavior_fixtures_cover_positive_and_negative_routing(self):
        cases = json.loads((KIT / "evals" / "behavior-cases.json").read_text(encoding="utf-8"))
        self.assertTrue(any(case["expected"].get("skill") == "vibe-development" for case in cases))
        self.assertTrue(any("forbidden_behaviors" in case["expected"] for case in cases))
        self.assertTrue(any(case.get("critical") for case in cases))
        self.assertEqual(len(cases), len({case["id"] for case in cases}))


if __name__ == "__main__":
    unittest.main()
