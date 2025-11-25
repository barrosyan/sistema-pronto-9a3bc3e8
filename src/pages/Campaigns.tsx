import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useProfileFilter } from '@/contexts/ProfileFilterContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Info, Plus } from 'lucide-react';
import { CampaignDetailsDialog } from '@/components/CampaignDetailsDialog';
import { CampaignDetailsCard } from '@/components/CampaignDetailsCard';
import { CampaignDialog } from '@/components/CampaignDialog';
import { CampaignFunnelChart } from '@/components/CampaignFunnelChart';
import { CampaignFunnelComparison } from '@/components/CampaignFunnelComparison';
import { WeeklyPerformanceChart } from '@/components/WeeklyPerformanceChart';
import { DateRangePicker } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { UploadManager } from '@/components/UploadManager';

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
  const { campaignMetrics, getAllLeads, loadFromDatabase, isLoading } = useCampaignData();
  const { selectedProfile } = useProfileFilter();
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

  useEffect(() => {
    loadFromDatabase();
    loadCampaignDetails();
  }, [loadFromDatabase]);

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

  // Extract unique campaigns - filter by selected profile
  const allCampaigns = Array.from(
    new Set(
      campaignMetrics
        .filter(m => !selectedProfile || m.profileName === selectedProfile)
        .map(m => m.campaignName)
        .filter(Boolean)
    )
  );

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
  }, [allCampaigns, selectedProfile]);

  const toggleCampaign = (campaign: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaign) 
        ? prev.filter(c => c !== campaign)
        : [...prev, campaign]
    );
    setCurrentPage(1); // Reset to first page when campaigns change
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

    return Array.from(allDates).sort().map(date => {
      const invitations = campaignData.find(m => m.eventType === 'Connection Requests Sent')?.dailyData?.[date] || 0;
      const connections = campaignData.find(m => m.eventType === 'Connections Made')?.dailyData?.[date] || 0;
      const messages = campaignData.find(m => m.eventType === 'Messages Sent')?.dailyData?.[date] || 0;
      const visits = campaignData.find(m => m.eventType === 'Profile Visits')?.dailyData?.[date] || 0;
      const likes = campaignData.find(m => m.eventType === 'Post Likes')?.dailyData?.[date] || 0;
      const comments = campaignData.find(m => m.eventType === 'Comments Done')?.dailyData?.[date] || 0;
      const positiveResponses = campaignData.find(m => m.eventType === 'Positive Responses')?.dailyData?.[date] || 0;
      const meetings = campaignData.find(m => m.eventType === 'Meetings')?.dailyData?.[date] || 0;

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

    const leads = getAllLeads().filter(l => l.campaign === campaignName);
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

  const getCampaignSummary = (campaignName: string, dateFilter?: DateRange) => {
    const campaignData = campaignMetrics.filter(m => m.campaignName === campaignName);
    
    // Filter metrics by date range if provided
    const filterMetricsByDate = (metric: any) => {
      if (!dateFilter?.from || !metric.dailyData) return metric.totalCount || 0;
      
      let filteredTotal = 0;
      Object.entries(metric.dailyData).forEach(([dateKey, value]) => {
        try {
          const metricDate = parseISO(dateKey);
          const isInRange = dateFilter.to
            ? isWithinInterval(metricDate, { start: dateFilter.from, end: dateFilter.to })
            : metricDate >= dateFilter.from;
          
          if (isInRange) {
            filteredTotal += Number(value);
          }
        } catch (e) {
          // Skip invalid dates
        }
      });
      
      return filteredTotal;
    };
    
    const totals = {
      invitations: dateFilter 
        ? filterMetricsByDate(campaignData.find(m => m.eventType === 'Connection Requests Sent'))
        : campaignData.find(m => m.eventType === 'Connection Requests Sent')?.totalCount || 0,
      connections: dateFilter
        ? filterMetricsByDate(campaignData.find(m => m.eventType === 'Connections Made'))
        : campaignData.find(m => m.eventType === 'Connections Made')?.totalCount || 0,
      messages: dateFilter
        ? filterMetricsByDate(campaignData.find(m => m.eventType === 'Messages Sent'))
        : campaignData.find(m => m.eventType === 'Messages Sent')?.totalCount || 0,
      visits: dateFilter
        ? filterMetricsByDate(campaignData.find(m => m.eventType === 'Profile Visits'))
        : campaignData.find(m => m.eventType === 'Profile Visits')?.totalCount || 0,
      likes: dateFilter
        ? filterMetricsByDate(campaignData.find(m => m.eventType === 'Post Likes'))
        : campaignData.find(m => m.eventType === 'Post Likes')?.totalCount || 0,
      comments: dateFilter
        ? filterMetricsByDate(campaignData.find(m => m.eventType === 'Comments Done'))
        : campaignData.find(m => m.eventType === 'Comments Done')?.totalCount || 0,
      positiveResponses: dateFilter
        ? filterMetricsByDate(campaignData.find(m => m.eventType === 'Positive Responses'))
        : campaignData.find(m => m.eventType === 'Positive Responses')?.totalCount || 0,
      meetings: dateFilter
        ? filterMetricsByDate(campaignData.find(m => m.eventType === 'Meetings'))
        : campaignData.find(m => m.eventType === 'Meetings')?.totalCount || 0,
      proposals: dateFilter
        ? filterMetricsByDate(campaignData.find(m => m.eventType === 'Proposals'))
        : campaignData.find(m => m.eventType === 'Proposals')?.totalCount || 0,
      sales: dateFilter
        ? filterMetricsByDate(campaignData.find(m => m.eventType === 'Sales'))
        : campaignData.find(m => m.eventType === 'Sales')?.totalCount || 0
    };

    const acceptanceRate = totals.invitations > 0 
      ? ((totals.connections / totals.invitations) * 100).toFixed(1)
      : '0.0';

    // Calculate financial totals from leads, filtered by date if provided
    let campaignLeads = getAllLeads().filter(l => l.campaign === campaignName);
    
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
        weekLabel: `${weekNum}ª Semana`
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
          row[`${campaign}_activeDays`] = weekData.activeDays;
        } else {
          row[`${campaign}_invitations`] = 0;
          row[`${campaign}_connections`] = 0;
          row[`${campaign}_messages`] = 0;
          row[`${campaign}_visits`] = 0;
          row[`${campaign}_positiveResponses`] = 0;
          row[`${campaign}_meetings`] = 0;
          row[`${campaign}_activeDays`] = 0;
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
      <UploadManager />
      
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
          <CardTitle>Campanhas Ativas</CardTitle>
          <CardDescription>Campanhas encontradas nos dados importados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allCampaigns.map(campaign => (
              <div key={campaign} className="flex items-center space-x-2">
                <Checkbox
                  id={campaign}
                  checked={selectedCampaigns.includes(campaign)}
                  onCheckedChange={() => toggleCampaign(campaign)}
                />
                <Label htmlFor={campaign} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {campaign}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
              const leads = getAllLeads().filter(l => l.campaign === campaign);
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
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left p-3 text-sm font-semibold sticky left-0 bg-card z-10">
                        {calendarView === 'week-numbers' && selectedCampaigns.length > 1 && granularity === 'weekly'
                          ? 'Semana'
                          : granularity === 'daily' ? 'Data' : 'Semana'}
                      </th>
                      {selectedCampaigns.map(campaign => (
                        <th key={campaign} colSpan={granularity === 'daily' ? 5 : 6} className="text-center p-3 text-sm font-semibold border-l border-border">
                          {campaign}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-2 text-xs font-medium sticky left-0 bg-muted/50 z-10"></th>
                      {selectedCampaigns.map(campaign => (
                        <React.Fragment key={campaign}>
                          <th className="text-center p-2 text-xs font-medium border-l border-border">
                            {granularity === 'daily' ? 'Status' : 'Dias Ativos'}
                          </th>
                          <th className="text-center p-2 text-xs font-medium">Convites</th>
                          <th className="text-center p-2 text-xs font-medium">Conexões</th>
                          <th className="text-center p-2 text-xs font-medium">Mensagens</th>
                          <th className="text-center p-2 text-xs font-medium">Resp. +</th>
                          {granularity === 'weekly' && <th className="text-center p-2 text-xs font-medium">Reuniões</th>}
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-2 text-sm font-medium sticky left-0 bg-card z-10">
                          {calendarView === 'week-numbers' && selectedCampaigns.length > 1 && granularity === 'weekly'
                            ? row.weekLabel
                            : granularity === 'daily' ? row.date : row.week}
                        </td>
                        {selectedCampaigns.map(campaign => {
                          const status = row[`${campaign}_status`];
                          const isActive = granularity === 'daily' 
                            ? status === 'Ativo' 
                            : typeof status === 'number' && status > 0;
                          
                          return (
                            <React.Fragment key={campaign}>
                              <td className="p-2 text-center border-l border-border">
                                {granularity === 'daily' ? (
                                  <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                                    {status}
                                  </Badge>
                                ) : (
                                  <span className="text-sm font-medium">{status}</span>
                                )}
                              </td>
                              <td className="p-2 text-center text-sm">{row[`${campaign}_invitations`]}</td>
                              <td className="p-2 text-center text-sm">{row[`${campaign}_connections`]}</td>
                              <td className="p-2 text-center text-sm">{row[`${campaign}_messages`]}</td>
                              <td className="p-2 text-center text-sm">{row[`${campaign}_positiveResponses`]}</td>
                              {granularity === 'weekly' && (
                                <td className="p-2 text-center text-sm">{row[`${campaign}_meetings`]}</td>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    </div>
  );
}
