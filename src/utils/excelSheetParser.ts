import * as XLSX from 'xlsx';
import { CampaignMetrics, Lead } from '@/types/campaign';
import { parseCampaignFile } from './campaignParser';

// Alias para compatibilidade
export { parseExcelFile as parseExcelSheets };

export interface CampaignDetails {
  company?: string;
  profile?: string;
  campaignName?: string;
  objective?: string;
  cadence?: string;
  jobTitles?: string;
}

export interface ExcelSheetData {
  campaignMetrics: CampaignMetrics[];
  positiveLeads: Lead[];
  negativeLeads: Lead[];
  campaignDetails?: CampaignDetails;
  allCampaignDetails?: CampaignDetails[];
}

// Função para calcular distância de Levenshtein
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Função para verificar se duas campanhas são similares
function areCampaignsSimilar(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  if (name1 === name2) return true;
  
  const normalized1 = name1.toLowerCase().trim();
  const normalized2 = name2.toLowerCase().trim();
  
  if (normalized1 === normalized2) return true;
  
  const numbers1 = normalized1.match(/\d+/g) || [];
  const numbers2 = normalized2.match(/\d+/g) || [];
  
  if (numbers1.length !== numbers2.length) return false;
  if (numbers1.some((num, idx) => num !== numbers2[idx])) return false;
  
  const text1 = normalized1.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
  const text2 = normalized2.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
  
  if (text1 === text2) return true;
  
  const shorter = text1.length < text2.length ? text1 : text2;
  const longer = text1.length < text2.length ? text2 : text1;
  
  if (longer.includes(shorter) && shorter.length > 0) {
    return shorter.length >= 3;
  }
  
  const maxLength = Math.max(text1.length, text2.length);
  if (maxLength === 0) return true;
  
  const distance = levenshteinDistance(text1, text2);
  const similarity = 1 - (distance / maxLength);
  
  return similarity >= 0.90;
}

// Normalizar nomes de campanha
function normalizeCampaignName(name: string, existingNames?: Set<string>): string {
  if (!name || typeof name !== 'string') return '';
  
  let normalized = name.trim();
  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.replace(/^[,\s]+|[,\s]+$/g, '');
  
  if (existingNames && existingNames.size > 0) {
    for (const existingName of existingNames) {
      if (areCampaignsSimilar(normalized, existingName)) {
        return existingName;
      }
    }
  }
  
  return normalized;
}

// Abas fixas
const FIXED_SHEETS = [
  'campanha 0',
  'campaign 0', 
  'inputs',
  'leads positivos',
  'leads negativos',
  'ssi',
  'posts',
  'compilado',
  'dados gerais'
];

function isFixedSheet(sheetName: string): boolean {
  const normalized = sheetName.toLowerCase().trim();
  return FIXED_SHEETS.some(fixed => normalized.includes(fixed));
}

function shouldIgnoreCampaign(campaignName: string): boolean {
  if (!campaignName) return true;
  
  const normalized = campaignName.toLowerCase().trim();
  const ignoredCampaigns = ['campanha 0', 'campaign 0', 'sent manually'];
  
  return ignoredCampaigns.includes(normalized);
}

// Extrair header da aba de campanha
function extractCampaignHeader(data: any[]): CampaignDetails | null {
  if (!data || data.length < 6) return null;
  
  const header: CampaignDetails = {
    company: '',
    profile: '',
    campaignName: '',
    objective: '',
    cadence: '',
    jobTitles: ''
  };
  
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    if (!row || typeof row !== 'object') continue;
    
    const keys = Object.keys(row);
    const firstValue = row['__EMPTY'] || row['A'] || row[keys[0]];
    const secondValue = row['__EMPTY_1'] || row['B'] || row[keys[1]];
    
    if (!firstValue || !secondValue) continue;
    
    const label = String(firstValue).toLowerCase().trim();
    const value = String(secondValue).trim();
    
    if (label.includes('empresa') || label.includes('company')) {
      header.company = value;
    } else if (label.includes('perfil') || label.includes('profile')) {
      header.profile = value;
    } else if ((label.includes('campanha') || label.includes('campaign')) && !label.includes('objetivo')) {
      header.campaignName = value;
    } else if (label.includes('objetivo') || label.includes('objective')) {
      header.objective = value;
    } else if (label.includes('cadência') || label.includes('cadence')) {
      header.cadence = value;
    } else if (label.includes('cargos') || label.includes('job')) {
      header.jobTitles = value;
    }
  }
  
  return header.campaignName ? header : null;
}

