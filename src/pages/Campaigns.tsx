import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Plus, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { parseExcelSheets } from '@/utils/excelSheetParser';
import { useCampaignData } from '@/hooks/useCampaignData';
import { groupMetricsByCampaign } from '@/utils/campaignParser';

const Campaigns = () => {
  const { campaignMetrics, setCampaignMetrics, setPositiveLeads, setNegativeLeads } = useCampaignData();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Auto-load the default data file on mount if no data exists
    if (campaignMetrics.length === 0) {
      loadDefaultData();
    }
  }, []);

  const loadDefaultData = async () => {
    setIsLoading(true);
    try {
      const data = await parseExcelSheets('/data/campaign-data.xlsx');
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    toast.info('Processando arquivo de campanha...');

    try {
      const data = await parseExcelSheets(files[0]);
      setCampaignMetrics(data.campaignMetrics);
      setPositiveLeads(data.positiveLeads);
      setNegativeLeads(data.negativeLeads);
      
      toast.success(`Dados importados com sucesso! ${data.campaignMetrics.length} métricas de campanha, ${data.positiveLeads.length} leads positivos, ${data.negativeLeads.length} leads negativos`);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsLoading(false);
    }
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
          
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Campanha
          </Button>
        </div>
      </div>

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
                <Button className="w-full mt-4" variant="outline">
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Campaigns;
