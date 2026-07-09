const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const PROJECT_ROOT = path.join(__dirname, '..');

const SERVERS = [
  {
    name: 'artisan-serve',
    cmd: 'php',
    args: ['artisan', 'serve', '--host=127.0.0.1', '--port=8005'],
    dir: PROJECT_ROOT,
    port: 8005,
    color: '\x1b[35m',
  },
  {
    name: 'artisan-schedule',
    cmd: 'php',
    args: ['artisan', 'schedule:work'],
    dir: PROJECT_ROOT,
    port: null,
    color: '\x1b[33m',
  },
  {
    name: 'novacity-mock',
    cmd: 'node',
    args: ['server.js'],
    dir: path.join(PROJECT_ROOT, 'novacity-mock'),
    port: 3001,
    color: '\x1b[32m',
  },
  {
    name: 'google-drive-mock',
    cmd: 'node',
    args: ['server.js'],
    dir: path.join(PROJECT_ROOT, 'google-drive-mock'),
    port: 3002,
    color: '\x1b[32m',
  },
  {
    name: 'gpro-consulting-mock',
    cmd: 'node',
    args: ['server.js'],
    dir: path.join(PROJECT_ROOT, 'gpro-consulting-mock'),
    port: 3003,
    color: '\x1b[32m',
  },
];

let processes = [];
let restarting = false;

function log(msg) {
  console.log(`\x1b[36m[dev]\x1b[0m ${msg}`);
}

function formatTag(srv) {
  const portStr = srv.port ? `:${srv.port}` : '';
  return `${srv.color}${srv.name}\x1b[0m \x1b[90m${portStr}\x1b[0m`;
}

function startAll() {
  restarting = false;
  console.clear();
  console.log('\x1b[1m\x1b[33m  BACOVET Dev Environment\x1b[0m');
  console.log('\x1b[90m  Press r to restart all | Ctrl+C to stop\x1b[0m\n');

  for (const srv of SERVERS) {
    const child = spawn(srv.cmd, srv.args, {
      cwd: srv.dir,
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    const tag = formatTag(srv);

    child.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        console.log(`  ${tag}  ${line}`);
      }
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        console.log(`  \x1b[31m${srv.name}\x1b[0m  ${line}`);
      }
    });

    child.on('exit', (code) => {
      if (!restarting) {
        console.log(`  ${tag} exited with code ${code}`);
      }
    });

    processes.push(child);
  }

  log(`All ${SERVERS.length} services started`);
}

function killAll() {
  return new Promise((resolve) => {
    let killed = 0;
    const total = processes.length;
    if (total === 0) return resolve();

    for (const p of processes) {
      p.on('exit', () => {
        killed++;
        if (killed === total) resolve();
      });
      p.kill('SIGTERM');
    }

    setTimeout(() => {
      for (const p of processes) {
        try { p.kill('SIGKILL'); } catch {}
      }
      resolve();
    }, 3000);
  });
}

async function restart() {
  if (restarting) return;
  restarting = true;
  log('Restarting all services...');
  await killAll();
  processes = [];
  startAll();
}

// Key listener — works in real terminals
if (process.stdin.isTTY) {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  process.stdin.on('keypress', (str, key) => {
    if (key && key.name === 'c' && key.ctrl) {
      log('Shutting down...');
      killAll().then(() => process.exit(0));
      return;
    }
    if (str === 'r' || str === 'R') {
      restart();
    }
  });
}

startAll();
