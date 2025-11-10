import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, Mail, Calendar } from 'lucide-react';
import { useCampaignData } from '@/hooks/useCampaignData';

const CampaignDetails = () => {
  const { campaignName } = useParams<{ campaignName: string }>();
  const navigate = useNavigate();
  const { campaignMetrics, positiveLeads, negativeLeads } = useCampaignData();
  
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    if (campaignName) {
      const decodedName = decodeURIComponent(campaignName);
      const campaignData = campaignMetrics.filter(m => m.campaignName === decodedName);
      setMetrics(campaignData);
    }
  }, [campaignName, campaignMetrics]);

  if (!campaignName || metrics.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Campanha não encontrada
              </h3>
              <Button onClick={() => navigate('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Campanhas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const decodedName = decodeURIComponent(campaignName);
  const profileName = metrics[0]?.profileName || '';
  
  const invitations = metrics.find(m => m.eventType === 'Connection Requests Sent')?.totalCount || 0;
  const connections = metrics.find(m => m.eventType === 'Connection Requests Accepted')?.totalCount || 0;
  const messages = metrics.find(m => m.eventType === 'Messages Sent')?.totalCount || 0;
  const visits = metrics.find(m => m.eventType === 'Profile Visits')?.totalCount || 0;
  const likes = metrics.find(m => m.eventType === 'Post Likes')?.totalCount || 0;
  const comments = metrics.find(m => m.eventType === 'Comments Done')?.totalCount || 0;

  const campaignLeads = [...positiveLeads, ...negativeLeads].filter(
    lead => lead.campaign.includes(decodedName)
  );
  
  const positiveCount = campaignLeads.filter(l => l.status === 'positive').length;
  const meetingsCount = campaignLeads.filter(l => l.meetingDate).length;
  const proposalsCount = campaignLeads.filter(l => l.proposalDate).length;
  const salesCount = campaignLeads.filter(l => l.saleDate).length;

  const acceptanceRate = invitations > 0 ? ((connections / invitations) * 100).toFixed(1) : '0';
  const responseRate = connections > 0 ? ((positiveCount / connections) * 100).toFixed(1) : '0';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{decodedName}</h1>
          <p className="text-muted-foreground mt-1">Perfil: {profileName}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Convites Enviados</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conexões Realizadas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections}</div>
            <p className="text-xs text-muted-foreground">Taxa: {acceptanceRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Respostas Positivas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positiveCount}</div>
            <p className="text-xs text-muted-foreground">Taxa: {responseRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Marcadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meetingsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Atividade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{visits}</div>
              <div className="text-sm text-muted-foreground">Visitas a Perfil</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{messages}</div>
              <div className="text-sm text-muted-foreground">Mensagens Enviadas</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{likes}</div>
              <div className="text-sm text-muted-foreground">Likes</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{comments}</div>
              <div className="text-sm text-muted-foreground">Comentários</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: 'Convites Enviados', value: invitations, width: '100%' },
              { label: 'Conexões Realizadas', value: connections, width: invitations > 0 ? `${(connections/invitations)*100}%` : '0%' },
              { label: 'Mensagens Enviadas', value: messages, width: invitations > 0 ? `${(messages/invitations)*100}%` : '0%' },
              { label: 'Respostas Positivas', value: positiveCount, width: invitations > 0 ? `${(positiveCount/invitations)*100}%` : '0%' },
              { label: 'Reuniões Marcadas', value: meetingsCount, width: invitations > 0 ? `${(meetingsCount/invitations)*100}%` : '0%' },
              { label: 'Propostas', value: proposalsCount, width: invitations > 0 ? `${(proposalsCount/invitations)*100}%` : '0%' },
              { label: 'Vendas', value: salesCount, width: invitations > 0 ? `${(salesCount/invitations)*100}%` : '0%' },
            ].map((stage, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{stage.label}</span>
                  <span className="text-sm text-muted-foreground">{stage.value}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all" 
                    style={{ width: stage.width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leads Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">{campaignLeads.length}</div>
              <div className="text-sm text-muted-foreground">Total de Leads</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success">{positiveCount}</div>
              <div className="text-sm text-muted-foreground">Positivos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-destructive">
                {campaignLeads.filter(l => l.status === 'negative').length}
              </div>
              <div className="text-sm text-muted-foreground">Negativos</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignDetails;