// Parsear métricas semanais da aba de campanha
function parseWeeklyMetricsFromCampaignSheet(
  data: any[], 
  campaignHeader: CampaignDetails, 
  campaignNameConsolidation: Set<string>
): CampaignMetrics[] {
  const metrics: CampaignMetrics[] = [];
  
  if (!data || data.length === 0 || !campaignHeader.campaignName) return metrics;

  const campaignName = normalizeCampaignName(campaignHeader.campaignName, campaignNameConsolidation);
  const profileName = campaignHeader.profile || '';
  
  if (shouldIgnoreCampaign(campaignName)) return metrics;
  
  campaignNameConsolidation.add(campaignName);

  // Encontrar linha "Tipo do dado / Período"
  let metricsStartIndex = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const firstCol = String(row['__EMPTY'] || row['A'] || row[Object.keys(row)[0]] || '').toLowerCase();
    if (firstCol.includes('tipo do dado') || firstCol.includes('período')) {
      metricsStartIndex = i;
      break;
    }
  }
  
  if (metricsStartIndex === -1) return metrics;
  
  const headerRow = data[metricsStartIndex];
  if (!headerRow) return metrics;
  
  const headerKeys = Object.keys(headerRow);
  
  // Mapear colunas para semanas
  const weekColumns: { key: string; weekNumber: number; startDate?: string; endDate?: string }[] = [];
  
  headerKeys.forEach((key, idx) => {
    if (idx === 0) return;
    
    const value = String(headerRow[key] || '').toLowerCase().trim();
    const weekMatch = value.match(/(\d+)[ªº]\s*semana/i);
    
    if (weekMatch) {
      const weekNum = parseInt(weekMatch[1]);
      weekColumns.push({ key, weekNumber: weekNum });
    }
  });
  
  // Extrair datas de início e fim
  if (metricsStartIndex + 1 < data.length) {
    const startRow = data[metricsStartIndex + 1];
    if (startRow) {
      const firstCol = String(startRow['__EMPTY'] || startRow['A'] || startRow[Object.keys(startRow)[0]] || '').toLowerCase();
      if (firstCol.includes('início') || firstCol.includes('inicio')) {
        weekColumns.forEach(col => {
          const dateValue = startRow[col.key];
          if (dateValue) col.startDate = String(dateValue);
        });
      }
    }
  }
  
  if (metricsStartIndex + 2 < data.length) {
    const endRow = data[metricsStartIndex + 2];
    if (endRow) {
      const firstCol = String(endRow['__EMPTY'] || endRow['A'] || endRow[Object.keys(endRow)[0]] || '').toLowerCase();
      if (firstCol.includes('fim')) {
        weekColumns.forEach(col => {
          const dateValue = endRow[col.key];
          if (dateValue) col.endDate = String(dateValue);
        });
      }
    }
  }
  
  // Mapa de métricas
  const metricMap: Record<string, string> = {
    'convites enviados': 'Connection Requests Sent',
    'conexões realizadas': 'Connections Made',
    'conexoes realizadas': 'Connections Made',
    'mensagens enviadas': 'Messages Sent',
    'visitas': 'Profile Visits',
    'likes': 'Post Likes',
    'comentários': 'Comments Done',
    'comentarios': 'Comments Done',
    'total de atividades': 'Total Activities',
    'respostas positivas': 'Positive Responses',
    'leads processados': 'Processed Leads',
    'reuniões': 'Meetings',
    'reunioes': 'Meetings',
    'propostas': 'Proposals',
    'vendas': 'Sales'
  };
  
  // Processar linhas de métricas
  console.log(`[parseWeeklyMetricsFromCampaignSheet] Processing metrics rows for ${campaignName}, starting at row ${metricsStartIndex + 3}`);
  
  for (let rowIdx = metricsStartIndex + 3; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;
    
    const metricLabel = String(row['__EMPTY'] || row['A'] || row[Object.keys(row)[0]] || '').toLowerCase().trim();
    
    if (metricLabel.includes('taxas de conversão') || 
        metricLabel.includes('detalhamento') ||
        metricLabel.includes('observações')) {
      console.log(`[parseWeeklyMetricsFromCampaignSheet] Stopped at row ${rowIdx}: found ${metricLabel}`);
      break;
    }
    
    if (!metricLabel) continue;
    
    const eventType = metricMap[metricLabel];
    if (!eventType) {
      console.log(`[parseWeeklyMetricsFromCampaignSheet] ⚠️ No mapping for metric: "${metricLabel}"`);
      continue;
    }
    
    console.log(`[parseWeeklyMetricsFromCampaignSheet] Processing ${metricLabel} -> ${eventType}`);
    
    // Processar cada semana
    let totalForMetric = 0;
    weekColumns.forEach(({ key, weekNumber, startDate, endDate }) => {
      const value = row[key];
      const count = typeof value === 'number' ? value : (value ? parseInt(String(value)) || 0 : 0);
      totalForMetric += count;
      
      let metric = metrics.find(m => 
        m.campaignName === campaignName && 
        m.eventType === eventType &&
        m.profileName === profileName
      );
      
      if (!metric) {
        metric = {
          campaignName,
          eventType,
          profileName,
          totalCount: 0,
          dailyData: {}
        };
        metrics.push(metric);
      }
      
      const weekKey = `week-${weekNumber}`;
      metric.dailyData[weekKey] = count;
      metric.totalCount += count;
    });
    
    console.log(`[parseWeeklyMetricsFromCampaignSheet] ${eventType}: total=${totalForMetric} across ${weekColumns.length} weeks`);
  }
  
  console.log(`[parseWeeklyMetricsFromCampaignSheet] Extracted ${metrics.length} metric entries for ${campaignName}`);
  metrics.forEach(m => {
    console.log(`  - ${m.eventType}: total=${m.totalCount}, days=${Object.keys(m.dailyData).length}`);
  });
  
  return metrics;
}

