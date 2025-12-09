import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface WeekData {
  semana?: string;
  campaignName?: string;
  inicioDoPeriodo: string;
  fimDoPeriodo: string;
  convitesEnviados: number;
  conexoesRealizadas: number;
  mensagensEnviadas: number;
  respostasPositivas: number;
  reunioes: number;
  taxaDeAceiteDeConexao: number;
  campanhasAtivas?: string[];
}

interface WeeklyComparisonTableProps {
  weeklyData: WeekData[];
  availableCampaigns: string[];
  view: 'weekly' | 'daily';
}

export function WeeklyComparisonTable({ weeklyData, availableCampaigns, view }: WeeklyComparisonTableProps) {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(
    availableCampaigns.slice(0, 3)
  );

  const handleCampaignToggle = (campaign: string, checked: boolean) => {
    if (checked && selectedCampaigns.length < 5) {
      setSelectedCampaigns([...selectedCampaigns, campaign]);
    } else if (!checked) {
      setSelectedCampaigns(selectedCampaigns.filter(c => c !== campaign));
    }
  };

  // Group data by campaign
  const dataPerCampaign = selectedCampaigns.map(campaign => {
    const campaignWeeks = weeklyData.filter(w => 
      w.campaignName === campaign || w.campanhasAtivas?.includes(campaign)
    ).sort((a, b) => {
      const dateA = a.inicioDoPeriodo.split('/').reverse().join('');
      const dateB = b.inicioDoPeriodo.split('/').reverse().join('');
      return dateA.localeCompare(dateB);
    });

    return {
      campaign,
      weeks: campaignWeeks,
    };
  });

  // Get max number of periods
  const maxPeriods = Math.max(...dataPerCampaign.map(d => d.weeks.length), 0);

  // Metrics to show
  const metrics = [
    { key: 'convitesEnviados', label: 'Convites Enviados' },
    { key: 'conexoesRealizadas', label: 'Conexões Realizadas' },
    { key: 'mensagensEnviadas', label: 'Mensagens Enviadas' },
    { key: 'respostasPositivas', label: 'Respostas Positivas' },
    { key: 'reunioes', label: 'Reuniões' },
    { key: 'taxaDeAceiteDeConexao', label: 'Taxa de Aceite (%)' },
  ];

  return (
    <div className="space-y-6">
      {/* Campaign Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Campanhas para Comparar</CardTitle>
          <CardDescription>Escolha até 5 campanhas (mínimo 1)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableCampaigns.map((campaign, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`campaign-table-${idx}`}
                  checked={selectedCampaigns.includes(campaign)}
                  onCheckedChange={(checked) => handleCampaignToggle(campaign, checked as boolean)}
                  disabled={!selectedCampaigns.includes(campaign) && selectedCampaigns.length >= 5}
                />
                <Label
                  htmlFor={`campaign-table-${idx}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {campaign}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCampaigns.length === 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Selecione pelo menos 1 campanha para visualizar os comparativos.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedCampaigns.length > 0 && maxPeriods > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Comparação {view === 'weekly' ? 'Semanal' : 'Diária'} - Colunas por Período
            </CardTitle>
            <CardDescription>
              {view === 'weekly' ? 'Semanas' : 'Dias'} como colunas, métricas por campanha nas linhas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                      Campanha / Métrica
                    </TableHead>
                    {Array.from({ length: maxPeriods }, (_, i) => (
                      <TableHead key={i} className="text-center min-w-[120px]">
                        {view === 'weekly' ? `${i + 1}ª Semana` : `Dia ${i + 1}`}
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[100px] font-bold">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataPerCampaign.map((campaignData, campaignIdx) => (
                    <>
                      {/* Campaign Header Row */}
                      <TableRow key={`header-${campaignIdx}`} className="bg-muted/50">
                        <TableCell 
                          colSpan={maxPeriods + 2} 
                          className="sticky left-0 bg-muted/50 z-10 font-bold"
                        >
                          <Badge variant="outline" className="mr-2">
                            {campaignIdx + 1}
                          </Badge>
                          {campaignData.campaign}
                        </TableCell>
                      </TableRow>
                      
                      {/* Metric Rows for this Campaign */}
                      {metrics.map((metric, metricIdx) => {
                        const values = campaignData.weeks.map(w => 
                          (w as any)[metric.key] || 0
                        );
                        const total = metric.key === 'taxaDeAceiteDeConexao'
                          ? values.length > 0 
                            ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
                            : '0.0'
                          : values.reduce((a, b) => a + b, 0);

                        return (
                          <TableRow key={`${campaignIdx}-${metricIdx}`}>
                            <TableCell className="sticky left-0 bg-background z-10 pl-8">
                              {metric.label}
                            </TableCell>
                            {Array.from({ length: maxPeriods }, (_, i) => (
                              <TableCell key={i} className="text-center">
                                {values[i] !== undefined 
                                  ? metric.key === 'taxaDeAceiteDeConexao'
                                    ? `${values[i].toFixed(1)}%`
                                    : values[i]
                                  : '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-bold">
                              {metric.key === 'taxaDeAceiteDeConexao' ? `${total}%` : total}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
