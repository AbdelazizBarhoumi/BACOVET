import { usePage } from '@inertiajs/react';
import { LayoutDashboard } from 'lucide-react';
import ExportButton from './ExportButton';
import LiveSyncPill from './LiveSyncPill';
import ThemeToggle from './ThemeToggle';

const PAGE_TITLE_MAP: Record<string, string> = {
    '/admin': 'ADMINISTRATION SYSTÈME',
};

export interface TopBarProps {
    title?: string;
    subtitle?: string;
    exportRows?: Record<string, unknown>[];
    exportFilename?: string;
}

const TopBar = ({
    title: propTitle,
    subtitle,
    exportRows,
    exportFilename,
}: TopBarProps) => {
    const { url: pathname } = usePage();

    const title = propTitle || PAGE_TITLE_MAP[pathname] || 'DASHBOARD';

    const filename =
        exportFilename ||
        `BACOVET_${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;

    return (
        <header className="sticky top-0 z-10 border-b border-border bg-card/40 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-6 py-3">
                <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                    <div>
                        <h1 className="text-base font-bold tracking-wide uppercase">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {exportRows && exportRows.length > 0 && (
                        <ExportButton
                            rows={exportRows as Record<string, string | number | null>[]}
                            filename={filename}
                        />
                    )}
                    <ThemeToggle />
                    <LiveSyncPill />
                </div>
            </div>
        </header>
    );
};

export default TopBar;