// Parsear métricas diárias da aba "Diário"
function parseDailyMetricsFromDiarioSheet(
  data: any[], 
  campaignHeader: CampaignDetails, 
  campaignNameConsolidation: Set<string>
): CampaignMetrics[] {
  const metrics: CampaignMetrics[] = [];
  
  if (!data || data.length === 0 || !campaignHeader.campaignName) return metrics;

  const campaignName = normalizeCampaignName(campaignHeader.campaignName, campaignNameConsolidation);
  const profileName = campaignHeader.profile || '';
  
  if (shouldIgnoreCampaign(campaignName)) return metrics;

  const metricMap: Record<string, string> = {
    'invites': 'Connection Requests Sent',
    'aceite': 'Connections Made',
    'visitas': 'Profile Visits',
    'likes': 'Post Likes',
    'comentários': 'Comments Done',
    'comentarios': 'Comments Done',
    'fu 1': 'Follow Up 1',
    'fu 2': 'Follow Up 2',
    'fu 3': 'Follow Up 3',
    'respostas gerais': 'General Responses',
    'respostas positivas': 'Positive Responses',
    'reuniões marcadas': 'Meetings Scheduled',
    'reunioes marcadas': 'Meetings Scheduled',
    'leads processados': 'Processed Leads'
  };
  
  let i = 0;
  while (i < data.length) {
    const row = data[i];
    if (!row) {
      i++;
      continue;
    }
    
    const firstCol = String(row['__EMPTY'] || row['A'] || row[Object.keys(row)[0]] || '').toLowerCase().trim();
    const weekMatch = firstCol.match(/semana\s+(\d+)/i);
    
    if (weekMatch) {
      const weekNumber = parseInt(weekMatch[1]);
      
      if (i + 1 >= data.length) break;
      const daysRow = data[i + 1];
      if (!daysRow) {
        i++;
        continue;
      }
      
      const daysLabel = String(daysRow['__EMPTY'] || daysRow['A'] || daysRow[Object.keys(daysRow)[0]] || '').toLowerCase();
      if (!daysLabel.includes('dias da semana')) {
        i++;
        continue;
      }
      
      const daysKeys = Object.keys(daysRow).slice(1, 8);
      const dates: string[] = [];
      
      daysKeys.forEach(key => {
        const dateValue = daysRow[key];
        if (dateValue) dates.push(String(dateValue));
      });
      
      let metricRowIdx = i + 2;
      while (metricRowIdx < data.length) {
        const metricRow = data[metricRowIdx];
        if (!metricRow) break;
        
        const metricLabel = String(metricRow['__EMPTY'] || metricRow['A'] || metricRow[Object.keys(metricRow)[0]] || '').toLowerCase().trim();
        
        if (metricLabel.match(/semana\s+\d+/i)) break;
        if (!metricLabel) {
          metricRowIdx++;
          continue;
        }
        
        const eventType = metricMap[metricLabel.replace(':', '')];
        if (!eventType) {
          metricRowIdx++;
          continue;
        }
        
        daysKeys.forEach((key, dayIdx) => {
          const value = metricRow[key];
          const count = typeof value === 'number' ? value : (value ? parseInt(String(value)) || 0 : 0);
          
          if (count > 0) {
            let metric = metrics.find(m => 
              m.campaignName === campaignName && 
              m.eventType === eventType &&
              m.profileName === profileName
            );
            
            if (!metric) {
              metric = {
                campaignName,
                eventType,
                profileName,
                totalCount: 0,
                dailyData: {}
              };
              metrics.push(metric);
            }
            
            const dateKey = dates[dayIdx] || `week${weekNumber}-day${dayIdx + 1}`;
            metric.dailyData[dateKey] = count;
            metric.totalCount += count;
          }
        });
        
        metricRowIdx++;
      }
      
      i = metricRowIdx;
    } else {
      i++;
    }
  }
  
  return metrics;
}

