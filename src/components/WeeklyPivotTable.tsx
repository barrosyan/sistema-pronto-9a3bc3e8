import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EditableCell } from './EditableCell';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

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
  // Campos de detalhamento
  observacoes?: string;
  problemasTecnicos?: string;
  ajustesNaPesquisa?: string;
  analiseComparativa?: string;
}

interface WeeklyPivotTableProps {
  weeks: WeeklyMetricsData[];
  editable?: boolean;
  onDateUpdate?: (weekNumber: number, field: 'startDate' | 'endDate', value: string) => void;
  onMetricUpdate?: (weekNumber: number, metricKey: string, value: number) => void;
  onDetailUpdate?: (weekNumber: number, field: string, value: string) => void;
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

const CONVERSION_RATES = [
  { key: 'respostasConvites', label: 'Respostas Positivas/Convites Enviados', calc: (w: WeeklyMetricsData) => w.convitesEnviados > 0 ? ((w.respostasPositivas / w.convitesEnviados) * 100).toFixed(1) : '-' },
  { key: 'respostasConexoes', label: 'Respostas Positivas/Conexões Realizadas', calc: (w: WeeklyMetricsData) => w.conexoesRealizadas > 0 ? ((w.respostasPositivas / w.conexoesRealizadas) * 100).toFixed(1) : '-' },
  { key: 'respostasMensagens', label: 'Respostas Positivas/Mensagens Enviadas', calc: (w: WeeklyMetricsData) => w.mensagensEnviadas > 0 ? ((w.respostasPositivas / w.mensagensEnviadas) * 100).toFixed(1) : '-' },
  { key: 'reunioesRespostas', label: 'Número de reuniões/Respostas Positivas', calc: (w: WeeklyMetricsData) => w.respostasPositivas > 0 ? ((w.reunioes / w.respostasPositivas) * 100).toFixed(1) : '-' },
  { key: 'reunioesConvites', label: 'Número de reuniões/Convites Enviados', calc: (w: WeeklyMetricsData) => w.convitesEnviados > 0 ? ((w.reunioes / w.convitesEnviados) * 100).toFixed(1) : '-' },
] as const;

const DETAIL_FIELDS = [
  { key: 'observacoes', label: 'Observações' },
  { key: 'problemasTecnicos', label: 'Problemas Técnicos' },
  { key: 'ajustesNaPesquisa', label: 'Ajustes na Pesquisa' },
  { key: 'analiseComparativa', label: 'Análise Comparativa' },
] as const;

const EDITABLE_NUMBER_METRICS = [
  'activeDays', 'convitesEnviados', 'conexoesRealizadas', 'mensagensEnviadas',
  'visitas', 'likes', 'comentarios', 'respostasPositivas', 'leadsProcessados',
  'reunioes', 'propostas', 'vendas'
];

export function WeeklyPivotTable({ weeks, editable = false, onDateUpdate, onMetricUpdate, onDetailUpdate }: WeeklyPivotTableProps) {
  const [localDetails, setLocalDetails] = useState<Record<number, Record<string, string>>>({});

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatValue = (metric: typeof WEEKLY_METRICS[number], value: any, weekNumber: number): React.ReactNode => {
    if (value === null || value === undefined) return '-';
    
    // Editable date fields
    if (metric.type === 'date' && editable && onDateUpdate) {
      return (
        <EditableCell
          value={value || '-'}
          type="date"
          editable={true}
          onSave={(newValue) => onDateUpdate(weekNumber, metric.key as 'startDate' | 'endDate', String(newValue))}
        />
      );
    }
    
    // Non-editable date display
    if (metric.type === 'date') {
      return formatDate(value);
    }
    
    // Editable number fields
    if (metric.type === 'number' && editable && onMetricUpdate && EDITABLE_NUMBER_METRICS.includes(metric.key)) {
      return (
        <EditableCell
          value={value}
          type="number"
          editable={true}
          onSave={(newValue) => onMetricUpdate(weekNumber, metric.key, Number(newValue))}
        />
      );
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

  const handleDetailChange = (weekNumber: number, field: string, value: string) => {
    setLocalDetails(prev => ({
      ...prev,
      [weekNumber]: {
        ...(prev[weekNumber] || {}),
        [field]: value
      }
    }));
    onDetailUpdate?.(weekNumber, field, value);
  };

  const getDetailValue = (week: WeeklyMetricsData, field: string): string => {
    return localDetails[week.weekNumber]?.[field] ?? (week as any)[field] ?? '';
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
    <div className="space-y-6">
      {/* Métricas Principais */}
      <Card>
        <CardHeader>
          <CardTitle>Visão Pivot por Semana</CardTitle>
          <CardDescription>
            Métricas agregadas por semana, com dados de todas as campanhas consolidados
            {editable && <span className="text-primary ml-2">(Duplo clique para editar)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[220px] text-left align-middle">
                    Tipo de Dado / Período
                  </TableHead>
                  {weeks.map((week) => (
                    <TableHead key={week.weekNumber} className="text-center min-w-[120px] align-middle">
                      {week.weekNumber}ª Semana
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {WEEKLY_METRICS.map((metric) => (
                  <TableRow key={metric.key}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium text-left align-middle">
                      {metric.label}
                    </TableCell>
                    {weeks.map((week) => (
                      <TableCell key={week.weekNumber} className="text-center align-middle">
                        {formatValue(metric, (week as any)[metric.key], week.weekNumber)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Taxas de Conversão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Taxas de Conversão</CardTitle>
          <CardDescription>
            Métricas de conversão calculadas por semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[280px] text-left align-middle">
                    Taxa / Semana
                  </TableHead>
                  {weeks.map((week) => (
                    <TableHead key={week.weekNumber} className="text-center min-w-[120px] align-middle">
                      {week.weekNumber}ª Semana
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {CONVERSION_RATES.map((rate) => (
                  <TableRow key={rate.key}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium text-left align-middle">
                      {rate.label}
                    </TableCell>
                    {weeks.map((week) => {
                      const value = rate.calc(week);
                      return (
                        <TableCell key={week.weekNumber} className="text-center align-middle">
                          {value === '-' ? '-' : `${value}%`}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detalhamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhamento</CardTitle>
          <CardDescription>
            Observações, problemas e análises por semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[180px] text-left align-middle">
                    Campo / Semana
                  </TableHead>
                  {weeks.map((week) => (
                    <TableHead key={week.weekNumber} className="text-center min-w-[180px] align-middle">
                      {week.weekNumber}ª Semana
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {DETAIL_FIELDS.map((field) => (
                  <TableRow key={field.key}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium text-left align-middle">
                      {field.label}
                    </TableCell>
                    {weeks.map((week) => (
                      <TableCell key={week.weekNumber} className="text-center align-middle p-2">
                        {editable ? (
                          <Textarea
                            className="min-h-[60px] text-sm resize-none"
                            placeholder="-"
                            value={getDetailValue(week, field.key)}
                            onChange={(e) => handleDetailChange(week.weekNumber, field.key, e.target.value)}
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {getDetailValue(week, field.key) || '-'}
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}