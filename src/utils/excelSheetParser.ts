import * as XLSX from 'xlsx';
import { CampaignMetrics, Lead } from '@/types/campaign';
import { parseCampaignFile } from './campaignParser';

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
  allCampaignDetails?: CampaignDetails[]; // Array com detalhes de todas as campanhas encontradas
}

// Função para normalizar e validar strings
function normalizeAndValidate(value: any): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim();
}

// Função para calcular distância de Levenshtein entre duas strings
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

// Função para verificar se duas campanhas devem ser consideradas iguais
function areCampaignsSimilar(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  if (name1 === name2) return true;
  
  const normalized1 = name1.toLowerCase().trim();
  const normalized2 = name2.toLowerCase().trim();
  
  if (normalized1 === normalized2) return true;
  
  // Extrair partes numéricas de ambos os nomes
  const numbers1 = normalized1.match(/\d+/g) || [];
  const numbers2 = normalized2.match(/\d+/g) || [];
  
  // Se tiverem números diferentes, são campanhas diferentes
  if (numbers1.length !== numbers2.length) return false;
  if (numbers1.some((num, idx) => num !== numbers2[idx])) return false;
  
  // Remover números para comparação textual
  const text1 = normalized1.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
  const text2 = normalized2.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
  
  if (text1 === text2) return true;
  
  // Verificar se um nome está completamente contido no outro
  const shorter = text1.length < text2.length ? text1 : text2;
  const longer = text1.length < text2.length ? text2 : text1;
  
  if (longer.includes(shorter) && shorter.length > 0) {
    // Só considera igual se o nome menor for significativo (>= 3 caracteres)
    return shorter.length >= 3;
  }
  
  // Calcular similaridade por distância de Levenshtein
  const maxLength = Math.max(text1.length, text2.length);
  if (maxLength === 0) return true;
  
  const distance = levenshteinDistance(text1, text2);
  const similarity = 1 - (distance / maxLength);
  
  // Considera similar se tiver 90% de similaridade ou mais
  return similarity >= 0.90;
}

// Função para normalizar nomes de campanha para consolidação
// Retorna o nome canônico baseado em nomes similares já processados
function normalizeCampaignName(name: string, existingNames?: Set<string>): string {
  if (!name || typeof name !== 'string') return '';
  
  // Limpeza básica
  let normalized = name.trim();
  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.replace(/^[,\s]+|[,\s]+$/g, '');
  
  // Se temos uma lista de nomes existentes, procurar por similar
  if (existingNames && existingNames.size > 0) {
    for (const existingName of existingNames) {
      if (areCampaignsSimilar(normalized, existingName)) {
        console.log(`Consolidando "${normalized}" em "${existingName}"`);
        return existingName;
      }
    }
  }
  
  return normalized;
}

// Função para verificar se uma string é válida (não vazia após trim)
function isValidString(value: string): boolean {
  return value.length > 0;
}

// Helper function to extract campaign details from a sheet looking for "Dados da campanha" section
function extractCampaignDetailsFromSheet(sheet: XLSX.WorkSheet): { details: CampaignDetails | null; endRow: number } {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  // Find the row with "Dados da campanha"
  const campaignDataRowIndex = data.findIndex(row => 
    row && row.some((cell: any) => 
      typeof cell === 'string' && cell.toLowerCase().includes('dados da campanha')
    )
  );
  
  if (campaignDataRowIndex === -1) return { details: null, endRow: 0 };
  
  // Extract details from rows after "Dados da campanha"
  const details: CampaignDetails = {};
  let lastDetailRow = campaignDataRowIndex + 1;
  
  for (let i = campaignDataRowIndex + 1; i < Math.min(campaignDataRowIndex + 10, data.length); i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;
    
    const label = String(row[0] || '').trim();
    const value = String(row[1] || '').trim();
    
    if (!label || !value) continue;
    
    lastDetailRow = i + 1; // Track the last row with detail data
    
    if (label.toLowerCase().includes('empresa') || label.toLowerCase() === 'company') {
      details.company = value;
    } else if (label.toLowerCase().includes('perfil') || label.toLowerCase() === 'profile') {
      details.profile = value;
    } else if (label.toLowerCase().includes('campanha') && !label.toLowerCase().includes('objetivo')) {
      details.campaignName = value;
    } else if (label.toLowerCase().includes('objetivo')) {
      details.objective = value;
    } else if (label.toLowerCase().includes('cadência') || label.toLowerCase().includes('cadence')) {
      details.cadence = value;
    } else if (label.toLowerCase().includes('cargos')) {
      details.jobTitles = value;
    }
  }
  
  return { 
    details: Object.keys(details).length > 0 ? details : null, 
    endRow: lastDetailRow 
  };
}

