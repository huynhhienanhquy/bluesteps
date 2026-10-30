#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Install Codex Agent Kit into a target repository.
.DESCRIPTION
    Copy kit files, including scripts and generated IDE instructions.
    Existing files are preserved unless Sync is specified. No automatic rebuild runs.
.PARAMETER Target
    Path to the target repository root. Defaults to the current directory.
.PARAMETER Sync
    Overwrite matching existing files without prompting; do not delete extra files.
.PARAMETER Build
    Regenerate instructions after copying. This replaces generated instruction files.
.PARAMETER Profile
    Profile to persist when Build is selected, such as lean, frontend, backend, ai, or full.
.PARAMETER Guide
    Optional framework guide names to persist when Build is selected.
.PARAMETER MaxAgentsBytes
    Optional generated instruction byte budget to persist when Build is selected.
.EXAMPLE
    .\scripts\install.ps1 -Target C:\projects\my-repo
#>
param(
    [string]$Target = '.',
    [switch]$Sync,
    [switch]$Build,
    [string]$Profile,
    [string[]]$Guide,
    [int]$MaxAgentsBytes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$KitRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath $Target)) {
    New-Item -ItemType Directory -Force -Path $Target | Out-Null
}
$TargetPath = (Resolve-Path -LiteralPath $Target).Path
if ($TargetPath -eq $KitRoot) {
    throw 'Target must differ from the kit source directory.'
}

Write-Host "Installing Codex Agent Kit into: $TargetPath" -ForegroundColor Cyan

function Install-KitFile {
    <# Copy a kit-relative file, preserving content unless -Sync was passed.
       Creates parent directories; copy errors stop installation. #>
    param([string]$RelativePath)
    $src = Join-Path $KitRoot $RelativePath
    $dst = Join-Path $TargetPath $RelativePath
    if ((Test-Path -LiteralPath $dst) -and -not $Sync) {
        Write-Host "  Skipped: $RelativePath (use -Sync to overwrite)" -ForegroundColor Yellow
        return
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst -Force
}

$dirs = @('.agents\skills', 'agents', 'rules', 'profiles', 'guides', 'workflows', 'examples', 'templates', 'evals', 'scripts')
foreach ($d in $dirs) {
    $src = Join-Path $KitRoot $d
    New-Item -ItemType Directory -Force -Path (Join-Path $TargetPath $d) | Out-Null
    foreach ($file in Get-ChildItem -LiteralPath $src -Recurse -File -Force) {
        $relativePath = $file.FullName.Substring($KitRoot.Length + 1)
        if (($relativePath -split '[\\/]') -contains '__pycache__') { continue }
        Install-KitFile $relativePath
    }
    Write-Host "  Copied dir: $d" -ForegroundColor Green
}

$files = @(
    '.agent-kit.json', 'AGENTS.md', 'CLAUDE.md', 'definition-of-done.md', 'README.md',
    'CONTRIBUTING.md', 'CHANGELOG.md', '.cursorrules', '.clinerules',
    '.github/copilot-instructions.md'
)
foreach ($f in $files) { Install-KitFile $f }

if (($Profile -or $Guide -or $PSBoundParameters.ContainsKey('MaxAgentsBytes')) -and -not $Build) {
    throw '-Profile, -Guide, and -MaxAgentsBytes require -Build because they change generated instructions.'
}
if ($Build) {
    $kitCommand = Join-Path $TargetPath 'scripts\kit.ps1'
    $arguments = @('-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', $kitCommand, 'build')
    if ($Profile) { $arguments += @('-Profile', $Profile) }
    if ($Guide) { $arguments += '-Guide'; $arguments += $Guide }
    if ($PSBoundParameters.ContainsKey('MaxAgentsBytes')) { $arguments += @('-MaxAgentsBytes', $MaxAgentsBytes) }
    & powershell @arguments
    if ($LASTEXITCODE -ne 0) { throw 'Instruction build failed in the target repository.' }
}

Write-Host "Done. Codex Agent Kit installed into $TargetPath" -ForegroundColor Cyan
if (-not $Build) {
    Write-Host 'Review preserved files, then run scripts/kit.ps1 build (or the Python builder) in the target repository.'
}
