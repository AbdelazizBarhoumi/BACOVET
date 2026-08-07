<!DOCTYPE html>
<html lang="fr" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Service indisponible — BACOVET</title>
        <meta name="description" content="BACOVET est temporairement indisponible pour une opération de maintenance.">
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <style>
            :root {
                --background: oklch(0.98 0.003 250);
                --foreground: oklch(0.2 0.012 250);
                --card: oklch(1 0 0);
                --card-foreground: oklch(0.2 0.012 250);
                --muted-foreground: oklch(0.45 0.013 250);
                --border: oklch(0.9 0.008 250);
                --brand-dark: #1a1a2e;
                --brand-primary: #0f3460;
                --brand-accent: #e94560;
                --status-orange: rgb(21, 35, 159);
            }

            @media (prefers-color-scheme: dark) {
                :root {
                    --background: oklch(0.18 0.012 250);
                    --foreground: oklch(0.96 0.005 250);
                    --card: oklch(0.22 0.013 250);
                    --card-foreground: oklch(0.96 0.005 250);
                    --muted-foreground: oklch(0.7 0.015 250);
                    --border: oklch(0.3 0.013 250);
                }
            }

            * { box-sizing: border-box; }

            html, body {
                margin: 0;
                height: 100%;
            }

            body {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 1.5rem;
                background-color: var(--background);
                color: var(--foreground);
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            .grid-overlay {
                position: fixed;
                inset: 0;
                pointer-events: none;
                opacity: 0.04;
                background-image:
                    linear-gradient(var(--foreground) 1px, transparent 1px),
                    linear-gradient(90deg, var(--foreground) 1px, transparent 1px);
                background-size: 40px 40px;
            }

            .card {
                position: relative;
                width: 100%;
                max-width: 28rem;
                padding: 2.5rem;
                background-color: var(--card);
                color: var(--card-foreground);
                border: 1px solid var(--border);
                border-radius: 0.75rem;
                box-shadow: 0 20px 45px -12px rgb(0 0 0 / 0.18);
                text-align: center;
            }

            .logo {
                height: 3.5rem;
                margin: 0 auto 1.75rem;
                display: block;
            }

            .code {
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 3.25rem;
                font-weight: 700;
                letter-spacing: 0.08em;
                line-height: 1;
                margin: 0 0 0.5rem;
                color: var(--status-orange);
            }

            .eyebrow {
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 0.6875rem;
                font-weight: 600;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: var(--muted-foreground);
                margin: 0 0 0.375rem;
            }

            h1 {
                font-size: 1.25rem;
                font-weight: 600;
                margin: 0 0 0.75rem;
            }

            .message {
                font-size: 0.875rem;
                line-height: 1.6;
                color: var(--muted-foreground);
                margin: 0 0 1.75rem;
            }

            .hint {
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 0.6875rem;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--muted-foreground);
                margin: 0;
            }

            .status-pill {
                display: inline-block;
                margin-top: 1.25rem;
                padding: 0.375rem 0.875rem;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 0.6875rem;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--brand-accent);
                border: 1px solid currentColor;
                border-radius: 9999px;
            }
        </style>
    </head>
    <body>
        <div class="grid-overlay" aria-hidden="true"></div>

        <div class="card" role="main">
            <span class="code">503</span>
            <p class="eyebrow">Service indisponible</p>
            <h1>Maintenance en cours</h1>
            <p class="message">
                BACOVET est temporairement indisponible pour une opération de maintenance.
                Merci de réessayer dans quelques instants.
            </p>
            <p class="hint">Pilotage opérationnel — BACOVET</p>
            <span class="status-pill">Hors ligne temporairement</span>
        </div>
    </body>
</html>
