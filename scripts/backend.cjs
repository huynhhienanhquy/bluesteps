const { spawnSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const cwd = path.resolve(__dirname, '../apps/api');
const executable = path.join(
  cwd,
  process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python',
);
if (!fs.existsSync(executable)) {
  console.error('Backend environment is missing. Run: cd apps/api && uv sync --frozen');
  process.exit(1);
}
const commands = {
  lan: [
    '-m',
    'uvicorn',
    'bluesteps_api.main:app',
    '--host',
    '0.0.0.0',
    '--port',
    '8000',
    '--reload',
  ],
  dev: [
    '-m',
    'uvicorn',
    'bluesteps_api.main:app',
    '--host',
    '127.0.0.1',
    '--port',
    '8000',
    '--reload',
  ],
  worker: ['-m', 'bluesteps_api.worker'],
  migrate: ['-m', 'bluesteps_api.cli', 'migrate', ...process.argv.slice(3)],
  schema: ['-m', 'bluesteps_api.cli', 'export-openapi'],
  test: ['-m', 'pytest', ...process.argv.slice(3)],
};
const command = process.argv[2];
if (command === 'check') {
  for (const args of [
    ['-m', 'ruff', 'check', '.'],
    ['-m', 'ruff', 'format', '--check', '.'],
    ['-m', 'mypy', 'src'],
    ['-m', 'pytest'],
  ]) {
    const result = spawnSync(executable, args, { cwd, stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
} else if (commands[command]) {
  const child = spawn(executable, commands[command], { cwd, stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 1));
  child.on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  });
} else {
  console.error('Choose: dev, lan, worker, migrate, schema, test, check');
  process.exit(1);
}
