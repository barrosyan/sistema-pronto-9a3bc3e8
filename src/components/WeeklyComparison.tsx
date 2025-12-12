import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface WeekData {
  semana?: string;
  campaignName?: string;
  inicioDoPeriodo: string;
  fimDoPeriodo: string;
  convitesEnviados: number;
  conexoesRealizadas: number;
  mensagensEnviadas: number;
  respostasPositivas: number;
  reunioes: number;
  taxaDeAceiteDeConexao: number;
  campanhasAtivas?: string[];
}

interface WeeklyComparisonProps {
  weeklyData: WeekData[];
  availableCampaigns: string[];
}

export const WeeklyComparison = ({ weeklyData, availableCampaigns }: WeeklyComparisonProps) => {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(
    availableCampaigns.slice(0, 2)
  );

  const handleCampaignToggle = (campaign: string, checked: boolean) => {
    if (checked && selectedCampaigns.length < 3) {
      setSelectedCampaigns([...selectedCampaigns, campaign]);
    } else if (!checked) {
      setSelectedCampaigns(selectedCampaigns.filter(c => c !== campaign));
    }
  };

  // Agrupar dados por campanha
  const dataPerCampaign = selectedCampaigns.map(campaign => {
    const campaignWeeks = weeklyData.filter(w => 
      w.campaignName === campaign || w.campanhasAtivas?.includes(campaign)
    ).sort((a, b) => {
      const dateA = a.inicioDoPeriodo.split('/').reverse().join('');
      const dateB = b.inicioDoPeriodo.split('/').reverse().join('');
      return dateA.localeCompare(dateB);
    });

    return {
      campaign,
      weeks: campaignWeeks,
      totals: campaignWeeks.reduce((acc, week) => ({
        convites: acc.convites + week.convitesEnviados,
        conexoes: acc.conexoes + week.conexoesRealizadas,
        mensagens: acc.mensagens + week.mensagensEnviadas,
        respostas: acc.respostas + week.respostasPositivas,
        reunioes: acc.reunioes + week.reunioes
      }), { convites: 0, conexoes: 0, mensagens: 0, respostas: 0, reunioes: 0 })
    };
  });

  // Comparação entre semanas (primeiras vs últimas)
  const weekComparison = selectedCampaigns.length > 0 ? (() => {
    const firstWeeks = dataPerCampaign.map(d => d.weeks[0]).filter(Boolean);
    const lastWeeks = dataPerCampaign.map(d => d.weeks[d.weeks.length - 1]).filter(Boolean);
    
    const avgFirst = firstWeeks.reduce((acc, w) => ({
      convites: acc.convites + w.convitesEnviados,
      conexoes: acc.conexoes + w.conexoesRealizadas,
      respostas: acc.respostas + w.respostasPositivas,
      taxa: acc.taxa + w.taxaDeAceiteDeConexao
    }), { convites: 0, conexoes: 0, respostas: 0, taxa: 0 });

    const avgLast = lastWeeks.reduce((acc, w) => ({
      convites: acc.convites + w.convitesEnviados,
      conexoes: acc.conexoes + w.conexoesRealizadas,
      respostas: acc.respostas + w.respostasPositivas,
      taxa: acc.taxa + w.taxaDeAceiteDeConexao
    }), { convites: 0, conexoes: 0, respostas: 0, taxa: 0 });

    return {
      first: {
        convites: Math.round(avgFirst.convites / firstWeeks.length),
        conexoes: Math.round(avgFirst.conexoes / firstWeeks.length),
        respostas: Math.round(avgFirst.respostas / firstWeeks.length),
        taxa: Math.round(avgFirst.taxa / firstWeeks.length)
      },
      last: {
        convites: Math.round(avgLast.convites / lastWeeks.length),
        conexoes: Math.round(avgLast.conexoes / lastWeeks.length),
        respostas: Math.round(avgLast.respostas / lastWeeks.length),
        taxa: Math.round(avgLast.taxa / lastWeeks.length)
      }
    };
  })() : null;

  const getVariation = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getTrendIcon = (variation: number) => {
    if (variation > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (variation < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Seleção de Campanhas */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Campanhas para Comparar</CardTitle>
          <CardDescription>Escolha até 3 campanhas (mínimo 1)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableCampaigns.map((campaign, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`campaign-${idx}`}
                  checked={selectedCampaigns.includes(campaign)}
                  onCheckedChange={(checked) => handleCampaignToggle(campaign, checked as boolean)}
                  disabled={!selectedCampaigns.includes(campaign) && selectedCampaigns.length >= 3}
                />
                <Label
                  htmlFor={`campaign-${idx}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {campaign}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCampaigns.length === 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Selecione pelo menos 1 campanha para visualizar os comparativos.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedCampaigns.length > 0 && (
        <>
          {/* Comparação de Totais por Campanha */}
          <Card>
            <CardHeader>
              <CardTitle>Comparação de Totais - Campanhas Selecionadas</CardTitle>
              <CardDescription>Total acumulado de cada métrica por campanha</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Campanha</th>
                      <th className="text-center p-3 font-semibold">Convites</th>
                      <th className="text-center p-3 font-semibold">Conexões</th>
                      <th className="text-center p-3 font-semibold">Mensagens</th>
                      <th className="text-center p-3 font-semibold">Respostas</th>
                      <th className="text-center p-3 font-semibold">Reuniões</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataPerCampaign.map((data, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium max-w-xs truncate">{data.campaign}</td>
                        <td className="text-center p-3 font-semibold">{data.totals.convites}</td>
                        <td className="text-center p-3 font-semibold">{data.totals.conexoes}</td>
                        <td className="text-center p-3 font-semibold">{data.totals.mensagens}</td>
                        <td className="text-center p-3 font-semibold text-primary">{data.totals.respostas}</td>
                        <td className="text-center p-3 font-semibold text-success">{data.totals.reunioes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Evolução entre Primeira e Última Semana */}
          {weekComparison && (
            <Card>
              <CardHeader>
                <CardTitle>Evolução: Primeiras vs Últimas Semanas</CardTitle>
                <CardDescription>Comparação média entre semanas iniciais e finais das campanhas selecionadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Primeira Semana */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Semanas Iniciais</Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm">Convites Enviados</span>
                        <span className="font-bold">{weekComparison.first.convites}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm">Conexões Realizadas</span>
                        <span className="font-bold">{weekComparison.first.conexoes}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm">Respostas Positivas</span>
                        <span className="font-bold text-primary">{weekComparison.first.respostas}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm">Taxa de Aceite</span>
                        <span className="font-bold">{weekComparison.first.taxa}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Última Semana com Variação */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Semanas Recentes</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm">Convites Enviados</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{weekComparison.last.convites}</span>
                          {getTrendIcon(getVariation(weekComparison.last.convites, weekComparison.first.convites))}
                          <span className="text-xs text-muted-foreground">
                            {getVariation(weekComparison.last.convites, weekComparison.first.convites) > 0 ? '+' : ''}
                            {getVariation(weekComparison.last.convites, weekComparison.first.convites)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm">Conexões Realizadas</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{weekComparison.last.conexoes}</span>
                          {getTrendIcon(getVariation(weekComparison.last.conexoes, weekComparison.first.conexoes))}
                          <span className="text-xs text-muted-foreground">
                            {getVariation(weekComparison.last.conexoes, weekComparison.first.conexoes) > 0 ? '+' : ''}
                            {getVariation(weekComparison.last.conexoes, weekComparison.first.conexoes)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm">Respostas Positivas</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{weekComparison.last.respostas}</span>
                          {getTrendIcon(getVariation(weekComparison.last.respostas, weekComparison.first.respostas))}
                          <span className="text-xs text-muted-foreground">
                            {getVariation(weekComparison.last.respostas, weekComparison.first.respostas) > 0 ? '+' : ''}
                            {getVariation(weekComparison.last.respostas, weekComparison.first.respostas)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm">Taxa de Aceite</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{weekComparison.last.taxa}%</span>
                          {getTrendIcon(getVariation(weekComparison.last.taxa, weekComparison.first.taxa))}
                          <span className="text-xs text-muted-foreground">
                            {getVariation(weekComparison.last.taxa, weekComparison.first.taxa) > 0 ? '+' : ''}
                            {getVariation(weekComparison.last.taxa, weekComparison.first.taxa)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparação Semanal - Semanas como Colunas */}
          <Card>
            <CardHeader>
              <CardTitle>Desempenho Semanal por Campanha</CardTitle>
              <CardDescription>Semanas como colunas, métricas por campanha nas linhas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {dataPerCampaign.map((data, campaignIdx) => {
                  const metrics = [
                    { key: 'convitesEnviados', label: 'Convites Enviados' },
                    { key: 'conexoesRealizadas', label: 'Conexões Realizadas' },
                    { key: 'mensagensEnviadas', label: 'Mensagens Enviadas' },
                    { key: 'respostasPositivas', label: 'Respostas Positivas' },
                    { key: 'reunioes', label: 'Reuniões' },
                    { key: 'taxaDeAceiteDeConexao', label: 'Taxa de Aceite (%)' },
                  ];

                  return (
                    <div key={campaignIdx} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-lg">{data.campaign}</h4>
                        <Badge variant="secondary">{data.weeks.length} semanas</Badge>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2 sticky left-0 bg-background min-w-[150px]">Métrica</th>
                              {data.weeks.map((week, weekIdx) => (
                                <th key={weekIdx} className="text-center p-2 min-w-[100px]">
                                  <div className="font-medium">{week.semana || `Semana ${weekIdx + 1}`}</div>
                                  <div className="text-xs text-muted-foreground font-normal">
                                    {week.inicioDoPeriodo}
                                  </div>
                                </th>
                              ))}
                              <th className="text-center p-2 min-w-[80px] font-bold bg-muted/30">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.map((metric, metricIdx) => {
                              const values = data.weeks.map(w => (w as any)[metric.key] || 0);
                              const total = metric.key === 'taxaDeAceiteDeConexao'
                                ? values.length > 0 
                                  ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
                                  : '0.0'
                                : values.reduce((a, b) => a + b, 0);
                              
                              return (
                                <tr key={metricIdx} className="border-b hover:bg-muted/30">
                                  <td className="p-2 font-medium sticky left-0 bg-background">
                                    {metric.label}
                                  </td>
                                  {data.weeks.map((week, weekIdx) => (
                                    <td key={weekIdx} className="text-center p-2">
                                      {metric.key === 'taxaDeAceiteDeConexao' 
                                        ? `${(week as any)[metric.key]}%` 
                                        : (week as any)[metric.key]}
                                    </td>
                                  ))}
                                  <td className="text-center p-2 font-bold bg-muted/30">
                                    {metric.key === 'taxaDeAceiteDeConexao' ? `${total}%` : total}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
