const { spawn } = require('node:child_process');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let shuttingDown = false;

const run = (name, args) => {
  const child = spawn(npm, args, {
    cwd: __dirname + '/..',
    stdio: 'inherit',
    shell: false,
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (code === 0 || signal) return;
    shuttingDown = true;
    console.error(`[${name}] exited with code ${code}`);
    stopAll();
    process.exit(code ?? 1);
  });

  return child;
};

const stopAll = () => {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
};

process.on('SIGINT', () => {
  shuttingDown = true;
  stopAll();
  process.exit(130);
});

process.on('SIGTERM', () => {
  shuttingDown = true;
  stopAll();
  process.exit(143);
});

run('server', ['run', 'dev', '--prefix', 'server']);
run('client', ['run', 'dev', '--prefix', 'client', '--', '--host', '0.0.0.0']);
