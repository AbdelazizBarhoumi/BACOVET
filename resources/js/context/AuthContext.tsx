import { usePage, router } from '@inertiajs/react';
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    type ReactNode,
} from 'react';
import { toast } from 'sonner';

export type Role =
    | 'admin'
    | 'direction'
    | 'resp_production'
    | 'chef_atelier'
    | 'resp_qualite'
    | 'methodes'
    | 'planning_coupe';

export type RolePage =
    | '/quality'
    | '/production'
    | '/logistics'
    | '/developpement'
    | '/admin'
    | '/methods'
    | '/unauthorized'
    | '/dashboard';

export const ROLE_LABEL: Record<Role, string> = {
    admin: 'IT / Administrateur',
    direction: 'Direction',
    resp_production: 'Responsable Production',
    chef_atelier: "Chef d'Atelier",
    resp_qualite: 'Responsable Qualité',
    methodes: 'Méthodes / Planning',
    planning_coupe: 'Planning / Coupe',
};

// Role -> pages allowed (from spec role matrix in Sprint 8.5 and section 0.5)
export const ROLE_ACCESS: Record<Role, RolePage[]> = {
    admin: [
        '/quality',
        '/production',
        '/logistics',
        '/developpement',
        '/admin',
        '/methods',
        '/unauthorized',
    ],
    direction: [
        '/quality',
        '/production',
        '/logistics',
        '/developpement',
        '/methods',
        '/unauthorized',
    ],
    resp_production: ['/quality', '/production', '/unauthorized'],
    chef_atelier: ['/production', '/unauthorized'],
    resp_qualite: ['/quality', '/unauthorized'],
    methodes: [
        '/quality',
        '/production',
        '/logistics',
        '/methods',
        '/developpement',
        '/unauthorized',
    ],
    planning_coupe: ['/production', '/logistics', '/unauthorized'],
};

export const DEMO_ACCOUNTS: Record<string, { name: string; role: Role }> = {
    'ADMIN-001': { name: 'IT Admin', role: 'admin' },
    'DIR-001': { name: 'M. Director', role: 'direction' },
    'P-1042': { name: 'A. Belhaj', role: 'resp_production' },
    'P-2017': { name: 'User', role: 'chef_atelier' },
    'Q-0210': { name: 'S. Karoui', role: 'resp_qualite' },
    'L-3308': { name: 'N. Saidi', role: 'methodes' },
    'C-4421': { name: 'K. Hammami', role: 'planning_coupe' },
};

export const ROLE_HOME: Record<Role, RolePage> = {
    admin: '/admin',
    direction: '/quality',
    resp_production: '/production',
    chef_atelier: '/production',
    resp_qualite: '/quality',
    methodes: '/methods',
    planning_coupe: '/production',
};

export type Session = {
    matricule: string;
    name: string;
    role: Role;
};

type AuthContextType = {
    session: Session | null;
    isLoading: boolean;
    login: (matricule: string, pwd: string) => Promise<void>;
    logout: () => void;
    hasAccess: (page: RolePage) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export type AuthUser = {
    name: string;
    matricule: string;
    email: string;
    role?: string | { slug?: string; name?: string };
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const page = usePage<{
        auth: { user: AuthUser | null };
        csrf_token: string;
    }>();

    const { auth, csrf_token } = page.props;
    const previousUrl = useRef(page.url);

    const session = useMemo(() => {
        if (!auth?.user) return null;
        const roleSlug =
            typeof auth.user.role === 'object' && auth.user.role !== null
                ? (auth.user.role as { slug?: string }).slug
                : auth.user.role;
        const normalizedRole = roleSlug === 'it' ? 'admin' : roleSlug;
        return {
            matricule: auth.user.matricule,
            name: auth.user.name,
            role: (normalizedRole as Role) || 'admin',
        };
    }, [auth]);

    useEffect(() => {
        const cameFromLogin =
            previousUrl.current === '/login' && page.url !== '/login';

        if (cameFromLogin && session) {
            toast.success('Authentification réussie');
        }

        previousUrl.current = page.url;
    }, [page.url, session]);

    // CDC F-REQ-400 / NF-REQ-502: 30 min idle → force logout
    useEffect(() => {
        if (!session) return;

        const TIMEOUT_MS = 30 * 60 * 1000;
        let timer: ReturnType<typeof setTimeout>;

        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                toast.error('Session expirée par inactivité');
                router.post('/auth/logout', { _token: csrf_token });
            }, TIMEOUT_MS);
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }));
        resetTimer();

        return () => {
            clearTimeout(timer);
            events.forEach((e) => document.removeEventListener(e, resetTimer));
        };
    }, [session, csrf_token]);

    const hasAccess = useMemo(
        () => (page: RolePage) => {
            if (!session) return false;
            if (page === '/unauthorized') return true;
            const allowed = ROLE_ACCESS[session.role] || [];
            return allowed.includes(page);
        },
        [session],
    );

    const login = useMemo(
        () => async (matricule: string, pwd: string) => {
            router.post('/auth/login', {
                matricule,
                password: pwd,
                _token: csrf_token,
            });
        },
        [csrf_token],
    );

    const logout = useMemo(
        () => () => {
            router.post('/auth/logout', { _token: csrf_token });
        },
        [csrf_token],
    );

    const value = useMemo(
        () => ({
            session,
            isLoading: false,
            login,
            logout,
            hasAccess,
        }),
        [session, login, logout, hasAccess],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
