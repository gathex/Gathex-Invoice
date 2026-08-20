import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../supabase/config";
import { useAuth } from "./AuthContext";
import { AdminRole } from "../types/admin";

interface AdminContextType {
  isAdmin: boolean;
  adminRole: AdminRole | null;
  loading: boolean;
  refetchAdminStatus?: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({ isAdmin: false, adminRole: null, loading: true });

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    console.log('[AdminContext] fetchStatus triggered. authLoading:', authLoading, 'user:', user);

    if (authLoading) {
      console.log('[AdminContext] Auth is still loading session... waiting.');
      setLoading(true);
      return;
    }

    if (!user) { 
      console.log('[AdminContext] No logged in user detected.');
      setIsAdmin(false); 
      setAdminRole(null); 
      setLoading(false); 
      return; 
    }
    
    try {
      const userId = user.id || user.uid;
      console.log('[AdminContext] querying admin_users for userId:', userId, 'email:', user.email);

      const { data, error } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      console.log('[AdminContext] query result from admin_users:', { data, error });

      if (error) {
        console.warn("[AdminContext] Failed to check admin status from admin_users:", error.message);
        setIsAdmin(false);
        setAdminRole(null);
      } else if (data) {
        console.log('[AdminContext] User is confirmed Admin! Role:', data.role);
        setIsAdmin(true);
        setAdminRole(data.role as AdminRole);
      } else {
        console.log('[AdminContext] User is not present in admin_users table.');
        setIsAdmin(false);
        setAdminRole(null);
      }
    } catch (err) {
      console.error("[AdminContext] Error checking admin status:", err);
      setIsAdmin(false);
      setAdminRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [user, authLoading]);

  return (
    <AdminContext.Provider value={{ isAdmin, adminRole, loading, refetchAdminStatus: fetchStatus }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);

