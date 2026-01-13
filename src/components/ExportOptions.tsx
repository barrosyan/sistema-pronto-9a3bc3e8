import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Presentation, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface ExportOptionsProps {
  data: Record<string, any>[];
  filename?: string;
  campaignSummaries?: CampaignSummary[];
  dailyDataByCampaign?: Record<string, DailyData[]>;
}

interface DailyData {
  date: string;
  invitations: number;
  connections: number;
  messages: number;
  visits: number;
  likes: number;
  comments: number;
  positiveResponses: number;
  meetings: number;
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

interface CampaignSlideData {
  name: string;
  periodLabel: string;
  activeDays: number;
  invitations: number;
  connections: number;
  messages: number;
  acceptanceRate: string;
  positiveResponses: number;
  meetings: number;
  proposals: number;
  sales: number;
}

export function ExportOptions({ 
  data, 
  filename = 'campanhas', 
  campaignSummaries = [],
  dailyDataByCampaign = {}
}: ExportOptionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const exportToCsv = () => {
    setIsExportingCsv(true);
    try {
      if (data.length === 0) {
        toast.error('Nenhum dado para exportar');
        return;
      }

      const allKeys = new Set<string>();
      data.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
      });
      const headers = Array.from(allKeys);

      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        )
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
      console.error(error);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Calculate weekly data from daily data
  const getWeeklyMetrics = (dailyData: DailyData[]): Omit<CampaignSlideData, 'name' | 'periodLabel' | 'acceptanceRate'> => {
    const today = new Date();
    const weekAgo = subDays(today, 7);
    
    const weeklyData = dailyData.filter(d => {
      const date = parseISO(d.date);
      return (isAfter(date, weekAgo) || isEqual(date, weekAgo)) && (isBefore(date, today) || isEqual(date, today));
    });

    const activeDays = weeklyData.filter(d => 
      d.invitations > 0 || d.connections > 0 || d.messages > 0
    ).length;

    return {
      activeDays,
      invitations: weeklyData.reduce((sum, d) => sum + d.invitations, 0),
      connections: weeklyData.reduce((sum, d) => sum + d.connections, 0),
      messages: weeklyData.reduce((sum, d) => sum + d.messages, 0),
      positiveResponses: weeklyData.reduce((sum, d) => sum + d.positiveResponses, 0),
      meetings: weeklyData.reduce((sum, d) => sum + d.meetings, 0),
      proposals: 0,
      sales: 0,
    };
  };

  // Add a campaign slide with proper formatting
  const addCampaignSlide = (
    pptx: any, 
    slideData: CampaignSlideData, 
    isWeekly: boolean,
    primaryColor: string,
    successColor: string,
    mutedColor: string
  ) => {
    const slide = pptx.addSlide();
    
    // Title with view type indicator
    const titleSuffix = isWeekly ? ' (Visão Semanal)' : ' (Visão Geral)';
    slide.addText(slideData.name + titleSuffix, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.7,
      fontSize: 24,
      bold: true,
      color: primaryColor,
    });

    // Period info
    slide.addText(`Período: ${slideData.periodLabel} | ${slideData.activeDays} dias ativos`, {
      x: 0.5,
      y: 0.9,
      w: 9,
      h: 0.35,
      fontSize: 11,
      color: mutedColor,
    });

    // Metrics Table - Left side
    const tableData: any[][] = [
      [
        { text: 'Métrica', options: { bold: true, fill: { color: primaryColor }, color: 'FFFFFF', fontSize: 11 } },
        { text: 'Valor', options: { bold: true, fill: { color: primaryColor }, color: 'FFFFFF', fontSize: 11 } },
      ],
      ['Convites Enviados', slideData.invitations.toLocaleString('pt-BR')],
      ['Conexões Realizadas', slideData.connections.toLocaleString('pt-BR')],
      ['Taxa de Aceite', slideData.acceptanceRate],
      ['Mensagens Enviadas', slideData.messages.toLocaleString('pt-BR')],
      ['Respostas Positivas', slideData.positiveResponses.toLocaleString('pt-BR')],
      ['Reuniões Marcadas', slideData.meetings.toLocaleString('pt-BR')],
      ['Propostas', slideData.proposals.toLocaleString('pt-BR')],
      ['Vendas', slideData.sales.toLocaleString('pt-BR')],
    ];

