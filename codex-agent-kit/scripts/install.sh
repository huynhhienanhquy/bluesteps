#!/usr/bin/env bash
set -euo pipefail

USAGE="Usage: $0 [--target <path>] [--sync] [--build] [--profile <name>] [--guide <name>]... [--max-agents-bytes <count>]"
TARGET="."
SYNC=0
BUILD=0
PROFILE=""
GUIDES=()
MAX_AGENTS_BYTES=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target|-t)
      if [[ $# -lt 2 || -z "$2" || "$2" == -* ]]; then
        echo "Missing path for $1" >&2
        exit 1
      fi
      TARGET="$2"; shift 2;;
    --sync|-s) SYNC=1; shift;;
    --build) BUILD=1; shift;;
    --profile)
      if [[ $# -lt 2 || -z "$2" || "$2" == -* ]]; then echo "Missing name for $1" >&2; exit 1; fi
      PROFILE="$2"; shift 2;;
    --guide)
      if [[ $# -lt 2 || -z "$2" || "$2" == -* ]]; then echo "Missing name for $1" >&2; exit 1; fi
      GUIDES+=("$2"); shift 2;;
    --max-agents-bytes)
      if [[ $# -lt 2 || ! "$2" =~ ^[1-9][0-9]*$ ]]; then echo "Invalid positive count for $1" >&2; exit 1; fi
      MAX_AGENTS_BYTES="$2"; shift 2;;
    -h|--help) echo "$USAGE"; exit 0;;
    *) echo "Unknown option: $1" >&2; echo "$USAGE" >&2; exit 1;;
  esac
done

KIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$(mkdir -p "$TARGET" && cd "$TARGET" && pwd)"
if [[ "$TARGET" == "$KIT_ROOT" ]]; then
  echo "Target must differ from the kit source directory." >&2
  exit 1
fi

echo "Installing Codex Agent Kit into: $TARGET"

# Copy a kit-relative file; preserve existing content unless --sync was given.
# Create parent directories and stop installation on copy errors.
install_file() {
  local src="$KIT_ROOT/$1"
  local dst="$TARGET/$1"
  if [[ ( -e "$dst" || -L "$dst" ) && $SYNC -eq 0 ]]; then
    echo "  Skipped: $1 (exists, use --sync to overwrite)"
  else
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
}

# Copy hidden and regular files under a kit-relative directory, excluding caches.
# Install individually so preservation never falls back to overwriting files.
install_dir() {
  local src="$KIT_ROOT/$1"
  local file
  mkdir -p "$TARGET/$1"
  while IFS= read -r -d '' file; do
    install_file "${file#"$KIT_ROOT/"}"
  done < <(find "$src" -type d -name __pycache__ -prune -o -type f -print0)
  echo "  Copied dir: $1"
}

for directory in .agents/skills agents rules profiles guides workflows examples templates evals scripts; do
  install_dir "$directory"
done
for file in .agent-kit.json AGENTS.md CLAUDE.md definition-of-done.md README.md CONTRIBUTING.md CHANGELOG.md .cursorrules .clinerules .github/copilot-instructions.md; do
  install_file "$file"
done

if [[ ( -n "$PROFILE" || ${#GUIDES[@]} -gt 0 || -n "$MAX_AGENTS_BYTES" ) && $BUILD -eq 0 ]]; then
  echo "--profile, --guide, and --max-agents-bytes require --build because they change generated instructions." >&2
  exit 1
fi
if [[ $BUILD -eq 1 ]]; then
  build_args=(build)
  [[ -n "$PROFILE" ]] && build_args+=(-Profile "$PROFILE")
  [[ -n "$MAX_AGENTS_BYTES" ]] && build_args+=(-MaxAgentsBytes "$MAX_AGENTS_BYTES")
  if [[ ${#GUIDES[@]} -gt 0 ]]; then
    guide_list="$(IFS=,; echo "${GUIDES[*]}")"
    build_args+=(-Guide "$guide_list")
  fi
  if command -v pwsh >/dev/null 2>&1; then
    (cd "$TARGET" && pwsh -NoProfile -File scripts/kit.ps1 "${build_args[@]}")
  elif command -v powershell.exe >/dev/null 2>&1; then
    (cd "$TARGET" && powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts/kit.ps1 "${build_args[@]}")
  elif command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
    python_cmd="$(command -v python3 || command -v python)"
    python_args=()
    [[ -n "$PROFILE" ]] && python_args+=(--profile "$PROFILE")
    [[ -n "$MAX_AGENTS_BYTES" ]] && python_args+=(--max-agents-bytes "$MAX_AGENTS_BYTES")
    for guide in "${GUIDES[@]}"; do python_args+=(--guide "$guide"); done
    (cd "$TARGET" && "$python_cmd" -B scripts/build_agents_md.py "${python_args[@]}")
  else
    echo "Cannot build: install Python 3 or PowerShell 7." >&2
    exit 1
  fi
fi

echo "Done. Codex Agent Kit installed into $TARGET"
if [[ $BUILD -eq 0 ]]; then
  echo "Review preserved files, then run scripts/kit.ps1 build (or the Python builder) in the target repository."
fi
