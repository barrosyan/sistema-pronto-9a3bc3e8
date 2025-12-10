export interface ParsedFile {
  name: string;
  headers: string[];
  data: Record<string, any>[];
  rowCount: number;
}

export type MergeType = 'lead-name' | 'company-name' | 'kontax-input' | 'kontax-leads';

const NAME_FIELDS = [
  'nome', 'name', 'first name', 'firstname', 'first_name', 
  'last name', 'lastname', 'last_name', 'full name', 'fullname', 'full_name',
  'lead', 'lead_name', 'lead name', 'leadname'
];

const COMPANY_FIELDS = [
  'company', 'empresa', 'enterprise', 'companhia', 'organization', 
  'organizacao', 'organization name', 'company name'
];

// Standard column mappings for Kontax input format
const KONTAX_INPUT_COLUMNS = {
  campaignName: ['campaign name', 'campanha', 'nome da campanha', 'campaign'],
  eventType: ['event type', 'tipo de evento', 'event_type', 'tipo'],
  profileName: ['profile name', 'perfil', 'nome do perfil', 'profile'],
  totalCount: ['total count', 'total', 'contagem', 'count'],
};

// Standard column mappings for Kontax leads format
const KONTAX_LEADS_COLUMNS = {
  name: ['nome', 'name', 'lead name', 'lead'],
  linkedin: ['linkedin', 'linkedin url', 'url linkedin', 'perfil linkedin'],
  company: ['empresa', 'company', 'companhia'],
  position: ['cargo', 'position', 'job title', 'título'],
  campaign: ['campanha', 'campaign', 'nome da campanha'],
};

export function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function normalizeColumnName(colName: string): string {
  return colName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '_');
}

export function detectNameColumns(headers: string[]): { 
  firstName?: string; 
  lastName?: string; 
  fullName?: string;
} {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  // Check for full name variations including "lead"
  const fullNameIndex = lowerHeaders.findIndex(h => 
    h.includes('full') && (h.includes('name') || h.includes('nome')) ||
    h === 'nome' || h === 'name' ||
    h === 'lead' || h === 'lead_name' || h === 'lead name' || h === 'leadname'
  );
  
  if (fullNameIndex !== -1) {
    return { fullName: headers[fullNameIndex] };
  }
  
  const firstNameIndex = lowerHeaders.findIndex(h => 
    (h.includes('first') || h.includes('primeiro')) && (h.includes('name') || h.includes('nome'))
  );
  
  const lastNameIndex = lowerHeaders.findIndex(h => 
    (h.includes('last') || h.includes('ultimo') || h.includes('sobrenome')) && (h.includes('name') || h.includes('nome'))
  );
  
  return {
    firstName: firstNameIndex !== -1 ? headers[firstNameIndex] : undefined,
    lastName: lastNameIndex !== -1 ? headers[lastNameIndex] : undefined
  };
}

export function detectCompanyColumn(headers: string[]): string | undefined {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (let i = 0; i < lowerHeaders.length; i++) {
    const header = lowerHeaders[i];
    if (COMPANY_FIELDS.some(field => {
      const normalizedField = field.toLowerCase().trim();
      return header === normalizedField || header.includes(normalizedField);
    })) {
      return headers[i];
    }
  }
  
  return undefined;
}

// Find matching column in headers given a list of possible names
function findColumn(headers: string[], possibleNames: string[]): string | undefined {
  const normalizedHeaders = headers.map(h => normalizeColumnName(h));
  
  for (const name of possibleNames) {
    const normalizedName = normalizeColumnName(name);
    const idx = normalizedHeaders.findIndex(h => 
      h === normalizedName || h.includes(normalizedName) || normalizedName.includes(h)
    );
    if (idx !== -1) return headers[idx];
  }
  
  return undefined;
}

// Build a column mapping between different files
export function buildColumnMapping(files: ParsedFile[]): Map<string, string> {
  const mapping = new Map<string, string>();
  const allHeaders = new Set<string>();
  
  // Collect all normalized headers
  files.forEach(file => {
    file.headers.forEach(h => allHeaders.add(normalizeColumnName(h)));
  });
  
  // For each header, find its canonical form
  const groups: Map<string, Set<string>> = new Map();
  
  files.forEach(file => {
    file.headers.forEach(header => {
      const normalized = normalizeColumnName(header);
      
      // Check if this header matches any existing group
      let foundGroup = false;
      for (const [canonical, variants] of groups) {
        if (normalized === canonical || 
            normalized.includes(canonical) || 
            canonical.includes(normalized) ||
            areSimilarColumns(normalized, canonical)) {
          variants.add(header);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        groups.set(normalized, new Set([header]));
      }
    });
  });
  
  // Create mapping from original names to canonical names
  for (const [canonical, variants] of groups) {
    // Use the shortest variant as the standard name
    const standardName = Array.from(variants).sort((a, b) => a.length - b.length)[0];
    variants.forEach(variant => {
      mapping.set(variant, standardName);
    });
  }
  
  return mapping;
}

function areSimilarColumns(col1: string, col2: string): boolean {
  // Check if columns are similar enough to be considered the same
  const words1 = col1.split('_').filter(Boolean);
  const words2 = col2.split('_').filter(Boolean);
  
  // Count matching words
  let matches = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matches++;
        break;
      }
    }
  }
  
  const maxLen = Math.max(words1.length, words2.length);
  return matches / maxLen >= 0.5; // At least 50% word match
}

