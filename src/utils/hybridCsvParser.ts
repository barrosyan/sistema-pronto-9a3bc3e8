import Papa from 'papaparse';

export interface HybridParsedData {
  leads: any[];
  campaignMetrics: {
    eventType: string;
    dailyData: Record<string, number>;
  }[];
  summary: {
    totalLeads: number;
    invitesSent: number;
    connectionsAccepted: number;
    messagesSent: number;
    followUps1Sent: number;
    followUps2Sent: number;
    followUps3Sent: number;
    positiveResponses: number;
    negativeResponses: number;
    pendingLeads: number;
    acceptanceRate: number; // Calculated as connectionsAccepted / invitesSent
  };
}

// Normalize column names to handle variations
const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .trim();
};

// Parse date strings in various formats to YYYY-MM-DD
const parseDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr || dateStr.trim() === '' || dateStr === '-' || dateStr === 'N/A') {
    return null;
  }

  const trimmed = dateStr.trim();

  // Try DD/MM/YYYY format
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Try to parse with Date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
};

// Check if value means "yes"
const isYes = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return normalized === 'sim' || normalized === 'yes' || normalized === 's' || normalized === 'y' || normalized === '1' || normalized === 'true';
};

// Check response type - detect "positive" or "negative" responses
const getResponseType = (value: string | null | undefined): 'positive' | 'negative' | null => {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (!normalized || normalized === '-' || normalized === 'n/a') return null;
  
  // Check for positive indicators
  if (
    normalized.includes('positiv') || // positivo, positiva, positive
    normalized.includes('interes') ||  // interessado, interesse, interested
    normalized === 'sim' ||
    normalized === 'yes' ||
    normalized === 's' ||
    normalized === 'y' ||
    normalized === '1' ||
    normalized === 'true'
  ) {
    return 'positive';
  }
  
  // Check for negative indicators
  if (
    normalized.includes('negativ') || // negativo, negativa, negative
    normalized.includes('sem interesse') ||
    normalized.includes('não') ||
    normalized.includes('nao') ||
    normalized === 'no' ||
    normalized === 'n' ||
    normalized === '0' ||
    normalized === 'false'
  ) {
    return 'negative';
  }
  
  return null;
};

export function detectHybridFormat(headers: string[]): boolean {
  const normalizedHeaders = headers.map(normalizeColumnName);
  
  // Check for characteristic columns of this format
  const hasInvite = normalizedHeaders.some(h => h.includes('invite') || h === 'convite');
  const hasAceito = normalizedHeaders.some(h => h.includes('aceito') || h.includes('accepted'));
  const hasFU = normalizedHeaders.some(h => h.includes('fu1') || h.includes('fu_1') || h.includes('follow'));
  const hasNome = normalizedHeaders.some(h => h === 'nome' || h === 'name');
  const hasLinkedin = normalizedHeaders.some(h => h.includes('linkedin'));
  
  return hasNome && hasLinkedin && (hasInvite || hasAceito || hasFU);
}

