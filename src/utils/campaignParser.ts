import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { CampaignMetrics, Lead } from '@/types/campaign';

export interface ParsedCampaignData {
  metrics: CampaignMetrics[];
  leads: Lead[];
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

// Função para verificar se uma campanha deve ser ignorada
function shouldIgnoreCampaign(campaignName: string): boolean {
  if (!campaignName) return true;
  
  const normalized = campaignName.toLowerCase().trim();
  
  // Lista de campanhas a ignorar
  const ignoredCampaigns = [
    'campanha 0',
    'campaign 0',
    'sent manually'
  ];
  
  return ignoredCampaigns.includes(normalized);
}

export function parseCampaignFile(file: File): Promise<ParsedCampaignData> {
  return new Promise((resolve, reject) => {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      parseCsvFile(file)
        .then(resolve)
        .catch(reject);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      parseExcelFile(file)
        .then(resolve)
        .catch(reject);
    } else {
      reject(new Error('Formato de arquivo não suportado. Use CSV ou Excel.'));
    }
  });
}

function parseCsvFile(file: File): Promise<ParsedCampaignData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as any[];
          
          // Detecta se é formato Kontax de leads
          if (isKontaxLeadsFormat(data)) {
            // Extrai nome da campanha do nome do arquivo
            const campaignName = file.name
              .replace(/^Perfil_.*?_-_/, '')
              .replace(/_all_leads\.csv$/, '')
              .replace(/_/g, ' ')
              .trim();
            
            const leads = convertKontaxLeadsToSystemFormat(data, campaignName || 'Campanha Importada');
            resolve({ metrics: [], leads });
          } else {
            // Formato padrão de campanha
            const processedData = processCampaignData(data);
            resolve(processedData);
          }
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error),
    });
  });
}

function parseExcelFile(file: File): Promise<ParsedCampaignData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        
        const objectData = rows.map(row => {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
        
        const parsedData = processCampaignData(objectData);
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsBinaryString(file);
  });
}

// Detecta se é um CSV de leads do formato Kontax
function isKontaxLeadsFormat(data: any[]): boolean {
  if (data.length === 0) return false;
  const firstRow = data[0];
  console.log('Verificando formato Kontax. Primeira linha:', firstRow);
  console.log('Colunas encontradas:', Object.keys(firstRow));
  const kontaxColumns = ['First Name', 'Last Name', 'Company', 'Position', 'linkedin_url', 'Connected At'];
  const hasAllColumns = kontaxColumns.every(col => col in firstRow);
  console.log('Tem todas as colunas Kontax?', hasAllColumns);
  return hasAllColumns;
}

// Função para extrair data de conexão de campos especiais
function extractConnectionDate(value: string): string | null {
  if (!value || typeof value !== 'string') return null;
  
  // Procura por padrão "Connected: <data>"
  const connectedMatch = value.match(/Connected:\s*(.+?)(?:,|$)/i);
  if (connectedMatch && connectedMatch[1]) {
    const dateStr = connectedMatch[1].trim();
    // Tenta parsear a data
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }
  return null;
}

