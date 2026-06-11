import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

export type Role =
  | "admin"
  | "direction"
  | "resp_production"
  | "chef_atelier"
  | "resp_qualite"
  | "methodes"
  | "coupe";

export type RolePage = "/quality" | "/production" | "/logistics" | "/development" | "/admin";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "IT / Administrateur",
  direction: "Direction",
  resp_production: "Responsable Production",
  chef_atelier: "Chef d'Atelier",
  resp_qualite: "Responsable Qualité",
  methodes: "Méthodes / Planning",
  coupe: "Coupe",
};

// Role -> pages allowed (from spec role matrix)
export const ROLE_ACCESS: Record<Role, RolePage[]> = {
  admin: ["/quality", "/production", "/logistics", "/development", "/admin"],
  direction: ["/quality", "/production", "/logistics", "/development"],
  resp_production: ["/production", "/quality"],
  chef_atelier: ["/production"],
  resp_qualite: ["/quality"],
  methodes: ["/production", "/logistics"],
  coupe: ["/production", "/logistics"],
};

export const ROLE_HOME: Record<Role, RolePage> = {
  admin: "/admin",
  direction: "/quality",
  resp_production: "/production",
  chef_atelier: "/production",
  resp_qualite: "/quality",
  methodes: "/production",
  coupe: "/production",
};

// Demo accounts (matricule -> role). Password = "demo" for all.
export const DEMO_ACCOUNTS: Record<string, { name: string; role: Role }> = {
  "ADMIN-001": { name: "IT Admin", role: "admin" },
  "DIR-001": { name: "M. Director", role: "direction" },
  "P-1042": { name: "A. Belhaj", role: "resp_production" },
  "P-2017": { name: "M. Trabelsi", role: "chef_atelier" },
  "Q-0210": { name: "S. Karoui", role: "resp_qualite" },
  "L-3308": { name: "N. Saidi", role: "methodes" },
  "C-4421": { name: "K. Hammami", role: "coupe" },
};

export type Session = {
  matricule: string;
  name: string;
  role: Role;
  loginAt: number;
  lastActivity: number;
};

const STORAGE = "bacovet-session";
const SESSION_MS = 8 * 60 * 60 * 1000; // 8h

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (Date.now() - s.lastActivity > SESSION_MS) {
      localStorage.removeItem(STORAGE);
      return null;
    }
    return s;
  } catch { return null; }
}

type Ctx = {
  session: Session | null;
  login: (matricule: string, pwd: string) => { ok: true; role: Role } | { ok: false; error: string };
  logout: () => void;
  hasAccess: (page: RolePage) => boolean;
};

const AuthCtx = createContext<Ctx>({
  session: null,
  login: () => ({ ok: false, error: "" }),
  logout: () => {},
  hasAccess: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });

  // Track activity for the inactivity timeout (8h)
  useEffect(() => {
    if (!session) return;
    const bump = () => {
      const next = { ...session, lastActivity: Date.now() };
      localStorage.setItem(STORAGE, JSON.stringify(next));
    };
    const evts = ["mousedown", "keydown", "scroll", "touchstart"];
    evts.forEach(e => window.addEventListener(e, bump, { passive: true }));
    const check = setInterval(() => {
      const s = readSession();
      if (!s) {
        setSession(null);
        navigate({ to: "/login" });
      }
    }, 30_000);
    return () => {
      evts.forEach(e => window.removeEventListener(e, bump));
      clearInterval(check);
    };
  }, [session, navigate]);

  // Route guard: redirect to /login if accessing protected page without session
  useEffect(() => {
    const isPublic = pathname === "/login" || pathname === "/";
    if (!session && !isPublic) {
      navigate({ to: "/login" });
    }
  }, [session, pathname, navigate]);

  const value = useMemo<Ctx>(() => ({
    session,
    login: (matricule, pwd) => {
      const acct = DEMO_ACCOUNTS[matricule.toUpperCase()];
      if (!acct || pwd !== "demo") return { ok: false, error: "Identifiants incorrects" };
      const next: Session = {
        matricule: matricule.toUpperCase(),
        name: acct.name,
        role: acct.role,
        loginAt: Date.now(),
        lastActivity: Date.now(),
      };
      localStorage.setItem(STORAGE, JSON.stringify(next));
      setSession(next);
      return { ok: true, role: acct.role };
    },
    logout: () => {
      localStorage.removeItem(STORAGE);
      setSession(null);
      navigate({ to: "/login" });
    },
    hasAccess: (page) => {
      if (!session) return false;
      return ROLE_ACCESS[session.role].includes(page);
    },
  }), [session, navigate]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
