import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CampaignMetrics, Lead } from '@/types/campaign';

interface CampaignDataStore {
  campaignMetrics: CampaignMetrics[];
  positiveLeads: Lead[];
  negativeLeads: Lead[];
  
  setCampaignMetrics: (metrics: CampaignMetrics[]) => void;
  setPositiveLeads: (leads: Lead[]) => void;
  setNegativeLeads: (leads: Lead[]) => void;
  addPositiveLead: (lead: Lead) => void;
  addNegativeLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  getAllLeads: () => Lead[];
  reset: () => void;
}

export const useCampaignData = create<CampaignDataStore>()(
  persist(
    (set, get) => ({
      campaignMetrics: [],
      positiveLeads: [],
      negativeLeads: [],
      
      setCampaignMetrics: (metrics) => set({ campaignMetrics: metrics }),
      setPositiveLeads: (leads) => set({ positiveLeads: leads }),
      setNegativeLeads: (leads) => set({ negativeLeads: leads }),
      
      addPositiveLead: (lead) => set((state) => ({
        positiveLeads: [...state.positiveLeads, lead]
      })),
      
      addNegativeLead: (lead) => set((state) => ({
        negativeLeads: [...state.negativeLeads, lead]
      })),
      
      updateLead: (id, updates) => set((state) => ({
        positiveLeads: state.positiveLeads.map(lead => 
          lead.id === id ? { ...lead, ...updates } : lead
        ),
        negativeLeads: state.negativeLeads.map(lead => 
          lead.id === id ? { ...lead, ...updates } : lead
        )
      })),
      
      getAllLeads: () => {
        const state = get();
        return [...state.positiveLeads, ...state.negativeLeads];
      },
      
      reset: () => set({
        campaignMetrics: [],
        positiveLeads: [],
        negativeLeads: []
      })
    }),
    {
      name: 'campaign-data-storage',
    }
  )
);