// Mapeamento de nomes de métricas em português para event types
const metricNameMapping: Record<string, string> = {
  'convites enviados': 'Connection Requests Sent',
  'invites': 'Connection Requests Sent',
  'conexões realizadas': 'Connection Requests Accepted',
  'aceite': 'Connection Requests Accepted',
  'mensagens enviadas': 'Messages Sent',
  'fu 1': 'Messages Sent', // Follow-up 1
  'fu 2': 'Messages Sent', // Follow-up 2
  'fu 3': 'Messages Sent', // Follow-up 3
  'visitas': 'Profile Visits',
  'likes': 'Post Likes',
  'comentários': 'Comments Done',
  'respostas positivas': 'Positive Responses',
  'reuniões marcadas': 'Meetings Scheduled',
  'leads processados': 'Leads Processed',
};

// Helper function to normalize metric names
function normalizeMetricName(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  return metricNameMapping[normalized] || null;
}

// Helper function to parse date from DD/MM/YYYY to YYYY-MM-DD
function parseDateDDMMYYYY(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  return null;
}

// Extract weekly metrics from campaign sheets (non-daily format)
function extractWeeklyMetricsFromSheet(
  sheet: XLSX.WorkSheet,
  campaignName: string,
  profileName: string
): CampaignMetrics[] {
  const metrics: CampaignMetrics[] = [];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  // Find "Tipo do dado / Período" row
  let headerRowIndex = -1;
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (row && row[0] && String(row[0]).toLowerCase().includes('tipo do dado')) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    console.log(`Formato semanal não encontrado na aba ${campaignName}`);
    return metrics;
  }
  
  // Get week headers (1ª Semana, 2ª Semana, etc.)
  const weekHeaders = rawData[headerRowIndex].slice(1);
  
  // Find "Início do Período" row to get start dates
  const startDateRowIndex = headerRowIndex + 1;
  const startDateRow = rawData[startDateRowIndex];
  if (!startDateRow || String(startDateRow[0]).toLowerCase() !== 'início do período') {
    console.log(`Linha "Início do Período" não encontrada na aba ${campaignName}`);
    return metrics;
  }
  const startDates = startDateRow.slice(1);
  
  // Find "Fim do Período" row (optional for validation)
  const endDateRowIndex = headerRowIndex + 2;
  
  // Skip "Dias Ativos" row
  // Metrics start after this
  const firstMetricRowIndex = headerRowIndex + 4;
  
  // Process metric rows
  for (let i = firstMetricRowIndex; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[0]) continue;
    
    const metricLabel = String(row[0]).trim();
    if (!metricLabel) continue;
    
    // Stop at "Taxas de Conversão" or similar sections
    if (metricLabel.toLowerCase().includes('taxas de conversão') ||
        metricLabel.toLowerCase().includes('detalhamento') ||
        metricLabel.toLowerCase().includes('observações') ||
        metricLabel.toLowerCase().includes('problemas técnicos') ||
        metricLabel.toLowerCase().includes('ajustes na pesquisa') ||
        metricLabel.toLowerCase().includes('análise comparativa')) {
      break;
    }
    
    const eventType = normalizeMetricName(metricLabel);
    if (!eventType) {
      console.log(`Métrica não reconhecida: "${metricLabel}"`);
      continue;
    }
    
    // Build daily data from weekly values
    const dailyData: Record<string, number> = {};
    let totalCount = 0;
    
    for (let weekIdx = 0; weekIdx < weekHeaders.length; weekIdx++) {
      const value = row[weekIdx + 1];
      const numericValue = Number(value) || 0;
      const startDate = startDates[weekIdx];
      
      if (startDate && numericValue > 0) {
        const parsedDate = parseDateDDMMYYYY(String(startDate));
        if (parsedDate) {
          dailyData[parsedDate] = numericValue;
          totalCount += numericValue;
        }
      }
    }
    
    // Only add metric if there's actual data
    if (totalCount > 0 || Object.keys(dailyData).length > 0) {
      metrics.push({
        campaignName,
        eventType,
        profileName,
        totalCount,
        dailyData,
      });
      console.log(`Métrica adicionada: ${campaignName} - ${eventType} - Total: ${totalCount}`);
    }
  }
  
  console.log(`Extraídas ${metrics.length} métricas semanais da aba ${campaignName}`);
  return metrics;
}

