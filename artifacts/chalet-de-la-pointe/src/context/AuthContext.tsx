import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface Owner { id: string; name: string; canApprove: boolean; isAdmin: boolean }
interface AuthContextValue {
  user: Owner | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
let clientPromise: Promise<SupabaseClient> | undefined;
function client() {
  return clientPromise ??= fetch("/api/auth/config").then(async res => {
    if (!res.ok) throw new Error("Connexion indisponible.");
    const { url, key } = await res.json();
    return createClient(url, key);
  }).catch(err => { clientPromise = undefined; throw err; });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Owner | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [authError, setError] = useState("");
  const cache = useQueryClient();
  useEffect(() => {
    let active = true;
    let revision = 0;
    let subscription: { unsubscribe(): void } | undefined;
    client().then(supabase => {
      if (!active) return;
      setAuthTokenGetter(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null);
      subscription = supabase.auth.onAuthStateChange((_event, session) => {
        const current = ++revision;
        if (!session) {
          cache.clear(); setUser(null); setLoading(false); return;
        }
        fetch("/api/me", { headers: { Authorization: "Bearer " + session.access_token }, cache: "no-store" })
          .then(async res => {
            if (!res.ok) throw new Error("Accès réservé aux propriétaires invités.");
            return res.json() as Promise<Owner>;
          }).then(owner => {
            if (active && revision === current) { setUser(owner); setError(""); }
          }).catch(err => {
            if (active && revision === current) { cache.clear(); setUser(null); setError(err.message); }
          }).finally(() => { if (active && revision === current) setLoading(false); });
      }).data.subscription;
    }).catch(() => { if (active) { setError("Connexion momentanément indisponible."); setLoading(false); } });
    return () => { active = false; subscription?.unsubscribe(); };
  }, [cache]);

  async function login(email: string) {
    const next = new URLSearchParams(location.search).get("suite");
    const redirect = new URL("/connexion", location.origin);
    if (next === "approbations") redirect.searchParams.set("suite", next);
    const { error } = await (await client()).auth.signInWithOtp({
      email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: redirect.href },
    });
    if (error) throw error;
  }
  async function logout() {
    const { error } = await (await client()).auth.signOut({ scope: "local" });
    if (error) throw error;
    cache.clear(); setUser(null);
  }
  return <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, authError, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider requis.");
  return ctx;
}

export async function ownerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await (await client()).auth.getSession()).data.session?.access_token;
  if (!token) throw new Error("Connexion requise.");
  const res = await fetch("/api" + path, { ...init, cache: "no-store", headers: {
    Authorization: "Bearer " + token, "Content-Type": "application/json",
  } });
  if (!res.ok) throw new Error((await res.json()).error || "Demande impossible.");
  return res.json();
}
