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

// Função para verificar se uma string é válida (não vazia após trim)
function isValidString(value: string): boolean {
  return value.length > 0;
}

// Helper function to extract campaign details from a sheet looking for "Dados da campanha" section
function extractCampaignDetailsFromSheet(sheet: XLSX.WorkSheet): CampaignDetails | null {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  // Find the row with "Dados da campanha"
  const campaignDataRowIndex = data.findIndex(row => 
    row && row.some((cell: any) => 
      typeof cell === 'string' && cell.toLowerCase().includes('dados da campanha')
    )
  );
  
  if (campaignDataRowIndex === -1) return null;
  
  // Extract details from rows after "Dados da campanha"
  const details: CampaignDetails = {};
  
  for (let i = campaignDataRowIndex + 1; i < Math.min(campaignDataRowIndex + 10, data.length); i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;
    
    const label = String(row[0] || '').trim();
    const value = String(row[1] || '').trim();
    
    if (!label || !value) continue;
    
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
  
  return Object.keys(details).length > 0 ? details : null;
}

export async function parseExcelSheets(file: File | string): Promise<ExcelSheetData> {
  // Se for um arquivo File, verificar se é CSV e usar o parser apropriado
  if (file instanceof File) {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      console.log('Detectado arquivo CSV, usando parser específico');
      // Usar o parser de CSV que suporta formato Kontax
      const parsedData = await parseCampaignFile(file);
      console.log('Dados parseados do CSV:', {
        metrics: parsedData.metrics.length,
        leads: parsedData.leads.length,
        sampleLead: parsedData.leads[0]
      });
      
      // Os leads do Kontax vêm com status 'pending', vamos classificá-los como positivos por padrão
      // O usuário pode reclassificá-los depois
      return {
        campaignMetrics: parsedData.metrics,
        positiveLeads: parsedData.leads, // Todos os leads importados vão para positivos por padrão
        negativeLeads: [],
      };
    }
  }

  // Para arquivos Excel ou URLs, continuar com o fluxo original
  let workbook: XLSX.WorkBook;

  if (typeof file === 'string') {
    // Load from URL
    const response = await fetch(file);
    const arrayBuffer = await response.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
  } else {
    // Load from File object
    const arrayBuffer = await file.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
  }

  const campaignMetrics: CampaignMetrics[] = [];
  const positiveLeads: Lead[] = [];
  const negativeLeads: Lead[] = [];
  let campaignDetails: CampaignDetails | undefined;
  
  // Try to extract campaign details from each sheet
  const allCampaignDetails: CampaignDetails[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const details = extractCampaignDetailsFromSheet(sheet);
    if (details) {
      console.log(`Detalhes de campanha encontrados na aba "${sheetName}":`, details);
      allCampaignDetails.push(details);
    }
  }
  
  console.log(`Total de ${allCampaignDetails.length} campanhas encontradas no arquivo`);
  if (allCampaignDetails.length > 0) {
    console.log('Campanhas:', allCampaignDetails.map(d => d.campaignName).join(', '));
  }

  // Parse Input sheet (campaign metrics)
  const inputSheetName = workbook.SheetNames.find(
    name => name.toLowerCase() === 'input' || name.toLowerCase().includes('input')
  );

  if (inputSheetName) {
    const sheet = workbook.Sheets[inputSheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];
    
    // Extract campaign details from first row if available
    if (data.length > 0) {
      const firstRow = data[0];
      campaignDetails = {
        company: normalizeAndValidate(firstRow['Empresa'] || firstRow['Company']),
        profile: normalizeAndValidate(firstRow['Perfil'] || firstRow['Profile'] || firstRow['Profile Name']),
        campaignName: normalizeAndValidate(firstRow['Campanha'] || firstRow['Campaign'] || firstRow['Campaign Name']),
        objective: normalizeAndValidate(firstRow['Objetivo da Campanha'] || firstRow['Campaign Objective'] || firstRow['Objective']),
        cadence: normalizeAndValidate(firstRow['Cadência'] || firstRow['Cadence']),
        jobTitles: normalizeAndValidate(firstRow['Cargos na Pesquisa'] || firstRow['Target Job Titles'] || firstRow['Job Titles']),
      };
    }
    
    data.forEach(row => {
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
      
      campaignMetrics.push({
        campaignName,
        eventType,
        profileName,
        totalCount: Number(row['Total Count']) || 0,
        dailyData,
      });
    });
  }

  // Parse Leads Positivos sheet
  const positiveSheetName = workbook.SheetNames.find(
    name => name.toLowerCase().includes('positivo')
  );

  if (positiveSheetName) {
    const sheet = workbook.Sheets[positiveSheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];
    
    data.forEach((row, index) => {
      const campaign = normalizeAndValidate(row['Campanha']);
      const name = normalizeAndValidate(row['Nome']);
      
      // Skip rows with empty required fields
      if (!isValidString(campaign) || !isValidString(name)) {
        return;
      }
      
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
        proposalValue: row['Valor Proposta'] ? Number(row['Valor Proposta']) : undefined,
        saleDate: row['Data Venda'],
        saleValue: row['Valor Venda'] ? Number(row['Valor Venda']) : undefined,
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

  // Parse Leads Negativos sheet
  const negativeSheetName = workbook.SheetNames.find(
    name => name.toLowerCase().includes('negativo')
  );

  if (negativeSheetName) {
    const sheet = workbook.Sheets[negativeSheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];
    
    data.forEach((row, index) => {
      const campaign = normalizeAndValidate(row['Campanha']);
      const name = normalizeAndValidate(row['Nome']);
      
      // Skip rows with empty required fields
      if (!isValidString(campaign) || !isValidString(name)) {
        return;
      }
      
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

  return {
    campaignMetrics,
    positiveLeads,
    negativeLeads,
    campaignDetails: allCampaignDetails.length > 0 ? allCampaignDetails[0] : undefined,
    allCampaignDetails,
  };
}
