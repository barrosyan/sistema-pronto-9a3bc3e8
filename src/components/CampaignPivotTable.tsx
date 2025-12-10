import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { METRICS_ORDER } from '@/constants/metrics';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampaignMetricsData {
  campaignName: string;
  startDate: string | null;
  endDate: string | null;
  activeDays: number;
  convitesEnviados: number;
  conexoesRealizadas: number;
  taxaAceite: string;
  mensagensEnviadas: number;
  visitas: number;
  likes: number;
  comentarios: number;
  totalAtividades: number;
  respostasPositivas: number;
  leadsProcessados: number;
  reunioes: number;
  propostas: number;
  vendas: number;
}

interface CampaignPivotTableProps {
  campaigns: CampaignMetricsData[];
}

export function CampaignPivotTable({ campaigns }: CampaignPivotTableProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatValue = (metric: typeof METRICS_ORDER[number], value: any): string => {
    if (value === null || value === undefined) return '-';
    
    if (metric.type === 'date') {
      return formatDate(value);
    }
    if (metric.type === 'percent') {
      return `${value}%`;
    }
    return String(value);
  };

  // Calculate global totals
  const globalTotals: Record<string, any> = {
    startDate: campaigns.length > 0 
      ? campaigns.reduce((min, c) => {
          if (!c.startDate) return min;
          if (!min) return c.startDate;
          return c.startDate < min ? c.startDate : min;
        }, null as string | null)
      : null,
    endDate: campaigns.length > 0 
      ? campaigns.reduce((max, c) => {
          if (!c.endDate) return max;
          if (!max) return c.endDate;
          return c.endDate > max ? c.endDate : max;
        }, null as string | null)
      : null,
    activeDays: campaigns.reduce((sum, c) => sum + c.activeDays, 0),
    convitesEnviados: campaigns.reduce((sum, c) => sum + c.convitesEnviados, 0),
    conexoesRealizadas: campaigns.reduce((sum, c) => sum + c.conexoesRealizadas, 0),
    mensagensEnviadas: campaigns.reduce((sum, c) => sum + c.mensagensEnviadas, 0),
    visitas: campaigns.reduce((sum, c) => sum + c.visitas, 0),
    likes: campaigns.reduce((sum, c) => sum + c.likes, 0),
    comentarios: campaigns.reduce((sum, c) => sum + c.comentarios, 0),
    totalAtividades: campaigns.reduce((sum, c) => sum + c.totalAtividades, 0),
    respostasPositivas: campaigns.reduce((sum, c) => sum + c.respostasPositivas, 0),
    leadsProcessados: campaigns.reduce((sum, c) => sum + c.leadsProcessados, 0),
    reunioes: campaigns.reduce((sum, c) => sum + c.reunioes, 0),
    propostas: campaigns.reduce((sum, c) => sum + c.propostas, 0),
    vendas: campaigns.reduce((sum, c) => sum + c.vendas, 0),
  };

  const totalConvites = globalTotals.convitesEnviados;
  const totalConexoes = globalTotals.conexoesRealizadas;
  globalTotals.taxaAceite = totalConvites > 0 
    ? ((totalConexoes / totalConvites) * 100).toFixed(1)
    : '0.0';

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhuma campanha encontrada
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Pivot por Campanha</CardTitle>
        <CardDescription>
          Métricas por tipo de dado, com campanhas nas colunas e resultado global
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                  Tipo de Dado / Período
                </TableHead>
                {campaigns.map((campaign, idx) => (
                  <TableHead key={idx} className="text-center min-w-[140px]">
                    {campaign.campaignName}
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[140px] font-bold bg-primary/10">
                  Resultado Global
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {METRICS_ORDER.map((metric) => (
                <TableRow key={metric.key}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    {metric.label}
                  </TableCell>
                  {campaigns.map((campaign, idx) => (
                    <TableCell key={idx} className="text-center">
                      {formatValue(metric, (campaign as any)[metric.key])}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold bg-primary/5">
                    {formatValue(metric, globalTotals[metric.key])}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
