import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CampaignMetrics } from '@/types/campaign';
import { format, parseISO, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeeklyProfileViewProps {
  campaignMetrics: CampaignMetrics[];
  profiles: string[];
  campaigns: string[];
}

interface WeeklyData {
  weekNumber: number;
  weekLabel: string;
  startDate: string;
  endDate: string;
  metrics: Record<string, Record<string, number>>; // profile-campaign -> metric -> value
}

export function WeeklyProfileView({ campaignMetrics, profiles, campaigns }: WeeklyProfileViewProps) {
  const eventMappings: Record<string, string> = {
    'Connection Requests Sent': 'convites',
    'Convites Enviados': 'convites',
    'Connection Requests Accepted': 'conexoes',
    'Conexões Realizadas': 'conexoes',
    'Connections Made': 'conexoes',
    'Follow-Ups 1': 'followUps1',
    'Follow-Ups 2': 'followUps2',
    'Follow-Ups 3': 'followUps3',
    'Profile Visits': 'visitas',
    'Visitas a Perfil': 'visitas',
    'Post Likes': 'likes',
    'Curtidas': 'likes',
    'Comments Done': 'comentarios',
    'Comentários': 'comentarios',
  };

  // Get all profile-campaign combinations that have data
  const combinations = profiles.flatMap(profile => 
    campaigns
      .filter(campaign => campaignMetrics.some(m => m.profileName === profile && m.campaignName === campaign))
      .map(campaign => ({ profile, campaign, key: `${profile}|${campaign}` }))
  );

  // Collect all dates and organize by week
  const weeklyDataMap = new Map<string, WeeklyData>();
  
  campaignMetrics.forEach(metric => {
    const key = `${metric.profileName}|${metric.campaignName}`;
    const metricType = eventMappings[metric.eventType];
    if (!metricType) return;

    Object.entries(metric.dailyData || {}).forEach(([dateStr, value]) => {
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
      
      try {
        const date = parseISO(dateStr);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        if (!weeklyDataMap.has(weekKey)) {
          weeklyDataMap.set(weekKey, {
            weekNumber: 0,
            weekLabel: '',
            startDate: weekKey,
            endDate: format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
            metrics: {}
          });
        }
        
        const weekData = weeklyDataMap.get(weekKey)!;
        if (!weekData.metrics[key]) {
          weekData.metrics[key] = { convites: 0, conexoes: 0, mensagens: 0, visitas: 0, likes: 0, comentarios: 0, followUps1: 0, followUps2: 0, followUps3: 0 };
        }
        weekData.metrics[key][metricType] += value;
      } catch (e) {
        // Invalid date
      }
    });
  });

  // Sort weeks and assign week numbers
  const sortedWeeks = Array.from(weeklyDataMap.values())
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((week, idx) => ({
      ...week,
      weekNumber: idx + 1,
      weekLabel: `${idx + 1}ª Semana`
    }));

  // Calculate messages from follow-ups for each week
  sortedWeeks.forEach(week => {
    Object.keys(week.metrics).forEach(key => {
      const m = week.metrics[key];
      m.mensagens = m.followUps1 + m.followUps2 + m.followUps3;
    });
  });

  if (combinations.length === 0 || sortedWeeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visualização Semanal por Perfil</CardTitle>
          <CardDescription>Nenhum dado disponível para visualização semanal</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agrupamento Semanal por Perfil e Campanha</CardTitle>
        <CardDescription>Visualização de métricas por semana para cada combinação de perfil e campanha</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left p-3 font-semibold sticky left-0 bg-card z-10">Semana</th>
                <th className="text-left p-3 font-semibold">Período</th>
                {combinations.map(({ profile, campaign, key }) => (
                  <th key={key} colSpan={4} className="text-center p-3 font-semibold border-l border-border">
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="outline" className="text-xs">{profile}</Badge>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">{campaign}</span>
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-2 text-xs font-medium sticky left-0 bg-muted/50 z-10"></th>
                <th className="text-left p-2 text-xs font-medium"></th>
                {combinations.map(({ key }) => (
                  <React.Fragment key={key}>
                    <th className="text-center p-2 text-xs font-medium border-l border-border">Conv.</th>
                    <th className="text-center p-2 text-xs font-medium">Conex.</th>
                    <th className="text-center p-2 text-xs font-medium">Msgs.</th>
                    <th className="text-center p-2 text-xs font-medium">Visitas</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedWeeks.map((week) => (
                <tr key={week.weekNumber} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3 font-medium sticky left-0 bg-card z-10">{week.weekLabel}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {format(parseISO(week.startDate), 'dd/MM', { locale: ptBR })} - {format(parseISO(week.endDate), 'dd/MM', { locale: ptBR })}
                  </td>
                  {combinations.map(({ key }) => {
                    const metrics = week.metrics[key] || { convites: 0, conexoes: 0, mensagens: 0, visitas: 0 };
                    return (
                      <React.Fragment key={key}>
                        <td className="p-2 text-center border-l border-border">{metrics.convites}</td>
                        <td className="p-2 text-center">{metrics.conexoes}</td>
                        <td className="p-2 text-center">{metrics.mensagens}</td>
                        <td className="p-2 text-center">{metrics.visitas}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}