// Extract daily metrics from "Diário [NAME]" sheets
function extractDailyMetricsFromSheet(
  sheet: XLSX.WorkSheet,
  campaignName: string,
  profileName: string
): CampaignMetrics[] {
  const metrics: CampaignMetrics[] = [];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  // Track metrics across all weeks
  const metricAccumulator: Map<string, Record<string, number>> = new Map();
  
  // Find all "Semana X" blocks
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[0]) continue;
    
    const cellValue = String(row[0]).toLowerCase().trim();
    
    // Check if this is a week header
    if (cellValue.startsWith('semana ')) {
      // Next row should be "Dias da Semana" with dates
      const dateRow = rawData[i + 1];
      if (!dateRow || String(dateRow[0]).toLowerCase() !== 'dias da semana') continue;
      
      const dates = dateRow.slice(1, 8); // 7 days
      const parsedDates = dates.map((d: any) => parseDateDDMMYYYY(String(d))).filter(Boolean);
      
      // Process metric rows for this week
      for (let j = i + 3; j < i + 20 && j < rawData.length; j++) {
        const metricRow = rawData[j];
        if (!metricRow || !metricRow[0]) continue;
        
        const metricLabel = String(metricRow[0]).trim();
        if (!metricLabel) continue;
        
        // Check if we've hit the next week
        if (metricLabel.toLowerCase().startsWith('semana ')) break;
        
        const eventType = normalizeMetricName(metricLabel);
        if (!eventType) continue;
        
        // Initialize accumulator for this metric if needed
        if (!metricAccumulator.has(eventType)) {
          metricAccumulator.set(eventType, {});
        }
        
        const dailyData = metricAccumulator.get(eventType)!;
        
        // Add daily values
        for (let dayIdx = 0; dayIdx < parsedDates.length; dayIdx++) {
          const date = parsedDates[dayIdx];
          const value = Number(metricRow[dayIdx + 1]) || 0;
          if (date) {
            dailyData[date] = (dailyData[date] || 0) + value;
          }
        }
      }
    }
  }
  
  // Convert accumulated metrics to CampaignMetrics array
  for (const [eventType, dailyData] of metricAccumulator.entries()) {
    const totalCount = Object.values(dailyData).reduce((sum, val) => sum + val, 0);
    
    metrics.push({
      campaignName,
      eventType,
      profileName,
      totalCount,
      dailyData,
    });
  }
  
  console.log(`Extraídas ${metrics.length} métricas diárias da aba ${campaignName}`);
  return metrics;
}