// Parsear aba Inputs (métricas diárias por campanha/perfil/evento)
function parseInputsSheet(data: any[], campaignNameConsolidation: Set<string>): CampaignMetrics[] {
  const metrics: CampaignMetrics[] = [];
  if (!data || data.length < 2) return metrics;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const campaignName = normalizeCampaignName(
      String(row['Campaign Name'] || row['Campanha'] || '').trim(),
      campaignNameConsolidation
    );
    const eventType = String(row['Event Type'] || row['Tipo de Evento'] || '').trim();
    const profileName = String(row['Profile Name'] || row['Perfil'] || '').trim();
    
    if (!campaignName || !eventType || !profileName || shouldIgnoreCampaign(campaignName)) continue;
    
    campaignNameConsolidation.add(campaignName);
    
    const dailyData: Record<string, number> = {};
    let totalCount = 0;
    
    // Processar colunas de data (formato YYYY-MM-DD)
    Object.keys(row).forEach(key => {
      if (key.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const value = row[key];
        const count = typeof value === 'number' ? value : (value ? parseInt(String(value)) || 0 : 0);
        if (count > 0) {
          dailyData[key] = count;
          totalCount += count;
        }
      }
    });
    
    if (totalCount > 0) {
      metrics.push({
        campaignName,
        eventType,
        profileName,
        totalCount,
        dailyData
      });
    }
  }
  
  return metrics;
}

