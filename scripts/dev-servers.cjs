/**
 * Dev test stack launcher: `php artisan serve` + the Vite dev server, started
 * together and kept alive. Used by `npm run dev:all` and by the Playwright
 * `webServer` (see playwright.config.ts).
 *
 * Prints a `[boot] ready` line once both health checks pass; forwards SIGINT /
 * SIGTERM to the children so manual Ctrl+C and Playwright teardown both unwind
 * cleanly.
 */
const { spawn } = require('node:child_process');
const { get: httpGet } = require('node:http');
const path = require('node:path');

const HOST = '127.0.0.1';
const PHP_PORT = 8010;
const VITE_PORT = 5173;
const root = path.resolve(__dirname, '..');

const children = [];

function start(label, cmd, args) {
    const child = spawn(cmd, args, {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (d) => process.stdout.write(`[${label}] ${d}`));
    child.stderr.on('data', (d) => process.stderr.write(`[${label}] ${d}`));
    child.on('exit', (code, signal) => {
        process.stderr.write(`[${label}] exited (code ${code}, signal ${signal})\n`);
    });
    children.push(child);
    return child;
}

function checkPort(port) {
    return new Promise((resolve) => {
        const req = httpGet(`http://${HOST}:${port}/`, (res) => {
            res.resume();
            resolve(true);
        });
        req.setTimeout(2000, () => {
            req.destroy();
            resolve(false);
        });
        req.on('error', () => resolve(false));
    });
}

async function waitFor(port, label, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await checkPort(port)) {
            console.log(`[boot] ${label} up on ${HOST}:${port}`);
            return;
        }
        await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`[boot] ${label} (${HOST}:${port}) did not become ready`);
}

function shutdown() {
    for (const child of children) {
        try {
            child.kill();
        } catch {
            // already gone
        }
    }
}

process.on('SIGINT', () => {
    shutdown();
    process.exit(130);
});
process.on('SIGTERM', () => {
    shutdown();
    process.exit(143);
});

(async () => {
    try {
        start(
            'laravel',
            process.platform === 'win32' ? 'php' : 'php',
            [
                'artisan',
                'serve',
                `--host=${HOST}`,
                `--port=${String(PHP_PORT)}`,
            ],
        );
        start(
            'vite',
            process.execPath,
            [
                path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
                '--host',
                HOST,
                '--port',
                String(VITE_PORT),
            ],
        );
        await waitFor(PHP_PORT, 'laravel (php artisan serve)', 90_000);
        await waitFor(VITE_PORT, 'vite', 60_000);
        process.stdout.write('[boot] ready\n');
    } catch (err) {
        process.stderr.write(`${err.message}\n`);
        shutdown();
        process.exit(1);
    }
})();