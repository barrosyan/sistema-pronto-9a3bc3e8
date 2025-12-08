import { create } from 'zustand';
import { CampaignMetrics, Lead } from '@/types/campaign';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CampaignDataStore {
  campaignMetrics: CampaignMetrics[];
  positiveLeads: Lead[];
  negativeLeads: Lead[];
  pendingLeads: Lead[];
  isLoading: boolean;
  
  loadFromDatabase: () => Promise<void>;
  setCampaignMetrics: (metrics: CampaignMetrics[]) => Promise<void>;
  setPositiveLeads: (leads: Lead[]) => Promise<void>;
  setNegativeLeads: (leads: Lead[]) => Promise<void>;
  addCampaignMetrics: (metrics: CampaignMetrics[]) => Promise<void>;
  addPositiveLeads: (leads: Lead[]) => Promise<void>;
  addNegativeLeads: (leads: Lead[]) => Promise<void>;
  addPositiveLead: (lead: Lead) => Promise<void>;
  addNegativeLead: (lead: Lead) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  getAllLeads: () => Lead[];
  reset: () => Promise<void>;
}

export const useCampaignData = create<CampaignDataStore>((set, get) => ({
  campaignMetrics: [],
  positiveLeads: [],
  negativeLeads: [],
  pendingLeads: [],
  isLoading: false,
  
  loadFromDatabase: async () => {
    set({ isLoading: true });
    try {
      // Load campaign metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('campaign_metrics')
        .select('*');
      
      if (metricsError) throw metricsError;
      
      // Load leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*');
      
      if (leadsError) throw leadsError;
      
      // Transform database data to app format
      const metrics: CampaignMetrics[] = metricsData?.map(m => ({
        campaignName: m.campaign_name,
        eventType: m.event_type,
        profileName: m.profile_name,
        totalCount: m.total_count,
        dailyData: m.daily_data as Record<string, number>
      })) || [];
      
      const leads: Lead[] = leadsData?.map(l => ({
        id: l.id,
        campaign: l.campaign,
        linkedin: l.linkedin || '',
        name: l.name,
        position: l.position || '',
        company: l.company || '',
        status: l.status as Lead['status'],
        source: l.source,
        connectionDate: l.connection_date,
        positiveResponseDate: l.positive_response_date,
        transferDate: l.transfer_date,
        statusDetails: l.status_details,
        comments: l.comments,
        followUp1Date: l.follow_up_1_date,
        followUp1Comments: l.follow_up_1_comments,
        followUp2Date: l.follow_up_2_date,
        followUp2Comments: l.follow_up_2_comments,
        followUp3Date: l.follow_up_3_date,
        followUp3Comments: l.follow_up_3_comments,
        followUp4Date: l.follow_up_4_date,
        followUp4Comments: l.follow_up_4_comments,
        observations: l.observations,
        meetingScheduleDate: l.meeting_schedule_date,
        meetingDate: l.meeting_date,
        proposalDate: l.proposal_date,
        proposalValue: l.proposal_value,
        saleDate: l.sale_date,
        saleValue: l.sale_value,
        profile: l.profile,
        classification: l.classification,
        attendedWebinar: l.attended_webinar,
        whatsapp: l.whatsapp,
        standDay: l.stand_day,
        pavilion: l.pavilion,
        stand: l.stand,
        negativeResponseDate: l.negative_response_date,
        hadFollowUp: l.had_follow_up,
        followUpReason: l.follow_up_reason
      })) || [];
      
      set({
        campaignMetrics: metrics,
        positiveLeads: leads.filter(l => l.status === 'positive'),
        negativeLeads: leads.filter(l => l.status === 'negative'),
        pendingLeads: leads.filter(l => !['positive', 'negative'].includes(l.status))
      });
    } catch (error) {
      console.error('Error loading data from database:', error);
      toast.error('Erro ao carregar dados do banco');
    } finally {
      set({ isLoading: false });
    }
  },
  
  setCampaignMetrics: async (metrics) => {
    set({ campaignMetrics: metrics });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const metricsToInsert = metrics.map(m => ({
        campaign_name: m.campaignName,
        event_type: m.eventType,
        profile_name: m.profileName,
        total_count: m.totalCount,
        daily_data: m.dailyData,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('campaign_metrics')
        .delete()
        .eq('user_id', user.id)
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      const { error: insertError } = await supabase
        .from('campaign_metrics')
        .insert(metricsToInsert);

      if (insertError) throw insertError;
    } catch (error) {
      console.error('Error saving campaign metrics to database:', error);
    }
  },

  addCampaignMetrics: async (newMetrics) => {
    const existingMetrics = get().campaignMetrics;
    
    // Merge logic: update existing or add new
    const metricsMap = new Map(
      existingMetrics.map(m => [
        `${m.campaignName}|${m.eventType}|${m.profileName}`,
        m
      ])
    );

    newMetrics.forEach(newMetric => {
      const key = `${newMetric.campaignName}|${newMetric.eventType}|${newMetric.profileName}`;
      const existing = metricsMap.get(key);
      
      if (existing) {
        // Merge daily data
        const mergedDailyData = { ...existing.dailyData, ...newMetric.dailyData };
        metricsMap.set(key, {
          ...newMetric,
          dailyData: mergedDailyData,
          totalCount: Object.values(mergedDailyData).reduce((sum: number, val) => sum + (val as number), 0)
        });
      } else {
        metricsMap.set(key, newMetric);
      }
    });

    const mergedMetrics = Array.from(metricsMap.values());
    set({ campaignMetrics: mergedMetrics });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const metricsToUpsert = mergedMetrics.map(m => ({
        campaign_name: m.campaignName,
        event_type: m.eventType,
        profile_name: m.profileName,
        total_count: m.totalCount,
        daily_data: m.dailyData,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('campaign_metrics')
        .upsert(metricsToUpsert, { 
          onConflict: 'campaign_name,event_type,profile_name',
          ignoreDuplicates: false 
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding campaign metrics to database:', error);
    }
  },

  setPositiveLeads: async (leads) => {
    set({ positiveLeads: leads });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('status', 'positive')
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      const leadsToInsert = leads.map(l => ({
        campaign: l.campaign,
        linkedin: l.linkedin,
        name: l.name,
        position: l.position,
        company: l.company,
        status: 'positive',
        source: l.source,
        user_id: user.id,
        connection_date: l.connectionDate,
        positive_response_date: l.positiveResponseDate,
        transfer_date: l.transferDate,
        status_details: l.statusDetails,
        comments: l.comments,
        follow_up_1_date: l.followUp1Date,
        follow_up_1_comments: l.followUp1Comments,
        follow_up_2_date: l.followUp2Date,
        follow_up_2_comments: l.followUp2Comments,
        follow_up_3_date: l.followUp3Date,
        follow_up_3_comments: l.followUp3Comments,
        follow_up_4_date: l.followUp4Date,
        follow_up_4_comments: l.followUp4Comments,
        observations: l.observations,
        meeting_schedule_date: l.meetingScheduleDate,
        meeting_date: l.meetingDate,
        proposal_date: l.proposalDate,
        proposal_value: l.proposalValue,
        sale_date: l.saleDate,
        sale_value: l.saleValue,
        profile: l.profile,
        classification: l.classification,
        attended_webinar: l.attendedWebinar,
        whatsapp: l.whatsapp,
        stand_day: l.standDay,
        pavilion: l.pavilion,
        stand: l.stand,
        negative_response_date: l.negativeResponseDate,
        had_follow_up: l.hadFollowUp,
        follow_up_reason: l.followUpReason,
      }));

      const { error: insertError } = await supabase
        .from('leads')
        .insert(leadsToInsert);

      if (insertError) throw insertError;
    } catch (error) {
      console.error('Error saving positive leads to database:', error);
    }
  },

  addPositiveLeads: async (newLeads) => {
    const existingLeads = get().positiveLeads;
    const mergedLeads = [...existingLeads, ...newLeads];
    set({ positiveLeads: mergedLeads });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const leadsToInsert = newLeads.map(l => ({
        campaign: l.campaign,
        linkedin: l.linkedin,
        name: l.name,
        position: l.position,
        company: l.company,
        status: 'positive',
        source: l.source,
        user_id: user.id,
        connection_date: l.connectionDate,
        positive_response_date: l.positiveResponseDate,
        transfer_date: l.transferDate,
        status_details: l.statusDetails,
        comments: l.comments,
        follow_up_1_date: l.followUp1Date,
        follow_up_1_comments: l.followUp1Comments,
        follow_up_2_date: l.followUp2Date,
        follow_up_2_comments: l.followUp2Comments,
        follow_up_3_date: l.followUp3Date,
        follow_up_3_comments: l.followUp3Comments,
        follow_up_4_date: l.followUp4Date,
        follow_up_4_comments: l.followUp4Comments,
        observations: l.observations,
        meeting_schedule_date: l.meetingScheduleDate,
        meeting_date: l.meetingDate,
        proposal_date: l.proposalDate,
        proposal_value: l.proposalValue,
        sale_date: l.saleDate,
        sale_value: l.saleValue,
        profile: l.profile,
        classification: l.classification,
        attended_webinar: l.attendedWebinar,
        whatsapp: l.whatsapp,
        stand_day: l.standDay,
        pavilion: l.pavilion,
        stand: l.stand,
        negative_response_date: l.negativeResponseDate,
        had_follow_up: l.hadFollowUp,
        follow_up_reason: l.followUpReason,
      }));

      const { error } = await supabase
        .from('leads')
        .insert(leadsToInsert);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding positive leads to database:', error);
    }
  },

  setNegativeLeads: async (leads) => {
    set({ negativeLeads: leads });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('status', 'negative')
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      const leadsToInsert = leads.map(l => ({
        campaign: l.campaign,
        linkedin: l.linkedin,
        name: l.name,
        position: l.position,
        company: l.company,
        status: 'negative',
        source: l.source,
        user_id: user.id,
        connection_date: l.connectionDate,
        positive_response_date: l.positiveResponseDate,
        transfer_date: l.transferDate,
        status_details: l.statusDetails,
        comments: l.comments,
        follow_up_1_date: l.followUp1Date,
        follow_up_1_comments: l.followUp1Comments,
        follow_up_2_date: l.followUp2Date,
        follow_up_2_comments: l.followUp2Comments,
        follow_up_3_date: l.followUp3Date,
        follow_up_3_comments: l.followUp3Comments,
        follow_up_4_date: l.followUp4Date,
        follow_up_4_comments: l.followUp4Comments,
        observations: l.observations,
        meeting_schedule_date: l.meetingScheduleDate,
        meeting_date: l.meetingDate,
        proposal_date: l.proposalDate,
        proposal_value: l.proposalValue,
        sale_date: l.saleDate,
        sale_value: l.saleValue,
        profile: l.profile,
        classification: l.classification,
        attended_webinar: l.attendedWebinar,
        whatsapp: l.whatsapp,
        stand_day: l.standDay,
        pavilion: l.pavilion,
        stand: l.stand,
        negative_response_date: l.negativeResponseDate,
        had_follow_up: l.hadFollowUp,
        follow_up_reason: l.followUpReason,
      }));

      const { error: insertError } = await supabase
        .from('leads')
        .insert(leadsToInsert);

      if (insertError) throw insertError;
    } catch (error) {
      console.error('Error saving negative leads to database:', error);
    }
  },

  addNegativeLeads: async (newLeads) => {
    const existingLeads = get().negativeLeads;
    const mergedLeads = [...existingLeads, ...newLeads];
    set({ negativeLeads: mergedLeads });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const leadsToInsert = newLeads.map(l => ({
        campaign: l.campaign,
        linkedin: l.linkedin,
        name: l.name,
        position: l.position,
        company: l.company,
        status: 'negative',
        source: l.source,
        user_id: user.id,
        connection_date: l.connectionDate,
        positive_response_date: l.positiveResponseDate,
        transfer_date: l.transferDate,
        status_details: l.statusDetails,
        comments: l.comments,
        follow_up_1_date: l.followUp1Date,
        follow_up_1_comments: l.followUp1Comments,
        follow_up_2_date: l.followUp2Date,
        follow_up_2_comments: l.followUp2Comments,
        follow_up_3_date: l.followUp3Date,
        follow_up_3_comments: l.followUp3Comments,
        follow_up_4_date: l.followUp4Date,
        follow_up_4_comments: l.followUp4Comments,
        observations: l.observations,
        meeting_schedule_date: l.meetingScheduleDate,
        meeting_date: l.meetingDate,
        proposal_date: l.proposalDate,
        proposal_value: l.proposalValue,
        sale_date: l.saleDate,
        sale_value: l.saleValue,
        profile: l.profile,
        classification: l.classification,
        attended_webinar: l.attendedWebinar,
        whatsapp: l.whatsapp,
        stand_day: l.standDay,
        pavilion: l.pavilion,
        stand: l.stand,
        negative_response_date: l.negativeResponseDate,
        had_follow_up: l.hadFollowUp,
        follow_up_reason: l.followUpReason,
      }));

      const { error } = await supabase
        .from('leads')
        .insert(leadsToInsert);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding negative leads to database:', error);
    }
  },
  
  addPositiveLead: async (lead) => {
    // Add to correct list based on status
    const status = lead.status || 'pending';
    if (status === 'positive') {
      set((state) => ({ positiveLeads: [...state.positiveLeads, lead] }));
    } else if (status === 'negative') {
      set((state) => ({ negativeLeads: [...state.negativeLeads, lead] }));
    } else {
      set((state) => ({ pendingLeads: [...state.pendingLeads, lead] }));
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const { error } = await supabase.from('leads').insert({
        campaign: lead.campaign,
        linkedin: lead.linkedin,
        name: lead.name,
        position: lead.position,
        company: lead.company,
        status: status,
        source: lead.source,
        user_id: user.id,
        connection_date: lead.connectionDate,
        positive_response_date: lead.positiveResponseDate,
        transfer_date: lead.transferDate,
        status_details: lead.statusDetails,
        comments: lead.comments,
        follow_up_1_date: lead.followUp1Date,
        follow_up_1_comments: lead.followUp1Comments,
        follow_up_2_date: lead.followUp2Date,
        follow_up_2_comments: lead.followUp2Comments,
        follow_up_3_date: lead.followUp3Date,
        follow_up_3_comments: lead.followUp3Comments,
        follow_up_4_date: lead.followUp4Date,
        follow_up_4_comments: lead.followUp4Comments,
        observations: lead.observations,
        meeting_schedule_date: lead.meetingScheduleDate,
        meeting_date: lead.meetingDate,
        proposal_date: lead.proposalDate,
        proposal_value: lead.proposalValue,
        sale_date: lead.saleDate,
        sale_value: lead.saleValue,
        profile: lead.profile,
        classification: lead.classification,
        attended_webinar: lead.attendedWebinar,
        whatsapp: lead.whatsapp,
        stand_day: lead.standDay,
        pavilion: lead.pavilion,
        stand: lead.stand,
        negative_response_date: lead.negativeResponseDate,
        had_follow_up: lead.hadFollowUp,
        follow_up_reason: lead.followUpReason,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error('Erro ao adicionar lead');
    }
  },
  
  addNegativeLead: async (lead) => {
    set((state) => ({ negativeLeads: [...state.negativeLeads, lead] }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      const { error } = await supabase.from('leads').insert({
        campaign: lead.campaign,
        linkedin: lead.linkedin,
        name: lead.name,
        position: lead.position,
        company: lead.company,
        status: 'negative',
        source: lead.source,
        user_id: user.id,
        connection_date: lead.connectionDate,
        positive_response_date: lead.positiveResponseDate,
        transfer_date: lead.transferDate,
        status_details: lead.statusDetails,
        comments: lead.comments,
        follow_up_1_date: lead.followUp1Date,
        follow_up_1_comments: lead.followUp1Comments,
        follow_up_2_date: lead.followUp2Date,
        follow_up_2_comments: lead.followUp2Comments,
        follow_up_3_date: lead.followUp3Date,
        follow_up_3_comments: lead.followUp3Comments,
        follow_up_4_date: lead.followUp4Date,
        follow_up_4_comments: lead.followUp4Comments,
        observations: lead.observations,
        meeting_schedule_date: lead.meetingScheduleDate,
        meeting_date: lead.meetingDate,
        proposal_date: lead.proposalDate,
        proposal_value: lead.proposalValue,
        sale_date: lead.saleDate,
        sale_value: lead.saleValue,
        profile: lead.profile,
        classification: lead.classification,
        attended_webinar: lead.attendedWebinar,
        whatsapp: lead.whatsapp,
        stand_day: lead.standDay,
        pavilion: lead.pavilion,
        stand: lead.stand,
        negative_response_date: lead.negativeResponseDate,
        had_follow_up: lead.hadFollowUp,
        follow_up_reason: lead.followUpReason,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error adding negative lead:', error);
      toast.error('Erro ao adicionar lead negativo');
    }
  },
  
  updateLead: async (id, updates) => {
    set((state) => ({
      positiveLeads: state.positiveLeads.map(lead => 
        lead.id === id ? { ...lead, ...updates } : lead
      ),
      negativeLeads: state.negativeLeads.map(lead => 
        lead.id === id ? { ...lead, ...updates } : lead
      ),
      pendingLeads: state.pendingLeads.map(lead => 
        lead.id === id ? { ...lead, ...updates } : lead
      )
    }));
    
    try {
      // Convert camelCase to snake_case for database
      const dbUpdates: Record<string, any> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.campaign !== undefined) dbUpdates.campaign = updates.campaign;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.position !== undefined) dbUpdates.position = updates.position;
      if (updates.company !== undefined) dbUpdates.company = updates.company;
      if (updates.linkedin !== undefined) dbUpdates.linkedin = updates.linkedin;
      if (updates.source !== undefined) dbUpdates.source = updates.source;
      if (updates.connectionDate !== undefined) dbUpdates.connection_date = updates.connectionDate;
      if (updates.observations !== undefined) dbUpdates.observations = updates.observations;
      if (updates.meetingDate !== undefined) dbUpdates.meeting_date = updates.meetingDate;
      if (updates.proposalDate !== undefined) dbUpdates.proposal_date = updates.proposalDate;
      if (updates.proposalValue !== undefined) dbUpdates.proposal_value = updates.proposalValue;
      if (updates.saleDate !== undefined) dbUpdates.sale_date = updates.saleDate;
      if (updates.saleValue !== undefined) dbUpdates.sale_value = updates.saleValue;
      if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
      if (updates.comments !== undefined) dbUpdates.comments = updates.comments;
      if (updates.positiveResponseDate !== undefined) dbUpdates.positive_response_date = updates.positiveResponseDate;
      if (updates.negativeResponseDate !== undefined) dbUpdates.negative_response_date = updates.negativeResponseDate;

      const { error } = await supabase
        .from('leads')
        .update(dbUpdates)
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Erro ao atualizar lead');
    }
  },
  
  getAllLeads: () => {
    const state = get();
    return [...state.positiveLeads, ...state.negativeLeads, ...state.pendingLeads];
  },
  
  reset: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      await supabase.from('campaign_metrics').delete().eq('user_id', user.id);
      await supabase.from('leads').delete().eq('user_id', user.id);
      
      set({
        campaignMetrics: [],
        positiveLeads: [],
        negativeLeads: []
      });
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Erro ao limpar dados');
    }
  }
}));
