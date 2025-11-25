import Papa from 'papaparse';

export interface ParsedLeadData {
  positiveLeads: any[];
  negativeLeads: any[];
}

export function parseLeadsCsv(csvContent: string, fileName?: string): ParsedLeadData {
  console.log('🔍 Starting leads CSV parsing...');
  
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (parseResult.errors.length > 0) {
    console.error('❌ CSV parsing errors:', parseResult.errors);
    throw new Error('Failed to parse leads CSV file');
  }

  const rows = parseResult.data as Record<string, any>[];
  console.log(`📊 Parsed ${rows.length} rows from leads CSV`);

  const positiveLeads: any[] = [];
  const negativeLeads: any[] = [];

  // Try to extract campaign name from filename if available
  let campaignFromFile = '';
  if (fileName) {
    // Remove file extension and clean up
    campaignFromFile = fileName.replace(/\.(csv|xlsx|xls)$/i, '').replace(/_/g, ' ');
  }

  rows.forEach((row, index) => {
    // Detect if it's positive or negative lead based on columns
    const hasPositiveResponse = row['Data Resposta Positiva'] || row['Positive Response Date'] || row['Data resposta positiva'];
    const hasNegativeResponse = row['Data Resposta Negativa'] || row['Negative Response Date'] || row['Data resposta negativa'];

    // Handle both old format (single Name field) and new format (First Name + Last Name)
    const firstName = row['First Name'] || '';
    const lastName = row['Last Name'] || '';
    const fullName = firstName && lastName ? `${firstName} ${lastName}`.trim() : '';
    
    const campaign = row['Campanha'] || row['Campaign'] || campaignFromFile || '';
    const linkedin = row['LinkedIn'] || row['linkedin'] || row['linkedin_url'] || '';
    const name = row['Nome'] || row['Name'] || fullName || '';
    const position = row['Cargo'] || row['Position'] || '';
    const company = row['Empresa'] || row['Company'] || '';

    if (!name) {
      console.warn(`⚠️ Row ${index + 1} missing required field (name), skipping`);
      return;
    }

    // Extract connection date from "Connected At" field or Messages field
    let connectionDate = row['Connected At'] || row['connected_at'] || null;
    
    // Filter out invalid date values
    if (connectionDate && (connectionDate === 'Never' || connectionDate === 'never' || connectionDate.trim() === '')) {
      connectionDate = null;
    }
    
    // Fallback: try to extract from Messages field if present
    if (!connectionDate) {
      const messagesField = row['Messages Sent: 1, Received: 4, Connected: Thu Apr 17 2025'] || 
                           row['Messages'] || 
                           row['messages'] || '';
      if (messagesField && typeof messagesField === 'string') {
        const connectedMatch = messagesField.match(/Connected:\s*(.+?)(?:\s|$)/i);
        if (connectedMatch) {
          connectionDate = connectedMatch[1].trim();
          // Validate extracted date
          if (connectionDate === 'Never' || connectionDate === 'never' || connectionDate.trim() === '') {
            connectionDate = null;
          }
        }
      }
    }

    // Extract sequence generated date
    const sequenceDate = row['Sequence Generated At'] || row['sequence_generated_at'] || null;

    const baseLead = {
      campaign,
      linkedin,
      name,
      position,
      company,
      source: 'Kontax',
      connectionDate,
      sequenceDate,
    };

    if (hasPositiveResponse) {
      // Positive lead
      positiveLeads.push({
        ...baseLead,
        status: 'pending',
        positiveResponseDate: row['Data Resposta Positiva'] || row['Positive Response Date'] || null,
        transferDate: row['Data Repasse'] || row['Transfer Date'] || null,
        statusDetails: row['Status'] || null,
        comments: row['Comentários'] || row['Comments'] || null,
        followUp1Date: row['Data FU 1'] || row['Follow-Up 1 Date'] || null,
        followUp1Comments: row['Comentarios FU1'] || row['Follow-Up 1 Comments'] || null,
        followUp2Date: row['Data FU 2'] || row['Follow-Up 2 Date'] || null,
        followUp2Comments: row['Comentarios FU2'] || row['Follow-Up 2 Comments'] || null,
        followUp3Date: row['Data FU 3'] || row['Follow-Up 3 Date'] || null,
        followUp3Comments: row['Comentarios FU3'] || row['Follow-Up 3 Comments'] || null,
        followUp4Date: row['Data FU 4'] || row['Follow-Up 4 Date'] || null,
        followUp4Comments: row['Comentarios FU4'] || row['Follow-Up 4 Comments'] || null,
        observations: row['Observações'] || row['Observations'] || null,
        meetingScheduleDate: row['Data de agendamento da reunião'] || row['Meeting Schedule Date'] || null,
        meetingDate: row['Data da Reunião'] || row['Meeting Date'] || null,
        proposalDate: row['Data Proposta'] || row['Proposal Date'] || null,
        proposalValue: row['Valor Proposta'] || row['Proposal Value'] || null,
        saleDate: row['Data Venda'] || row['Sale Date'] || null,
        saleValue: row['Valor Venda'] || row['Sale Value'] || null,
        profile: row['Perfil'] || row['Profile'] || null,
        classification: row['Classificação'] || row['Classification'] || null,
        attendedWebinar: row['Participou do Webnar'] === 'Sim' || row['Attended Webinar'] === 'Yes',
        whatsapp: row['WhatsApp'] || row['whatsapp'] || null,
        standDay: row['Dia do Stand'] || row['Stand Day'] || null,
        pavilion: row['Pavilhão'] || row['Pavilion'] || null,
        stand: row['Stand'] || null,
      });
    } else if (hasNegativeResponse) {
      // Negative lead
      negativeLeads.push({
        ...baseLead,
        status: 'negative',
        negativeResponseDate: row['Data Resposta Negativa'] || row['Negative Response Date'] || null,
        hadFollowUp: row['Teve FU?'] === 'Sim' || row['Had Follow-Up'] === 'Yes',
        followUpReason: row['Porque?'] || row['Follow-Up Reason'] || null,
        observations: row['Observações'] || row['Observations'] || null,
      });
    } else {
      // For new format CSVs without positive/negative response indicators, treat as pending leads
      positiveLeads.push({
        ...baseLead,
        status: 'pending',
        positiveResponseDate: null,
        transferDate: null,
        statusDetails: null,
        comments: null,
        followUp1Date: null,
        followUp1Comments: null,
        followUp2Date: null,
        followUp2Comments: null,
        followUp3Date: null,
        followUp3Comments: null,
        followUp4Date: null,
        followUp4Comments: null,
        observations: null,
        meetingScheduleDate: null,
        meetingDate: null,
        proposalDate: null,
        proposalValue: null,
        saleDate: null,
        saleValue: null,
        profile: null,
        classification: null,
        attendedWebinar: false,
        whatsapp: null,
        standDay: null,
        pavilion: null,
        stand: null,
      });
    }
  });

  console.log(`✅ Parsed ${positiveLeads.length} positive leads and ${negativeLeads.length} negative leads`);
  
  return {
    positiveLeads,
    negativeLeads,
  };
}
