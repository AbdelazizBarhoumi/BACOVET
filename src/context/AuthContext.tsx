import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role =
  | "admin"
  | "direction"
  | "resp_production"
  | "chef_atelier"
  | "resp_qualite"
  | "methodes"
  | "coupe";

export type RolePage =
  | "/quality"
  | "/production"
  | "/logistics"
  | "/development"
  | "/admin"
  | "/methods"
  | "/unauthorized";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "IT / Administrateur",
  direction: "Direction",
  resp_production: "Responsable Production",
  chef_atelier: "Chef d'Atelier",
  resp_qualite: "Responsable Qualité",
  methodes: "Méthodes / Planning",
  coupe: "Coupe",
};

// Role -> pages allowed (from spec role matrix in Sprint 8.5 and section 0.5)
export const ROLE_ACCESS: Record<Role, RolePage[]> = {
  admin: [
    "/quality",
    "/production",
    "/logistics",
    "/development",
    "/admin",
    "/methods",
    "/unauthorized",
  ],
  direction: ["/quality", "/production", "/logistics", "/development", "/methods", "/unauthorized"],
  resp_production: ["/quality", "/production", "/unauthorized"],
  chef_atelier: ["/production", "/unauthorized"],
  resp_qualite: ["/quality", "/unauthorized"],
  methodes: [
    "/quality",
    "/production",
    "/logistics",
    "/methods",
    "/development",
    "/unauthorized",
  ],
  coupe: ["/production", "/logistics", "/unauthorized"],
};

export const ROLE_HOME: Record<Role, RolePage> = {
  admin: "/admin",
  direction: "/quality",
  resp_production: "/production",
  chef_atelier: "/production",
  resp_qualite: "/quality",
  methodes: "/methods",
  coupe: "/production",
};

// Demo accounts for the mock login
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
  token: string;
  expiresAt: number;
};

// Simple cookie helpers
const setCookie = (name: string, value: string, days = 7) => {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  return (
    document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")?.pop() ||
    null
  );
};

const removeCookie = (name: string) => {
  setCookie(name, "", -1);
};

// Global auth object for beforeLoad (rehydrated from cookie if available)
const getInitialSession = (): Session | null => {
  const saved = getCookie("bacovet-session");
  if (!saved) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(saved));
    if (Date.now() > parsed.expiresAt) {
      removeCookie("bacovet-session");
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const auth = {
  session: getInitialSession(),
  isLoading: false,
  hasAccess(page: string): boolean {
    if (!this.session) return false;
    if (page === "/unauthorized") return true;
    const allowed = ROLE_ACCESS[this.session.role] || [];
    return allowed.includes(page as RolePage);
  },
};

type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
  login: (
    matricule: string,
    pwd: string,
  ) => Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  logout: () => void;
  hasAccess: (page: RolePage) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(auth.session);
  const [isLoading, setIsLoading] = useState(auth.isLoading);

  // Sync session state to auth object and cookie
  useEffect(() => {
    auth.session = session;
    if (session) {
      setCookie("bacovet-session", JSON.stringify(session));
    } else {
      removeCookie("bacovet-session");
    }
  }, [session]);

  // Auto-logout if session expires
  useEffect(() => {
    if (!session) return;

    const checkExpiry = () => {
      if (Date.now() > session.expiresAt) {
        setSession(null);
      }
    };

    const interval = setInterval(checkExpiry, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [session]);

  const login = async (matricule: string, pwd: string) => {
    setIsLoading(true);
    auth.isLoading = true;
    try {
      // Structuring for real endpoint: /api/auth/login
      await new Promise((resolve) => setTimeout(resolve, 800));

      const acct = DEMO_ACCOUNTS[matricule.toUpperCase()];
      if (!acct || pwd !== "demo") {
        return { ok: false, error: "Identifiants incorrects" } as const;
      }

      const newSession: Session = {
        matricule: matricule.toUpperCase(),
        name: acct.name,
        role: acct.role,
        token: "mock-jwt-token-" + Math.random().toString(36).substring(7),
        expiresAt: Date.now() + SESSION_DURATION,
      };

      setSession(newSession);
      return { ok: true, role: acct.role } as const;
    } catch (error) {
      return { ok: false, error: "Erreur de connexion" } as const;
    } finally {
      setIsLoading(false);
      auth.isLoading = false;
    }
  };

  const logout = () => {
    setSession(null);
  };

  const hasAccess = (page: RolePage) => {
    return auth.hasAccess(page);
  };

  const value = useMemo(
    () => ({
      session,
      isLoading,
      login,
      logout,
      hasAccess,
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
