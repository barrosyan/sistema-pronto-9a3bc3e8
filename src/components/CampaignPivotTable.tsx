import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { METRICS_ORDER } from '@/constants/metrics';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { EditableCell } from './EditableCell';

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
  respostasNegativas: number;
  leadsProcessados: number;
  reunioes: number;
  propostas: number;
  vendas: number;
}

interface CampaignPivotTableProps {
  campaigns: CampaignMetricsData[];
  onMetricUpdate?: (campaignName: string, metricKey: string, value: number) => void;
  onAddMetricEntry?: (campaignName: string, metricKey: string, date: string, value: number) => void;
  onDateUpdate?: (campaignName: string, field: 'startDate' | 'endDate', value: string) => void;
  editable?: boolean;
}

// Metrics that can be edited (numeric, not calculated)
const EDITABLE_METRICS = [
  'convitesEnviados',
  'conexoesRealizadas', 
  'mensagensEnviadas',
  'visitas',
  'likes',
  'comentarios',
  'respostasPositivas',
  'respostasNegativas',
  'reunioes',
  'propostas',
  'vendas'
];

const EDITABLE_DATE_FIELDS = ['startDate', 'endDate'];

export function CampaignPivotTable({ 
  campaigns, 
  onMetricUpdate,
  onAddMetricEntry,
  onDateUpdate,
  editable = false 
}: CampaignPivotTableProps) {
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    campaignName: string;
    metricKey: string;
    metricLabel: string;
    currentValue: number;
  } | null>(null);

  const [addDialog, setAddDialog] = useState<{
    open: boolean;
    campaignName: string;
    metricKey: string;
    metricLabel: string;
  } | null>(null);

  const [editValue, setEditValue] = useState('');
  const [addDate, setAddDate] = useState('');
  const [addValue, setAddValue] = useState('');

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

  const handleCellClick = (campaign: CampaignMetricsData, metric: typeof METRICS_ORDER[number]) => {
    if (!editable || !EDITABLE_METRICS.includes(metric.key)) return;
    
    const currentValue = (campaign as any)[metric.key] || 0;
    setEditValue(String(currentValue));
    setEditDialog({
      open: true,
      campaignName: campaign.campaignName,
      metricKey: metric.key,
      metricLabel: metric.label,
      currentValue
    });
  };

  const handleAddClick = (campaign: CampaignMetricsData, metric: typeof METRICS_ORDER[number]) => {
    if (!editable || !EDITABLE_METRICS.includes(metric.key)) return;
    
    setAddDate(format(new Date(), 'yyyy-MM-dd'));
    setAddValue('');
    setAddDialog({
      open: true,
      campaignName: campaign.campaignName,
      metricKey: metric.key,
      metricLabel: metric.label
    });
  };

  const handleSaveEdit = () => {
    if (!editDialog || !onMetricUpdate) return;
    
    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue < 0) {
      toast.error('Valor inválido');
      return;
    }

    onMetricUpdate(editDialog.campaignName, editDialog.metricKey, newValue);
    setEditDialog(null);
  };

  const handleSaveAdd = () => {
    if (!addDialog || !onAddMetricEntry) return;
    
    const value = parseFloat(addValue);
    if (isNaN(value) || value < 0) {
      toast.error('Valor inválido');
      return;
    }

    if (!addDate) {
      toast.error('Data é obrigatória');
      return;
    }

    onAddMetricEntry(addDialog.campaignName, addDialog.metricKey, addDate, value);
    setAddDialog(null);
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
    respostasNegativas: campaigns.reduce((sum, c) => sum + (c.respostasNegativas || 0), 0),
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

  const isEditable = (metricKey: string) => editable && EDITABLE_METRICS.includes(metricKey);
  const isDateEditable = (metricKey: string) => editable && EDITABLE_DATE_FIELDS.includes(metricKey) && onDateUpdate;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Visão Pivot por Campanha
            {editable && (
              <span className="text-xs font-normal text-muted-foreground">
                (clique nas células para editar)
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Métricas por tipo de dado, com campanhas nas colunas e resultado global
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px] text-left align-middle">
                    Tipo de Dado / Período
                  </TableHead>
                  {campaigns.map((campaign, idx) => (
                    <TableHead key={idx} className="text-center min-w-[140px] align-middle">
                      {campaign.campaignName}
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[140px] font-bold bg-primary/10 align-middle">
                    Resultado Global
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {METRICS_ORDER.map((metric) => (
                  <TableRow key={metric.key}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium text-left align-middle">
                      {metric.label}
                    </TableCell>
                    {campaigns.map((campaign, idx) => (
                      <TableCell 
                        key={idx} 
                        className={`text-center align-middle ${isEditable(metric.key) ? 'cursor-pointer hover:bg-accent/50 group relative' : ''}`}
                        onClick={() => !isDateEditable(metric.key) && handleCellClick(campaign, metric)}
                      >
                        {isDateEditable(metric.key) ? (
                          <EditableCell
                            value={(campaign as any)[metric.key] || '-'}
                            type="date"
                            editable={true}
                            onSave={(newValue) => {
                              onDateUpdate?.(campaign.campaignName, metric.key as 'startDate' | 'endDate', String(newValue));
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span>{formatValue(metric, (campaign as any)[metric.key])}</span>
                            {isEditable(metric.key) && (
                              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                <Edit2 className="h-3 w-3 text-muted-foreground" />
                                {onAddMetricEntry && (
                                  <Plus 
                                    className="h-3 w-3 text-muted-foreground hover:text-primary" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddClick(campaign, metric);
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold bg-primary/5 align-middle">
                      {formatValue(metric, globalTotals[metric.key])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog?.open || false} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {editDialog?.metricLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campanha</Label>
              <Input value={editDialog?.campaignName || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Valor Atual: {editDialog?.currentValue}</Label>
              <Input 
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Novo valor"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Entry Dialog */}
      <Dialog open={addDialog?.open || false} onOpenChange={(open) => !open && setAddDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar {addDialog?.metricLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campanha</Label>
              <Input value={addDialog?.campaignName || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input 
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input 
                type="number"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                placeholder="Valor"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(null)}>Cancelar</Button>
            <Button onClick={handleSaveAdd}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
