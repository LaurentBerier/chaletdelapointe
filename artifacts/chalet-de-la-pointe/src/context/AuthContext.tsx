import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface Owner {
  id: string;
  email: string;
  isOwner: boolean;
  name: string;
  canApprove: boolean;
  isAdmin: boolean;
}
interface AuthContextValue {
  user: Owner | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string;
  login: (email: string) => Promise<void>;
  passwordLogin: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  sendRecovery: (email: string) => Promise<void>;
  savePassword: (password: string) => Promise<void>;
  saveName: (name: string) => Promise<void>;
  recovery: boolean;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
let clientPromise: Promise<SupabaseClient> | undefined;
function client() {
  return (clientPromise ??= fetch("/api/auth/config")
    .then(async (res) => {
      if (!res.ok) throw new Error("Connexion indisponible.");
      const { url, key } = await res.json();
      return createClient(url, key);
    })
    .catch((err) => {
      clientPromise = undefined;
      throw err;
    }));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Owner | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(
    () =>
      new URLSearchParams(location.hash.slice(1)).get("type") === "recovery",
  );
  const [authError, setError] = useState("");
  const cache = useQueryClient();
  useEffect(() => {
    let active = true;
    let revision = 0;
    let subscription: { unsubscribe(): void } | undefined;
    client()
      .then((supabase) => {
        if (!active) return;
        setAuthTokenGetter(
          async () =>
            (await supabase.auth.getSession()).data.session?.access_token ??
            null,
        );
        subscription = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY") setRecovery(true);
          const current = ++revision;
          if (!session) {
            cache.clear();
            setUser(null);
            setRecovery(false);
            setError("");
            setLoading(false);
            return;
          }
          fetch("/api/me", {
            headers: { Authorization: "Bearer " + session.access_token },
            cache: "no-store",
          })
            .then(async (res) => {
              if (!res.ok)
                throw new Error(
                  (await res.json()).error || "Compte indisponible.",
                );
              return res.json() as Promise<Owner>;
            })
            .then((owner) => {
              if (active && revision === current) {
                setUser(owner);
                setError("");
              }
            })
            .catch((err) => {
              if (active && revision === current) {
                cache.clear();
                setUser(null);
                setError(err.message);
              }
            })
            .finally(() => {
              if (active && revision === current) setLoading(false);
            });
        }).data.subscription;
      })
      .catch(() => {
        if (active) {
          setError("Connexion momentanément indisponible.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [cache]);

  async function login(email: string) {
    const next = new URLSearchParams(location.search).get("suite");
    const redirect = new URL("/connexion", location.origin);
    if (next === "approbations") redirect.searchParams.set("suite", next);
    const { error } = await (
      await client()
    ).auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: redirect.href },
    });
    if (error) throw error;
  }
  async function passwordLogin(email: string, password: string) {
    const { error } = await (
      await client()
    ).auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }
  async function register(email: string, password: string, name: string) {
    if (!name.trim() || name.trim().length > 80) throw new Error("Nom invalide.");
    const { error } = await (
      await client()
    ).auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim() },
        emailRedirectTo: new URL("/connexion", location.origin).href,
      },
    });
    if (error) throw error;
  }
  async function sendRecovery(email: string) {
    const { error } = await (
      await client()
    ).auth.resetPasswordForEmail(email.trim(), {
      redirectTo: new URL("/connexion", location.origin).href,
    });
    if (error) throw error;
  }
  async function savePassword(password: string) {
    const { error } = await (await client()).auth.updateUser({ password });
    if (error) throw error;
    setRecovery(false);
  }
  async function saveName(name: string) {
    const result = await ownerRequest<{ name: string }>("/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    setUser((u) => (u ? { ...u, name: result.name } : null));
    await cache.invalidateQueries();
  }
  async function logout() {
    const { error } = await (await client()).auth.signOut({ scope: "local" });
    if (error) throw error;
    cache.clear();
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        authError,
        login,
        passwordLogin,
        register,
        sendRecovery,
        savePassword,
        saveName,
        recovery,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider requis.");
  return ctx;
}

export async function ownerRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = (await (await client()).auth.getSession()).data.session
    ?.access_token;
  if (!token) throw new Error("Connexion requise.");
  const res = await fetch("/api" + path, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok)
    throw new Error((await res.json()).error || "Demande impossible.");
  return res.json();
}
