import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useCampaignData } from '@/hooks/useCampaignData';
import { toast } from 'sonner';

const ComparisonDashboard = () => {
  const { campaignMetrics, positiveLeads, loadFromDatabase } = useCampaignData();
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<string[]>([]);

  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  useEffect(() => {
    const campaigns = [...new Set(campaignMetrics.map(m => m.campaignName).filter(Boolean))];
    setAvailableCampaigns(campaigns);
    if (campaigns.length >= 2 && selectedCampaigns.length === 0) {
      setSelectedCampaigns([campaigns[0], campaigns[1]]);
    }
  }, [campaignMetrics]);

  const handleCampaignSelect = (index: number, value: string) => {
    const newSelection = [...selectedCampaigns];
    newSelection[index] = value;
    setSelectedCampaigns(newSelection);
  };

  const addCampaign = () => {
    if (selectedCampaigns.length >= 4) {
      toast.error('Máximo de 4 campanhas para comparação');
      return;
    }
    const available = availableCampaigns.find(c => !selectedCampaigns.includes(c));
    if (available) {
      setSelectedCampaigns([...selectedCampaigns, available]);
    }
  };

  const removeCampaign = (index: number) => {
    if (selectedCampaigns.length <= 1) {
      toast.error('Mantenha pelo menos 1 campanha selecionada');
      return;
    }
    setSelectedCampaigns(selectedCampaigns.filter((_, i) => i !== index));
  };

  const campaignData = useMemo(() => {
    return selectedCampaigns.map(campaignName => {
      const metrics = campaignMetrics.filter(m => m.campaignName === campaignName);
      const leads = positiveLeads.filter(l => l.campaign === campaignName);

      const invitations = metrics
        .filter(m => m.eventType === 'Connection Requests Sent')
        .reduce((sum, m) => sum + m.totalCount, 0);

      const connections = metrics
        .filter(m => m.eventType === 'Connection Requests Accepted')
        .reduce((sum, m) => sum + m.totalCount, 0);

      const messages = metrics
        .filter(m => m.eventType === 'Messages Sent')
        .reduce((sum, m) => sum + m.totalCount, 0);

      const visits = metrics
        .filter(m => m.eventType === 'Profile Visits')
        .reduce((sum, m) => sum + m.totalCount, 0);

      const positiveResponses = leads.length;
      const meetings = leads.filter(l => l.meetingDate).length;
      const proposals = leads.filter(l => l.proposalDate).length;
      const sales = leads.filter(l => l.saleDate).length;

      const acceptanceRate = invitations > 0 ? (connections / invitations) * 100 : 0;
      const responseRate = messages > 0 ? (positiveResponses / messages) * 100 : 0;
      const meetingRate = positiveResponses > 0 ? (meetings / positiveResponses) * 100 : 0;
      const proposalRate = meetings > 0 ? (proposals / meetings) * 100 : 0;
      const salesRate = proposals > 0 ? (sales / proposals) * 100 : 0;

      // Timeline data
      const dailyData: Record<string, any> = {};
      metrics.forEach(metric => {
        Object.entries(metric.dailyData || {}).forEach(([date, count]) => {
          if (!dailyData[date]) {
            dailyData[date] = { date };
          }
          switch (metric.eventType) {
            case 'Connection Requests Sent':
              dailyData[date].invitations = (dailyData[date].invitations || 0) + (count as number);
              break;
            case 'Connection Requests Accepted':
              dailyData[date].connections = (dailyData[date].connections || 0) + (count as number);
              break;
            case 'Messages Sent':
              dailyData[date].messages = (dailyData[date].messages || 0) + (count as number);
              break;
          }
        });
      });

      const timeline = Object.values(dailyData).sort((a: any, b: any) => a.date.localeCompare(b.date));

      return {
        name: campaignName,
        metrics: {
          invitations,
          connections,
          messages,
          visits,
          positiveResponses,
          meetings,
          proposals,
          sales,
        },
        rates: {
          acceptanceRate,
          responseRate,
          meetingRate,
          proposalRate,
          salesRate,
        },
        timeline,
      };
    });
  }, [selectedCampaigns, campaignMetrics, positiveLeads]);

  const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  const mergedTimeline = useMemo(() => {
    const dateMap = new Map<string, any>();
    
    campaignData.forEach((campaign, idx) => {
      campaign.timeline.forEach((point: any) => {
        if (!dateMap.has(point.date)) {
          dateMap.set(point.date, { date: point.date });
        }
        const existing = dateMap.get(point.date);
        existing[`invitations_${idx}`] = point.invitations || 0;
        existing[`connections_${idx}`] = point.connections || 0;
        existing[`messages_${idx}`] = point.messages || 0;
      });
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [campaignData]);

  const getPerformanceComparison = (metricName: keyof typeof campaignData[0]['metrics']) => {
    const values = campaignData.map(c => c.metrics[metricName]);
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    return campaignData.map((campaign, idx) => {
      const value = campaign.metrics[metricName];
      const percentDiff = max > 0 ? ((value - min) / max) * 100 : 0;
      const isTop = value === max;
      const isBottom = value === min;
      
      return {
        campaign: campaign.name,
        value,
        percentDiff,
        isTop,
        isBottom,
      };
    });
  };

  const renderComparisonBadge = (value: number, isTop: boolean, isBottom: boolean) => {
    if (campaignData.length === 1) return null;
    
    if (isTop) {
      return (
        <Badge className="bg-success text-success-foreground ml-2">
          <TrendingUp className="h-3 w-3 mr-1" />
          Melhor
        </Badge>
      );
    }
    if (isBottom) {
      return (
        <Badge variant="destructive" className="ml-2">
          <TrendingDown className="h-3 w-3 mr-1" />
          Menor
        </Badge>
      );
    }
    return null;
  };

  if (availableCampaigns.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Comparação de Campanhas</h1>
          <p className="text-muted-foreground mt-1">
            Compare múltiplas campanhas lado a lado
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>Nenhuma campanha disponível para comparação.</p>
              <p className="text-sm mt-2">Importe dados de campanhas primeiro.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Comparação de Campanhas</h1>
        <p className="text-muted-foreground mt-1">
          Compare múltiplas campanhas lado a lado com análise de performance relativa
        </p>
      </div>

      {/* Campaign Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Selecione Campanhas para Comparar</CardTitle>
          <CardDescription>Escolha até 4 campanhas para análise comparativa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedCampaigns.map((campaign, index) => (
              <div key={index} className="space-y-2">
                <Label>Campanha {index + 1}</Label>
                <div className="flex gap-2">
                  <Select value={campaign} onValueChange={(value) => handleCampaignSelect(index, value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCampaigns.map(c => (
                        <SelectItem key={c} value={c} disabled={selectedCampaigns.includes(c) && c !== campaign}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCampaigns.length > 1 && (
                    <Button variant="outline" size="icon" onClick={() => removeCampaign(index)}>
                      ×
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {selectedCampaigns.length < 4 && selectedCampaigns.length < availableCampaigns.length && (
              <div className="flex items-end">
                <Button variant="outline" onClick={addCampaign} className="w-full">
                  + Adicionar Campanha
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'invitations', label: 'Convites Enviados', icon: '📨' },
          { key: 'connections', label: 'Conexões', icon: '🤝' },
          { key: 'positiveResponses', label: 'Respostas Positivas', icon: '✅' },
          { key: 'meetings', label: 'Reuniões', icon: '📅' },
        ].map(({ key, label, icon }) => {
          const comparison = getPerformanceComparison(key as any);
          return (
            <Card key={key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <span className="mr-2">{icon}</span>
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {comparison.map(({ campaign, value, isTop, isBottom }, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[idx] }}
                      />
                      <span className="text-sm truncate">{campaign}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold">{value}</span>
                      {renderComparisonBadge(value, isTop, isBottom)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Conversion Rates Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Taxas de Conversão</CardTitle>
          <CardDescription>Comparação de eficiência entre campanhas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { key: 'acceptanceRate', label: 'Taxa de Aceite', suffix: '%' },
              { key: 'responseRate', label: 'Taxa de Resposta', suffix: '%' },
              { key: 'meetingRate', label: 'Taxa de Reunião', suffix: '%' },
              { key: 'proposalRate', label: 'Taxa de Proposta', suffix: '%' },
              { key: 'salesRate', label: 'Taxa de Venda', suffix: '%' },
            ].map(({ key, label, suffix }) => (
              <div key={key} className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">{label}</h4>
                {campaignData.map((campaign, idx) => {
                  const value = campaign.rates[key as keyof typeof campaign.rates];
                  const allValues = campaignData.map(c => c.rates[key as keyof typeof c.rates]);
                  const max = Math.max(...allValues);
                  const isTop = value === max && campaignData.length > 1;
                  
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colors[idx] }}
                        />
                        <span className="text-sm truncate">{campaign.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{value.toFixed(1)}{suffix}</span>
                        {isTop && (
                          <ArrowUpRight className="h-4 w-4 text-success" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Charts - Synchronized */}
      {mergedTimeline.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Convites - Comparação Temporal</CardTitle>
              <CardDescription>Gráficos sincronizados para comparação direta</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={Object.fromEntries(
                  selectedCampaigns.map((name, idx) => [
                    `invitations_${idx}`,
                    { label: name, color: colors[idx] }
                  ])
                )}
                className="h-[300px]"
              >
                <LineChart data={mergedTimeline}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {selectedCampaigns.map((_, idx) => (
                    <Line
                      key={idx}
                      type="monotone"
                      dataKey={`invitations_${idx}`}
                      stroke={colors[idx]}
                      strokeWidth={2}
                      dot={{ fill: colors[idx] }}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conexões ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={Object.fromEntries(
                    selectedCampaigns.map((name, idx) => [
                      `connections_${idx}`,
                      { label: name, color: colors[idx] }
                    ])
                  )}
                  className="h-[250px]"
                >
                  <AreaChart data={mergedTimeline}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {selectedCampaigns.map((_, idx) => (
                      <Area
                        key={idx}
                        type="monotone"
                        dataKey={`connections_${idx}`}
                        stackId={`connections_${idx}`}
                        stroke={colors[idx]}
                        fill={colors[idx]}
                        fillOpacity={0.6}
                      />
                    ))}
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mensagens Enviadas</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={Object.fromEntries(
                    selectedCampaigns.map((name, idx) => [
                      `messages_${idx}`,
                      { label: name, color: colors[idx] }
                    ])
                  )}
                  className="h-[250px]"
                >
                  <BarChart data={mergedTimeline}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {selectedCampaigns.map((_, idx) => (
                      <Bar
                        key={idx}
                        dataKey={`messages_${idx}`}
                        fill={colors[idx]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Performance Relativa</CardTitle>
          <CardDescription>Análise comparativa de desempenho geral</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaignData.map((campaign, idx) => {
              const totalScore = 
                (campaign.rates.acceptanceRate / 100) * 20 +
                (campaign.rates.responseRate / 100) * 25 +
                (campaign.rates.meetingRate / 100) * 25 +
                (campaign.rates.proposalRate / 100) * 15 +
                (campaign.rates.salesRate / 100) * 15;

              const maxScore = Math.max(...campaignData.map(c => 
                (c.rates.acceptanceRate / 100) * 20 +
                (c.rates.responseRate / 100) * 25 +
                (c.rates.meetingRate / 100) * 25 +
                (c.rates.proposalRate / 100) * 15 +
                (c.rates.salesRate / 100) * 15
              ));

              const performancePercent = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[idx] }}
                      />
                      <span className="font-semibold">{campaign.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {performancePercent.toFixed(1)}% de eficiência relativa
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${performancePercent}%`,
                        backgroundColor: colors[idx]
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComparisonDashboard;
