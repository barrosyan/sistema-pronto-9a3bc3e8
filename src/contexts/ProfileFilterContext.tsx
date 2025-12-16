import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const loadProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles_data')
        .select('profile_name')
        .eq('user_id', user.id)
        .order('profile_name');

      if (data && !error) {
        const profiles = data.map(p => p.profile_name);
        setAvailableProfiles(profiles);
        
        // Auto-select all profiles if none selected
        if (selectedProfiles.length === 0 && profiles.length > 0) {
          setSelectedProfiles(profiles);
        }
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

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
    loadProfiles();
  }, []);

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
