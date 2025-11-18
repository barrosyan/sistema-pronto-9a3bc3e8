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
  
  // Process each sheet based on its name pattern
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const normalizedName = sheetName.toLowerCase();
    
    console.log(`Processando aba: ${sheetName}`);
    
    // Extract campaign details from sheets with "Dados da campanha"
    const details = extractCampaignDetailsFromSheet(sheet);
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
        const campaignName = normalizeAndValidate(row['Campaign Name'] || row['Campanha']);
        const eventType = normalizeAndValidate(row['Event Type'] || row['Tipo de Evento']);
        const profileName = normalizeAndValidate(row['Profile Name'] || row['Perfil']);
        
        if (!isValidString(campaignName) || !isValidString(eventType) || !isValidString(profileName)) {
          console.log(`Linha ${index} ignorada: dados incompletos`, { campaignName, eventType, profileName });
          return;
        }
        
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
    // These sheets typically have "Dados da campanha" section and daily metrics
    else if (!normalizedName.includes('diário') && 
             !normalizedName.includes('positivo') && 
             !normalizedName.includes('negativo') &&
             !normalizedName.includes('compilado') &&
             !normalizedName.includes('dados gerais')) {
      
      console.log(`Processando aba de campanha individual: ${sheetName}`);
      const data = XLSX.utils.sheet_to_json(sheet) as any[];
      
      // Try to parse as campaign metrics if it has the right structure
      data.forEach(row => {
        const campaignName = normalizeAndValidate(row['Campaign Name'] || sheetName);
        const eventType = normalizeAndValidate(row['Event Type']);
        const profileName = normalizeAndValidate(row['Profile Name']);
        
        if (eventType && profileName) {
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
        }
      });
    }
    
    // Parse "Diário [NAME]" sheets - daily campaign data
    else if (normalizedName.includes('diário')) {
      console.log(`Processando aba diária: ${sheetName}`);
      const campaignName = sheetName.replace(/diário\s*/i, '').trim();
      const data = XLSX.utils.sheet_to_json(sheet) as any[];
      
      data.forEach(row => {
        const eventType = normalizeAndValidate(row['Event Type'] || row['Tipo de Evento']);
        const profileName = normalizeAndValidate(row['Profile Name'] || row['Perfil']);
        
        if (eventType && profileName) {
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
            totalCount: Number(row['Total Count'] || row['Total']) || 0,
            dailyData,
          });
        }
      });
    }
    
    // Parse "Compilado" sheet - aggregated profile data
    else if (normalizedName.includes('compilado')) {
      console.log('Processando aba Compilado para dados de perfil');
      const data = XLSX.utils.sheet_to_json(sheet) as any[];
      
      data.forEach(row => {
        const campaignName = normalizeAndValidate(row['Campanha'] || row['Campaign']);
        const eventType = normalizeAndValidate(row['Tipo'] || row['Event Type']);
        const profileName = normalizeAndValidate(row['Perfil'] || row['Profile']);
        
        if (campaignName && eventType && profileName) {
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
      const data = XLSX.utils.sheet_to_json(sheet) as any[];
      
      data.forEach(row => {
        const campaignName = normalizeAndValidate(row['Campanha'] || row['Campaign']);
        const eventType = normalizeAndValidate(row['Tipo'] || row['Event Type']);
        const profileName = normalizeAndValidate(row['Perfil'] || row['Profile']);
        
        if (campaignName && eventType && profileName) {
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
        const campaign = normalizeAndValidate(row['Campanha'] || row['Campaign']);
        const name = normalizeAndValidate(row['Nome'] || row['Name']);
        
        if (!isValidString(campaign) || !isValidString(name)) {
          console.log(`Lead positivo ${index} ignorado: dados incompletos`);
          return;
        }
        
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
    
    // Parse "Leads Negativos" sheet
    else if (normalizedName.includes('negativo')) {
      console.log('Processando aba Leads Negativos');
      const data = XLSX.utils.sheet_to_json(sheet) as any[];
      
      console.log(`Encontrados ${data.length} leads negativos`);
      
      data.forEach((row, index) => {
        const campaign = normalizeAndValidate(row['Campanha'] || row['Campaign']);
        const name = normalizeAndValidate(row['Nome'] || row['Name']);
        
        if (!isValidString(campaign) || !isValidString(name)) {
          console.log(`Lead negativo ${index} ignorado: dados incompletos`);
          return;
        }
        
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
