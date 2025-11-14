// Tipos para representar dados de perfil e campanhas consolidadas

export interface ProfileInfo {
  empresa: string;
  perfil: string;
  campanhas: string[]; // Array com todas as campanhas
  objetivoDasCampanhas: string;
  cadencia: string;
  cargosNaPesquisa: string;
}

export interface WeeklyMetrics {
  semana: string; // Ex: "1ª Semana", "2ª Semana"
  inicioDoPeriodo: string;
  fimDoPeriodo: string;
  campanhasAtivas: string[]; // Campanhas ativas nesta semana
  diasAtivos: number;
  convitesEnviados: number;
  conexoesRealizadas: number;
  taxaDeAceiteDeConexao: number;
  mensagensEnviadas: number;
  visitas: number;
  likes: number;
  comentarios: number;
  totalDeAtividades: number;
  respostasPositivas: number;
  leadsProcessados: number;
  reunioes: number;
  propostas: number;
  vendas: number;
  // Taxas de conversão
  respostasPositivasConvitesEnviados: number;
  respostasPositivasConexoesRealizadas: number;
  respostasPositivasMensagensEnviadas: number;
  numeroDeReunioesRespostasPositivas: number;
  numeroDeReunioesConvitesEnviados: number;
  // Observações
  observacoes: string;
  problemasTecnicos: string;
  ajustesNaPesquisa: string;
  analiseComparativa: string;
}

export interface ConsolidatedMetrics {
  inicioDoPeriodo: string;
  fimDoPeriodo: string;
  campanhasAtivas: number;
  diasAtivos: number;
  convitesEnviados: number;
  conexoesRealizadas: number;
  taxaDeAceiteDeConexao: number;
  mensagensEnviadas: number;
  visitas: number;
  likes: number;
  comentarios: number;
  totalDeAtividades: number;
  respostasPositivas: number;
  leadsProcessados: number;
  reunioes: number;
  propostas: number;
  vendas: number;
}

export interface ConversionRates {
  respostasPositivasConvitesEnviados: number;
  respostasPositivasConexoesRealizadas: number;
  respostasPositivasMensagensEnviadas: number;
  numeroDeReunioesRespostasPositivas: number;
  numeroDeReunioesConvitesEnviados: number;
}

export interface ProfileObservations {
  observacoes: string;
  problemasTecnicos: string;
  ajustesNaPesquisa: string;
  analiseComparativa: string;
}

export interface WeeklyActivityCalendar {
  semana: string; // Data de início da semana
  segundaFeira: 'Ativo' | 'Inativo';
  tercaFeira: 'Ativo' | 'Inativo';
  quartaFeira: 'Ativo' | 'Inativo';
  quintaFeira: 'Ativo' | 'Inativo';
  sextaFeira: 'Ativo' | 'Inativo';
  sabado: 'Ativo' | 'Inativo';
  domingo: 'Ativo' | 'Inativo';
  diasAtivos: number;
}

export interface CampaignComparison {
  campaignName: string;
  inicioDoPeriodo: string;
  fimDoPeriodo: string;
  diasAtivos: number;
  convitesEnviados: number;
  conexoesRealizadas: number;
  taxaDeAceiteDeConexao: number;
  mensagensEnviadas: number;
  visitas: number;
  likes: number;
  comentarios: number;
  totalDeAtividades: number;
  respostasPositivas: number;
  leadsProcessados: number;
  reunioes: number;
  propostas: number;
  vendas: number;
  // Taxas de conversão
  respostasPositivasConvitesEnviados: number;
  respostasPositivasConexoesRealizadas: number;
  respostasPositivasMensagensEnviadas: number;
  numeroDeReunioesRespostasPositivas: number;
  numeroDeReunioesConvitesEnviados: number;
  // Observações
  observacoes: string;
  problemasTecnicos: string;
  ajustesNaPesquisa: string;
  analiseComparativa: string;
}

export interface ProfileData {
  profileInfo: ProfileInfo;
  consolidatedMetrics: ConsolidatedMetrics; // Somatório geral (coluna "Dados Gerais")
  conversionRates: ConversionRates; // Taxas de conversão gerais
  observations: ProfileObservations; // Observações gerais (resumo)
  weeklyMetrics: WeeklyMetrics[]; // Métricas por semana
  weeklyActivityCalendar: WeeklyActivityCalendar[]; // Calendário de atividades
  campaignComparisons: CampaignComparison[]; // Comparação individual de cada campanha
}
