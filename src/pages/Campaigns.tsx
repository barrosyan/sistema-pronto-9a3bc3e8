import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Plus, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { parseExcelSheets } from '@/utils/excelSheetParser';
import { useCampaignData } from '@/hooks/useCampaignData';
import { groupMetricsByCampaign } from '@/utils/campaignParser';
import { supabase } from '@/integrations/supabase/client';
import { CampaignDialog } from '@/components/CampaignDialog';

const Campaigns = () => {
  const navigate = useNavigate();
  const { campaignMetrics, addCampaignMetrics, addPositiveLeads, addNegativeLeads, setCampaignMetrics, setPositiveLeads, setNegativeLeads, loadFromDatabase } = useCampaignData();
  const [isLoading, setIsLoading] = useState(false);
  const [inputData, setInputData] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadFromDatabase();
  }, []);

  const loadDataFromDatabase = async () => {
    setIsLoading(true);
    try {
      // Load campaign metrics from database
      const { data: metricsData, error: metricsError } = await supabase
        .from('campaign_metrics')
        .select('*');

      if (metricsError) throw metricsError;

      // Load leads from database
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*');

      if (leadsError) throw leadsError;

      if (metricsData && metricsData.length > 0) {
        const parsedMetrics = metricsData.map(m => ({
          campaignName: m.campaign_name,
          eventType: m.event_type,
          profileName: m.profile_name,
          totalCount: m.total_count,
          dailyData: (typeof m.daily_data === 'object' && m.daily_data !== null) 
            ? (m.daily_data as Record<string, number>) 
            : {}
        }));
        setCampaignMetrics(parsedMetrics);
      } else {
        // If database is empty, load from default file
        await loadDefaultData();
      }

      if (leadsData && leadsData.length > 0) {
        const positive = leadsData
          .filter(l => l.status === 'positive')
          .map(l => mapDatabaseLeadToType(l));
        const negative = leadsData
          .filter(l => l.status === 'negative')
          .map(l => mapDatabaseLeadToType(l));
        
        setPositiveLeads(positive);
        setNegativeLeads(negative);
      }
    } catch (error) {
      console.error('Error loading data from database:', error);
      toast.error('Erro ao carregar dados do banco');
    } finally {
      setIsLoading(false);
    }
  };

  const mapDatabaseLeadToType = (dbLead: any): any => {
    return {
      id: dbLead.id,
      campaign: dbLead.campaign,
      linkedin: dbLead.linkedin,
      name: dbLead.name,
      position: dbLead.position,
      company: dbLead.company,
      status: dbLead.status,
      positiveResponseDate: dbLead.positive_response_date,
      transferDate: dbLead.transfer_date,
      statusDetails: dbLead.status_details,
      comments: dbLead.comments,
      followUp1Date: dbLead.follow_up_1_date,
      followUp1Comments: dbLead.follow_up_1_comments,
      followUp2Date: dbLead.follow_up_2_date,
      followUp2Comments: dbLead.follow_up_2_comments,
      followUp3Date: dbLead.follow_up_3_date,
      followUp3Comments: dbLead.follow_up_3_comments,
      followUp4Date: dbLead.follow_up_4_date,
      followUp4Comments: dbLead.follow_up_4_comments,
      observations: dbLead.observations,
      meetingScheduleDate: dbLead.meeting_schedule_date,
      meetingDate: dbLead.meeting_date,
      proposalDate: dbLead.proposal_date,
      proposalValue: dbLead.proposal_value,
      saleDate: dbLead.sale_date,
      saleValue: dbLead.sale_value,
      profile: dbLead.profile,
      classification: dbLead.classification,
      attendedWebinar: dbLead.attended_webinar,
      whatsapp: dbLead.whatsapp,
      standDay: dbLead.stand_day,
      pavilion: dbLead.pavilion,
      stand: dbLead.stand,
      negativeResponseDate: dbLead.negative_response_date,
      hadFollowUp: dbLead.had_follow_up,
      followUpReason: dbLead.follow_up_reason,
    };
  };

  const loadDefaultData = async () => {
    setIsLoading(true);
    try {
      const data = await parseExcelSheets('/data/campaign-data.xlsx');
      await saveToDatabase(data.campaignMetrics, data.positiveLeads, data.negativeLeads);
      setCampaignMetrics(data.campaignMetrics);
      setPositiveLeads(data.positiveLeads);
      setNegativeLeads(data.negativeLeads);
      toast.success(`Dados carregados: ${data.campaignMetrics.length} métricas, ${data.positiveLeads.length} leads positivos, ${data.negativeLeads.length} leads negativos`);
    } catch (error) {
      console.error('Error loading default data:', error);
      toast.error('Erro ao carregar dados padrão');
    } finally {
      setIsLoading(false);
    }
  };

  const saveToDatabase = async (metrics: any[], posLeads: any[], negLeads: any[]) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Save campaign metrics
      const metricsToInsert = metrics.map(m => ({
        campaign_name: m.campaignName,
        event_type: m.eventType,
        profile_name: m.profileName,
        total_count: m.totalCount,
        daily_data: m.dailyData,
        user_id: user.id
      }));

      const { error: metricsError } = await supabase
        .from('campaign_metrics')
        .upsert(metricsToInsert, { onConflict: 'campaign_name,event_type,profile_name' });

      if (metricsError) {
        console.error('Error saving metrics:', metricsError);
      }

      // Save leads
      const allLeads = [...posLeads, ...negLeads];
      const leadsToInsert = allLeads.map(l => ({
        campaign: l.campaign,
        linkedin: l.linkedin,
        name: l.name,
        position: l.position,
        company: l.company,
        status: l.status,
        user_id: user.id,
        positive_response_date: l.positiveResponseDate,
        transfer_date: l.transferDate,
        status_details: l.statusDetails,
        comments: l.comments,
        follow_up_1_date: l.followUp1Date,
        follow_up_1_comments: l.followUp1Comments,
        follow_up_2_date: l.followUp2Date,
        follow_up_2_comments: l.followUp2Comments,
        follow_up_3_date: l.followUp3Date,
        follow_up_3_comments: l.followUp3Comments,
        follow_up_4_date: l.followUp4Date,
        follow_up_4_comments: l.followUp4Comments,
        observations: l.observations,
        meeting_schedule_date: l.meetingScheduleDate,
        meeting_date: l.meetingDate,
        proposal_date: l.proposalDate,
        proposal_value: l.proposalValue,
        sale_date: l.saleDate,
        sale_value: l.saleValue,
        profile: l.profile,
        classification: l.classification,
        attended_webinar: l.attendedWebinar,
        whatsapp: l.whatsapp,
        stand_day: l.standDay,
        pavilion: l.pavilion,
        stand: l.stand,
        negative_response_date: l.negativeResponseDate,
        had_follow_up: l.hadFollowUp,
        follow_up_reason: l.followUpReason,
      }));

      const { error: leadsError } = await supabase
        .from('leads')
        .insert(leadsToInsert);

      if (leadsError) {
        console.error('Error saving leads:', leadsError);
      }

      toast.success('Dados salvos no banco de dados com sucesso!');
    } catch (error) {
      console.error('Error saving to database:', error);
      toast.error('Erro ao salvar no banco de dados');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    toast.info('Processando arquivo de campanha...');

    try {
      const data = await parseExcelSheets(files[0]);
      await addCampaignMetrics(data.campaignMetrics);
      await addPositiveLeads(data.positiveLeads);
      await addNegativeLeads(data.negativeLeads);
      
      toast.success(`Dados adicionados com sucesso! ${data.campaignMetrics.length} métricas, ${data.positiveLeads.length} leads positivos, ${data.negativeLeads.length} leads negativos`);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async (data: any) => {
    toast.success(`Campanha "${data.name}" criada com sucesso!`);
    setIsDialogOpen(false);
  };

  const groupedCampaigns = groupMetricsByCampaign(campaignMetrics);
  const campaignsList = Array.from(groupedCampaigns.entries()).map(([name, metrics]) => {
    const invitations = metrics.find(m => m.eventType === 'Connection Requests Sent')?.totalCount || 0;
    const connections = metrics.find(m => m.eventType === 'Connection Requests Accepted')?.totalCount || 0;
    const acceptanceRate = invitations > 0 ? ((connections / invitations) * 100).toFixed(1) : '0';
    
    return {
      id: name,
      name,
      profile: metrics[0]?.profileName || '',
      isActive: true,
      invitations,
      connections,
      acceptanceRate
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campanhas Ativas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e acompanhe suas campanhas de prospecção
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadDefaultData} disabled={isLoading}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isLoading ? 'Carregando...' : 'Recarregar Dados'}
          </Button>
          
          <Button variant="outline" onClick={() => document.getElementById('campaign-upload')?.click()} disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Arquivo
          </Button>
          <input
            id="campaign-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Campanha
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados Adicionais de Entrada</CardTitle>
          <CardDescription>
            Cole aqui dados adicionais para processar junto com o upload de arquivos (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Cole aqui dados de campanhas, métricas ou observações adicionais..."
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          {inputData && (
            <p className="text-sm text-muted-foreground mt-2">
              {inputData.split('\n').length} linhas de dados inseridas
            </p>
          )}
        </CardContent>
      </Card>

      {campaignsList.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma campanha encontrada
              </h3>
              <p className="text-muted-foreground mb-6">
                Importe dados de campanhas ou crie uma nova para começar
              </p>
              <Button onClick={() => document.getElementById('campaign-upload')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Importar Primeira Campanha
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaignsList.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{campaign.name}</CardTitle>
                <CardDescription>{campaign.profile}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={campaign.isActive ? 'text-success' : 'text-muted-foreground'}>
                      {campaign.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Convites:</span>
                    <span className="font-medium">{campaign.invitations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conexões:</span>
                    <span className="font-medium">{campaign.connections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa de Aceite:</span>
                    <span className="font-medium">{campaign.acceptanceRate}%</span>
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => navigate(`/campaign/${encodeURIComponent(campaign.name)}`)}
                >
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CampaignDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleCreateCampaign}
      />
    </div>
  );
};

export default Campaigns;
