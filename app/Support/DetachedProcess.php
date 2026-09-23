<?php

namespace App\Support;

use Illuminate\Support\Facades\Process;

/**
 * Spawn a long-running PHP CLI task fully detached from the caller so it
 * survives even when the caller (e.g. a `php -S` web request or a short-lived
 * schedule:run process) exits immediately.
 *
 * Windows uses `start "" /B` and Unix uses `nohup ... &`, both of which create
 * a process that is reparented away from the caller. Output is appended to the
 * given log path so the caller never blocks waiting on pipes.
 */
class DetachedProcess
{
    /**
     * Memoized PHP CLI binary (successes only, so a transient failure can
     * never wedge later calls).
     */
    private static ?string $phpCli = null;

    /** @var list<string> Candidates tried by the last resolution (diagnostics). */
    private static array $triedBins = [];

    /**
     * Resolve a working PHP **CLI** binary. PHP_BINARY is only correct when
     * the caller itself runs on the CLI (artisan, queue, serve); under
     * php-fpm it points at the FPM binary, which cannot run artisan at all
     * (and on some hosts that path does not even exist for a shell). Every
     * candidate must prove it is the cli SAPI via ` --version`, so php-fpm /
     * php-cgi impostors are rejected instead of producing silent dead workers.
     */
    public static function phpCli(): string
    {
        if (self::$phpCli !== null) {
            return self::$phpCli;
        }

        foreach (self::cliCandidates() as $bin) {
            self::$triedBins[] = $bin;

            if (self::isCliBinary($bin)) {
                self::$phpCli = $bin;

                return $bin;
            }
        }

        // Last resort: the caller gets PHP_BINARY and preflight() below will
        // report the failure honestly (including the tried list).
        return PHP_BINARY;
    }

    /**
     * Ordered candidates: the current binary first (already correct for
     * artisan/queue/serve callers), then PATH names plus common absolute
     * locations for versioned installs.
     *
     * @return list<string>
     */
    private static function cliCandidates(): array
    {
        $bins = [PHP_BINARY, 'php', 'php8.4', 'php8.3', 'php8.2', 'php8.1', 'php8.0'];

        if (PHP_OS_FAMILY !== 'Windows') {
            $bins[] = '/usr/local/bin/php';
            $bins[] = '/usr/bin/php';

            foreach (['8.4', '8.3', '8.2', '8.1'] as $version) {
                $bins[] = "/usr/local/bin/php{$version}";
                $bins[] = "/usr/bin/php{$version}";
            }
        }

        return array_values(array_unique(array_filter($bins)));
    }

