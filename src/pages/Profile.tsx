import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCampaignData } from '@/hooks/useCampaignData';
import { useProfileFilter } from '@/contexts/ProfileFilterContext';
import { Separator } from '@/components/ui/separator';

export default function Profile() {
  const { campaignMetrics, getAllLeads, loadFromDatabase, isLoading } = useCampaignData();
  const { selectedProfile } = useProfileFilter();
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');

  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  // Extract unique campaigns from database - filter by selected profile
  const uniqueCampaigns = Array.from(
    new Set(
      campaignMetrics
        .filter(m => !selectedProfile || m.profileName === selectedProfile)
        .map(m => m.campaignName)
        .filter(Boolean)
    )
  );

  // Filter metrics and leads based on selected campaign AND selected profile
  const filteredMetrics = campaignMetrics.filter(m => {
    const matchesProfile = !selectedProfile || m.profileName === selectedProfile;
    const matchesCampaign = selectedCampaign === 'all' || m.campaignName === selectedCampaign;
    return matchesProfile && matchesCampaign;
  });
  
  const allLeads = getAllLeads();
  const filteredLeads = selectedCampaign === 'all'
    ? allLeads
    : allLeads.filter(l => l.campaign === selectedCampaign);

  // Reset selected campaign when profile changes if it's not available
  useEffect(() => {
    if (selectedCampaign !== 'all' && !uniqueCampaigns.includes(selectedCampaign)) {
      setSelectedCampaign('all');
    }
  }, [selectedProfile, uniqueCampaigns, selectedCampaign]);

  // Calculate consolidated metrics from filtered campaigns
  const calculateMetrics = () => {
    const totals = {
      convitesEnviados: 0,
      conexoesRealizadas: 0,
      mensagensEnviadas: 0,
      visitas: 0,
      likes: 0,
      comentarios: 0
    };

    filteredMetrics.forEach(metric => {
      Object.values(metric.dailyData || {}).forEach(value => {
        if (metric.eventType === 'Connection Requests Sent') {
          totals.convitesEnviados += value;
        } else if (metric.eventType === 'Connection Requests Accepted') {
          totals.conexoesRealizadas += value;
        } else if (metric.eventType === 'Messages Sent') {
          totals.mensagensEnviadas += value;
        } else if (metric.eventType === 'Profile Visits') {
          totals.visitas += value;
        } else if (metric.eventType === 'Post Likes') {
          totals.likes += value;
        } else if (metric.eventType === 'Comments Done') {
          totals.comentarios += value;
        }
      });
    });

    const positiveLeads = filteredLeads.filter(l => l.status === 'positive');
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
    </div>
  );
}
