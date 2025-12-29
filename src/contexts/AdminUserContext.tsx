import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminUserContextType {
  isAdmin: boolean;
  selectedUserIds: string[];
  setSelectedUserIds: (ids: string[]) => void;
  currentUserId: string | null;
  loading: boolean;
}

const AdminUserContext = createContext<AdminUserContextType | undefined>(undefined);

export function AdminUserProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const handleSession = (session: any) => {
      if (!mounted) return;

      const userId = session?.user?.id;
      if (!userId) {
        setCurrentUserId(null);
        setIsAdmin(false);
        setSelectedUserIds([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Defer DB calls to avoid deadlocks in auth callbacks
      setTimeout(() => {
        if (!mounted) return;
        checkAdminStatus(userId);
      }, 0);
    };

    // Listen for auth state changes FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        initialized = true;
      }
      handleSession(session);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!initialized) {
        initialized = true;
        handleSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      setCurrentUserId(userId);

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      const adminStatus = !!roleData;
      setIsAdmin(adminStatus);
      
      // Always initialize with current user's ID (even for admin)
      setSelectedUserIds([userId]);
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminUserContext.Provider 
      value={{ 
        isAdmin, 
        selectedUserIds, 
        setSelectedUserIds,
        currentUserId,
        loading
      }}
    >
      {children}
    </AdminUserContext.Provider>
  );
}

export function useAdminUser() {
  const context = useContext(AdminUserContext);
  if (context === undefined) {
    throw new Error('useAdminUser must be used within an AdminUserProvider');
  }
  return context;
}
