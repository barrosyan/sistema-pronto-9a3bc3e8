import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useProfileFilter } from '@/contexts/ProfileFilterContext';
import { useAdminUser } from '@/contexts/AdminUserContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Info, Plus, Download, Trash2, Pencil, Check, X } from 'lucide-react';
import { DeleteCampaignDialog } from '@/components/DeleteCampaignDialog';
import { CampaignDetailsDialog } from '@/components/CampaignDetailsDialog';
import { CampaignDetailsCard } from '@/components/CampaignDetailsCard';
import { CampaignDialog } from '@/components/CampaignDialog';
import { CampaignFunnelChart } from '@/components/CampaignFunnelChart';
import { CampaignFunnelComparison } from '@/components/CampaignFunnelComparison';
import { WeeklyPerformanceChart } from '@/components/WeeklyPerformanceChart';
import { DateRangePicker } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { ExportOptions } from '@/components/ExportOptions';
import { CampaignPivotTable } from '@/components/CampaignPivotTable';
import { leadBelongsToCampaign, getLeadResponseType } from '@/utils/metricsCalculator';
import { toast } from 'sonner';

interface DailyData {
  date: string;
  invitations: number;
  connections: number;
  messages: number;
  visits: number;
  likes: number;
  comments: number;
  positiveResponses: number;
  isActive: boolean;
}

interface WeeklyData {
  week: string;
  startDate: string;
  endDate: string;
  invitations: number;
  connections: number;
  messages: number;
  visits: number;
  likes: number;
  comments: number;
  positiveResponses: number;
  meetings: number;
  proposals: number;
  sales: number;
  activeDays: number;
  totalDays: number;
}