    slide.addTable(tableData, {
      x: 0.5,
      y: 1.35,
      w: 4.8,
      colW: [2.8, 2],
      fontSize: 10,
      border: { pt: 0.5, color: 'E2E8F0' },
      align: 'left',
      valign: 'middle',
      rowH: 0.38,
    });

    // Funnel visualization - Right side
    slide.addText('Funil de Conversão', {
      x: 5.6,
      y: 1.35,
      w: 4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: primaryColor,
    });

    // Calculate max for funnel scaling
    const funnelMax = Math.max(slideData.invitations, slideData.connections, slideData.messages, 1);
    
    const funnelData = [
      { label: 'Convites', value: slideData.invitations, color: primaryColor },
      { label: 'Conexões', value: slideData.connections, color: primaryColor },
      { label: 'Mensagens', value: slideData.messages, color: successColor },
      { label: 'Resp. +', value: slideData.positiveResponses, color: successColor },
    ];

    funnelData.forEach((item, idx) => {
      const maxWidth = 2.8;
      const barWidth = funnelMax > 0 ? (item.value / funnelMax) * maxWidth : 0;
      const y = 1.85 + idx * 0.55;

      // Label
      slide.addText(item.label, {
        x: 5.6,
        y,
        w: 1.1,
        h: 0.4,
        fontSize: 9,
        color: mutedColor,
        align: 'right',
      });

      // Bar
      if (barWidth > 0) {
        slide.addShape('rect', {
          x: 6.8,
          y: y + 0.08,
          w: Math.max(barWidth, 0.15),
          h: 0.28,
          fill: { color: item.color },
        });
      }

      // Value
      slide.addText(item.value.toLocaleString('pt-BR'), {
        x: 6.85 + Math.max(barWidth, 0.15),
        y,
        w: 0.8,
        h: 0.4,
        fontSize: 10,
        bold: true,
        color: '1F2937',
      });
    });

    // Conversion rates section
    slide.addText('Taxas de Conversão', {
      x: 5.6,
      y: 4.1,
      w: 4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: primaryColor,
    });

    // Parse acceptance rate
    const acceptanceValue = parseFloat(slideData.acceptanceRate.replace('%', '').replace(',', '.')) || 0;
    const respPerConnection = slideData.connections > 0 
      ? ((slideData.positiveResponses / slideData.connections) * 100).toFixed(1)
      : '0';
    const meetingPerResp = slideData.positiveResponses > 0 
      ? ((slideData.meetings / slideData.positiveResponses) * 100).toFixed(1)
      : '0';

    const conversionRates = [
      { label: 'Conexão/Convite', value: `${acceptanceValue.toFixed(1)}%` },
      { label: 'Resp+/Conexão', value: `${respPerConnection}%` },
      { label: 'Reunião/Resp+', value: `${meetingPerResp}%` },
    ];

