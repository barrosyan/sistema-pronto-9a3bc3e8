import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampaignTrendChartProps {
  data: Array<{
    date: string;
    invitations?: number;
    connections?: number;
    messages?: number;
    visits?: number;
    likes?: number;
    comments?: number;
    positiveResponses?: number;
    meetings?: number;
  }>;
  campaignName?: string;
}

type MetricKey = 'invitations' | 'connections' | 'messages' | 'visits' | 'likes' | 'comments' | 'positiveResponses' | 'meetings';

const metricOptions: { value: MetricKey; label: string; color: string }[] = [
  { value: 'invitations', label: 'Convites Enviados', color: 'hsl(var(--primary))' },
  { value: 'connections', label: 'Conexões Realizadas', color: 'hsl(var(--chart-1))' },
  { value: 'messages', label: 'Mensagens Enviadas', color: 'hsl(var(--chart-2))' },
  { value: 'visits', label: 'Visitas ao Perfil', color: 'hsl(var(--chart-3))' },
  { value: 'likes', label: 'Likes', color: 'hsl(var(--chart-4))' },
  { value: 'comments', label: 'Comentários', color: 'hsl(var(--chart-5))' },
  { value: 'positiveResponses', label: 'Respostas Positivas', color: 'hsl(var(--success))' },
  { value: 'meetings', label: 'Reuniões', color: 'hsl(var(--accent))' },
];

export function CampaignTrendChart({ data, campaignName }: CampaignTrendChartProps) {
  const [selectedMetric, setSelectedMetric] = React.useState<MetricKey>('invitations');

  const chartData = useMemo(() => {
    return data.map(item => ({
      date: item.date,
      formattedDate: format(parseISO(item.date), 'dd/MM/yyyy', { locale: ptBR }),
      value: item[selectedMetric] || 0,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, selectedMetric]);

  const selectedMetricConfig = metricOptions.find(m => m.value === selectedMetric);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Evolução Temporal</CardTitle>
          <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricKey)}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {campaignName && (
          <p className="text-sm text-muted-foreground">{campaignName}</p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="formattedDate" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              name={selectedMetricConfig?.label || 'Métrica'}
              stroke={selectedMetricConfig?.color || 'hsl(var(--primary))'} 
              strokeWidth={2}
              dot={{ fill: selectedMetricConfig?.color || 'hsl(var(--primary))' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}