// Parsear aba Compilado (dados agregados semanais)
function parseCompiladoSheet(data: any[], campaignNameConsolidation: Set<string>): CampaignMetrics[] {
  const metrics: CampaignMetrics[] = [];
  if (!data || data.length < 2) return metrics;
  
  // Encontrar linha "Campanhas Ativas" que contém os nomes das campanhas por semana
  let campaignsRow: any = null;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const firstCol = String(row['__EMPTY'] || row['A'] || row[Object.keys(row)[0]] || '').toLowerCase();
    if (firstCol.includes('campanhas ativas')) {
      campaignsRow = row;
      break;
    }
  }
  
  if (!campaignsRow) return metrics;
  
  // Extrair nomes de campanhas (separadas por vírgula)
  const weekKeys = Object.keys(campaignsRow).filter(k => k !== '__EMPTY' && k !== 'A');
  const campaignsByWeek: Record<string, string[]> = {};
  
  weekKeys.forEach(key => {
    const campaignsStr = String(campaignsRow[key] || '');
    if (campaignsStr) {
      const campaigns = campaignsStr.split(',').map(c => {
        const normalized = normalizeCampaignName(c.trim(), campaignNameConsolidation);
        if (!shouldIgnoreCampaign(normalized)) {
          campaignNameConsolidation.add(normalized);
          return normalized;
        }
        return null;
      }).filter(Boolean) as string[];
      
      campaignsByWeek[key] = campaigns;
    }
  });
  
  return metrics;
}

// Parsear aba Dados Gerais (comparativo entre campanhas)
function parseDadosGeraisSheet(data: any[], campaignNameConsolidation: Set<string>): CampaignMetrics[] {
  const metrics: CampaignMetrics[] = [];
  if (!data || data.length < 2) return metrics;
  
  // A primeira linha contém os nomes das campanhas (cada coluna é uma campanha)
  const headerRow = data[0];
  if (!headerRow) return metrics;
  
  const campaignColumns: { key: string; campaignName: string }[] = [];
  
  Object.keys(headerRow).forEach(key => {
    if (key === '__EMPTY' || key === 'A') return; // Pular primeira coluna (labels)
    
    const campaignName = normalizeCampaignName(
      String(headerRow[key] || '').trim(),
      campaignNameConsolidation
    );
    
    if (campaignName && !shouldIgnoreCampaign(campaignName)) {
      campaignNameConsolidation.add(campaignName);
      campaignColumns.push({ key, campaignName });
    }
  });
  
  return metrics;
}


// Parsear leads positivos
function parsePositiveLeads(data: any[]): Lead[] {
  const leads: Lead[] = [];
  if (!data || data.length < 2) return leads;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const name = String(row['Nome'] || row['Name'] || '').trim();
    const campaign = String(row['Campanha'] || row['Campaign'] || '').trim();
    
    if (!name || !campaign) continue;
    
    leads.push({
      id: `lead-${i}`,
      name,
      campaign,
      company: String(row['Empresa'] || row['Company'] || ''),
      position: String(row['Cargo'] || row['Position'] || ''),
      linkedin: String(row['LinkedIn'] || ''),
      whatsapp: String(row['WhatsApp'] || ''),
      status: 'positive',
      source: 'Kontax',
      positiveResponseDate: String(row['Data Resposta Positiva'] || ''),
      transferDate: String(row['Data Repasse'] || ''),
      comments: String(row['Comentários'] || row['Comments'] || ''),
      profile: String(row['Perfil'] || row['Profile'] || ''),
      classification: String(row['Classificação'] || row['Classification'] || '')
    });
  }
  
  return leads;
}

