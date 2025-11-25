import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileFilterContextType {
  selectedProfile: string | null;
  setSelectedProfile: (profile: string | null) => void;
  availableProfiles: string[];
  loadProfiles: () => Promise<void>;
}

const ProfileFilterContext = createContext<ProfileFilterContextType | undefined>(undefined);

export function ProfileFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
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
        
        // Auto-select first profile if none selected
        if (!selectedProfile && profiles.length > 0) {
          setSelectedProfile(profiles[0]);
        }
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  return (
    <ProfileFilterContext.Provider 
      value={{ 
        selectedProfile, 
        setSelectedProfile, 
        availableProfiles,
        loadProfiles 
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
