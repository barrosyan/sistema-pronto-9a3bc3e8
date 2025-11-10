import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, Mail, Calendar } from 'lucide-react';
import { useCampaignData } from '@/hooks/useCampaignData';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const CampaignDetails = () => {
  const { campaignName } = useParams<{ campaignName: string }>();
  const navigate = useNavigate();
  const { campaignMetrics, getAllLeads } = useCampaignData();

  const decodedName = decodeURIComponent(campaignName || '');
  const campaignData = campaignMetrics.filter(m => m.campaignName === decodedName);
  const campaignLeads = getAllLeads().filter(l => l.campaign.includes(decodedName.split(' ')[0]));

  if (!campaignData.length) {
    return (
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Campanha não encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invitations = campaignData.find(m => m.eventType === 'Connection Requests Sent')?.totalCount || 0;
  const connections = campaignData.find(m => m.eventType === 'Connection Requests Accepted')?.totalCount || 0;
  const messages = campaignData.find(m => m.eventType === 'Messages Sent')?.totalCount || 0;
  const profileVisits = campaignData.find(m => m.eventType === 'Profile Visits')?.totalCount || 0;
  const likes = campaignData.find(m => m.eventType === 'Post Likes')?.totalCount || 0;
  const comments = campaignData.find(m => m.eventType === 'Comments Done')?.totalCount || 0;

  const acceptanceRate = invitations > 0 ? ((connections / invitations) * 100).toFixed(1) : '0';
  const positiveLeads = campaignLeads.filter(l => l.status === 'positive').length;
  const meetings = campaignLeads.filter(l => l.meetingDate).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground">{decodedName}</h1>
        <p className="text-muted-foreground mt-1">
          Perfil: {campaignData[0]?.profileName}
        </p>
      </div>

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
            <div className="text-2xl font-bold">{positiveLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Marcadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meetings}</div>
          </CardContent>
        </Card>
      </div>

      {campaignLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leads da Campanha ({campaignLeads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>LinkedIn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignLeads.slice(0, 10).map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.company}</TableCell>
                    <TableCell>
                      {lead.status === 'positive' ? (
                        <Badge className="bg-success text-success-foreground">Positivo</Badge>
                      ) : (
                        <Badge variant="destructive">Negativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                        Ver Perfil
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CampaignDetails;
