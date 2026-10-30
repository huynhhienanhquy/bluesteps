import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]
KIT = SCRIPTS.parent
sys.path.insert(0, str(SCRIPTS))
from build_agents_md import build_parts, check_generated, generated_outputs, load_settings


class NavigationTests(unittest.TestCase):
    def test_every_navigation_link_has_one_explicit_anchor(self):
        document = '\n'.join(build_parts(KIT / 'rules'))
        links = re.findall(r'\]\(#(rule-[^)]+)\)', document)
        anchors = re.findall(r'<a id="([^"]+)"></a>', document)
        self.assertEqual(len(list((KIT / 'rules').glob('*/RULE.md'))), len(links))
        self.assertEqual(sorted(links), sorted(anchors))
        self.assertEqual(len(anchors), len(set(anchors)))

    def test_titles_with_bom_and_punctuation_keep_stable_navigation(self):
        with tempfile.TemporaryDirectory(prefix='kit-navigation-') as temp:
            rules = Path(temp) / 'rules'
            rule = rules / 'frontend-state' / 'RULE.md'
            rule.parent.mkdir(parents=True)
            rule.write_text('\ufeff# React: State & Lifecycle!\n\n## Purpose\nStable links.\n', encoding='utf-8')
            document = '\n'.join(build_parts(rules))
            self.assertIn('[React: State & Lifecycle!](#rule-frontend-state)', document)
            self.assertIn('<a id="rule-frontend-state"></a>', document)
            self.assertNotIn('\ufeff', document)


def available_shells():
    """Locate test shells, including Git for Windows Bash when it is off PATH."""
    bash = shutil.which('bash')
    if not bash and os.name == 'nt':
        candidate = Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'Git/bin/bash.exe'
        if candidate.is_file():
            bash = str(candidate)
    powershell = shutil.which('pwsh') or shutil.which('powershell')
    return {'bash': bash, 'powershell': powershell}