    conversionRates.forEach((rate, idx) => {
      const x = 5.6 + idx * 1.35;
      
      slide.addText(rate.value, {
        x,
        y: 4.55,
        w: 1.25,
        h: 0.45,
        fontSize: 16,
        bold: true,
        color: successColor,
        align: 'center',
      });
      
      slide.addText(rate.label, {
        x,
        y: 4.95,
        w: 1.25,
        h: 0.3,
        fontSize: 8,
        color: mutedColor,
        align: 'center',
      });
    });
  };

  // Add overview slide with KPI cards
  const addOverviewSlide = (
    pptx: any,
    title: string,
    totals: { invitations: number; connections: number; messages: number; positiveResponses: number; meetings: number },
    campaignCount: number,
    primaryColor: string,
    successColor: string,
    mutedColor: string,
    bgColor: string
  ) => {
    const slide = pptx.addSlide();
    
    slide.addText(title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.7,
      fontSize: 32,
      bold: true,
      color: primaryColor,
    });

    const avgAcceptanceRate = totals.invitations > 0 
      ? ((totals.connections / totals.invitations) * 100).toFixed(1) 
      : '0';

    const kpis = [
      { label: 'Total Convites', value: totals.invitations.toLocaleString('pt-BR'), color: primaryColor },
      { label: 'Total Conexões', value: totals.connections.toLocaleString('pt-BR'), color: primaryColor },
      { label: 'Taxa Aceite Média', value: `${avgAcceptanceRate}%`, color: successColor },
      { label: 'Respostas Positivas', value: totals.positiveResponses.toLocaleString('pt-BR'), color: successColor },
      { label: 'Reuniões', value: totals.meetings.toLocaleString('pt-BR'), color: primaryColor },
      { label: 'Campanhas Ativas', value: campaignCount.toString(), color: mutedColor },
    ];

    kpis.forEach((kpi, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = 0.5 + col * 3.2;
      const y = 1.3 + row * 2;

      slide.addShape('rect', {
        x,
        y,
        w: 3,
        h: 1.6,
        fill: { color: bgColor },
        line: { color: 'E2E8F0', pt: 1 },
      });
      
      slide.addText(kpi.value, {
        x,
        y: y + 0.3,
        w: 3,
        h: 0.7,
        fontSize: 32,
        bold: true,
        color: kpi.color,
        align: 'center',
      });
      
      slide.addText(kpi.label, {
        x,
        y: y + 1,
        w: 3,
        h: 0.4,
        fontSize: 12,
        color: mutedColor,
        align: 'center',
      });
    });
  };

  const exportToPowerPoint = async () => {
    setIsExporting(true);
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      
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

      // ===== 1. Title Slide =====
      const titleSlide = pptx.addSlide();
      titleSlide.addText('Relatório de Campanhas', {
        x: 0.5,
        y: 2,
        w: 9,
        h: 1.2,
        fontSize: 44,
        bold: true,
        color: primaryColor,
        align: 'center',
      });
      titleSlide.addText(`Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, {
        x: 0.5,
        y: 3.3,
        w: 9,
        h: 0.5,
        fontSize: 18,
        color: mutedColor,
        align: 'center',
      });
      titleSlide.addText('Sistema Pronto - Análise de Performance', {
        x: 0.5,
        y: 3.9,
        w: 9,
        h: 0.5,
        fontSize: 14,
        color: mutedColor,
        align: 'center',
      });

      if (campaignSummaries.length > 0) {
        // Calculate overall totals (all time)
        const overallTotals = campaignSummaries.reduce(
          (acc, c) => ({
            invitations: acc.invitations + c.invitations,
            connections: acc.connections + c.connections,
            messages: acc.messages + c.messages,
            positiveResponses: acc.positiveResponses + c.positiveResponses,
            meetings: acc.meetings + c.meetings,
          }),
          { invitations: 0, connections: 0, messages: 0, positiveResponses: 0, meetings: 0 }
        );

        // Calculate weekly totals from daily data
        let weeklyTotals = { invitations: 0, connections: 0, messages: 0, positiveResponses: 0, meetings: 0 };
        
        if (Object.keys(dailyDataByCampaign).length > 0) {
          campaignSummaries.forEach(campaign => {
            const dailyData = dailyDataByCampaign[campaign.name] || [];
            const weeklyMetrics = getWeeklyMetrics(dailyData);
            weeklyTotals.invitations += weeklyMetrics.invitations;
            weeklyTotals.connections += weeklyMetrics.connections;
            weeklyTotals.messages += weeklyMetrics.messages;
            weeklyTotals.positiveResponses += weeklyMetrics.positiveResponses;
            weeklyTotals.meetings += weeklyMetrics.meetings;
          });
        } else {
          // Fallback to overall totals if no daily data
          weeklyTotals = { ...overallTotals };
        }

        // ===== 2. Overall View Slide =====
        addOverviewSlide(
          pptx,
          'Visão Geral',
          overallTotals,
          campaignSummaries.length,
          primaryColor,
          successColor,
          mutedColor,
          bgColor
        );

        // ===== 3. Weekly View Slide =====
        addOverviewSlide(
          pptx,
          'Visão Semanal',
          weeklyTotals,
          campaignSummaries.length,
          primaryColor,
          successColor,
          mutedColor,
          bgColor
        );

        // ===== 4. Individual Campaign Slides (Weekly + General for each) =====
        campaignSummaries.forEach(campaign => {
          const dailyData = dailyDataByCampaign[campaign.name] || [];
          const weeklyMetrics = getWeeklyMetrics(dailyData);
          
          // Get weekly period label
          const today = new Date();
          const weekAgo = subDays(today, 7);
          const weeklyPeriodLabel = `${format(weekAgo, 'yyyy-MM-dd')} - ${format(today, 'yyyy-MM-dd')}`;
          
          // Weekly acceptance rate
          const weeklyAcceptanceRate = weeklyMetrics.invitations > 0
            ? `${((weeklyMetrics.connections / weeklyMetrics.invitations) * 100).toFixed(1)}%`
            : 'N/A';

          // ===== Campaign Weekly Slide =====
          addCampaignSlide(
            pptx,
            {
              name: campaign.name,
              periodLabel: weeklyPeriodLabel,
              activeDays: weeklyMetrics.activeDays,
              invitations: weeklyMetrics.invitations,
              connections: weeklyMetrics.connections,
              messages: weeklyMetrics.messages,
              acceptanceRate: weeklyAcceptanceRate,
              positiveResponses: weeklyMetrics.positiveResponses,
              meetings: weeklyMetrics.meetings,
              proposals: weeklyMetrics.proposals,
              sales: weeklyMetrics.sales,
            },
            true,
            primaryColor,
            successColor,
            mutedColor
          );

          // ===== Campaign General Slide =====
          const generalPeriodLabel = campaign.startDate && campaign.endDate
            ? `${campaign.startDate} - ${campaign.endDate}`
            : 'N/A';

          addCampaignSlide(
            pptx,
            {
              name: campaign.name,
              periodLabel: generalPeriodLabel,
              activeDays: campaign.activeDays || 0,
              invitations: campaign.invitations,
              connections: campaign.connections,
              messages: campaign.messages,
              acceptanceRate: campaign.acceptanceRate ? `${campaign.acceptanceRate}%` : 'N/A',
              positiveResponses: campaign.positiveResponses,
              meetings: campaign.meetings,
              proposals: campaign.proposals || 0,
              sales: campaign.sales || 0,
            },
            false,
            primaryColor,
            successColor,
            mutedColor
          );
        });
      }

      // ===== 5. Final Slide =====
      const finalSlide = pptx.addSlide();
      finalSlide.addText('Obrigado!', {
        x: 0.5,
        y: 2,
        w: 9,
        h: 1,
        fontSize: 44,
        bold: true,
        color: primaryColor,
        align: 'center',
      });
      finalSlide.addText('Relatório gerado pelo Sistema Pronto', {
        x: 0.5,
        y: 3.2,
        w: 9,
        h: 0.5,
        fontSize: 16,
        color: mutedColor,
        align: 'center',
      });

      await pptx.writeFile({ fileName: `${filename}-${format(new Date(), 'yyyy-MM-dd')}.pptx` });
      toast.success('PowerPoint exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PowerPoint');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar Dados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={exportToCsv} variant="outline" size="lg" disabled={isExportingCsv}>
            {isExportingCsv ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-5 w-5" />
            )}
            {isExportingCsv ? 'Gerando...' : 'Baixar CSV'}
          </Button>
          <Button onClick={exportToPowerPoint} size="lg" disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Presentation className="mr-2 h-5 w-5" />
            )}
            {isExporting ? 'Gerando...' : 'Baixar PowerPoint'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {campaignSummaries.length > 0 
            ? `${campaignSummaries.length} campanha(s) incluída(s)`
            : `${data.length} registros prontos para exportação`
          }
        </p>
      </CardContent>
    </Card>
  );
}