export function parseHybridCsv(csvContent: string, campaignName: string = 'Campanha Importada'): HybridParsedData {
  console.log('🔍 Starting hybrid CSV parsing...');
  
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (parseResult.errors.length > 0) {
    console.error('❌ CSV parsing errors:', parseResult.errors);
    throw new Error('Failed to parse hybrid CSV file');
  }

  const rows = parseResult.data as Record<string, any>[];
  const headers = parseResult.meta.fields || [];
  
  console.log(`📊 Parsed ${rows.length} rows from hybrid CSV`);
  console.log('📋 Headers:', headers);

  // Map headers to normalized versions for easier access
  const headerMap = new Map<string, string>();
  headers.forEach(h => {
    headerMap.set(normalizeColumnName(h), h);
  });

  // Find column indices based on normalized names
  const findColumn = (patterns: string[]): string | null => {
    for (const pattern of patterns) {
      for (const [normalized, original] of headerMap.entries()) {
        if (normalized.includes(pattern) || pattern.includes(normalized)) {
          return original;
        }
      }
    }
    return null;
  };

  // Column mappings - these might have duplicate names so we need to track by position
  const nameCol = findColumn(['nome', 'name']);
  const linkedinCol = findColumn(['linkedin']);
  const inviteCol = findColumn(['invite', 'convite']);
  const aceitoCol = findColumn(['aceito', 'accepted']);

  // For columns that might repeat (like "Data de envio"), we need to handle them by position
  const getValueByColumnIndex = (row: any, colName: string, occurrence: number = 0): string | null => {
    // Get all columns that match the pattern
    const matchingCols = headers.filter(h => 
      normalizeColumnName(h).includes(normalizeColumnName(colName))
    );
    if (occurrence < matchingCols.length) {
      return row[matchingCols[occurrence]] || null;
    }
    return null;
  };

  // Aggregate metrics by date
  const metricsMap = {
    invitesSent: new Map<string, number>(),
    connectionsAccepted: new Map<string, number>(),
    followUps1: new Map<string, number>(),
    followUps2: new Map<string, number>(),
    followUps3: new Map<string, number>(),
    positiveResponses: new Map<string, number>(),
    negativeResponses: new Map<string, number>(),
    messagesSent: new Map<string, number>(), // Sum of all follow-ups
  };

  const leads: any[] = [];
  let totalPositive = 0;
  let totalNegative = 0;
  let totalPending = 0;
  
  // Count "Sim" responses for acceptance rate calculation
  let totalInvitesSim = 0;
  let totalAceitoSim = 0;

  rows.forEach((row, index) => {
    // Extract lead info
    const name = row[nameCol || 'Nome'] || row['Nome'] || row['name'] || row['Name'] || '';
    const linkedin = row[linkedinCol || 'Linkedin'] || row['LinkedIn'] || row['linkedin'] || '';

    if (!name) {
      console.warn(`⚠️ Row ${index + 1} missing name, skipping`);
      return;
    }

    // Parse invite data
    const inviteValue = row[inviteCol || 'Invite'] || row['Invite'] || row['invite'] || '';
    const inviteSent = isYes(inviteValue);
    if (inviteSent) totalInvitesSim++;
    
    // Find invite send date - look for first "Data de envio" or "Data do envio"
    let inviteSendDate: string | null = null;
    for (const h of headers) {
      const normalized = normalizeColumnName(h);
      if ((normalized.includes('data') && normalized.includes('envio')) || 
          normalized === 'data_do_envio' || normalized === 'data_de_envio') {
        const val = parseDate(row[h]);
        if (val) {
          inviteSendDate = val;
          break;
        }
      }
    }

    // Parse connection accepted data
    const aceitoValue = row[aceitoCol || 'Aceito'] || row['Aceito'] || row['aceito'] || '';
    const connectionAccepted = isYes(aceitoValue);
    if (connectionAccepted) totalAceitoSim++;
    
    // Find accept date - look for "Data de aceite"
    let acceptDate: string | null = null;
    for (const h of headers) {
      const normalized = normalizeColumnName(h);
      if (normalized.includes('aceite') || normalized.includes('accept')) {
        const val = parseDate(row[h]);
        if (val) {
          acceptDate = val;
          break;
        }
      }
    }

    // Parse FU1 data
    let fu1Sent = false;
    let fu1SendDate: string | null = null;
    let fu1Response: 'positive' | 'negative' | null = null;
    let fu1ResponseDate: string | null = null;

    // Find FU1 columns
    for (const h of headers) {
      const normalized = normalizeColumnName(h);
      if (normalized === 'fu1' || normalized === 'fu_1' || normalized.includes('fu1')) {
        fu1Sent = isYes(row[h]);
      }
    }

    // Track which "Data de envio" and "Resposta" columns we've used
    let dateEnvioCount = 0;
    let respostaCount = 0;
    let dataRespostaCount = 0;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const normalized = normalizeColumnName(h);
      
      // Count occurrences to differentiate between invite date, FU1 date, FU2 date
      if (normalized.includes('data') && (normalized.includes('envio'))) {
        dateEnvioCount++;
        if (dateEnvioCount === 2 && fu1Sent) {
          fu1SendDate = parseDate(row[h]);
        }
      }
      
      if (normalized === 'resposta' || normalized === 'respostas' || normalized === 'response' || normalized === 'responses') {
        respostaCount++;
        if (respostaCount === 1) {
          fu1Response = getResponseType(row[h]);
        }
      }
      
      if (normalized.includes('data') && normalized.includes('resposta')) {
        dataRespostaCount++;
        if (dataRespostaCount === 1) {
          fu1ResponseDate = parseDate(row[h]);
        }
      }
    }

    // Parse FU2 data
    let fu2Sent = false;
    let fu2SendDate: string | null = null;
    let fu2Response: 'positive' | 'negative' | null = null;
    let fu2ResponseDate: string | null = null;

    // Parse FU3 data (if exists)
    let fu3Sent = false;
    let fu3SendDate: string | null = null;
    let fu3Response: 'positive' | 'negative' | null = null;
    let fu3ResponseDate: string | null = null;

    for (const h of headers) {
      const normalized = normalizeColumnName(h);
      if (normalized === 'fu2' || normalized === 'fu_2' || normalized.includes('fu2')) {
        fu2Sent = isYes(row[h]);
      }
      if (normalized === 'fu3' || normalized === 'fu_3' || normalized.includes('fu3')) {
        fu3Sent = isYes(row[h]);
      }
    }

    // Parse all dates and responses by position in headers
    // Structure: FU1, Data de envio, Resposta, Data da resposta, FU2, Data de envio, Resposta, Data da resposta, etc.
    dateEnvioCount = 0;
    respostaCount = 0;
    dataRespostaCount = 0;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const normalized = normalizeColumnName(h);
      
      if (normalized.includes('data') && (normalized.includes('envio'))) {
        dateEnvioCount++;
        if (dateEnvioCount === 2 && fu1Sent) {
          fu1SendDate = parseDate(row[h]);
        } else if (dateEnvioCount === 3 && fu2Sent) {
          fu2SendDate = parseDate(row[h]);
        } else if (dateEnvioCount === 4 && fu3Sent) {
          fu3SendDate = parseDate(row[h]);
        }
      }
      
      if (normalized === 'resposta' || normalized === 'respostas' || normalized === 'response' || normalized === 'responses') {
        respostaCount++;
        if (respostaCount === 1) {
          fu1Response = getResponseType(row[h]);
        } else if (respostaCount === 2) {
          fu2Response = getResponseType(row[h]);
        } else if (respostaCount === 3) {
          fu3Response = getResponseType(row[h]);
        }
      }
      
      if (normalized.includes('data') && normalized.includes('resposta')) {
        dataRespostaCount++;
        if (dataRespostaCount === 1) {
          fu1ResponseDate = parseDate(row[h]);
        } else if (dataRespostaCount === 2) {
          fu2ResponseDate = parseDate(row[h]);
        } else if (dataRespostaCount === 3) {
          fu3ResponseDate = parseDate(row[h]);
        }
      }
    }

    // Determine overall response status - use the most recent response
    let overallResponse = fu3Response || fu2Response || fu1Response;
    let responseDate = fu3ResponseDate || fu2ResponseDate || fu1ResponseDate;

    if (overallResponse === 'positive') {
      totalPositive++;
    } else if (overallResponse === 'negative') {
      totalNegative++;
    } else {
      totalPending++;
    }

    // Aggregate metrics by date
    if (inviteSent && inviteSendDate) {
      const current = metricsMap.invitesSent.get(inviteSendDate) || 0;
      metricsMap.invitesSent.set(inviteSendDate, current + 1);
    }

    if (connectionAccepted && acceptDate) {
      const current = metricsMap.connectionsAccepted.get(acceptDate) || 0;
      metricsMap.connectionsAccepted.set(acceptDate, current + 1);
    }

    // Track follow-ups by their send dates
    if (fu1Sent && fu1SendDate) {
      const current = metricsMap.followUps1.get(fu1SendDate) || 0;
      metricsMap.followUps1.set(fu1SendDate, current + 1);
      // Also add to messages sent
      const msgCurrent = metricsMap.messagesSent.get(fu1SendDate) || 0;
      metricsMap.messagesSent.set(fu1SendDate, msgCurrent + 1);
    }

    if (fu2Sent && fu2SendDate) {
      const current = metricsMap.followUps2.get(fu2SendDate) || 0;
      metricsMap.followUps2.set(fu2SendDate, current + 1);
      // Also add to messages sent
      const msgCurrent = metricsMap.messagesSent.get(fu2SendDate) || 0;
      metricsMap.messagesSent.set(fu2SendDate, msgCurrent + 1);
    }

    if (fu3Sent && fu3SendDate) {
      const current = metricsMap.followUps3.get(fu3SendDate) || 0;
      metricsMap.followUps3.set(fu3SendDate, current + 1);
      // Also add to messages sent
      const msgCurrent = metricsMap.messagesSent.get(fu3SendDate) || 0;
      metricsMap.messagesSent.set(fu3SendDate, msgCurrent + 1);
    }

    // Track positive/negative responses by their response dates
    if (fu1Response === 'positive' && fu1ResponseDate) {
      const current = metricsMap.positiveResponses.get(fu1ResponseDate) || 0;
      metricsMap.positiveResponses.set(fu1ResponseDate, current + 1);
    } else if (fu1Response === 'negative' && fu1ResponseDate) {
      const current = metricsMap.negativeResponses.get(fu1ResponseDate) || 0;
      metricsMap.negativeResponses.set(fu1ResponseDate, current + 1);
    }

    if (fu2Response === 'positive' && fu2ResponseDate) {
      const current = metricsMap.positiveResponses.get(fu2ResponseDate) || 0;
      metricsMap.positiveResponses.set(fu2ResponseDate, current + 1);
    } else if (fu2Response === 'negative' && fu2ResponseDate) {
      const current = metricsMap.negativeResponses.get(fu2ResponseDate) || 0;
      metricsMap.negativeResponses.set(fu2ResponseDate, current + 1);
    }

    if (fu3Response === 'positive' && fu3ResponseDate) {
      const current = metricsMap.positiveResponses.get(fu3ResponseDate) || 0;
      metricsMap.positiveResponses.set(fu3ResponseDate, current + 1);
    } else if (fu3Response === 'negative' && fu3ResponseDate) {
      const current = metricsMap.negativeResponses.get(fu3ResponseDate) || 0;
      metricsMap.negativeResponses.set(fu3ResponseDate, current + 1);
    }

    // Create lead record - classify based on "Resposta" field
    // "Resposta positiva" = positive lead (positive status)
    // "Resposta negativa" = negative lead (negative status)
    // No response yet = pending lead
    let leadStatus = 'pending';
    if (overallResponse === 'positive') {
      leadStatus = 'positive'; // Changed from 'follow-up' to 'positive'
    } else if (overallResponse === 'negative') {
      leadStatus = 'negative'; // Changed from 'sem-interesse' to 'negative'
    }

    const lead = {
      campaign: campaignName,
      linkedin,
      name,
      position: null,
      company: null,
      source: 'Kontax',
      connectionDate: acceptDate,
      importedAt: inviteSendDate, // Use invite send date as import date
      status: leadStatus,
      positiveResponseDate: overallResponse === 'positive' ? responseDate : null,
      negativeResponseDate: overallResponse === 'negative' ? responseDate : null,
      followUp1Date: fu1SendDate,
      followUp1Comments: fu1Response ? `Resposta: ${fu1Response === 'positive' ? 'Positiva' : 'Negativa'}` : null,
      followUp2Date: fu2SendDate,
      followUp2Comments: fu2Response ? `Resposta: ${fu2Response === 'positive' ? 'Positiva' : 'Negativa'}` : null,
      followUp3Date: fu3SendDate,
      followUp3Comments: fu3Response ? `Resposta: ${fu3Response === 'positive' ? 'Positiva' : 'Negativa'}` : null,
      inviteSent,
      inviteSendDate,
      connectionAccepted,
      isPositive: overallResponse === 'positive',
      isNegative: overallResponse === 'negative',
      isPending: !overallResponse,
    };

    leads.push(lead);
  });

  // Convert metrics maps to daily data format
  const campaignMetrics = [
    {
      eventType: 'Connection Requests Sent',
      dailyData: Object.fromEntries(metricsMap.invitesSent),
    },
    {
      eventType: 'Connection Requests Accepted',
      dailyData: Object.fromEntries(metricsMap.connectionsAccepted),
    },
    {
      eventType: 'Messages Sent',
      dailyData: Object.fromEntries(metricsMap.messagesSent),
    },
    {
      eventType: 'Follow-Ups 1',
      dailyData: Object.fromEntries(metricsMap.followUps1),
    },
    {
      eventType: 'Follow-Ups 2',
      dailyData: Object.fromEntries(metricsMap.followUps2),
    },
    {
      eventType: 'Follow-Ups 3',
      dailyData: Object.fromEntries(metricsMap.followUps3),
    },
    {
      eventType: 'Positive Responses',
      dailyData: Object.fromEntries(metricsMap.positiveResponses),
    },
    {
      eventType: 'Negative Responses',
      dailyData: Object.fromEntries(metricsMap.negativeResponses),
    },
  ];

  // Calculate summary - acceptance rate based on "Sim" counts
  const acceptanceRate = totalInvitesSim > 0 ? (totalAceitoSim / totalInvitesSim) * 100 : 0;
  
  const summary = {
    totalLeads: leads.length,
    invitesSent: totalInvitesSim, // Use count of "Sim" in Invite column
    connectionsAccepted: totalAceitoSim, // Use count of "Sim" in Aceito column
    messagesSent: Array.from(metricsMap.messagesSent.values()).reduce((a, b) => a + b, 0),
    followUps1Sent: Array.from(metricsMap.followUps1.values()).reduce((a, b) => a + b, 0),
    followUps2Sent: Array.from(metricsMap.followUps2.values()).reduce((a, b) => a + b, 0),
    followUps3Sent: Array.from(metricsMap.followUps3.values()).reduce((a, b) => a + b, 0),
    positiveResponses: totalPositive,
    negativeResponses: totalNegative,
    pendingLeads: totalPending,
    acceptanceRate: Math.round(acceptanceRate * 100) / 100, // Round to 2 decimal places
  };

  console.log('✅ Hybrid CSV parsing complete:', summary);

  return {
    leads,
    campaignMetrics,
    summary,
  };
}
