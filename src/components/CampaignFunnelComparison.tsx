import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface FunnelData {
  invitations: number;
  connections: number;
  messages: number;
  positiveResponses: number;
  meetings: number;
  proposals: number;
  sales: number;
  visits: number;
  likes: number;
  comments: number;
  acceptanceRate: string;
  proposalValue: number;
  salesValue: number;
}

interface CampaignFunnelComparisonProps {
  campaignName: string;
  period1Data: FunnelData;
  period2Data: FunnelData;
  period1: DateRange;
  period2: DateRange;
}

export function CampaignFunnelComparison({ 
  campaignName, 
  period1Data, 
  period2Data,
  period1,
  period2
}: CampaignFunnelComparisonProps) {
  const calculateChange = (current: number, previous: number): { 
    percentage: number; 
    trend: 'up' | 'down' | 'neutral' 
  } => {
    if (previous === 0) {
      return { percentage: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'neutral' };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(change),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const funnelMetrics = [
    { label: 'Convites Enviados', period1: period1Data.invitations, period2: period2Data.invitations },
    { label: 'Conexões Realizadas', period1: period1Data.connections, period2: period2Data.connections },
    { label: 'Mensagens Enviadas', period1: period1Data.messages, period2: period2Data.messages },
    { label: 'Respostas Positivas', period1: period1Data.positiveResponses, period2: period2Data.positiveResponses },
    { label: 'Reuniões Marcadas', period1: period1Data.meetings, period2: period2Data.meetings },
    { label: 'Propostas', period1: period1Data.proposals, period2: period2Data.proposals },
    { label: 'Vendas', period1: period1Data.sales, period2: period2Data.sales }
  ];

  const formatPeriod = (period: DateRange) => {
    if (!period.from) return '';
    if (!period.to) return format(period.from, "dd/MM/yy", { locale: ptBR });
    return `${format(period.from, "dd/MM/yy", { locale: ptBR })} - ${format(period.to, "dd/MM/yy", { locale: ptBR })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{campaignName}</CardTitle>
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">Período 1</Badge>
            <span>{formatPeriod(period1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">Período 2</Badge>
            <span>{formatPeriod(period2)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funnel Comparison */}
        <div className="space-y-3">
          {funnelMetrics.map((metric) => {
            const change = calculateChange(metric.period2, metric.period1);
            
            return (
              <div key={metric.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{metric.label}</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(change.trend)}
                    <span className={getTrendColor(change.trend)}>
                      {change.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <div className="text-xs text-muted-foreground">P1</div>
                    <div className="text-lg font-bold">{metric.period1}</div>
                  </div>
                  <div className="bg-primary/10 rounded p-2 text-center">
                    <div className="text-xs text-muted-foreground">P2</div>
                    <div className="text-lg font-bold">{metric.period2}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Metrics Comparison */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <div className="text-xs font-medium">Taxa de Aceite</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{period1Data.acceptanceRate}%</span>
              <span className="text-xs text-muted-foreground">→</span>
              <span className="text-sm font-semibold text-primary">{period2Data.acceptanceRate}%</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium">Visitas ao Perfil</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{period1Data.visits}</span>
              <span className="text-xs text-muted-foreground">→</span>
              <span className="text-sm font-semibold text-primary">{period2Data.visits}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium">Curtidas</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{period1Data.likes}</span>
              <span className="text-xs text-muted-foreground">→</span>
              <span className="text-sm font-semibold text-primary">{period2Data.likes}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium">Comentários</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{period1Data.comments}</span>
              <span className="text-xs text-muted-foreground">→</span>
              <span className="text-sm font-semibold text-primary">{period2Data.comments}</span>
            </div>
          </div>
        </div>

        {/* Financial Comparison */}
        {(period1Data.proposalValue > 0 || period2Data.proposalValue > 0 || 
          period1Data.salesValue > 0 || period2Data.salesValue > 0) && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="text-xs font-medium">Total $ Propostas</div>
              <div className="space-y-1">
                <div className="text-sm">P1: R$ {period1Data.proposalValue.toFixed(2)}</div>
                <div className="text-sm font-bold text-primary">P2: R$ {period2Data.proposalValue.toFixed(2)}</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium">Total $ Vendas</div>
              <div className="space-y-1">
                <div className="text-sm">P1: R$ {period1Data.salesValue.toFixed(2)}</div>
                <div className="text-sm font-bold text-primary">P2: R$ {period2Data.salesValue.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="text-xs font-medium mb-2">Resumo da Evolução</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            {(() => {
              const invChange = calculateChange(period2Data.invitations, period1Data.invitations);
              const convChange = calculateChange(period2Data.positiveResponses, period1Data.positiveResponses);
              
              return (
                <>
                  <p>
                    • Convites: <span className={getTrendColor(invChange.trend)}>
                      {invChange.trend === 'up' ? '+' : invChange.trend === 'down' ? '-' : ''}
                      {invChange.percentage.toFixed(1)}%
                    </span>
                  </p>
                  <p>
                    • Respostas Positivas: <span className={getTrendColor(convChange.trend)}>
                      {convChange.trend === 'up' ? '+' : convChange.trend === 'down' ? '-' : ''}
                      {convChange.percentage.toFixed(1)}%
                    </span>
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
