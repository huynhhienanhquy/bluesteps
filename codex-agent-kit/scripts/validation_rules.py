from pathlib import Path
import re


REQUIRED_SKILL_SECTIONS = ('## Guardrails', '## Definition of done')
MAX_SKILL_DESCRIPTION_CHARS = 220


def validate_skill_file(skill_dir: Path) -> list[str]:
    """Return structural and progressive-disclosure errors for one skill.

    Use this validator for repository and fixture skills. It checks discovery
    metadata, required safety sections, referenced resources, and orphaned
    support files that Codex would otherwise never know when to load.

    Args:
        skill_dir: Directory containing `SKILL.md` and optional resources.

    Returns:
        Human-readable validation errors; an empty list means the skill passes.
    """
    errors: list[str] = []
    skill_file = skill_dir / 'SKILL.md'
    if not skill_file.exists():
        return [f'Missing SKILL.md: {skill_dir}']

    text = skill_file.read_text(encoding='utf-8')
    match = re.match(r'^---\n(.*?)\n---\n', text, re.S)
    if not match:
        return [f'Missing YAML frontmatter: {skill_file}']

    frontmatter = match.group(1)
    name = re.search(r'^name:\s*(.+)$', frontmatter, re.M)
    description = re.search(r'^description:\s*(.+)$', frontmatter, re.M)
    if not name:
        errors.append(f'Missing name: {skill_file}')
    elif name.group(1).strip() != skill_dir.name:
        errors.append(f'Name/folder mismatch: {skill_file}')
    if not description or len(description.group(1).strip()) < 30:
        errors.append(f'Description too short or missing: {skill_file}')
    elif len(description.group(1).strip()) > MAX_SKILL_DESCRIPTION_CHARS:
        errors.append(f'Description exceeds {MAX_SKILL_DESCRIPTION_CHARS} characters: {skill_file}')
    if len(text.splitlines()) > 200:
        errors.append(f'SKILL.md is too large; use progressive disclosure: {skill_file}')
    for section in REQUIRED_SKILL_SECTIONS:
        if not re.search(rf'^{re.escape(section)}\s*$', text, re.M):
            errors.append(f'Missing skill section {section}: {skill_file}')
    referenced_paths = set(re.findall(r'\[[^\]]+\]\(((?:references|assets)/[^)]+)\)', text))
    for referenced in sorted(referenced_paths):
        if not (skill_dir / referenced).exists():
            errors.append(f'Missing referenced file {referenced}: {skill_file}')
    support_files = {
        path.relative_to(skill_dir).as_posix()
        for folder in ('references', 'assets')
        for path in (skill_dir / folder).rglob('*')
        if path.is_file()
    }
    for orphaned in sorted(support_files - referenced_paths):
        errors.append(f'Unreferenced skill resource {orphaned}: {skill_file}')
    return errors