// Parsear leads negativos
function parseNegativeLeads(data: any[]): Lead[] {
  const leads: Lead[] = [];
  if (!data || data.length < 2) return leads;
  
  console.log(`[parseNegativeLeads] Starting parse, total rows: ${data.length}`);
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) {
      console.log(`[parseNegativeLeads] Row ${i}: empty, skipping`);
      continue;
    }
    
    const name = String(row['Nome'] || row['Name'] || '').trim();
    const campaign = String(row['Campanha'] || row['Campaign'] || '').trim();
    
    if (!name || !campaign) {
      console.log(`[parseNegativeLeads] Row ${i}: missing name or campaign (name="${name}", campaign="${campaign}"), skipping`);
      continue;
    }
    
    console.log(`[parseNegativeLeads] Row ${i}: Processing lead "${name}" from campaign "${campaign}"`);
    
    leads.push({
      id: `lead-neg-${i}`,
      name,
      campaign,
      company: String(row['Empresa'] || row['Company'] || ''),
      position: String(row['Cargo'] || row['Position'] || ''),
      linkedin: String(row['LinkedIn'] || ''),
      status: 'negative',
      source: 'Kontax',
      negativeResponseDate: String(row['Data Resposta Negativa'] || ''),
      transferDate: String(row['Data Repasse'] || ''),
      observations: String(row['Observações'] || row['Observations'] || ''),
      hadFollowUp: row['Teve FU?'] === 'Sim' || row['Teve FU?'] === 'Yes',
      followUpReason: String(row['Porque?'] || row['Why?'] || '')
    });
    
    console.log(`[parseNegativeLeads] Row ${i}: Lead "${name}" added successfully`);
  }
  
  console.log(`[parseNegativeLeads] ✅ Parsed ${leads.length} negative leads from ${data.length - 1} data rows`);
  
  return leads;
}

