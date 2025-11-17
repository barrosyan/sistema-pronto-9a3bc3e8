import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import type { WeeklyMetrics } from '@/types/profile';
import { useCampaignData } from '@/hooks/useCampaignData';

type DailyMetrics = {
  dia: string;
  convitesEnviados: number;
  conexoesRealizadas: number;
  mensagensEnviadas: number;
  respostasPositivas: number;
  reunioes: number;
  visitas: number;
  likes: number;
  comentarios: number;
};

export default function Analytics() {
  const { campaignMetrics, getAllLeads, loadFromDatabase } = useCampaignData();
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');

  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  // Extract unique campaign names from database
  const allCampaigns = Array.from(new Set(campaignMetrics.map(m => m.campaignName).filter(Boolean)));
  
  // Auto-select first two campaigns if none selected
  useEffect(() => {
    if (allCampaigns.length > 0 && selectedCampaigns.length === 0) {
      setSelectedCampaigns(allCampaigns.slice(0, Math.min(2, allCampaigns.length)));
    }
  }, [allCampaigns.length]);

  const chartConfig: Record<string, { color: string }> = {};
  const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
  allCampaigns.forEach((campaign, index) => {
    chartConfig[campaign] = { color: chartColors[index % chartColors.length] };
  });

  // Transform campaign metrics to daily data from database
  const getDailyDataForCampaign = (campaignName: string): DailyMetrics[] => {
    const metrics = campaignMetrics.filter(m => m.campaignName === campaignName);
    if (metrics.length === 0) return [];

    const dailyMap = new Map<string, DailyMetrics>();
    
    metrics.forEach(metric => {
      Object.entries(metric.dailyData || {}).forEach(([date, value]) => {
        const existing = dailyMap.get(date) || {
          dia: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          convitesEnviados: 0,
          conexoesRealizadas: 0,
          mensagensEnviadas: 0,
          respostasPositivas: 0,
          reunioes: 0,
          visitas: 0,
          likes: 0,
          comentarios: 0
        };

        // Map event types to daily metrics fields
        const eventTypeMap: Record<string, keyof Omit<DailyMetrics, 'dia'>> = {
          'Connection Requests Sent': 'convitesEnviados',
          'Connection Requests Accepted': 'conexoesRealizadas',
          'Messages Sent': 'mensagensEnviadas',
          'Profile Visits': 'visitas',
          'Post Likes': 'likes',
          'Comments Done': 'comentarios'
        };

        const field = eventTypeMap[metric.eventType];
        if (field) {
          existing[field] = value;
        }

        dailyMap.set(date, existing);
      });
    });

    return Array.from(dailyMap.values()).sort((a, b) => {
      const [dayA, monthA] = a.dia.split('/');
      const [dayB, monthB] = b.dia.split('/');
      const dateA = new Date(2025, parseInt(monthA) - 1, parseInt(dayA));
      const dateB = new Date(2025, parseInt(monthB) - 1, parseInt(dayB));
      return dateA.getTime() - dateB.getTime();
    });
  };

  const dailyData: Record<string, DailyMetrics[]> = {};
  allCampaigns.forEach(campaign => {
    dailyData[campaign] = getDailyDataForCampaign(campaign);
  });

  // Transform daily data to weekly data
  const getWeeklyDataForCampaign = (campaignName: string): WeeklyMetrics[] => {
    const daily = dailyData[campaignName] || [];
    if (daily.length === 0) return [];

    const weeklyMap = new Map<string, WeeklyMetrics>();
    
    daily.forEach((day) => {
      const [dayNum, monthNum] = day.dia.split('/');
      const date = new Date(2025, parseInt(monthNum) - 1, parseInt(dayNum));
      
      // Get week start (Monday)
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(date.setDate(diff));
      const weekKey = weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      const existing = weeklyMap.get(weekKey) || {
        semana: weekKey,
        inicioDoPeriodo: weekKey,
        fimDoPeriodo: '',
        campanhasAtivas: [],
        diasAtivos: 0,
        convitesEnviados: 0,
        conexoesRealizadas: 0,
        taxaDeAceiteDeConexao: 0,
        mensagensEnviadas: 0,
        visitas: 0,
        likes: 0,
        comentarios: 0,
        totalDeAtividades: 0,
        respostasPositivas: 0,
        leadsProcessados: 0,
        reunioes: 0,
        propostas: 0,
        vendas: 0,
        respostasPositivasConvitesEnviados: 0,
        respostasPositivasConexoesRealizadas: 0,
        respostasPositivasMensagensEnviadas: 0,
        numeroDeReunioesRespostasPositivas: 0,
        numeroDeReunioesConvitesEnviados: 0,
        observacoes: '',
        problemasTecnicos: '',
        ajustesNaPesquisa: '',
        analiseComparativa: ''
      };

      existing.convitesEnviados += day.convitesEnviados;
      existing.conexoesRealizadas += day.conexoesRealizadas;
      existing.mensagensEnviadas += day.mensagensEnviadas;
      existing.respostasPositivas += day.respostasPositivas;
      existing.reunioes += day.reunioes;
      existing.visitas += day.visitas;
      existing.likes += day.likes;
      existing.comentarios += day.comentarios;
      existing.diasAtivos += 1;
      existing.totalDeAtividades = existing.convitesEnviados + existing.conexoesRealizadas + 
                                 existing.mensagensEnviadas + existing.visitas + 
                                 existing.likes + existing.comentarios;

      weeklyMap.set(weekKey, existing);
    });

    return Array.from(weeklyMap.values()).sort((a, b) => {
      const [dayA, monthA] = a.inicioDoPeriodo.split('/');
      const [dayB, monthB] = b.inicioDoPeriodo.split('/');
      const dateA = new Date(2025, parseInt(monthA) - 1, parseInt(dayA));
      const dateB = new Date(2025, parseInt(monthB) - 1, parseInt(dayB));
      return dateA.getTime() - dateB.getTime();
    });
  };

  const weeklyData: Record<string, WeeklyMetrics[]> = {};
  allCampaigns.forEach(campaign => {
    weeklyData[campaign] = getWeeklyDataForCampaign(campaign);
  });

  const handleCampaignToggle = (campaign: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaign)
        ? prev.filter(c => c !== campaign)
        : [...prev, campaign]
    );
  };

  const chartData = selectedCampaigns.length > 0 ? (() => {
    if (viewMode === 'daily') {
      const days = new Set<string>();
      selectedCampaigns.forEach(campaign => {
        dailyData[campaign]?.forEach(day => {
          days.add(day.dia);
        });
      });

      return Array.from(days).sort().map(day => {
        const dataPoint: any = { period: day };
        selectedCampaigns.forEach(campaign => {
          const dayData = dailyData[campaign]?.find(d => d.dia === day);
          dataPoint[`${campaign}_convites`] = dayData?.convitesEnviados ?? 0;
          dataPoint[`${campaign}_conexoes`] = dayData?.conexoesRealizadas ?? 0;
          dataPoint[`${campaign}_mensagens`] = dayData?.mensagensEnviadas ?? 0;
          dataPoint[`${campaign}_respostas`] = dayData?.respostasPositivas ?? 0;
          dataPoint[`${campaign}_reunioes`] = dayData?.reunioes ?? 0;
        });
        return dataPoint;
      });
    } else {
      const weeks = new Set<string>();
      selectedCampaigns.forEach(campaign => {
        weeklyData[campaign]?.forEach(week => {
          weeks.add(week.inicioDoPeriodo);
        });
      });

      return Array.from(weeks).sort().map(week => {
        const dataPoint: any = { period: week };
        selectedCampaigns.forEach(campaign => {
          const weekData = weeklyData[campaign]?.find(w => w.inicioDoPeriodo === week);
          dataPoint[`${campaign}_convites`] = weekData?.convitesEnviados ?? 0;
          dataPoint[`${campaign}_conexoes`] = weekData?.conexoesRealizadas ?? 0;
          dataPoint[`${campaign}_mensagens`] = weekData?.mensagensEnviadas ?? 0;
          dataPoint[`${campaign}_respostas`] = weekData?.respostasPositivas ?? 0;
          dataPoint[`${campaign}_reunioes`] = weekData?.reunioes ?? 0;
        });
        return dataPoint;
      });
    }
  })() : [];

  if (allCampaigns.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Sem Dados de Campanhas</CardTitle>
            <CardDescription>
              Nenhuma campanha encontrada. Importe arquivos na aba Settings para começar.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics - Comparação de Campanhas</h1>
        <p className="text-muted-foreground">Compare métricas {viewMode === 'daily' ? 'diárias' : 'semanais'} entre diferentes campanhas</p>
      </div>

      {/* Seleção de Modo de Visualização */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle>Granularidade de Visualização</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              variant={viewMode === 'daily' ? 'default' : 'outline'}
              onClick={() => setViewMode('daily')}
            >
              Visão Diária
            </Button>
            <Button 
              variant={viewMode === 'weekly' ? 'default' : 'outline'}
              onClick={() => setViewMode('weekly')}
            >
              Visão Semanal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de Campanhas */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Campanhas para Comparar</CardTitle>
          <CardDescription>Escolha uma ou mais campanhas para análise</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {allCampaigns.map(campaign => (
            <div key={campaign} className="flex items-center space-x-2">
              <Checkbox
                id={campaign}
                checked={selectedCampaigns.includes(campaign)}
                onCheckedChange={() => handleCampaignToggle(campaign)}
              />
              <Label htmlFor={campaign} className="cursor-pointer flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: chartConfig[campaign]?.color }}
                />
                {campaign}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedCampaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Selecione pelo menos uma campanha para visualizar os dados
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Gráficos Comparativos */}
          <div className="grid gap-6">
            {/* Convites e Conexões */}
            <Card>
              <CardHeader>
                <CardTitle>Convites Enviados e Conexões Realizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      {selectedCampaigns.map(campaign => (
                        <Line
                          key={`${campaign}_convites`}
                          type="monotone"
                          dataKey={`${campaign}_convites`}
                          stroke={chartConfig[campaign]?.color}
                          name={`${campaign} - Convites`}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ))}
                      {selectedCampaigns.map(campaign => (
                        <Line
                          key={`${campaign}_conexoes`}
                          type="monotone"
                          dataKey={`${campaign}_conexoes`}
                          stroke={chartConfig[campaign]?.color}
                          strokeDasharray="5 5"
                          name={`${campaign} - Conexões`}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Mensagens e Respostas */}
            <Card>
              <CardHeader>
                <CardTitle>Mensagens Enviadas e Respostas Positivas</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      {selectedCampaigns.map(campaign => (
                        <Line
                          key={`${campaign}_mensagens`}
                          type="monotone"
                          dataKey={`${campaign}_mensagens`}
                          stroke={chartConfig[campaign]?.color}
                          name={`${campaign} - Mensagens`}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ))}
                      {selectedCampaigns.map(campaign => (
                        <Line
                          key={`${campaign}_respostas`}
                          type="monotone"
                          dataKey={`${campaign}_respostas`}
                          stroke={chartConfig[campaign]?.color}
                          strokeDasharray="5 5"
                          name={`${campaign} - Respostas`}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Resumo */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Campanha</th>
                      <th className="text-center p-2">Convites</th>
                      <th className="text-center p-2">Conexões</th>
                      <th className="text-center p-2">Mensagens</th>
                      <th className="text-center p-2">Respostas</th>
                      <th className="text-center p-2">Reuniões</th>
                      <th className="text-center p-2">Taxa Aceite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCampaigns.map((campaign) => {
                      const totals = weeklyData[campaign]?.reduce((acc, week) => ({
                        convites: acc.convites + week.convitesEnviados,
                        conexoes: acc.conexoes + week.conexoesRealizadas,
                        mensagens: acc.mensagens + week.mensagensEnviadas,
                        respostas: acc.respostas + week.respostasPositivas,
                        reunioes: acc.reunioes + week.reunioes
                      }), { convites: 0, conexoes: 0, mensagens: 0, respostas: 0, reunioes: 0 });

                      const taxaAceite = totals && totals.convites > 0 
                        ? ((totals.conexoes / totals.convites) * 100).toFixed(1)
                        : '0.0';

                      return (
                        <tr key={campaign} className="border-b">
                          <td className="p-2 flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: chartConfig[campaign]?.color }}
                            />
                            {campaign}
                          </td>
                          <td className="text-center p-2">{totals?.convites ?? 0}</td>
                          <td className="text-center p-2">{totals?.conexoes ?? 0}</td>
                          <td className="text-center p-2">{totals?.mensagens ?? 0}</td>
                          <td className="text-center p-2">{totals?.respostas ?? 0}</td>
                          <td className="text-center p-2">{totals?.reunioes ?? 0}</td>
                          <td className="text-center p-2">{taxaAceite}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
