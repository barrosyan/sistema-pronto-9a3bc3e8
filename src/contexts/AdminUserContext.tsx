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
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const adminStatus = !!roleData;
      setIsAdmin(adminStatus);
      
      // Always initialize with current user's ID (even for admin)
      setSelectedUserIds([user.id]);
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
