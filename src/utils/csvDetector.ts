export type CsvType = 'campaign-input' | 'leads' | 'unknown';

interface CsvDetectionResult {
  type: CsvType;
  confidence: number;
}

export function detectCsvType(headers: string[]): CsvDetectionResult {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Campaign Input CSV detection
  const campaignInputHeaders = ['campaign name', 'event type', 'profile name', 'total count'];
  const hasCampaignHeaders = campaignInputHeaders.every(header => 
    normalizedHeaders.some(h => h === header || h.includes(header))
  );
  
  // Also check for date columns (YYYY-MM-DD pattern)
  const hasDateColumns = normalizedHeaders.some(h => /^\d{4}-\d{2}-\d{2}$/.test(h));
  
  if (hasCampaignHeaders || (normalizedHeaders.includes('campaign name') && hasDateColumns)) {
    return { type: 'campaign-input', confidence: 1.0 };
  }
  
  // Leads CSV detection - check for common lead fields
  const leadsHeaders = [
    'campanha', 'campaign',
    'linkedin', 'linkedin_url',
    'nome', 'name', 'first name', 'last name',
    'cargo', 'position',
    'empresa', 'company',
    'connected at', 'sequence generated at'
  ];
  
  const leadHeaderMatches = leadsHeaders.filter(header =>
    normalizedHeaders.some(h => h.includes(header))
  ).length;
  
  // If at least 3 lead-specific headers are present, it's likely a leads CSV
  if (leadHeaderMatches >= 3) {
    return { type: 'leads', confidence: leadHeaderMatches / leadsHeaders.length };
  }
  
  // Specific detection for positive/negative leads
  const positiveLeadHeaders = ['data resposta positiva', 'positive response date', 'data repasse'];
  const negativeLeadHeaders = ['data resposta negativa', 'negative response date', 'teve fu'];
  
  const hasPositiveHeaders = positiveLeadHeaders.some(header =>
    normalizedHeaders.some(h => h.includes(header))
  );
  
  const hasNegativeHeaders = negativeLeadHeaders.some(header =>
    normalizedHeaders.some(h => h.includes(header))
  );
  
  if (hasPositiveHeaders || hasNegativeHeaders) {
    return { type: 'leads', confidence: 0.9 };
  }
  
  return { type: 'unknown', confidence: 0 };
}

export function parseCsvHeaders(csvContent: string): string[] {
  const lines = csvContent.split('\n');
  if (lines.length === 0) return [];
  
  const headerLine = lines[0].trim();
  // Handle both comma and semicolon separators
  const separator = headerLine.includes(';') ? ';' : ',';
  return headerLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
}
