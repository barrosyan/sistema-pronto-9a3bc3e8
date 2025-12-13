import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { CampaignMetrics, Lead } from '@/types/campaign';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProfileComparisonProps {
  campaignMetrics: CampaignMetrics[];
  leads: Lead[];
  profiles: string[];
  campaigns: string[];
}

interface ProfileMetrics {
  profileName: string;
  campaignName: string;
  convitesEnviados: number;
  conexoesRealizadas: number;
  mensagensEnviadas: number;
  visitas: number;
  likes: number;
  comentarios: number;
  taxaAceite: string;
  respostasPositivas: number;
  reunioes: number;
  propostas: number;
  vendas: number;
  startDate: string | null;
  endDate: string | null;
}

export function ProfileComparison({ campaignMetrics, leads, profiles, campaigns }: ProfileComparisonProps) {
  const getProfileMetrics = (profileName: string, campaignName?: string): ProfileMetrics => {
    const filteredMetrics = campaignMetrics.filter(m => 
      m.profileName === profileName && 
      (!campaignName || m.campaignName === campaignName)
    );
    
    const filteredLeads = leads.filter(l => 
      l.profile === profileName || 
      filteredMetrics.some(m => m.campaignName === l.campaign)
    );

    const eventMappings: Record<string, string> = {
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

    const totals: Record<string, number> = {
      convitesEnviados: 0,
      conexoesRealizadas: 0,
      mensagensEnviadas: 0,
      visitas: 0,
      likes: 0,
      comentarios: 0,
      followUps1: 0,
      followUps2: 0,
      followUps3: 0,
    };

    const datesWithActivity: string[] = [];

    filteredMetrics.forEach(metric => {
      const targetKey = eventMappings[metric.eventType];
      if (targetKey) {
        Object.entries(metric.dailyData || {}).forEach(([date, value]) => {
          totals[targetKey] += value;
          // Only track dates with actual activity (value > 0)
          if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && value > 0) {
            datesWithActivity.push(date);
          }
        });
      }
    });

    // Calculate messages from follow-ups
    const followUpsTotal = totals.followUps1 + totals.followUps2 + totals.followUps3;
    if (followUpsTotal > 0) {
      totals.mensagensEnviadas = followUpsTotal;
    }

    // Start/End = first/last date with any activity > 0
    const sortedActiveDates = [...new Set(datesWithActivity)].sort();
    const startDate = sortedActiveDates.length > 0 ? sortedActiveDates[0] : null;
    const endDate = sortedActiveDates.length > 0 ? sortedActiveDates[sortedActiveDates.length - 1] : null;

    const positiveLeads = filteredLeads.filter(l => l.status === 'positive');
    const taxaAceite = totals.convitesEnviados > 0 
      ? ((totals.conexoesRealizadas / totals.convitesEnviados) * 100).toFixed(1)
      : '0.0';

    return {
      profileName,
      campaignName: campaignName || 'Todas',
      convitesEnviados: totals.convitesEnviados,
      conexoesRealizadas: totals.conexoesRealizadas,
      mensagensEnviadas: totals.mensagensEnviadas,
      visitas: totals.visitas,
      likes: totals.likes,
      comentarios: totals.comentarios,
      taxaAceite,
      respostasPositivas: positiveLeads.length,
      reunioes: positiveLeads.filter(l => l.meetingDate).length,
      propostas: positiveLeads.filter(l => l.proposalDate).length,
      vendas: positiveLeads.filter(l => l.saleDate).length,
      startDate,
      endDate,
    };
  };

  const getTrendIcon = (value1: number, value2: number) => {
    if (value1 > value2) return <TrendingUp className="h-4 w-4 text-success" />;
    if (value1 < value2) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getPercentDiff = (value1: number, value2: number) => {
    if (value2 === 0) return value1 > 0 ? '+100%' : '0%';
    const diff = ((value1 - value2) / value2) * 100;
    return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Get all profile-campaign combinations
  const profileCampaignCombinations = profiles.flatMap(profile => 
    campaigns
      .filter(campaign => campaignMetrics.some(m => m.profileName === profile && m.campaignName === campaign))
      .map(campaign => ({ profile, campaign }))
  );

  if (profileCampaignCombinations.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Perfis</CardTitle>
          <CardDescription>É necessário ter pelo menos 2 combinações de perfil/campanha para comparar</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação de Perfis por Campanha</CardTitle>
        <CardDescription>Compare a performance de diferentes perfis na mesma campanha ou entre campanhas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left p-3 font-semibold sticky left-0 bg-card z-10">Métrica</th>
                {profileCampaignCombinations.map(({ profile, campaign }) => (
                  <th key={`${profile}-${campaign}`} className="text-center p-3 font-semibold border-l border-border min-w-[150px]">
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="outline" className="text-xs">{profile}</Badge>
                      <span className="text-xs text-muted-foreground">{campaign}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'startDate', label: 'Data Início', format: (v: any) => formatDate(v) },
                { key: 'endDate', label: 'Data Fim', format: (v: any) => formatDate(v) },
                { key: 'convitesEnviados', label: 'Convites Enviados' },
                { key: 'conexoesRealizadas', label: 'Conexões Realizadas' },
                { key: 'mensagensEnviadas', label: 'Mensagens Enviadas' },
                { key: 'taxaAceite', label: 'Taxa de Aceite', format: (v: string) => `${v}%` },
                { key: 'visitas', label: 'Visitas' },
                { key: 'likes', label: 'Likes' },
                { key: 'comentarios', label: 'Comentários' },
                { key: 'respostasPositivas', label: 'Respostas Positivas' },
                { key: 'reunioes', label: 'Reuniões' },
                { key: 'propostas', label: 'Propostas' },
                { key: 'vendas', label: 'Vendas' },
              ].map(({ key, label, format: formatFn }) => {
                const metricsData = profileCampaignCombinations.map(({ profile, campaign }) => 
                  getProfileMetrics(profile, campaign)
                );
                
                return (
                  <tr key={key} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium sticky left-0 bg-card z-10">{label}</td>
                    {metricsData.map((metrics, idx) => {
                      const value = (metrics as any)[key];
                      const displayValue = formatFn ? formatFn(value) : value;
                      
                      return (
                        <td key={idx} className="p-3 text-center border-l border-border">
                          <span className="font-bold">{displayValue}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}