// Converte leads do formato Kontax para o formato do sistema
function convertKontaxLeadsToSystemFormat(data: any[], campaignName: string): Lead[] {
  const campaignNameConsolidation = new Set<string>();
  const normalizedCampaignName = normalizeCampaignName(campaignName, campaignNameConsolidation);
  
  if (shouldIgnoreCampaign(normalizedCampaignName)) {
    console.log(`Campanha ignorada: ${normalizedCampaignName}`);
    return [];
  }
  
  console.log(`Convertendo ${data.length} leads do formato Kontax para campanha: ${normalizedCampaignName}`);
  const leads = data.map((row, index) => {
    const firstName = normalizeAndValidate(row['First Name']);
    const lastName = normalizeAndValidate(row['Last Name']);
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Extrair data de conexão de "Sequence Generated At" (prioridade) ou "Connected At"
    let connectionDate: string | null = null;
    
    // Prioridade 1: Sequence Generated At
    if (row['Sequence Generated At']) {
      const parsedDate = new Date(row['Sequence Generated At']);
      if (!isNaN(parsedDate.getTime())) {
        connectionDate = parsedDate.toISOString();
      }
    }
    
    // Fallback: Connected At
    if (!connectionDate && row['Connected At']) {
      const parsedDate = new Date(row['Connected At']);
      if (!isNaN(parsedDate.getTime())) {
        connectionDate = parsedDate.toISOString();
      }
    }
    
    // Fallback: Tentar extrair de outros campos
    if (!connectionDate) {
      const possibleFields = ['Messages Sent', 'Status', 'Notes', 'Comments'];
      for (const field of possibleFields) {
        if (row[field]) {
          const extracted = extractConnectionDate(row[field]);
          if (extracted) {
            connectionDate = extracted;
            break;
          }
        }
      }
    }
    
    console.log(`Lead ${index + 1}:`, {
      firstName,
      lastName,
      fullName,
      company: row.Company,
      position: row.Position,
      sequenceGeneratedAt: row['Sequence Generated At'],
      connectionDate
    });
    
    return {
      id: `kontax-lead-${index}-${Date.now()}`,
      campaign: normalizedCampaignName,
      linkedin: normalizeAndValidate(row.linkedin_url),
      name: fullName,
      position: normalizeAndValidate(row.Position),
      company: normalizeAndValidate(row.Company),
      connectionDate: connectionDate, // Data de conexão extraída
      positiveResponseDate: connectionDate, // Data de conexão extraída
      transferDate: null,
      status: 'pending' as const, // Leads importados via CSV começam como Pendente
      statusDetails: normalizeAndValidate(row.Status),
      comments: '',
      followUp1Date: null,
      followUp1Comments: '',
      followUp2Date: null,
      followUp2Comments: '',
      followUp3Date: null,
      followUp3Comments: '',
      followUp4Date: null,
      followUp4Comments: '',
      observations: `Sequence Generated At: ${row['Sequence Generated At'] || 'N/A'}, Messages Sent: ${row['Messages Sent by Kontax'] || 0}, Received: ${row['Messages Received by the lead'] || 0}`,
      source: 'Kontax',
      meetingScheduleDate: null,
      meetingDate: null,
      proposalDate: null,
      proposalValue: null,
      saleDate: null,
      saleValue: null,
      profile: '',
      classification: 'positive', // Classificação inicial como positivo
      attendedWebinar: false,
      whatsapp: normalizeAndValidate(row.Email),
      standDay: row['Imported At'] || null,
      pavilion: '',
      stand: ''
    };
  });
  console.log('Leads convertidos:', leads.length);
  return leads;
}

