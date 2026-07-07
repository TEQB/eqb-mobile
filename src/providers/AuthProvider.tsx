import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  supabase: SupabaseClient;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = getSupabaseClient();
  }
  const supabase = supabaseRef.current;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case "INITIAL_SESSION":
        case "SIGNED_IN":
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          break;
        case "TOKEN_REFRESHED":
        case "USER_UPDATED":
          setSession(session);
          setUser(session?.user ?? null);
          break;
        case "SIGNED_OUT":
          setSession(null);
          setUser(null);
          setLoading(false);
          break;
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, supabase, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
