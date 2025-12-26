import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useEventAnalysis } from '@/hooks/useEventAnalysis';
import { CampaignComparison } from '@/components/CampaignComparison';
import { groupMetricsByCampaign } from '@/utils/campaignParser';
import { Users, Calendar, Search, Filter, GitCompare, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const Events = () => {
  const { campaignMetrics, positiveLeads, getAllLeads, ensureLoaded } = useCampaignData();
  const { getEventLeadsAnalysis, getRecurrentLeads, getRecommendedApproach } = useEventAnalysis();
  
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showRecurrentLeads, setShowRecurrentLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbEvents, setDbEvents] = useState<Event[]>([]);
  const [selectedDbEventId, setSelectedDbEventId] = useState<string | null>(null);
  const [linkingEventType, setLinkingEventType] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [availableCampaigns, setAvailableCampaigns] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [campaign1, setCampaign1] = useState('');
  const [campaign2, setCampaign2] = useState('');

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  useEffect(() => {
    const campaigns = [...new Set(campaignMetrics.map(m => m.campaignName).filter(Boolean))];
    setAvailableCampaigns(campaigns);
    if (campaigns.length >= 2 && selectedCampaigns.length === 0) {
      setSelectedCampaigns([campaigns[0], campaigns[1]]);
    }
  }, [campaignMetrics]);

  const eventAnalysis = getEventLeadsAnalysis();
  const validEvents = eventAnalysis.filter(e => e.eventName && e.eventName.trim() !== '');
  const recurrentLeads = getRecurrentLeads();
  const groupedCampaigns = groupMetricsByCampaign(campaignMetrics);

  const campaignsList = Array.from(groupedCampaigns.entries())
    .map(([name, metrics]) => {
      const invitations = metrics.find(m => m.eventType === 'Connection Requests Sent')?.totalCount || 0;
      const connections = metrics.find(m => m.eventType === 'Connection Requests Accepted')?.totalCount || 0;
      const messages = metrics.find(m => m.eventType === 'Messages Sent')?.totalCount || 0;
      const acceptanceRate = invitations > 0 ? (connections / invitations) * 100 : 0;
      
      const campaignLeads = getAllLeads().filter(l => l.campaign.includes(name.split(' ')[0]));
      const positiveLeads = campaignLeads.filter(l => l.status === 'positive').length;
      
      return {
        name,
        profile: metrics[0]?.profileName || '',
        invitations,
        connections,
        messages,
        positiveLeads,
        acceptanceRate
      };
    })
    .filter(c => c.name && c.name.trim() !== ''); // Filter out empty names

  const selectedEventData = selectedEvent === 'all' 
    ? null 
    : eventAnalysis.find(e => e.eventName === selectedEvent);

  const filteredLeads = selectedEventData
    ? selectedEventData.leads.filter(l => 
        l.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.lead.company.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : recurrentLeads.filter(l =>
        l.lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.lead.company.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const getComparisonData = () => {
    if (!campaign1 || !campaign2 || campaign1 === '_placeholder1' || campaign2 === '_placeholder2') return null;
    
    const c1 = campaignsList.find(c => c.name === campaign1);
    const c2 = campaignsList.find(c => c.name === campaign2);
    
    if (!c1 || !c2) return null;
    
    return { campaign1: c1, campaign2: c2 };
  };

  const comparisonData = getComparisonData();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Análise de Eventos e Comparações</h1>
        <p className="text-muted-foreground mt-1">
          Compare campanhas, visualize leads por evento e identifique participantes recorrentes
        </p>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="events">
            <Calendar className="mr-2 h-4 w-4" />
            Análise de Eventos
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <GitCompare className="mr-2 h-4 w-4" />
            Comparação Avançada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-6 mt-6"
>

      {/* Event Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventAnalysis.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getAllLeads().length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leads Recorrentes</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{recurrentLeads.length}</div>
            <p className="text-xs text-muted-foreground">
              Participaram de 2+ eventos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recorrência</CardTitle>
            <GitCompare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getAllLeads().length > 0 
                ? ((recurrentLeads.length / getAllLeads().length) * 100).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Comparação de Campanhas</CardTitle>
              <CardDescription>Compare métricas entre diferentes campanhas ou perfis</CardDescription>
            </div>
            <Button 
              variant={showComparison ? "default" : "outline"}
              onClick={() => setShowComparison(!showComparison)}
            >
              <GitCompare className="mr-2 h-4 w-4" />
              {showComparison ? 'Ocultar' : 'Comparar'}
            </Button>
          </div>
        </CardHeader>
        {showComparison && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Campanha 1</label>
                <Select value={campaign1} onValueChange={setCampaign1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a primeira campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_placeholder1">Selecione uma campanha</SelectItem>
                    {campaignsList.length > 0 ? (
                      campaignsList.map(c => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name} ({c.profile})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-campaigns" disabled>
                        Nenhuma campanha disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Campanha 2</label>
                <Select value={campaign2} onValueChange={setCampaign2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a segunda campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_placeholder2">Selecione uma campanha</SelectItem>
                    {campaignsList.length > 0 ? (
                      campaignsList.map(c => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name} ({c.profile})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-campaigns" disabled>
                        Nenhuma campanha disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {comparisonData && (
              <CampaignComparison 
                campaign1={comparisonData.campaign1}
                campaign2={comparisonData.campaign2}
              />
            )}
          </CardContent>
        )}
      </Card>

      {/* Event Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Leads Recorrentes</SelectItem>
              {validEvents.length > 0 ? (
                validEvents.map(event => (
                  <SelectItem key={event.eventName} value={event.eventName}>
                    {event.eventName} ({event.totalLeads} leads)
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-events" disabled>
                  Nenhum evento disponível
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {selectedEventData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-2xl font-bold">{selectedEventData.totalLeads}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Positivos</div>
                <div className="text-2xl font-bold text-success">{selectedEventData.positiveLeads}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Recorrentes</div>
                <div className="text-2xl font-bold text-primary">{selectedEventData.recurrentLeads}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Novos</div>
                <div className="text-2xl font-bold text-muted-foreground">{selectedEventData.newLeads}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedEvent === 'all' 
                ? `Leads Recorrentes (${recurrentLeads.length})` 
                : `Leads do Evento (${filteredLeads.length})`}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lead..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Eventos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recomendação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((leadHistory, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{leadHistory.lead.name}</TableCell>
                  <TableCell>{leadHistory.lead.company}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="w-fit">
                        {leadHistory.eventCount} evento{leadHistory.eventCount > 1 ? 's' : ''}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {leadHistory.events.slice(0, 2).map((e, i) => (
                          <div key={i}>{e}</div>
                        ))}
                        {leadHistory.events.length > 2 && (
                          <div>+{leadHistory.events.length - 2} mais</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {leadHistory.lead.status === 'positive' ? (
                      <Badge className="bg-success text-success-foreground">Positivo</Badge>
                    ) : (
                      <Badge variant="destructive">Negativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-muted-foreground">
                      {getRecommendedApproach(leadHistory)}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredLeads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lead encontrado
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6 mt-6">
          {/* Campaign Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Campanhas para Comparação</CardTitle>
              <CardDescription>
                Compare até 4 campanhas simultaneamente em gráficos sincronizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedCampaigns.map((campaignName, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={campaignName}
                      onValueChange={(value) => handleCampaignSelect(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma campanha" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCampaigns.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCampaigns.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCampaign(index)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              {selectedCampaigns.length < 4 && availableCampaigns.length > selectedCampaigns.length && (
                <Button onClick={addCampaign} variant="outline" className="w-full">
                  + Adicionar Campanha para Comparar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Comparison Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedCampaigns.map((campaignName) => {
              const campaign = campaignsList.find((c) => c.name === campaignName);
              if (!campaign) return null;

              return (
                <Card key={campaignName}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium truncate" title={campaign.name}>
                      {campaign.name}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">
                      {campaign.profile}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Convites:</span>
                      <span className="font-semibold">{campaign.invitations}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conexões:</span>
                      <span className="font-semibold">{campaign.connections}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mensagens:</span>
                      <span className="font-semibold">{campaign.messages}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Positivos:</span>
                      <span className="font-semibold text-success">{campaign.positiveLeads}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">Taxa Aceite:</span>
                      <span className="font-semibold">{campaign.acceptanceRate.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Comparison Charts */}
          {selectedCampaigns.length >= 2 && (
            <>
              {/* Metrics Comparison Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparação de Métricas</CardTitle>
                  <CardDescription>
                    Comparação visual das principais métricas entre campanhas selecionadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      invitations: { label: 'Convites', color: 'hsl(var(--chart-1))' },
                      connections: { label: 'Conexões', color: 'hsl(var(--chart-2))' },
                      messages: { label: 'Mensagens', color: 'hsl(var(--chart-3))' },
                      positiveLeads: { label: 'Positivos', color: 'hsl(var(--chart-4))' },
                    }}
                    className="h-80"
                  >
                    <BarChart
                      data={selectedCampaigns.map((name) => {
                        const c = campaignsList.find((campaign) => campaign.name === name);
                        return {
                          name: name.substring(0, 20) + (name.length > 20 ? '...' : ''),
                          invitations: c?.invitations || 0,
                          connections: c?.connections || 0,
                          messages: c?.messages || 0,
                          positiveLeads: c?.positiveLeads || 0,
                        };
                      })}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="invitations" fill="hsl(var(--chart-1))" />
                      <Bar dataKey="connections" fill="hsl(var(--chart-2))" />
                      <Bar dataKey="messages" fill="hsl(var(--chart-3))" />
                      <Bar dataKey="positiveLeads" fill="hsl(var(--chart-4))" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Acceptance Rate Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Aceite de Conexão</CardTitle>
                  <CardDescription>
                    Comparação da efetividade na conversão de convites em conexões
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      acceptanceRate: { label: 'Taxa de Aceite (%)', color: 'hsl(var(--chart-5))' },
                    }}
                    className="h-64"
                  >
                    <BarChart
                      data={selectedCampaigns.map((name) => {
                        const c = campaignsList.find((campaign) => campaign.name === name);
                        return {
                          name: name.substring(0, 20) + (name.length > 20 ? '...' : ''),
                          acceptanceRate: c?.acceptanceRate || 0,
                        };
                      })}
                      layout="horizontal"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={150} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="acceptanceRate" fill="hsl(var(--chart-5))" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Performance Summary Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo de Performance</CardTitle>
                  <CardDescription>
                    Análise detalhada do desempenho de cada campanha
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead className="text-right">Convites</TableHead>
                        <TableHead className="text-right">Conexões</TableHead>
                        <TableHead className="text-right">Mensagens</TableHead>
                        <TableHead className="text-right">Positivos</TableHead>
                        <TableHead className="text-right">Taxa Aceite</TableHead>
                        <TableHead className="text-right">Conv. Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCampaigns.map((name) => {
                        const c = campaignsList.find((campaign) => campaign.name === name);
                        if (!c) return null;
                        
                        const conversionRate = c.invitations > 0 
                          ? ((c.positiveLeads / c.invitations) * 100).toFixed(2)
                          : '0.00';

                        return (
                          <TableRow key={name}>
                            <TableCell className="font-medium">
                              <div className="max-w-[200px] truncate" title={c.name}>
                                {c.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {c.profile}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{c.invitations}</TableCell>
                            <TableCell className="text-right">{c.connections}</TableCell>
                            <TableCell className="text-right">{c.messages}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="bg-success/10">
                                {c.positiveLeads}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {c.acceptanceRate.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">
                                {conversionRate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Best Performers */}
              <Card>
                <CardHeader>
                  <CardTitle>Melhores Performances</CardTitle>
                  <CardDescription>
                    Identificação das campanhas com melhor desempenho por categoria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      const campaigns = selectedCampaigns
                        .map(name => campaignsList.find(c => c.name === name))
                        .filter(Boolean);
                      
                      const bestAcceptance = campaigns.reduce((max, c) => 
                        c!.acceptanceRate > (max?.acceptanceRate || 0) ? c : max
                      );
                      
                      const bestPositives = campaigns.reduce((max, c) => 
                        c!.positiveLeads > (max?.positiveLeads || 0) ? c : max
                      );
                      
                      const bestConversion = campaigns.reduce((max, c) => {
                        const rate = c!.invitations > 0 ? (c!.positiveLeads / c!.invitations) : 0;
                        const maxRate = max && max.invitations > 0 ? (max.positiveLeads / max.invitations) : 0;
                        return rate > maxRate ? c : max;
                      });

                      return (
                        <>
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-success mt-0.5" />
                            <div className="flex-1">
                              <div className="font-semibold text-sm">Melhor Taxa de Aceite</div>
                              <div className="text-sm text-muted-foreground">{bestAcceptance?.name}</div>
                              <div className="text-lg font-bold text-success mt-1">
                                {bestAcceptance?.acceptanceRate.toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <ArrowUpRight className="h-5 w-5 text-primary mt-0.5" />
                            <div className="flex-1">
                              <div className="font-semibold text-sm">Mais Respostas Positivas</div>
                              <div className="text-sm text-muted-foreground">{bestPositives?.name}</div>
                              <div className="text-lg font-bold text-primary mt-1">
                                {bestPositives?.positiveLeads} leads
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-chart-4 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-semibold text-sm">Melhor Taxa de Conversão</div>
                              <div className="text-sm text-muted-foreground">{bestConversion?.name}</div>
                              <div className="text-lg font-bold mt-1">
                                {bestConversion && bestConversion.invitations > 0
                                  ? ((bestConversion.positiveLeads / bestConversion.invitations) * 100).toFixed(2)
                                  : '0.00'}%
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {selectedCampaigns.length < 2 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione pelo menos 2 campanhas para visualizar a comparação</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Events;
