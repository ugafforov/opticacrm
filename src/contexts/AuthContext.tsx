import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState<string | null>(null);

  const checkAdminStatus = useCallback(async (userId: string) => {
    // Skip if already checked for this user
    if (adminChecked === userId) return;
    
    try {
      const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
      
      if (error) {
        logger.error("Error checking admin status:", error);
        setIsAdmin(false);
        return;
      }
      
      setIsAdmin(!!data);
      setAdminChecked(userId);
    } catch (error) {
      logger.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  }, [adminChecked]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setAdminChecked(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkAdminStatus]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAdminChecked(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    isAdmin,
    signOut,
  }), [user, session, loading, isAdmin, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