// Helper function to extract metrics from a sheet, optionally starting after campaign details
function extractMetricsFromSheet(
  sheet: XLSX.WorkSheet, 
  campaignName: string, 
  startRow?: number
): CampaignMetrics[] {
  const metrics: CampaignMetrics[] = [];
  
  // Get the raw data as 2D array
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  // Find the header row (contains "Event Type" or similar)
  let headerRowIndex = startRow || 0;
  for (let i = headerRowIndex; i < rawData.length; i++) {
    const row = rawData[i];
    if (row && row.some((cell: any) => {
      const cellStr = String(cell || '').toLowerCase();
      return cellStr.includes('event type') || 
             cellStr.includes('tipo de evento') || 
             cellStr.includes('profile name') ||
             cellStr.includes('perfil');
    })) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex >= rawData.length - 1) {
    console.log(`Nenhuma linha de header encontrada na aba ${campaignName}`);
    return metrics;
  }
  
  // Extract headers
  const headers = rawData[headerRowIndex].map((h: any) => String(h || '').trim());
  
  // Find column indices with safe toLowerCase
  const eventTypeCol = headers.findIndex(h => {
    if (!h || typeof h !== 'string') return false;
    const lower = h.toLowerCase();
    return lower.includes('event type') || lower.includes('tipo de evento');
  });
  
  const profileCol = headers.findIndex(h => {
    if (!h || typeof h !== 'string') return false;
    const lower = h.toLowerCase();
    return lower.includes('profile name') || lower === 'perfil';
  });
  
  const totalCol = headers.findIndex(h => {
    if (!h || typeof h !== 'string') return false;
    const lower = h.toLowerCase();
    return lower.includes('total count') || lower === 'total';
  });
  
  if (eventTypeCol === -1 || profileCol === -1) {
    console.log(`Colunas necessárias não encontradas na aba ${campaignName}`);
    return metrics;
  }
  
  // Find date columns (formato YYYY-MM-DD)
  const dateColumns: { index: number; date: string }[] = [];
  headers.forEach((header, index) => {
    if (header && typeof header === 'string' && header.match(/^\d{4}-\d{2}-\d{2}$/)) {
      dateColumns.push({ index, date: header });
    }
  });
  
  // Process data rows
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;
    
    const eventType = normalizeAndValidate(row[eventTypeCol]);
    const profileName = normalizeAndValidate(row[profileCol]);
    
    if (!isValidString(eventType) || !isValidString(profileName)) continue;
    
    const dailyData: Record<string, number> = {};
    dateColumns.forEach(({ index, date }) => {
      dailyData[date] = Number(row[index]) || 0;
    });
    
    const totalCount = totalCol !== -1 ? Number(row[totalCol]) || 0 : 
      Object.values(dailyData).reduce((sum, val) => sum + val, 0);
    
    metrics.push({
      campaignName,
      eventType,
      profileName,
      totalCount,
      dailyData,
    });
  }
  
  console.log(`Extraídas ${metrics.length} métricas da aba ${campaignName}`);
  return metrics;
}