export default function Campaigns() {
  const { campaignMetrics, getAllLeads, loadFromDatabase, isLoading, updateMetricValue, updateLead, updateCampaignDates } = useCampaignData();
  const { selectedProfiles } = useProfileFilter();
  const { selectedUserIds } = useAdminUser();
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('weekly');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCampaignDetails, setSelectedCampaignDetails] = useState<any>(null);
  const [campaignsData, setCampaignsData] = useState<Record<string, any>>({});
  const [calendarView, setCalendarView] = useState<'dates' | 'week-numbers'>('dates');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [compareMode, setCompareMode] = useState(false);
  const [period1Range, setPeriod1Range] = useState<DateRange | undefined>(undefined);
  const [period2Range, setPeriod2Range] = useState<DateRange | undefined>(undefined);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteCampaignDialogOpen, setDeleteCampaignDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [sortOrder, setSortOrder] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>('name-asc');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFromDatabase(selectedUserIds.length > 0 ? selectedUserIds : undefined);
    loadCampaignDetails();
  }, [loadFromDatabase, selectedUserIds]);

  const loadCampaignDetails = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id);
    
    if (data && !error) {
      const campaignsMap = data.reduce((acc, campaign) => {
        acc[campaign.name] = {
          company: campaign.company,
          profile: campaign.profile_name,
          objective: campaign.objective,
          cadence: campaign.cadence,
          jobTitles: campaign.job_titles,
          startDate: campaign.start_date,
          endDate: campaign.end_date,
        };
        return acc;
      }, {} as Record<string, any>);
      setCampaignsData(campaignsMap);
    }
  };

  const handleCreateCampaign = async (campaignData: {
    name: string;
    profile: string;
    objective: string;
    cadence: string;
    positions: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('campaigns')
      .insert({
        name: campaignData.name,
        profile_name: campaignData.profile,
        objective: campaignData.objective,
        cadence: campaignData.cadence,
        job_titles: campaignData.positions,
        user_id: user.id,
      });

    if (!error) {
      await loadCampaignDetails();
      setCreateDialogOpen(false);
    }
  };

  // Extract unique campaigns - filter by selected profiles
  const allCampaignsUnsorted = Array.from(
    new Set(
      campaignMetrics
        .filter(m => selectedProfiles.length === 0 || selectedProfiles.includes(m.profileName))
        .map(m => m.campaignName)
        .filter(Boolean)
    )
  );

  // Sort campaigns based on sortOrder
  const allCampaigns = [...allCampaignsUnsorted].sort((a, b) => {
    if (sortOrder === 'name-asc') {
      return a.localeCompare(b, 'pt-BR');
    } else if (sortOrder === 'name-desc') {
      return b.localeCompare(a, 'pt-BR');
    } else {
      // Sort by date using campaignsData
      const dateA = campaignsData[a]?.startDate ? new Date(campaignsData[a].startDate).getTime() : 0;
      const dateB = campaignsData[b]?.startDate ? new Date(campaignsData[b].startDate).getTime() : 0;
      return sortOrder === 'date-asc' ? dateA - dateB : dateB - dateA;
    }
  });

  useEffect(() => {
    if (allCampaigns.length > 0 && selectedCampaigns.length === 0) {
      setSelectedCampaigns([allCampaigns[0]]);
    }
    // Reset selected campaigns if they're not in the filtered list
    if (selectedCampaigns.length > 0) {
      const validCampaigns = selectedCampaigns.filter(c => allCampaigns.includes(c));
      if (validCampaigns.length === 0 && allCampaigns.length > 0) {
        setSelectedCampaigns([allCampaigns[0]]);
      } else if (validCampaigns.length !== selectedCampaigns.length) {
        setSelectedCampaigns(validCampaigns);
      }
    }
  }, [allCampaigns, selectedProfiles]);

  const toggleCampaign = (campaign: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaign) 
        ? prev.filter(c => c !== campaign)
        : [...prev, campaign]
    );
    setCurrentPage(1); // Reset to first page when campaigns change
  };

  const startEditingCampaign = (campaign: string) => {
    setEditingCampaign(campaign);
    setEditingName(campaign);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const cancelEditingCampaign = () => {
    setEditingCampaign(null);
    setEditingName('');
  };

  const saveCampaignName = async () => {
    const trimmedName = editingName.trim();
    
    if (!editingCampaign || !trimmedName || trimmedName === editingCampaign) {
      cancelEditingCampaign();
      return;
    }

    // Check if name already exists
    if (allCampaigns.some(c => c.toLowerCase() === trimmedName.toLowerCase() && c !== editingCampaign)) {
      toast.error('Já existe uma campanha com esse nome');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Update campaign name in campaigns table
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({ name: trimmedName })
        .eq('user_id', user.id)
        .eq('name', editingCampaign);

      if (campaignError) throw campaignError;

      // Update campaign_name in campaign_metrics table
      const { error: metricsError } = await supabase
        .from('campaign_metrics')
        .update({ campaign_name: trimmedName })
        .eq('user_id', user.id)
        .eq('campaign_name', editingCampaign);

      if (metricsError) throw metricsError;

      // Update campaign in leads table
      const { error: leadsError } = await supabase
        .from('leads')
        .update({ campaign: trimmedName })
        .eq('user_id', user.id)
        .eq('campaign', editingCampaign);

      if (leadsError) throw leadsError;

      // Update selected campaigns if needed
      setSelectedCampaigns(prev => 
        prev.map(c => c === editingCampaign ? trimmedName : c)
      );

      toast.success('Nome da campanha atualizado!');
      await loadFromDatabase(selectedUserIds.length > 0 ? selectedUserIds : undefined);
      await loadCampaignDetails();
    } catch (error) {
      console.error('Error updating campaign name:', error);
      toast.error('Erro ao atualizar nome da campanha');
    } finally {
      cancelEditingCampaign();
    }
  };

  const getDailyDataForCampaign = (campaignName: string): DailyData[] => {
    const campaignData = campaignMetrics.filter(m => m.campaignName === campaignName);
    const allDates = new Set<string>();
    
    campaignData.forEach(metric => {
      Object.keys(metric.dailyData || {}).forEach(date => {
        // Filtrar apenas datas válidas no formato YYYY-MM-DD
        if (date && date.trim() !== '' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
          allDates.add(date);
        }
      });
    });

    // Helper to get daily value from multiple event types
    const getDailyValue = (date: string, eventTypes: string[]) => {
      for (const eventType of eventTypes) {
        const value = campaignData.find(m => m.eventType === eventType)?.dailyData?.[date];
        if (value) return value;
      }
      return 0;
    };

    // Calculate follow-ups sum for messages
    const getFollowUpsSum = (date: string) => {
      const fu1 = getDailyValue(date, ['Follow-Ups 1']);
      const fu2 = getDailyValue(date, ['Follow-Ups 2']);
      const fu3 = getDailyValue(date, ['Follow-Ups 3']);
      return fu1 + fu2 + fu3;
    };

    return Array.from(allDates).sort().map(date => {
      const invitations = getDailyValue(date, ['Connection Requests Sent', 'Convites Enviados']);
      const connections = getDailyValue(date, ['Connection Requests Accepted', 'Conexões Realizadas', 'Connections Made']);
      const followUpsMessages = getFollowUpsSum(date);
      const messages = followUpsMessages || getDailyValue(date, ['Messages Sent', 'Mensagens Enviadas']);
      const visits = getDailyValue(date, ['Profile Visits', 'Visitas a Perfil']);
      const likes = getDailyValue(date, ['Post Likes', 'Curtidas']);
      const comments = getDailyValue(date, ['Comments Done', 'Comentários']);
      const positiveResponses = getDailyValue(date, ['Positive Responses', 'Respostas Positivas']);
      const meetings = getDailyValue(date, ['Meetings', 'Reuniões Marcadas']);

      const isActive = invitations > 0 || connections > 0 || messages > 0 || 
                       visits > 0 || likes > 0 || comments > 0;

      return {
        date,
        invitations,
        connections,
        messages,
        visits,
        likes,
        comments,
        positiveResponses,
        meetings,
        isActive
      };
    });
  };

  const getWeeklyDataForCampaign = (campaignName: string): WeeklyData[] => {
    const dailyData = getDailyDataForCampaign(campaignName);
    const weeklyMap = new Map<string, WeeklyData>();

    dailyData.forEach(day => {
      // Validar data antes de processar
      if (!day.date || isNaN(new Date(day.date).getTime())) return;
      
      const date = new Date(day.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Começar semana na segunda-feira
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          week: format(weekStart, 'dd/MM/yyyy'),
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd'),
          invitations: 0,
          connections: 0,
          messages: 0,
          visits: 0,
          likes: 0,
          comments: 0,
          positiveResponses: 0,
          meetings: 0,
          proposals: 0,
          sales: 0,
          activeDays: 0,
          totalDays: 7 // Sempre 7 dias por semana
        });
      }

      const weekData = weeklyMap.get(weekKey)!;
      weekData.invitations += day.invitations;
      weekData.connections += day.connections;
      weekData.messages += day.messages;
      weekData.visits += day.visits;
      weekData.likes += day.likes;
      weekData.comments += day.comments;
      weekData.positiveResponses += day.positiveResponses;
      
      // Count active days: a day is active if it has any activity
      if (day.isActive) {
        weekData.activeDays += 1;
      }
    });

    const leads = getAllLeads().filter(l => leadBelongsToCampaign(l.campaign, campaignName));
    weeklyMap.forEach(weekData => {
      const weekStart = new Date(weekData.startDate);
      const weekEnd = new Date(weekData.endDate);
      
      // Count meetings
      const weekMeetings = leads.filter(l => {
        if (!l.meetingDate) return false;
        const meetingDate = new Date(l.meetingDate);
        return meetingDate >= weekStart && meetingDate <= weekEnd;
      });
      weekData.meetings = weekMeetings.length;
      
      // Count proposals
      const weekProposals = leads.filter(l => {
        if (!l.proposalDate) return false;
        const proposalDate = new Date(l.proposalDate);
        return proposalDate >= weekStart && proposalDate <= weekEnd;
      });
      weekData.proposals = weekProposals.length;
      
      // Count sales
      const weekSales = leads.filter(l => {
        if (!l.saleDate) return false;
        const saleDate = new Date(l.saleDate);
        return saleDate >= weekStart && saleDate <= weekEnd;
      });
      weekData.sales = weekSales.length;
    });

    return Array.from(weeklyMap.values()).sort((a, b) => a.startDate.localeCompare(b.startDate));
  };

  const getCombinedData = () => {
    if (selectedCampaigns.length === 0) return [];

    if (granularity === 'daily') {
      const allDatesSet = new Set<string>();
      selectedCampaigns.forEach(campaign => {
        getDailyDataForCampaign(campaign).forEach(d => allDatesSet.add(d.date));
      });

      return Array.from(allDatesSet).sort().map(date => {
        const dataPoint: any = { date };
        selectedCampaigns.forEach(campaign => {
          const campaignData = getDailyDataForCampaign(campaign).find(d => d.date === date);
          dataPoint[`${campaign}_invitations`] = campaignData?.invitations || 0;
          dataPoint[`${campaign}_connections`] = campaignData?.connections || 0;
          dataPoint[`${campaign}_messages`] = campaignData?.messages || 0;
          dataPoint[`${campaign}_visits`] = campaignData?.visits || 0;
        });
        return dataPoint;
      });
    } else {
      // For week-numbers view, use week number comparison data
      if (calendarView === 'week-numbers' && selectedCampaigns.length > 1) {
        return getWeekNumberComparisonData();
      }
      
      const allWeeksSet = new Set<string>();
      selectedCampaigns.forEach(campaign => {
        getWeeklyDataForCampaign(campaign).forEach(w => allWeeksSet.add(w.week));
      });

      return Array.from(allWeeksSet).sort().map(week => {
        const dataPoint: any = { week };
        selectedCampaigns.forEach(campaign => {
          const campaignData = getWeeklyDataForCampaign(campaign).find(w => w.week === week);
          dataPoint[`${campaign}_invitations`] = campaignData?.invitations || 0;
          dataPoint[`${campaign}_connections`] = campaignData?.connections || 0;
          dataPoint[`${campaign}_messages`] = campaignData?.messages || 0;
          dataPoint[`${campaign}_visits`] = campaignData?.visits || 0;
        });
        return dataPoint;
      });
    }
  };

  // Helper to get metric total with multiple event type options (PT/EN)
  // Uses dailyData sum with fallback to totalCount for consistency
  const getMetricValue = (campaignData: any[], eventTypes: string[], dateFilter?: DateRange) => {
    let total = 0;
    for (const eventType of eventTypes) {
      const metric = campaignData.find(m => m.eventType === eventType);
      if (metric) {
        const dailyData = metric.dailyData || {};
        const entries = Object.entries(dailyData);
        
        if (!dateFilter?.from) {
          // No date filter: sum all dailyData, fallback to totalCount
          const dailySum = entries.reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
          total += dailySum > 0 ? dailySum : (metric.totalCount || 0);
        } else {
          // With date filter: only sum values within range
          entries.forEach(([dateKey, value]) => {
            try {
              if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
              const metricDate = parseISO(dateKey);
              const isInRange = dateFilter.to
                ? isWithinInterval(metricDate, { start: dateFilter.from, end: dateFilter.to })
                : metricDate >= dateFilter.from;
              if (isInRange) {
                total += Number(value) || 0;
              }
            } catch (e) {}
          });
        }
      }
    }
    return total;
  };

  const getCampaignSummary = (campaignName: string, dateFilter?: DateRange) => {
    const campaignData = campaignMetrics.filter(m => m.campaignName === campaignName);
    
    // Calculate messages from follow-ups
    const followUps1 = getMetricValue(campaignData, ['Follow-Ups 1'], dateFilter);
    const followUps2 = getMetricValue(campaignData, ['Follow-Ups 2'], dateFilter);
    const followUps3 = getMetricValue(campaignData, ['Follow-Ups 3'], dateFilter);
    const messagesFromFollowUps = followUps1 + followUps2 + followUps3;
    
    const totals = {
      invitations: getMetricValue(campaignData, ['Connection Requests Sent', 'Convites Enviados'], dateFilter),
      connections: getMetricValue(campaignData, ['Connection Requests Accepted', 'Conexões Realizadas', 'Connections Made'], dateFilter),
      messages: messagesFromFollowUps || getMetricValue(campaignData, ['Messages Sent', 'Mensagens Enviadas'], dateFilter),
      visits: getMetricValue(campaignData, ['Profile Visits', 'Visitas a Perfil'], dateFilter),
      likes: getMetricValue(campaignData, ['Post Likes', 'Curtidas'], dateFilter),
      comments: getMetricValue(campaignData, ['Comments Done', 'Comentários'], dateFilter),
      positiveResponses: getMetricValue(campaignData, ['Positive Responses', 'Respostas Positivas'], dateFilter),
      meetings: getMetricValue(campaignData, ['Meetings', 'Reuniões Marcadas'], dateFilter),
      proposals: getMetricValue(campaignData, ['Proposals', 'Propostas'], dateFilter),
      sales: getMetricValue(campaignData, ['Sales', 'Vendas'], dateFilter)
    };

    const acceptanceRate = totals.invitations > 0 
      ? ((totals.connections / totals.invitations) * 100).toFixed(1)
      : '0.0';

    // Calculate financial totals from leads, filtered by date if provided
    let campaignLeads = getAllLeads().filter(l => leadBelongsToCampaign(l.campaign, campaignName));
    
    if (dateFilter?.from) {
      campaignLeads = campaignLeads.filter(lead => {
        if (!lead.connectionDate) return false;
        try {
          const leadDate = new Date(lead.connectionDate);
          return dateFilter.to
            ? isWithinInterval(leadDate, { start: dateFilter.from, end: dateFilter.to })
            : leadDate >= dateFilter.from;
        } catch (e) {
          return false;
        }
      });
    }
    
    const proposalValue = campaignLeads.reduce((sum, lead) => sum + (lead.proposalValue || 0), 0);
    const salesValue = campaignLeads.reduce((sum, lead) => sum + (lead.saleValue || 0), 0);

    return { ...totals, acceptanceRate, proposalValue, salesValue };
  };

  // Get data organized by week number for comparison
  const getWeekNumberComparisonData = () => {
    if (selectedCampaigns.length === 0) return [];
    
    // For each campaign, get their weeks and assign week numbers
    const campaignWeekNumbers = new Map<string, WeeklyData[]>();
    let maxWeeks = 0;
    
    selectedCampaigns.forEach(campaign => {
      const weeks = getWeeklyDataForCampaign(campaign);
      campaignWeekNumbers.set(campaign, weeks);
      maxWeeks = Math.max(maxWeeks, weeks.length);
    });
    
    // Create comparison data by week number
    const comparisonData = [];
    for (let weekNum = 1; weekNum <= maxWeeks; weekNum++) {
      const row: any = { 
        weekNumber: weekNum,
        weekLabel: `${weekNum}ª Semana`,
        week: `${weekNum}ª Semana` // Also add 'week' key for chart compatibility
      };
      
      selectedCampaigns.forEach(campaign => {
        const weeks = campaignWeekNumbers.get(campaign) || [];
        const weekData = weeks[weekNum - 1]; // 0-indexed
        
        if (weekData) {
          row[`${campaign}_invitations`] = weekData.invitations;
          row[`${campaign}_connections`] = weekData.connections;
          row[`${campaign}_messages`] = weekData.messages;
          row[`${campaign}_visits`] = weekData.visits;
          row[`${campaign}_positiveResponses`] = weekData.positiveResponses;
          row[`${campaign}_meetings`] = weekData.meetings;
          row[`${campaign}_status`] = weekData.activeDays; // Use _status for pivot table consistency
        } else {
          row[`${campaign}_invitations`] = 0;
          row[`${campaign}_connections`] = 0;
          row[`${campaign}_messages`] = 0;
          row[`${campaign}_visits`] = 0;
          row[`${campaign}_positiveResponses`] = 0;
          row[`${campaign}_meetings`] = 0;
          row[`${campaign}_status`] = 0;
        }
      });
      
      comparisonData.push(row);
    }
    
    return comparisonData;
  };

  const combinedData = getCombinedData();
  
  // Get pivot table data for all selected campaigns
  const getPivotTableData = () => {
    if (selectedCampaigns.length === 0) return [];
    
    if (granularity === 'daily') {
      const allDatesSet = new Set<string>();
      selectedCampaigns.forEach(campaign => {
        getDailyDataForCampaign(campaign).forEach(d => allDatesSet.add(d.date));
      });
      
      return Array.from(allDatesSet).sort().map(date => {
        // Formatar data apenas se estiver em formato YYYY-MM-DD válido
        let displayDate = date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          try {
            displayDate = format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR });
          } catch (error) {
            // Se falhar ao parsear, usar a data original
            displayDate = date;
          }
        }
        
        const row: any = { 
          date: displayDate,
          originalDate: date // Keep original for sorting/filtering
        };
        selectedCampaigns.forEach(campaign => {
          const dailyData = getDailyDataForCampaign(campaign);
          const campaignData = dailyData.find(d => d.date === date);
          row[`${campaign}_status`] = campaignData?.isActive ? 'Ativo' : 'Inativo';
          row[`${campaign}_invitations`] = campaignData?.invitations || 0;
          row[`${campaign}_connections`] = campaignData?.connections || 0;
          row[`${campaign}_messages`] = campaignData?.messages || 0;
          row[`${campaign}_positiveResponses`] = campaignData?.positiveResponses || 0;
        });
        return row;
      });
    } else {
      // Weekly view
      const allWeeksSet = new Set<string>();
      const weekDataMap = new Map<string, { week: string; startDate: string }>();
      
      selectedCampaigns.forEach(campaign => {
        getWeeklyDataForCampaign(campaign).forEach(w => {
          allWeeksSet.add(w.week);
          if (!weekDataMap.has(w.week)) {
            weekDataMap.set(w.week, { week: w.week, startDate: w.startDate });
          }
        });
      });
      
      return Array.from(allWeeksSet)
        .map(week => weekDataMap.get(week)!)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .map(({ week }) => {
          const row: any = { week };
          selectedCampaigns.forEach(campaign => {
            const campaignData = getWeeklyDataForCampaign(campaign).find(w => w.week === week);
            // Mostrar apenas o número de dias ativos (0-7) como status
            row[`${campaign}_status`] = campaignData ? campaignData.activeDays : 0;
            row[`${campaign}_invitations`] = campaignData?.invitations || 0;
            row[`${campaign}_connections`] = campaignData?.connections || 0;
            row[`${campaign}_messages`] = campaignData?.messages || 0;
            row[`${campaign}_positiveResponses`] = campaignData?.positiveResponses || 0;
            row[`${campaign}_meetings`] = campaignData?.meetings || 0;
          });
          return row;
        });
    }
  };

  // Prepare data for CampaignPivotTable
  const getCampaignPivotTableData = () => {
    return allCampaigns.map(campaignName => {
      const campaignData = campaignMetrics.filter(m => m.campaignName === campaignName);
      const campaignLeads = getAllLeads().filter(l => leadBelongsToCampaign(l.campaign, campaignName));
      const positiveLeads = campaignLeads.filter(l => getLeadResponseType(l) === 'positive');
      const negativeLeads = campaignLeads.filter(l => getLeadResponseType(l) === 'negative');

      let convites = 0, conexoes = 0, mensagens = 0, visitas = 0, likes = 0, comentarios = 0;
      let followUps1 = 0, followUps2 = 0, followUps3 = 0;
      
      // Use Set to track unique dates with activity (any metric > 0)
      const datesWithActivity = new Set<string>();
      // Track all dates to calculate period range properly
      const allDatesMap = new Map<string, number>(); // date -> total activity

      campaignData.forEach(metric => {
        Object.entries(metric.dailyData || {}).forEach(([date, value]) => {
          // Validate date format
          if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
          
          const numValue = Number(value) || 0;
          
          // Track total activity per date
          allDatesMap.set(date, (allDatesMap.get(date) || 0) + numValue);
          
          // Track dates with activity (value > 0) for active days count
          if (numValue > 0) {
            datesWithActivity.add(date);
          }
          
          if (['Connection Requests Sent', 'Convites Enviados'].includes(metric.eventType)) {
            convites += numValue;
          } else if (['Connection Requests Accepted', 'Conexões Realizadas', 'Connections Made'].includes(metric.eventType)) {
            conexoes += numValue;
          } else if (['Profile Visits', 'Visitas a Perfil'].includes(metric.eventType)) {
            visitas += numValue;
          } else if (['Post Likes', 'Curtidas'].includes(metric.eventType)) {
            likes += numValue;
          } else if (['Comments Done', 'Comentários'].includes(metric.eventType)) {
            comentarios += numValue;
          } else if (metric.eventType === 'Follow-Ups 1') {
            followUps1 += numValue;
          } else if (metric.eventType === 'Follow-Ups 2') {
            followUps2 += numValue;
          } else if (metric.eventType === 'Follow-Ups 3') {
            followUps3 += numValue;
          }
        });
      });

      mensagens = followUps1 + followUps2 + followUps3;
      
      // Start/End = first/last date where ANY metric value > 0
      const sortedActiveDates = Array.from(datesWithActivity).sort();
      const startDate = sortedActiveDates.length > 0 ? sortedActiveDates[0] : null;
      const endDate = sortedActiveDates.length > 0 ? sortedActiveDates[sortedActiveDates.length - 1] : null;
      
      // Active days = count of unique dates where any metric > 0
      const activeDays = sortedActiveDates.length;

      return {
        campaignName,
        startDate,
        endDate,
        activeDays,
        convitesEnviados: convites,
        conexoesRealizadas: conexoes,
        taxaAceite: convites > 0 ? ((conexoes / convites) * 100).toFixed(1) : '0.0',
        mensagensEnviadas: mensagens,
        visitas,
        likes,
        comentarios,
        totalAtividades: convites + conexoes + mensagens + visitas + likes + comentarios,
        respostasPositivas: positiveLeads.length,
        respostasNegativas: negativeLeads.length,
        leadsProcessados: campaignLeads.length,
        reunioes: positiveLeads.filter(l => l.meetingDate).length,
        propostas: positiveLeads.filter(l => l.proposalDate).length,
        vendas: positiveLeads.filter(l => l.saleDate).length,
      };
    });
  };

  const campaignPivotTableData = getCampaignPivotTableData();

  // Handler to update metric value in pivot table
  const handleMetricUpdate = async (campaignName: string, metricKey: string, value: number) => {
    // Map metric keys to event types for campaign metrics
    const metricToEventType: Record<string, string> = {
      convitesEnviados: 'Connection Requests Sent',
      conexoesRealizadas: 'Connection Requests Accepted',
      mensagensEnviadas: 'Messages Sent',
      visitas: 'Profile Visits',
      likes: 'Post Likes',
      comentarios: 'Comments Done',
    };

    const eventType = metricToEventType[metricKey];
    if (eventType) {
      // For campaign metrics, find the profile and update
      const metric = campaignMetrics.find(m => m.campaignName === campaignName && m.eventType === eventType);
      if (metric) {
        const today = format(new Date(), 'yyyy-MM-dd');
        await updateMetricValue(campaignName, eventType, metric.profileName, today, value);
        loadFromDatabase(selectedUserIds.length > 0 ? selectedUserIds : undefined);
      }
    }
  };

  // Handler to add new metric entry with date
  const handleAddMetricEntry = async (campaignName: string, metricKey: string, date: string, value: number) => {
    const metricToEventType: Record<string, string> = {
      convitesEnviados: 'Connection Requests Sent',
      conexoesRealizadas: 'Connection Requests Accepted',
      mensagensEnviadas: 'Messages Sent',
      visitas: 'Profile Visits',
      likes: 'Post Likes',
      comentarios: 'Comments Done',
    };

    const eventType = metricToEventType[metricKey];
    if (eventType) {
      const metric = campaignMetrics.find(m => m.campaignName === campaignName && m.eventType === eventType);
      if (metric) {
        await updateMetricValue(campaignName, eventType, metric.profileName, date, value);
        loadFromDatabase(selectedUserIds.length > 0 ? selectedUserIds : undefined);
      }
    }
  };
  
  // Determine which data to show based on calendar view
  const pivotData = calendarView === 'week-numbers' && selectedCampaigns.length > 1 && granularity === 'weekly'
    ? getWeekNumberComparisonData()
    : getPivotTableData();
  const totalPages = Math.ceil(pivotData.length / itemsPerPage);
  const paginatedData = pivotData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Carregando dados...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (allCampaigns.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Sem Dados de Campanhas</CardTitle>
            <CardDescription>
              Nenhuma campanha encontrada. Vá para Configurações e faça upload dos arquivos, depois clique em "Processar Todos os Arquivos".
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground">Análise detalhada e comparativa de campanhas</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Campaign Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campanhas Ativas</CardTitle>
              <CardDescription>Campanhas encontradas nos dados importados</CardDescription>
            </div>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                <SelectItem value="date-asc">Data (Antiga)</SelectItem>
                <SelectItem value="date-desc">Data (Recente)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allCampaigns.map(campaign => (
              <div key={campaign} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 group">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Checkbox
                    id={campaign}
                    checked={selectedCampaigns.includes(campaign)}
                    onCheckedChange={() => toggleCampaign(campaign)}
                  />
                  {editingCampaign === campaign ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input
                        ref={editInputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveCampaignName();
                          if (e.key === 'Escape') cancelEditingCampaign();
                        }}
                        className="h-7 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={saveCampaignName}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={cancelEditingCampaign}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Label 
                      htmlFor={campaign} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer truncate"
                      onDoubleClick={() => startEditingCampaign(campaign)}
                    >
                      {campaign}
                    </Label>
                  )}
                </div>
                {editingCampaign !== campaign && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      onClick={() => startEditingCampaign(campaign)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setCampaignToDelete(campaign);
                        setDeleteCampaignDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Pivot Table - All campaigns comparison */}
      <CampaignPivotTable 
        campaigns={campaignPivotTableData}
        editable={true}
        onMetricUpdate={handleMetricUpdate}
        onAddMetricEntry={handleAddMetricEntry}
        onDateUpdate={async (campaignName, field, value) => {
          if (field === 'startDate') {
            await updateCampaignDates(campaignName, value, undefined);
          } else {
            await updateCampaignDates(campaignName, undefined, value);
          }
        }}
      />

      {/* Campaign Details */}
      {selectedCampaigns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {selectedCampaigns.map(campaign => {
            const details = campaignsData[campaign];
            return (
              <CampaignDetailsCard 
                key={campaign} 
                campaign={campaign} 
                details={details}
                onUpdate={() => loadCampaignDetails()}
              />
            );
          })}
        </div>
      )}

      {/* Granularity and Calendar View Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Opções de Visualização</CardTitle>
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                if (!compareMode) {
                  setDateRange(undefined);
                } else {
                  setPeriod1Range(undefined);
                  setPeriod2Range(undefined);
                }
              }}
            >
              {compareMode ? 'Modo Simples' : 'Comparar Períodos'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Granularidade de Dados</Label>
              <Select value={granularity} onValueChange={(v) => setGranularity(v as 'daily' | 'weekly')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!compareMode ? (
              <div>
                <Label className="mb-2 block">Filtro de Período</Label>
                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                {dateRange && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 h-8 text-xs"
                    onClick={() => setDateRange(undefined)}
                  >
                    Limpar filtro
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="mb-2 block">Período 1</Label>
                  <DateRangePicker date={period1Range} onDateChange={setPeriod1Range} />
                </div>
                <div>
                  <Label className="mb-2 block">Período 2</Label>
                  <DateRangePicker date={period2Range} onDateChange={setPeriod2Range} />
                </div>
              </div>
            )}
          </div>
          
          {selectedCampaigns.length > 1 && granularity === 'weekly' && !compareMode && (
            <div>
              <Label className="mb-2 block">Visualização de Calendário</Label>
              <Select value={calendarView} onValueChange={(v) => setCalendarView(v as 'dates' | 'week-numbers')}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dates">Por Datas</SelectItem>
                  <SelectItem value="week-numbers">Por Número de Semana</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {calendarView === 'dates' 
                  ? 'Mostra as semanas com suas datas específicas' 
                  : 'Compara campanhas por posição da semana (1ª semana, 2ª semana, etc)'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCampaigns.length > 0 && (
        <>
          {/* Campaign Conversion Funnels */}
          {compareMode && period1Range?.from && period2Range?.from ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Comparação de Funil entre Períodos</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedCampaigns.map(campaign => {
                  const period1Summary = getCampaignSummary(campaign, period1Range);
                  const period2Summary = getCampaignSummary(campaign, period2Range);
                  return (
                    <CampaignFunnelComparison
                      key={campaign}
                      campaignName={campaign}
                      period1Data={period1Summary}
                      period2Data={period2Summary}
                      period1={period1Range}
                      period2={period2Range}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Funil de Conversão</h2>
                {dateRange?.from && (
                  <Badge variant="outline" className="text-sm">
                    {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                    {dateRange.to && ` - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`}
                  </Badge>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedCampaigns.map(campaign => {
                  const summary = getCampaignSummary(campaign, dateRange);
                  return (
                    <CampaignFunnelChart
                      key={campaign}
                      campaignName={campaign}
                      data={summary}
                    />
                  );
                })}
              </div>

            </div>
          )}

          {/* Campaign Summaries */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {selectedCampaigns.map(campaign => {
              const summary = getCampaignSummary(campaign);
              const leads = getAllLeads().filter(l => leadBelongsToCampaign(l.campaign, campaign));
              const proposalsCount = leads.filter(l => l.proposalDate).length;
              const salesCount = leads.filter(l => l.saleDate).length;
              
              return (
                <Card key={campaign}>
                  <CardHeader>
                    <CardTitle className="text-lg">{campaign}</CardTitle>
                    <CardDescription>Resumo Geral</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Convites</span>
                      <span className="font-bold">{summary.invitations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Conexões</span>
                      <span className="font-bold">{summary.connections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Mensagens</span>
                      <span className="font-bold">{summary.messages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Taxa Aceite</span>
                      <span className="font-bold">{summary.acceptanceRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Respostas +</span>
                      <span className="font-bold text-success">{summary.positiveResponses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Reuniões</span>
                      <span className="font-bold text-primary">{summary.meetings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Propostas</span>
                      <span className="font-bold text-orange-500">{proposalsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Vendas</span>
                      <span className="font-bold text-green-600">{salesCount}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Weekly Performance Chart */}
          {selectedCampaigns.length === 1 && (
            <WeeklyPerformanceChart
              campaignName={selectedCampaigns[0]}
              data={getWeeklyDataForCampaign(selectedCampaigns[0])}
            />
          )}

          {/* Charts */}
          <Tabs defaultValue="invitations" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="invitations">Convites</TabsTrigger>
              <TabsTrigger value="connections">Conexões</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
              <TabsTrigger value="visits">Visitas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="invitations">
              <Card>
                <CardHeader>
                  <CardTitle>Convites Enviados - {granularity === 'daily' ? 'Diário' : 'Semanal'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={combinedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey={granularity === 'daily' ? 'date' : 'week'} 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          color: 'hsl(var(--foreground))'
                        }} 
                      />
                      <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                      {selectedCampaigns.map((campaign, idx) => (
                        <Line
                          key={campaign}
                          type="monotone"
                          dataKey={`${campaign}_invitations`}
                          name={campaign}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={{ fill: colors[idx % colors.length], r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="connections">
              <Card>
                <CardHeader>
                  <CardTitle>Conexões Realizadas - {granularity === 'daily' ? 'Diário' : 'Semanal'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={combinedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey={granularity === 'daily' ? 'date' : 'week'} 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          color: 'hsl(var(--foreground))'
                        }} 
                      />
                      <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                      {selectedCampaigns.map((campaign, idx) => (
                        <Line
                          key={campaign}
                          type="monotone"
                          dataKey={`${campaign}_connections`}
                          name={campaign}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={{ fill: colors[idx % colors.length], r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <CardTitle>Mensagens Enviadas - {granularity === 'daily' ? 'Diário' : 'Semanal'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={combinedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey={granularity === 'daily' ? 'date' : 'week'} 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          color: 'hsl(var(--foreground))'
                        }} 
                      />
                      <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                      {selectedCampaigns.map((campaign, idx) => (
                        <Line
                          key={campaign}
                          type="monotone"
                          dataKey={`${campaign}_messages`}
                          name={campaign}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={{ fill: colors[idx % colors.length], r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visits">
              <Card>
                <CardHeader>
                  <CardTitle>Visitas ao Perfil - {granularity === 'daily' ? 'Diário' : 'Semanal'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={combinedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey={granularity === 'daily' ? 'date' : 'week'} 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          color: 'hsl(var(--foreground))'
                        }} 
                      />
                      <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                      {selectedCampaigns.map((campaign, idx) => (
                        <Line
                          key={campaign}
                          type="monotone"
                          dataKey={`${campaign}_visits`}
                          name={campaign}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={{ fill: colors[idx % colors.length], r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Pivot Table View */}
          <Card>
            <CardHeader>
              <CardTitle>
                Tabela Comparativa - {
                  calendarView === 'week-numbers' && selectedCampaigns.length > 1 && granularity === 'weekly'
                    ? 'Por Número de Semana'
                    : granularity === 'daily' ? 'Dados Diários' : 'Dados Semanais'
                }
              </CardTitle>
              <CardDescription>
                {calendarView === 'week-numbers' && selectedCampaigns.length > 1 && granularity === 'weekly'
                  ? 'Comparação de campanhas por posição da semana (1ª semana, 2ª semana, etc)'
                  : 'Visualização consolidada de todas as campanhas selecionadas'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-success" />
                  <span className="text-muted-foreground">Ativo (alguma métrica {'>'} 0)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/30" />
                  <span className="text-muted-foreground">Inativo (todas métricas = 0)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold text-xs">42 ★</span>
                  <span className="text-muted-foreground">Melhor performance (maior valor)</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                {(() => {
                  // Define metrics for rows
                  const metrics = granularity === 'daily' 
                    ? [
                        { key: 'status', label: 'Status' },
                        { key: 'invitations', label: 'Convites Enviados' },
                        { key: 'connections', label: 'Conexões Realizadas' },
                        { key: 'messages', label: 'Mensagens Enviadas' },
                        { key: 'positiveResponses', label: 'Respostas Positivas' },
                      ]
                    : [
                        { key: 'status', label: 'Dias Ativos' },
                        { key: 'invitations', label: 'Convites Enviados' },
                        { key: 'connections', label: 'Conexões Realizadas' },
                        { key: 'messages', label: 'Mensagens Enviadas' },
                        { key: 'positiveResponses', label: 'Respostas Positivas' },
                        { key: 'meetings', label: 'Reuniões' },
                      ];

                  // Calculate max values for highlighting best performance
                  const maxValues: Record<string, number> = {};
                  metrics.forEach(metric => {
                    if (metric.key === 'status') return;
                    selectedCampaigns.forEach(campaign => {
                      paginatedData.forEach(row => {
                        const value = row[`${campaign}_${metric.key}`] || 0;
                        const key = `${campaign}_${metric.key}`;
                        maxValues[key] = Math.max(maxValues[key] || 0, value);
                      });
                    });
                  });

                  const isBest = (campaign: string, metric: string, value: number) => {
                    return value > 0 && value === maxValues[`${campaign}_${metric}`];
                  };

                  return (
                    <table className="w-full border-collapse">
                      <thead>
                        {/* Campaign headers - one row per campaign when multiple */}
                        {selectedCampaigns.map((campaign, campIdx) => (
                          <React.Fragment key={campaign}>
                            {campIdx === 0 && (
                              <tr className="border-b-2 border-border">
                                <th className="text-left p-3 text-sm font-semibold sticky left-0 bg-card z-10 min-w-[180px]">
                                  {selectedCampaigns.length > 1 ? 'Campanha / Métrica' : 'Tipo de Dado'}
                                </th>
                                {paginatedData.map((row, idx) => (
                                  <th key={idx} className="text-center p-3 text-sm font-semibold border-l border-border min-w-[100px]">
                                    {calendarView === 'week-numbers' && selectedCampaigns.length > 1 && granularity === 'weekly'
                                      ? row.weekLabel
                                      : granularity === 'daily' ? row.date : row.week}
                                  </th>
                                ))}
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </thead>
                      <tbody>
                        {selectedCampaigns.map((campaign, campIdx) => (
                          <React.Fragment key={campaign}>
                            {/* Campaign name row when multiple campaigns */}
                            {selectedCampaigns.length > 1 && (
                              <tr className="bg-muted/50">
                                <td colSpan={paginatedData.length + 1} className="p-2 text-sm font-bold text-primary border-t-2 border-border">
                                  {campaign}
                                </td>
                              </tr>
                            )}
                            {/* Metric rows */}
                            {metrics.map((metric) => (
                              <tr key={`${campaign}-${metric.key}`} className="border-b border-border/50 hover:bg-muted/30">
                                <td className="p-2 text-sm font-medium sticky left-0 bg-card z-10">
                                  {metric.label}
                                </td>
                                {paginatedData.map((row, idx) => {
                                  const value = row[`${campaign}_${metric.key}`];
                                  
                                  if (metric.key === 'status') {
                                    const invitations = row[`${campaign}_invitations`] || 0;
                                    const connections = row[`${campaign}_connections`] || 0;
                                    const messages = row[`${campaign}_messages`] || 0;
                                    const isActive = granularity === 'daily' 
                                      ? (invitations > 0 || connections > 0 || messages > 0)
                                      : typeof value === 'number' && value > 0;
                                    
                                    return (
                                      <td key={idx} className="p-2 text-center border-l border-border">
                                        {granularity === 'daily' ? (
                                          <Badge 
                                            variant={isActive ? "default" : "secondary"} 
                                            className={`text-xs ${isActive ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}
                                          >
                                            {isActive ? '● Ativo' : '○ Inativo'}
                                          </Badge>
                                        ) : (
                                          <div className="flex items-center justify-center gap-1">
                                            <span className={`inline-block w-2 h-2 rounded-full ${value > 0 ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                                            <span className="text-sm font-medium">{value}/7</span>
                                          </div>
                                        )}
                                      </td>
                                    );
                                  }
                                  
                                  const numValue = value || 0;
                                  const best = isBest(campaign, metric.key, numValue);
                                  const isPositive = metric.key === 'positiveResponses';
                                  
                                  return (
                                    <td 
                                      key={idx} 
                                      className={`p-2 text-center text-sm border-l border-border ${
                                        numValue > 0 
                                          ? isPositive ? 'text-success' : '' 
                                          : 'text-muted-foreground'
                                      } ${best ? (isPositive ? 'bg-success/15 font-bold' : 'bg-primary/15 font-bold text-primary') : ''}`}
                                    >
                                      {numValue}
                                      {best && <span className="ml-1 text-xs">★</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages} ({pivotData.length} {granularity === 'daily' ? 'dias' : 'semanas'} no total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Options */}
          <ExportOptions 
            data={pivotData.map(row => {
              const exportRow: Record<string, any> = {
                [granularity === 'daily' ? 'Data' : 'Semana']: calendarView === 'week-numbers' && selectedCampaigns.length > 1 && granularity === 'weekly'
                  ? row.weekLabel
                  : granularity === 'daily' ? row.date : row.week
              };
              selectedCampaigns.forEach(campaign => {
                exportRow[`${campaign} - Status`] = row[`${campaign}_status`];
                exportRow[`${campaign} - Convites`] = row[`${campaign}_invitations`];
                exportRow[`${campaign} - Conexões`] = row[`${campaign}_connections`];
                exportRow[`${campaign} - Mensagens`] = row[`${campaign}_messages`];
                exportRow[`${campaign} - Resp. Positivas`] = row[`${campaign}_positiveResponses`];
                if (granularity === 'weekly') {
                  exportRow[`${campaign} - Reuniões`] = row[`${campaign}_meetings`];
                }
              });
              return exportRow;
            })}
            filename={`campanhas-${granularity}-${format(new Date(), 'yyyy-MM-dd')}`}
            campaignSummaries={selectedCampaigns.map(campaign => {
              const summary = getCampaignSummary(campaign);
              const leads = getAllLeads().filter(l => leadBelongsToCampaign(l.campaign, campaign));
              const proposalsCount = leads.filter(l => l.proposalDate).length;
              const salesCount = leads.filter(l => l.saleDate).length;
              const dailyData = getDailyDataForCampaign(campaign);
              
              // Calculate dates and active days from daily data
              const activeDates = dailyData
                .filter(d => d.invitations > 0 || d.connections > 0 || d.messages > 0 || d.visits > 0 || d.likes > 0 || d.comments > 0)
                .map(d => d.date)
                .sort();
              
              const startDate = activeDates.length > 0 ? activeDates[0] : undefined;
              const endDate = activeDates.length > 0 ? activeDates[activeDates.length - 1] : undefined;
              const activeDays = activeDates.length;
              
              return {
                name: campaign,
                invitations: summary.invitations,
                connections: summary.connections,
                messages: summary.messages,
                acceptanceRate: summary.acceptanceRate,
                positiveResponses: summary.positiveResponses,
                meetings: summary.meetings,
                proposals: proposalsCount,
                sales: salesCount,
                startDate,
                endDate,
                activeDays,
              };
            })}
          />
        </>
      )}

      {selectedCampaignDetails && (
        <CampaignDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          campaignName={selectedCampaignDetails.name}
          details={selectedCampaignDetails}
          onUpdate={loadCampaignDetails}
        />
      )}

      <CampaignDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateCampaign}
      />

      {campaignToDelete && (
        <DeleteCampaignDialog
          open={deleteCampaignDialogOpen}
          onOpenChange={setDeleteCampaignDialogOpen}
          campaignName={campaignToDelete}
          onDeleted={() => {
            loadFromDatabase(selectedUserIds.length > 0 ? selectedUserIds : undefined);
            loadCampaignDetails();
            setSelectedCampaigns(prev => prev.filter(c => c !== campaignToDelete));
            setCampaignToDelete(null);
          }}
        />
      )}
    </div>
  );
}
