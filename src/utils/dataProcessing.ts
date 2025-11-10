export interface ParsedFile {
  name: string;
  headers: string[];
  data: Record<string, any>[];
  rowCount: number;
}

export type MergeType = 'lead-name' | 'company-name';

const NAME_FIELDS = [
  'nome', 'name', 'first name', 'firstname', 'first_name', 
  'last name', 'lastname', 'last_name', 'full name', 'fullname', 'full_name',
  'lead', 'lead_name', 'lead name', 'leadname'
];

const COMPANY_FIELDS = [
  'company', 'empresa', 'enterprise', 'companhia', 'organization', 
  'organizacao', 'organization name', 'company name'
];

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

export function extractMergeKey(
  row: Record<string, any>, 
  headers: string[], 
  mergeType: MergeType
): string {
  if (mergeType === 'lead-name') {
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
  } else {
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
  
  // Create lookup map from secondary files
  const secondaryDataMap = new Map<string, Record<string, any>[]>();
  
  secondaryFiles.forEach(file => {
    file.data.forEach(row => {
      const key = extractMergeKey(row, file.headers, mergeType);
      if (key) {
        if (!secondaryDataMap.has(key)) {
          secondaryDataMap.set(key, []);
        }
        secondaryDataMap.get(key)!.push(row);
      }
    });
  });
  
  // Perform left join
  mainFile.data.forEach(mainRow => {
    const key = extractMergeKey(mainRow, mainFile.headers, mergeType);
    const matchingRows = secondaryDataMap.get(key) || [];
    
    if (matchingRows.length === 0) {
      result.push({ ...mainRow });
    } else {
      matchingRows.forEach(secondaryRow => {
        result.push({ ...mainRow, ...secondaryRow });
      });
    }
  });
  
  return result;
}

export function getAllHeaders(files: ParsedFile[]): string[] {
  const headersSet = new Set<string>();
  files.forEach(file => {
    file.headers.forEach(header => headersSet.add(header));
  });
  return Array.from(headersSet);
}