    /**
     * True when $bin executes and reports the cli SAPI.
     */
    private static function isCliBinary(string $bin): bool
    {
        try {
            $quoted = str_contains($bin, '/') || str_contains($bin, '\\') || str_contains($bin, ' ')
                ? '"'.$bin.'"'
                : $bin;

            $result = Process::path(base_path())
                ->env(self::safeEnvironment())
                ->timeout(15)
                ->run($quoted.' --version');

            if (! $result->successful()) {
                return false;
            }

            $output = strtolower((string) $result->output());

            return str_contains($output, '(cli)') && str_contains($output, 'php');
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Synchronous smoke test proving the resolved PHP CLI can actually
     * execute artisan. The async spawn below is fire-and-forget by nature: a
     * broken runtime would otherwise die silently with its output sent to
     * /dev/null while the caller reports queued:true. Callers should run this
     * first and refuse to claim success when it fails.
     *
     * @return array{ok: bool, php_binary: string, output: string}
     */
    public static function preflight(): array
    {
        $php = self::phpCli();

        try {
            // String command (like spawn() below) so the invocation looks
            // identical to every other process this app fakes/asserts.
            $command = '"'.$php.'" "'.base_path('artisan').'" --version';

            $result = Process::path(base_path())
                ->env(self::safeEnvironment())
                ->timeout(20)
                ->run($command);

            $output = trim((string) $result->output()."\n".(string) $result->errorOutput());
            $ok = $result->successful();

            if (! $ok) {
                $output = ($output !== '' ? $output : 'preflight failed with no output')
                    .' | tried binaries: '.implode(', ', self::$triedBins !== [] ? self::$triedBins : [$php]);
            }

            return [
                'ok' => $ok,
                'php_binary' => $php,
                'output' => mb_substr($output !== '' ? $output : 'no output', 0, 2000),
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'php_binary' => $php,
                'output' => mb_substr('preflight exception: '.$e->getMessage(), 0, 2000),
            ];
        }
    }

    /**
     * Append a timestamped marker line to the worker log BEFORE spawning.
     * Returns false when the log is not writable — the earliest signal that
     * the detached child could never report anything (its own redirection
     * would fail silently). A log with a marker but no worker output means
     * the child died instantly; a log without a marker was never attempted.
     */
    public static function mark(string $logPath, string $message): bool
    {
        try {
            @mkdir(dirname($logPath), 0755, true);

            $line = '['.now()->toIso8601String().'] '.$message.PHP_EOL;

            return file_put_contents($logPath, $line, FILE_APPEND | LOCK_EX) !== false;
        } catch (\Throwable) {
            return false;
        }
    }
    /**
     * Absolute path to the command shell so the spawn never depends on the
     * caller's PATH (PHP-FPM / web-server environments frequently strip System32).
     */
    private static function shellPath(): string
    {
        if (PHP_OS_FAMILY !== 'Windows') {
            return 'nohup';
        }

        $comSpec = (string) getenv('ComSpec');

        if ($comSpec !== '' && file_exists($comSpec)) {
            return '"'.$comSpec.'"';
        }

        $systemRoot = (string) getenv('SystemRoot');
        $candidates = [
            $systemRoot.'\\System32\\cmd.exe',
            'C:\\Windows\\System32\\cmd.exe',
            'C:\\Windows\\Sysnative\\cmd.exe',
        ];

        foreach ($candidates as $candidate) {
            if (file_exists($candidate)) {
                return '"'.$candidate.'"';
            }
        }

        return 'cmd';
    }

    public static function spawn(string $logPath, array $parts): void
    {
        // Never PHP_BINARY directly: under php-fpm it is the FPM binary.
        $line = '"'.str_replace('"', '', self::phpCli()).'" "'.base_path('artisan').'"';

        foreach ($parts as $part) {
            if ($part === null || $part === '') {
                continue;
            }

            $line .= ' "'.str_replace('"', '', (string) $part).'"';
        }

        $line .= ' >> "'.$logPath.'" 2>&1';

        $command = PHP_OS_FAMILY === 'Windows'
            ? self::shellPath().' /c start "" /B '.$line
            : 'nohup '.$line.' > /dev/null 2>&1 &';

        // `php artisan serve` hands the worker an environment built from $_ENV,
        // which on XAMPP is effectively empty, so children spawned from a web
        // request can be missing SystemRoot. Without it, PDO's MySQL TCP connect
        // fails with SQLSTATE[HY000] [2002] "Unknown error while connecting".
        // Symfony merges these over the inherited env, so only fill real gaps.
        Process::path(base_path())->env(self::safeEnvironment())->start($command);
    }

    /**
     * Minimal environment that guarantees the spawned process can open TCP
     * sockets (SystemRoot), resolve the shell (ComSpec) and write temp files.
     * Missing entries are taken from the real environment when available so we
     * never clobber a value the parent intentionally set.
     */
    private static function safeEnvironment(): array
    {
        $systemRoot = (string) (getenv('SystemRoot') ?: 'C:\\Windows');
        $comSpec = (string) (getenv('ComSpec') ?: $systemRoot.'\\System32\\cmd.exe');
        $path = (string) getenv('PATH');
        $temp = (string) (getenv('TEMP') ?: getenv('TMP') ?: $systemRoot.'\\Temp');

        if ($path === '') {
            $path = $systemRoot.'\\System32;'.$systemRoot;
        }

        return [
            'SystemRoot' => $systemRoot,
            'SystemDrive' => substr($systemRoot, 0, 2),
            'ComSpec' => $comSpec,
            'PATH' => $path,
            'TEMP' => $temp,
            'TMP' => $temp,
        ];
    }
}
