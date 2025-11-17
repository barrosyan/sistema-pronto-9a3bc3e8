import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import type { ProfileInfo, ConsolidatedMetrics, ConversionRates, ProfileObservations, WeeklyActivityCalendar, CampaignComparison, WeeklyMetrics } from '@/types/profile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Profile() {
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('Todas');
  const [profileInfo, setProfileInfo] = useState<ProfileInfo>({
    empresa: 'Presto',
    perfil: 'Ursula Aleixo',
    campanhas: [
      'Ursula Sebrae 100 Startups',
      'Ursula Sebrae 1000 Startups',
      'Ursula NEON 2025',
      'Ursula Web Summit Lisboa 2025'
    ],
    objetivoDasCampanhas: 'Conectar com startups e ampliar network em eventos estratégicos',
    cadencia: 'https://docs.google.com/document/d/...',
    cargosNaPesquisa: 'Founder, CEO, CTO'
  });

  const [metrics] = useState<ConsolidatedMetrics>({
    inicioDoPeriodo: '02/06/2025',
    fimDoPeriodo: '02/11/2025',
    campanhasAtivas: 28,
    diasAtivos: 120, // Placeholder
    convitesEnviados: 1020,
    conexoesRealizadas: 578,
    taxaDeAceiteDeConexao: 57,
    mensagensEnviadas: 1212,
    visitas: 1165,
    likes: 464,
    comentarios: 0,
    totalDeAtividades: 3861,
    respostasPositivas: 149,
    leadsProcessados: 1373,
    reunioes: 47,
    propostas: 7,
    vendas: 1
  });

  const [conversionRates] = useState<ConversionRates>({
    respostasPositivasConvitesEnviados: 14.6,
    respostasPositivasConexoesRealizadas: 25.8,
    respostasPositivasMensagensEnviadas: 12.3,
    numeroDeReunioesRespostasPositivas: 31.5,
    numeroDeReunioesConvitesEnviados: 4.6
  });

  const [observations] = useState<ProfileObservations>({
    observacoes: '',
    problemasTecnicos: '',
    ajustesNaPesquisa: '',
    analiseComparativa: ''
  });

  const [weeklyCalendar] = useState<WeeklyActivityCalendar[]>([
    { semana: '02/06/2025', segundaFeira: 'Ativo', tercaFeira: 'Ativo', quartaFeira: 'Ativo', quintaFeira: 'Ativo', sextaFeira: 'Ativo', sabado: 'Inativo', domingo: 'Inativo', diasAtivos: 5 },
    { semana: '09/06/2025', segundaFeira: 'Ativo', tercaFeira: 'Ativo', quartaFeira: 'Inativo', quintaFeira: 'Ativo', sextaFeira: 'Ativo', sabado: 'Inativo', domingo: 'Inativo', diasAtivos: 4 },
    { semana: '16/06/2025', segundaFeira: 'Ativo', tercaFeira: 'Ativo', quartaFeira: 'Ativo', quintaFeira: 'Ativo', sextaFeira: 'Ativo', sabado: 'Ativo', domingo: 'Inativo', diasAtivos: 6 },
    { semana: '23/06/2025', segundaFeira: 'Ativo', tercaFeira: 'Ativo', quartaFeira: 'Ativo', quintaFeira: 'Inativo', sextaFeira: 'Ativo', sabado: 'Ativo', domingo: 'Inativo', diasAtivos: 5 },
    { semana: '30/06/2025', segundaFeira: 'Ativo', tercaFeira: 'Inativo', quartaFeira: 'Ativo', quintaFeira: 'Ativo', sextaFeira: 'Ativo', sabado: 'Inativo', domingo: 'Ativo', diasAtivos: 5 },
    { semana: '07/07/2025', segundaFeira: 'Ativo', tercaFeira: 'Ativo', quartaFeira: 'Inativo', quintaFeira: 'Inativo', sextaFeira: 'Ativo', sabado: 'Inativo', domingo: 'Inativo', diasAtivos: 3 },
    { semana: '14/07/2025', segundaFeira: 'Inativo', tercaFeira: 'Inativo', quartaFeira: 'Ativo', quintaFeira: 'Ativo', sextaFeira: 'Ativo', sabado: 'Inativo', domingo: 'Inativo', diasAtivos: 3 },
    { semana: '21/07/2025', segundaFeira: 'Inativo', tercaFeira: 'Inativo', quartaFeira: 'Inativo', quintaFeira: 'Inativo', sextaFeira: 'Ativo', sabado: 'Ativo', domingo: 'Inativo', diasAtivos: 2 },
    { semana: '28/07/2025', segundaFeira: 'Ativo', tercaFeira: 'Ativo', quartaFeira: 'Ativo', quintaFeira: 'Ativo', sextaFeira: 'Ativo', sabado: 'Inativo', domingo: 'Ativo', diasAtivos: 6 },
    { semana: '04/08/2025', segundaFeira: 'Ativo', tercaFeira: 'Inativo', quartaFeira: 'Ativo', quintaFeira: 'Ativo', sextaFeira: 'Inativo', sabado: 'Inativo', domingo: 'Inativo', diasAtivos: 3 },
    { semana: '11/08/2025', segundaFeira: 'Inativo', tercaFeira: 'Inativo', quartaFeira: 'Inativo', quintaFeira: 'Ativo', sextaFeira: 'Inativo', sabado: 'Inativo', domingo: 'Ativo', diasAtivos: 2 },
    { semana: '18/08/2025', segundaFeira: 'Inativo', tercaFeira: 'Inativo', quartaFeira: 'Inativo', quintaFeira: 'Ativo', sextaFeira: 'Inativo', sabado: 'Inativo', domingo: 'Inativo', diasAtivos: 1 },
    { semana: '25/08/2025', segundaFeira: 'Inativo', tercaFeira: 'Inativo', quartaFeira: 'Inativo', quintaFeira: 'Inativo', sextaFeira: 'Inativo', sabado: 'Inativo', domingo: 'Inativo', diasAtivos: 0 },
    { semana: '01/09/2025', segundaFeira: 'Inativo', tercaFeira: 'Inativo', quartaFeira: 'Inativo', quintaFeira: 'Inativo', sextaFeira: 'Inativo', sabado: 'Inativo', domingo: 'Inativo', diasAtivos: 0 },
    { semana: '08/09/2025', segundaFeira: 'Ativo', tercaFeira: 'Ativo', quartaFeira: 'Ativo', quintaFeira: 'Inativo', sextaFeira: 'Ativo', sabado: 'Ativo', domingo: 'Inativo', diasAtivos: 5 },
    { semana: '15/09/2025', segundaFeira: 'Ativo', tercaFeira: 'Ativo', quartaFeira: 'Ativo', quintaFeira: 'Ativo', sextaFeira: 'Ativo', sabado: 'Ativo', domingo: 'Ativo', diasAtivos: 7 },
    { semana: '22/09/2025', segundaFeira: 'Ativo', tercaFeira: 'Ativo', quartaFeira: 'Inativo', quintaFeira: 'Ativo', sextaFeira: 'Ativo', sabado: 'Ativo', domingo: 'Inativo', diasAtivos: 5 },
    { semana: '29/09/2025', segundaFeira: 'Ativo', tercaFeira: 'Ativo', quartaFeira: 'Ativo', quintaFeira: 'Ativo', sextaFeira: 'Ativo', sabado: 'Ativo', domingo: 'Ativo', diasAtivos: 7 },
    { semana: '06/10/2025', segundaFeira: 'Ativo', tercaFeira: 'Ativo', quartaFeira: 'Ativo', quintaFeira: 'Ativo', sextaFeira: 'Ativo', sabado: 'Inativo', domingo: 'Ativo', diasAtivos: 6 },
    { semana: '13/10/2025', segundaFeira: 'Ativo', tercaFeira: 'Inativo', quartaFeira: 'Ativo', quintaFeira: 'Ativo', sextaFeira: 'Ativo', sabado: 'Inativo', domingo: 'Inativo', diasAtivos: 4 },
    { semana: '20/10/2025', segundaFeira: 'Inativo', tercaFeira: 'Inativo', quartaFeira: 'Inativo', quintaFeira: 'Inativo', sextaFeira: 'Inativo', sabado: 'Inativo', domingo: 'Inativo', diasAtivos: 0 },
    { semana: '27/10/2025', segundaFeira: 'Inativo', tercaFeira: 'Inativo', quartaFeira: 'Inativo', quintaFeira: 'Inativo', sextaFeira: 'Inativo', sabado: 'Inativo', domingo: 'Inativo', diasAtivos: 0 },
  ]);

  const [weeklyMetrics] = useState<WeeklyMetrics[]>([
    {
      semana: '1ª Semana',
      inicioDoPeriodo: '02/06/2025',
      fimDoPeriodo: '08/06/2025',
      campanhasAtivas: ['Ursula Minas Summit 2025 conectar', 'Ursula Minas Summit 2025 conectados'],
      diasAtivos: 5,
      convitesEnviados: 0,
      conexoesRealizadas: 4,
      taxaDeAceiteDeConexao: 0,
      mensagensEnviadas: 2,
      visitas: 0,
      likes: 0,
      comentarios: 0,
      totalDeAtividades: 2,
      respostasPositivas: 11,
      leadsProcessados: 0,
      reunioes: 0,
      propostas: 0,
      vendas: 0,
      respostasPositivasConvitesEnviados: 0,
      respostasPositivasConexoesRealizadas: 275.0,
      respostasPositivasMensagensEnviadas: 550.0,
      numeroDeReunioesRespostasPositivas: 0,
      numeroDeReunioesConvitesEnviados: 0,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    },
    {
      semana: '2ª Semana',
      inicioDoPeriodo: '09/06/2025',
      fimDoPeriodo: '15/06/2025',
      campanhasAtivas: ['Ursula Minas Summit 2025 conectar', 'Ursula Minas Summit 2025 conectados'],
      diasAtivos: 4,
      convitesEnviados: 0,
      conexoesRealizadas: 2,
      taxaDeAceiteDeConexao: 0,
      mensagensEnviadas: 0,
      visitas: 0,
      likes: 0,
      comentarios: 0,
      totalDeAtividades: 0,
      respostasPositivas: 0,
      leadsProcessados: 0,
      reunioes: 1,
      propostas: 0,
      vendas: 0,
      respostasPositivasConvitesEnviados: 0,
      respostasPositivasConexoesRealizadas: 0,
      respostasPositivasMensagensEnviadas: 0,
      numeroDeReunioesRespostasPositivas: 0,
      numeroDeReunioesConvitesEnviados: 0,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    },
    {
      semana: '3ª Semana',
      inicioDoPeriodo: '16/06/2025',
      fimDoPeriodo: '22/06/2025',
      campanhasAtivas: ['Ursula NEON 2025', 'Ursula Minas Summit 2025 conectar'],
      diasAtivos: 6,
      convitesEnviados: 36,
      conexoesRealizadas: 13,
      taxaDeAceiteDeConexao: 36,
      mensagensEnviadas: 11,
      visitas: 36,
      likes: 30,
      comentarios: 0,
      totalDeAtividades: 113,
      respostasPositivas: 4,
      leadsProcessados: 36,
      reunioes: 1,
      propostas: 0,
      vendas: 0,
      respostasPositivasConvitesEnviados: 11.1,
      respostasPositivasConexoesRealizadas: 30.8,
      respostasPositivasMensagensEnviadas: 36.4,
      numeroDeReunioesRespostasPositivas: 25.0,
      numeroDeReunioesConvitesEnviados: 2.8,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    },
    {
      semana: '8ª Semana',
      inicioDoPeriodo: '21/07/2025',
      fimDoPeriodo: '27/07/2025',
      campanhasAtivas: ['Ursula Sebrae 100 Startups', 'Ursula NEON Matchmaking', 'Ursula Minas Summit 2025 conectar'],
      diasAtivos: 2,
      convitesEnviados: 50,
      conexoesRealizadas: 9,
      taxaDeAceiteDeConexao: 18,
      mensagensEnviadas: 15,
      visitas: 56,
      likes: 14,
      comentarios: 0,
      totalDeAtividades: 135,
      respostasPositivas: 2,
      leadsProcessados: 56,
      reunioes: 0,
      propostas: 0,
      vendas: 0,
      respostasPositivasConvitesEnviados: 4.0,
      respostasPositivasConexoesRealizadas: 22.2,
      respostasPositivasMensagensEnviadas: 13.3,
      numeroDeReunioesRespostasPositivas: 0,
      numeroDeReunioesConvitesEnviados: 0,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    },
    {
      semana: '9ª Semana',
      inicioDoPeriodo: '28/07/2025',
      fimDoPeriodo: '03/08/2025',
      campanhasAtivas: ['Ursula Sebrae 100 Startups', 'Ursula Sebrae 1000 Startups', 'Ursula Sebrae Startups Leads Conectados'],
      diasAtivos: 6,
      convitesEnviados: 163,
      conexoesRealizadas: 72,
      taxaDeAceiteDeConexao: 44,
      mensagensEnviadas: 97,
      visitas: 199,
      likes: 88,
      comentarios: 0,
      totalDeAtividades: 547,
      respostasPositivas: 9,
      leadsProcessados: 174,
      reunioes: 0,
      propostas: 0,
      vendas: 0,
      respostasPositivasConvitesEnviados: 5.5,
      respostasPositivasConexoesRealizadas: 12.5,
      respostasPositivasMensagensEnviadas: 9.3,
      numeroDeReunioesRespostasPositivas: 0,
      numeroDeReunioesConvitesEnviados: 0,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    },
    {
      semana: '10ª Semana',
      inicioDoPeriodo: '04/08/2025',
      fimDoPeriodo: '10/08/2025',
      campanhasAtivas: ['Ursula Sebrae 100 Startups', 'Ursula Sebrae 1000 Startups', 'Ursula Sebrae Startups Leads Conectados', 'Ursula Lembrete do Workshop', 'Ursula NEON 2025'],
      diasAtivos: 3,
      convitesEnviados: 54,
      conexoesRealizadas: 51,
      taxaDeAceiteDeConexao: 94,
      mensagensEnviadas: 47,
      visitas: 67,
      likes: 45,
      comentarios: 0,
      totalDeAtividades: 213,
      respostasPositivas: 6,
      leadsProcessados: 51,
      reunioes: 2,
      propostas: 0,
      vendas: 0,
      respostasPositivasConvitesEnviados: 11.1,
      respostasPositivasConexoesRealizadas: 11.8,
      respostasPositivasMensagensEnviadas: 12.8,
      numeroDeReunioesRespostasPositivas: 33.3,
      numeroDeReunioesConvitesEnviados: 3.7,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    },
    {
      semana: '15ª Semana',
      inicioDoPeriodo: '08/09/2025',
      fimDoPeriodo: '14/09/2025',
      campanhasAtivas: ['Ursula Sebrae 1000 Startups', 'Ursula Startup Summit Pós evento', 'Ursula Evento Presencial Startup Summit 2025'],
      diasAtivos: 5,
      convitesEnviados: 84,
      conexoesRealizadas: 34,
      taxaDeAceiteDeConexao: 40,
      mensagensEnviadas: 18,
      visitas: 87,
      likes: 0,
      comentarios: 0,
      totalDeAtividades: 189,
      respostasPositivas: 4,
      leadsProcessados: 96,
      reunioes: 2,
      propostas: 2,
      vendas: 0,
      respostasPositivasConvitesEnviados: 4.8,
      respostasPositivasConexoesRealizadas: 11.8,
      respostasPositivasMensagensEnviadas: 22.2,
      numeroDeReunioesRespostasPositivas: 50.0,
      numeroDeReunioesConvitesEnviados: 2.4,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    },
    {
      semana: '16ª Semana',
      inicioDoPeriodo: '15/09/2025',
      fimDoPeriodo: '21/09/2025',
      campanhasAtivas: ['Ursula Sebrae 1000 Startups', 'Ursula Startup Summit Pós evento', 'Ursula Evento Presencial Startup Summit 2025', 'Ursula Selecionadas APEX Web Summit Lisboa 2 e 3 Conexões 2025', 'Ursula Selecionadas APEX Web Summit Lisboa 2 e 3 Conexões 2025 MKT', 'Ursula WSL2025 Webnar Brasil 2s e 3s conexões'],
      diasAtivos: 7,
      convitesEnviados: 60,
      conexoesRealizadas: 35,
      taxaDeAceiteDeConexao: 58,
      mensagensEnviadas: 85,
      visitas: 86,
      likes: 15,
      comentarios: 0,
      totalDeAtividades: 246,
      respostasPositivas: 6,
      leadsProcessados: 99,
      reunioes: 5,
      propostas: 0,
      vendas: 0,
      respostasPositivasConvitesEnviados: 10.0,
      respostasPositivasConexoesRealizadas: 17.1,
      respostasPositivasMensagensEnviadas: 7.1,
      numeroDeReunioesRespostasPositivas: 83.3,
      numeroDeReunioesConvitesEnviados: 8.3,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    },
    {
      semana: '19ª Semana',
      inicioDoPeriodo: '06/10/2025',
      fimDoPeriodo: '12/10/2025',
      campanhasAtivas: ['Ursula Startup Summit Pós evento', 'Ursula Selecionadas APEX Web Summit Lisboa 2 e 3 Conexões 2025', 'Ursula Web Summit Lisboa 2025 BR 2 3 Conexões', 'Ursula Web Summit Lisboa 2025 EUA', 'Ursula Web Summit Lisboa 2025 Canada', 'Ursula WSL25 Alemanha e Irlanda e Belgica', 'Ursula Web Summit Lisboa 2025 Portugal'],
      diasAtivos: 6,
      convitesEnviados: 115,
      conexoesRealizadas: 78,
      taxaDeAceiteDeConexao: 68,
      mensagensEnviadas: 207,
      visitas: 114,
      likes: 57,
      comentarios: 0,
      totalDeAtividades: 493,
      respostasPositivas: 29,
      leadsProcessados: 105,
      reunioes: 4,
      propostas: 0,
      vendas: 0,
      respostasPositivasConvitesEnviados: 25.2,
      respostasPositivasConexoesRealizadas: 37.2,
      respostasPositivasMensagensEnviadas: 14.0,
      numeroDeReunioesRespostasPositivas: 13.8,
      numeroDeReunioesConvitesEnviados: 3.5,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    }
  ]);

  const [campaignComparisons] = useState<CampaignComparison[]>([
    {
      campaignName: 'Ursula Sebrae 100 Startups',
      inicioDoPeriodo: '21/07/2025',
      fimDoPeriodo: '24/08/2025',
      diasAtivos: 14,
      convitesEnviados: 74,
      conexoesRealizadas: 43,
      taxaDeAceiteDeConexao: 58,
      mensagensEnviadas: 42,
      visitas: 80,
      likes: 39,
      comentarios: 0,
      totalDeAtividades: 235,
      respostasPositivas: 5,
      leadsProcessados: 0,
      reunioes: 0,
      propostas: 0,
      vendas: 0,
      respostasPositivasConvitesEnviados: 6.8,
      respostasPositivasConexoesRealizadas: 11.6,
      respostasPositivasMensagensEnviadas: 11.9,
      numeroDeReunioesRespostasPositivas: 0,
      numeroDeReunioesConvitesEnviados: 0,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    },
    {
      campaignName: 'Ursula NEON 2025',
      inicioDoPeriodo: '16/06/2025',
      fimDoPeriodo: '11/08/2025',
      diasAtivos: 21,
      convitesEnviados: 82,
      conexoesRealizadas: 41,
      taxaDeAceiteDeConexao: 50,
      mensagensEnviadas: 17,
      visitas: 82,
      likes: 47,
      comentarios: 0,
      totalDeAtividades: 187,
      respostasPositivas: 16,
      leadsProcessados: 85,
      reunioes: 2,
      propostas: 0,
      vendas: 0,
      respostasPositivasConvitesEnviados: 19.5,
      respostasPositivasConexoesRealizadas: 39.0,
      respostasPositivasMensagensEnviadas: 94.1,
      numeroDeReunioesRespostasPositivas: 12.5,
      numeroDeReunioesConvitesEnviados: 2.4,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    },
    {
      campaignName: 'Ursula Web Summit Lisboa 2025 BR',
      inicioDoPeriodo: '22/09/2025',
      fimDoPeriodo: '19/10/2025',
      diasAtivos: 18,
      convitesEnviados: 142,
      conexoesRealizadas: 95,
      taxaDeAceiteDeConexao: 67,
      mensagensEnviadas: 198,
      visitas: 156,
      likes: 62,
      comentarios: 0,
      totalDeAtividades: 511,
      respostasPositivas: 23,
      leadsProcessados: 142,
      reunioes: 8,
      propostas: 2,
      vendas: 1,
      respostasPositivasConvitesEnviados: 16.2,
      respostasPositivasConexoesRealizadas: 24.2,
      respostasPositivasMensagensEnviadas: 11.6,
      numeroDeReunioesRespostasPositivas: 34.8,
      numeroDeReunioesConvitesEnviados: 5.6,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    },
    {
      campaignName: 'Ursula Startup Summit Pós evento',
      inicioDoPeriodo: '08/09/2025',
      fimDoPeriodo: '19/10/2025',
      diasAtivos: 28,
      convitesEnviados: 0,
      conexoesRealizadas: 0,
      taxaDeAceiteDeConexao: 0,
      mensagensEnviadas: 246,
      visitas: 0,
      likes: 0,
      comentarios: 0,
      totalDeAtividades: 246,
      respostasPositivas: 18,
      leadsProcessados: 0,
      reunioes: 12,
      propostas: 4,
      vendas: 0,
      respostasPositivasConvitesEnviados: 0,
      respostasPositivasConexoesRealizadas: 0,
      respostasPositivasMensagensEnviadas: 7.3,
      numeroDeReunioesRespostasPositivas: 66.7,
      numeroDeReunioesConvitesEnviados: 0,
      observacoes: 'Campanha focada em follow-up pós evento',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: 'Alta taxa de conversão de respostas para reuniões'
    },
    {
      campaignName: 'Ursula Minas Summit 2025',
      inicioDoPeriodo: '02/06/2025',
      fimDoPeriodo: '27/07/2025',
      diasAtivos: 32,
      convitesEnviados: 82,
      conexoesRealizadas: 32,
      taxaDeAceiteDeConexao: 39,
      mensagensEnviadas: 27,
      visitas: 82,
      likes: 47,
      comentarios: 0,
      totalDeAtividades: 188,
      respostasPositivas: 25,
      leadsProcessados: 85,
      reunioes: 3,
      propostas: 0,
      vendas: 0,
      respostasPositivasConvitesEnviados: 30.5,
      respostasPositivasConexoesRealizadas: 78.1,
      respostasPositivasMensagensEnviadas: 92.6,
      numeroDeReunioesRespostasPositivas: 12.0,
      numeroDeReunioesConvitesEnviados: 3.7,
      observacoes: '-',
      problemasTecnicos: '-',
      ajustesNaPesquisa: '-',
      analiseComparativa: '-'
    }
  ]);

  const handleSaveProfileInfo = () => {
    setIsEditingInfo(false);
    toast.success('Informações do perfil atualizadas com sucesso!');
  };

  const handleCancelEdit = () => {
    setIsEditingInfo(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Perfil: {profileInfo.perfil}</h1>
            <p className="text-muted-foreground">{profileInfo.empresa}</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="weekly">Métricas Semanais</TabsTrigger>
            <TabsTrigger value="calendar">Calendário de Atividades</TabsTrigger>
            <TabsTrigger value="comparison">Comparação de Campanhas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Informações do Perfil - Editável */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Informações do Perfil</CardTitle>
                    <CardDescription>Dados principais da campanha</CardDescription>
                  </div>
                  {!isEditingInfo ? (
                    <Button onClick={() => setIsEditingInfo(true)} variant="outline" size="sm">
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfileInfo} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button onClick={handleCancelEdit} variant="outline" size="sm">
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="empresa">Empresa</Label>
                  <Input
                    id="empresa"
                    value={profileInfo.empresa}
                    onChange={(e) => setProfileInfo({ ...profileInfo, empresa: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perfil">Perfil</Label>
                  <Input
                    id="perfil"
                    value={profileInfo.perfil}
                    onChange={(e) => setProfileInfo({ ...profileInfo, perfil: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="campanhas">Campanhas (separadas por vírgula)</Label>
                  <Textarea
                    id="campanhas"
                    value={profileInfo.campanhas.join(', ')}
                    onChange={(e) => setProfileInfo({ ...profileInfo, campanhas: e.target.value.split(',').map(c => c.trim()) })}
                    disabled={!isEditingInfo}
                    rows={3}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="objetivo">Objetivo das Campanhas</Label>
                  <Textarea
                    id="objetivo"
                    value={profileInfo.objetivoDasCampanhas}
                    onChange={(e) => setProfileInfo({ ...profileInfo, objetivoDasCampanhas: e.target.value })}
                    disabled={!isEditingInfo}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadencia">Cadência</Label>
                  <Input
                    id="cadencia"
                    value={profileInfo.cadencia}
                    onChange={(e) => setProfileInfo({ ...profileInfo, cadencia: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargos">Cargos de Pesquisa</Label>
                  <Input
                    id="cargos"
                    value={profileInfo.cargosNaPesquisa}
                    onChange={(e) => setProfileInfo({ ...profileInfo, cargosNaPesquisa: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Métricas Consolidadas */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas Consolidadas</CardTitle>
                <CardDescription>
                  Período: {metrics.inicioDoPeriodo} - {metrics.fimDoPeriodo} | 
                  {' '}{metrics.campanhasAtivas} campanhas ativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Campanhas Ativas</p>
                    <p className="text-2xl font-bold">{metrics.campanhasAtivas}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Dias Ativos</p>
                    <p className="text-2xl font-bold">{metrics.diasAtivos}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Convites Enviados</p>
                    <p className="text-2xl font-bold">{metrics.convitesEnviados}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Conexões Realizadas</p>
                    <p className="text-2xl font-bold">{metrics.conexoesRealizadas}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Taxa de Aceite</p>
                    <p className="text-2xl font-bold">{metrics.taxaDeAceiteDeConexao}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                    <p className="text-2xl font-bold">{metrics.mensagensEnviadas}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Visitas</p>
                    <p className="text-2xl font-bold">{metrics.visitas}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Likes</p>
                    <p className="text-2xl font-bold">{metrics.likes}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Comentários</p>
                    <p className="text-2xl font-bold">{metrics.comentarios}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total de Atividades</p>
                    <p className="text-2xl font-bold">{metrics.totalDeAtividades}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Respostas Positivas</p>
                    <p className="text-2xl font-bold">{metrics.respostasPositivas}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Reuniões</p>
                    <p className="text-2xl font-bold">{metrics.reunioes}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Propostas</p>
                    <p className="text-2xl font-bold">{metrics.propostas}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Vendas</p>
                    <p className="text-2xl font-bold">{metrics.vendas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Taxas de Conversão */}
            <Card>
              <CardHeader>
                <CardTitle>Taxas de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Respostas Positivas / Convites Enviados</p>
                    <p className="text-2xl font-bold">{conversionRates.respostasPositivasConvitesEnviados}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Respostas Positivas / Conexões Realizadas</p>
                    <p className="text-2xl font-bold">{conversionRates.respostasPositivasConexoesRealizadas}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Respostas Positivas / Mensagens Enviadas</p>
                    <p className="text-2xl font-bold">{conversionRates.respostasPositivasMensagensEnviadas}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Reuniões / Respostas Positivas</p>
                    <p className="text-2xl font-bold">{conversionRates.numeroDeReunioesRespostasPositivas}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Reuniões / Convites Enviados</p>
                    <p className="text-2xl font-bold">{conversionRates.numeroDeReunioesConvitesEnviados}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Observações */}
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Observações Gerais</Label>
                  <Textarea value={observations.observacoes} rows={3} placeholder="Nenhuma observação registrada" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Problemas Técnicos</Label>
                  <Textarea value={observations.problemasTecnicos} rows={3} placeholder="Nenhum problema reportado" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Ajustes na Pesquisa</Label>
                  <Textarea value={observations.ajustesNaPesquisa} rows={3} placeholder="Nenhum ajuste registrado" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Análise Comparativa</Label>
                  <Textarea value={observations.analiseComparativa} rows={3} placeholder="Nenhuma análise disponível" disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Métricas Semanais Detalhadas</CardTitle>
                    <CardDescription>Evolução semanal de todas as métricas e campanhas ativas</CardDescription>
                  </div>
                  <div className="w-72">
                    <Label htmlFor="campaign-select-weekly" className="text-sm mb-2 block">Filtrar por Campanha</Label>
                    <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                      <SelectTrigger id="campaign-select-weekly" className="bg-background">
                        <SelectValue placeholder="Selecione a campanha" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="Todas">Todas as Campanhas</SelectItem>
                        {profileInfo.campanhas.map((campaign, idx) => (
                          <SelectItem key={idx} value={campaign}>{campaign}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {weeklyMetrics
                  .filter(week => 
                    selectedCampaign === 'Todas' || 
                    week.campanhasAtivas.some(c => c.includes(selectedCampaign))
                  )
                  .map((week, index) => (
                  <Collapsible key={index}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="text-left">
                              <CardTitle className="text-lg">{week.semana}</CardTitle>
                              <CardDescription>
                                {week.inicioDoPeriodo} - {week.fimDoPeriodo} | {week.campanhasAtivas.length} campanhas ativas
                              </CardDescription>
                            </div>
                            <ChevronDown className="h-5 w-5" />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-4 pt-0">
                          {/* Campanhas Ativas */}
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Campanhas Ativas:</Label>
                            <div className="flex flex-wrap gap-2">
                              {week.campanhasAtivas.map((campaign, idx) => (
                                <Badge key={idx} variant="outline">{campaign}</Badge>
                              ))}
                            </div>
                          </div>

                          {/* Métricas de Atividade */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Dias Ativos</p>
                              <p className="text-xl font-bold">{week.diasAtivos}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Convites Enviados</p>
                              <p className="text-xl font-bold">{week.convitesEnviados}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Conexões</p>
                              <p className="text-xl font-bold">{week.conexoesRealizadas}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Taxa de Aceite</p>
                              <p className="text-xl font-bold">{week.taxaDeAceiteDeConexao}%</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Mensagens</p>
                              <p className="text-xl font-bold">{week.mensagensEnviadas}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Visitas</p>
                              <p className="text-xl font-bold">{week.visitas}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Likes</p>
                              <p className="text-xl font-bold">{week.likes}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Total Atividades</p>
                              <p className="text-xl font-bold">{week.totalDeAtividades}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Respostas Positivas</p>
                              <p className="text-xl font-bold text-green-600">{week.respostasPositivas}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Reuniões</p>
                              <p className="text-xl font-bold text-blue-600">{week.reunioes}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Propostas</p>
                              <p className="text-xl font-bold text-purple-600">{week.propostas}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Vendas</p>
                              <p className="text-xl font-bold text-yellow-600">{week.vendas}</p>
                            </div>
                          </div>

                          {/* Taxas de Conversão */}
                          <div className="border-t pt-4">
                            <Label className="text-sm font-semibold mb-3 block">Taxas de Conversão:</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Resp. Pos. / Convites</p>
                                <p className="text-lg font-bold">{week.respostasPositivasConvitesEnviados}%</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Resp. Pos. / Conexões</p>
                                <p className="text-lg font-bold">{week.respostasPositivasConexoesRealizadas}%</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Resp. Pos. / Mensagens</p>
                                <p className="text-lg font-bold">{week.respostasPositivasMensagensEnviadas}%</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Reuniões / Resp. Pos.</p>
                                <p className="text-lg font-bold">{week.numeroDeReunioesRespostasPositivas}%</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Reuniões / Convites</p>
                                <p className="text-lg font-bold">{week.numeroDeReunioesConvitesEnviados}%</p>
                              </div>
                            </div>
                          </div>

                          {/* Observações */}
                          {(week.observacoes !== '-' || week.problemasTecnicos !== '-' || week.ajustesNaPesquisa !== '-' || week.analiseComparativa !== '-') && (
                            <div className="border-t pt-4 space-y-3">
                              <Label className="text-sm font-semibold">Observações:</Label>
                              {week.observacoes !== '-' && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Observações Gerais:</p>
                                  <p className="text-sm">{week.observacoes}</p>
                                </div>
                              )}
                              {week.problemasTecnicos !== '-' && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Problemas Técnicos:</p>
                                  <p className="text-sm">{week.problemasTecnicos}</p>
                                </div>
                              )}
                              {week.ajustesNaPesquisa !== '-' && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Ajustes na Pesquisa:</p>
                                  <p className="text-sm">{week.ajustesNaPesquisa}</p>
                                </div>
                              )}
                              {week.analiseComparativa !== '-' && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Análise Comparativa:</p>
                                  <p className="text-sm">{week.analiseComparativa}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Calendário Semanal de Atividades</CardTitle>
                    <CardDescription>Status de atividade por dia da semana</CardDescription>
                  </div>
                  <div className="w-72">
                    <Label htmlFor="campaign-select-calendar" className="text-sm mb-2 block">Filtrar por Campanha</Label>
                    <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                      <SelectTrigger id="campaign-select-calendar" className="bg-background">
                        <SelectValue placeholder="Selecione a campanha" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="Todas">Todas as Campanhas</SelectItem>
                        {profileInfo.campanhas.map((campaign, idx) => (
                          <SelectItem key={idx} value={campaign}>{campaign}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Semana</TableHead>
                      <TableHead className="text-center">Segunda</TableHead>
                      <TableHead className="text-center">Terça</TableHead>
                      <TableHead className="text-center">Quarta</TableHead>
                      <TableHead className="text-center">Quinta</TableHead>
                      <TableHead className="text-center">Sexta</TableHead>
                      <TableHead className="text-center">Sábado</TableHead>
                      <TableHead className="text-center">Domingo</TableHead>
                      <TableHead className="text-center">Dias Ativos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyCalendar
                      .filter((week, index) => {
                        // Se "Todas" está selecionado, mostra todas as semanas
                        if (selectedCampaign === 'Todas') return true;
                        
                        // Encontra a métrica semanal correspondente para verificar campanhas ativas
                        const weekMetric = weeklyMetrics.find(m => m.inicioDoPeriodo === week.semana);
                        
                        // Se não encontrou métrica, não mostra a semana
                        if (!weekMetric) return false;
                        
                        // Verifica se a campanha selecionada estava ativa nesta semana
                        return weekMetric.campanhasAtivas.some(c => c.includes(selectedCampaign));
                      })
                      .map((week, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{week.semana}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={week.segundaFeira === 'Ativo' ? 'default' : 'secondary'}>
                            {week.segundaFeira}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={week.tercaFeira === 'Ativo' ? 'default' : 'secondary'}>
                            {week.tercaFeira}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={week.quartaFeira === 'Ativo' ? 'default' : 'secondary'}>
                            {week.quartaFeira}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={week.quintaFeira === 'Ativo' ? 'default' : 'secondary'}>
                            {week.quintaFeira}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={week.sextaFeira === 'Ativo' ? 'default' : 'secondary'}>
                            {week.sextaFeira}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={week.sabado === 'Ativo' ? 'default' : 'secondary'}>
                            {week.sabado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={week.domingo === 'Ativo' ? 'default' : 'secondary'}>
                            {week.domingo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">{week.diasAtivos}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Comparação entre Campanhas</CardTitle>
                <CardDescription>Métricas lado a lado de todas as campanhas</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Métrica</TableHead>
                      {campaignComparisons.map((campaign, index) => (
                        <TableHead key={index} className="text-center min-w-[150px]">{campaign.campaignName}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Início do Período</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.inicioDoPeriodo}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Fim do Período</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.fimDoPeriodo}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Dias Ativos</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center font-bold">{c.diasAtivos}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Convites Enviados</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.convitesEnviados}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Conexões Realizadas</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.conexoesRealizadas}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Taxa de Aceite (%)</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.taxaDeAceiteDeConexao}%</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Mensagens Enviadas</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.mensagensEnviadas}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Visitas</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.visitas}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Likes</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.likes}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Comentários</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.comentarios}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total de Atividades</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.totalDeAtividades}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Respostas Positivas</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center font-bold">{c.respostasPositivas}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Leads Processados</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.leadsProcessados}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Reuniões</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.reunioes}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Propostas</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.propostas}</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Vendas</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.vendas}</TableCell>)}
                    </TableRow>
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-bold" colSpan={campaignComparisons.length + 1}>Taxas de Conversão</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Respostas Positivas / Convites Enviados (%)</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.respostasPositivasConvitesEnviados}%</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Respostas Positivas / Conexões Realizadas (%)</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.respostasPositivasConexoesRealizadas}%</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Respostas Positivas / Mensagens Enviadas (%)</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.respostasPositivasMensagensEnviadas}%</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Reuniões / Respostas Positivas (%)</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.numeroDeReunioesRespostasPositivas}%</TableCell>)}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Reuniões / Convites Enviados (%)</TableCell>
                      {campaignComparisons.map((c, i) => <TableCell key={i} className="text-center">{c.numeroDeReunioesConvitesEnviados}%</TableCell>)}
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
