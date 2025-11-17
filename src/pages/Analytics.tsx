import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import type { WeeklyMetrics } from '@/types/profile';

export default function Analytics() {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([
    'Ursula Sebrae 100 Startups',
    'Ursula NEON 2025'
  ]);

  // Mock data - Em produção, isso viria do banco de dados
  const allCampaigns = [
    'Ursula Sebrae 100 Startups',
    'Ursula Sebrae 1000 Startups',
    'Ursula NEON 2025',
    'Ursula Web Summit Lisboa 2025'
  ];

  const weeklyData: Record<string, WeeklyMetrics[]> = {
    'Ursula Sebrae 100 Startups': [
      {
        semana: '1ª Semana',
        inicioDoPeriodo: '02/06/2025',
        fimDoPeriodo: '08/06/2025',
        diasAtivos: 5,
        convitesEnviados: 45,
        conexoesRealizadas: 28,
        taxaDeAceiteDeConexao: 62,
        mensagensEnviadas: 52,
        visitas: 48,
        likes: 18,
        comentarios: 0,
        totalDeAtividades: 146,
        respostasPositivas: 8,
        leadsProcessados: 45,
        reunioes: 2,
        propostas: 0,
        vendas: 0,
        respostasPositivasConvitesEnviados: 17.8,
        respostasPositivasConexoesRealizadas: 28.6,
        respostasPositivasMensagensEnviadas: 15.4,
        numeroDeReunioesRespostasPositivas: 25.0,
        numeroDeReunioesConvitesEnviados: 4.4,
        campanhasAtivas: ['Ursula Sebrae 100 Startups'],
        observacoes: '',
        problemasTecnicos: '',
        ajustesNaPesquisa: '',
        analiseComparativa: ''
      },
      {
        semana: '2ª Semana',
        inicioDoPeriodo: '09/06/2025',
        fimDoPeriodo: '15/06/2025',
        diasAtivos: 4,
        convitesEnviados: 38,
        conexoesRealizadas: 22,
        taxaDeAceiteDeConexao: 58,
        mensagensEnviadas: 45,
        visitas: 42,
        likes: 15,
        comentarios: 0,
        totalDeAtividades: 125,
        respostasPositivas: 6,
        leadsProcessados: 38,
        reunioes: 1,
        propostas: 0,
        vendas: 0,
        respostasPositivasConvitesEnviados: 15.8,
        respostasPositivasConexoesRealizadas: 27.3,
        respostasPositivasMensagensEnviadas: 13.3,
        numeroDeReunioesRespostasPositivas: 16.7,
        numeroDeReunioesConvitesEnviados: 2.6,
        campanhasAtivas: ['Ursula Sebrae 100 Startups'],
        observacoes: '',
        problemasTecnicos: '',
        ajustesNaPesquisa: '',
        analiseComparativa: ''
      },
      {
        semana: '3ª Semana',
        inicioDoPeriodo: '16/06/2025',
        fimDoPeriodo: '22/06/2025',
        diasAtivos: 5,
        convitesEnviados: 50,
        conexoesRealizadas: 30,
        taxaDeAceiteDeConexao: 60,
        mensagensEnviadas: 55,
        visitas: 50,
        likes: 20,
        comentarios: 2,
        totalDeAtividades: 157,
        respostasPositivas: 10,
        leadsProcessados: 50,
        reunioes: 3,
        propostas: 1,
        vendas: 0,
        respostasPositivasConvitesEnviados: 20.0,
        respostasPositivasConexoesRealizadas: 33.3,
        respostasPositivasMensagensEnviadas: 18.2,
        numeroDeReunioesRespostasPositivas: 30.0,
        numeroDeReunioesConvitesEnviados: 6.0,
        campanhasAtivas: ['Ursula Sebrae 100 Startups'],
        observacoes: '',
        problemasTecnicos: '',
        ajustesNaPesquisa: '',
        analiseComparativa: ''
      },
      {
        semana: '4ª Semana',
        inicioDoPeriodo: '23/06/2025',
        fimDoPeriodo: '29/06/2025',
        diasAtivos: 4,
        convitesEnviados: 42,
        conexoesRealizadas: 25,
        taxaDeAceiteDeConexao: 59,
        mensagensEnviadas: 48,
        visitas: 45,
        likes: 16,
        comentarios: 1,
        totalDeAtividades: 135,
        respostasPositivas: 7,
        leadsProcessados: 42,
        reunioes: 2,
        propostas: 1,
        vendas: 1,
        respostasPositivasConvitesEnviados: 16.7,
        respostasPositivasConexoesRealizadas: 28.0,
        respostasPositivasMensagensEnviadas: 14.6,
        numeroDeReunioesRespostasPositivas: 28.6,
        numeroDeReunioesConvitesEnviados: 4.8,
        campanhasAtivas: ['Ursula Sebrae 100 Startups'],
        observacoes: '',
        problemasTecnicos: '',
        ajustesNaPesquisa: '',
        analiseComparativa: ''
      }
    ],
    'Ursula NEON 2025': [
      {
        semana: '1ª Semana',
        inicioDoPeriodo: '02/06/2025',
        fimDoPeriodo: '08/06/2025',
        diasAtivos: 5,
        convitesEnviados: 62,
        conexoesRealizadas: 38,
        taxaDeAceiteDeConexao: 61,
        mensagensEnviadas: 68,
        visitas: 65,
        likes: 24,
        comentarios: 0,
        totalDeAtividades: 195,
        respostasPositivas: 12,
        leadsProcessados: 62,
        reunioes: 4,
        propostas: 1,
        vendas: 0,
        respostasPositivasConvitesEnviados: 19.4,
        respostasPositivasConexoesRealizadas: 31.6,
        respostasPositivasMensagensEnviadas: 17.6,
        numeroDeReunioesRespostasPositivas: 33.3,
        numeroDeReunioesConvitesEnviados: 6.5,
        campanhasAtivas: ['Ursula NEON 2025'],
        observacoes: '',
        problemasTecnicos: '',
        ajustesNaPesquisa: '',
        analiseComparativa: ''
      },
      {
        semana: '2ª Semana',
        inicioDoPeriodo: '09/06/2025',
        fimDoPeriodo: '15/06/2025',
        diasAtivos: 6,
        convitesEnviados: 71,
        conexoesRealizadas: 45,
        taxaDeAceiteDeConexao: 63,
        mensagensEnviadas: 78,
        visitas: 72,
        likes: 28,
        comentarios: 0,
        totalDeAtividades: 222,
        respostasPositivas: 14,
        leadsProcessados: 71,
        reunioes: 5,
        propostas: 1,
        vendas: 0,
        respostasPositivasConvitesEnviados: 19.7,
        respostasPositivasConexoesRealizadas: 31.1,
        respostasPositivasMensagensEnviadas: 17.9,
        numeroDeReunioesRespostasPositivas: 35.7,
        numeroDeReunioesConvitesEnviados: 7.0,
        campanhasAtivas: ['Ursula NEON 2025'],
        observacoes: '',
        problemasTecnicos: '',
        ajustesNaPesquisa: '',
        analiseComparativa: ''
      },
      {
        semana: '3ª Semana',
        inicioDoPeriodo: '16/06/2025',
        fimDoPeriodo: '22/06/2025',
        diasAtivos: 5,
        convitesEnviados: 68,
        conexoesRealizadas: 42,
        taxaDeAceiteDeConexao: 62,
        mensagensEnviadas: 75,
        visitas: 70,
        likes: 26,
        comentarios: 3,
        totalDeAtividades: 216,
        respostasPositivas: 16,
        leadsProcessados: 68,
        reunioes: 6,
        propostas: 2,
        vendas: 1,
        respostasPositivasConvitesEnviados: 23.5,
        respostasPositivasConexoesRealizadas: 38.1,
        respostasPositivasMensagensEnviadas: 21.3,
        numeroDeReunioesRespostasPositivas: 37.5,
        numeroDeReunioesConvitesEnviados: 8.8,
        campanhasAtivas: ['Ursula NEON 2025'],
        observacoes: '',
        problemasTecnicos: '',
        ajustesNaPesquisa: '',
        analiseComparativa: ''
      },
      {
        semana: '4ª Semana',
        inicioDoPeriodo: '23/06/2025',
        fimDoPeriodo: '29/06/2025',
        diasAtivos: 6,
        convitesEnviados: 75,
        conexoesRealizadas: 48,
        taxaDeAceiteDeConexao: 64,
        mensagensEnviadas: 82,
        visitas: 78,
        likes: 30,
        comentarios: 2,
        totalDeAtividades: 240,
        respostasPositivas: 18,
        leadsProcessados: 75,
        reunioes: 7,
        propostas: 3,
        vendas: 1,
        respostasPositivasConvitesEnviados: 24.0,
        respostasPositivasConexoesRealizadas: 37.5,
        respostasPositivasMensagensEnviadas: 22.0,
        numeroDeReunioesRespostasPositivas: 38.9,
        numeroDeReunioesConvitesEnviados: 9.3,
        campanhasAtivas: ['Ursula NEON 2025'],
        observacoes: '',
        problemasTecnicos: '',
        ajustesNaPesquisa: '',
        analiseComparativa: ''
      }
    ]
  };

  const handleCampaignToggle = (campaign: string, checked: boolean) => {
    if (checked) {
      if (selectedCampaigns.length < 4) {
        setSelectedCampaigns([...selectedCampaigns, campaign]);
      }
    } else {
      setSelectedCampaigns(selectedCampaigns.filter(c => c !== campaign));
    }
  };

  // Preparar dados para gráficos de comparação
  const comparisonData = selectedCampaigns.length > 0 ? (() => {
    const weeks = new Set<string>();
    selectedCampaigns.forEach(campaign => {
      weeklyData[campaign]?.forEach(week => {
        weeks.add(week.inicioDoPeriodo);
      });
    });

    return Array.from(weeks).sort().map(week => {
      const dataPoint: any = { week };
      selectedCampaigns.forEach(campaign => {
        const weekData = weeklyData[campaign]?.find(w => w.inicioDoPeriodo === week);
        // Sempre adicionar os dados, mesmo que seja 0
        dataPoint[`${campaign}_convites`] = weekData?.convitesEnviados ?? 0;
        dataPoint[`${campaign}_conexoes`] = weekData?.conexoesRealizadas ?? 0;
        dataPoint[`${campaign}_mensagens`] = weekData?.mensagensEnviadas ?? 0;
        dataPoint[`${campaign}_respostas`] = weekData?.respostasPositivas ?? 0;
        dataPoint[`${campaign}_reunioes`] = weekData?.reunioes ?? 0;
      });
      return dataPoint;
    });
  })() : [];

  const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics - Comparação de Campanhas</h1>
        <p className="text-muted-foreground">Compare métricas semanais entre diferentes campanhas</p>
      </div>

      {/* Seleção de Campanhas */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Campanhas para Comparar</CardTitle>
          <CardDescription>Escolha até 4 campanhas para visualizar comparativos (mínimo 2)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allCampaigns.map((campaign, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`campaign-${idx}`}
                  checked={selectedCampaigns.includes(campaign)}
                  onCheckedChange={(checked) => handleCampaignToggle(campaign, checked as boolean)}
                  disabled={!selectedCampaigns.includes(campaign) && selectedCampaigns.length >= 4}
                />
                <Label
                  htmlFor={`campaign-${idx}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {campaign}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCampaigns.length < 2 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Selecione pelo menos 2 campanhas para visualizar os comparativos.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedCampaigns.length >= 2 && (
        <>
          {/* Gráfico de Convites Enviados */}
          <Card>
            <CardHeader>
              <CardTitle>Convites Enviados por Semana</CardTitle>
              <CardDescription>Comparação de volume de convites enviados</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={selectedCampaigns.reduce((acc, campaign, idx) => ({
                  ...acc,
                  [`${campaign}_convites`]: {
                    label: campaign,
                    color: chartColors[idx]
                  }
                }), {})}
                className="h-[300px]"
              >
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  {selectedCampaigns.map((campaign, idx) => (
                    <Line
                      key={campaign}
                      type="monotone"
                      dataKey={`${campaign}_convites`}
                      stroke={chartColors[idx]}
                      name={campaign}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Conexões Realizadas */}
          <Card>
            <CardHeader>
              <CardTitle>Conexões Realizadas por Semana</CardTitle>
              <CardDescription>Comparação de conexões aceitas</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={selectedCampaigns.reduce((acc, campaign, idx) => ({
                  ...acc,
                  [`${campaign}_conexoes`]: {
                    label: campaign,
                    color: chartColors[idx]
                  }
                }), {})}
                className="h-[300px]"
              >
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  {selectedCampaigns.map((campaign, idx) => (
                    <Bar
                      key={campaign}
                      dataKey={`${campaign}_conexoes`}
                      fill={chartColors[idx]}
                      name={campaign}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Mensagens Enviadas */}
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Enviadas por Semana</CardTitle>
              <CardDescription>Volume de mensagens enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={selectedCampaigns.reduce((acc, campaign, idx) => ({
                  ...acc,
                  [`${campaign}_mensagens`]: {
                    label: campaign,
                    color: chartColors[idx]
                  }
                }), {})}
                className="h-[300px]"
              >
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  {selectedCampaigns.map((campaign, idx) => (
                    <Line
                      key={campaign}
                      type="monotone"
                      dataKey={`${campaign}_mensagens`}
                      stroke={chartColors[idx]}
                      name={campaign}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Respostas Positivas e Reuniões */}
          <Card>
            <CardHeader>
              <CardTitle>Respostas Positivas e Reuniões por Semana</CardTitle>
              <CardDescription>Comparação de conversão (respostas e reuniões)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={selectedCampaigns.reduce((acc, campaign, idx) => ({
                  ...acc,
                  [`${campaign}_respostas`]: {
                    label: `${campaign} - Respostas`,
                    color: chartColors[idx]
                  },
                  [`${campaign}_reunioes`]: {
                    label: `${campaign} - Reuniões`,
                    color: chartColors[idx]
                  }
                }), {})}
                className="h-[300px]"
              >
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  {selectedCampaigns.map((campaign, idx) => (
                    <>
                      <Bar
                        key={`${campaign}_respostas`}
                        dataKey={`${campaign}_respostas`}
                        fill={chartColors[idx]}
                        name={`${campaign} - Respostas`}
                      />
                      <Bar
                        key={`${campaign}_reunioes`}
                        dataKey={`${campaign}_reunioes`}
                        fill={chartColors[idx]}
                        fillOpacity={0.6}
                        name={`${campaign} - Reuniões`}
                      />
                    </>
                  ))}
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Tabela de Resumo Comparativo */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo Comparativo Total</CardTitle>
              <CardDescription>Totais acumulados por campanha</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Campanha</th>
                      <th className="text-center p-2">Convites</th>
                      <th className="text-center p-2">Conexões</th>
                      <th className="text-center p-2">Mensagens</th>
                      <th className="text-center p-2">Respostas</th>
                      <th className="text-center p-2">Reuniões</th>
                      <th className="text-center p-2">Taxa Aceite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCampaigns.map((campaign) => {
                      const totals = weeklyData[campaign]?.reduce((acc, week) => ({
                        convites: acc.convites + week.convitesEnviados,
                        conexoes: acc.conexoes + week.conexoesRealizadas,
                        mensagens: acc.mensagens + week.mensagensEnviadas,
                        respostas: acc.respostas + week.respostasPositivas,
                        reunioes: acc.reunioes + week.reunioes
                      }), { convites: 0, conexoes: 0, mensagens: 0, respostas: 0, reunioes: 0 });

                      const taxaAceite = totals && totals.convites > 0 
                        ? ((totals.conexoes / totals.convites) * 100).toFixed(1)
                        : '0';

                      return (
                        <tr key={campaign} className="border-b">
                          <td className="p-2 font-medium">{campaign}</td>
                          <td className="text-center p-2">{totals?.convites || 0}</td>
                          <td className="text-center p-2">{totals?.conexoes || 0}</td>
                          <td className="text-center p-2">{totals?.mensagens || 0}</td>
                          <td className="text-center p-2">{totals?.respostas || 0}</td>
                          <td className="text-center p-2">{totals?.reunioes || 0}</td>
                          <td className="text-center p-2">{taxaAceite}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}