export function extractMergeKey(
  row: Record<string, any>, 
  headers: string[], 
  mergeType: MergeType
): string {
  if (mergeType === 'lead-name' || mergeType === 'kontax-leads') {
    const nameColumns = detectNameColumns(headers);
    
    if (nameColumns.fullName) {
      return normalizeText(row[nameColumns.fullName] || '');
    }
    
    if (nameColumns.firstName && nameColumns.lastName) {
      const firstName = normalizeText(row[nameColumns.firstName] || '');
      const lastName = normalizeText(row[nameColumns.lastName] || '');
      return `${firstName} ${lastName}`.trim();
    }
    
    if (nameColumns.firstName) {
      return normalizeText(row[nameColumns.firstName] || '');
    }
  } else if (mergeType === 'company-name') {
    const companyColumn = detectCompanyColumn(headers);
    if (companyColumn) {
      return normalizeText(row[companyColumn] || '');
    }
  }
  
  return '';
}

export function performLeftJoin(
  mainFile: ParsedFile,
  secondaryFiles: ParsedFile[],
  mergeType: MergeType
): Record<string, any>[] {
  const result: Record<string, any>[] = [];
  
  // Build column mapping to standardize names
  const columnMapping = buildColumnMapping([mainFile, ...secondaryFiles]);
  
  // Create lookup map from secondary files
  const secondaryDataMap = new Map<string, Record<string, any>[]>();
  
  secondaryFiles.forEach(file => {
    file.data.forEach(row => {
      const key = extractMergeKey(row, file.headers, mergeType);
      if (key) {
        // Standardize column names in the row
        const standardizedRow: Record<string, any> = {};
        for (const [col, value] of Object.entries(row)) {
          const standardCol = columnMapping.get(col) || col;
          standardizedRow[standardCol] = value;
        }
        
        if (!secondaryDataMap.has(key)) {
          secondaryDataMap.set(key, []);
        }
        secondaryDataMap.get(key)!.push(standardizedRow);
      }
    });
  });
  
  // Perform left join
  mainFile.data.forEach(mainRow => {
    const key = extractMergeKey(mainRow, mainFile.headers, mergeType);
    const matchingRows = secondaryDataMap.get(key) || [];
    
    // Standardize main row columns
    const standardizedMainRow: Record<string, any> = {};
    for (const [col, value] of Object.entries(mainRow)) {
      const standardCol = columnMapping.get(col) || col;
      standardizedMainRow[standardCol] = value;
    }
    
    if (matchingRows.length === 0) {
      result.push({ ...standardizedMainRow });
    } else {
      // Merge data, preferring main file values when conflicts exist
      const mergedRow = { ...standardizedMainRow };
      matchingRows.forEach(secondaryRow => {
        for (const [col, value] of Object.entries(secondaryRow)) {
          // Only add if not already present or if main value is empty
          if (!(col in mergedRow) || !mergedRow[col]) {
            mergedRow[col] = value;
          }
        }
      });
      result.push(mergedRow);
    }
  });
  
  return result;
}

// Concatenate files vertically (union) with standardized columns
export function concatenateFiles(files: ParsedFile[]): Record<string, any>[] {
  if (files.length === 0) return [];
  
  const columnMapping = buildColumnMapping(files);
  const result: Record<string, any>[] = [];
  
  files.forEach(file => {
    file.data.forEach(row => {
      const standardizedRow: Record<string, any> = {};
      for (const [col, value] of Object.entries(row)) {
        const standardCol = columnMapping.get(col) || col;
        standardizedRow[standardCol] = value;
      }
      result.push(standardizedRow);
    });
  });
  
  return result;
}

// Convert data to Kontax input format
export function convertToKontaxInputFormat(data: Record<string, any>[], files: ParsedFile[]): Record<string, any>[] {
  const allHeaders = getAllHeaders(files);
  const campaignCol = findColumn(allHeaders, KONTAX_INPUT_COLUMNS.campaignName);
  const eventTypeCol = findColumn(allHeaders, KONTAX_INPUT_COLUMNS.eventType);
  const profileCol = findColumn(allHeaders, KONTAX_INPUT_COLUMNS.profileName);
  const totalCol = findColumn(allHeaders, KONTAX_INPUT_COLUMNS.totalCount);
  
  return data.map(row => ({
    'Campaign Name': row[campaignCol || 'Campaign Name'] || row['campanha'] || '',
    'Event Type': row[eventTypeCol || 'Event Type'] || row['tipo de evento'] || '',
    'Profile Name': row[profileCol || 'Profile Name'] || row['perfil'] || '',
    'Total Count': row[totalCol || 'Total Count'] || row['total'] || 0,
    ...row,
  }));
}

// Convert data to Kontax leads format
export function convertToKontaxLeadsFormat(data: Record<string, any>[], files: ParsedFile[]): Record<string, any>[] {
  const allHeaders = getAllHeaders(files);
  const nameCol = findColumn(allHeaders, KONTAX_LEADS_COLUMNS.name);
  const linkedinCol = findColumn(allHeaders, KONTAX_LEADS_COLUMNS.linkedin);
  const companyCol = findColumn(allHeaders, KONTAX_LEADS_COLUMNS.company);
  const positionCol = findColumn(allHeaders, KONTAX_LEADS_COLUMNS.position);
  const campaignCol = findColumn(allHeaders, KONTAX_LEADS_COLUMNS.campaign);
  
  return data.map(row => ({
    'Nome': row[nameCol || 'Nome'] || row['name'] || '',
    'LinkedIn': row[linkedinCol || 'LinkedIn'] || row['linkedin'] || '',
    'Empresa': row[companyCol || 'Empresa'] || row['company'] || '',
    'Cargo': row[positionCol || 'Cargo'] || row['position'] || '',
    'Campanha': row[campaignCol || 'Campanha'] || row['campaign'] || '',
    ...row,
  }));
}

export function getAllHeaders(files: ParsedFile[]): string[] {
  const headersSet = new Set<string>();
  files.forEach(file => {
    file.headers.forEach(header => headersSet.add(header));
  });
  return Array.from(headersSet);
}
