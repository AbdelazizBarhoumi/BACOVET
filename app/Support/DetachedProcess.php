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
        $line = '"'.PHP_BINARY.'" "'.base_path('artisan').'"';

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
