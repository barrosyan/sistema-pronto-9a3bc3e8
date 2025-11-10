import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, Mail, Calendar } from 'lucide-react';
import { useCampaignData } from '@/hooks/useCampaignData';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  // Get all dates from daily data
  const allDates = new Set<string>();
  campaignData.forEach(metric => {
    if (metric.dailyData) {
      Object.keys(metric.dailyData).forEach(date => allDates.add(date));
    }
  });

  const sortedDates = Array.from(allDates).sort();
  
  // Get daily metrics
  const getDailyMetrics = (date: string) => {
    return {
      invitations: campaignData.find(m => m.eventType === 'Connection Requests Sent')?.dailyData?.[date] || 0,
      connections: campaignData.find(m => m.eventType === 'Connection Requests Accepted')?.dailyData?.[date] || 0,
      messages: campaignData.find(m => m.eventType === 'Messages Sent')?.dailyData?.[date] || 0,
      profileVisits: campaignData.find(m => m.eventType === 'Profile Visits')?.dailyData?.[date] || 0,
      likes: campaignData.find(m => m.eventType === 'Post Likes')?.dailyData?.[date] || 0,
      comments: campaignData.find(m => m.eventType === 'Comments Done')?.dailyData?.[date] || 0,
    };
  };

  // Get weekly metrics
  const getWeeklyMetrics = () => {
    if (sortedDates.length === 0) return [];

    const startDate = new Date(sortedDates[0]);
    const endDate = new Date(sortedDates[sortedDates.length - 1]);
    
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 0 });
    
    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })
        .map(day => format(day, 'yyyy-MM-dd'))
        .filter(day => sortedDates.includes(day));

      const weekMetrics = {
        weekStart: format(weekStart, 'dd/MM/yyyy', { locale: ptBR }),
        weekEnd: format(weekEnd, 'dd/MM/yyyy', { locale: ptBR }),
        invitations: 0,
        connections: 0,
        messages: 0,
        profileVisits: 0,
        likes: 0,
        comments: 0,
      };

      daysInWeek.forEach(day => {
        const dayMetrics = getDailyMetrics(day);
        weekMetrics.invitations += dayMetrics.invitations;
        weekMetrics.connections += dayMetrics.connections;
        weekMetrics.messages += dayMetrics.messages;
        weekMetrics.profileVisits += dayMetrics.profileVisits;
        weekMetrics.likes += dayMetrics.likes;
        weekMetrics.comments += dayMetrics.comments;
      });

      return weekMetrics;
    });
  };

  const weeklyMetrics = getWeeklyMetrics();

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

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="daily">Visão Diária</TabsTrigger>
          <TabsTrigger value="weekly">Visão Semanal</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métricas Diárias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Data</TableHead>
                      <TableHead className="text-right">Convites</TableHead>
                      <TableHead className="text-right">Conexões</TableHead>
                      <TableHead className="text-right">Mensagens</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead className="text-right">Comentários</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDates.map((date) => {
                      const metrics = getDailyMetrics(date);
                      const formattedDate = format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
                      const dayOfWeek = format(new Date(date), 'EEEE', { locale: ptBR });
                      
                      return (
                        <TableRow key={date}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{formattedDate}</span>
                              <span className="text-xs text-muted-foreground capitalize">{dayOfWeek}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{metrics.invitations}</TableCell>
                          <TableCell className="text-right">{metrics.connections}</TableCell>
                          <TableCell className="text-right">{metrics.messages}</TableCell>
                          <TableCell className="text-right">{metrics.profileVisits}</TableCell>
                          <TableCell className="text-right">{metrics.likes}</TableCell>
                          <TableCell className="text-right">{metrics.comments}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métricas Semanais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Semana</TableHead>
                      <TableHead className="text-right">Convites</TableHead>
                      <TableHead className="text-right">Conexões</TableHead>
                      <TableHead className="text-right">Mensagens</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead className="text-right">Comentários</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyMetrics.map((week, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {week.weekStart} - {week.weekEnd}
                        </TableCell>
                        <TableCell className="text-right">{week.invitations}</TableCell>
                        <TableCell className="text-right">{week.connections}</TableCell>
                        <TableCell className="text-right">{week.messages}</TableCell>
                        <TableCell className="text-right">{week.profileVisits}</TableCell>
                        <TableCell className="text-right">{week.likes}</TableCell>
                        <TableCell className="text-right">{week.comments}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
