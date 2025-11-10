import * as XLSX from 'xlsx';
import { CampaignMetrics, Lead } from '@/types/campaign';

export interface ExcelSheetData {
  campaignMetrics: CampaignMetrics[];
  positiveLeads: Lead[];
  negativeLeads: Lead[];
}

export async function parseExcelSheets(file: File | string): Promise<ExcelSheetData> {
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

  // Parse Input sheet (campaign metrics)
  const inputSheetName = workbook.SheetNames.find(
    name => name.toLowerCase() === 'input' || name.toLowerCase().includes('input')
  );

  if (inputSheetName) {
    const sheet = workbook.Sheets[inputSheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];
    
    data.forEach(row => {
      const dailyData: Record<string, number> = {};
      
      Object.keys(row).forEach(key => {
        if (key.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dailyData[key] = Number(row[key]) || 0;
        }
      });
      
      campaignMetrics.push({
        campaignName: row['Campaign Name'] || '',
        eventType: row['Event Type'] || '',
        profileName: row['Profile Name'] || '',
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
      positiveLeads.push({
        id: `positive-${index}`,
        campaign: row['Campanha'] || '',
        linkedin: row['LinkedIn'] || '',
        name: row['Nome'] || '',
        position: row['Cargo'] || '',
        company: row['Empresa'] || '',
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
      negativeLeads.push({
        id: `negative-${index}`,
        campaign: row['Campanha'] || '',
        linkedin: row['LinkedIn'] || '',
        name: row['Nome'] || '',
        position: row['Cargo'] || '',
        company: row['Empresa'] || '',
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
  };
}
