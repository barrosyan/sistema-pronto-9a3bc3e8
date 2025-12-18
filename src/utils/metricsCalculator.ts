import { CampaignMetrics, Lead } from '@/types/campaign';
import { parseISO, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';

// Event type mappings (PT and EN) - single source of truth
export const EVENT_TYPE_MAPPINGS = {
  convitesEnviados: ['Connection Requests Sent', 'Convites Enviados'],
  conexoesRealizadas: ['Connection Requests Accepted', 'Conexões Realizadas', 'Connections Made'],
  mensagensEnviadas: ['Messages Sent', 'Mensagens Enviadas'],
  visitas: ['Profile Visits', 'Visitas a Perfil'],
  likes: ['Post Likes', 'Curtidas'],
  comentarios: ['Comments Done', 'Comentários'],
  followUps1: ['Follow-Ups 1'],
  followUps2: ['Follow-Ups 2'],
  followUps3: ['Follow-Ups 3'],
  respostasPositivas: ['Positive Responses', 'Respostas Positivas'],
  reunioes: ['Meetings', 'Reuniões Marcadas'],
  propostas: ['Proposals', 'Propostas'],
  vendas: ['Sales', 'Vendas'],
} as const;

/**
 * Get metric value from dailyData with fallback to totalCount
 * This is the SINGLE SOURCE OF TRUTH for metric calculations
 */
export const getMetricTotal = (
  metric: CampaignMetrics | undefined,
  dateFilter?: DateRange
): number => {
  if (!metric) return 0;

  const dailyData = metric.dailyData || {};
  const entries = Object.entries(dailyData);

  // If no dailyData, use totalCount
  if (entries.length === 0) {
    return metric.totalCount || 0;
  }

  // If no date filter, sum all dailyData
  if (!dateFilter?.from) {
    const dailySum = entries.reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
    // Use dailyData sum if available, otherwise fallback to totalCount
    return dailySum > 0 ? dailySum : (metric.totalCount || 0);
  }

  // With date filter, only sum values within range
  let total = 0;
  entries.forEach(([dateKey, value]) => {
    try {
      if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
      const metricDate = parseISO(dateKey);
      const isInRange = dateFilter.to
        ? isWithinInterval(metricDate, { start: dateFilter.from!, end: dateFilter.to })
        : metricDate >= dateFilter.from!;
      if (isInRange) {
        total += Number(value) || 0;
      }
    } catch (e) {
      // Invalid date, skip
    }
  });
  return total;
};

/**
 * Get metric value from campaign data by event types
 */
export const getMetricValueByEventTypes = (
  campaignData: CampaignMetrics[],
  eventTypes: readonly string[],
  dateFilter?: DateRange
): number => {
  let total = 0;
  for (const eventType of eventTypes) {
    const metric = campaignData.find(m => m.eventType === eventType);
    total += getMetricTotal(metric, dateFilter);
  }
  return total;
};

/**
 * Calculate all campaign metrics in a consistent way
 */
export const calculateCampaignTotals = (
  campaignData: CampaignMetrics[],
  dateFilter?: DateRange
) => {
  const convites = getMetricValueByEventTypes(campaignData, EVENT_TYPE_MAPPINGS.convitesEnviados, dateFilter);
  const conexoes = getMetricValueByEventTypes(campaignData, EVENT_TYPE_MAPPINGS.conexoesRealizadas, dateFilter);
  const visitas = getMetricValueByEventTypes(campaignData, EVENT_TYPE_MAPPINGS.visitas, dateFilter);
  const likes = getMetricValueByEventTypes(campaignData, EVENT_TYPE_MAPPINGS.likes, dateFilter);
  const comentarios = getMetricValueByEventTypes(campaignData, EVENT_TYPE_MAPPINGS.comentarios, dateFilter);
  const followUps1 = getMetricValueByEventTypes(campaignData, EVENT_TYPE_MAPPINGS.followUps1, dateFilter);
  const followUps2 = getMetricValueByEventTypes(campaignData, EVENT_TYPE_MAPPINGS.followUps2, dateFilter);
  const followUps3 = getMetricValueByEventTypes(campaignData, EVENT_TYPE_MAPPINGS.followUps3, dateFilter);
  
  // Messages = sum of follow-ups, or fallback to Messages Sent event
  const followUpsTotal = followUps1 + followUps2 + followUps3;
  const mensagens = followUpsTotal > 0 
    ? followUpsTotal 
    : getMetricValueByEventTypes(campaignData, EVENT_TYPE_MAPPINGS.mensagensEnviadas, dateFilter);

  const taxaAceite = convites > 0 ? ((conexoes / convites) * 100) : 0;

  return {
    convitesEnviados: convites,
    conexoesRealizadas: conexoes,
    mensagensEnviadas: mensagens,
    visitas,
    likes,
    comentarios,
    followUps1,
    followUps2,
    followUps3,
    taxaAceite: taxaAceite.toFixed(1),
    // Total de atividades NÃO inclui conexões (conexões são ações do lead, não do perfil)
    totalAtividades: convites + mensagens + visitas + likes + comentarios,
  };
};

/**
 * Get date range from campaign metrics (first/last date with activity)
 */
export const getDateRangeFromMetrics = (campaignData: CampaignMetrics[]) => {
  const datesWithActivity: string[] = [];

  campaignData.forEach(metric => {
    Object.entries(metric.dailyData || {}).forEach(([date, value]) => {
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number(value) > 0) {
        datesWithActivity.push(date);
      }
    });
  });

  const sortedActiveDates = [...new Set(datesWithActivity)].sort();
  const startDate = sortedActiveDates.length > 0 ? sortedActiveDates[0] : null;
  const endDate = sortedActiveDates.length > 0 ? sortedActiveDates[sortedActiveDates.length - 1] : null;
  const activeDays = sortedActiveDates.length;

  return { startDate, endDate, activeDays };
};

