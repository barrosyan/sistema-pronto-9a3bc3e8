import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeeklyMetricsData {
  weekNumber: number;
  startDate: string;
  endDate: string;
  activeCampaigns: string[];
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

interface WeeklyPivotTableProps {
  weeks: WeeklyMetricsData[];
}

const WEEKLY_METRICS = [
  { key: 'startDate', label: 'Início do Período', type: 'date' },
  { key: 'endDate', label: 'Fim do Período', type: 'date' },
  { key: 'activeCampaigns', label: 'Campanhas Ativas', type: 'campaigns' },
  { key: 'activeDays', label: 'Dias Ativos', type: 'number' },
  { key: 'convitesEnviados', label: 'Convites Enviados', type: 'number' },
  { key: 'conexoesRealizadas', label: 'Conexões Realizadas', type: 'number' },
  { key: 'taxaAceite', label: 'Taxa de Aceite de Conexão', type: 'percent' },
  { key: 'mensagensEnviadas', label: 'Mensagens Enviadas', type: 'number' },
  { key: 'visitas', label: 'Visitas', type: 'number' },
  { key: 'likes', label: 'Likes', type: 'number' },
  { key: 'comentarios', label: 'Comentários', type: 'number' },
  { key: 'totalAtividades', label: 'Total de Atividades', type: 'number' },
  { key: 'respostasPositivas', label: 'Respostas Positivas', type: 'number' },
  { key: 'leadsProcessados', label: 'Leads Processados', type: 'number' },
  { key: 'reunioes', label: 'Reuniões', type: 'number' },
  { key: 'propostas', label: 'Propostas', type: 'number' },
  { key: 'vendas', label: 'Vendas', type: 'number' },
] as const;

export function WeeklyPivotTable({ weeks }: WeeklyPivotTableProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatValue = (metric: typeof WEEKLY_METRICS[number], value: any): React.ReactNode => {
    if (value === null || value === undefined) return '-';
    
    if (metric.type === 'date') {
      return formatDate(value);
    }
    if (metric.type === 'percent') {
      return `${value}%`;
    }
    if (metric.type === 'campaigns') {
      const campaigns = value as string[];
      if (campaigns.length === 0) return '-';
      return (
        <div className="flex flex-wrap gap-1 justify-center">
          {campaigns.map((c, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {c}
            </Badge>
          ))}
        </div>
      );
    }
    return String(value);
  };

  if (weeks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum dado semanal encontrado
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Pivot por Semana</CardTitle>
        <CardDescription>
          Métricas agregadas por semana, com dados de todas as campanhas consolidados
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
                {weeks.map((week) => (
                  <TableHead key={week.weekNumber} className="text-center min-w-[140px]">
                    {week.weekNumber}ª Semana
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {WEEKLY_METRICS.map((metric) => (
                <TableRow key={metric.key}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    {metric.label}
                  </TableCell>
                  {weeks.map((week) => (
                    <TableCell key={week.weekNumber} className="text-center">
                      {formatValue(metric, (week as any)[metric.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
