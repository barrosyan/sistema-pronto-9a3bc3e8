import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface CampaignFunnelChartProps {
  campaignName: string;
  data: FunnelData;
}

export function CampaignFunnelChart({ campaignName, data }: CampaignFunnelChartProps) {
  const funnelStages = [
    { label: 'Convites Enviados', value: data.invitations, color: 'bg-[#ef4444]' },
    { label: 'Conexões Realizadas', value: data.connections, color: 'bg-[#ec4899]' },
    { label: 'Mensagens Enviadas', value: data.messages, color: 'bg-[#f97316]' },
    { label: 'Respostas Positivas', value: data.positiveResponses, color: 'bg-[#f59e0b]' },
    { label: 'Reuniões Marcadas', value: data.meetings, color: 'bg-[#d97706]' },
    { label: 'Propostas', value: data.proposals, color: 'bg-[#ea580c]' },
    { label: 'Vendas', value: data.sales, color: 'bg-[#f97316]' }
  ];

  const maxValue = Math.max(...funnelStages.map(s => s.value));

  const calculateConversionRate = (current: number, previous: number) => {
    if (previous === 0) return '0.00%';
    return ((current / previous) * 100).toFixed(2) + '%';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{campaignName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funnel Chart */}
        <div className="space-y-2">
          {funnelStages.map((stage, index) => {
            const widthPercentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
            const prevValue = index > 0 ? funnelStages[index - 1].value : stage.value;
            const conversionRate = calculateConversionRate(stage.value, prevValue);
            
            return (
              <div key={stage.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{stage.label}</span>
                  {index > 0 && <span className="text-[10px]">{conversionRate}</span>}
                </div>
                <div className="relative h-12 flex items-center">
                  <div 
                    className={`${stage.color} h-full flex items-center justify-center text-white font-bold transition-all duration-300`}
                    style={{ width: `${widthPercentage}%`, minWidth: stage.value > 0 ? '60px' : '0' }}
                  >
                    {stage.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Conversion Rates */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <div className="text-xs font-medium">Total</div>
            <div className="text-2xl font-bold">100.0%</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium">Taxa de aceite</div>
            <div className="text-2xl font-bold">{data.acceptanceRate}%</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium">Taxa de respostas por convite</div>
            <div className="text-lg font-semibold">
              {calculateConversionRate(data.positiveResponses, data.invitations)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium">Taxa de conversão</div>
            <div className="text-lg font-semibold">
              {calculateConversionRate(data.meetings, data.positiveResponses)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium">Propostas / Reuniões</div>
            <div className="text-lg font-semibold">
              {calculateConversionRate(data.proposals, data.meetings)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium">Vendas / propostas</div>
            <div className="text-lg font-semibold">
              {calculateConversionRate(data.sales, data.proposals)}
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <div className="text-xs font-medium">Visitas a Perfil</div>
            <div className="text-xl font-bold">{data.visits}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium">Curtidas</div>
            <div className="text-xl font-bold">{data.likes}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium">Comentários</div>
            <div className="text-xl font-bold">{data.comments}</div>
          </div>
        </div>

        {/* Financial Metrics */}
        {(data.proposalValue > 0 || data.salesValue > 0) && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="text-xs font-medium">Total $ Propostas</div>
              <div className="text-lg font-bold">
                R$ {data.proposalValue.toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium">Total $ Vendas</div>
              <div className="text-lg font-bold">
                R$ {data.salesValue.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
