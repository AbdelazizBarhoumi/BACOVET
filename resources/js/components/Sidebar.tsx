import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    Boxes,
    Database,
    FlaskConical,
    LogOut,
    Settings,
    ChevronRight,
    LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, ROLE_LABEL, type RolePage } from '@/context/AuthContext';
import { pushAudit } from '@/lib/audit';

const NAV_ITEMS: {
    href: RolePage;
    label: string;
    code: string;
    icon: typeof Activity;
    children?: { href: string; label: string }[];
}[] = [
    { href: '/quality', label: 'QUALITÉ', code: '100', icon: FlaskConical },
    {
        href: '/production',
        label: 'PRODUCTION',
        code: '200',
        icon: BarChart3,
        children: [
            { href: '/production?tab=confection', label: 'Confection' },
            { href: '/production?tab=coupe', label: 'Coupe' },
            { href: '/production?tab=serigraphie', label: 'Sérigraphie' },
        ],
    },
    {
        href: '/logistics',
        label: 'LOGISTIQUE & PLANNING',
        code: '300',
        icon: Boxes,
    },
    {
        href: '/developpement',
        label: 'DÉVELOPPEMENT & AMÉLIORATION',
        code: '350',
        icon: Activity,
    },
    { href: '/methods', label: 'MÉTHODES', code: '', icon: LayoutDashboard },
    { href: '/kpi-endpoints', label: 'KPI ENDPOINTS', code: '', icon: Database },
    { href: '/v3', label: 'PAGE BUILDER', code: 'V3', icon: LayoutDashboard },
];

const Sidebar = () => {
    const { url: pathname } = usePage();
    const { session, logout, hasAccess } = useAuth();

    if (!session) return null;

    const initials = session.name
        .split(' ')
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const visibleNav = NAV_ITEMS.filter((n) => hasAccess(n.href));
    const canSeeAdmin = hasAccess('/admin');

    return (
        <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
            <div className="border-b border-sidebar-border px-5 py-5">
                <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-primary font-mono font-bold text-white">
                        B
                    </div>
                    <div>
                        <div className="text-sm font-bold tracking-widest">
                            BACOVET
                        </div>
                        <div className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                            Pilotage Op.
                        </div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
                {visibleNav.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    const isParentOfActive = pathname.startsWith(item.href);

                    return (
                        <div key={item.href}>
                            <Link
                                href={item.href}
                                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                    active
                                        ? 'border-l-2 border-primary bg-primary/15 text-primary'
                                        : 'hover:bg-sidebar-accent'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="flex-1 text-[12px] font-semibold tracking-wide uppercase">
                                    {item.label}
                                </span>
                                {item.code && (
                                    <span
                                        className={`font-mono text-[10px] ${active ? 'text-white/70' : 'text-muted-foreground'}`}
                                    >
                                        ({item.code})
                                    </span>
                                )}
                            </Link>

                            {isParentOfActive && item.children && (
                                <div className="mt-1 mb-2 ml-9 space-y-1 border-l border-border pl-2">
                                    {item.children.map((c) => {
                                        const isChildActive = pathname === c.href;
                                        return (
                                            <Link
                                                key={c.href}
                                                href={c.href as RolePage}
                                                className={`block px-2 py-1.5 text-xs transition-colors ${
                                                    isChildActive
                                                        ? 'font-bold text-primary'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                <ChevronRight className={`mr-1 inline h-3 w-3 ${isChildActive ? 'opacity-100' : 'opacity-50'}`} />
                                                {c.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {canSeeAdmin && (
                    <>
                        <div className="px-3 pt-6 pb-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                            SYSTÈME
                        </div>
                        <Link
                            href="/admin"
                            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                pathname === '/admin'
                                    ? 'border-l-2 border-primary bg-primary/15 text-primary'
                                    : 'hover:bg-sidebar-accent'
                            }`}
                        >
                            <Settings
                                className={`h-4 w-4 ${pathname === '/admin' ? 'text-white' : 'text-primary'}`}
                            />
                            <span className="flex-1 text-[12px] font-semibold tracking-wide uppercase">
                                ADMINISTRATION
                            </span>
                        </Link>
                    </>
                )}
            </nav>

            <div className="border-t border-sidebar-border bg-sidebar-accent/30 p-4">
                <div className="mb-3 flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-bold text-white shadow-sm">
                        {initials}
                    </div>
                    <div className="min-w-0 text-xs leading-tight">
                        <div className="truncate font-bold uppercase">
                            {session.name}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">
                            {ROLE_LABEL[session.role]}
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        pushAudit('USER', `Déconnexion ${session.matricule}`);
                        logout();
                    }}
                    className="w-full justify-start text-[11px] tracking-wider uppercase hover:bg-destructive/10 hover:text-destructive"
                >
                    <LogOut className="mr-2 h-3.5 w-3.5" /> DÉCONNEXION
                </Button>
            </div>
        </aside>
    );
};

export default Sidebar;
