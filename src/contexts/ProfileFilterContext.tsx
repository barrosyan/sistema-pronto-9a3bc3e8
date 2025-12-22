import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileFilterContextType {
  selectedProfiles: string[];
  setSelectedProfiles: (profiles: string[]) => void;
  toggleProfile: (profile: string) => void;
  selectAllProfiles: () => void;
  clearProfiles: () => void;
  availableProfiles: string[];
  loadProfiles: () => Promise<void>;
  // Legacy support - returns first selected profile or null
  selectedProfile: string | null;
  setSelectedProfile: (profile: string | null) => void;
}

const ProfileFilterContext = createContext<ProfileFilterContextType | undefined>(undefined);

export function ProfileFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<string[]>([]);

  const loadProfiles = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAvailableProfiles([]);
        setSelectedProfiles([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles_data')
        .select('profile_name')
        .eq('user_id', user.id)
        .order('profile_name');

      if (error) {
        console.error('Error loading profiles:', error);
        return;
      }

      const profiles = (data || []).map(p => p.profile_name);
      setAvailableProfiles(profiles);

      // Auto-select profiles after login (and keep selection valid if profiles changed)
      setSelectedProfiles(prev => {
        const kept = prev.filter(p => profiles.includes(p));
        return kept.length > 0 ? kept : profiles;
      });
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  }, []);

  const toggleProfile = (profile: string) => {
    setSelectedProfiles(prev => {
      if (prev.includes(profile)) {
        return prev.filter(p => p !== profile);
      } else {
        return [...prev, profile];
      }
    });
  };

  const selectAllProfiles = () => {
    setSelectedProfiles(availableProfiles);
  };

  const clearProfiles = () => {
    setSelectedProfiles([]);
  };

  // Legacy support
  const selectedProfile = selectedProfiles.length > 0 ? selectedProfiles[0] : null;
  const setSelectedProfile = (profile: string | null) => {
    if (profile) {
      setSelectedProfiles([profile]);
    } else {
      setSelectedProfiles([]);
    }
  };

  useEffect(() => {
    // Initial load (for refresh) + reload when auth state changes (for login)
    loadProfiles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadProfiles();
      }

      if (event === 'SIGNED_OUT') {
        setAvailableProfiles([]);
        setSelectedProfiles([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfiles]);

  return (
    <ProfileFilterContext.Provider 
      value={{ 
        selectedProfiles,
        setSelectedProfiles,
        toggleProfile,
        selectAllProfiles,
        clearProfiles,
        availableProfiles,
        loadProfiles,
        // Legacy support
        selectedProfile, 
        setSelectedProfile,
      }}
    >
      {children}
    </ProfileFilterContext.Provider>
  );
}

export function useProfileFilter() {
  const context = useContext(ProfileFilterContext);
  if (context === undefined) {
    throw new Error('useProfileFilter must be used within a ProfileFilterProvider');
  }
  return context;
}
