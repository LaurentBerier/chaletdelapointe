import {
  isRelationship,
  type Relationship,
  type AccountStatus,
} from "../../../../lib/shared/membership";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { BookingAccess } from "../../../../lib/db/src/booking-access";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface Owner {
  id: string;
  email: string;
  accountStatus: AccountStatus;
  declaredRelation: Relationship | null;
  isOwner: boolean;
  hasPassword: boolean;
  canBook: boolean;
  bookingAccess: BookingAccess;
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
  register: (
    email: string,
    password: string,
    name: string,
    relation: Relationship,
  ) => Promise<void>;
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
  const [identity, setIdentity] = useState<string | null>(null);
  const activeIdentity = useRef<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [recovery, setRecovery] = useState(
    () =>
      new URLSearchParams(location.hash.slice(1)).get("type") === "recovery",
  );
  const [setupError, setError] = useState("");
  const cache = useQueryClient();
  const account = useQuery({
    queryKey: ["session-account", identity],
    enabled: !!identity,
    retry: false,
    queryFn: () => ownerRequest<Owner>("/me"),
    refetchInterval: (q) =>
      q.state.data?.bookingAccess === "pending" ||
      q.state.data?.accountStatus === "pending"
        ? 10000
        : false,
    refetchOnWindowFocus: "always",
  });
  const user = identity && !account.isError ? (account.data ?? null) : null;
  const isLoading = starting || (!!identity && account.isPending);
  const authError = setupError || (identity && account.error?.message) || "";
  useEffect(() => {
    let active = true;
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
          const id = session?.user.id ?? null;
          if (activeIdentity.current !== id) cache.clear();
          activeIdentity.current = id;
          setIdentity(id);
          setStarting(false);
          setError("");
          if (!session) setRecovery(false);
          else if (event === "PASSWORD_RECOVERY") setRecovery(true);
          if (
            id &&
            ["SIGNED_IN", "USER_UPDATED", "TOKEN_REFRESHED"].includes(event)
          ) {
            // Do not await another Auth call while Supabase holds its event lock.
            void cache.invalidateQueries({ queryKey: ["session-account", id] });
          }
        }).data.subscription;
      })
      .catch(() => {
        if (active) {
          setError("Connexion momentanément indisponible.");
          setStarting(false);
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
  async function register(
    email: string,
    password: string,
    name: string,
    relation: Relationship,
  ) {
    if (!isRelationship(relation))
      throw new Error("Choisissez votre lien avec le chalet.");
    if (!name.trim() || name.trim().length > 80)
      throw new Error("Nom invalide.");
    const { error } = await (
      await client()
    ).auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim(), declared_relation: relation },
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
    await cache.invalidateQueries({ queryKey: ["session-account", identity] });
  }
  async function saveName(name: string) {
    await ownerRequest<{ name: string }>("/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    await cache.invalidateQueries();
  }
  async function logout() {
    const { error } = await (await client()).auth.signOut({ scope: "local" });
    if (error) throw error;
    cache.clear();
    setIdentity(null);
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
