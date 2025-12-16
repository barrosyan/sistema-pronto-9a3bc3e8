import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useProfileFilter } from '@/contexts/ProfileFilterContext';
import { useAdminUser } from '@/contexts/AdminUserContext';
import { Separator } from '@/components/ui/separator';
import { ExportOptions } from '@/components/ExportOptions';
import { ProfileComparison } from '@/components/ProfileComparison';
import { WeeklyProfileView } from '@/components/WeeklyProfileView';
import { WeeklyComparisonTable } from '@/components/WeeklyComparisonTable';
import { CampaignPivotTable } from '@/components/CampaignPivotTable';
import { WeeklyPivotTable } from '@/components/WeeklyPivotTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';

// Helper function to normalize campaign names for matching
const normalizeCampaignName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+all\s*leads\.?csv$/i, '')
    .replace(/\s+all\s*leads$/i, '')
    .replace(/\.csv$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper function to check if a lead belongs to a campaign (fuzzy matching)
const leadBelongsToCampaign = (leadCampaign: string, campaignName: string): boolean => {
  const normalizedLead = normalizeCampaignName(leadCampaign);
  const normalizedCampaign = normalizeCampaignName(campaignName);
  
  // Exact match after normalization
  if (normalizedLead === normalizedCampaign) return true;
  
  // One contains the other
  if (normalizedLead.includes(normalizedCampaign) || normalizedCampaign.includes(normalizedLead)) return true;
  
  return false;
};

// Helper function to classify lead response type based on status and comments fields
const getLeadResponseType = (lead: any): 'positive' | 'negative' | 'pending' => {
  // Check explicit status first
  if (lead.status === 'positive') return 'positive';
  if (lead.status === 'negative') return 'negative';
  
  // Check follow-up comments for response classification (hybrid CSV format)
  const commentsToCheck = [
    lead.followUp1Comments || lead.follow_up_1_comments,
    lead.followUp2Comments || lead.follow_up_2_comments,
    lead.followUp3Comments || lead.follow_up_3_comments,
    lead.followUp4Comments || lead.follow_up_4_comments,
    lead.comments,
    lead.statusDetails || lead.status_details
  ].filter(Boolean);
  
  for (const comment of commentsToCheck) {
    const normalized = comment.toLowerCase().trim();
    // Check for positive indicators
    if (normalized.includes('positiv') || normalized === 'sim' || normalized === 'yes' || normalized.includes('resposta: positiva')) {
      return 'positive';
    }
    // Check for negative indicators
    if (normalized.includes('negativ') || normalized === 'não' || normalized === 'nao' || normalized === 'no' || normalized.includes('resposta: negativa')) {
      return 'negative';
    }
  }
  
  // Check positive/negative response dates
  if (lead.positiveResponseDate || lead.positive_response_date) return 'positive';
  if (lead.negativeResponseDate || lead.negative_response_date) return 'negative';
  
  return 'pending';
};

export default function Profile() {
  const { campaignMetrics, getAllLeads, loadFromDatabase, isLoading, updateMetricValue } = useCampaignData();
  const { selectedProfiles, availableProfiles } = useProfileFilter();
  const { selectedUserIds } = useAdminUser();
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');

  useEffect(() => {
    loadFromDatabase(selectedUserIds.length > 0 ? selectedUserIds : undefined);
  }, [loadFromDatabase, selectedUserIds]);

  // Extract unique campaigns from database - filter by selected profiles
  const uniqueCampaigns = Array.from(
    new Set(
      campaignMetrics
        .filter(m => selectedProfiles.length === 0 || selectedProfiles.includes(m.profileName))
        .map(m => m.campaignName)
        .filter(Boolean)
    )
  );

  // Filter metrics and leads based on selected campaign AND selected profiles
  const filteredMetrics = campaignMetrics.filter(m => {
    const matchesProfile = selectedProfiles.length === 0 || selectedProfiles.includes(m.profileName);
    const matchesCampaign = selectedCampaign === 'all' || m.campaignName === selectedCampaign;
    return matchesProfile && matchesCampaign;
  });
  
  const allLeads = getAllLeads();
  const filteredLeads = selectedCampaign === 'all'
    ? allLeads
    : allLeads.filter(l => leadBelongsToCampaign(l.campaign, selectedCampaign));

  // Reset selected campaign when profiles change if it's not available
  useEffect(() => {
    if (selectedCampaign !== 'all' && !uniqueCampaigns.includes(selectedCampaign)) {
      setSelectedCampaign('all');
    }
  }, [selectedProfiles, uniqueCampaigns, selectedCampaign]);

  // Calculate date range from metrics
  // Start = first date with any value > 0
  // End = last date with any value > 0
  // Active days = dates between start-end with any value > 0
  const getDateRange = () => {
    const datesWithActivity: string[] = [];
    const allDatesInData: Set<string> = new Set();
    
    filteredMetrics.forEach(metric => {
      Object.entries(metric.dailyData || {}).forEach(([date, value]) => {
        if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
          allDatesInData.add(date);
          if (value > 0) {
            datesWithActivity.push(date);
          }
        }
      });
    });
    
    const sortedActiveDates = [...new Set(datesWithActivity)].sort();
    const startDate = sortedActiveDates.length > 0 ? sortedActiveDates[0] : null;
    const endDate = sortedActiveDates.length > 0 ? sortedActiveDates[sortedActiveDates.length - 1] : null;
    
    // Count active days between start and end
    const activeDays = sortedActiveDates.length;
    
    return { startDate, endDate, activeDays };
  };

  const dateRange = getDateRange();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Calculate consolidated metrics from filtered campaigns
  const calculateMetrics = () => {
    const totals = {
      convitesEnviados: 0,
      conexoesRealizadas: 0,
      mensagensEnviadas: 0,
      visitas: 0,
      likes: 0,
      comentarios: 0,
      followUps1: 0,
      followUps2: 0,
      followUps3: 0
    };

    // Event type mappings (PT and EN)
    const eventMappings: Record<string, keyof typeof totals> = {
      'Connection Requests Sent': 'convitesEnviados',
      'Convites Enviados': 'convitesEnviados',
      'Connection Requests Accepted': 'conexoesRealizadas',
      'Conexões Realizadas': 'conexoesRealizadas',
      'Connections Made': 'conexoesRealizadas',
      'Messages Sent': 'mensagensEnviadas',
      'Mensagens Enviadas': 'mensagensEnviadas',
      'Profile Visits': 'visitas',
      'Visitas a Perfil': 'visitas',
      'Post Likes': 'likes',
      'Curtidas': 'likes',
      'Comments Done': 'comentarios',
      'Comentários': 'comentarios',
      'Follow-Ups 1': 'followUps1',
      'Follow-Ups 2': 'followUps2',
      'Follow-Ups 3': 'followUps3',
    };

    filteredMetrics.forEach(metric => {
      const targetKey = eventMappings[metric.eventType];
      if (targetKey) {
        Object.values(metric.dailyData || {}).forEach(value => {
          totals[targetKey] += value;
        });
      }
    });

    // Calculate messages from follow-ups (if follow-ups exist, use them; otherwise use mensagensEnviadas)
    const followUpsTotal = totals.followUps1 + totals.followUps2 + totals.followUps3;
    if (followUpsTotal > 0) {
      totals.mensagensEnviadas = followUpsTotal;
    }

    const positiveLeads = filteredLeads.filter(l => getLeadResponseType(l) === 'positive');
    const negativeLeads = filteredLeads.filter(l => getLeadResponseType(l) === 'negative');
    const reunioes = positiveLeads.filter(l => l.meetingDate).length;
    const propostas = positiveLeads.filter(l => l.proposalDate).length;
    const vendas = positiveLeads.filter(l => l.saleDate).length;

    const taxaAceite = totals.convitesEnviados > 0 
      ? ((totals.conexoesRealizadas / totals.convitesEnviados) * 100).toFixed(1)
      : '0.0';

    return {
      ...totals,
      respostasPositivas: positiveLeads.length,
      reunioes,
      propostas,
      vendas,
      taxaAceite,
      totalAtividades: totals.convitesEnviados + totals.conexoesRealizadas + totals.mensagensEnviadas + 
                       totals.visitas + totals.likes + totals.comentarios
    };
  };

  const metrics = calculateMetrics();

  // Calculate conversion rates
  const conversionRates = {
    respostasPositivasConvitesEnviados: metrics.convitesEnviados > 0 
      ? ((metrics.respostasPositivas / metrics.convitesEnviados) * 100).toFixed(1) 
      : '0.0',
    respostasPositivasConexoesRealizadas: metrics.conexoesRealizadas > 0 
      ? ((metrics.respostasPositivas / metrics.conexoesRealizadas) * 100).toFixed(1)
      : '0.0',
    respostasPositivasMensagensEnviadas: metrics.mensagensEnviadas > 0 
      ? ((metrics.respostasPositivas / metrics.mensagensEnviadas) * 100).toFixed(1)
      : '0.0',
    numeroDeReunioesRespostasPositivas: metrics.respostasPositivas > 0 
      ? ((metrics.reunioes / metrics.respostasPositivas) * 100).toFixed(1)
      : '0.0',
    numeroDeReunioesConvitesEnviados: metrics.convitesEnviados > 0 
      ? ((metrics.reunioes / metrics.convitesEnviados) * 100).toFixed(1)
      : '0.0'
  };

  // Get data for campaigns side by side
  const getCampaignsSideBySide = () => {
    return uniqueCampaigns.map(campaignName => {
      const campaignMetricsData = campaignMetrics.filter(m => 
        m.campaignName === campaignName && 
        (selectedProfiles.length === 0 || selectedProfiles.includes(m.profileName))
      );
      
      const campaignLeads = allLeads.filter(l => leadBelongsToCampaign(l.campaign, campaignName));
      const positiveLeads = campaignLeads.filter(l => getLeadResponseType(l) === 'positive');

      // Get profile for this campaign
      const profile = campaignMetricsData[0]?.profileName || '-';

      // Calculate totals - use Set to track dates with activity (value > 0)
      let convites = 0, conexoes = 0, mensagens = 0, visitas = 0;
      let followUps1 = 0, followUps2 = 0, followUps3 = 0;
      const datesWithActivity = new Set<string>();

      campaignMetricsData.forEach(metric => {
        Object.entries(metric.dailyData || {}).forEach(([date, value]) => {
          if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
          
          const numValue = Number(value) || 0;
          
          // Track dates with activity (value > 0)
          if (numValue > 0) {
            datesWithActivity.add(date);
          }
          
          if (['Connection Requests Sent', 'Convites Enviados'].includes(metric.eventType)) {
            convites += numValue;
          } else if (['Connection Requests Accepted', 'Conexões Realizadas', 'Connections Made'].includes(metric.eventType)) {
            conexoes += numValue;
          } else if (['Profile Visits', 'Visitas a Perfil'].includes(metric.eventType)) {
            visitas += numValue;
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

      return {
        name: campaignName,
        profile,
        startDate: sortedActiveDates[0] || null,
        endDate: sortedActiveDates[sortedActiveDates.length - 1] || null,
        convites,
        conexoes,
        mensagens,
        visitas,
        taxaAceite: convites > 0 ? ((conexoes / convites) * 100).toFixed(1) : '0.0',
        respostasPositivas: positiveLeads.length,
        reunioes: positiveLeads.filter(l => l.meetingDate).length,
        propostas: positiveLeads.filter(l => l.proposalDate).length,
        vendas: positiveLeads.filter(l => l.saleDate).length,
      };
    });
  };

  const campaignsSideBySide = getCampaignsSideBySide();

  // Prepare data for CampaignPivotTable
  const getCampaignPivotData = () => {
    return uniqueCampaigns.map(campaignName => {
      const campaignMetricsData = campaignMetrics.filter(m => 
        m.campaignName === campaignName && 
        (selectedProfiles.length === 0 || selectedProfiles.includes(m.profileName))
      );
      
      const campaignLeads = allLeads.filter(l => leadBelongsToCampaign(l.campaign, campaignName));
      const positiveLeads = campaignLeads.filter(l => getLeadResponseType(l) === 'positive');
      const negativeLeads = campaignLeads.filter(l => getLeadResponseType(l) === 'negative');

      let convites = 0, conexoes = 0, mensagens = 0, visitas = 0, likes = 0, comentarios = 0;
      let followUps1 = 0, followUps2 = 0, followUps3 = 0;
      
      // Use Set to track unique dates with activity (any metric > 0)
      const datesWithActivity = new Set<string>();

      campaignMetricsData.forEach(metric => {
        Object.entries(metric.dailyData || {}).forEach(([date, value]) => {
          if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
          
          const numValue = Number(value) || 0;
          
          // Track dates with activity (value > 0)
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
      const activeDays = sortedActiveDates.length;

      return {
        campaignName,
        startDate: sortedActiveDates[0] || null,
        endDate: sortedActiveDates[sortedActiveDates.length - 1] || null,
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

  // Prepare data for WeeklyPivotTable
  const getWeeklyPivotData = () => {
    const weeklyMap = new Map<string, any>();

    filteredMetrics.forEach(metric => {
      Object.entries(metric.dailyData || {}).forEach(([date, value]) => {
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
        
        const numValue = Number(value) || 0;
        const dateObj = parseISO(date);
        const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(dateObj, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, {
            weekNumber: 0,
            startDate: format(weekStart, 'yyyy-MM-dd'),
            endDate: format(weekEnd, 'yyyy-MM-dd'),
            activeCampaigns: new Set<string>(),
            activeDays: new Set<string>(),
            convitesEnviados: 0,
            conexoesRealizadas: 0,
            mensagensEnviadas: 0,
            visitas: 0,
            likes: 0,
            comentarios: 0,
            followUps1: 0,
            followUps2: 0,
            followUps3: 0,
            respostasPositivas: 0,
            leadsProcessados: 0,
            reunioes: 0,
            propostas: 0,
            vendas: 0,
          });
        }

        const weekData = weeklyMap.get(weekKey);
        
        // Only count as active if value > 0
        if (numValue > 0) {
          weekData.activeCampaigns.add(metric.campaignName);
          weekData.activeDays.add(date);
        }

        if (['Connection Requests Sent', 'Convites Enviados'].includes(metric.eventType)) {
          weekData.convitesEnviados += numValue;
        } else if (['Connection Requests Accepted', 'Conexões Realizadas', 'Connections Made'].includes(metric.eventType)) {
          weekData.conexoesRealizadas += numValue;
        } else if (['Profile Visits', 'Visitas a Perfil'].includes(metric.eventType)) {
          weekData.visitas += numValue;
        } else if (['Post Likes', 'Curtidas'].includes(metric.eventType)) {
          weekData.likes += numValue;
        } else if (['Comments Done', 'Comentários'].includes(metric.eventType)) {
          weekData.comentarios += numValue;
        } else if (metric.eventType === 'Follow-Ups 1') {
          weekData.followUps1 += numValue;
        } else if (metric.eventType === 'Follow-Ups 2') {
          weekData.followUps2 += numValue;
        } else if (metric.eventType === 'Follow-Ups 3') {
          weekData.followUps3 += numValue;
        }
      });
    });

    // Convert map to array and assign week numbers
    const sortedWeeks = Array.from(weeklyMap.values())
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    return sortedWeeks.map((week, index) => ({
      weekNumber: index + 1,
      startDate: week.startDate,
      endDate: week.endDate,
      activeCampaigns: Array.from(week.activeCampaigns) as string[],
      activeDays: week.activeDays.size,
      convitesEnviados: week.convitesEnviados,
      conexoesRealizadas: week.conexoesRealizadas,
      taxaAceite: week.convitesEnviados > 0 
        ? ((week.conexoesRealizadas / week.convitesEnviados) * 100).toFixed(1)
        : '0.0',
      mensagensEnviadas: week.followUps1 + week.followUps2 + week.followUps3,
      visitas: week.visitas,
      likes: week.likes,
      comentarios: week.comentarios,
      totalAtividades: week.convitesEnviados + week.conexoesRealizadas + 
        (week.followUps1 + week.followUps2 + week.followUps3) + 
        week.visitas + week.likes + week.comentarios,
      respostasPositivas: 0, // Would need leads filtering by date
      leadsProcessados: 0,
      reunioes: 0,
      propostas: 0,
      vendas: 0,
    }));
  };

  const campaignPivotData = getCampaignPivotData();

  // Handler to update metric value in pivot table
  const handleMetricUpdate = async (campaignName: string, metricKey: string, value: number) => {
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

  const weeklyPivotData = getWeeklyPivotData();

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

  if (uniqueCampaigns.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Sem Dados de Campanhas</CardTitle>
            <CardDescription>
              Nenhuma campanha encontrada. Vá para Settings e faça upload dos arquivos, depois clique em "Processar Todos os Arquivos".
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Perfil de Campanhas</h1>
          <p className="text-muted-foreground">Análise detalhada de performance e métricas</p>
        </div>
        
        {/* Filtro de Campanha */}
        <div className="w-64">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Filtrar por campanha" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">Todas as Campanhas</SelectItem>
              {uniqueCampaigns.map(campaign => (
                <SelectItem key={campaign} value={campaign}>
                  {campaign}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Range Info */}
      {dateRange.startDate && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <div>
                  <span className="text-sm text-muted-foreground">Período de Atividade:</span>
                  <span className="ml-2 font-medium">
                    {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
                  </span>
                </div>
              </div>
              <Badge variant="outline">
                {dateRange.activeDays} dias de dados
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pivot-campaign" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pivot-campaign">Pivot Campanhas</TabsTrigger>
          <TabsTrigger value="pivot-weekly">Pivot Semanal</TabsTrigger>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sidebyside">Lado a Lado</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
          <TabsTrigger value="weekly">Semanal</TabsTrigger>
        </TabsList>

        <TabsContent value="pivot-campaign" className="space-y-6">
          <CampaignPivotTable 
            campaigns={campaignPivotData}
            editable={true}
            onMetricUpdate={handleMetricUpdate}
            onAddMetricEntry={handleAddMetricEntry}
          />
        </TabsContent>

        <TabsContent value="pivot-weekly" className="space-y-6">
          <WeeklyPivotTable weeks={weeklyPivotData} />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          {/* Campanhas Ativas */}
          <Card>
            <CardHeader>
              <CardTitle>Campanhas Ativas</CardTitle>
              <CardDescription>Campanhas encontradas nos dados importados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {uniqueCampaigns.map(campaign => (
                  <span key={campaign} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    {campaign}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Métricas Consolidadas */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas Gerais</CardTitle>
              <CardDescription>
                {selectedCampaign === 'all' 
                  ? 'Totais consolidados de todas as campanhas' 
                  : `Métricas da campanha: ${selectedCampaign}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Convites Enviados</p>
                  <p className="text-2xl font-bold">{metrics.convitesEnviados}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Conexões Realizadas</p>
                  <p className="text-2xl font-bold">{metrics.conexoesRealizadas}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                  <p className="text-2xl font-bold">{metrics.mensagensEnviadas}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Taxa de Aceite</p>
                  <p className="text-2xl font-bold">{metrics.taxaAceite}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Visitas</p>
                  <p className="text-2xl font-bold">{metrics.visitas}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Likes</p>
                  <p className="text-2xl font-bold">{metrics.likes}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Comentários</p>
                  <p className="text-2xl font-bold">{metrics.comentarios}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Atividades</p>
                  <p className="text-2xl font-bold">{metrics.totalAtividades}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Resultados de Leads */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados de Leads</CardTitle>
              <CardDescription>Performance do pipeline de vendas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Respostas Positivas</p>
                  <p className="text-2xl font-bold text-success">{metrics.respostasPositivas}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Reuniões</p>
                  <p className="text-2xl font-bold text-primary">{metrics.reunioes}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Propostas</p>
                  <p className="text-2xl font-bold text-warning">{metrics.propostas}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Vendas</p>
                  <p className="text-2xl font-bold text-success">{metrics.vendas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Taxas de Conversão */}
          <Card>
            <CardHeader>
              <CardTitle>Taxas de Conversão</CardTitle>
              <CardDescription>Performance em cada etapa do funil</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Respostas Positivas / Convites Enviados</span>
                  <span className="font-bold">{conversionRates.respostasPositivasConvitesEnviados}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Respostas Positivas / Conexões Realizadas</span>
                  <span className="font-bold">{conversionRates.respostasPositivasConexoesRealizadas}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Respostas Positivas / Mensagens Enviadas</span>
                  <span className="font-bold">{conversionRates.respostasPositivasMensagensEnviadas}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Reuniões / Respostas Positivas</span>
                  <span className="font-bold">{conversionRates.numeroDeReunioesRespostasPositivas}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Reuniões / Convites Enviados</span>
                  <span className="font-bold">{conversionRates.numeroDeReunioesConvitesEnviados}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sidebyside" className="space-y-6">
          {/* Campanhas Lado a Lado */}
          <Card>
            <CardHeader>
              <CardTitle>Campanhas Lado a Lado</CardTitle>
              <CardDescription>Visualize todas as campanhas e seus perfis de forma comparativa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left p-3 font-semibold sticky left-0 bg-card z-10">Métrica</th>
                      {campaignsSideBySide.map(campaign => (
                        <th key={campaign.name} className="text-center p-3 font-semibold border-l border-border min-w-[150px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold truncate max-w-[140px]">{campaign.name}</span>
                            <Badge variant="outline" className="text-xs">{campaign.profile}</Badge>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-card z-10">Data Início</td>
                      {campaignsSideBySide.map(campaign => (
                        <td key={campaign.name} className="p-3 text-center border-l border-border">
                          {formatDate(campaign.startDate)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-card z-10">Data Fim</td>
                      {campaignsSideBySide.map(campaign => (
                        <td key={campaign.name} className="p-3 text-center border-l border-border">
                          {formatDate(campaign.endDate)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-card z-10">Convites Enviados</td>
                      {campaignsSideBySide.map(campaign => (
                        <td key={campaign.name} className="p-3 text-center font-bold border-l border-border">
                          {campaign.convites}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-card z-10">Conexões Realizadas</td>
                      {campaignsSideBySide.map(campaign => (
                        <td key={campaign.name} className="p-3 text-center font-bold border-l border-border">
                          {campaign.conexoes}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-card z-10">Mensagens Enviadas</td>
                      {campaignsSideBySide.map(campaign => (
                        <td key={campaign.name} className="p-3 text-center font-bold border-l border-border">
                          {campaign.mensagens}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-card z-10">Taxa de Aceite</td>
                      {campaignsSideBySide.map(campaign => (
                        <td key={campaign.name} className="p-3 text-center font-bold border-l border-border">
                          {campaign.taxaAceite}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-card z-10">Visitas</td>
                      {campaignsSideBySide.map(campaign => (
                        <td key={campaign.name} className="p-3 text-center font-bold border-l border-border">
                          {campaign.visitas}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-card z-10">Respostas Positivas</td>
                      {campaignsSideBySide.map(campaign => (
                        <td key={campaign.name} className="p-3 text-center font-bold text-success border-l border-border">
                          {campaign.respostasPositivas}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-card z-10">Reuniões</td>
                      {campaignsSideBySide.map(campaign => (
                        <td key={campaign.name} className="p-3 text-center font-bold text-primary border-l border-border">
                          {campaign.reunioes}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-card z-10">Propostas</td>
                      {campaignsSideBySide.map(campaign => (
                        <td key={campaign.name} className="p-3 text-center font-bold border-l border-border">
                          {campaign.propostas}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-card z-10">Vendas</td>
                      {campaignsSideBySide.map(campaign => (
                        <td key={campaign.name} className="p-3 text-center font-bold text-success border-l border-border">
                          {campaign.vendas}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <ProfileComparison 
            campaignMetrics={campaignMetrics}
            leads={allLeads}
            profiles={availableProfiles}
            campaigns={uniqueCampaigns}
          />
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          <WeeklyProfileView 
            campaignMetrics={filteredMetrics}
            profiles={availableProfiles}
            campaigns={uniqueCampaigns}
          />
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Export Options */}
      <ExportOptions 
        data={[{
          Campanha: selectedCampaign === 'all' ? 'Todas' : selectedCampaign,
          Perfil: selectedProfiles.length > 0 ? selectedProfiles.join(', ') : 'Todos',
          'Data Início': formatDate(dateRange.startDate),
          'Data Fim': formatDate(dateRange.endDate),
          'Dias Ativos': dateRange.activeDays,
          'Convites Enviados': metrics.convitesEnviados,
          'Conexões Realizadas': metrics.conexoesRealizadas,
          'Mensagens Enviadas': metrics.mensagensEnviadas,
          'Taxa de Aceite': `${metrics.taxaAceite}%`,
          Visitas: metrics.visitas,
          Likes: metrics.likes,
          Comentários: metrics.comentarios,
          'Total Atividades': metrics.totalAtividades,
          'Respostas Positivas': metrics.respostasPositivas,
          Reuniões: metrics.reunioes,
          Propostas: metrics.propostas,
          Vendas: metrics.vendas,
          'Taxa Resp. Positivas/Convites': `${conversionRates.respostasPositivasConvitesEnviados}%`,
          'Taxa Resp. Positivas/Conexões': `${conversionRates.respostasPositivasConexoesRealizadas}%`,
          'Taxa Resp. Positivas/Mensagens': `${conversionRates.respostasPositivasMensagensEnviadas}%`,
          'Taxa Reuniões/Resp. Positivas': `${conversionRates.numeroDeReunioesRespostasPositivas}%`,
          'Taxa Reuniões/Convites': `${conversionRates.numeroDeReunioesConvitesEnviados}%`,
        }]}
        filename={`perfil-${selectedProfiles.length > 0 ? selectedProfiles.join('-') : 'todos'}-${selectedCampaign === 'all' ? 'todas-campanhas' : selectedCampaign}-${new Date().toISOString().split('T')[0]}`}
      />
    </div>
  );
}