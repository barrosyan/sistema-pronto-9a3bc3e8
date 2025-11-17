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

// Função para verificar se uma string é válida (não vazia após trim)
function isValidString(value: string): boolean {
  return value.length > 0;
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
  console.log(`Convertendo ${data.length} leads do formato Kontax para campanha: ${campaignName}`);
  const leads = data.map((row, index) => {
    const firstName = normalizeAndValidate(row['First Name']);
    const lastName = normalizeAndValidate(row['Last Name']);
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Tentar extrair data de conexão de múltiplos campos possíveis
    let connectionDate: string | null = null;
    
    // Verificar campo "Connected At" direto
    if (row['Connected At']) {
      const parsedDate = new Date(row['Connected At']);
      if (!isNaN(parsedDate.getTime())) {
        connectionDate = parsedDate.toISOString();
      }
    }
    
    // Verificar campos que podem conter informações de conexão
    const possibleFields = ['Messages Sent', 'Status', 'Notes', 'Comments'];
    for (const field of possibleFields) {
      if (row[field] && !connectionDate) {
        const extracted = extractConnectionDate(row[field]);
        if (extracted) {
          connectionDate = extracted;
          break;
        }
      }
    }
    
    console.log(`Lead ${index + 1}:`, {
      firstName,
      lastName,
      fullName,
      company: row.Company,
      position: row.Position,
      connectionDate
    });
    
    return {
      id: `kontax-lead-${index}-${Date.now()}`,
      campaign: campaignName,
      linkedin: normalizeAndValidate(row.linkedin_url),
      name: fullName,
      position: normalizeAndValidate(row.Position),
      company: normalizeAndValidate(row.Company),
      positiveResponseDate: connectionDate, // Data de conexão extraída
      transferDate: null,
      status: 'positive' as const, // Importados como positivos por padrão
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
      observations: `Messages Sent: ${row['Messages Sent by Kontax'] || 0}, Received: ${row['Messages Received by the lead'] || 0}, Connected: ${row['Connected At'] || 'N/A'}`,
      meetingScheduleDate: null,
      meetingDate: null,
      proposalDate: null,
      proposalValue: undefined,
      saleDate: null,
      saleValue: undefined,
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
        const campaignName = normalizeAndValidate(row['Campaign Name']);
        const eventType = normalizeAndValidate(row['Event Type']);
        const profileName = normalizeAndValidate(row['Profile Name']);
        
        // Skip rows with empty required fields
        if (!isValidString(campaignName) || !isValidString(eventType) || !isValidString(profileName)) {
          return;
        }
        
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
        const campaign = normalizeAndValidate(row['Campanha']);
        const name = normalizeAndValidate(row['Nome']);
        
        // Skip rows with empty required fields
        if (!isValidString(campaign) || !isValidString(name)) {
          return;
        }
        
        const lead: Lead = {
          id: `lead-${index}-${Date.now()}`,
          campaign,
          linkedin: normalizeAndValidate(row['LinkedIn']),
          name,
          position: normalizeAndValidate(row['Cargo']),
          company: normalizeAndValidate(row['Empresa']),
          status: isPositive ? 'positive' : 'negative',
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
          lead.proposalValue = row['Valor Proposta'] ? Number(row['Valor Proposta']) : undefined;
          lead.saleDate = row['Data Venda'];
          lead.saleValue = row['Valor Venda'] ? Number(row['Valor Venda']) : undefined;
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
