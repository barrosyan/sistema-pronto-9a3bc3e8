import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCampaignData } from '@/hooks/useCampaignData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { CampaignDetailsDialog } from '@/components/CampaignDetailsDialog';
import { supabase } from '@/integrations/supabase/client';

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
  activeDays: number;
  totalDays: number;
}

export default function Campaigns() {
  const { campaignMetrics, getAllLeads, loadFromDatabase, isLoading } = useCampaignData();
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('weekly');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCampaignDetails, setSelectedCampaignDetails] = useState<any>(null);
  const [campaignsData, setCampaignsData] = useState<Record<string, any>>({});
  const [calendarView, setCalendarView] = useState<'dates' | 'week-numbers'>('dates');

  useEffect(() => {
    loadFromDatabase();
    loadCampaignDetails();
  }, [loadFromDatabase]);

  const loadCampaignDetails = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*');
    
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

  // Extract unique campaigns
  const allCampaigns = Array.from(new Set(campaignMetrics.map(m => m.campaignName).filter(Boolean)));

  useEffect(() => {
    if (allCampaigns.length > 0 && selectedCampaigns.length === 0) {
      setSelectedCampaigns([allCampaigns[0]]);
    }
  }, [allCampaigns]);

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
      Object.keys(metric.dailyData || {}).forEach(date => allDates.add(date));
    });

    return Array.from(allDates).sort().map(date => {
      const invitations = campaignData.find(m => m.eventType === 'Connection Requests Sent')?.dailyData?.[date] || 0;
      const connections = campaignData.find(m => m.eventType === 'Connection Requests Accepted')?.dailyData?.[date] || 0;
      const messages = campaignData.find(m => m.eventType === 'Messages Sent')?.dailyData?.[date] || 0;
      const visits = campaignData.find(m => m.eventType === 'Profile Visits')?.dailyData?.[date] || 0;
      const likes = campaignData.find(m => m.eventType === 'Post Likes')?.dailyData?.[date] || 0;
      const comments = campaignData.find(m => m.eventType === 'Comments Done')?.dailyData?.[date] || 0;

      const leads = getAllLeads().filter(l => l.campaign === campaignName);
      const positiveResponses = leads.filter(l => 
        l.status === 'positive' && l.positiveResponseDate === date
      ).length;

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
        isActive
      };
    });
  };

  const getWeeklyDataForCampaign = (campaignName: string): WeeklyData[] => {
    const dailyData = getDailyDataForCampaign(campaignName);
    const weeklyMap = new Map<string, WeeklyData>();

    dailyData.forEach(day => {
      const date = new Date(day.date);
      const weekStart = startOfWeek(date, { locale: ptBR });
      const weekEnd = endOfWeek(date, { locale: ptBR });
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          week: `Semana ${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`,
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
          activeDays: 0,
          totalDays: 0
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
      weekData.totalDays += 1;
      if (day.isActive) {
        weekData.activeDays += 1;
      }
    });

    const leads = getAllLeads().filter(l => l.campaign === campaignName);
    weeklyMap.forEach(weekData => {
      const weekLeads = leads.filter(l => {
        if (!l.meetingDate) return false;
        const meetingDate = new Date(l.meetingDate);
        return meetingDate >= new Date(weekData.startDate) && meetingDate <= new Date(weekData.endDate);
      });
      weekData.meetings = weekLeads.length;
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

  const getCampaignSummary = (campaignName: string) => {
    const weeklyData = getWeeklyDataForCampaign(campaignName);
    const totals = weeklyData.reduce((acc, week) => ({
      invitations: acc.invitations + week.invitations,
      connections: acc.connections + week.connections,
      messages: acc.messages + week.messages,
      visits: acc.visits + week.visits,
      likes: acc.likes + week.likes,
      comments: acc.comments + week.comments,
      positiveResponses: acc.positiveResponses + week.positiveResponses,
      meetings: acc.meetings + week.meetings
    }), {
      invitations: 0,
      connections: 0,
      messages: 0,
      visits: 0,
      likes: 0,
      comments: 0,
      positiveResponses: 0,
      meetings: 0
    });

    const acceptanceRate = totals.invitations > 0 
      ? ((totals.connections / totals.invitations) * 100).toFixed(1)
      : '0.0';

    return { ...totals, acceptanceRate };
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
        const row: any = { date };
        selectedCampaigns.forEach(campaign => {
          const campaignData = getDailyDataForCampaign(campaign).find(d => d.date === date);
          row[`${campaign}_status`] = campaignData?.isActive ? 'Ativo' : 'Inativo';
          row[`${campaign}_invitations`] = campaignData?.invitations || 0;
          row[`${campaign}_connections`] = campaignData?.connections || 0;
          row[`${campaign}_messages`] = campaignData?.messages || 0;
          row[`${campaign}_positiveResponses`] = campaignData?.positiveResponses || 0;
        });
        return row;
      });
    } else {
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
            row[`${campaign}_status`] = campaignData ? `${campaignData.activeDays}/${campaignData.totalDays}` : '0/0';
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
      <div>
        <h1 className="text-3xl font-bold">Campanhas</h1>
        <p className="text-muted-foreground">Análise detalhada e comparativa de campanhas</p>
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
              <Card key={campaign}>
                <CardHeader>
                  <CardTitle className="text-base">{campaign}</CardTitle>
                  <CardDescription>Detalhes da Campanha</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Empresa</p>
                    <p className="text-sm font-medium">{details?.company || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Perfil</p>
                    <p className="text-sm font-medium">{details?.profile || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Objetivo da Campanha</p>
                    <p className="text-sm font-medium">{details?.objective || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Cadência</p>
                    <p className="text-sm font-medium">{details?.cadence || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Cargos na Pesquisa</p>
                    <p className="text-sm font-medium">{details?.jobTitles || 'Não informado'}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Granularity and Calendar View Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Opções de Visualização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Granularidade de Dados</Label>
            <Select value={granularity} onValueChange={(v) => setGranularity(v as 'daily' | 'weekly')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {selectedCampaigns.length > 1 && granularity === 'weekly' && (
            <div>
              <Label className="mb-2 block">Visualização de Calendário</Label>
              <Select value={calendarView} onValueChange={(v) => setCalendarView(v as 'dates' | 'week-numbers')}>
                <SelectTrigger className="w-[250px]">
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
          {/* Campaign Summaries */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {selectedCampaigns.map(campaign => {
              const summary = getCampaignSummary(campaign);
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
                  </CardContent>
                </Card>
              );
            })}
          </div>

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
                            {calendarView === 'week-numbers' && selectedCampaigns.length > 1 && granularity === 'weekly' 
                              ? 'Dias Ativos' 
                              : 'Status'}
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
                          const activeDays = row[`${campaign}_activeDays`];
                          const isActive = granularity === 'daily' 
                            ? status === 'Ativo' 
                            : status && status !== '0/0';
                          
                          return (
                            <React.Fragment key={campaign}>
                              <td className="p-2 text-center border-l border-border">
                                {calendarView === 'week-numbers' && selectedCampaigns.length > 1 && granularity === 'weekly' ? (
                                  <span className="text-sm">{activeDays || 0}</span>
                                ) : granularity === 'daily' ? (
                                  <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                                    {status}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    {status} dias
                                  </Badge>
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
        />
      )}
    </div>
  );
}
