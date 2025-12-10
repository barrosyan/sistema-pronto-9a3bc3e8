// Standardized metrics order and definitions for the entire application

export const METRICS_ORDER = [
  { key: 'startDate', label: 'Início do Período', type: 'date' },
  { key: 'endDate', label: 'Fim do Período', type: 'date' },
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

// Event type mappings (PT and EN)
export const EVENT_TYPE_MAPPINGS: Record<string, string> = {
  'Connection Requests Sent': 'convitesEnviados',
  'Convites Enviados': 'convitesEnviados',
  'Connection Requests Accepted': 'conexoesRealizadas',
  'Conexões Realizadas': 'conexoesRealizadas',
  'Connections Made': 'conexoesRealizadas',
  'Messages Sent': 'mensagensEnviadas',
  'Mensagens Enviadas': 'mensagensEnviadas',
  'Profile Visits': 'visitas',
  'Visitas a Perfil': 'visitas',
  'Visitas': 'visitas',
  'Post Likes': 'likes',
  'Curtidas': 'likes',
  'Comments Done': 'comentarios',
  'Comentários': 'comentarios',
  'Follow-Ups 1': 'followUps1',
  'Follow-Ups 2': 'followUps2',
  'Follow-Ups 3': 'followUps3',
  'Positive Responses': 'respostasPositivas',
  'Respostas Positivas': 'respostasPositivas',
  'Meetings': 'reunioes',
  'Reuniões': 'reunioes',
  'Reuniões Marcadas': 'reunioes',
  'Proposals': 'propostas',
  'Propostas': 'propostas',
  'Sales': 'vendas',
  'Vendas': 'vendas',
};

export const getEventTypeKey = (eventType: string): string | null => {
  return EVENT_TYPE_MAPPINGS[eventType] || null;
};

export type MetricKey = typeof METRICS_ORDER[number]['key'];