// Função principal
export function parseExcelFile(file: File): Promise<ExcelSheetData> {
  return new Promise(async (resolve, reject) => {
    // Verificar se é CSV primeiro
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      try {
        const campaignData = await parseCampaignFile(file);
        resolve({
          campaignMetrics: campaignData.metrics,
          positiveLeads: campaignData.leads,
          negativeLeads: [],
          allCampaignDetails: []
        });
        return;
      } catch (error) {
        console.error('Erro ao processar CSV:', error);
        reject(error);
        return;
      }
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      console.log('=== INICIANDO PARSE DO EXCEL ===');
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const result: ExcelSheetData = {
          campaignMetrics: [],
          positiveLeads: [],
          negativeLeads: [],
          allCampaignDetails: []
        };
        
        const campaignNameConsolidation = new Set<string>();
        
        console.log(`Total de abas no arquivo: ${workbook.SheetNames.length}`);
        console.log('Abas encontradas:', workbook.SheetNames);
        
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_json(sheet);
          const normalizedName = sheetName.toLowerCase().trim();
          
          console.log(`\n--- Processando aba: ${sheetName} (${sheetData.length} linhas) ---`);
          
          // Processar Leads Positivos
          if (normalizedName.includes('leads positivos')) {
            console.log('✓ Detectado: Leads Positivos');
            result.positiveLeads = parsePositiveLeads(sheetData);
            console.log(`Leads positivos importados: ${result.positiveLeads.length}`);
            return;
          }
          
          // Processar Leads Negativos
          if (normalizedName.includes('leads negativos')) {
            console.log('✓ Detectado: Leads Negativos');
            result.negativeLeads = parseNegativeLeads(sheetData);
            console.log(`Leads negativos importados: ${result.negativeLeads.length}`);
            return;
          }
          
          // Processar aba Inputs (métricas diárias)
          if (normalizedName.includes('inputs')) {
            console.log('✓ Detectado: Inputs (métricas diárias)');
            const inputsMetrics = parseInputsSheet(sheetData, campaignNameConsolidation);
            console.log(`Métricas da aba Inputs: ${inputsMetrics.length}`);
            result.campaignMetrics.push(...inputsMetrics);
            return;
          }
          
          // Processar aba Compilado (dados consolidados)
          if (normalizedName.includes('compilado')) {
            console.log('✓ Detectado: Compilado (dados consolidados)');
            const compiladoMetrics = parseCompiladoSheet(sheetData, campaignNameConsolidation);
            console.log(`Métricas da aba Compilado: ${compiladoMetrics.length}`);
            result.campaignMetrics.push(...compiladoMetrics);
            return;
          }
          
          // Processar aba Dados Gerais (comparativo de campanhas)
          if (normalizedName.includes('dados gerais')) {
            console.log('✓ Detectado: Dados Gerais (comparativo)');
            const dadosGeraisMetrics = parseDadosGeraisSheet(sheetData, campaignNameConsolidation);
            console.log(`Métricas da aba Dados Gerais: ${dadosGeraisMetrics.length}`);
            result.campaignMetrics.push(...dadosGeraisMetrics);
            return;
          }
          
          // Outras abas fixas (ignorar)
          if (isFixedSheet(sheetName)) {
            console.log(`⊘ Aba fixa ignorada: ${sheetName}`);
            return;
          }
          
          // Processar abas de campanha individual
          console.log('→ Tentando processar como aba de campanha individual...');
          const campaignHeader = extractCampaignHeader(sheetData);
          if (!campaignHeader || !campaignHeader.campaignName) {
            console.log(`✗ Não foi possível extrair header de campanha`);
            return;
          }
          
          console.log(`✓ Header de campanha extraído: ${campaignHeader.campaignName}`);
          result.allCampaignDetails?.push(campaignHeader);
          
          if (normalizedName.includes('diário') || normalizedName.includes('diario')) {
            console.log('→ Processando como aba DIÁRIA');
            const dailyMetrics = parseDailyMetricsFromDiarioSheet(sheetData, campaignHeader, campaignNameConsolidation);
            console.log(`Métricas diárias extraídas: ${dailyMetrics.length}`);
            result.campaignMetrics.push(...dailyMetrics);
          } else {
            console.log('→ Processando como aba SEMANAL');
            const weeklyMetrics = parseWeeklyMetricsFromCampaignSheet(sheetData, campaignHeader, campaignNameConsolidation);
            console.log(`Métricas semanais extraídas: ${weeklyMetrics.length}`);
            result.campaignMetrics.push(...weeklyMetrics);
          }
        });
        
        // Consolidar métricas
        const consolidatedMetrics: Record<string, CampaignMetrics> = {};
        
        result.campaignMetrics.forEach(metric => {
          const key = `${metric.campaignName}|${metric.eventType}|${metric.profileName}`;
          
          if (!consolidatedMetrics[key]) {
            consolidatedMetrics[key] = { ...metric };
          } else {
            Object.entries(metric.dailyData).forEach(([date, count]) => {
              if (typeof count === 'number') {
                if (typeof consolidatedMetrics[key].dailyData[date] === 'number') {
                  consolidatedMetrics[key].dailyData[date] = (consolidatedMetrics[key].dailyData[date] as number) + count;
                } else {
                  consolidatedMetrics[key].dailyData[date] = count;
                }
              } else {
                consolidatedMetrics[key].dailyData[date] = count;
              }
            });
            
            consolidatedMetrics[key].totalCount = Object.values(consolidatedMetrics[key].dailyData)
              .filter(v => typeof v === 'number')
              .reduce((sum, val) => sum + (val as number), 0);
          }
        });
        
        result.campaignMetrics = Object.values(consolidatedMetrics);
        
        console.log('\n=== RESUMO DO PARSE ===');
        console.log(`Campanhas detectadas: ${result.campaignMetrics.length > 0 ? Array.from(new Set(result.campaignMetrics.map(m => m.campaignName))).join(', ') : 'Nenhuma'}`);
        console.log(`Total de métricas: ${result.campaignMetrics.length}`);
        console.log(`Leads positivos: ${result.positiveLeads.length}`);
        console.log(`Leads negativos: ${result.negativeLeads.length}`);
        console.log(`Detalhes de campanhas: ${result.allCampaignDetails?.length || 0}`);
        console.log('========================\n');
        
        resolve(result);
      } catch (error) {
        console.error('Erro ao processar Excel:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsBinaryString(file);
  });
}
