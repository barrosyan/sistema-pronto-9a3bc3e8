import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportOptionsProps {
  data: Record<string, any>[];
  filename?: string;
  campaignSummaries?: CampaignSummary[];
}

interface CampaignSummary {
  name: string;
  invitations: number;
  connections: number;
  messages: number;
  acceptanceRate: string;
  positiveResponses: number;
  meetings: number;
  proposals?: number;
  sales?: number;
  startDate?: string;
  endDate?: string;
  activeDays?: number;
}

export function ExportOptions({ data, filename = 'campanhas', campaignSummaries = [] }: ExportOptionsProps) {
  
  const generatePowerPointHTML = () => {
    const primaryColor = '#3B82F6';
    const successColor = '#22C55E';
    const mutedColor = '#6B7280';

    // Calculate totals
    const totals = campaignSummaries.reduce(
      (acc, c) => ({
        invitations: acc.invitations + c.invitations,
        connections: acc.connections + c.connections,
        messages: acc.messages + c.messages,
        positiveResponses: acc.positiveResponses + c.positiveResponses,
        meetings: acc.meetings + c.meetings,
        proposals: acc.proposals + (c.proposals || 0),
        sales: acc.sales + (c.sales || 0),
      }),
      { invitations: 0, connections: 0, messages: 0, positiveResponses: 0, meetings: 0, proposals: 0, sales: 0 }
    );

    const avgAcceptanceRate = totals.invitations > 0 
      ? ((totals.connections / totals.invitations) * 100).toFixed(1) 
      : '0';

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: landscape; margin: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; }
    .slide { 
      width: 100%; 
      min-height: 100vh; 
      padding: 40px 60px; 
      box-sizing: border-box; 
      page-break-after: always;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }
    .slide:last-child { page-break-after: avoid; }
    .title-slide { 
      display: flex; 
      flex-direction: column; 
      justify-content: center; 
      align-items: center; 
      text-align: center;
    }
    .title-slide h1 { 
      font-size: 48px; 
      color: ${primaryColor}; 
      margin-bottom: 20px;
      font-weight: 700;
    }
    .title-slide p { 
      font-size: 20px; 
      color: ${mutedColor}; 
    }
    h2 { 
      font-size: 32px; 
      color: ${primaryColor}; 
      margin-bottom: 30px;
      border-bottom: 3px solid ${primaryColor};
      padding-bottom: 10px;
    }
    .kpi-grid { 
      display: grid; 
      grid-template-columns: repeat(3, 1fr); 
      gap: 20px; 
      margin-bottom: 30px;
    }
    .kpi-card { 
      background: white; 
      padding: 25px; 
      border-radius: 12px; 
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .kpi-value { 
      font-size: 36px; 
      font-weight: bold; 
      color: ${primaryColor}; 
    }
    .kpi-value.success { color: ${successColor}; }
    .kpi-label { 
      font-size: 14px; 
      color: ${mutedColor}; 
      margin-top: 8px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 20px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }
    th { 
      background: ${primaryColor}; 
      color: white; 
      padding: 12px 16px; 
      text-align: left;
      font-size: 14px;
    }
    td { 
      padding: 12px 16px; 
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    tr:nth-child(even) { background: #f8fafc; }
    .funnel-container { 
      display: flex; 
      gap: 30px; 
      margin-top: 20px;
    }
    .funnel-left { flex: 1; }
    .funnel-right { flex: 1; }
    .funnel-bar { 
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }
    .funnel-label { 
      width: 120px; 
      font-size: 13px;
      color: ${mutedColor};
    }
    .funnel-bar-container { 
      flex: 1; 
      height: 28px; 
      background: #e2e8f0; 
      border-radius: 4px;
      overflow: hidden;
    }
    .funnel-bar-fill { 
      height: 100%; 
      background: ${primaryColor};
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      color: white;
      font-weight: bold;
      font-size: 12px;
    }
    .rate-cards { 
      display: flex; 
      gap: 20px; 
      margin-top: 30px;
    }
    .rate-card { 
      background: white; 
      padding: 20px; 
      border-radius: 8px;
      text-align: center;
      flex: 1;
    }
    .rate-value { 
      font-size: 28px; 
      font-weight: bold; 
      color: ${successColor};
    }
    .rate-label { 
      font-size: 12px; 
      color: ${mutedColor};
      margin-top: 5px;
    }
    .period-info {
      font-size: 14px;
      color: ${mutedColor};
      margin-bottom: 20px;
    }
    .thank-you { 
      display: flex; 
      flex-direction: column; 
      justify-content: center; 
      align-items: center; 
      text-align: center;
    }
    .thank-you h1 { 
      font-size: 52px; 
      color: ${primaryColor}; 
    }
  </style>
</head>
<body>
  <!-- Title Slide -->
  <div class="slide title-slide">
    <h1>Relatório de Campanhas</h1>
    <p>Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
    <p style="margin-top: 10px;">Sistema Pronto - Análise de Performance</p>
  </div>
`;

    // Overview slide
    if (campaignSummaries.length > 0) {
      html += `
  <!-- Overview Slide -->
  <div class="slide">
    <h2>Visão Geral</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">${totals.invitations.toLocaleString('pt-BR')}</div>
        <div class="kpi-label">Total Convites</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${totals.connections.toLocaleString('pt-BR')}</div>
        <div class="kpi-label">Total Conexões</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value success">${avgAcceptanceRate}%</div>
        <div class="kpi-label">Taxa Aceite Média</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value success">${totals.positiveResponses.toLocaleString('pt-BR')}</div>
        <div class="kpi-label">Respostas Positivas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${totals.meetings.toLocaleString('pt-BR')}</div>
        <div class="kpi-label">Reuniões</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color: ${mutedColor}">${campaignSummaries.length}</div>
        <div class="kpi-label">Campanhas Ativas</div>
      </div>
    </div>
  </div>
`;

      // Individual campaign slides
      campaignSummaries.forEach((campaign) => {
        const funnelData = [
          { label: 'Convites', value: campaign.invitations, max: campaign.invitations },
          { label: 'Conexões', value: campaign.connections, max: campaign.invitations },
          { label: 'Mensagens', value: campaign.messages, max: campaign.invitations },
          { label: 'Resp. +', value: campaign.positiveResponses, max: campaign.invitations },
          { label: 'Reuniões', value: campaign.meetings, max: campaign.invitations },
        ];

        const convRateConn = campaign.invitations > 0 ? ((campaign.connections / campaign.invitations) * 100).toFixed(1) : '0';
        const convRateResp = campaign.connections > 0 ? ((campaign.positiveResponses / campaign.connections) * 100).toFixed(1) : '0';
        const convRateMeet = campaign.positiveResponses > 0 ? ((campaign.meetings / campaign.positiveResponses) * 100).toFixed(1) : '0';

        html += `
  <!-- Campaign: ${campaign.name} -->
  <div class="slide">
    <h2>${campaign.name}</h2>
    ${campaign.startDate || campaign.endDate ? `<p class="period-info">Período: ${campaign.startDate || 'N/A'} - ${campaign.endDate || 'N/A'} | ${campaign.activeDays || 0} dias ativos</p>` : ''}
    <div class="funnel-container">
      <div class="funnel-left">
        <table>
          <tr><th>Métrica</th><th>Valor</th></tr>
          <tr><td>Convites Enviados</td><td><strong>${campaign.invitations.toLocaleString('pt-BR')}</strong></td></tr>
          <tr><td>Conexões Realizadas</td><td><strong>${campaign.connections.toLocaleString('pt-BR')}</strong></td></tr>
          <tr><td>Taxa de Aceite</td><td><strong>${campaign.acceptanceRate}%</strong></td></tr>
          <tr><td>Mensagens Enviadas</td><td><strong>${campaign.messages.toLocaleString('pt-BR')}</strong></td></tr>
          <tr><td>Respostas Positivas</td><td><strong style="color:${successColor}">${campaign.positiveResponses.toLocaleString('pt-BR')}</strong></td></tr>
          <tr><td>Reuniões Marcadas</td><td><strong>${campaign.meetings.toLocaleString('pt-BR')}</strong></td></tr>
          ${campaign.proposals !== undefined ? `<tr><td>Propostas</td><td><strong>${campaign.proposals.toLocaleString('pt-BR')}</strong></td></tr>` : ''}
          ${campaign.sales !== undefined ? `<tr><td>Vendas</td><td><strong style="color:${successColor}">${campaign.sales.toLocaleString('pt-BR')}</strong></td></tr>` : ''}
        </table>
      </div>
      <div class="funnel-right">
        <h3 style="margin-bottom:15px;color:${primaryColor}">Funil de Conversão</h3>
        ${funnelData.map(item => {
          const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0;
          return `
        <div class="funnel-bar">
          <span class="funnel-label">${item.label}</span>
          <div class="funnel-bar-container">
            <div class="funnel-bar-fill" style="width:${Math.max(pct, 5)}%;${pct < 50 ? `background:${successColor}` : ''}">${item.value.toLocaleString('pt-BR')}</div>
          </div>
        </div>`;
        }).join('')}
        <div class="rate-cards">
          <div class="rate-card">
            <div class="rate-value">${convRateConn}%</div>
            <div class="rate-label">Conexão/Convite</div>
          </div>
          <div class="rate-card">
            <div class="rate-value">${convRateResp}%</div>
            <div class="rate-label">Resp+/Conexão</div>
          </div>
          <div class="rate-card">
            <div class="rate-value">${convRateMeet}%</div>
            <div class="rate-label">Reunião/Resp+</div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
      });
    }

    // Thank you slide
    html += `
  <!-- Thank You Slide -->
  <div class="slide thank-you">
    <h1>Obrigado!</h1>
    <p style="font-size:18px;color:${mutedColor}">Relatório gerado pelo Sistema Pronto</p>
  </div>
</body>
</html>`;

    return html;
  };

  const exportToPowerPoint = async () => {
    try {
      const htmlContent = generatePowerPointHTML();
      
      // Create a Blob with the HTML content
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-powerpoint' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.ppt`;
      link.click();
      
      toast.success('Apresentação exportada com sucesso! Abra o arquivo no PowerPoint para visualizar.');
    } catch (error) {
      toast.error('Erro ao exportar apresentação');
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar Apresentação</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={exportToPowerPoint} className="w-full" size="lg">
          <Presentation className="mr-2 h-5 w-5" />
          Baixar PowerPoint
        </Button>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {campaignSummaries.length > 0 
            ? `${campaignSummaries.length} campanha(s) incluída(s) na apresentação`
            : `${data.length} registros prontos para apresentação`
          }
        </p>
      </CardContent>
    </Card>
  );
}