class InstallerTests(unittest.TestCase):
    def run_command(self, command, cwd=KIT):
        environment = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}
        if os.name == 'nt' and Path(command[0]).name == 'bash.exe':
            # Non-login Git Bash inherits Windows PATH, which may select Windows find.
            unix_tools = Path(command[0]).resolve().parents[1] / 'usr/bin'
            environment['PATH'] = str(unix_tools) + os.pathsep + environment['PATH']
        result = subprocess.run(
            command, cwd=cwd, capture_output=True, text=True, encoding='utf-8',
            errors='replace', timeout=120,
            env=environment,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        return result

    def installer_command(self, shell, executable, target, sync=False):
        if shell == 'bash':
            return [executable, (SCRIPTS / 'install.sh').as_posix(), '--target', target.as_posix()] + (['--sync'] if sync else [])
        return [executable, '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
                '-File', str(SCRIPTS / 'install.ps1'), '-Target', str(target)] + (['-Sync'] if sync else [])

    def check_installation(self, shell):
        executable = available_shells()[shell]
        if not executable:
            self.skipTest(f'{shell} is not installed')
        # Keep cross-shell fixtures in the writable checkout; Windows shell sandboxes
        # can expose different user temp directories to Python and Git Bash.
        with tempfile.TemporaryDirectory(prefix=f'.kit-test-{shell}-', dir=KIT.parent) as temp:
            target = Path(temp) / 'repo with spaces'
            command = self.installer_command(shell, executable, target)
            self.run_command(command)
            for relative in ('scripts/build_agents_md.py', 'scripts/validate_kit.py',
                             'scripts/kit.ps1', '.agent-kit.json', 'profiles/lean.json',
                             'scripts/run_behavior_evals.mjs', 'evals/behavior-cases.json',
                             'evals/behavior-catalog.json', 'evals/fixtures/perfect-responses.json',
                             'CLAUDE.md', '.cursorrules', '.clinerules', '.github/copilot-instructions.md',
                             '.agents/skills/llm-integration/SKILL.md'):
                self.assertTrue((target / relative).is_file(), relative)
            self.run_command([sys.executable, '-B', 'scripts/build_agents_md.py'], target)
            self.run_command([sys.executable, '-B', 'scripts/validate_kit.py'], target)

            preserved = ('rules/security/RULE.md', '.agents/skills/llm-integration/SKILL.md',
                         'AGENTS.md', 'CLAUDE.md', '.cursorrules', '.clinerules', '.github/copilot-instructions.md',
                         'scripts/build_agents_md.py')
            for relative in preserved:
                (target / relative).write_text('USER CUSTOMIZATION\n', encoding='utf-8')
            unrelated = target / 'user-owned.txt'
            unrelated.write_text('KEEP ME', encoding='utf-8')
            self.run_command(command)
            for relative in preserved:
                self.assertEqual('USER CUSTOMIZATION\n', (target / relative).read_text(), relative)
            self.run_command(self.installer_command(shell, executable, target, sync=True))
            for relative in preserved:
                self.assertEqual((KIT / relative).read_bytes(), (target / relative).read_bytes(), relative)
            self.assertEqual('KEEP ME', unrelated.read_text())
            # Sync preserves the unrelated file and does not rebuild its inventory.
            self.run_command([sys.executable, '-B', 'scripts/build_agents_md.py'], target)
            self.run_command([sys.executable, '-B', 'scripts/validate_kit.py'], target)

    def test_bash_fresh_install_preservation_and_sync(self):
        self.check_installation('bash')

    def test_powershell_fresh_install_preservation_and_sync(self):
        self.check_installation('powershell')

    def test_powershell_and_python_builders_agree(self):
        powershell = available_shells()['powershell']
        if not powershell:
            self.skipTest('PowerShell is not installed')
        with tempfile.TemporaryDirectory(prefix='.kit-parity-', dir=KIT.parent) as temp:
            target = Path(temp)
            for directory in ('rules', 'profiles', 'guides'):
                shutil.copytree(KIT / directory, target / directory)
            (target / 'scripts').mkdir()
            for filename in ('kit.ps1', 'build_agents_md.py'):
                shutil.copy2(SCRIPTS / filename, target / 'scripts' / filename)
            shutil.copy2(KIT / '.agent-kit.json', target / '.agent-kit.json')
            command = [powershell, '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
                       str(target / 'scripts' / 'kit.ps1')]
            for options in (['-Profile', 'lean', '-ClearGuides'],
                            ['-Profile', 'frontend', '-Guide', 'nextjs'],
                            ['-Profile', 'ai', '-ClearGuides']):
                with self.subTest(options=options):
                    self.run_command(command + ['build'] + options, target)
                    self.run_command([sys.executable, '-B', 'scripts/build_agents_md.py', '--check'], target)
                    self.run_command([sys.executable, '-B', 'scripts/build_agents_md.py'], target)
                    self.run_command(command + ['check'], target)
                    # Git may check out the same generated files with CRLF on Windows.
                    outputs = generated_outputs(target, load_settings(target))
                    for path, content in outputs.items():
                        path.write_bytes(content.replace('\n', '\r\n').encode('utf-8'))
                    self.run_command(command + ['check'], target)
                    self.run_command([sys.executable, '-B', 'scripts/build_agents_md.py', '--check'], target)

    def test_claude_import_freshness_is_checked(self):
        with tempfile.TemporaryDirectory(prefix='.kit-claude-', dir=KIT.parent) as temp:
            target = Path(temp)
            for directory in ('rules', 'profiles', 'guides'):
                shutil.copytree(KIT / directory, target / directory)
            settings = load_settings(KIT)
            for path, content in generated_outputs(target, settings).items():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding='utf-8')
            self.assertEqual([], check_generated(target, settings))
            claude = target / 'CLAUDE.md'
            self.assertIn('\n@AGENTS.md\n', claude.read_text(encoding='utf-8'))
            claude.unlink()
            self.assertIn('Stale generated file: CLAUDE.md', check_generated(target, settings))
            claude.write_text('Read AGENTS.md if you want.\n', encoding='utf-8')
            self.assertIn('Stale generated file: CLAUDE.md', check_generated(target, settings))

    def test_bash_cli_options(self):
        bash = available_shells()['bash']
        if not bash:
            self.skipTest('Bash is not installed')
        command = [bash, (SCRIPTS / 'install.sh').as_posix()]
        self.run_command([bash, '-n', (SCRIPTS / 'install.sh').as_posix()])
        for flag in ('--help', '-h'):
            self.assertIn('Usage:', self.run_command(command + [flag]).stdout)
        for args in (['--target'], ['--profile'], ['--guide'], ['--max-agents-bytes'], ['--unknown']):
            result = subprocess.run(command + args, capture_output=True, text=True, timeout=10)
            self.assertNotEqual(0, result.returncode)


if __name__ == '__main__':
    unittest.main()
