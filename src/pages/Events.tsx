import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useEventAnalysis } from '@/hooks/useEventAnalysis';
import { CampaignComparison } from '@/components/CampaignComparison';
import { groupMetricsByCampaign } from '@/utils/campaignParser';
import { Users, Calendar, Search, Filter, GitCompare } from 'lucide-react';
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

const Events = () => {
  const { campaignMetrics, getAllLeads } = useCampaignData();
  const { getEventLeadsAnalysis, getRecurrentLeads, getRecommendedApproach } = useEventAnalysis();
  
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [campaign1, setCampaign1] = useState<string>('');
  const [campaign2, setCampaign2] = useState<string>('');

  const eventAnalysis = getEventLeadsAnalysis();
  const recurrentLeads = getRecurrentLeads();
  const groupedCampaigns = groupMetricsByCampaign(campaignMetrics);

  const campaignsList = Array.from(groupedCampaigns.entries()).map(([name, metrics]) => {
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
  });

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
    if (!campaign1 || !campaign2) return null;
    
    const c1 = campaignsList.find(c => c.name === campaign1);
    const c2 = campaignsList.find(c => c.name === campaign2);
    
    if (!c1 || !c2) return null;
    
    return { campaign1: c1, campaign2: c2 };
  };

  const comparisonData = getComparisonData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Análise de Eventos</h1>
        <p className="text-muted-foreground mt-1">
          Compare campanhas, visualize leads por evento e identifique participantes recorrentes
        </p>
      </div>

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
              {eventAnalysis.length > 0 ? (
                eventAnalysis.map(event => (
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
    </div>
  );
};

export default Events;
