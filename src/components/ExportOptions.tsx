import PptxGenJS from 'pptxgenjs';
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
  const exportToPowerPoint = async () => {
    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      pptx.author = 'Sistema Pronto';
      pptx.title = 'Relatório de Campanhas';
      pptx.subject = 'Análise de Performance de Campanhas';

      // Define colors
      const primaryColor = '3B82F6';
      const successColor = '22C55E';
      const mutedColor = '6B7280';
      const bgColor = 'F8FAFC';

      // Title Slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText('Relatório de Campanhas', {
        x: 0.5,
        y: 2,
        w: '90%',
        h: 1.5,
        fontSize: 44,
        bold: true,
        color: primaryColor,
        align: 'center',
      });
      titleSlide.addText(`Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, {
        x: 0.5,
        y: 3.5,
        w: '90%',
        h: 0.5,
        fontSize: 18,
        color: mutedColor,
        align: 'center',
      });
      titleSlide.addText('Sistema Pronto - Análise de Performance', {
        x: 0.5,
        y: 4.2,
        w: '90%',
        h: 0.5,
        fontSize: 14,
        color: mutedColor,
        align: 'center',
      });

      // Summary Slide - Overview
      if (campaignSummaries.length > 0) {
        const overviewSlide = pptx.addSlide();
        overviewSlide.addText('Visão Geral', {
          x: 0.5,
          y: 0.3,
          w: '90%',
          h: 0.8,
          fontSize: 32,
          bold: true,
          color: primaryColor,
        });

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

        // KPI Cards
        const kpis = [
          { label: 'Total Convites', value: totals.invitations.toLocaleString('pt-BR'), color: primaryColor },
          { label: 'Total Conexões', value: totals.connections.toLocaleString('pt-BR'), color: primaryColor },
          { label: 'Taxa Aceite Média', value: `${avgAcceptanceRate}%`, color: successColor },
          { label: 'Respostas Positivas', value: totals.positiveResponses.toLocaleString('pt-BR'), color: successColor },
          { label: 'Reuniões', value: totals.meetings.toLocaleString('pt-BR'), color: primaryColor },
          { label: 'Campanhas Ativas', value: campaignSummaries.length.toString(), color: mutedColor },
        ];

        kpis.forEach((kpi, idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          const x = 0.5 + col * 3.2;
          const y = 1.3 + row * 1.8;

          overviewSlide.addShape('rect' as any, {
            x,
            y,
            w: 3,
            h: 1.5,
            fill: { color: bgColor },
            line: { color: 'E2E8F0', pt: 1 },
          });
          overviewSlide.addText(kpi.value, {
            x,
            y: y + 0.2,
            w: 3,
            h: 0.8,
            fontSize: 28,
            bold: true,
            color: kpi.color,
            align: 'center',
          });
          overviewSlide.addText(kpi.label, {
            x,
            y: y + 0.9,
            w: 3,
            h: 0.4,
            fontSize: 12,
            color: mutedColor,
            align: 'center',
          });
        });

        // Individual Campaign Slides
        campaignSummaries.forEach((campaign) => {
          const slide = pptx.addSlide();
          
          // Campaign Title
          slide.addText(campaign.name, {
            x: 0.5,
            y: 0.3,
            w: '90%',
            h: 0.8,
            fontSize: 28,
            bold: true,
            color: primaryColor,
          });

          // Period info
          if (campaign.startDate || campaign.endDate) {
            const periodText = `Período: ${campaign.startDate || 'N/A'} - ${campaign.endDate || 'N/A'}`;
            slide.addText(periodText, {
              x: 0.5,
              y: 1,
              w: '90%',
              h: 0.4,
              fontSize: 12,
              color: mutedColor,
            });
          }

          // Metrics Table
          const tableData: any[][] = [
            [
              { text: 'Métrica', options: { bold: true, fill: { color: primaryColor }, color: 'FFFFFF' } },
              { text: 'Valor', options: { bold: true, fill: { color: primaryColor }, color: 'FFFFFF' } },
            ],
            ['Convites Enviados', campaign.invitations.toLocaleString('pt-BR')],
            ['Conexões Realizadas', campaign.connections.toLocaleString('pt-BR')],
            ['Taxa de Aceite', `${campaign.acceptanceRate}%`],
            ['Mensagens Enviadas', campaign.messages.toLocaleString('pt-BR')],
            ['Respostas Positivas', campaign.positiveResponses.toLocaleString('pt-BR')],
            ['Reuniões Marcadas', campaign.meetings.toLocaleString('pt-BR')],
          ];

          if (campaign.proposals !== undefined) {
            tableData.push(['Propostas', campaign.proposals.toLocaleString('pt-BR')]);
          }
          if (campaign.sales !== undefined) {
            tableData.push(['Vendas', campaign.sales.toLocaleString('pt-BR')]);
          }
          if (campaign.activeDays !== undefined) {
            tableData.push(['Dias Ativos', campaign.activeDays.toString()]);
          }

          slide.addTable(tableData, {
            x: 0.5,
            y: 1.5,
            w: 5,
            colW: [3, 2],
            fontSize: 12,
            border: { pt: 0.5, color: 'E2E8F0' },
            align: 'left',
            valign: 'middle',
          });

          // Funnel visualization (simplified bar chart representation)
          const funnelData = [
            { label: 'Convites', value: campaign.invitations, max: campaign.invitations },
            { label: 'Conexões', value: campaign.connections, max: campaign.invitations },
            { label: 'Mensagens', value: campaign.messages, max: campaign.invitations },
            { label: 'Resp. +', value: campaign.positiveResponses, max: campaign.invitations },
            { label: 'Reuniões', value: campaign.meetings, max: campaign.invitations },
          ];

          slide.addText('Funil de Conversão', {
            x: 6,
            y: 1.5,
            w: 3.5,
            h: 0.5,
            fontSize: 14,
            bold: true,
            color: primaryColor,
          });

          funnelData.forEach((item, idx) => {
            const maxWidth = 3.2;
            const barWidth = item.max > 0 ? (item.value / item.max) * maxWidth : 0;
            const y = 2.1 + idx * 0.7;

            slide.addText(item.label, {
              x: 6,
              y,
              w: 1.2,
              h: 0.5,
              fontSize: 10,
              color: mutedColor,
              align: 'right',
            });

            if (barWidth > 0) {
              slide.addShape('rect' as any, {
                x: 7.3,
                y: y + 0.1,
                w: barWidth,
                h: 0.35,
                fill: { color: idx < 2 ? primaryColor : successColor },
              });
            }

            slide.addText(item.value.toLocaleString('pt-BR'), {
              x: 7.3 + barWidth + 0.1,
              y,
              w: 1,
              h: 0.5,
              fontSize: 10,
              bold: true,
              color: '1F2937',
            });
          });

          // Conversion rates
          const conversionRates = [
            { 
              label: 'Conexão/Convite', 
              value: campaign.invitations > 0 
                ? ((campaign.connections / campaign.invitations) * 100).toFixed(1) 
                : '0' 
            },
            { 
              label: 'Resp+/Conexão', 
              value: campaign.connections > 0 
                ? ((campaign.positiveResponses / campaign.connections) * 100).toFixed(1) 
                : '0' 
            },
            { 
              label: 'Reunião/Resp+', 
              value: campaign.positiveResponses > 0 
                ? ((campaign.meetings / campaign.positiveResponses) * 100).toFixed(1) 
                : '0' 
            },
          ];

          slide.addText('Taxas de Conversão', {
            x: 6,
            y: 4.2,
            w: 3.5,
            h: 0.5,
            fontSize: 14,
            bold: true,
            color: primaryColor,
          });

          conversionRates.forEach((rate, idx) => {
            const x = 6 + idx * 1.2;
            slide.addText(`${rate.value}%`, {
              x,
              y: 4.7,
              w: 1.1,
              h: 0.5,
              fontSize: 18,
              bold: true,
              color: successColor,
              align: 'center',
            });
            slide.addText(rate.label, {
              x,
              y: 5.1,
              w: 1.1,
              h: 0.4,
              fontSize: 8,
              color: mutedColor,
              align: 'center',
            });
          });
        });
      }

      // Data Table Slide (if detailed data provided)
      if (data.length > 0) {
        const dataSlide = pptx.addSlide();
        dataSlide.addText('Dados Detalhados', {
          x: 0.5,
          y: 0.3,
          w: '90%',
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: primaryColor,
        });

        // Get columns from first row
        const columns = Object.keys(data[0]).slice(0, 6); // Limit to 6 columns for readability
        const rows = data.slice(0, 10); // Limit to 10 rows

        const tableRows: any[][] = [
          columns.map(col => ({ 
            text: col.length > 15 ? col.substring(0, 15) + '...' : col, 
            options: { bold: true, fill: { color: primaryColor }, color: 'FFFFFF', fontSize: 9 } 
          })),
          ...rows.map(row => 
            columns.map(col => {
              const val = String(row[col] || '-');
              return { text: val.length > 12 ? val.substring(0, 12) + '...' : val, options: { fontSize: 8 } };
            })
          ),
        ];

        dataSlide.addTable(tableRows, {
          x: 0.3,
          y: 1.2,
          w: 9.4,
          fontSize: 8,
          border: { pt: 0.5, color: 'E2E8F0' },
          align: 'center',
          valign: 'middle',
        });

        if (data.length > 10) {
          dataSlide.addText(`Mostrando 10 de ${data.length} registros`, {
            x: 0.5,
            y: 4.8,
            w: '90%',
            h: 0.4,
            fontSize: 10,
            color: mutedColor,
            align: 'center',
          });
        }
      }

      // Final Slide
      const finalSlide = pptx.addSlide();
      finalSlide.addText('Obrigado!', {
        x: 0.5,
        y: 2,
        w: '90%',
        h: 1,
        fontSize: 44,
        bold: true,
        color: primaryColor,
        align: 'center',
      });
      finalSlide.addText('Relatório gerado pelo Sistema Pronto', {
        x: 0.5,
        y: 3.2,
        w: '90%',
        h: 0.5,
        fontSize: 16,
        color: mutedColor,
        align: 'center',
      });

      await pptx.writeFile({ fileName: `${filename}.pptx` });
      toast.success('PowerPoint exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PowerPoint');
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