/**
 * Normalize campaign name for matching
 */
export const normalizeCampaignName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+all\s*leads\.?csv$/i, '')
    .replace(/\s+all\s*leads$/i, '')
    .replace(/\.csv$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Check if a lead belongs to a campaign (fuzzy matching)
 */
export const leadBelongsToCampaign = (leadCampaign: string, campaignName: string): boolean => {
  const normalizedLead = normalizeCampaignName(leadCampaign);
  const normalizedCampaign = normalizeCampaignName(campaignName);
  
  if (normalizedLead === normalizedCampaign) return true;
  if (normalizedLead.includes(normalizedCampaign) || normalizedCampaign.includes(normalizedLead)) return true;
  
  return false;
};

/**
 * Classify lead response type based on status and comments
 */
export const getLeadResponseType = (lead: Lead | any): 'positive' | 'negative' | 'pending' => {
  // Check explicit status first
  if (lead.status === 'positive') return 'positive';
  if (lead.status === 'negative') return 'negative';
  
  // Check follow-up comments for response classification
  const commentsToCheck = [
    lead.followUp1Comments || lead.follow_up_1_comments,
    lead.followUp2Comments || lead.follow_up_2_comments,
    lead.followUp3Comments || lead.follow_up_3_comments,
    lead.followUp4Comments || lead.follow_up_4_comments,
    lead.comments,
    lead.statusDetails || lead.status_details
  ].filter(Boolean);
  
  for (const comment of commentsToCheck) {
    const normalized = String(comment).toLowerCase().trim();
    if (normalized.includes('positiv') || normalized === 'sim' || normalized === 'yes' || normalized.includes('resposta: positiva')) {
      return 'positive';
    }
    if (normalized.includes('negativ') || normalized === 'não' || normalized === 'nao' || normalized === 'no' || normalized.includes('resposta: negativa')) {
      return 'negative';
    }
  }
  
  // Check positive/negative response dates
  if (lead.positiveResponseDate || lead.positive_response_date) return 'positive';
  if (lead.negativeResponseDate || lead.negative_response_date) return 'negative';
  
  return 'pending';
};

/**
 * Calculate lead-based metrics for a campaign
 */
export const calculateLeadMetrics = (leads: Lead[], dateFilter?: DateRange) => {
  let filteredLeads = leads;
  
  if (dateFilter?.from) {
    filteredLeads = leads.filter(lead => {
      const dateToCheck = lead.connectionDate || lead.positiveResponseDate;
      if (!dateToCheck) return false;
      try {
        const leadDate = new Date(dateToCheck);
        return dateFilter.to
          ? isWithinInterval(leadDate, { start: dateFilter.from!, end: dateFilter.to })
          : leadDate >= dateFilter.from!;
      } catch {
        return false;
      }
    });
  }

  const positiveLeads = filteredLeads.filter(l => getLeadResponseType(l) === 'positive');
  const negativeLeads = filteredLeads.filter(l => getLeadResponseType(l) === 'negative');

  return {
    total: filteredLeads.length,
    respostasPositivas: positiveLeads.length,
    respostasNegativas: negativeLeads.length,
    reunioes: positiveLeads.filter(l => l.meetingDate).length,
    propostas: positiveLeads.filter(l => l.proposalDate).length,
    vendas: positiveLeads.filter(l => l.saleDate).length,
    valorPropostas: positiveLeads.reduce((sum, l) => sum + (l.proposalValue || 0), 0),
    valorVendas: positiveLeads.reduce((sum, l) => sum + (l.saleValue || 0), 0),
  };
};