function processCampaignData(data: any[]): ParsedCampaignData {
  const metrics: CampaignMetrics[] = [];
  const leads: Lead[] = [];
  const campaignNameConsolidation = new Set<string>(); // Track canonical campaign names
  
  // Detect if this is campaign metrics or leads data
  if (data.length > 0) {
    const firstRow = data[0];
    
    // Check for Kontax leads format
    if (isKontaxLeadsFormat(data)) {
      return { metrics: [], leads: [] }; // Will be handled in parseCsvFile
    }
    
    // Check for campaign metrics format
    if ('Campaign Name' in firstRow && 'Event Type' in firstRow) {
      data.forEach((row, index) => {
      const campaignName = normalizeCampaignName(row['Campaign Name'], campaignNameConsolidation);
      const eventType = normalizeAndValidate(row['Event Type']);
      const profileName = normalizeAndValidate(row['Profile Name']);
      
      // Skip rows with empty required fields
      if (!isValidString(campaignName) || !isValidString(eventType) || !isValidString(profileName)) {
        return;
      }
      
      if (shouldIgnoreCampaign(campaignName)) {
        console.log(`Campanha ignorada: ${campaignName}`);
        return;
      }
      
      campaignNameConsolidation.add(campaignName);
        
        const dailyData: Record<string, number> = {};
        
        Object.keys(row).forEach(key => {
          if (key.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dailyData[key] = Number(row[key]) || 0;
          }
        });
        
        metrics.push({
          campaignName,
          eventType,
          profileName,
          totalCount: Number(row['Total Count']) || 0,
          dailyData,
        });
      });
    }
    
  // Check for leads format (positive or negative)
  if ('Campanha' in firstRow && 'LinkedIn' in firstRow) {
    const isPositive = 'Data Resposta Positiva' in firstRow;
    
    data.forEach((row, index) => {
      const campaign = normalizeCampaignName(row['Campanha'], campaignNameConsolidation);
      const name = normalizeAndValidate(row['Nome']);
      
      // Skip rows with empty required fields
      if (!isValidString(campaign) || !isValidString(name)) {
        return;
      }
      
      if (shouldIgnoreCampaign(campaign)) {
        console.log(`Lead ignorado - campanha não permitida: ${campaign}`);
        return;
      }
      
      campaignNameConsolidation.add(campaign);
        
        const lead: Lead = {
          id: `lead-${index}-${Date.now()}`,
          campaign,
          linkedin: normalizeAndValidate(row['LinkedIn']),
          name,
          position: normalizeAndValidate(row['Cargo']),
          company: normalizeAndValidate(row['Empresa']),
          status: isPositive ? ('pending' as const) : ('negative' as const), // Leads importados via CSV começam como Pendente
        };
        
        if (isPositive) {
          lead.positiveResponseDate = row['Data Resposta Positiva'];
          lead.transferDate = row['Data Repasse'];
          lead.statusDetails = row['Status'];
          lead.comments = row['Comentários'];
          lead.followUp1Date = row['Data FU 1'];
          lead.followUp1Comments = row['Comentarios FU1'];
          lead.followUp2Date = row['Data FU 2'];
          lead.followUp2Comments = row['Comentarios FU2'];
          lead.followUp3Date = row['Data FU 3'];
          lead.followUp3Comments = row['Comentarios FU3'];
          lead.followUp4Date = row['Data FU 4'];
          lead.followUp4Comments = row['Comentarios FU4'];
          lead.observations = row['Observações'];
          lead.meetingScheduleDate = row['Data de agendamento da reunião'];
          lead.meetingDate = row['Data da Reunião'];
          lead.proposalDate = row['Data Proposta'];
          lead.proposalValue = row['Valor Proposta'] ? Number(row['Valor Proposta']) : null;
          lead.saleDate = row['Data Venda'];
          lead.saleValue = row['Valor Venda'] ? Number(row['Valor Venda']) : null;
          lead.profile = row['Perfil'];
          lead.classification = row['Classificação'];
          lead.attendedWebinar = row['Participou do Webnar'] === 'Sim';
          lead.whatsapp = row['WhatsApp'];
          lead.standDay = row['Dia do Stand'];
          lead.pavilion = row['Pavilhão'];
          lead.stand = row['Stand'];
        } else {
          lead.negativeResponseDate = row['Data Resposta Negativa'];
          lead.transferDate = row['Data Repasse'];
          lead.statusDetails = row['Status'];
          lead.observations = row['Observações'];
          lead.hadFollowUp = row['Teve FU? Porque?'] !== undefined && row['Teve FU? Porque?'] !== '';
          lead.followUpReason = row['Teve FU? Porque?'];
        }
        
        leads.push(lead);
      });
    }
  }
  
  return { metrics, leads };
}

export function groupMetricsByCampaign(metrics: CampaignMetrics[]): Map<string, CampaignMetrics[]> {
  const grouped = new Map<string, CampaignMetrics[]>();
  
  metrics.forEach(metric => {
    const key = metric.campaignName.trim();
    // Skip entries with empty campaign names
    if (!key) return;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(metric);
  });
  
  return grouped;
}