export async function parseExcelSheets(file: File | string): Promise<ExcelSheetData> {
  // Se for um arquivo File, verificar se é CSV e usar o parser apropriado
  if (file instanceof File) {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      console.log('Detectado arquivo CSV, usando parser específico');
      const parsedData = await parseCampaignFile(file);
      console.log('Dados parseados do CSV:', {
        metrics: parsedData.metrics.length,
        leads: parsedData.leads.length,
        sampleLead: parsedData.leads[0]
      });
      
      return {
        campaignMetrics: parsedData.metrics,
        positiveLeads: parsedData.leads,
        negativeLeads: [],
      };
    }
  }

  // Para arquivos Excel ou URLs, continuar com o fluxo original
  let workbook: XLSX.WorkBook;

  if (typeof file === 'string') {
    const response = await fetch(file);
    const arrayBuffer = await response.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
  } else {
    const arrayBuffer = await file.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
  }

  console.log('Abas encontradas no Excel:', workbook.SheetNames);

  const campaignMetrics: CampaignMetrics[] = [];
  const positiveLeads: Lead[] = [];
  const negativeLeads: Lead[] = [];
  const allCampaignDetails: CampaignDetails[] = [];
  const allCampaignNames = new Set<string>(); // Track all campaign names found in Dados Gerais
  const campaignNameConsolidation = new Set<string>(); // Track canonical campaign names for consolidation
  
  
  // Process each sheet based on its name pattern
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const normalizedName = sheetName.toLowerCase();
    
    console.log(`Processando aba: ${sheetName}`);
    
    // Extract campaign details from sheets with "Dados da campanha"
    const { details, endRow } = extractCampaignDetailsFromSheet(sheet);
    if (details) {
      console.log(`Detalhes de campanha encontrados na aba "${sheetName}":`, details);
      allCampaignDetails.push(details);
    }
    
    // Parse "Input" or "Inputs" sheet - campaign metrics
    if (normalizedName === 'input' || normalizedName === 'inputs' || normalizedName.includes('input')) {
      console.log('Processando aba Input/Inputs para métricas de campanha');
      const data = XLSX.utils.sheet_to_json(sheet) as any[];
      
      console.log(`Encontradas ${data.length} linhas na aba Input`);
      
      data.forEach((row, index) => {
        const campaignName = normalizeCampaignName(row['Campaign Name'] || row['Campanha'], campaignNameConsolidation);
        const eventType = normalizeAndValidate(row['Event Type'] || row['Tipo de Evento']);
        const profileName = normalizeAndValidate(row['Profile Name'] || row['Perfil']);
        
        if (!isValidString(campaignName) || !isValidString(eventType) || !isValidString(profileName)) {
          console.log(`Linha ${index} ignorada: dados incompletos`, { campaignName, eventType, profileName });
          return;
        }
        
        campaignNameConsolidation.add(campaignName);
        
        const dailyData: Record<string, number> = {};
        Object.keys(row).forEach(key => {
          if (key.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dailyData[key] = Number(row[key]) || 0;
          }
        });
        
        console.log(`Métrica adicionada: ${campaignName} - ${eventType} - ${profileName}`);
        
        campaignMetrics.push({
          campaignName,
          eventType,
          profileName,
          totalCount: Number(row['Total Count'] || row['Total']) || 0,
          dailyData,
        });
      });
    }
    
    // Parse individual campaign sheets ([NAME] format)
    // These sheets typically have "Dados da campanha" section and weekly metrics
    else if (!normalizedName.includes('diário') && 
             !normalizedName.includes('positivo') && 
             !normalizedName.includes('negativo') &&
             !normalizedName.includes('compilado') &&
             !normalizedName.includes('dados gerais')) {
      
      console.log(`Processando aba de campanha individual: ${sheetName}`);
      
      // First, extract campaign details
      const { details: sheetDetails, endRow } = extractCampaignDetailsFromSheet(sheet);
      
      if (sheetDetails) {
        const profileName = sheetDetails.profile || 'Unknown';
        
        // Try to extract weekly metrics from this sheet
        const weeklyMetrics = extractWeeklyMetricsFromSheet(sheet, sheetName, profileName);
        if (weeklyMetrics.length > 0) {
          console.log(`Adicionadas ${weeklyMetrics.length} métricas semanais da aba ${sheetName}`);
          campaignMetrics.push(...weeklyMetrics);
        } else {
          // Fallback: try standard metric extraction
          const metrics = extractMetricsFromSheet(sheet, sheetName, endRow);
          if (metrics.length > 0) {
            console.log(`Adicionadas ${metrics.length} métricas (fallback) da aba ${sheetName}`);
            campaignMetrics.push(...metrics);
          }
        }
      } else {
        console.log(`Nenhum detalhe de campanha encontrado na aba ${sheetName}`);
      }
    }
    
    // Parse "Diário [NAME]" sheets - daily campaign data organized by week
    else if (normalizedName.includes('diário')) {
      console.log(`Processando aba diária: ${sheetName}`);
      const campaignName = sheetName.replace(/diário\s*/i, '').trim();
      
      // Extract campaign details to get profile name
      const { details: sheetDetails } = extractCampaignDetailsFromSheet(sheet);
      const profileName = sheetDetails?.profile || 'Unknown';
      
      // Extract daily metrics organized by week
      const dailyMetrics = extractDailyMetricsFromSheet(sheet, campaignName, profileName);
      if (dailyMetrics.length > 0) {
        console.log(`Adicionadas ${dailyMetrics.length} métricas diárias da aba ${sheetName}`);
        campaignMetrics.push(...dailyMetrics);
      } else {
        console.log(`Nenhuma métrica diária encontrada na aba ${sheetName}`);
      }
    }
    
    // Parse "Compilado" sheet - aggregated profile data AND Campanhas Ativas section
    else if (normalizedName.includes('compilado')) {
      console.log('Processando aba Compilado');
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // Find "Campanhas Ativas" section
      const activeCampaignsIndex = rawData.findIndex(row => 
        row && row.some((cell: any) => 
          typeof cell === 'string' && cell.toLowerCase().includes('campanhas ativas')
        )
      );
      
      if (activeCampaignsIndex !== -1) {
        console.log('Encontrada seção Campanhas Ativas no Compilado');
        
        // Next row should contain campaign names (possibly separated by commas)
        const headerRow = rawData[activeCampaignsIndex + 1];
        if (!headerRow) {
          console.log('Linha de header de campanhas não encontrada');
        } else {
          // Extract campaign names, handling comma-separated campaigns
          const campaignNames: string[] = [];
          headerRow.slice(1).forEach((cell: any) => {
            if (cell && typeof cell === 'string') {
              // Split by comma and trim each campaign name
              const campaigns = cell.split(',')
                .map(c => {
                  const normalized = normalizeCampaignName(c, campaignNameConsolidation);
                  if (normalized) campaignNameConsolidation.add(normalized);
                  return normalized;
                })
                .filter(c => c.length > 0);
              campaignNames.push(...campaigns);
            }
          });
          
          console.log(`Campanhas encontradas na aba Compilado: ${campaignNames.join(', ')}`);
          
          // Map metric labels to event types
          const metricLabelMapping: Record<string, string> = {
            'convites enviados': 'Connection Requests Sent',
            'conexões realizadas': 'Connection Requests Accepted',
            'taxa de aceite': 'Connection Accept Rate',
            'mensagens enviadas': 'Messages Sent',
            'visitas': 'Profile Visits',
            'likes': 'Post Likes',
            'comentários': 'Comments Done',
            'total de atividades': 'Total Activities',
            'respostas positivas': 'Positive Responses',
            'leads processados': 'Leads Processed',
            'reuniões': 'Meetings',
            'propostas': 'Proposals',
            'vendas': 'Sales',
            'dias ativos': 'Active Days',
          };
          
          // Process metric rows
          rawData.slice(activeCampaignsIndex + 2).forEach(metricRow => {
            if (!metricRow || !metricRow[0]) return;
            
            const metricLabel = String(metricRow[0]).toLowerCase().trim();
            const eventType = metricLabelMapping[metricLabel];
            
            if (!eventType) return;
            
            // For each campaign, extract the value
            campaignNames.forEach((campaignName, idx) => {
              const value = metricRow[idx + 1]; // +1 because column 0 is the metric name
              let numericValue = Number(value) || 0;
              
              // Taxa de Aceite vem como decimal (0.52 = 52%), converter para inteiro (porcentagem)
              if (eventType === 'Connection Accept Rate' && numericValue > 0 && numericValue < 1) {
                numericValue = Math.round(numericValue * 100);
              } else {
                // Garantir que outros valores sejam inteiros
                numericValue = Math.round(numericValue);
              }
              
              // Only add if there's a value
              if (numericValue > 0 || eventType === 'Active Days') {
                campaignMetrics.push({
                  campaignName,
                  eventType,
                  profileName: 'Compilado', // Usando 'Compilado' como profile para distinguir
                  totalCount: numericValue,
                  dailyData: {},
                });
                
                console.log(`Métrica adicionada de Campanhas Ativas: ${campaignName} - ${eventType}: ${numericValue}`);
              }
            });
          });
        }
      }
      
      // Also process regular Compilado data (if exists)
      const regularData = XLSX.utils.sheet_to_json(sheet) as any[];
      
      regularData.forEach(row => {
        const campaignName = normalizeCampaignName(row['Campanha'] || row['Campaign'], campaignNameConsolidation);
        const eventType = normalizeAndValidate(row['Tipo'] || row['Event Type']);
        const profileName = normalizeAndValidate(row['Perfil'] || row['Profile']);
        
        if (campaignName && eventType && profileName) {
          campaignNameConsolidation.add(campaignName);
          const dailyData: Record<string, number> = {};
          Object.keys(row).forEach(key => {
            if (key.match(/^\d{4}-\d{2}-\d{2}$/)) {
              dailyData[key] = Number(row[key]) || 0;
            }
          });
          
          campaignMetrics.push({
            campaignName,
            eventType,
            profileName,
            totalCount: Number(row['Total'] || row['Total Count']) || 0,
            dailyData,
          });
        }
      });
    }
    
    // Parse "Dados Gerais" sheet - general campaign data
    else if (normalizedName.includes('dados gerais')) {
      console.log('Processando aba Dados Gerais para campanhas');
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // Find "Campanhas Ativas por Semana" section
      const weeklyActiveCampaignsIndex = rawData.findIndex(row => 
        row && row.some((cell: any) => 
          typeof cell === 'string' && cell.toLowerCase().includes('campanhas ativas')
        )
      );
      
      if (weeklyActiveCampaignsIndex !== -1) {
        console.log('Encontrada seção Campanhas Ativas na aba Dados Gerais');
        
        // Next row should contain week headers
        const weekHeaderRow = rawData[weeklyActiveCampaignsIndex + 1];
        if (!weekHeaderRow) {
          console.log('Linha de header de semanas não encontrada');
        } else {
          const weekHeaders = weekHeaderRow.slice(1);
          console.log(`Semanas encontradas: ${weekHeaders.length}`);
          
          // Process each week row - each cell may contain comma-separated campaign names
          for (let i = weeklyActiveCampaignsIndex + 2; i < rawData.length; i++) {
            const weekRow = rawData[i];
            if (!weekRow || weekRow.length === 0) break;
            
            // Extract campaigns from each week column
            weekRow.slice(1).forEach((cell: any, weekIdx: number) => {
              if (cell && typeof cell === 'string') {
                // Split by comma and process each campaign
                const campaigns = cell.split(',')
                  .map(c => {
                    const normalized = normalizeCampaignName(c, campaignNameConsolidation);
                    if (normalized) campaignNameConsolidation.add(normalized);
                    return normalized;
                  })
                  .filter(c => c.length > 0);
                campaigns.forEach(campaignName => {
                  // Track this campaign name for later processing
                  if (!allCampaignNames.has(campaignName)) {
                    allCampaignNames.add(campaignName);
                    console.log(`Campanha encontrada em Dados Gerais: ${campaignName}`);
                  }
                });
              }
            });
          }
        }
      }
      
      // Also process regular Dados Gerais data (if exists in traditional format)
      const data = XLSX.utils.sheet_to_json(sheet) as any[];
      
      data.forEach(row => {
        const campaignName = normalizeCampaignName(row['Campanha'] || row['Campaign'], campaignNameConsolidation);
        const eventType = normalizeAndValidate(row['Tipo'] || row['Event Type']);
        const profileName = normalizeAndValidate(row['Perfil'] || row['Profile']);
        
        if (campaignName && eventType && profileName) {
          campaignNameConsolidation.add(campaignName);
          const dailyData: Record<string, number> = {};
          Object.keys(row).forEach(key => {
            if (key.match(/^\d{4}-\d{2}-\d{2}$/)) {
              dailyData[key] = Number(row[key]) || 0;
            }
          });
          
          campaignMetrics.push({
            campaignName,
            eventType,
            profileName,
            totalCount: Number(row['Total'] || row['Total Count']) || 0,
            dailyData,
          });
        }
      });
    }
    
    // Parse "Leads Positivos" sheet
    else if (normalizedName.includes('positivo')) {
      console.log('Processando aba Leads Positivos');
      const data = XLSX.utils.sheet_to_json(sheet) as any[];
      
      console.log(`Encontrados ${data.length} leads positivos`);
      
      data.forEach((row, index) => {
        const campaign = normalizeCampaignName(row['Campanha'] || row['Campaign'], campaignNameConsolidation);
        const name = normalizeAndValidate(row['Nome'] || row['Name']);
        
        if (!isValidString(campaign) || !isValidString(name)) {
          console.log(`Lead positivo ${index} ignorado: dados incompletos`);
          return;
        }
        
        campaignNameConsolidation.add(campaign);
        
        console.log(`Lead positivo adicionado: ${name} da campanha ${campaign}`);
        
        positiveLeads.push({
          id: `positive-${index}-${Date.now()}`,
          campaign,
          linkedin: normalizeAndValidate(row['LinkedIn']),
          name,
          position: normalizeAndValidate(row['Cargo']),
          company: normalizeAndValidate(row['Empresa']),
          status: 'positive',
          positiveResponseDate: row['Data Resposta Positiva'],
          transferDate: row['Data Repasse'],
          statusDetails: row['Status'],
          comments: row['Comentários'],
          followUp1Date: row['Data FU 1'],
          followUp1Comments: row['Comentarios FU1'],
          followUp2Date: row['Data FU 2'],
          followUp2Comments: row['Comentarios FU2'],
          followUp3Date: row['Data FU 3'],
          followUp3Comments: row['Comentarios FU3'],
          followUp4Date: row['Data FU 4'],
          followUp4Comments: row['Comentarios FU4'],
          observations: row['Observações'],
          meetingScheduleDate: row['Data de agendamento da reunião'],
          meetingDate: row['Data da Reunião'],
          proposalDate: row['Data Proposta'],
          proposalValue: row['Valor Proposta'] ? Number(row['Valor Proposta']) : null,
          saleDate: row['Data Venda'],
          saleValue: row['Valor Venda'] ? Number(row['Valor Venda']) : null,
          profile: row['Perfil'],
          classification: row['Classificação'],
          attendedWebinar: row['Participou do Webnar'] === 'Sim',
          whatsapp: row['WhatsApp'],
          standDay: row['Dia do Stand'],
          pavilion: row['Pavilhão'],
          stand: row['Stand'],
        });
      });
    }
    
    // Parse "Leads Negativos" sheet
    else if (normalizedName.includes('negativo')) {
      console.log('Processando aba Leads Negativos');
      const data = XLSX.utils.sheet_to_json(sheet) as any[];
      
      console.log(`Encontrados ${data.length} leads negativos`);
      
      data.forEach((row, index) => {
        const campaign = normalizeCampaignName(row['Campanha'] || row['Campaign'], campaignNameConsolidation);
        const name = normalizeAndValidate(row['Nome'] || row['Name']);
        
        if (!isValidString(campaign) || !isValidString(name)) {
          console.log(`Lead negativo ${index} ignorado: dados incompletos`);
          return;
        }
        
        campaignNameConsolidation.add(campaign);
        
        console.log(`Lead negativo adicionado: ${name} da campanha ${campaign}`);
        
        negativeLeads.push({
          id: `negative-${index}-${Date.now()}`,
          campaign,
          linkedin: normalizeAndValidate(row['LinkedIn']),
          name,
          position: normalizeAndValidate(row['Cargo']),
          company: normalizeAndValidate(row['Empresa']),
          status: 'negative',
          negativeResponseDate: row['Data Resposta Negativa'],
          transferDate: row['Data Repasse'],
          statusDetails: row['Status'],
          observations: row['Observações'],
          hadFollowUp: row['Teve FU? Porque?'] !== undefined && row['Teve FU? Porque?'] !== '',
          followUpReason: row['Teve FU? Porque?'],
        });
      });
    }
  }

  console.log(`Total de ${allCampaignDetails.length} campanhas encontradas no arquivo`);
  console.log(`Total de ${campaignMetrics.length} métricas de campanha parseadas`);
  console.log(`Total de ${positiveLeads.length} leads positivos parseados`);
  console.log(`Total de ${negativeLeads.length} leads negativos parseados`);

  return {
    campaignMetrics,
    positiveLeads,
    negativeLeads,
    campaignDetails: allCampaignDetails.length > 0 ? allCampaignDetails[0] : undefined,
    allCampaignDetails,
  };
}
