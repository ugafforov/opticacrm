import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

/**
 * Hook wrapper for AuthContext - provides navigation on signOut
 * All auth state is cached in AuthContext to prevent duplicate API calls
 */
export const useAuth = () => {
  const context = useAuthContext();
  const navigate = useNavigate();

  const signOutWithNavigate = async () => {
    await context.signOut();
    navigate("/auth");
  };

  return {
    user: context.user,
    session: context.session,
    loading: context.loading,
    isAdmin: context.isAdmin,
    signOut: signOutWithNavigate,
  };
};
